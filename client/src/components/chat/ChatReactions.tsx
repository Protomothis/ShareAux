'use client';

import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const REACTIONS = ['❤️', '🔥', '🎉', '👏', '😍', '🤩'];

interface ChatReactionsProps {
  onReaction: (index: number) => void;
}

export default function ChatReactions({ onReaction }: ChatReactionsProps) {
  const [selectedReaction, setSelectedReaction] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          onClick={() => onReaction(selectedReaction)}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowPicker((v) => !v);
          }}
          onTouchStart={() => {
            longPressRef.current = setTimeout(() => setShowPicker(true), 500);
          }}
          onTouchEnd={() => clearTimeout(longPressRef.current)}
          className="flex size-8 shrink-0 select-none touch-manipulation items-center justify-center rounded-xl bg-white/5 text-lg transition hover:scale-110 hover:bg-white/10 active:scale-90"
          aria-label="리액션"
        >
          {REACTIONS[selectedReaction]}
        </TooltipTrigger>
        <TooltipContent>길게 눌러 변경</TooltipContent>
      </Tooltip>

      {showPicker && (
        <div className="absolute bottom-full right-0 mb-2 flex animate-fade-in flex-col gap-1 rounded-xl border border-white/10 bg-black/90 p-1.5 shadow-xl backdrop-blur-2xl">
          {REACTIONS.map((emoji, i) => (
            <Button
              key={i}
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedReaction(i);
                setShowPicker(false);
              }}
              className={`size-9 text-lg hover:scale-125 hover:bg-white/10 ${i === selectedReaction ? 'bg-white/10 ring-1 ring-sa-accent' : ''}`}
            >
              {emoji}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
