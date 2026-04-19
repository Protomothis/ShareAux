import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Track } from './track.entity.js';
import { User } from './user.entity.js';
import { UserFavoriteFolder } from './user-favorite-folder.entity.js';

@Entity('user_favorites')
@Unique(['user', 'track'])
export class UserFavorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => Track, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track!: Track;

  @Column({ name: 'track_id' })
  trackId!: string;

  @ManyToOne(() => UserFavoriteFolder, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'folder_id' })
  folder!: UserFavoriteFolder | null;

  @Column({ name: 'folder_id', nullable: true })
  folderId!: string | null;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
