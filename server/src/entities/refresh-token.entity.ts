import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from './user.entity.js';

@Entity('refresh_tokens')
@Index(['tokenHash'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'token_hash' })
  tokenHash!: string;

  @Column({ name: 'expires_at' })
  expiresAt!: Date;

  @Column({ default: false })
  revoked!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
