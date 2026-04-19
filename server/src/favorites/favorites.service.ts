import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Track } from '../entities/track.entity.js';
import { UserFavorite } from '../entities/user-favorite.entity.js';
import { UserFavoriteFolder } from '../entities/user-favorite-folder.entity.js';
import { FolderColor } from '../types/folder-color.enum.js';
import { Provider } from '../types/provider.enum.js';
import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../types/error-code.enum.js';
import type { AddFavoriteBody } from './dto/add-favorite-body.dto.js';
import type { FavoriteItem } from './dto/favorite-item.dto.js';
import type { CreateFolderBody, FolderItem, UpdateFolderBody } from './dto/folder.dto.js';

const MAX_FAVORITES = 200;
const MAX_FOLDERS = 20;

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @InjectRepository(UserFavorite) private readonly favRepo: Repository<UserFavorite>,
    @InjectRepository(UserFavoriteFolder) private readonly folderRepo: Repository<UserFavoriteFolder>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
  ) {}

  async list(userId: string): Promise<FavoriteItem[]> {
    const favs = await this.favRepo.find({
      where: { userId },
      relations: ['track'],
      order: { createdAt: 'DESC' },
    });
    return favs.map((f) => ({
      id: f.id,
      provider: f.track.provider as Provider,
      sourceId: f.track.sourceId,
      name: f.track.name,
      artist: f.track.artist,
      thumbnail: f.track.thumbnail,
      durationMs: f.track.durationMs,
      createdAt: f.createdAt,
    }));
  }

  async getIds(userId: string): Promise<string[]> {
    const favs = await this.favRepo.find({
      where: { userId },
      relations: ['track'],
      select: { id: true, track: { sourceId: true } },
    });
    return favs.map((f) => f.track.sourceId);
  }

  async add(userId: string, body: AddFavoriteBody): Promise<void> {
    const count = await this.favRepo.count({ where: { userId } });
    if (count >= MAX_FAVORITES) {
      throw new AppException(ErrorCode.FAV_001);
    }

    // Track upsert
    let track = await this.trackRepo.findOneBy({ sourceId: body.sourceId });
    if (!track) {
      track = await this.trackRepo.save(
        this.trackRepo.create({
          provider: body.provider,
          sourceId: body.sourceId,
          name: body.name,
          artist: body.artist,
          thumbnail: body.thumbnail,
          durationMs: body.durationMs,
          fetchedAt: new Date(),
        }),
      );
    }

    // 이미 즐겨찾기면 무시
    const existing = await this.favRepo.findOneBy({ userId, trackId: track.id });
    if (existing) return;

    await this.favRepo.save(this.favRepo.create({ userId, trackId: track.id }));
    this.logger.log(`[fav] user=${userId} added track=${body.sourceId}`);
  }

  async remove(userId: string, sourceId: string): Promise<void> {
    const track = await this.trackRepo.findOneBy({ sourceId });
    if (!track) return;
    await this.favRepo.delete({ userId, trackId: track.id });
  }

  async bulkRemove(userId: string, sourceIds: string[]): Promise<void> {
    if (!sourceIds.length) return;
    const tracks = await this.trackRepo
      .createQueryBuilder('t')
      .where('t.source_id IN (:...sourceIds)', { sourceIds })
      .getMany();
    if (!tracks.length) return;
    await this.favRepo
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId AND track_id IN (:...trackIds)', {
        userId,
        trackIds: tracks.map((t) => t.id),
      })
      .execute();
  }

  // --- Folders ---

  async listFolders(userId: string): Promise<FolderItem[]> {
    const folders = await this.folderRepo.find({ where: { userId }, order: { position: 'ASC' } });
    const counts = await this.favRepo
      .createQueryBuilder('f')
      .select('f.folder_id', 'folderId')
      .addSelect('COUNT(*)', 'count')
      .where('f.user_id = :userId AND f.folder_id IS NOT NULL', { userId })
      .groupBy('f.folder_id')
      .getRawMany<{ folderId: string; count: string }>();
    const countMap = new Map(counts.map((c) => [c.folderId, Number(c.count)]));
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      position: f.position,
      trackCount: countMap.get(f.id) ?? 0,
    }));
  }

  async createFolder(userId: string, body: CreateFolderBody): Promise<FolderItem> {
    const count = await this.folderRepo.count({ where: { userId } });
    if (count >= MAX_FOLDERS) throw new AppException(ErrorCode.FAV_003);
    const folder = await this.folderRepo.save(
      this.folderRepo.create({
        userId,
        name: body.name,
        color: body.color ?? FolderColor.BLUE,
        position: count,
      }),
    );
    return { id: folder.id, name: folder.name, color: folder.color, position: folder.position, trackCount: 0 };
  }

  async updateFolder(userId: string, folderId: string, body: UpdateFolderBody): Promise<void> {
    const folder = await this.folderRepo.findOneBy({ id: folderId, userId });
    if (!folder) throw new AppException(ErrorCode.FAV_004);
    if (body.name !== undefined) folder.name = body.name;
    if (body.color !== undefined) folder.color = body.color;
    await this.folderRepo.save(folder);
  }

  async deleteFolder(userId: string, folderId: string): Promise<void> {
    const folder = await this.folderRepo.findOneBy({ id: folderId, userId });
    if (!folder) throw new AppException(ErrorCode.FAV_004);
    // 곡 → 미분류
    await this.favRepo.update({ userId, folderId }, { folderId: null });
    await this.folderRepo.remove(folder);
  }

  async moveFavorite(userId: string, sourceId: string, folderId: string | null): Promise<void> {
    const track = await this.trackRepo.findOneBy({ sourceId });
    if (!track) return;
    const fav = await this.favRepo.findOneBy({ userId, trackId: track.id });
    if (!fav) return;
    fav.folderId = folderId;
    await this.favRepo.save(fav);
  }
}
