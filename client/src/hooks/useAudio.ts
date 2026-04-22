'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createAnalyser } from '../lib/audioAnalyser';
import { debug } from '../lib/debug';
import {
  attachMSE,
  BUFFER_REBUFFER,
  BUFFER_STARTUP,
  BUFFER_STEADY,
  BUFFER_TIMEOUT_MS,
  copyToArrayBuffer,
  createMSE,
  IS_MMS,
  isInitSegment,
  type ManagedMediaSourceLike,
  MIME,
  MSE_SUPPORTED,
  SYNC_DRIFT_THRESHOLD,
} from '../lib/mse';

type BufferPhase = 'startup' | 'rebuffer' | 'steady';

/** stall 횟수에 따른 rebuffer 임계값 에스컬레이션 */
function getBufferGoal(phase: BufferPhase, stallCount: number): number {
  if (phase === 'startup') return BUFFER_STARTUP;
  if (phase === 'steady') return BUFFER_STEADY;
  // rebuffer: stall 횟수에 따라 증가
  return Math.min(BUFFER_REBUFFER, 1.0 + stallCount * 0.5);
}

/**
 * useAudio — MSE fMP4 AAC 스트리밍 재생
 *
 * 핵심 설계:
 * - Audio + MediaSource + SourceBuffer는 init()에서 한 번만 생성
 * - 곡 전환/재시작 시 SourceBuffer.abort() + remove()로 데이터만 클리어
 * - audio.load() 절대 호출 안 함 → autoplay 정책 안 걸림
 * - 모든 프레임은 queue에 쌓고 flush로 순차 append
 */
export function useAudio(onPlaying?: () => void, onError?: () => void) {
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

  // 적응형 버퍼링 상태
  const phaseRef = useRef<BufferPhase>('startup');
  const stallCountRef = useRef(0);
  const didFirstPlayRef = useRef(false);
  const bufferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 버퍼링 중 로딩 상태 (외부 노출)
  const [buffering, setBuffering] = useState(false);

  const onPlayingRef = useRef(onPlaying);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onPlayingRef.current = onPlaying;
    onErrorRef.current = onError;
  }, [onPlaying, onError]);

  // --- flush: queue에서 하나씩 SourceBuffer에 append ---
  const resetMSERef = useRef<() => void>(() => {});

  const flush = useCallback(() => {
    const sb = sbRef.current;
    const ms = msRef.current;
    if (!sb || !ms || ms.readyState !== 'open' || appendingRef.current || !queueRef.current.length) return;
    if (resettingRef.current) return;
    appendingRef.current = true;
    try {
      sb.appendBuffer(queueRef.current.shift()!);
    } catch (e: unknown) {
      debug('[audio] flush error:', (e as Error)?.message);
      appendingRef.current = false;
      if (audioRef.current?.error) resetMSERef.current();
    }
  }, []);

  const needsFirstPlayRef = useRef(true);

  /** 버퍼 타임아웃 클리어 */
  const clearBufferTimeout = useCallback(() => {
    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
      bufferTimeoutRef.current = null;
    }
  }, []);

  /** 버퍼 확보 후 재생 시도 — 임계값 도달 또는 타임아웃 시 호출 */
  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    const sb = sbRef.current;
    if (!audio || !sb || !wantPlayRef.current) return;
    try {
      if (!sb.buffered.length) return;
    } catch {
      return;
    }

    clearBufferTimeout();

    const end = sb.buffered.end(sb.buffered.length - 1);
    const start = sb.buffered.start(0);

    // 첫 play 전 seek 1회
    if (!didFirstPlayRef.current) {
      audio.currentTime = start;
      didFirstPlayRef.current = true;
    }

    if (audio.paused) {
      setBuffering(false);
      phaseRef.current = 'steady';
      debug(`[audio] ▶ play — buffered: ${(end - start).toFixed(1)}s, phase→steady`);
      audio.play().catch((e) => debug('[audio] play failed:', e.message));
    }
  }, [clearBufferTimeout]);

  // --- clearBuffer: SourceBuffer 데이터만 클리어 (MSE/Audio 유지) ---
  const clearBuffer = useCallback((): Promise<void> => {
    const sb = sbRef.current;
    if (!sb) return Promise.resolve();

    queueRef.current = [];
    appendingRef.current = false;
    gotInitRef.current = false;
    resettingRef.current = true;
    needsFirstPlayRef.current = true;
    didFirstPlayRef.current = false;
    clearBufferTimeout();

    return new Promise<void>((resolve) => {
      try {
        if (sb.updating) sb.abort();
      } catch {
        /* */
      }

      const finish = () => {
        resettingRef.current = false;
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
  }, [clearBufferTimeout]);

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
            const goal = getBufferGoal(phaseRef.current, stallCountRef.current);

            // 버퍼 확보 대기 중 (paused)
            if (audio.paused) {
              if (buffered < goal) {
                // 타임아웃 설정 (최초 1회)
                if (!bufferTimeoutRef.current) {
                  setBuffering(true);
                  bufferTimeoutRef.current = setTimeout(() => {
                    debug(`[audio] ⏰ buffer timeout — playing with ${buffered.toFixed(1)}s`);
                    tryPlay();
                  }, BUFFER_TIMEOUT_MS);
                }
                flush();
                return;
              }
              tryPlay();
            } else {
              // 재생 중 — 서버 동기화 보정만
              if (audio.currentTime < start || audio.currentTime > end) {
                const target = Math.max(end - BUFFER_STARTUP, start);
                debug(`[audio] 🔄 sync drift — currentTime: ${audio.currentTime.toFixed(1)}s → ${target.toFixed(1)}s`);
                audio.currentTime = target;
              } else {
                const drift = end - audio.currentTime;
                if (drift > SYNC_DRIFT_THRESHOLD) {
                  const target = end - BUFFER_STARTUP;
                  debug(
                    `[audio] 🔄 drift ${drift.toFixed(1)}s > ${SYNC_DRIFT_THRESHOLD}s — seeking to ${target.toFixed(1)}s`,
                  );
                  audio.currentTime = target;
                }
              }
            }
          }
        } catch {
          /* SourceBuffer removed */
        }
        flush();
      });
    },
    [flush, tryPlay],
  );

  // --- resetMSE: 에러 상태에서 MSE + SourceBuffer 재생성 ---
  const resetMSE = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !MSE_SUPPORTED) return;
    debug('[audio] resetMSE — rebuilding MediaSource');
    audio.pause();
    wantPlayRef.current = false;
    queueRef.current = [];
    appendingRef.current = false;
    gotInitRef.current = false;
    resettingRef.current = false;
    needsFirstPlayRef.current = true;
    didFirstPlayRef.current = false;
    phaseRef.current = 'startup';
    stallCountRef.current = 0;
    clearBufferTimeout();
    sbRef.current = null;
    readyRef.current = false;

    const ms = createMSE();
    msRef.current = ms;
    attachMSE(audio, ms);

    if (ms.readyState === 'open') {
      setupSb(ms);
      readyRef.current = true;
    } else {
      ms.addEventListener(
        'sourceopen',
        () => {
          setupSb(ms);
          readyRef.current = true;
        },
        { once: true },
      );
    }
    onErrorRef.current?.();
  }, [setupSb, clearBufferTimeout]);
  resetMSERef.current = resetMSE;

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
      phaseRef.current = 'steady';
      setBuffering(true);
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
    // stall 감지 → pause + rebuffer
    audio.addEventListener('waiting', () => {
      needsFirstPlayRef.current = true;
      stallCountRef.current++;
      phaseRef.current = 'rebuffer';
      setBuffering(true);
      audio.pause();
      const sb = sbRef.current;
      const buffered = sb?.buffered.length ? sb.buffered.end(sb.buffered.length - 1) - audio.currentTime : 0;
      debug(
        `[audio] ⏳ stall #${stallCountRef.current} — paused for rebuffer, ahead: ${buffered.toFixed(1)}s, goal: ${getBufferGoal('rebuffer', stallCountRef.current).toFixed(1)}s`,
      );
    });
    audio.addEventListener('playing', () => {
      setBuffering(false);
      if (phaseRef.current === 'rebuffer') {
        phaseRef.current = 'steady';
        const sb = sbRef.current;
        const buffered = sb?.buffered.length ? sb.buffered.end(sb.buffered.length - 1) - audio.currentTime : 0;
        debug(`[audio] ▶️ resumed — ahead: ${buffered.toFixed(1)}s, phase→steady`);
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
    phaseRef.current = 'startup';
    setBuffering(true);

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
        flush();
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
            flush();
            resolve();
          },
          { once: true },
        );
      }
    });

    // play는 updateend에서 버퍼 확보 후 호출 — 여기서 호출하면 빈 MSE에서 ended 전환
  }, [setupSb, clearBuffer, flush]);

  // --- pause ---
  const pause = useCallback(() => {
    wantPlayRef.current = false;
    clearBufferTimeout();
    setBuffering(false);
    audioRef.current?.pause();
  }, [clearBufferTimeout]);

  // --- pushFrame: 프레임 수신 처리 ---
  const pushFrame = useCallback(
    (data: Uint8Array) => {
      if (resettingRef.current) return;

      const isInit = isInitSegment(data);

      if (!isInit && !gotInitRef.current) return;
      if (isInit && gotInitRef.current) return;
      if (isInit) gotInitRef.current = true;

      queueRef.current.push(copyToArrayBuffer(data));
      if (readyRef.current && msRef.current?.readyState === 'open' && sbRef.current && !resettingRef.current) flush();
    },
    [flush],
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

  // resync/곡 전환 준비 — 버퍼 클리어 + 다음 init을 첫 init으로 인식
  const prepareResync = useCallback(() => {
    if (audioRef.current?.error) {
      resetMSERef.current();
      return Promise.resolve();
    }
    phaseRef.current = 'startup';
    stallCountRef.current = 0;
    gotInitRef.current = false;
    return clearBuffer();
  }, [clearBuffer]);

  return {
    init,
    pause,
    pushFrame,
    prepareResync,
    setVolume,
    setMuted,
    getAnalyser,
    getDelay,
    getCurrentTime,
    supported: MSE_SUPPORTED,
    /** 버퍼 확보 대기 중 여부 — play 버튼 로딩 표시용 */
    buffering,
  };
}
