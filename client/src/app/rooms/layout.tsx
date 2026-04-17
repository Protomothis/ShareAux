import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '방 목록',
  openGraph: {
    title: 'ShareAux - 방 목록',
    description: '실시간 음악 공유 방에 참여하세요',
  },
};

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
