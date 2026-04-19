import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Track } from '../entities/track.entity.js';
import { UserFavorite } from '../entities/user-favorite.entity.js';
import { UserFavoriteFolder } from '../entities/user-favorite-folder.entity.js';
import { FavoritesController } from './favorites.controller.js';
import { FavoritesService } from './favorites.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserFavorite, UserFavoriteFolder, Track])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
