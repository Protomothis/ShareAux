import { ApiProperty } from '@nestjs/swagger';

import { SearchResultItem } from './search-result-item.dto.js';
import { Track } from '../../entities/track.entity.js';

export class PlaylistResult {
  @ApiProperty() playlistId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() thumbnail!: string;
  @ApiProperty() videoCount!: number;
  @ApiProperty() channelName!: string;
}

export class SearchResponse {
  @ApiProperty({ type: () => [SearchResultItem] }) tracks!: SearchResultItem[];
  @ApiProperty({ type: () => [PlaylistResult] }) playlists!: PlaylistResult[];
  @ApiProperty({ required: false }) continuation?: string;
}

export class PlaylistTracksResponse {
  @ApiProperty({ type: () => [SearchResultItem] }) tracks!: SearchResultItem[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}

export class ShowcaseResponse {
  @ApiProperty({ type: () => [Track] }) popular!: Track[];
  @ApiProperty({ type: () => [Track] }) recent!: Track[];
  @ApiProperty({ type: () => [Track] }) myHistory!: Track[];
}

export class RecommendedResponse {
  @ApiProperty({ type: () => [SearchResultItem] }) recommended!: SearchResultItem[];
}

export class SuggestResponse {
  @ApiProperty({ type: [String] })
  suggestions!: string[];
}
