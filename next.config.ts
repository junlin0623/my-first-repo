import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  output: 'standalone', // self-contained server for the beta package (scripts/pack-beta.mjs)
};

export default nextConfig;
