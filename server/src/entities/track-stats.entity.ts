import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { Track } from './track.entity.js';

@Entity('track_stats')
export class TrackStats {
  @ApiProperty()
  @PrimaryColumn({ type: 'uuid', name: 'track_id' })
  trackId!: string;

  @OneToOne(() => Track)
  @JoinColumn({ name: 'track_id' })
  track!: Track;

  @ApiProperty()
  @Column({ name: 'total_plays', default: 0 })
  totalPlays!: number;

  @ApiProperty()
  @Column({ name: 'unique_users', default: 0 })
  uniqueUsers!: number;

  @ApiProperty()
  @Column({ default: 0 })
  likes!: number;

  @ApiProperty()
  @Column({ default: 0 })
  dislikes!: number;

  @ApiProperty()
  @Column({ name: 'completed_count', default: 0 })
  completedCount!: number;

  @ApiProperty({ type: 'number', description: '인기 점수 (시간 감쇠 적용)' })
  @Column({ type: 'float', default: 0 })
  score!: number;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'first_played_at', default: () => 'CURRENT_TIMESTAMP' })
  firstPlayedAt!: Date;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'last_played_at', default: () => 'CURRENT_TIMESTAMP' })
  lastPlayedAt!: Date;
}
