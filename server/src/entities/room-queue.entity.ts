import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Room } from './room.entity.js';
import { Track } from './track.entity.js';
import { User } from './user.entity.js';

@Entity('room_queues')
@Index(['room', 'played', 'position'])
export class RoomQueue {
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

  @ApiProperty({ type: () => User, required: false, nullable: true })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'added_by' })
  addedBy!: User | null;

  @ApiProperty()
  @Column()
  position!: number;

  @ApiProperty({ default: false })
  @Column({ default: false })
  played!: boolean;

  @ApiProperty({ default: false })
  @Column({ default: false, name: 'is_auto_dj' })
  isAutoDj!: boolean;

  @ApiProperty()
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'added_at' })
  addedAt!: Date;

  @ApiProperty({ default: 1 })
  @Column({ default: 1 })
  version!: number;
}
