import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getServerApiUrl } from '@/lib/urls';

import RoomClient from './RoomClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${getServerApiUrl()}/rooms/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const room = (await res.json()) as { name?: string };
    return {
      title: room.name,
      openGraph: {
        title: `${room.name} — ShareAux`,
        description: '함께 듣는 음악, 함께 만드는 플레이리스트',
        images: [{ url: '/og.png', width: 1200, height: 630 }],
      },
    };
  } catch {
    return {};
  }
}

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${getServerApiUrl()}/rooms/${id}`, { cache: 'no-store' }).catch(() => null);
  if (!res || res.status === 404) notFound();
  return <RoomClient id={id} />;
}
