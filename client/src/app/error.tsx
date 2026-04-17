'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="text-center">
        <p className="mb-2 text-5xl">⚠️</p>
        <h2 className="mb-2 text-xl font-semibold">문제가 발생했습니다</h2>
        <p className="mb-6 text-sm text-white/50">{error.message || '예상치 못한 오류가 발생했습니다'}</p>
        <Button variant="accent" onClick={reset} className="px-6 py-2.5">
          다시 시도
        </Button>
      </div>
    </div>
  );
}
