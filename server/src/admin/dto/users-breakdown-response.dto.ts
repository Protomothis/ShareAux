import { ApiProperty } from '@nestjs/swagger';

export class UsersBreakdownResponse {
  @ApiProperty() byProvider!: Record<string, number>;
  @ApiProperty() byRole!: Record<string, number>;
}
