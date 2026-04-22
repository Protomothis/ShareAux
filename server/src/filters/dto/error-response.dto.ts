import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ErrorCode } from '../../types/error-code.enum.js';

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ enum: ErrorCode })
  code!: ErrorCode;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  statusCode!: number;

  @ApiPropertyOptional()
  timestamp?: string;
}
