import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { User } from './user.entity.js';

@Entity('push_settings')
export class PushSettings {
  @PrimaryColumn({ name: 'user_id' })
  @ApiProperty()
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'track_changed', default: true })
  @ApiProperty()
  trackChanged!: boolean;

  @Column({ name: 'vote_skip', default: true })
  @ApiProperty()
  voteSkip!: boolean;

  @Column({ name: 'host_changed', default: true })
  @ApiProperty()
  hostChanged!: boolean;

  @Column({ name: 'mention', default: true })
  @ApiProperty()
  mention!: boolean;
}
