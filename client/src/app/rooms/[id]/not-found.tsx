import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

export default function RoomNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-room-gradient text-white">
      <div className="text-center">
        <p className="mb-2 text-5xl">🎵</p>
        <h2 className="mb-2 text-xl font-semibold">방을 찾을 수 없습니다</h2>
        <p className="mb-6 text-sm text-white/50">종료되었거나 존재하지 않는 방입니다</p>
        <Link href="/rooms" className={buttonVariants({ variant: 'accent', size: 'default' })}>
          방 목록으로
        </Link>
      </div>
    </div>
  );
}
