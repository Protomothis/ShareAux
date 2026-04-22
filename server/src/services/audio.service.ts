import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ChildProcess, spawn } from 'child_process';

import { FFMPEG_BITRATE, FFMPEG_FRAG_DURATION, FFMPEG_MAX_RETRIES, FFMPEG_RECENT_CHUNKS } from '../constants.js';
import type { ListenerState, ParsedInitSegment, RoomAudio, StreamInfo } from '../types/index.js';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private readonly ffmpegPath: string;
  private rooms = new Map<string, RoomAudio>();

  constructor(config: ConfigService) {
    this.ffmpegPath = config.get('FFMPEG_PATH') ?? 'ffmpeg';
  }

  // --- Stream lifecycle ---

  async startStream(
    roomId: string,
    audioUrl: string,
    onEnd: () => void,
    getNewUrl?: () => Promise<string>,
    onStart?: () => Promise<void> | void,
    audioBuffer?: Buffer,
    bitrateKbps?: number,
  ): Promise<void> {
    const existing = this.rooms.get(roomId);
    if (existing?.ffmpeg) {
      existing.ffmpeg.removeAllListeners();
      existing.ffmpeg.kill('SIGKILL');
      existing.ffmpeg = null;
    }
    this.spawnFfmpeg(roomId, audioUrl, onEnd, getNewUrl, onStart, audioBuffer, bitrateKbps);
  }

  stopStream(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.ffmpeg) {
      room.ffmpeg.removeAllListeners();
      room.ffmpeg.kill('SIGKILL');
      room.ffmpeg = null;
    }
    room.playing = false;
    room.initSegment = null;
    room.recentChunks = [];
    // 모든 리스너 synced 해제 → 새 곡 시작 시 init segment 재전송 보장
    for (const state of room.listeners.values()) state.synced = false;
  }

  pauseStream(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) room.playing = false;
  }

  resumeStream(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) room.playing = true;
  }

  destroyRoom(roomId: string): void {
    this.stopStream(roomId);
    this.rooms.delete(roomId);
  }

  getStreamInfo(roomId: string): StreamInfo {
    const room = this.rooms.get(roomId);
    return { codec: room?.codec, bitrate: room?.bitrate };
  }

  getActiveRooms(): string[] {
    return [...this.rooms.entries()].filter(([, r]) => r.playing).map(([id]) => id);
  }

  getTotalListeners(): number {
    let total = 0;
    for (const room of this.rooms.values()) total += room.listeners.size;
    return total;
  }

  // --- Listener management ---

  addListener(roomId: string, cb: (chunk: Buffer) => void): void {
    const room = this.rooms.get(roomId);
    if (room) {
      // init segment는 resync 요청 시 전송 — 여기서는 등록만
      room.listeners.set(cb, { cb, synced: false });
    } else {
      const listeners = new Map<(chunk: Buffer) => void, ListenerState>();
      listeners.set(cb, { cb, synced: false });
      this.rooms.set(roomId, { ffmpeg: null, listeners, playing: false, initSegment: null, recentChunks: [] });
    }
  }

  removeListener(roomId: string, cb: (chunk: Buffer) => void): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.listeners.delete(cb);
  }

  unsyncListener(roomId: string, cb: (chunk: Buffer) => void): void {
    const state = this.rooms.get(roomId)?.listeners.get(cb);
    if (state) state.synced = false;
  }

  resyncListener(roomId: string, cb: (chunk: Buffer) => void): boolean {
    const room = this.rooms.get(roomId);
    const state = room?.listeners.get(cb);
    if (!state) {
      this.logger.debug(
        `[${roomId}] resync: listener not found (room=${!!room}, listeners=${room?.listeners.size ?? 0})`,
      );
      return false;
    }

    if (room!.initSegment) {
      try {
        state.cb(room!.initSegment);
        state.synced = true;
        this.logger.log(`[${roomId}] resync: sent init (${room!.initSegment.length}b)`);
        return true;
      } catch (e) {
        this.logger.warn(`[${roomId}] resync send failed: ${e}`);
        state.synced = false;
        return false;
      }
    }

    // idle(playing=false) → 대기할 필요 없음
    if (!room!.playing) return true;
    // 재생 중인데 init segment 아직 없음 → ResyncWait
    this.logger.debug(`[${roomId}] resync: no init segment yet`);
    state.synced = false;
    return false;
  }

  // --- Internal ---

  private spawnFfmpeg(
    roomId: string,
    audioUrl: string,
    onEnd: () => void,
    getNewUrl?: () => Promise<string>,
    onStart?: () => Promise<void> | void,
    audioBuffer?: Buffer,
    bitrateKbps?: number,
  ): void {
    const existingListeners = this.rooms.get(roomId)?.listeners ?? new Map<(chunk: Buffer) => void, ListenerState>();
    const fromBuffer = !!audioBuffer;
    const bitrate = `${bitrateKbps ?? parseInt(FFMPEG_BITRATE, 10)}k`;
    this.logger.log(
      `[${roomId}] Starting ffmpeg (fMP4 AAC ${bitrate}), source=${fromBuffer ? 'buffer' : 'url'}, ${existingListeners.size} listeners`,
    );

    const inputArgs = fromBuffer
      ? ['-re', '-i', 'pipe:0']
      : ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-re', '-i', audioUrl];

    const ffmpeg = spawn(
      this.ffmpegPath,
      [
        ...inputArgs,
        '-vn',
        '-map',
        '0:a:0',
        '-c:a',
        'aac',
        '-b:a',
        bitrate,
        '-ar',
        '48000',
        '-ac',
        '2',
        '-movflags',
        'empty_moov+default_base_moof',
        '-frag_duration',
        FFMPEG_FRAG_DURATION,
        '-flush_packets',
        '1',
        '-f',
        'mp4',
        'pipe:1',
      ],
      { stdio: [fromBuffer ? 'pipe' : 'ignore', 'pipe', 'pipe'] },
    );

    if (fromBuffer && ffmpeg.stdin) {
      ffmpeg.stdin.on('error', () => {}); // EPIPE 무시 (ffmpeg 조기 종료 시)
      ffmpeg.stdin.write(audioBuffer);
      ffmpeg.stdin.end();
    }

    const room: RoomAudio = {
      ffmpeg,
      listeners: existingListeners,
      playing: true,
      initSegment: null,
      recentChunks: [],
      codec: 'aac',
      bitrate: bitrateKbps ?? parseInt(FFMPEG_BITRATE, 10),
    };
    this.rooms.set(roomId, room);
    for (const state of room.listeners.values()) state.synced = false;

    this.attachStderrHandler(roomId, ffmpeg, room);
    this.attachStdoutHandler(roomId, ffmpeg, room, onStart);
    this.attachCloseHandler(roomId, ffmpeg, room, onEnd, getNewUrl, onStart);
  }

  private attachStderrHandler(roomId: string, ffmpeg: ChildProcess, room: RoomAudio): void {
    ffmpeg.stderr!.on('data', (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (msg.includes('size=')) return;
      if (/Audio:\s*(\w+)/.exec(msg) && !room.codec) {
        room.codec = 'aac';
      }
      this.logger.warn(`[${roomId}] ffmpeg: ${msg}`);
    });
  }

  private attachStdoutHandler(
    roomId: string,
    ffmpeg: ChildProcess,
    room: RoomAudio,
    onStart?: () => Promise<void> | void,
  ): void {
    let headerBuf = Buffer.alloc(0);
    let headerDone = false;
    let startCb: (() => Promise<void> | void) | null = onStart ?? null;

    const fireStart = () => {
      if (startCb) {
        const cb = startCb;
        startCb = null;
        Promise.resolve(cb()).catch((e: unknown) => this.logger.warn(`[${roomId}] onStart error: ${e}`));
      }
    };

    ffmpeg.stdout!.on('data', (chunk: Buffer) => {
      if (!room.playing) return;

      if (!headerDone) {
        const initSeg = this.parseInitSegment((headerBuf = Buffer.concat([headerBuf, chunk])));
        if (!initSeg) return;
        room.initSegment = initSeg.segment;
        headerDone = true;
        this.logger.log(`[${roomId}] fMP4 init segment: ${initSeg.segment.length} bytes`);
        if (initSeg.rest.length) {
          this.broadcastChunk(room, initSeg.rest);
          fireStart();
        }
        headerBuf = Buffer.alloc(0);
        return;
      }

      // 첫 chunk 전송 시 onStart 호출
      fireStart();
      this.broadcastChunk(room, chunk);
    });

    // 곡이 짧아서 chunk 없이 끝난 경우
    ffmpeg.on('close', () => {
      fireStart();
    });
  }

  private attachCloseHandler(
    roomId: string,
    ffmpeg: ChildProcess,
    room: RoomAudio,
    onEnd: () => void,
    getNewUrl?: () => Promise<string>,
    onStart?: () => Promise<void> | void,
  ): void {
    let retries = 0;
    ffmpeg.on('close', async (code) => {
      if (this.rooms.get(roomId)?.ffmpeg !== ffmpeg) return;
      if (code && code !== 0 && getNewUrl && retries < FFMPEG_MAX_RETRIES) {
        retries++;
        this.logger.warn(`[${roomId}] ffmpeg crashed (code ${code}), retry ${retries}/${FFMPEG_MAX_RETRIES}`);
        try {
          const newUrl = await getNewUrl();
          this.spawnFfmpeg(roomId, newUrl, onEnd, getNewUrl, onStart);
          return;
        } catch (e) {
          this.logger.warn('ffmpeg retry failed', e instanceof Error ? e.message : e);
        }
      }
      room.ffmpeg = null;
      room.playing = false;
      onEnd();
    });
  }

  private parseInitSegment(buf: Buffer): ParsedInitSegment | null {
    const moovIdx = buf.indexOf(Buffer.from('moov'));
    if (moovIdx < 4) return null;
    const moovSize = buf.readUInt32BE(moovIdx - 4);
    const initEnd = moovIdx - 4 + moovSize;
    if (buf.length < initEnd) return null;
    return { segment: buf.subarray(0, initEnd), rest: buf.subarray(initEnd) };
  }

  private broadcastChunk(room: RoomAudio, chunk: Buffer): void {
    room.recentChunks.push(chunk);
    if (room.recentChunks.length > FFMPEG_RECENT_CHUNKS) room.recentChunks.shift();

    for (const state of room.listeners.values()) {
      if (state.synced) state.cb(chunk);
    }
  }
}
