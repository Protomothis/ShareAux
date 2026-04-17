import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Track } from './track.entity.js';
import { User } from './user.entity.js';

@Entity('user_track_history')
@Index(['user', 'track'], { unique: true })
export class UserTrackHistory {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => Track, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Track;

  @Column({ name: 'track_id' })
  trackId!: string;

  @ApiProperty()
  @Column({ name: 'play_count', default: 1 })
  playCount!: number;

  @ApiProperty()
  @Column({ name: 'completed_count', default: 0 })
  completedCount!: number;

  @ApiProperty({ enum: ['search', 'showcase', 'playlist'] })
  @Column({ type: 'varchar', nullable: true, name: 'last_source' })
  lastSource!: string | null;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'last_played_at', default: () => 'CURRENT_TIMESTAMP' })
  lastPlayedAt!: Date;
}
