import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { FolderColor } from '../types/folder-color.enum.js';
import { User } from './user.entity.js';

@Entity('user_favorite_folders')
export class UserFavoriteFolder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @ApiProperty()
  @Column({ length: 20 })
  name!: string;

  @ApiProperty({ enum: FolderColor })
  @Column({ type: 'varchar', default: FolderColor.BLUE })
  color!: FolderColor;

  @ApiProperty()
  @Column({ default: 0 })
  position!: number;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
