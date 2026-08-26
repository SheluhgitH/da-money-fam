/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static', 'fluent-ffmpeg', '@resvg/resvg-js'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.kick.com' },
      { protocol: 'https', hostname: 'files.kick.com' },
      { protocol: 'https', hostname: 'ismptoxqzpmgssursgzl.supabase.co' },
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico|api/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
