import { Provider } from '../../types/provider.enum.js';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TrackSource {
  @ApiProperty({ enum: Provider, default: Provider.YT })
  @IsString()
  provider!: string;

  @ApiProperty()
  @IsString()
  sourceId!: string;
}

export class AddTracksBody {
  @ApiProperty({ type: [TrackSource] })
  @ValidateNested({ each: true })
  @Type(() => TrackSource)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  items!: TrackSource[];
}
