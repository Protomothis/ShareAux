import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('chart_tracks')
@Index(['genre', 'rank'])
@Index(['playlistId'])
export class ChartTrack {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'YouTube video ID' })
  @Column({ name: 'source_id' })
  sourceId!: string;

  @ApiProperty()
  @Column()
  title!: string;

  @ApiProperty()
  @Column()
  artist!: string;

  @ApiProperty({ description: '썸네일 URL' })
  @Column()
  thumbnail!: string;

  @ApiProperty({ description: '출처 플레이리스트 ID' })
  @Column({ name: 'playlist_id' })
  playlistId!: string;

  @ApiProperty({
    description: '장르 (kpop, jpop, pop, hiphop, rock, edm, indie, ballad, anime, game, lofi, citypop, vocaloid)',
  })
  @Column()
  genre!: string;

  @ApiProperty({ required: false, nullable: true, description: '국가 코드 (KR, JP, US, GLOBAL, null=장르 전용)' })
  @Column({ type: 'varchar', nullable: true })
  country!: string | null;

  @ApiProperty({ description: '플레이리스트 내 순위' })
  @Column()
  rank!: number;

  @ApiProperty({ description: '마지막 갱신 시각' })
  @Column({ type: 'timestamptz', name: 'fetched_at' })
  fetchedAt!: Date;
}
