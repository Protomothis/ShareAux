import { ApiProperty } from '@nestjs/swagger';

export class AutoDjCandidateItem {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) artist!: string | null;
  @ApiProperty({ nullable: true }) thumbnail!: string | null;
  @ApiProperty() pinned!: boolean;
}

export class AutoDjCandidatesResponse {
  @ApiProperty({ type: [AutoDjCandidateItem] })
  candidates!: AutoDjCandidateItem[];
}
