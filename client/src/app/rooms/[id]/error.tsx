'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-room-gradient text-white">
      <div className="text-center">
        <p className="mb-2 text-5xl">🎵</p>
        <h2 className="mb-2 text-xl font-semibold">방 접속에 문제가 발생했습니다</h2>
        <p className="mb-6 text-sm text-white/50">{error.message || '연결이 끊겼거나 방이 종료되었을 수 있습니다'}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={reset} className="border-white/10 px-6 py-2.5 hover:bg-white/5">
            다시 시도
          </Button>
          <Button variant="accent" className="px-6 py-2.5" render={<Link href="/rooms" />}>
            방 목록으로
          </Button>
        </div>
      </div>
    </div>
  );
}
