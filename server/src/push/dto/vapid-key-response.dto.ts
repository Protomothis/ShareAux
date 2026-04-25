import { ApiProperty } from '@nestjs/swagger';

export class VapidKeyResponse {
  @ApiProperty()
  key!: string;
}
