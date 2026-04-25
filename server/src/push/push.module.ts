import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PushSettings } from '../entities/push-settings.entity.js';
import { PushSubscription } from '../entities/push-subscription.entity.js';
import { ServicesModule } from '../services/services.module.js';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription, PushSettings]), ServicesModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
