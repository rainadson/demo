import type { NextConfig } from 'next';
import { backendRedirects } from './lib/deployment';

const nextConfig: NextConfig = {
  async redirects() {
    return process.env.APP_ROLE === 'backend' ? [] : backendRedirects(process.env.BACKEND_URL);
  },
  async headers() {
    return process.env.APP_ROLE === 'backend'
      ? [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
      : [];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
};

export default nextConfig;
