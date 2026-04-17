'use client';

import { useEffect, useRef } from 'react';

import type { VisualMode } from '@/types';

const BAR_COUNT = 24;
const PINK = [0xff, 0x40, 0x81] as const;
const CYAN = [0x00, 0xe5, 0xff] as const;

export const VISUAL_MODES: { key: VisualMode; label: string }[] = [
  { key: 'bars', label: '▮' },
  { key: 'wave', label: '∿' },
  { key: 'mirror', label: '⫼' },
  { key: 'dots', label: '●' },
];

interface VisualizerProps {
  getAnalyser: () => AnalyserNode | null;
  active: boolean;
  mode: VisualMode;
}

export default function Visualizer({ getAnalyser, active, mode }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const barsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let analyser: AnalyserNode | null = null;
    let data: Uint8Array | undefined;

    if (active) {
      analyser = getAnalyser();
      if (analyser) data = new Uint8Array(analyser.frequencyBinCount);
    }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const bars = barsRef.current;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);

      if (active && analyser && data) {
        analyser.getByteFrequencyData(data as unknown as Uint8Array<ArrayBuffer>);
        for (let i = 0; i < BAR_COUNT; i++) {
          const idx = Math.floor((i / BAR_COUNT) * data.length);
          bars[i] += (data[idx] / 255 - bars[i]) * 0.3;
        }
      } else {
        for (let i = 0; i < BAR_COUNT; i++) bars[i] *= 0.92;
      }

      if (mode === 'bars') drawBars(ctx, w, h, bars);
      else if (mode === 'wave') drawWave(ctx, w, h, bars);
      else if (mode === 'mirror') drawMirror(ctx, w, h, bars);
      else if (mode === 'dots') drawDots(ctx, w, h, bars);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);

    function drawBars(c: CanvasRenderingContext2D, w: number, h: number, b: number[]) {
      const gap = 2;
      const bw = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      for (let i = 0; i < BAR_COUNT; i++) {
        const bh = Math.max(1, b[i] * h * 0.9);
        const t = i / BAR_COUNT;
        const r = Math.round(lerp(PINK[0], CYAN[0], t));
        const g = Math.round(lerp(PINK[1], CYAN[1], t));
        const bl = Math.round(lerp(PINK[2], CYAN[2], t));
        c.fillStyle = `rgba(${r},${g},${bl},${0.4 + b[i] * 0.6})`;
        c.beginPath();
        c.roundRect(i * (bw + gap), h - bh, bw, bh, 1);
        c.fill();
      }
    }

    function drawWave(c: CanvasRenderingContext2D, w: number, h: number, b: number[]) {
      c.beginPath();
      c.moveTo(0, h);
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = (i / (BAR_COUNT - 1)) * w;
        const y = h - b[i] * h * 0.85;
        if (i === 0) c.moveTo(x, y);
        else {
          const px = ((i - 1) / (BAR_COUNT - 1)) * w;
          const py = h - b[i - 1] * h * 0.85;
          c.quadraticCurveTo((px + x) / 2, py, x, y);
        }
      }
      c.lineTo(w, h);
      c.lineTo(0, h);
      c.closePath();
      const grad = c.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, `rgba(${PINK[0]},${PINK[1]},${PINK[2]},0.5)`);
      grad.addColorStop(1, `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},0.3)`);
      c.fillStyle = grad;
      c.fill();
      // stroke
      c.beginPath();
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = (i / (BAR_COUNT - 1)) * w;
        const y = h - b[i] * h * 0.85;
        if (i === 0) c.moveTo(x, y);
        else {
          const px = ((i - 1) / (BAR_COUNT - 1)) * w;
          const py = h - b[i - 1] * h * 0.85;
          c.quadraticCurveTo((px + x) / 2, py, x, y);
        }
      }
      c.strokeStyle = `rgba(${PINK[0]},${PINK[1]},${PINK[2]},0.7)`;
      c.lineWidth = 1.5;
      c.stroke();
    }

    function drawMirror(c: CanvasRenderingContext2D, w: number, h: number, b: number[]) {
      const gap = 2;
      const bw = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      const mid = h / 2;
      for (let i = 0; i < BAR_COUNT; i++) {
        const bh = Math.max(0.5, b[i] * mid * 0.85);
        const t = i / BAR_COUNT;
        const r = Math.round(lerp(PINK[0], CYAN[0], t));
        const g = Math.round(lerp(PINK[1], CYAN[1], t));
        const bl = Math.round(lerp(PINK[2], CYAN[2], t));
        const alpha = 0.4 + b[i] * 0.6;
        const x = i * (bw + gap);
        // top half
        c.fillStyle = `rgba(${r},${g},${bl},${alpha})`;
        c.beginPath();
        c.roundRect(x, mid - bh, bw, bh, 1);
        c.fill();
        // bottom half (dimmer)
        c.fillStyle = `rgba(${r},${g},${bl},${alpha * 0.4})`;
        c.beginPath();
        c.roundRect(x, mid, bw, bh, 1);
        c.fill();
      }
    }

    function drawDots(c: CanvasRenderingContext2D, w: number, h: number, b: number[]) {
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = ((i + 0.5) / BAR_COUNT) * w;
        const radius = 1 + b[i] * 5;
        const t = i / BAR_COUNT;
        const r = Math.round(lerp(PINK[0], CYAN[0], t));
        const g = Math.round(lerp(PINK[1], CYAN[1], t));
        const bl = Math.round(lerp(PINK[2], CYAN[2], t));
        const y = h / 2 + Math.sin(Date.now() / 600 + i * 0.5) * b[i] * h * 0.3;
        // glow
        c.beginPath();
        c.arc(x, y, radius * 2, 0, Math.PI * 2);
        c.fillStyle = `rgba(${r},${g},${bl},${b[i] * 0.2})`;
        c.fill();
        // dot
        c.beginPath();
        c.arc(x, y, radius, 0, Math.PI * 2);
        c.fillStyle = `rgba(${r},${g},${bl},${0.5 + b[i] * 0.5})`;
        c.fill();
      }
    }
  }, [active, getAnalyser, mode]);

  return <canvas ref={canvasRef} width={240} height={32} className="w-full h-8" />;
}
