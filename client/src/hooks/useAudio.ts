'use client';
import { useCallback, useEffect, useRef } from 'react';

import { createAnalyser } from '../lib/audioAnalyser';
import { debug } from '../lib/debug';
import {
  attachMSE,
  BUFFER_GOAL,
  copyToArrayBuffer,
  createMSE,
  IS_MMS,
  isInitSegment,
  type ManagedMediaSourceLike,
  MIME,
  MSE_SUPPORTED,
} from '../lib/mse';

/**
 * useAudio — MSE fMP4 AAC 스트리밍 재생
 *
 * 핵심 설계:
 * - Audio + MediaSource + SourceBuffer는 init()에서 한 번만 생성
 * - 곡 전환/재시작 시 SourceBuffer.abort() + remove()로 데이터만 클리어
 * - audio.load() 절대 호출 안 함 → autoplay 정책 안 걸림
 * - 모든 프레임은 queue에 쌓고 flush로 순차 append
 */
export function useAudio(onPlaying?: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const msRef = useRef<ManagedMediaSourceLike | null>(null);
  const sbRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const appendingRef = useRef(false);
  const readyRef = useRef(false);
  const volumeRef = useRef(1);
  const wantPlayRef = useRef(false);
  const gotInitRef = useRef(false);
  const resettingRef = useRef(false);

  const onPlayingRef = useRef(onPlaying);
  useEffect(() => {
    onPlayingRef.current = onPlaying;
  }, [onPlaying]);

  // --- flush: queue에서 하나씩 SourceBuffer에 append ---
  const flush = useCallback(() => {
    const sb = sbRef.current;
    const ms = msRef.current;
    if (!sb || !ms || ms.readyState !== 'open' || appendingRef.current || !queueRef.current.length) return;
    if (resettingRef.current) return; // clearBuffer 진행 중
    appendingRef.current = true;
    try {
      sb.appendBuffer(queueRef.current.shift()!);
    } catch (e: unknown) {
      debug('[audio] flush error:', (e as Error)?.message);
      appendingRef.current = false;
    }
  }, []);

  const needsFirstPlayRef = useRef(true);

  // --- clearBuffer: SourceBuffer 데이터만 클리어 (MSE/Audio 유지) ---
  const clearBuffer = useCallback((): Promise<void> => {
    const sb = sbRef.current;
    if (!sb) return Promise.resolve();

    queueRef.current = [];
    appendingRef.current = false;
    gotInitRef.current = false;
    resettingRef.current = true;
    needsFirstPlayRef.current = true;

    return new Promise<void>((resolve) => {
      try {
        if (sb.updating) sb.abort();
      } catch {
        /* */
      }

      const finish = () => {
        resettingRef.current = false;
        if (audioRef.current) audioRef.current.currentTime = 0;
        resolve();
      };

      try {
        if (sb.buffered.length > 0) {
          const start = sb.buffered.start(0);
          const end = sb.buffered.end(sb.buffered.length - 1);
          sb.remove(start, end);
          sb.addEventListener('updateend', finish, { once: true });
          return;
        }
      } catch {
        /* */
      }

      finish();
    });
  }, []);

  // --- setupSb: SourceBuffer 생성 + updateend 핸들러 ---
  const setupSb = useCallback(
    (ms: MediaSource) => {
      const sb = ms.addSourceBuffer(MIME);
      sb.mode = 'segments';
      sbRef.current = sb;
      sb.addEventListener('updateend', () => {
        appendingRef.current = false;
        if (sbRef.current !== sb || resettingRef.current) return;
        const audio = audioRef.current;
        try {
          if (audio && wantPlayRef.current && sb.buffered.length > 0) {
            const end = sb.buffered.end(sb.buffered.length - 1);
            const start = sb.buffered.start(0);
            const buffered = end - start;

            if (audio.paused && buffered < BUFFER_GOAL) {
              flush();
              return;
            }

            if (audio.currentTime < start || audio.currentTime > end) {
              audio.currentTime = Math.max(end - BUFFER_GOAL, start);
            }
            if (audio.paused) {
              audio.play().catch((e) => debug('[audio] play failed:', e.message));
            }
          }
        } catch {
          /* SourceBuffer removed */
        }
        flush();
      });
    },
    [flush],
  );

  // --- Analyser (데스크톱 Visualizer용) ---
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAnalyser = useCallback(() => {
    if (analyserRef.current) return analyserRef.current;
    const audio = audioRef.current;
    if (!audio) return null;
    const handle = createAnalyser(audio);
    analyserRef.current = handle.analyser;
    gainNodeRef.current = handle.gainNode;
    audioCtxRef.current = handle.ctx;
    return handle.analyser;
  }, []);

  // --- init: Audio + MSE 한 번만 생성 ---
  const init = useCallback(async () => {
    if (readyRef.current) {
      wantPlayRef.current = true;
      audioRef.current?.play().catch(() => {
        /* updateend에서 재시도 */
      });
      await clearBuffer();
      return;
    }

    const audio = new Audio();
    audio.volume = volumeRef.current;
    audio.disableRemotePlayback = true;
    // 최초/곡 전환: timeupdate로 실제 재생 확인 (1회만)
    audio.addEventListener('timeupdate', () => {
      if (needsFirstPlayRef.current) {
        needsFirstPlayRef.current = false;
        onPlayingRef.current?.();
      }
    });
    // 중간 버퍼링 복구: waiting → playing
    let wasWaiting = false;
    audio.addEventListener('waiting', () => {
      needsFirstPlayRef.current = true; // 다음 timeupdate에서 다시 fire
      wasWaiting = true;
      const sb = sbRef.current;
      const buffered = sb?.buffered.length ? sb.buffered.end(sb.buffered.length - 1) - audio.currentTime : 0;
      debug(
        `[audio] ⏳ buffering — currentTime: ${audio.currentTime.toFixed(1)}s, ahead: ${buffered.toFixed(1)}s, queue: ${queueRef.current.length}`,
      );
    });
    audio.addEventListener('playing', () => {
      if (wasWaiting) {
        wasWaiting = false;
        const sb = sbRef.current;
        const buffered = sb?.buffered.length ? sb.buffered.end(sb.buffered.length - 1) - audio.currentTime : 0;
        debug(`[audio] ▶️ resumed — ahead: ${buffered.toFixed(1)}s`);
        onPlayingRef.current?.();
      }
    });
    audioRef.current = audio;

    if (!MSE_SUPPORTED) {
      debug('[useAudio] MSE not supported');
      return;
    }

    const ms = createMSE();
    msRef.current = ms;
    wantPlayRef.current = true;

    if (IS_MMS) {
      (ms as EventTarget).addEventListener('startstreaming', () => {
        if (audioRef.current?.paused && wantPlayRef.current) {
          audioRef.current.play().catch((e) => debug('[audio] MMS play:', e.message));
        }
      });
    }

    attachMSE(audio, ms);

    await new Promise<void>((resolve) => {
      if (ms.readyState === 'open') {
        setupSb(ms);
        readyRef.current = true;
        resolve();
      } else {
        const timeout = setTimeout(() => {
          debug('[audio] sourceopen timeout');
          resolve();
        }, 3000);
        ms.addEventListener(
          'sourceopen',
          () => {
            clearTimeout(timeout);
            setupSb(ms);
            readyRef.current = true;
            resolve();
          },
          { once: true },
        );
      }
    });

    audio.play().catch(() => {
      /* expected: no data yet */
    });
    if (audio.paused) audio.play().catch((e) => debug('[audio] init play retry:', e.message));
  }, [setupSb, clearBuffer]);

  // --- pause ---
  const pause = useCallback(() => {
    wantPlayRef.current = false;
    audioRef.current?.pause();
  }, []);

  // --- pushFrame: 프레임 수신 처리 ---
  const pushFrame = useCallback(
    (data: Uint8Array) => {
      if (resettingRef.current) return; // clearBuffer 진행 중

      const isInit = isInitSegment(data);

      if (!isInit && !gotInitRef.current) return;

      if (isInit) {
        if (gotInitRef.current) {
          // 곡 전환: SourceBuffer 클리어 후 init segment 재투입
          debug('[audio] track change, clearing buffer');
          void clearBuffer().then(() => {
            gotInitRef.current = true;
            queueRef.current.push(copyToArrayBuffer(data));
            flush();
          });
          return;
        }
        gotInitRef.current = true;
      }

      queueRef.current.push(copyToArrayBuffer(data));
      if (readyRef.current && msRef.current?.readyState === 'open' && sbRef.current && !resettingRef.current) flush();
    },
    [flush, clearBuffer],
  );

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v;
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, v));
  }, []);

  const setMuted = useCallback((m: boolean) => {
    if (audioRef.current) audioRef.current.volume = m ? 0 : volumeRef.current;
  }, []);

  const getDelay = useCallback(() => {
    const sb = sbRef.current;
    const audio = audioRef.current;
    if (!sb || !audio) return 0;
    try {
      if (!sb.buffered.length) return 0;
      return sb.buffered.end(sb.buffered.length - 1) - audio.currentTime;
    } catch {
      return 0;
    }
  }, []);

  /** 현재 오디오 재생 위치 (ms) */
  const getCurrentTime = useCallback(() => (audioRef.current?.currentTime ?? 0) * 1000, []);

  return {
    init,
    pause,
    pushFrame,
    setVolume,
    setMuted,
    getAnalyser,
    getDelay,
    getCurrentTime,
    supported: MSE_SUPPORTED,
  };
}
