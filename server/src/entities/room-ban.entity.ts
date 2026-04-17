import { ApiProperty } from '@nestjs/swagger';
import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { Room } from './room.entity.js';
import { User } from './user.entity.js';

@Entity('room_bans')
export class RoomBan {
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
  @CreateDateColumn({ type: 'timestamptz', name: 'banned_at' })
  bannedAt!: Date;
}
