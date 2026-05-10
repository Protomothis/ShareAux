'use client';

import { Loader2 } from 'lucide-react';

import { LyricsStatus } from '@/types';

import { InfoTag } from '../common/InfoTag';

interface StreamTagsProps {
  codec?: string;
  bitrate?: number;
  lyricsStatus?: LyricsStatus;
  transStatus?: string | null;
}

export function StreamTags({ codec, bitrate, lyricsStatus, transStatus }: StreamTagsProps) {
  return (
    <div className="mt-1 flex h-4 items-center gap-1">
      {codec ? <InfoTag>{codec}</InfoTag> : null}
      {bitrate ? <InfoTag>{bitrate}kbps</InfoTag> : null}
      {lyricsStatus === LyricsStatus.Searching ? (
        <InfoTag>
          <Loader2 size={8} className="shrink-0 animate-spin" /> LRC
        </InfoTag>
      ) : lyricsStatus === LyricsStatus.Found ? (
        <InfoTag>LRC</InfoTag>
      ) : null}
      {lyricsStatus === LyricsStatus.Found && transStatus === 'pending' ? (
        <InfoTag>
          <Loader2 size={8} className="shrink-0 animate-spin" /> 번역
        </InfoTag>
      ) : lyricsStatus === LyricsStatus.Found && transStatus === 'done' ? (
        <InfoTag>번역</InfoTag>
      ) : null}
    </div>
  );
}
