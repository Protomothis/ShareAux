import { ApiProperty } from '@nestjs/swagger';

export class DashboardResponse {
  @ApiProperty()
  totalUsers!: number;

  @ApiProperty()
  activeRooms!: number;

  @ApiProperty()
  totalRooms!: number;
}
