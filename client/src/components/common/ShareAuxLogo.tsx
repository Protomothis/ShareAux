export function ShareAuxLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* 글로우 배경 */}
      <ellipse cx="180" cy="50" rx="160" ry="40" fill="url(#bgGlow)" opacity="0.15" />

      {/* 헤드폰 */}
      <g transform="translate(8, 10)">
        {/* 글로우 후광 */}
        <ellipse cx="44" cy="46" rx="38" ry="32" fill="url(#iconGlow)" opacity="0.12" />

        {/* 헤드밴드 — 외곽 글로우 */}
        <path
          d="M14 50C14 24 26 8 44 8C62 8 74 24 74 50"
          stroke="url(#bandGlow)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.15"
        />
        {/* 헤드밴드 — 메인 */}
        <path d="M14 50C14 24 26 8 44 8C62 8 74 24 74 50" stroke="url(#band)" strokeWidth="3" strokeLinecap="round" />
        {/* 헤드밴드 — 하이라이트 */}
        <path
          d="M22 42C22 24 30 12 44 12C58 12 66 24 66 42"
          stroke="white"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.15"
        />

        {/* 왼쪽 이어컵 — 외곽 글로우 */}
        <rect x="4" y="42" width="20" height="32" rx="8" fill="url(#earGlowL)" opacity="0.3" />
        {/* 왼쪽 이어컵 — 메인 */}
        <rect x="6" y="44" width="16" height="28" rx="7" fill="url(#earL)" />
        {/* 왼쪽 — 내부 스피커 */}
        <circle cx="14" cy="56" r="6" fill="none" stroke="white" strokeWidth="0.6" opacity="0.15" />
        <circle cx="14" cy="56" r="3" fill="none" stroke="var(--sa-accent)" strokeWidth="0.8" opacity="0.3" />
        <circle cx="14" cy="56" r="1" fill="var(--sa-accent)" opacity="0.5" />
        {/* 왼쪽 — 엣지 하이라이트 */}
        <path d="M9 48C9 47 10 46 12 46" stroke="white" strokeWidth="0.6" strokeLinecap="round" opacity="0.25" />

        {/* 오른쪽 이어컵 — 외곽 글로우 */}
        <rect x="64" y="42" width="20" height="32" rx="8" fill="url(#earGlowR)" opacity="0.3" />
        {/* 오른쪽 이어컵 — 메인 */}
        <rect x="66" y="44" width="16" height="28" rx="7" fill="url(#earR)" />
        {/* 오른쪽 — 내부 스피커 */}
        <circle cx="74" cy="56" r="6" fill="none" stroke="white" strokeWidth="0.6" opacity="0.15" />
        <circle cx="74" cy="56" r="3" fill="none" stroke="var(--sa-accent-light)" strokeWidth="0.8" opacity="0.3" />
        <circle cx="74" cy="56" r="1" fill="var(--sa-accent-light)" opacity="0.5" />
        {/* 오른쪽 — 엣지 하이라이트 */}
        <path d="M79 48C79 47 78 46 76 46" stroke="white" strokeWidth="0.6" strokeLinecap="round" opacity="0.25" />

        {/* 음파 — 왼쪽 */}
        <path d="M0 50C-4 53-4 59 0 62" stroke="var(--sa-accent)" strokeWidth="1.5" strokeLinecap="round">
          <animate attributeName="opacity" values="0;0.5;0" dur="1.8s" repeatCount="indefinite" />
        </path>
        <path d="M-4 46C-10 51-10 61-4 66" stroke="var(--sa-accent)" strokeWidth="1.2" strokeLinecap="round">
          <animate attributeName="opacity" values="0;0.3;0" dur="1.8s" begin="0.3s" repeatCount="indefinite" />
        </path>
        <path d="M-8 42C-16 49-16 63-8 70" stroke="var(--sa-accent)" strokeWidth="0.8" strokeLinecap="round">
          <animate attributeName="opacity" values="0;0.15;0" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
        </path>

        {/* 음파 — 오른쪽 */}
        <path d="M88 50C92 53 92 59 88 62" stroke="var(--sa-accent-light)" strokeWidth="1.5" strokeLinecap="round">
          <animate attributeName="opacity" values="0;0.5;0" dur="1.8s" begin="0.2s" repeatCount="indefinite" />
        </path>
        <path d="M92 46C98 51 98 61 92 66" stroke="var(--sa-accent-light)" strokeWidth="1.2" strokeLinecap="round">
          <animate attributeName="opacity" values="0;0.3;0" dur="1.8s" begin="0.5s" repeatCount="indefinite" />
        </path>
        <path d="M96 42C104 49 104 63 96 70" stroke="var(--sa-accent-light)" strokeWidth="0.8" strokeLinecap="round">
          <animate attributeName="opacity" values="0;0.15;0" dur="1.8s" begin="0.8s" repeatCount="indefinite" />
        </path>
      </g>

      {/* 텍스트 */}
      <text
        x="104"
        y="66"
        fontFamily="var(--font-outfit), sans-serif"
        fontWeight="800"
        fontSize="48"
        letterSpacing="-1"
      >
        <tspan fill="url(#textGrad)">Share</tspan>
        <tspan fill="white" opacity="0.95">
          Aux
        </tspan>
      </text>

      {/* 텍스트 글로우 */}
      <text
        x="104"
        y="66"
        fontFamily="var(--font-outfit), sans-serif"
        fontWeight="800"
        fontSize="48"
        letterSpacing="-1"
        fill="url(#textGrad)"
        opacity="0.3"
        filter="url(#textBlur)"
      />

      {/* 미니 이퀄라이저 바 (텍스트 아래) */}
      <g transform="translate(108, 76)" opacity="0.5">
        {[
          0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125,
          130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195,
        ].map((x, i) => (
          <rect key={i} x={x} y={0} width="2" rx="1" fill="url(#barGrad)">
            <animate
              attributeName="height"
              values={`${3 + (i % 5) * 2};${8 - (i % 3)};${3 + (i % 5) * 2}`}
              dur={`${0.8 + (i % 7) * 0.15}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="y"
              values={`${-(3 + (i % 5) * 2)};${-(8 - (i % 3))};${-(3 + (i % 5) * 2)}`}
              dur={`${0.8 + (i % 7) * 0.15}s`}
              repeatCount="indefinite"
            />
          </rect>
        ))}
      </g>

      <defs>
        <linearGradient id="band" x1="14" y1="8" x2="74" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--sa-accent)" />
          <stop offset="1" stopColor="var(--sa-accent-light)" />
        </linearGradient>
        <linearGradient id="bandGlow" x1="14" y1="8" x2="74" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--sa-accent)" />
          <stop offset="1" stopColor="var(--sa-accent-light)" />
        </linearGradient>
        <linearGradient id="earL" x1="6" y1="44" x2="22" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2a2a2a" />
          <stop offset="0.5" stopColor="#1a1a1a" />
          <stop offset="1" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="earGlowL" x1="14" y1="42" x2="14" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--sa-accent)" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="earR" x1="82" y1="44" x2="66" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2a2a2a" />
          <stop offset="0.5" stopColor="#1a1a1a" />
          <stop offset="1" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="earGlowR" x1="74" y1="42" x2="74" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--sa-accent-light)" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
        <radialGradient id="iconGlow" cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="var(--sa-accent)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="textGrad" x1="104" y1="30" x2="300" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--sa-accent)" />
          <stop offset="0.6" stopColor="var(--sa-accent-light)" />
          <stop offset="1" stopColor="var(--sa-accent)" />
        </linearGradient>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="-10" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--sa-accent)" stopOpacity="0.8" />
          <stop offset="1" stopColor="var(--sa-accent-light)" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id="bgGlow" cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="var(--sa-accent)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        <filter id="textBlur">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
    </svg>
  );
}
