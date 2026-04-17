import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { typography } from '@/lib/design-tokens';

function TypographyTokens() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">🔤 Typography</h2>

      {/* Font Sizes */}
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sa-accent">Font Sizes</h3>
      <div className="mb-8 space-y-3">
        {Object.entries(typography.fontSize).map(([name, size]) => (
          <div key={name} className="flex items-baseline gap-4">
            <span className="w-16 shrink-0 text-xs font-mono text-sa-text-muted">{size}</span>
            <span style={{ fontSize: size }} className="text-white">
              {name} — 함께 듣는 음악이 더 좋다
            </span>
          </div>
        ))}
      </div>

      {/* Font Weights */}
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sa-accent">Font Weights</h3>
      <div className="mb-8 space-y-2">
        {Object.entries(typography.fontWeight).map(([name, weight]) => (
          <p key={name} style={{ fontWeight: weight }} className="text-base text-white">
            <span className="inline-block w-24 text-xs font-mono text-sa-text-muted">{weight}</span>
            {name} — ShareAux
          </p>
        ))}
      </div>

      {/* Font Families */}
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sa-accent">Font Families</h3>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-sa-text-muted font-mono mb-1">font-sans (body)</p>
          <p className="text-lg text-white font-sans">함께 듣는 음악이 더 좋다 — ShareAux</p>
        </div>
        <div>
          <p className="text-xs text-sa-text-muted font-mono mb-1">font-heading / font-outfit (branding)</p>
          <p className="text-lg text-white font-[family-name:var(--font-outfit)]">🎧 ShareAux — Real-time Music</p>
        </div>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'Design System/Typography',
  component: TypographyTokens,
  parameters: { layout: 'padded' },
};
export default meta;

export const AllTypography: StoryObj = {};
