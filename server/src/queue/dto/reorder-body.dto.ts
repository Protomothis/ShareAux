import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class ReorderBody {
  @ApiProperty()
  @IsString()
  queueId!: string;

  @ApiProperty()
  @IsInt()
  newPosition!: number;

  @ApiProperty()
  @IsInt()
  version!: number;
}
