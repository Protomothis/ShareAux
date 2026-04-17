import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SystemSettingItem {
  @ApiProperty() key!: string;
  @ApiProperty() value!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() updatedAt!: Date;
}

export class UpdateSettingsDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  @IsObject()
  settings!: Record<string, string>;
}
