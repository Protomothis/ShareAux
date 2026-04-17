import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { AuthProvider } from '../types/auth-provider.enum.js';
import { Permission } from '../types/permission.enum.js';
import { UserRole } from '../types/user-role.enum.js';
import { InviteCode } from './invite-code.entity.js';

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ enum: AuthProvider })
  @Column({ default: AuthProvider.Google })
  provider!: AuthProvider;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', unique: true, nullable: true })
  username!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'password_hash', select: false })
  passwordHash!: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'google_id', type: 'varchar', unique: true, nullable: true })
  googleId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @ApiProperty()
  @Column()
  nickname!: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl!: string;

  @ApiProperty({ enum: UserRole, default: UserRole.User })
  @Column({ default: UserRole.User })
  role!: UserRole;

  @ApiProperty({ required: false, nullable: true, type: () => InviteCode })
  @ManyToOne(() => InviteCode, { nullable: true })
  @JoinColumn({ name: 'invite_code_id' })
  inviteCode!: InviteCode | null;

  @ApiProperty({ enum: Permission, isArray: true })
  @Column({ type: 'jsonb', name: 'account_permissions', default: [] })
  accountPermissions!: Permission[];

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'timestamptz', nullable: true, name: 'banned_at' })
  bannedAt!: Date | null;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
