'use client';

import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { TrackLyricsType } from '@/api/model';
import type { AutoDjStatus, StreamState, TrackInfo, TrackVoteMap } from '@/types';
import { LyricsStatus } from '@/types';

import { InfoTag } from '../common/InfoTag';
import MarqueeText from '../common/MarqueeText';
import Thumbnail from '../common/Thumbnail';
import TrackVoteButtons from '../queue/TrackVoteButtons';

interface PlayerInfoProps {
  track: TrackInfo | null;
  isPlaying?: boolean;
  isHost: boolean;
  roomId: string;
  streamCodec?: string;
  streamBitrate?: number;
  lyricsStatus?: LyricsStatus;
  lyricsType?: TrackLyricsType;
  trackVotes?: TrackVoteMap;
  autoDjEnabled?: boolean;
  autoDjStatus?: AutoDjStatus;
  streamState?: StreamState;
}

export default function PlayerInfo({
  track,
  isPlaying,
  isHost,
  roomId,
  streamCodec,
  streamBitrate,
  lyricsStatus,
  lyricsType,
  trackVotes,
  autoDjEnabled,
  autoDjStatus,
  streamState,
}: PlayerInfoProps) {
  const statusText =
    streamState === 'skipping'
      ? '곡을 넘기는 중...'
      : streamState === 'preparing' && isPlaying
        ? '다음 곡 준비 중...'
        : null;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={track?.id ?? 'empty'}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex items-center gap-4 p-4 pb-3"
      >
        <div className="relative shrink-0 overflow-visible">
          {track?.thumbnail && track.thumbnail !== 'NA' ? (
            <Thumbnail
              src={track.thumbnail}
              size="md"
              className={`size-14 rounded-xl shadow-lg shadow-black/40 ${isPlaying ? 'ring-2 ring-sa-accent/40' : ''} ${track && streamState !== 'streaming' ? 'animate-thumbnail-shimmer' : ''}`}
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-xl bg-white/5 text-xl shadow-lg shadow-black/40">
              🎵
            </div>
          )}
          {isPlaying && track && streamState === 'streaming' && (
            <span className="absolute -bottom-1 -right-1 z-10 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sa-accent opacity-40" />
              <span className="relative inline-flex size-3 rounded-full bg-sa-accent" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {track?.name ? (
            <MarqueeText
              text={statusText ?? track.songTitle ?? track.name}
              className={`text-[15px] font-semibold leading-tight ${statusText ? 'animate-text-shimmer' : 'text-white'}`}
            />
          ) : (
            <p className="text-[13px] text-white/30">곡을 신청하면 자동으로 재생됩니다</p>
          )}
          <div className="mt-1 flex h-4 items-center gap-1">
            {autoDjEnabled ? (
              <InfoTag variant="accent">
                {autoDjStatus && autoDjStatus !== 'idle' ? (
                  <Loader2 size={8} className="shrink-0 animate-spin" />
                ) : (
                  '🤖'
                )}{' '}
                AutoDJ
              </InfoTag>
            ) : (
              <InfoTag variant="accent">DJ</InfoTag>
            )}
            <span className="truncate text-[11px] leading-4 text-white/40">
              {track?.songArtist ?? track?.artist ?? ''}
            </span>
            {track?.id && (
              <>
                <span className="flex-1" />
                <TrackVoteButtons trackId={track.id} roomId={roomId} votes={trackVotes?.get(track.id)} />
              </>
            )}
          </div>
          {isPlaying && (
            <div className="mt-1 flex h-4 items-center gap-1">
              {streamCodec ? <InfoTag>{streamCodec}</InfoTag> : null}
              {streamBitrate ? <InfoTag>{streamBitrate}kbps</InfoTag> : null}
              {lyricsStatus === LyricsStatus.Found ? (
                <InfoTag>{lyricsType === TrackLyricsType.karaoke ? 'KLRC' : 'LRC'}</InfoTag>
              ) : null}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
