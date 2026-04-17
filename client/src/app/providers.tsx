'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/stores/auth';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => { useAuthStore.getState().init(); }, []);

  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
