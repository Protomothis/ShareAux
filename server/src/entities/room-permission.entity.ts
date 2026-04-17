import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { DEFAULT_ROOM_PERMISSIONS, Permission } from '../types/permission.enum.js';
import { Room } from './room.entity.js';
import { User } from './user.entity.js';

@Entity('room_permissions')
export class RoomPermission {
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

  @ApiProperty({ enum: Permission, isArray: true })
  @Column({ type: 'jsonb', default: DEFAULT_ROOM_PERMISSIONS })
  permissions!: Permission[];
}
