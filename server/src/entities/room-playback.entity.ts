import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { Room } from './room.entity.js';
import { Track } from './track.entity.js';

@Entity('room_playbacks')
export class RoomPlayback {
  @ApiProperty()
  @PrimaryColumn({ type: 'uuid', name: 'room_id' })
  roomId!: string;

  @ApiProperty({ type: () => Room })
  @OneToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Room;

  @ApiProperty({ type: () => Track, required: false, nullable: true })
  @ManyToOne(() => Track, { nullable: true })
  @JoinColumn({ name: 'track_id' })
  track!: Track;

  @ApiProperty({ default: false })
  @Column({ default: false, name: 'is_playing' })
  isPlaying!: boolean;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt!: Date;

  @ApiProperty({ default: 0 })
  @Column({ default: 0, name: 'position_ms' })
  positionMs!: number;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
