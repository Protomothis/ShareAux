'use client';

import { SkipForward } from 'lucide-react';
import { useState } from 'react';

import { playerControllerVoteSkip } from '@/api/player/player';
import { Button } from '@/components/ui/button';

import { SKIP_COOLDOWN_MS } from '@/lib/constants';

interface VoteSkipProps {
  roomId: string;
  currentVotes: number;
  required: number;
  trackId?: string;
  hasNext: boolean;
  elapsedMs: number;
}

export default function VoteSkip({ roomId, currentVotes, required, trackId, hasNext, elapsedMs }: VoteSkipProps) {
  const [votedTrackId, setVotedTrackId] = useState<string | undefined>();
  const voted = votedTrackId === trackId;
  const cooldown = elapsedMs < SKIP_COOLDOWN_MS;

  const handleVote = async () => {
    if (voted) return;
    try {
      await playerControllerVoteSkip(roomId);
      setVotedTrackId(trackId);
    } catch {
      /* */
    }
  };

  return (
    <Button
      variant={voted ? 'accent-ghost' : 'ghost-muted'}
      size="sm"
      onClick={handleVote}
      disabled={voted || cooldown || !hasNext}
      className="gap-1.5 rounded-full disabled:cursor-default"
    >
      <SkipForward size={12} />
      <span>
        {currentVotes}/{required}
      </span>
    </Button>
  );
}
