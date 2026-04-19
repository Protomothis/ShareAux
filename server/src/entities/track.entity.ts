import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('tracks')
@Unique(['provider', 'sourceId'])
export class Track {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ default: 'yt' })
  @Column({ type: 'varchar', default: 'yt' })
  provider!: string;

  @ApiProperty()
  @Column({ name: 'source_id' })
  sourceId!: string;

  @ApiProperty()
  @Column()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ nullable: true })
  artist!: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ nullable: true })
  album!: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ nullable: true })
  thumbnail!: string;

  /** Content ID 기반 곡명 (없으면 null → name 폴백) */
  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', nullable: true, name: 'song_title' })
  songTitle!: string | null;

  /** Content ID 기반 아티스트 (없으면 null → artist 폴백) */
  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', nullable: true, name: 'song_artist' })
  songArtist!: string | null;

  /** Content ID 기반 앨범 */
  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', nullable: true, name: 'song_album' })
  songAlbum!: string | null;

  @ApiProperty()
  @Column({ name: 'duration_ms' })
  durationMs!: number;

  @ApiProperty({ required: false, nullable: true })
  @Column({ nullable: true })
  codec!: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ nullable: true, name: 'bitrate_kbps' })
  bitrateKbps!: number;

  /** Content ID fetch 상태: pending → done */
  @ApiProperty({ default: 'pending' })
  @Column({ type: 'varchar', name: 'meta_status', default: 'pending' })
  metaStatus!: 'pending' | 'done';

  /** 가사 검색 상태: searching → found / not_found */
  @ApiProperty({ enum: ['searching', 'found', 'not_found'], default: 'searching' })
  @Column({ type: 'varchar', name: 'lyrics_status', default: 'searching' })
  lyricsStatus!: 'searching' | 'found' | 'not_found';

  /** synced LRC 가사 데이터 (found일 때만) */
  @Column({ type: 'text', nullable: true, name: 'lyrics_data', select: false })
  lyricsData!: string | null;

  /** 감지된 가사 언어 */
  @Column({ type: 'varchar', nullable: true, name: 'lyrics_lang' })
  lyricsLang!: string | null;

  /** 한글 발음 LRC (일본어만) */
  @Column({ type: 'text', nullable: true, name: 'lyrics_ruby', select: false })
  lyricsRuby!: string | null;

  /** 한국어 번역 LRC */
  @Column({ type: 'text', nullable: true, name: 'lyrics_translated', select: false })
  lyricsTranslated!: string | null;

  /** 번역 처리 상태 */
  @Column({ type: 'varchar', nullable: true, name: 'lyrics_trans_status' })
  lyricsTransStatus!: string | null;

  @ApiProperty()
  @Column({ name: 'fetched_at' })
  fetchedAt!: Date;
}
