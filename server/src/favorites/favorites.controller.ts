import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../types/error-code.enum.js';
import { UserRole } from '../types/user-role.enum.js';
import { AddFavoriteBody } from './dto/add-favorite-body.dto.js';
import { BulkRemoveFavoritesBody } from './dto/bulk-remove-favorites-body.dto.js';
import { FavoriteIdsResponse } from './dto/favorite-ids-response.dto.js';
import { FavoriteItem } from './dto/favorite-item.dto.js';
import { FavoritesService } from './favorites.service.js';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  private assertNotGuest(req: AuthenticatedRequest): void {
    if (req.user.role === UserRole.Guest) throw new AppException(ErrorCode.FAV_002);
  }

  @Get()
  @ApiOperation({ summary: '내 즐겨찾기 목록' })
  @ApiOkResponse({ type: [FavoriteItem] })
  async list(@Req() req: AuthenticatedRequest): Promise<FavoriteItem[]> {
    this.assertNotGuest(req);
    return this.favoritesService.list(req.user.userId);
  }

  @Get('ids')
  @ApiOperation({ summary: '즐겨찾기 sourceId 목록' })
  @ApiOkResponse({ type: FavoriteIdsResponse })
  async getIds(@Req() req: AuthenticatedRequest): Promise<FavoriteIdsResponse> {
    this.assertNotGuest(req);
    const sourceIds = await this.favoritesService.getIds(req.user.userId);
    return { sourceIds };
  }

  @Post()
  @ApiOperation({ summary: '즐겨찾기 추가' })
  async add(@Req() req: AuthenticatedRequest, @Body() body: AddFavoriteBody): Promise<void> {
    this.assertNotGuest(req);
    await this.favoritesService.add(req.user.userId, body);
  }

  @Delete(':sourceId')
  @ApiOperation({ summary: '즐겨찾기 해제' })
  async remove(@Req() req: AuthenticatedRequest, @Param('sourceId') sourceId: string): Promise<void> {
    this.assertNotGuest(req);
    await this.favoritesService.remove(req.user.userId, sourceId);
  }

  @Post('bulk-remove')
  @ApiOperation({ summary: '즐겨찾기 일괄 해제' })
  async bulkRemove(@Req() req: AuthenticatedRequest, @Body() body: BulkRemoveFavoritesBody): Promise<void> {
    this.assertNotGuest(req);
    await this.favoritesService.bulkRemove(req.user.userId, body.sourceIds);
  }
}
