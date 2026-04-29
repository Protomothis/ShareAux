import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Preview } from '@storybook/nextjs-vite';
import { NextIntlClientProvider } from 'next-intl';

import messages from '../messages/ko.json';
import '../src/app/globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        dark: { name: 'Dark', value: '#000000' },
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: 'dark' },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="ko" messages={messages}>
          <div className="dark bg-black text-white min-h-[100px] p-4 font-sans">
            <Story />
          </div>
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};

export default preview;
