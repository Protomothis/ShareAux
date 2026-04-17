import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { colorTokens } from '@/lib/design-tokens';

function Swatch({ name, token }: { name: string; token: { css: string; hex: string; desc: string } }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 shrink-0 rounded-lg border border-white/10"
        style={{ background: `var(${token.css})` }}
      />
      <div>
        <p className="text-sm font-medium text-white">{name}</p>
        <p className="text-xs text-sa-text-muted font-mono">{token.hex}</p>
        <p className="text-[10px] text-sa-text-muted">{token.desc}</p>
      </div>
    </div>
  );
}

function ColorTokens() {
  const groups = {
    Accent: ['sa-accent', 'sa-accent-hover', 'sa-accent-light', 'sa-cyan'],
    Background: ['sa-bg-primary', 'sa-bg-secondary', 'sa-bg-tertiary', 'sa-bg-elevated'],
    Text: ['sa-text-primary', 'sa-text-secondary', 'sa-text-muted'],
  } as const;

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">🎨 Color Tokens</h2>
      <p className="mb-6 text-sm text-sa-text-secondary">
        모든 컬러는 <code className="text-sa-accent">--sa-*</code> CSS 변수로 정의되고, Tailwind에서{' '}
        <code className="text-sa-accent">bg-sa-accent</code>, <code className="text-sa-accent">text-sa-text-muted</code>{' '}
        등으로 사용합니다.
      </p>
      {Object.entries(groups).map(([title, keys]) => (
        <div key={title} className="mb-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sa-accent">{title}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {keys.map((k) => (
              <Swatch key={k} name={k} token={colorTokens[k]} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Design System/Colors',
  component: ColorTokens,
  parameters: { layout: 'padded' },
};
export default meta;

export const AllColors: StoryObj = {};
