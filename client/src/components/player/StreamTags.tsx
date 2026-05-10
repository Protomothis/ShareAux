'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { LyricsStatus } from '@/types';

import { InfoTag } from '../common/InfoTag';

interface StreamTagsProps {
  codec?: string;
  bitrate?: number;
  lyricsStatus?: LyricsStatus;
  transStatus?: string | null;
}

export function StreamTags({ codec, bitrate, lyricsStatus, transStatus }: StreamTagsProps) {
  const t = useTranslations('player.tags');

  return (
    <div className="mt-1 flex h-4 items-center gap-1">
      {codec ? <InfoTag title={t('codec')}>{codec}</InfoTag> : null}
      {bitrate ? <InfoTag title={t('bitrate')}>{bitrate}kbps</InfoTag> : null}
      {lyricsStatus === LyricsStatus.Searching ? (
        <InfoTag className="text-white/50" title={t('lyricsSearching')}>
          <Loader2 size={8} className="shrink-0 animate-spin" /> LRC
        </InfoTag>
      ) : lyricsStatus === LyricsStatus.Found ? (
        <InfoTag className="text-white/50" title={t('lyricsFound')}>
          LRC
        </InfoTag>
      ) : null}
      {lyricsStatus === LyricsStatus.Found && transStatus === 'pending' ? (
        <InfoTag className="text-white/50" title={t('transSearching')}>
          <Loader2 size={8} className="shrink-0 animate-spin" /> TL
        </InfoTag>
      ) : lyricsStatus === LyricsStatus.Found && transStatus === 'done' ? (
        <InfoTag className="text-white/50" title={t('transDone')}>
          TL
        </InfoTag>
      ) : null}
    </div>
  );
}
