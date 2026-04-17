import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Track } from './track.entity.js';
import { User } from './user.entity.js';

@Entity('track_votes')
@Index(['user', 'track'], { unique: true })
export class TrackVote {
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

  @ApiProperty({ description: '+1 좋아요, -1 싫어요' })
  @Column({ type: 'smallint' })
  vote!: number;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'voted_at', default: () => 'CURRENT_TIMESTAMP' })
  votedAt!: Date;
}
