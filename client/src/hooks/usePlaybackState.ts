'use client';
import { useCallback, useRef, useState } from 'react';

import type { Track, TrackLyricsType } from '@/api/model';
import { debug } from '@/lib/debug';
import { StreamState } from '@/types';
import { LyricsStatus } from '@/types';

/**
 * usePlaybackState — 재생 상태 관리
 * track, streamState, timeSync, lyrics 등 재생 관련 상태만 담당.
 */
export function usePlaybackState(
  listeningRef: React.MutableRefObject<boolean>,
  trackRef: React.MutableRefObject<Track | null>,
  getOneWayRef: React.MutableRefObject<() => number>,
  onResyncNeeded: (action: 'prepare' | 'send') => void,
) {
  const [currentTrack, setTrack] = useState<Track | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [timeSync, setTimeSync] = useState({ base: 0, at: 0 });
  const [lyricsStatus, setLyricsStatus] = useState<LyricsStatus>(LyricsStatus.searching);
  const [lyricsType, setLyricsType] = useState<TrackLyricsType>(null);
  const [lyricsVersion, setLyricsVersion] = useState(0);

  const [streamCodec, setStreamCodec] = useState<string | null>(null);
  const [streamBitrate, setStreamBitrate] = useState<number | null>(null);
  const [transStatus, setTransStatus] = useState<string | null>(null);

  const audioLoadingRef = useRef(false);
  const [audioLoading, setAudioLoading] = useState(false);

  // --- streamState만 변경 ---
  const handleStreamStateOnly = useCallback(
    (ss: string) => {
      if ((ss === 'preparing' || ss === 'skipping') && listeningRef.current) {
        audioLoadingRef.current = true;
        setAudioLoading(true);
      }
      if (ss === 'skipping' || ss === 'preparing') {
        setStreamState(ss as StreamState);
        setTimeSync({ base: 0, at: 0 });
        if (listeningRef.current) onResyncNeeded('prepare');
      }
      if (ss === 'streaming') {
        setStreamState('streaming');
        if (listeningRef.current) onResyncNeeded('send');
      }
    },
    [listeningRef, onResyncNeeded],
  );

  // --- 트랙 변경 ---
  const handleTrackChange = useCallback(
    (track: Track | undefined) => {
      const ls = track?.lyricsStatus;
      setLyricsStatus(
        ls === LyricsStatus.found
          ? LyricsStatus.found
          : ls === LyricsStatus.notFound
            ? LyricsStatus.notFound
            : LyricsStatus.searching,
      );
      setLyricsType(null);
      setStreamState('preparing');
      if (listeningRef.current) onResyncNeeded('prepare');
    },
    [listeningRef, onResyncNeeded],
  );

  // --- 시간 동기화 ---
  const handleTimeSync = useCallback(
    (d: { elapsedMs?: number; streamState?: string }, trackChanged: boolean) => {
      const ow = getOneWayRef.current();
      if (trackChanged || d.streamState === StreamState.streaming) {
        setTimeSync({ base: (d.elapsedMs ?? 0) + ow, at: Date.now() });
      } else if (d.elapsedMs !== undefined) {
        setTimeSync((prev) => {
          const clientElapsed = prev.base + (Date.now() - prev.at);
          const corrected = d.elapsedMs! + ow;
          return Math.abs(clientElapsed - corrected) > 2000 ? { base: corrected, at: Date.now() } : prev;
        });
      }
    },
    [getOneWayRef],
  );

  // --- 정지 ---
  const handleStopped = useCallback(() => {
    setTrack(null);
    setTimeSync({ base: 0, at: 0 });
    setStreamState('idle');
    setStreamCodec(null);
    setStreamBitrate(null);
    setTransStatus(null);
  }, []);

  // --- 메인 핸들러 (onSystem에서 호출) ---
  const handlePlayback = useCallback(
    (d: {
      track?: Track;
      elapsedMs?: number;
      isPlaying?: boolean;
      streamState?: string;
      streamCodec?: string;
      streamBitrate?: number;
      transStatus?: string | null;
    }) => {
      debug('[playback] updated', d.track?.name, 'state:', d.streamState);

      if (d.streamCodec) setStreamCodec(d.streamCodec);
      if (d.streamBitrate) setStreamBitrate(d.streamBitrate);
      if (d.transStatus !== undefined) setTransStatus(d.transStatus);

      if (d.streamState && d.isPlaying === undefined) {
        handleStreamStateOnly(d.streamState);
        return;
      }

      const trackChanged = d.track?.id !== trackRef.current?.id;

      if (trackChanged) {
        trackRef.current = d.track ?? null;
        handleTrackChange(d.track);
      } else if (d.track?.lyricsStatus === 'found') {
        setLyricsStatus(LyricsStatus.found);
      }

      if (d.isPlaying) {
        setTrack(d.track ?? null);
        handleTimeSync(d, trackChanged);
        if (listeningRef.current && d.streamState === 'preparing') {
          audioLoadingRef.current = true;
          setAudioLoading(true);
        }
        if (d.streamState) setStreamState(d.streamState as StreamState);
        if (d.streamState === StreamState.streaming && listeningRef.current) onResyncNeeded('send');
      } else {
        handleStopped();
      }
      setPlaying(!!d.isPlaying);
    },
    [trackRef, listeningRef, onResyncNeeded, handleStreamStateOnly, handleTrackChange, handleTimeSync, handleStopped],
  );

  return {
    currentTrack,
    setTrack,
    isPlaying,
    setPlaying,
    streamState,
    setStreamState,
    timeSync,
    setTimeSync,
    lyricsStatus,
    setLyricsStatus,
    lyricsType,
    setLyricsType,
    lyricsVersion,
    setLyricsVersion,
    audioLoading,
    setAudioLoading,
    audioLoadingRef,
    handlePlayback,
    streamCodec,
    setStreamCodec,
    streamBitrate,
    setStreamBitrate,
    transStatus,
    setTransStatus,
  };
}
