import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateIpBanDto {
  @IsString()
  ip!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
