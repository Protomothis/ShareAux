import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { AutoDjMode } from '../types/index.js';
import { User } from './user.entity.js';

@Entity('rooms')
@Index(['isActive', 'isPrivate'])
export class Room {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'host_id' })
  host!: User;

  @ApiProperty({ required: false, nullable: true })
  @Column({ nullable: true, name: 'host_id' })
  hostId!: string;

  @ApiProperty()
  @Column()
  name!: string;

  @ApiProperty({ default: 10 })
  @Column({ default: 10, name: 'max_members' })
  maxMembers!: number;

  @ApiProperty({ default: false })
  @Column({ default: false, name: 'is_private' })
  isPrivate!: boolean;

  @ApiProperty({ required: false, nullable: true, writeOnly: true })
  @Column({ nullable: true, select: false })
  password!: string;

  @ApiProperty()
  @Column({ unique: true, name: 'invite_code' })
  inviteCode!: string;

  @ApiProperty({ default: true })
  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @ApiProperty({ default: 30 })
  @Column({ default: 30, name: 'enqueue_window_min' })
  enqueueWindowMin!: number;

  @ApiProperty({ default: 15 })
  @Column({ default: 15, name: 'enqueue_limit_per_window' })
  enqueueLimitPerWindow!: number;

  @ApiProperty({ default: true })
  @Column({ default: true })
  crossfade!: boolean;

  @ApiProperty({ default: 3 })
  @Column({ default: 3, name: 'max_select_per_add' })
  maxSelectPerAdd!: number;

  @ApiProperty({ default: 0, description: '같은 곡 재신청 쿨다운 (분, 0=제한없음)' })
  @Column({ default: 0, name: 'replay_cooldown_min' })
  replayCooldownMin!: number;

  @ApiProperty({ default: true })
  @Column({ default: true, name: 'default_enqueue_enabled' })
  defaultEnqueueEnabled!: boolean;

  @ApiProperty({ default: true })
  @Column({ default: true, name: 'default_vote_skip_enabled' })
  defaultVoteSkipEnabled!: boolean;

  @ApiProperty({ default: false })
  @Column({ default: false, name: 'auto_dj_enabled' })
  autoDjEnabled!: boolean;

  @ApiProperty({ enum: AutoDjMode, default: AutoDjMode.Related })
  @Column({ default: AutoDjMode.Related, name: 'auto_dj_mode' })
  autoDjMode!: AutoDjMode;

  @ApiProperty({ default: 2 })
  @Column({ default: 2, name: 'auto_dj_threshold' })
  autoDjThreshold!: number;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
