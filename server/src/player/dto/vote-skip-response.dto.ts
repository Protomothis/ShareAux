import { ApiProperty } from '@nestjs/swagger';

export class VoteSkipResponse {
  @ApiProperty() currentVotes!: number;
  @ApiProperty() required!: number;
  @ApiProperty() skipped!: boolean;
}
