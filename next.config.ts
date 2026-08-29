import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  serverExternalPackages: ['ssh2'],
}

export default nextConfig
