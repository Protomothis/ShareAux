import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TrackStats } from '../entities/track-stats.entity.js';
import { TrackVote } from '../entities/track-vote.entity.js';

@Injectable()
export class TracksService {
  constructor(
    @InjectRepository(TrackVote) private readonly voteRepo: Repository<TrackVote>,
    @InjectRepository(TrackStats) private readonly statsRepo: Repository<TrackStats>,
  ) {}

  async vote(trackId: string, userId: string, vote: number) {
    const existing = await this.voteRepo.findOneBy({ trackId, userId });

    if (existing) {
      if (existing.vote === vote) {
        await this.voteRepo.remove(existing);
        const counts = await this.syncVoteCounts(trackId);
        return { vote: 0, ...counts };
      }
      existing.vote = vote;
      existing.votedAt = new Date();
      await this.voteRepo.save(existing);
      const counts = await this.syncVoteCounts(trackId);
      return { vote, ...counts };
    }

    await this.voteRepo.save(this.voteRepo.create({ trackId, userId, vote }));
    const counts = await this.syncVoteCounts(trackId);
    return { vote, ...counts };
  }

  async removeVote(trackId: string, userId: string) {
    const existing = await this.voteRepo.findOneBy({ trackId, userId });
    if (!existing) throw new NotFoundException('투표 기록이 없습니다');
    await this.voteRepo.remove(existing);
    const counts = await this.syncVoteCounts(trackId);
    return { vote: 0, ...counts };
  }

  async getMyVote(trackId: string, userId: string) {
    const v = await this.voteRepo.findOneBy({ trackId, userId });
    return { vote: v?.vote ?? 0 };
  }

  async getStats(trackId: string) {
    return this.statsRepo.findOneBy({ trackId });
  }

  private async syncVoteCounts(trackId: string): Promise<{ likes: number; dislikes: number }> {
    const likes = await this.voteRepo.countBy({ trackId, vote: 1 });
    const dislikes = await this.voteRepo.countBy({ trackId, vote: -1 });

    let stats = await this.statsRepo.findOneBy({ trackId });
    if (!stats) {
      stats = this.statsRepo.create({ trackId, likes, dislikes, lastPlayedAt: new Date() });
    } else {
      stats.likes = likes;
      stats.dislikes = dislikes;
    }
    // score 재계산
    const days = (Date.now() - (stats.lastPlayedAt?.getTime() ?? Date.now())) / 86400000;
    const decay = Math.pow(0.95, days);
    const completedRatio = stats.totalPlays > 0 ? stats.completedCount / stats.totalPlays : 0;
    stats.score = (stats.totalPlays + likes * 3 - dislikes * 2 + stats.uniqueUsers * 2 + completedRatio * 5) * decay;
    await this.statsRepo.save(stats);
    return { likes, dislikes };
  }
}
