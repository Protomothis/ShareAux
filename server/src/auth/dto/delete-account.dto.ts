import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: '현재 비밀번호' })
  @IsString()
  password!: string;
}
