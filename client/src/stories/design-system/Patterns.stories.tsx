import type { Meta, StoryObj } from '@storybook/nextjs-vite';

function PatternTokens() {
  return (
    <div className="space-y-10">
      <h2 className="text-2xl font-bold">✨ Patterns & Effects</h2>

      {/* Glass Morphism */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sa-accent">Glass Morphism</h3>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sa-accent/20 via-purple-900/20 to-cyan-900/20 p-8">
          <div className="backdrop-blur-2xl bg-black/80 border border-white/10 rounded-2xl p-5">
            <p className="text-sm font-medium text-white">Glass Card</p>
            <p className="text-xs text-sa-text-secondary mt-1">backdrop-blur-2xl + bg-black/80 + border-white/10</p>
          </div>
        </div>
      </section>

      {/* Card Variants */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sa-accent">Card Variants</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="border border-white/10 bg-white/5 backdrop-blur-2xl rounded-2xl p-5">
            <p className="text-sm font-medium text-white">Default Card</p>
            <p className="text-xs text-sa-text-muted mt-1">border-white/10 bg-white/5</p>
          </div>
          <div className="card-hover border border-white/10 bg-white/5 backdrop-blur-2xl rounded-2xl p-5 cursor-pointer">
            <p className="text-sm font-medium text-white">Hover Card</p>
            <p className="text-xs text-sa-text-muted mt-1">마우스를 올려보세요</p>
          </div>
        </div>
      </section>

      {/* Border Radius */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sa-accent">Border Radius</h3>
        <div className="flex flex-wrap gap-4">
          {[
            ['rounded', '0.25rem'],
            ['rounded-lg', '0.5rem'],
            ['rounded-xl', '0.75rem'],
            ['rounded-2xl', '1rem'],
            ['rounded-full', '9999px'],
          ].map(([cls, _val]) => (
            <div key={cls} className="text-center">
              <div className={`h-16 w-16 bg-sa-accent/20 border border-sa-accent/40 ${cls}`} />
              <p className="mt-1 text-[10px] font-mono text-sa-text-muted">{cls}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Animations */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sa-accent">Animations</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="animate-fade-in rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white">animate-fade-in</p>
          </div>
          <div className="animate-slide-in rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white">animate-slide-in</p>
          </div>
          <div className="animate-glow rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white">animate-glow</p>
          </div>
          <div
            className="rounded-xl border border-white/10 bg-sa-accent/10 p-4"
            style={{ animation: 'glow-pulse 2s ease-in-out infinite' }}
          >
            <p className="text-sm text-white">glow-pulse</p>
          </div>
          <div className="queue-item rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white">queue-slide-up</p>
          </div>
          <div className="track-enter rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white">track-enter</p>
          </div>
        </div>
      </section>

      {/* Scrollbar */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sa-accent">Custom Scrollbar</h3>
        <div className="h-32 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <p key={i} className="text-xs text-sa-text-secondary py-1">
              스크롤 아이템 {i + 1} — 핑크 스크롤바 확인
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta = {
  title: 'Design System/Patterns',
  component: PatternTokens,
  parameters: { layout: 'padded' },
};
export default meta;

export const AllPatterns: StoryObj = {};
