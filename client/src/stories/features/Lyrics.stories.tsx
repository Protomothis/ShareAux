import type { Meta, StoryObj } from '@storybook/nextjs-vite';

function LyricsMock() {
  const lines = [
    { text: 'Feel the rhythm of the night', active: false, past: true },
    { text: 'Dancing under neon lights', active: false, past: true },
    { text: 'Lost in music, feeling right', active: true, past: false },
    { text: 'Everything is out of sight', active: false, past: false },
    { text: 'Moving to the beat so free', active: false, past: false },
  ];

  return (
    <div className="w-[360px] h-[320px] bg-sa-bg-primary rounded-xl p-6 flex flex-col justify-center items-center gap-3 overflow-hidden">
      <div className="text-xs text-sa-text-muted mb-2 uppercase tracking-wider">Synced Lyrics</div>
      {lines.map((line, i) => (
        <div
          key={i}
          className={`text-center transition-all duration-300 ${
            line.active
              ? 'text-white text-lg font-bold scale-100'
              : line.past
                ? 'text-white/20 text-sm scale-95'
                : 'text-white/30 text-sm scale-95'
          }`}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Features/Lyrics',
  component: LyricsMock,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
};
export default meta;

type Story = StoryObj;
export const Default: Story = {};
