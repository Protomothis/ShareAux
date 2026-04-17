import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from './user.entity.js';

@Entity('banned_ips')
export class BannedIp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  ip!: string;

  @Column({ type: 'varchar', nullable: true })
  reason!: string | null;

  @Column({ name: 'banned_by' })
  bannedBy!: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'banned_by' })
  banner!: User;
}
