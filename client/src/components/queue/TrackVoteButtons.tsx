'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { TrackStats, VoteDtoVote } from '@/api/model';
import {
  useTracksControllerGetMyVote,
  useTracksControllerGetStats,
  useTracksControllerVote,
} from '@/api/tracks/tracks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TrackVoteButtonsProps {
  trackId: string;
  roomId: string;
  votes?: Pick<TrackStats, 'likes' | 'dislikes'>;
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  direction: 'up' | 'down';
  side: 'left' | 'right';
}

let emojiId = 0;

function useFloats() {
  const [floats, setFloats] = useState<FloatingEmoji[]>([]);
  const spawn = useCallback((emoji: string, direction: 'up' | 'down', side: 'left' | 'right') => {
    const id = ++emojiId;
    const x = Math.random() * 10 - 5;
    setFloats((prev) => [...prev, { id, emoji, x, direction, side }]);
    setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 800);
  }, []);
  return { floats, spawn };
}

export default function TrackVoteButtons({ trackId, roomId, votes }: TrackVoteButtonsProps) {
  const { data: myVote, refetch: refetchMyVote } = useTracksControllerGetMyVote(trackId);
  const { data: stats, refetch: refetchStats } = useTracksControllerGetStats(trackId);
  const { mutate: voteMutate } = useTracksControllerVote();
  const { floats, spawn } = useFloats();

  const likes = votes?.likes ?? stats?.likes ?? 0;
  const dislikes = votes?.dislikes ?? stats?.dislikes ?? 0;

  // WS로 다른 멤버 투표 수신 시 float
  const prevLikesRef = useRef<number | null>(null);
  const prevDislikesRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevLikesRef.current !== null && likes > prevLikesRef.current) spawn('👍', 'up', 'left');
    prevLikesRef.current = likes;
  }, [likes, spawn]);

  useEffect(() => {
    if (prevDislikesRef.current !== null && dislikes > prevDislikesRef.current) spawn('👎', 'down', 'right');
    prevDislikesRef.current = dislikes;
  }, [dislikes, spawn]);

  const handleVote = useCallback(
    (v: VoteDtoVote) => {
      voteMutate(
        { id: trackId, data: { vote: v, roomId } },
        {
          onSuccess: () => {
            refetchMyVote();
            refetchStats();
          },
        },
      );
    },
    [trackId, roomId, voteMutate, refetchMyVote, refetchStats],
  );

  const current = myVote?.vote ?? 0;

  return (
    <div className="relative flex items-center gap-0.5">
      {/* floating emojis — overflow-visible로 부모 밖으로 나감 */}
      <div className="pointer-events-none absolute inset-0 overflow-visible">
        {floats.map((f) => (
          <span
            key={f.id}
            className={cn(
              'absolute top-1/2 text-sm',
              f.side === 'left' ? 'left-[25%]' : 'left-[75%]',
              f.direction === 'up' ? 'animate-vote-float-up' : 'animate-vote-float-down',
            )}
            style={{ marginLeft: f.x }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => handleVote(1 as VoteDtoVote)}
        className={cn('gap-0.5 transition', current === 1 ? 'text-sa-accent' : 'text-sa-text-muted hover:text-white')}
      >
        <ThumbsUp size={12} className={cn(current === 1 && 'animate-vote-pop')} />
        {likes > 0 && <span className="text-[10px] tabular-nums">{likes}</span>}
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => handleVote(-1 as VoteDtoVote)}
        className={cn('gap-0.5 transition', current === -1 ? 'text-red-400' : 'text-sa-text-muted hover:text-white')}
      >
        <ThumbsDown size={12} className={cn(current === -1 && 'animate-vote-pop')} />
        {dislikes > 0 && <span className="text-[10px] tabular-nums">{dislikes}</span>}
      </Button>
    </div>
  );
}
