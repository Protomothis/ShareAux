import { ApiProperty } from '@nestjs/swagger';

export class CaptchaChallengeResponse {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ required: false }) id?: string;
  @ApiProperty({ required: false }) challenge?: string;
}
