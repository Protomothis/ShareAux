import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Language } from '../types/language.enum.js';
import { User } from './user.entity.js';

@Entity('push_subscriptions')
@Unique(['endpoint'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id!: string;

  @Column({ name: 'user_id' })
  @ApiProperty()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  @ApiProperty()
  endpoint!: string;

  @Column({ name: 'p256dh' })
  @ApiProperty()
  p256dh!: string;

  @Column()
  @ApiProperty()
  auth!: string;

  @Column({ type: 'varchar', default: Language.En })
  @ApiProperty({ enum: Language, enumName: 'Language' })
  locale!: Language;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty()
  createdAt!: Date;
}
