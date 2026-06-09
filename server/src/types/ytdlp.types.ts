export interface AudioInfo {
  codec: string;
  bitrateKbps: number;
}

/** yt-dlp --dump-json 단일 영상 출력 */
export interface YtdlpVideoMeta {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  acodec?: string;
  abr?: number;
}

/** yt-dlp --flat-playlist --dump-json 플레이리스트 항목 */
export interface YtdlpPlaylistEntry {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
}
