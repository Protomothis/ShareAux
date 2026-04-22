import type messages from '../messages/ko.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages;
  }
}
