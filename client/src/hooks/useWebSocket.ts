'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { WS_MAX_DELAY, WS_MAX_RETRIES, WsCloseCode, WsOpCode } from '@/lib/constants';
import { debug } from '@/lib/debug';

export interface WsConnection {
  send: (data: ArrayBuffer | Uint8Array) => void;
  close: () => void;
  connected: boolean;
}

interface UseWebSocketOptions {
  url: string;
  enabled?: boolean;
  onMessage?: (data: ArrayBuffer) => void;
  onReconnect?: () => void;
  onClose?: (code: number) => void;
}

/**
 * useWebSocket — 순수 연결 관리
 * 연결/재연결/heartbeat/visibilitychange/send만 담당.
 * 메시지 파싱은 하지 않음 — onMessage로 raw ArrayBuffer 전달.
 */
export function useWebSocket({ url, enabled = true, onMessage, onReconnect, onClose }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const hasConnectedRef = useRef(false);
  const urlRef = useRef(url);
  const callbacksRef = useRef({ onMessage, onReconnect, onClose });

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    urlRef.current = url;
  }, [url]);
  useEffect(() => {
    callbacksRef.current = { onMessage, onReconnect, onClose };
  }, [onMessage, onReconnect, onClose]);

  const connectRef = useRef<() => void>(undefined);

  const connect = useCallback(() => {
    const ws = wsRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    // CLOSING 상태면 정리 후 재연결
    if (ws && ws.readyState === WebSocket.CLOSING) {
      ws.onclose = null;
      ws.onerror = null;
    }

    debug('[WS] connecting...');
    const newWs = new WebSocket(urlRef.current);
    newWs.binaryType = 'arraybuffer';
    wsRef.current = newWs;

    newWs.onopen = () => {
      debug('[WS] connected');
      setConnected(true);
      const wasReconnect = hasConnectedRef.current;
      hasConnectedRef.current = true;
      retriesRef.current = 0;
      if (wasReconnect) callbacksRef.current.onReconnect?.();

      heartbeatRef.current = setInterval(() => {
        if (newWs.readyState === WebSocket.OPEN) {
          newWs.send(new Uint8Array([WsOpCode.Heartbeat]));
        }
      }, 30_000);
    };

    newWs.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer && e.data.byteLength >= 1) {
        callbacksRef.current.onMessage?.(e.data);
      }
    };

    newWs.onclose = (e) => {
      debug('[WS] closed, code:', e.code);
      setConnected(false);
      clearInterval(heartbeatRef.current);
      callbacksRef.current.onClose?.(e.code);

      // 의도적 종료 — 재연결 안 함
      const noReconnect: number[] = [
        WsCloseCode.Kicked,
        WsCloseCode.RoomGone,
        WsCloseCode.DuplicateSession,
        WsCloseCode.JoinedOtherRoom,
      ];
      if (noReconnect.includes(e.code)) return;

      // 토큰 만료 — refresh 후 재연결
      if (e.code === WsCloseCode.TokenExpired) {
        fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
          .then((r) => {
            if (r.ok) {
              retriesRef.current = 0;
              connectRef.current?.();
            }
          })
          .catch(() => {});
        return;
      }

      if (wsRef.current !== newWs) return;
      if (retriesRef.current >= WS_MAX_RETRIES) return;

      const delay = Math.min(1000 * 2 ** retriesRef.current, WS_MAX_DELAY);
      retriesRef.current++;
      timerRef.current = setTimeout(() => connectRef.current?.(), delay);
    };

    newWs.onerror = () => {
      newWs.close();
    };
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => connect(), 0);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && wsRef.current?.readyState !== WebSocket.OPEN) {
        retriesRef.current = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(id);
      clearTimeout(timerRef.current);
      clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      retriesRef.current = WS_MAX_RETRIES; // cleanup 중 재연결 방지
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, enabled]);

  const send = useCallback((data: ArrayBuffer | Uint8Array) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(data);
  }, []);

  const close = useCallback(() => {
    wsRef.current?.close();
  }, []);

  return { send, close, connected };
}
