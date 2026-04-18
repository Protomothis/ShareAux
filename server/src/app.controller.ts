import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PERMISSION_META, PermissionMeta } from './constants.js';
import { User } from './entities/user.entity.js';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: '헬스체크' })
  @ApiResponse({ status: 200 })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('permissions/meta')
  @ApiOperation({ summary: '권한 메타 정보' })
  @ApiOkResponse({ type: [PermissionMeta] })
  permissionsMeta() {
    return PERMISSION_META;
  }
}

class SetupStatusResponse {
  @ApiProperty()
  needsSetup!: boolean;
}

@ApiTags('Setup')
@Controller('setup')
export class SetupController {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  @Get('status')
  @ApiOperation({ summary: '초기 설정 필요 여부' })
  @ApiOkResponse({ type: SetupStatusResponse })
  async status() {
    const count = await this.userRepo.count();
    return { needsSetup: count === 0 };
  }
}
