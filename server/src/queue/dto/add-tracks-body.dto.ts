import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsString } from 'class-validator';

export class AddTracksBody {
  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  trackIds!: string[];
}
