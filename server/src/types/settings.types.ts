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
  AutoDjAiEnabled = 'autodj.aiEnabled',
  AutoDjAiModel = 'autodj.aiModel',
  AutoDjBatchSize = 'autodj.batchSize',
  AutoDjTemperature = 'autodj.temperature',

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
  TranslationTargetLang = 'translation.targetLang',

  // Push 알림
  VapidPublicKey = 'secret.vapidPublicKey',
  VapidPrivateKey = 'secret.vapidPrivateKey',
  VapidMailto = 'push.vapidMailto',

  // 차트
  ChartEnabled = 'chart.enabled',
  ChartPlaylists = 'chart.playlists',
  ChartFetchHour = 'chart.fetchHour',
}

export interface ChartPlaylistEntry {
  id: string;
  genre: string;
  country: string | null;
  label: string;
  emoji: string;
}

export const DEFAULT_CHART_PLAYLISTS: ChartPlaylistEntry[] = [
  { id: 'PL4fGSI1pDJn6jXS_Tv_N9B8Z0HTRVJE0m', genre: 'kpop', country: 'KR', label: '한국', emoji: '🇰🇷' },
  { id: 'PL4fGSI1pDJn4-UIb6RKHdxam-oAUULIGB', genre: 'jpop', country: 'JP', label: '일본', emoji: '🇯🇵' },
  { id: 'PL4fGSI1pDJn6O1LS0XSdF3RyO0Rq_LDeI', genre: 'pop', country: 'US', label: '미국', emoji: '🇺🇸' },
  { id: 'PL4fGSI1pDJn6puJdseH2Rt9sMvt9E2M4i', genre: 'pop', country: 'GLOBAL', label: '글로벌', emoji: '🌍' },
  { id: 'PLOHoVaTp8R7ccrQM3EpCTVDdwHhXrJhXS', genre: 'kpop', country: null, label: 'K-Pop', emoji: '🎤' },
  { id: 'PLj3yHoINc17ve9DMQpyU_clEGETrKSrbD', genre: 'jpop', country: null, label: 'J-Pop', emoji: '🎌' },
  { id: 'PLYyWwMzPI75TID--pLfPUJRjGIQJckSsL', genre: 'indie', country: 'KR', label: 'Korean Indie', emoji: '🎸' },
  { id: 'PLHqpT5_Zh_qgrISx-qD_CBZpPuf5fUt63', genre: 'hiphop', country: 'KR', label: 'Korean Hip-Hop', emoji: '🎧' },
  { id: 'PL6bTeohxtjijxJUIj0Y8LNeQuKH5WC3ZA', genre: 'ballad', country: 'KR', label: 'Korean Ballad', emoji: '🎵' },
  { id: 'PLUemwAVGSh5Y2pukyAltSukqLoY2ZZVvY', genre: 'pop', country: null, label: 'Pop', emoji: '🎶' },
  { id: 'PLDIoUOhQQPlXFSnCfj8HuVhOUSC0QwxYD', genre: 'hiphop', country: null, label: 'Hip-Hop', emoji: '🔥' },
  { id: 'PL0GvsLQil0MmYC96KEs_7dTNsLm1PS6JX', genre: 'rock', country: null, label: 'Rock', emoji: '🤘' },
  { id: 'PLRBp0Fe2GpglBI6sZxi8kagjLLQQDAP7C', genre: 'edm', country: null, label: 'EDM', emoji: '💿' },
  { id: 'PLHRfWmB-cTz-qaGpphAXXfx0ynyB315Pr', genre: 'indie', country: null, label: 'Indie/Folk', emoji: '🍂' },
  { id: 'PLxA687tYuMWjRmMc6B3eccQb_WY7mQHTk', genre: 'anime', country: null, label: 'Anime', emoji: '🌸' },
  { id: 'PLrnb8c3hFJatjyJ-wFMuFGANNoo7-LZsG', genre: 'game', country: null, label: 'Game OST', emoji: '🎮' },
  { id: 'PLXIclLvfETS3AgCnZg4N6QqHu_T27XKIq', genre: 'lofi', country: null, label: 'Lofi', emoji: '☕' },
  { id: 'PLLAYL4W3LK5wu-MmlN1d3E36el0WaTVn1', genre: 'citypop', country: null, label: 'City Pop', emoji: '🌃' },
  { id: 'PLG2PhA0b49j4Wa6v3_U3UjGWauSz_UAYE', genre: 'vocaloid', country: null, label: 'Vocaloid', emoji: '🤖' },
];

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
  [OptionKey.AutoDjAiEnabled]: { type: 'boolean', defaultValue: 'true' },
  [OptionKey.AutoDjAiModel]: { type: 'select', defaultValue: 'gemini-2.5-flash-lite' },
  [OptionKey.AutoDjBatchSize]: { type: 'number', defaultValue: '10', min: 5, max: 30 },
  [OptionKey.AutoDjTemperature]: { type: 'number', defaultValue: '0.7', min: 0.1, max: 1.5 },

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
  [OptionKey.TranslationTargetLang]: { type: 'select', defaultValue: 'ko' },

  // Push 알림
  [OptionKey.VapidPublicKey]: { type: 'string', defaultValue: '', secret: true },
  [OptionKey.VapidPrivateKey]: { type: 'string', defaultValue: '', secret: true },
  [OptionKey.VapidMailto]: { type: 'string', defaultValue: 'mailto:admin@example.com' },

  // 차트
  [OptionKey.ChartEnabled]: { type: 'boolean', defaultValue: 'true' },
  [OptionKey.ChartPlaylists]: { type: 'string', defaultValue: JSON.stringify(DEFAULT_CHART_PLAYLISTS) },
  [OptionKey.ChartFetchHour]: { type: 'number', defaultValue: '4', min: 0, max: 23 },
};
