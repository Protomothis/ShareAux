import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsUUID } from 'class-validator';

export class VoteDto {
  @IsInt()
  @IsIn([1, -1])
  @ApiProperty({ enum: [1, -1], description: '+1 좋아요, -1 싫어요' })
  vote!: number;

  @IsUUID()
  @ApiProperty({ description: '현재 방 ID (WS 브로드캐스트용)' })
  roomId!: string;
}

export class VoteResponse {
  @ApiProperty({ description: '현재 투표 상태 (1, -1, 0=취소)' })
  vote!: number;

  @ApiProperty({ description: '총 좋아요 수' })
  likes!: number;

  @ApiProperty({ description: '총 싫어요 수' })
  dislikes!: number;
}
