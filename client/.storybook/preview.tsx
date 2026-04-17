import type { Preview } from '@storybook/nextjs-vite';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#000000' },
        { name: 'elevated', value: '#121212' },
        { name: 'surface', value: '#1a1a1a' },
      ],
    },
    a11y: { test: 'todo' },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-black text-white min-h-[100px] p-4 font-sans">
        <Story />
      </div>
    ),
  ],
};

export default preview;
