/** 시스템 옵션 키 */
export enum OptionKey {
  // 인증
  AuthGuestEnabled = 'auth.guestEnabled',
  AuthGoogleEnabled = 'auth.googleEnabled',
  AuthGuestMaxAge = 'auth.guestMaxAge',
  CaptchaEnabled = 'captcha.enabled',

  // 시크릿 (AES 암호화 저장)
  GoogleClientId = 'secret.googleClientId',
  GoogleClientSecret = 'secret.googleClientSecret',
  GoogleCallbackUrl = 'secret.googleCallbackUrl',
  GeminiApiKey = 'secret.geminiApiKey',

  // 방
  RoomMaxMembers = 'room.maxMembers',
  RoomMaxRoomsPerUser = 'room.maxRoomsPerUser',

  // AutoDJ
  AutoDjEnabled = 'autodj.enabled',

  // 큐
  QueueMaxPerUser = 'queue.maxPerUser',
  QueueMaxDuration = 'queue.maxDuration',

  // 스트리밍
  StreamMaxBitrateEnabled = 'stream.maxBitrateEnabled',
  StreamMaxBitrate = 'stream.maxBitrate',

  // 번역
  TranslationEnabled = 'translation.enabled',
  TranslationDailyLimit = 'translation.dailyLimit',
  TranslationModel = 'translation.model',
}

export type OptionType = 'boolean' | 'number' | 'string' | 'select';

export interface OptionMeta {
  type: OptionType;
  defaultValue: string;
  /** true면 AES 암호화 저장 + 마스킹 응답 */
  secret?: boolean;
  min?: number;
  max?: number;
}

export const OPTION_METAS: Record<OptionKey, OptionMeta> = {
  // 인증
  [OptionKey.AuthGuestEnabled]: { type: 'boolean', defaultValue: 'true' },
  [OptionKey.AuthGoogleEnabled]: { type: 'boolean', defaultValue: 'true' },
  [OptionKey.AuthGuestMaxAge]: { type: 'number', defaultValue: '12', min: 1, max: 720 },
  [OptionKey.CaptchaEnabled]: { type: 'boolean', defaultValue: 'false' },

  // 시크릿
  [OptionKey.GoogleClientId]: { type: 'string', defaultValue: '', secret: true },
  [OptionKey.GoogleClientSecret]: { type: 'string', defaultValue: '', secret: true },
  [OptionKey.GoogleCallbackUrl]: { type: 'string', defaultValue: '' },
  [OptionKey.GeminiApiKey]: { type: 'string', defaultValue: '', secret: true },

  // 방
  [OptionKey.RoomMaxMembers]: { type: 'number', defaultValue: '20', min: 2, max: 100 },
  [OptionKey.RoomMaxRoomsPerUser]: { type: 'number', defaultValue: '3', min: 1, max: 10 },

  // AutoDJ
  [OptionKey.AutoDjEnabled]: { type: 'boolean', defaultValue: 'true' },

  // 큐
  [OptionKey.QueueMaxPerUser]: { type: 'number', defaultValue: '10', min: 1, max: 50 },
  [OptionKey.QueueMaxDuration]: { type: 'number', defaultValue: '10', min: 1, max: 60 },

  // 스트리밍
  [OptionKey.StreamMaxBitrateEnabled]: { type: 'boolean', defaultValue: 'false' },
  [OptionKey.StreamMaxBitrate]: { type: 'number', defaultValue: '160', min: 64, max: 320 },

  // 번역
  [OptionKey.TranslationEnabled]: { type: 'boolean', defaultValue: 'true' },
  [OptionKey.TranslationDailyLimit]: { type: 'number', defaultValue: '200', min: 10, max: 1000 },
  [OptionKey.TranslationModel]: { type: 'select', defaultValue: 'gemini-2.5-flash-lite' },
};
