import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { Room } from './room.entity.js';
import { User } from './user.entity.js';

@Entity('room_members')
export class RoomMember {
  @ApiProperty()
  @PrimaryColumn({ type: 'uuid', name: 'room_id' })
  roomId!: string;

  @ApiProperty()
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ApiProperty({ type: () => Room })
  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ApiProperty()
  @Column()
  role!: string;

  @ApiProperty()
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'joined_at' })
  joinedAt!: Date;
}
