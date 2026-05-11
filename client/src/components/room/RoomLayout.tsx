'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import MobileTabBar from '@/components/room/MobileTabBar';
import type { MobileTab } from '@/types';

interface RoomLayoutProps {
  /** 상단 배너 (WsDisconnectBanner 등) */
  banner?: ReactNode;
  player: ReactNode;
  chat: ReactNode;
  members: ReactNode;
  /** 데스크톱: 큐 패널 (탭 포함), 모바일: 개별 큐 */
  queuePanel: ReactNode;
  /** 모바일 전용 개별 탭 콘텐츠 */
  queue: ReactNode;
  history: ReactNode;
  autodj?: ReactNode;
  /** AutoDJ 탭 표시 여부 */
  autoDjEnabled?: boolean;
  /** AutoDJ 일시중지 상태 */
  autoDjPaused?: boolean;
  /** 하단 모달 영역 */
  modals?: ReactNode;
}

export function RoomLayout({
  banner,
  player,
  chat,
  members,
  queuePanel,
  queue,
  history,
  autodj,
  autoDjEnabled,
  autoDjPaused,
  modals,
}: RoomLayoutProps) {
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');

  return (
    <>
      {banner}

      {/* Mobile Player */}
      <div className="shrink-0 border-b border-white/[0.06] lg:hidden">{player}</div>

      {/* Desktop Layout */}
      <div className="hidden flex-1 overflow-hidden gap-4 p-4 lg:grid lg:grid-cols-[420px_1fr] lg:grid-rows-[auto_1fr]">
        <div className="shrink-0">{player}</div>
        <div className="row-span-2 flex flex-col overflow-hidden glass rounded-2xl">
          <div className="shrink-0 max-h-48 overflow-y-auto border-b border-white/10">{members}</div>
          <div className="flex-1 overflow-hidden">{chat}</div>
        </div>
        <div className="overflow-hidden glass rounded-2xl">{queuePanel}</div>
      </div>

      {/* Mobile Layout */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={mobileTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="min-h-0 flex-1 overflow-y-auto bg-white/[0.02]"
          >
            {mobileTab === 'chat' && chat}
            {mobileTab === 'queue' && queue}
            {mobileTab === 'history' && history}
            {mobileTab === 'autodj' && autodj}
            {mobileTab === 'members' && members}
          </motion.div>
        </AnimatePresence>
        <MobileTabBar
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          autoDjEnabled={autoDjEnabled}
          autoDjPaused={autoDjPaused}
        />
      </div>

      {modals}
    </>
  );
}
