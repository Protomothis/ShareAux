/* eslint-disable @typescript-eslint/no-explicit-any -- YouTube innertube API has no types */

import type { InnertubeSearchResponse, YtdlpPlaylistResult, YtdlpSearchResult } from './ytdlp.service.js';

const INNERTUBE_CTX = { client: { clientName: 'WEB', clientVersion: '2.20240101', hl: 'ko', gl: 'KR' } };
const INNERTUBE_MWEB_CTX = { client: { clientName: 'MWEB', clientVersion: '2.20260101', hl: 'en', gl: 'US' } };

export interface MusicCredits {
  songTitle: string | null;
  songArtist: string | null;
  songAlbum: string | null;
}

async function fetchInnertube(endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: INNERTUBE_CTX, ...body }),
  });
  return (await res.json()) as Record<string, unknown>;
}

function parseDuration(text: string): number {
  const parts = text.split(':').map(Number);
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
}

function isValidDuration(dur: number): boolean {
  return dur >= 30 && dur <= 900;
}

export function parseVideoFromRenderer(vid: any): YtdlpSearchResult | null {
  if (!vid?.videoId || !vid?.lengthText?.simpleText) return null;
  const id = vid.videoId as string;
  if (id.length !== 11) return null;
  const dur = parseDuration(vid.lengthText.simpleText as string);
  if (!isValidDuration(dur)) return null;
  const badges = vid.ownerBadges ?? [];
  const isOfficial = badges.some((b: any) =>
    ['BADGE_STYLE_TYPE_VERIFIED_ARTIST', 'BADGE_STYLE_TYPE_VERIFIED'].includes(b?.metadataBadgeRenderer?.style),
  );
  const viewText = (vid.viewCountText?.simpleText as string) ?? '';
  return {
    id,
    title: (vid.title?.runs?.[0]?.text ?? '') as string,
    artist: vid.ownerText?.runs?.[0]?.text ?? '',
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    duration: dur,
    isOfficial,
    views: parseInt(viewText.replace(/[^0-9]/g, '')) || 0,
  };
}

export function parseRelatedFromLockup(vm: any): YtdlpSearchResult | null {
  if (!vm?.contentId) return null;
  if ((vm.contentId as string).startsWith('PL')) return null;
  const badge =
    vm.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailBottomOverlayViewModel?.badges?.[0]
      ?.thumbnailBadgeViewModel;
  const isMusic = badge?.icon?.sources?.[0]?.clientResource?.imageName === 'MUSIC';
  if (!isMusic) return null;
  const durationText = badge?.text as string | undefined;
  if (!durationText) return null;
  const dur = parseDuration(durationText);
  if (!isValidDuration(dur)) return null;
  const meta = vm.metadata?.lockupMetadataViewModel;
  const subtitle = meta?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts;
  return {
    id: vm.contentId as string,
    title: meta?.title?.content ?? '',
    artist: subtitle?.map((p: any) => p?.text?.content).join(' ') ?? '',
    thumbnail: `https://i.ytimg.com/vi/${vm.contentId}/mqdefault.jpg`,
    duration: dur,
  };
}

export function parsePlaylistFromLockup(lv: any): YtdlpPlaylistResult | null {
  if (!lv?.contentId?.startsWith('PL')) return null;
  const meta = lv?.metadata?.lockupMetadataViewModel ?? {};
  const title = (meta?.title?.content ?? '') as string;
  if (!title) return null;
  let videoCount = 0;
  try {
    const overlays =
      lv?.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.overlays ?? [];
    for (const o of overlays) {
      for (const b of o?.thumbnailOverlayBadgeViewModel?.thumbnailBadges ?? []) {
        videoCount = parseInt(((b?.thumbnailBadgeViewModel?.text ?? '') as string).replace(/[^0-9]/g, '')) || 0;
      }
    }
  } catch {
    /* ignore */
  }
  let thumbnail = '';
  try {
    thumbnail =
      lv?.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources?.[0]?.url ??
      '';
  } catch {
    /* ignore */
  }
  let channelName = '';
  try {
    for (const row of meta?.metadata?.contentMetadataViewModel?.metadataRows ?? []) {
      for (const part of row?.metadataParts ?? []) {
        const t = (part?.text?.content ?? '') as string;
        if (t && t !== '전체 재생목록 보기') channelName = t;
      }
    }
  } catch {
    /* ignore */
  }
  return { playlistId: lv.contentId as string, title, thumbnail, videoCount, channelName };
}

export function parsePlaylistFromRenderer(pl: any): YtdlpPlaylistResult | null {
  if (!pl?.playlistId) return null;
  return {
    playlistId: pl.playlistId as string,
    title: (pl.title?.simpleText ?? pl.title?.runs?.[0]?.text ?? '') as string,
    thumbnail: pl.thumbnails?.[0]?.thumbnails?.[0]?.url ?? '',
    videoCount: parseInt(((pl.videoCount as string) ?? '0').replace(/[^0-9]/g, '')) || 0,
    channelName: (pl.shortBylineText?.runs?.[0]?.text ?? '') as string,
  };
}

export async function searchVideos(query: string, continuation?: string): Promise<InnertubeSearchResponse> {
  const body: Record<string, unknown> = continuation ? { continuation } : { query, params: 'EgIQAQ==' };
  const data = await fetchInnertube('search', body);

  const results: YtdlpSearchResult[] = [];
  let nextContinuation: string | undefined;

  const extractFromSections = (sections: any[]) => {
    for (const sec of sections) {
      const items = sec?.itemSectionRenderer?.contents ?? [];
      for (const item of items) {
        const r = parseVideoFromRenderer(item?.videoRenderer);
        if (r) results.push(r);
      }
      const token = sec?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      if (token) nextContinuation = token as string;
    }
  };

  if (continuation) {
    for (const cmd of (data as any)?.onResponseReceivedCommands ?? []) {
      extractFromSections(cmd?.appendContinuationItemsAction?.continuationItems ?? []);
    }
  } else {
    extractFromSections(
      (data as any)?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [],
    );
  }

  return { results, playlists: [], continuation: nextContinuation };
}

export async function searchPlaylists(query: string): Promise<YtdlpPlaylistResult[]> {
  const data = await fetchInnertube('search', { query, params: 'EgIQAw==' });
  const playlists: YtdlpPlaylistResult[] = [];
  const sections =
    (data as any)?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];
  for (const sec of sections) {
    for (const item of sec?.itemSectionRenderer?.contents ?? []) {
      const fromLockup = parsePlaylistFromLockup(item?.lockupViewModel);
      if (fromLockup) {
        playlists.push(fromLockup);
        continue;
      }
      const fromRenderer = parsePlaylistFromRenderer(item?.playlistRenderer);
      if (fromRenderer) playlists.push(fromRenderer);
    }
  }
  return playlists.slice(0, 5);
}

export async function getRelatedVideos(videoId: string, limit: number): Promise<YtdlpSearchResult[]> {
  const results: YtdlpSearchResult[] = [];
  let continuation: string | undefined;
  const maxPages = 3;

  for (let page = 0; page < maxPages && results.length < limit; page++) {
    let items: any[];
    if (page === 0) {
      const data = await fetchInnertube('next', { videoId });
      const secondary = (data as any)?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults;
      items = secondary?.results ?? [];
    } else if (continuation) {
      const data = await fetchInnertube('next', { continuation });
      items = (data as any)?.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ?? [];
    } else {
      break;
    }

    continuation = undefined;
    for (const item of items) {
      const cont = item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      if (cont) {
        continuation = cont as string;
        continue;
      }
      const r = parseRelatedFromLockup(item?.lockupViewModel);
      if (r) results.push(r);
      if (results.length >= limit) break;
    }
  }
  return results;
}

/** YouTube Content ID 기반 음악 메타데이터 파싱 (MWEB next API) */
export async function fetchMusicCredits(videoId: string): Promise<MusicCredits> {
  const empty: MusicCredits = { songTitle: null, songArtist: null, songAlbum: null };
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: INNERTUBE_MWEB_CTX, videoId }),
    });
    const raw = await res.text();

    // "Song credits" 다이얼로그의 runs 배열에서 Song/Artist/Album 추출
    const idx = raw.indexOf('Song credits');
    if (idx === -1) return empty;

    // dialogMessages 블록 추출
    const msgStart = raw.indexOf('dialogMessages', idx);
    if (msgStart === -1) return empty;
    const blockStart = raw.indexOf('[', msgStart);
    if (blockStart === -1) return empty;

    // 중첩 bracket 매칭으로 배열 끝 찾기
    let depth = 0;
    let blockEnd = blockStart;
    for (let i = blockStart; i < raw.length && i < blockStart + 5000; i++) {
      if (raw[i] === '[') depth++;
      else if (raw[i] === ']') depth--;
      if (depth === 0) {
        blockEnd = i + 1;
        break;
      }
    }

    const runs = JSON.parse(raw.slice(blockStart, blockEnd)) as any[];
    const texts: string[] = (runs[0]?.runs ?? []).map((r: any) => r.text as string);

    // "Song", ": ", "곡명", "\n\n", "Artist", ": ", "아티스트명", ...
    const fields = new Map<string, string>();
    for (let i = 0; i < texts.length - 2; i++) {
      const key = texts[i].trim();
      if (['Song', 'Artist', 'Album'].includes(key) && texts[i + 1]?.trim() === ':') {
        fields.set(key, texts[i + 2].trim());
      }
    }

    return {
      songTitle: fields.get('Song') ?? null,
      songArtist: fields.get('Artist') ?? null,
      songAlbum: fields.get('Album') ?? null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[fetchMusicCredits] ${videoId} failed: ${msg}`);
    return empty;
  }
}
