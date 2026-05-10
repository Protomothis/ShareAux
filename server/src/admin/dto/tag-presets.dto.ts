import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class TagPresetItemDto {
  @ApiProperty() @IsString() id!: string;
  @ApiProperty() @IsString() label!: string;
  @ApiProperty() @IsString() value!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() icon?: string;
}

export class TagPresetsDto {
  @ApiProperty({ type: [TagPresetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagPresetItemDto)
  mood!: TagPresetItemDto[];

  @ApiProperty({ type: [TagPresetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagPresetItemDto)
  genre!: TagPresetItemDto[];

  @ApiProperty({ type: [TagPresetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagPresetItemDto)
  era!: TagPresetItemDto[];

  @ApiProperty({ type: [TagPresetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagPresetItemDto)
  country!: TagPresetItemDto[];
}
