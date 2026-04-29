import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MetaStatus } from '../types/meta-status.enum.js';
import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../types/error-code.enum.js';
import { Track } from '../entities/track.entity.js';
import { TrackStats } from '../entities/track-stats.entity.js';
import { TrackVote } from '../entities/track-vote.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';

@Injectable()
export class AdminTracksService {
  constructor(
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(TrackStats) private readonly trackStatsRepo: Repository<TrackStats>,
    @InjectRepository(TrackVote) private readonly voteRepo: Repository<TrackVote>,
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
  ) {}

  async getTopTracks(page: number, limit: number) {
    const [items, total] = await this.trackRepo
      .createQueryBuilder('t')
      .addSelect('t.lyrics_translated')
      .leftJoinAndMapOne('t.stats', TrackStats, 's', 's.track_id = t.id')
      .orderBy('s.score', 'DESC', 'NULLS LAST')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items: items.map((t) => {
        const s = t.stats;
        return {
          trackId: t.id,
          totalPlays: s?.totalPlays ?? 0,
          uniqueUsers: s?.uniqueUsers ?? 0,
          likes: s?.likes ?? 0,
          dislikes: s?.dislikes ?? 0,
          score: s?.score ?? 0,
          track: { ...t, hasTranslation: !!t.lyricsTranslated },
        };
      }),
      total,
      page,
      limit,
    };
  }

  async getTrackLyrics(trackId: string) {
    const track = await this.trackRepo
      .createQueryBuilder('t')
      .addSelect('t.lyricsData')
      .addSelect('t.lyricsTranslated')
      .where('t.id = :trackId', { trackId })
      .getOne();
    if (!track) throw new AppException(ErrorCode.ADMIN_001);
    return {
      synced: track.lyricsData,
      translated: track.lyricsTranslated,
      lang: track.lyricsLang,
    };
  }

  async resetTrackLyrics(trackId: string) {
    await this.trackRepo.update(trackId, {
      lyricsStatus: 'searching',
      lyricsData: null,
      lyricsLang: null,
      lyricsType: null,
      lyricsRuby: null,
      lyricsTranslated: null,
    });
  }

  async resetTrackMeta(trackId: string) {
    await this.trackRepo.update(trackId, {
      metaStatus: MetaStatus.Pending,
      songTitle: null,
      songArtist: null,
      songAlbum: null,
    });
  }

  async deleteTrack(trackId: string) {
    const track = await this.trackRepo.findOneBy({ id: trackId });
    if (!track) throw new AppException(ErrorCode.ADMIN_001);
    await this.trackStatsRepo.delete({ trackId });
    await this.trackRepo.manager.delete('room_queues', { track: { id: trackId } });
    await this.trackRepo.manager
      .createQueryBuilder()
      .delete()
      .from('room_playbacks')
      .where('track_id = :trackId', { trackId })
      .execute();
    await this.trackRepo.remove(track);
  }
}
