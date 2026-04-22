export const MIME = 'audio/mp4; codecs=mp4a.40.2';
export const FTYP = [0x66, 0x74, 0x79, 0x70] as const;
/** @deprecated 적응형 버퍼링으로 대체 — useAudio 내부에서 상태별 임계값 사용 */
export const BUFFER_GOAL = 3.0;

/** 적응형 버퍼링 임계값 (초) */
export const BUFFER_STARTUP = 2.0;
export const BUFFER_REBUFFER = 2.5;
export const BUFFER_STEADY = 0.4;
export const BUFFER_TIMEOUT_MS = 5000;

/** 서버 동기화 보정 임계값 (초) — 이 이상 차이나면 currentTime 보정 */
export const SYNC_DRIFT_THRESHOLD = 5.0;
export const FADE_OUT_SEC = 2.5;
export const FADE_IN_SEC = 3.0;

interface ManagedMediaSourceLike extends MediaSource {
  handle?: MediaSourceHandle;
}

// Safari iOS uses ManagedMediaSource
const MSE =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, typeof MediaSource>).ManagedMediaSource ?? window.MediaSource)
    : undefined;

export const IS_MMS =
  typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).ManagedMediaSource;

export const MSE_SUPPORTED = !!MSE && (typeof MSE.isTypeSupported === 'function' ? MSE.isTypeSupported(MIME) : true);

export function createMSE(): ManagedMediaSourceLike {
  if (!MSE) throw new Error('MSE not available');
  return new MSE() as ManagedMediaSourceLike;
}

export function attachMSE(audio: HTMLAudioElement, ms: ManagedMediaSourceLike): void {
  if (ms.handle) {
    (audio as unknown as Record<string, unknown>).srcObject = ms.handle;
  } else {
    audio.src = URL.createObjectURL(ms);
  }
}

export function isInitSegment(data: Uint8Array): boolean {
  return data.length >= 8 && data[4] === FTYP[0] && data[5] === FTYP[1] && data[6] === FTYP[2] && data[7] === FTYP[3];
}

export function copyToArrayBuffer(data: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(data.byteLength);
  new Uint8Array(ab).set(data);
  return ab;
}

export type { ManagedMediaSourceLike };
