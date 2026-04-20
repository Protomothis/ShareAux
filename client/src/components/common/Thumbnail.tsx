'use client';

import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * YouTube 썸네일 사이즈별 suffix
 * - sm: default.jpg (120×90) — 큐/검색 리스트 (40~48px)
 * - md: mqdefault.jpg (320×180) — 쇼케이스 카드, 일반
 * - lg: hqdefault.jpg (480×360) — 플레이어 앨범아트
 */
type ThumbnailSize = 'sm' | 'md' | 'lg';

const sizeConfig = {
  sm: { suffix: 'default.jpg', width: 120, height: 90 },
  md: { suffix: 'mqdefault.jpg', width: 320, height: 180 },
  lg: { suffix: 'hqdefault.jpg', width: 480, height: 360 },
} as const;

/** mqdefault.jpg URL에서 videoId 추출 → 사이즈별 URL 생성 */
function resolveSrc(src: string, size: ThumbnailSize): string {
  const match = src.match(/\/vi\/([^/]+)\//);
  if (!match) return src;
  return `https://i.ytimg.com/vi/${match[1]}/${sizeConfig[size].suffix}`;
}

interface ThumbnailProps {
  src: string | null | undefined;
  size?: ThumbnailSize;
  className?: string;
  /** 추가 alt 텍스트 */
  alt?: string;
}

export default function Thumbnail({ src, size = 'md', className, alt = '' }: ThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const config = sizeConfig[size];
  const resolvedSrc = src ? resolveSrc(src, size) : '';

  if (!resolvedSrc) {
    return <div className={cn('bg-white/5', className)} />;
  }

  return (
    <div className={cn('relative overflow-hidden bg-white/5', className)}>
      {/* skeleton shimmer */}
      {!loaded && <div className="absolute inset-0 animate-pulse bg-white/[0.08]" />}
      <Image
        src={resolvedSrc}
        alt={alt}
        width={config.width}
        height={config.height}
        draggable={false}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        unoptimized={false}
      />
    </div>
  );
}
