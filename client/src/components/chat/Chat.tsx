'use client';

import { useEffect, useRef } from 'react';

import type { ChatMessage, FloatingReaction } from '@/types';

import ChatInput from './ChatInput';
import ChatMessageList from './ChatMessageList';
import ChatReactions from './ChatReactions';

interface ChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onReaction?: (index: number) => void;
  floatingReactions?: FloatingReaction[];
  canChat?: boolean;
  canReaction?: boolean;
  hostId?: string;
  mutedUntil?: number;
}

export default function Chat({
  messages,
  onSend,
  onReaction,
  floatingReactions = [],
  canChat = true,
  canReaction = true,
  hostId,
  mutedUntil,
}: ChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="relative flex h-full flex-col">
      {floatingReactions.map((r) => (
        <div
          key={r.id}
          className="pointer-events-none absolute z-20 text-2xl"
          style={{ left: `${r.x}%`, top: `${r.y}%`, animation: 'reaction-float 2s ease-out forwards' }}
        >
          {r.emoji}
        </div>
      ))}

      <ChatMessageList messages={messages} bottomRef={bottomRef} hostId={hostId} />

      <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-4 py-3">
        <ChatInput onSend={onSend} canChat={canChat} mutedUntil={mutedUntil} />
        {canReaction && onReaction && <ChatReactions onReaction={onReaction} />}
      </div>
    </div>
  );
}
