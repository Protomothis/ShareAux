import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Room } from './room.entity.js';
import { Track } from './track.entity.js';
import { User } from './user.entity.js';

@Entity('room_play_histories')
@Index(['room', 'playedAt'])
export class RoomPlayHistory {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => Room })
  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ApiProperty({ type: () => Track })
  @ManyToOne(() => Track)
  @JoinColumn({ name: 'track_id' })
  track!: Track;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'played_by' })
  playedBy!: User;

  @ApiProperty()
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'played_at' })
  playedAt!: Date;
}
