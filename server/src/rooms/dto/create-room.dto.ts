import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

import { AutoDjMode } from '../../types/index.js';

export class CreateRoomDto {
  @ApiProperty({ description: '방 이름', example: 'My Room' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ required: false, description: '최대 인원', minimum: 2, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(50)
  maxMembers?: number;

  @ApiProperty({ required: false, description: '비공개 여부' })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({ required: false, description: '비밀번호' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false, description: '곡 신청 윈도우(분)', minimum: 1, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  enqueueWindowMin?: number;

  @ApiProperty({ required: false, description: '윈도우당 신청 제한', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  enqueueLimitPerWindow?: number;

  @ApiProperty({ required: false, description: '한 번에 추가 가능한 곡 수', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxSelectPerAdd?: number;

  @ApiProperty({ required: false, default: 0, description: '같은 곡 재신청 쿨다운 (분, 0=제한없음)' })
  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(1440)
  replayCooldownMin?: number;

  @ApiProperty({ required: false, description: '곡 전환 크로스페이드' })
  @IsOptional()
  @IsBoolean()
  crossfade?: boolean;

  @ApiProperty({ required: false, description: '새 멤버 기본 곡 신청 허용' })
  @IsOptional()
  @IsBoolean()
  defaultEnqueueEnabled?: boolean;

  @ApiProperty({ required: false, description: '새 멤버 기본 스킵 투표 허용' })
  @IsOptional()
  @IsBoolean()
  defaultVoteSkipEnabled?: boolean;

  @ApiProperty({ required: false, description: 'AutoDJ 활성화' })
  @IsOptional()
  @IsBoolean()
  autoDjEnabled?: boolean;

  @ApiProperty({ required: false, enum: AutoDjMode, description: 'AutoDJ 모드' })
  @IsOptional()
  @IsEnum(AutoDjMode)
  autoDjMode?: AutoDjMode;

  @ApiProperty({ required: false, description: 'AutoDJ 트리거 기준 (남은 큐)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  autoDjThreshold?: number;

  @ApiProperty({ required: false, nullable: true, description: 'AutoDJ 즐겨찾기 폴더 필터 (null=전체)' })
  @IsOptional()
  @IsString()
  autoDjFolderId?: string | null;

  @ApiProperty({ required: false, description: '즐겨찾기 소진 시 혼합 모드 폴백' })
  @IsOptional()
  @IsBoolean()
  autoDjFavFallbackMixed?: boolean;
}
