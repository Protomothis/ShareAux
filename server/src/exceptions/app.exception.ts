import { HttpException } from '@nestjs/common';

import { ERROR_META } from '../constants.js';
import type { ErrorCode } from '../types/error-code.enum.js';

export class AppException extends HttpException {
  constructor(public readonly errorCode: ErrorCode) {
    const meta = ERROR_META[errorCode];
    super(meta.description, meta.httpStatus);
  }
}
