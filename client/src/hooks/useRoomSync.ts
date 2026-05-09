'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { WsOpCode } from '@/lib/constants';
import { debug } from '@/lib/debug';

const MAX_RESYNC_RETRIES = 5;
const RESYNC_WAIT_MS = 2000;

interface UseRoomSyncOptions {
  send: (data: ArrayBuffer | Uint8Array) => void;
  prepareResync: () => Promise<void>;
  connected: boolean;
}

/**
 * useRoomSync — resync 로직 통합
 * listening 상태 관리 + resync 타이머/재시도 + WS 전송
 */
export function useRoomSync({ send, prepareResync, connected }: UseRoomSyncOptions) {
  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);
  const resyncTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const resyncRetriesRef = useRef(0);

  // listening 상태 동기화
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  /** WS로 resync 요청 전송 */
  const sendResyncRaw = useCallback(() => {
    debug('[sync] sending resync');
    send(new Uint8Array([WsOpCode.Resync]));
  }, [send]);

  /** 외부 호출: 재시도 카운터 리셋 + 전송 */
  const sendResync = useCallback(() => {
    resyncRetriesRef.current = 0;
    clearTimeout(resyncTimerRef.current);
    sendResyncRaw();
  }, [sendResyncRaw]);

  /** ResyncWait 수신 시 — 2초 후 재시도 */
  const onResyncWait = useCallback(() => {
    clearTimeout(resyncTimerRef.current);
    if (resyncRetriesRef.current >= MAX_RESYNC_RETRIES) return;
    resyncRetriesRef.current++;
    resyncTimerRef.current = setTimeout(sendResyncRaw, RESYNC_WAIT_MS);
  }, [sendResyncRaw]);

  /** streamState 변경 시 호출 — prepare 또는 send */
  const onResyncNeeded = useCallback(
    async (action: 'prepare' | 'send') => {
      if (!listeningRef.current) return;
      if (action === 'prepare') {
        await prepareResync();
      } else {
        sendResync();
      }
    },
    [prepareResync, sendResync],
  );

  /** listening 상태 전송 */
  const sendListening = useCallback(
    (on: boolean) => {
      send(new Uint8Array([WsOpCode.ListenerStatus, on ? 1 : 0]));
    },
    [send],
  );

  /** 듣기 토글 — useRoomAudio.init/pause + WS 전송 */
  const setListeningState = useCallback((on: boolean) => {
    setListening(on);
    listeningRef.current = on;
  }, []);

  // cleanup
  useEffect(() => () => clearTimeout(resyncTimerRef.current), []);

  // 재연결 시 listening 상태 복원
  useEffect(() => {
    if (connected && listeningRef.current) {
      setTimeout(() => {
        sendListening(true);
        sendResync();
      }, 100);
    }
  }, [connected, sendListening, sendResync]);

  return {
    listening,
    listeningRef,
    setListeningState,
    sendResync,
    sendListening,
    onResyncWait,
    onResyncNeeded,
  };
}
