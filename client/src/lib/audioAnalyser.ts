export interface AudioAnalyserHandle {
  analyser: AnalyserNode;
  gainNode: GainNode;
  ctx: AudioContext;
}

/** 데스크탑 전용 — 실제 주파수 분석 + GainNode for crossfade */
export function createAnalyser(audio: HTMLAudioElement): AudioAnalyserHandle {
  const ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 64;

  const src = ctx.createMediaElementSource(audio);
  const gainNode = ctx.createGain();
  src.connect(analyser);
  analyser.connect(gainNode);
  gainNode.connect(ctx.destination);
  return { analyser, gainNode, ctx };
}
