import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import type { Permission } from '../types/index.js';

import { User } from './user.entity.js';

@Entity('invite_codes')
export class InviteCode {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Column({ unique: true })
  code!: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @ApiProperty()
  @Column({ name: 'max_uses' })
  maxUses!: number;

  @ApiProperty()
  @Column({ name: 'used_count', default: 0 })
  usedCount!: number;

  @ApiProperty({ enum: ['listen', 'chat', 'reaction', 'search', 'addQueue', 'voteSkip', 'host'], isArray: true })
  @Column({ type: 'jsonb', default: ['listen'] })
  permissions!: Permission[];

  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'expires_at', nullable: true, type: 'timestamptz' })
  expiresAt!: Date | null;

  @ApiProperty()
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ApiProperty({ default: true })
  @Column({ name: 'allow_registration', default: true })
  allowRegistration!: boolean;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
