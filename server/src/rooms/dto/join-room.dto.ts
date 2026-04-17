import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class JoinRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;
}
