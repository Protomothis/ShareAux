'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getApiUrl } from '@/lib/urls';

export type ConnState = 'connecting' | 'connected' | 'failed';

const RETRY_INTERVAL = 3000;

export function useServerStatus() {
  const router = useRouter();
  const [connState, setConnState] = useState<ConnState>('connecting');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const checkServer = useCallback(() => {
    setConnState('connecting');
    fetch(`${getApiUrl()}/setup/status`)
      .then((r) => r.json())
      .then((data: { needsSetup: boolean }) => {
        if (data.needsSetup) router.replace('/setup');
        else setConnState('connected');
      })
      .catch(() => {
        setConnState('failed');
        timerRef.current = setTimeout(checkServer, RETRY_INTERVAL);
      });
  }, [router]);

  const retry = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    checkServer();
  }, [checkServer]);

  useEffect(() => {
    checkServer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [checkServer]);

  return { connState, retry } as const;
}
