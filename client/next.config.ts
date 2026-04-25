import type { NextConfig } from 'next';
import { readFileSync, writeFileSync } from 'fs';
import createMDX from '@next/mdx';
import createNextIntlPlugin from 'next-intl/plugin';

// SW 버전을 package.json에서 주입
const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };
const swPath = './public/sw.js';
const sw = readFileSync(swPath, 'utf8');
const updated = sw.replace(/const SW_VERSION = '.*?'/, `const SW_VERSION = '${pkg.version}'`);
if (sw !== updated) writeFileSync(swPath, updated);

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.1.*'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com' }],
  },
  async rewrites() {
    const apiTarget = process.env.INTERNAL_API_URL || 'http://localhost:3000/api';
    // /api → NestJS 서버 프록시 (dev + standalone 모두 동작)
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: './messages/ko.json',
  },
});
const withMDX = createMDX({ options: { remarkPlugins: ['remark-gfm'] } });
export default withNextIntl(withMDX(nextConfig));
