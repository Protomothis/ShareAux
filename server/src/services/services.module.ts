import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLog } from '../entities/audit-log.entity.js';
import { BannedIp } from '../entities/banned-ip.entity.js';
import { Room } from '../entities/room.entity.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { PlayHistory } from '../entities/play-history.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { SystemSetting } from '../entities/system-setting.entity.js';
import { Track } from '../entities/track.entity.js';
import { TrackStats } from '../entities/track-stats.entity.js';
import { UserFavorite } from '../entities/user-favorite.entity.js';
import { AuditService } from './audit.service.js';
import { AudioService } from './audio.service.js';
import { AutoDjService } from './auto-dj.service.js';
import { ChatMuteService } from './chat-mute.service.js';
import { ErrorLogService } from './error-log.service.js';
import { IpBanService } from './ip-ban.service.js';
import { MetricsService } from './metrics.service.js';
import { PreloadService } from './preload.service.js';
import { SettingsService } from './settings.service.js';
import { TranslationService } from './translation.service.js';
import { MusicBrainzService } from './musicbrainz.service.js';
import { YtdlpService } from './ytdlp.service.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoomQueue,
      Room,
      RoomPlayback,
      PlayHistory,
      Track,
      TrackStats,
      UserFavorite,
      SystemSetting,
      AuditLog,
      BannedIp,
    ]),
  ],
  providers: [
    AudioService,
    YtdlpService,
    PreloadService,
    AutoDjService,
    ChatMuteService,
    SettingsService,
    AuditService,
    MetricsService,
    ErrorLogService,
    IpBanService,
    TranslationService,
    MusicBrainzService,
  ],
  exports: [
    AudioService,
    YtdlpService,
    PreloadService,
    AutoDjService,
    ChatMuteService,
    SettingsService,
    AuditService,
    MetricsService,
    ErrorLogService,
    IpBanService,
    TranslationService,
    MusicBrainzService,
  ],
})
export class ServicesModule {}
