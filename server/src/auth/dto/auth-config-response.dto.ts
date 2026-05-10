import { ApiProperty } from '@nestjs/swagger';

import { TranslationLang } from '../../types/translation-lang.enum.js';

export class AuthConfigResponse {
  @ApiProperty() google!: boolean;
  @ApiProperty() captcha!: boolean;
  @ApiProperty() translation!: boolean;
  @ApiProperty({ enum: TranslationLang, enumName: 'TranslationLang' }) translationLang!: TranslationLang;
  @ApiProperty() aiDj!: boolean;
}
