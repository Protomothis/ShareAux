import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Room } from './room.entity.js';
import { User } from './user.entity.js';

@Entity('play_histories')
@Index(['playedAt'])
export class PlayHistory {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => Room, nullable: true })
  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room!: Room | null;

  @ApiProperty({ type: () => User, nullable: true })
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'played_by' })
  playedBy!: User | null;

  /** 트랙 youtubeId (트랙 삭제와 독립) */
  @ApiProperty()
  @Column({ name: 'youtube_id' })
  youtubeId!: string;

  /** 재생 시점 메타 스냅샷 */
  @ApiProperty()
  @Column()
  title!: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  artist!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  thumbnail!: string | null;

  @ApiProperty()
  @Column({ name: 'duration_ms' })
  durationMs!: number;

  @ApiProperty()
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'played_at' })
  playedAt!: Date;
}
