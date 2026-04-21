'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { WsCloseCode, WsOpCode, WS_MAX_DELAY, WS_MAX_RETRIES } from '@/lib/constants';
import { debug } from '@/lib/debug';
import type { UseWebSocketOptions } from '@/types';

export function useWebSocket({
  url,
  enabled = true,
  onAudio,
  onChat,
  onSystem,
  onReaction,
  onReconnect,
  onTokenExpired,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const hasConnectedRef = useRef(false);
  const oneWayRef = useRef(0);
  const rttSamplesRef = useRef<number[]>([]);
  const urlRef = useRef(url);
  useEffect(() => {
    urlRef.current = url;
  }, [url]);
  const callbacksRef = useRef({ onAudio, onChat, onSystem, onReaction, onReconnect, onTokenExpired });
  useEffect(() => {
    callbacksRef.current = { onAudio, onChat, onSystem, onReaction, onReconnect, onTokenExpired };
  }, [onAudio, onChat, onSystem, onReaction, onReconnect, onTokenExpired]);

  const connectRef = useRef<() => void>(undefined);

  const sendPing = useCallback((ws: WebSocket) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const buf = new ArrayBuffer(9);
    const view = new DataView(buf);
    view.setUint8(0, WsOpCode.PingMeasure);
    view.setFloat64(1, performance.now());
    ws.send(buf);
  }, []);

  const [wsConnected, setWsConnected] = useState(true);
  const wasConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const connectUrl = urlRef.current;
    debug('[WS] connecting to', connectUrl.substring(0, 60) + '...');
    const ws = new WebSocket(connectUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      debug('[WS] connected');
      setWsConnected(true);
      wasConnectedRef.current = true;
      const wasReconnect = hasConnectedRef.current;
      hasConnectedRef.current = true;
      retriesRef.current = 0;
      if (wasReconnect) callbacksRef.current.onReconnect?.();

      // RTT 초기 캘리브레이션 (3회)
      rttSamplesRef.current = [];
      for (let i = 0; i < 3; i++) setTimeout(() => sendPing(ws), i * 100);

      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(new Uint8Array([WsOpCode.Heartbeat]));
          sendPing(ws); // heartbeat마다 RTT 갱신
        }
      }, 30_000);
    };

    ws.onmessage = (e) => {
      if (!(e.data instanceof ArrayBuffer) || e.data.byteLength < 1) return;
      const bytes = new Uint8Array(e.data);
      const type = bytes[0];

      if (type === WsOpCode.Audio) {
        callbacksRef.current.onAudio?.(bytes.slice(1));
      } else if (type === WsOpCode.ResyncWait) {
        debug('[WS] resync wait — retrying in 2s');
        clearTimeout(resyncTimerRef.current);
        resyncTimerRef.current = setTimeout(() => {
          if (resyncRetriesRef.current < 5) {
            resyncRetriesRef.current++;
            sendResyncRaw();
          }
        }, 2000);
      } else if (type === WsOpCode.PingMeasure && bytes.byteLength >= 9) {
        // RTT 측정 응답: 1바이트 opcode + 8바이트 Float64 타임스탬프
        const view = new DataView(e.data);
        const sent = view.getFloat64(1);
        const rtt = performance.now() - sent;
        const samples = rttSamplesRef.current;
        samples.push(rtt);
        if (samples.length > 5) samples.shift();
        // 중앙값 사용 (이상치 제거)
        const sorted = [...samples].sort((a, b) => a - b);
        oneWayRef.current = sorted[Math.floor(sorted.length / 2)] / 2;
      } else if (type === WsOpCode.Reaction && bytes.byteLength >= 2) {
        callbacksRef.current.onReaction?.(bytes[1]);
      } else if (bytes.byteLength >= 2) {
        try {
          const json = JSON.parse(new TextDecoder().decode(bytes.slice(1)));
          if (type === WsOpCode.Chat) callbacksRef.current.onChat?.(json);
          else if (type === WsOpCode.System) callbacksRef.current.onSystem?.(json);
        } catch {
          /* ignore */
        }
      }
    };

    ws.onclose = (e) => {
      debug('[WS] closed, code:', e.code, 'retry:', retriesRef.current);
      if (wasConnectedRef.current) setWsConnected(false);
      clearInterval(heartbeatRef.current);
      if (e.code === WsCloseCode.Kicked) {
        callbacksRef.current.onSystem?.({ event: 'kicked', detail: '방에서 추방되었습니다' });
        return;
      }
      if (e.code === WsCloseCode.RoomGone) {
        callbacksRef.current.onSystem?.({ event: 'roomClosed', detail: '방이 종료되었습니다' });
        return;
      }
      if (e.code === WsCloseCode.DuplicateSession) {
        callbacksRef.current.onSystem?.({
          event: 'duplicateSession',
          detail: '다른 기기에서 접속하여 연결이 종료되었습니다',
        });
        return;
      }
      if (e.code === WsCloseCode.JoinedOtherRoom) {
        callbacksRef.current.onSystem?.({
          event: 'joinedOtherRoom',
          detail: '다른 방에 입장하여 연결이 종료되었습니다',
        });
        return;
      }
      // 토큰 만료: 새 토큰으로 URL 갱신 후 재연결
      if (e.code === WsCloseCode.TokenExpired && callbacksRef.current.onTokenExpired) {
        debug('[WS] token expired, refreshing...');
        // 쿠키 기반: refresh API 호출 후 재연결 (새 쿠키 자동 설정)
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
      if (wsRef.current !== ws) return;
      if (retriesRef.current >= WS_MAX_RETRIES) {
        callbacksRef.current.onSystem?.({ event: 'roomClosed', detail: '서버와 연결이 끊어졌습니다' });
        return;
      }
      const delay = Math.min(1000 * 2 ** retriesRef.current, WS_MAX_DELAY);
      retriesRef.current++;
      timerRef.current = setTimeout(() => connectRef.current?.(), delay);
    };

    ws.onerror = () => {
      debug('[WS] error');
      ws.close();
    };
  }, []);
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => connect(), 0);

    // iOS Safari: WS gets suspended on background, force reconnect on foreground
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
      clearTimeout(resyncTimerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(heartbeatRef.current);
      retriesRef.current = WS_MAX_RETRIES;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, enabled]);

  const sendChat = useCallback((message: string, userId = '', nickname = '') => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const payload = new TextEncoder().encode(
      JSON.stringify({ userId, nickname, message, timestamp: new Date().toISOString() }),
    );
    const frame = new Uint8Array(1 + payload.length);
    frame[0] = WsOpCode.Chat;
    frame.set(payload, 1);
    ws.send(frame);
  }, []);

  // --- Resync ---
  const resyncTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const resyncRetriesRef = useRef(0);

  const sendResyncRaw = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;
    debug('[WS] sending resync');
    ws.send(new Uint8Array([WsOpCode.Resync]));
  }, []);

  /** 외부 호출: 재시도 카운터 리셋 + WS 전송 */
  const sendResync = useCallback(() => {
    resyncRetriesRef.current = 0;
    clearTimeout(resyncTimerRef.current);
    sendResyncRaw();
  }, [sendResyncRaw]);

  const sendListening = useCallback((on: boolean) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(new Uint8Array([WsOpCode.ListenerStatus, on ? 1 : 0]));
  }, []);

  const sendReaction = useCallback((index: number) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(new Uint8Array([WsOpCode.Reaction, index]));
  }, []);

  const getOneWay = useCallback(() => oneWayRef.current, []);

  return { sendChat, sendResync, sendListening, sendReaction, getOneWay, wsConnected };
}
