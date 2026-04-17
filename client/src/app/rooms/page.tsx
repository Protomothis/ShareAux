'use client';

import { Plus, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { authControllerMe } from '@/api/auth/auth';
import type { RoomListItem } from '@/api/model';
import { UserRole } from '@/api/model';
import { roomsControllerJoin, useRoomsControllerFindAll } from '@/api/rooms/rooms';
import AnimatedBackground from '@/components/common/AnimatedBackground';
import { MinLoading } from '@/components/common/MinLoading';
import EmptyState from '@/components/common/EmptyState';
import CreateRoomModal from '@/components/room/CreateRoomModal';
import JoinPasswordModal from '@/components/room/JoinPasswordModal';
import ProfileDropdown from '@/components/room/ProfileDropdown';
import RoomCard from '@/components/room/RoomCard';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-white/5 p-5">
      <div className="mb-3 h-5 w-2/3 rounded bg-white/10" />
      <div className="mb-2 h-4 w-1/2 rounded bg-white/5" />
      <div className="h-4 w-1/3 rounded bg-white/5" />
    </div>
  );
}

export default function RoomsPage() {
  const router = useRouter();
  const { data: rooms = [], isLoading: loading, refetch } = useRoomsControllerFindAll();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [joinTarget, setJoinTarget] = useState<RoomListItem | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const userId = useAuthStore((s) => s.userId);
  const nickname = useAuthStore((s) => s.nickname);

  useEffect(() => {
    let cancelled = false;
    authControllerMe()
      .then((user) => {
        if (!cancelled) setIsAdmin(user.role === UserRole.admin || user.role === UserRole.superAdmin);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleJoin = async (room: RoomListItem, pw?: string) => {
    try {
      await roomsControllerJoin(room.id, { password: pw });
      router.push(`/rooms/${room.id}`);
    } catch {
      toast.error(room.isPrivate ? '비밀번호가 틀렸습니다' : '입장에 실패했습니다');
    }
  };

  const handleRoomClick = (room: RoomListItem) => {
    if (room.isPrivate) {
      setJoinTarget(room);
    } else {
      handleJoin(room);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    useAuthStore.getState().clear();
    router.push('/login');
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 md:px-8">
      <AnimatedBackground />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold md:text-3xl">🎧 ShareAux</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-sa-text-muted hover:bg-white/10 hover:text-white disabled:opacity-40"
              title="새로고침"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </Button>
            {userId && <ProfileDropdown nickname={nickname} email="" isAdmin={isAdmin} onLogout={handleLogout} />}
            <Button
              variant="accent"
              size="lg"
              onClick={() => setShowCreate(true)}
              className="gap-2 rounded-full px-4 hover:scale-105"
            >
              <Plus size={16} /> 방 만들기
            </Button>
          </div>
        </div>

        {/* Room grid */}
        <MinLoading
          loading={loading}
          fallback={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          }
        >
          {rooms.length === 0 ? (
            <EmptyState
              icon="🎧"
              title="아직 활성 방이 없습니다"
              description="첫 번째 방을 만들어보세요!"
              action={
                <Button variant="accent" size="sm" onClick={() => setShowCreate(true)} className="mx-auto gap-1.5">
                  <Plus size={14} /> 방 만들기
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} onClick={() => handleRoomClick(room)} />
              ))}
            </div>
          )}
        </MinLoading>
      </div>

      <CreateRoomModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(roomId) => router.push(`/rooms/${roomId}`)}
      />
      <JoinPasswordModal
        roomName={joinTarget?.name ?? ''}
        open={!!joinTarget}
        onSubmit={(pw) => {
          if (joinTarget) handleJoin(joinTarget, pw);
        }}
        onClose={() => setJoinTarget(null)}
      />

      <footer className="relative z-10 mt-12 flex justify-center gap-3 pb-4 text-xs text-sa-text-muted">
        <a href="/privacy" className="hover:text-sa-text-secondary hover:underline">
          개인정보처리방침
        </a>
        <span>·</span>
        <a href="/terms" className="hover:text-sa-text-secondary hover:underline">
          이용약관
        </a>
      </footer>
    </main>
  );
}
