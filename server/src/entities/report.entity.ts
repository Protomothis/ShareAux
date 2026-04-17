import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from './user.entity.js';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reporter_id' })
  reporterId!: string;

  @Column({ name: 'target_type' })
  targetType!: string;

  @Column({ name: 'target_id' })
  targetId!: string;

  @Column()
  reason!: string;

  @Column({ type: 'text', nullable: true })
  details!: string | null;

  @Column({ default: 'pending' })
  status!: string;

  @Column({ name: 'resolved_by', type: 'varchar', nullable: true })
  resolvedBy!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver!: User | null;
}
