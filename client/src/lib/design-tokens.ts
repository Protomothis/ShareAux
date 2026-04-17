/**
 * ShareAux Design Tokens
 *
 * 모든 컬러는 globals.css의 --sa-* CSS 변수로 정의되고
 * @theme inline에서 Tailwind 컬러로 등록됩니다.
 *
 * 사용법: bg-sa-accent, text-sa-text-muted, border-sa-accent/30 등
 */

// ─── Color Token Map (CSS 변수 → Tailwind 클래스) ─────────
export const colorTokens = {
  'sa-accent': { css: '--sa-accent', hex: '#ff4081', desc: '브랜드 핑크' },
  'sa-accent-hover': { css: '--sa-accent-hover', hex: '#ff6ba0', desc: '액센트 호버' },
  'sa-accent-light': { css: '--sa-accent-light', hex: '#ff80ab', desc: '액센트 라이트' },
  'sa-cyan': { css: '--sa-cyan', hex: '#00e5ff', desc: '비주얼라이저 시안' },
  'sa-bg-primary': { css: '--sa-bg-primary', hex: '#000000', desc: '배경 1단계' },
  'sa-bg-secondary': { css: '--sa-bg-secondary', hex: '#121212', desc: '배경 2단계' },
  'sa-bg-tertiary': { css: '--sa-bg-tertiary', hex: '#1a1a1a', desc: '배경 3단계' },
  'sa-bg-elevated': { css: '--sa-bg-elevated', hex: '#242424', desc: '배경 4단계 (카드/입력)' },
  'sa-text-primary': { css: '--sa-text-primary', hex: '#ffffff', desc: '기본 텍스트' },
  'sa-text-secondary': { css: '--sa-text-secondary', hex: '#b3b3b3', desc: '보조 텍스트' },
  'sa-text-muted': { css: '--sa-text-muted', hex: '#6a6a6a', desc: '비활성 텍스트' },
} as const;

// ─── Typography ───────────────────────────────────────────
export const typography = {
  fontFamily: {
    sans: 'var(--font-sans)',
    heading: 'var(--font-outfit)',
    mono: 'ui-monospace, monospace',
  },
  fontSize: {
    '2xs': '9px',
    xs: '10px',
    sm: '11px',
    caption: '12px',
    body: '14px',
    base: '15px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '4xl': '36px',
    '6xl': '60px',
  },
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
} as const;

// ─── Radius ───────────────────────────────────────────────
export const radius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const;

// ─── Shadows ──────────────────────────────────────────────
export const shadows = {
  glow: '0 0 16px color-mix(in srgb, var(--sa-accent) 30%, transparent)',
  glowStrong: '0 0 32px color-mix(in srgb, var(--sa-accent) 60%, transparent)',
  button: '0 4px 6px -1px color-mix(in srgb, var(--sa-accent) 25%, transparent)',
  thumbnail: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
} as const;

// ─── Animations ───────────────────────────────────────────
export const animations = {
  fadeIn: '0.3s ease-out',
  slideIn: '0.3s ease-out',
  trackEnter: '0.4s ease-out',
  glowPulse: '2s ease-in-out infinite',
  marquee: '12s linear infinite',
} as const;

// ─── Component Patterns (Tailwind 클래스 조합) ────────────
export const patterns = {
  glass: 'backdrop-blur-2xl bg-black/80 border border-white/10 rounded-2xl',
  card: 'border border-white/10 bg-white/5 backdrop-blur-2xl rounded-2xl',
  cardHover: 'card-hover',
  input:
    'rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-sa-text-muted outline-none focus:border-sa-accent/50 transition',
  buttonPrimary: 'bg-sa-accent text-white rounded-xl transition hover:bg-sa-accent-hover',
  buttonGhost: 'text-white/30 transition hover:text-white/70 hover:bg-white/[0.08]',
  iconButton: 'flex items-center justify-center rounded-full transition',
  badge: 'rounded px-1.5 text-[9px] font-mono leading-4',
} as const;
