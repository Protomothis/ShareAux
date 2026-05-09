'use client';
import { useCallback, useRef } from 'react';

import { WsOpCode } from '@/lib/constants';
import { debug } from '@/lib/debug';
import type { ChatMessage } from '@/types';

interface WsMessageCallbacks {
  onAudio?: (frame: Uint8Array) => void;
  onChat?: (data: ChatMessage) => void;
  onSystem?: (data: { event: string; detail: string; data?: Record<string, unknown> }) => void;
  onReaction?: (index: number) => void;
  onResyncWait?: () => void;
}

/**
 * useWsMessages — opcode별 디스패치 + RTT 측정
 * useWebSocket의 onMessage에 연결하여 사용.
 */
export function useWsMessages(callbacks: WsMessageCallbacks) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  // RTT 측정
  const rttSamplesRef = useRef<number[]>([]);
  const oneWayRef = useRef(0);

  const getOneWay = useCallback(() => oneWayRef.current, []);

  /** ping 전송용 바이너리 생성 */
  const buildPing = useCallback((): ArrayBuffer => {
    const buf = new ArrayBuffer(9);
    const view = new DataView(buf);
    view.setUint8(0, WsOpCode.PingMeasure);
    view.setFloat64(1, performance.now());
    return buf;
  }, []);

  /** onMessage 핸들러 — useWebSocket에 전달 */
  const handleMessage = useCallback((data: ArrayBuffer) => {
    const bytes = new Uint8Array(data);
    const opcode = bytes[0];

    switch (opcode) {
      case WsOpCode.Audio:
        cbRef.current.onAudio?.(bytes.subarray(1));
        break;

      case WsOpCode.ResyncWait:
        debug('[WS] resync wait');
        cbRef.current.onResyncWait?.();
        break;

      case WsOpCode.PingMeasure: {
        if (data.byteLength < 9) break;
        const view = new DataView(data);
        const sent = view.getFloat64(1);
        const rtt = performance.now() - sent;
        const samples = rttSamplesRef.current;
        samples.push(rtt);
        if (samples.length > 5) samples.shift();
        const sorted = [...samples].sort((a, b) => a - b);
        oneWayRef.current = sorted[Math.floor(sorted.length / 2)] / 2;
        break;
      }

      case WsOpCode.Reaction:
        if (bytes.byteLength >= 2) cbRef.current.onReaction?.(bytes[1]);
        break;

      default:
        // Chat / System — JSON payload
        if (bytes.byteLength < 2) break;
        try {
          const json = JSON.parse(new TextDecoder().decode(bytes.subarray(1)));
          if (opcode === WsOpCode.Chat) cbRef.current.onChat?.(json as ChatMessage);
          else if (opcode === WsOpCode.System) cbRef.current.onSystem?.(json);
        } catch {
          /* malformed */
        }
        break;
    }
  }, []);

  return { handleMessage, getOneWay, buildPing };
}
