/** YT Music "관련 항목" 탭에서 추출한 추천 데이터 */

export interface SimilarArtist {
  name: string;
  channelId: string | null;
  thumbnail: string | null;
}

export interface RecommendedPlaylist {
  title: string;
  playlistId: string | null;
  thumbnail: string | null;
}

export interface MusicRelatedResult {
  similarArtists: SimilarArtist[];
  playlists: RecommendedPlaylist[];
}
