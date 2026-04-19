import { ApiProperty } from '@nestjs/swagger';

export class AuthConfigResponse {
  @ApiProperty() google!: boolean;
  @ApiProperty() captcha!: boolean;
  @ApiProperty() translation!: boolean;
}
