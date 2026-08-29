/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      'ffmpeg-static',
      'fluent-ffmpeg',
      '@resvg/resvg-js',
      'kokoro-js',
      '@huggingface/transformers',
      'onnxruntime-node',
      'sharp',
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'onnxruntime-node$': false,
      sharp$: false,
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        crypto: false,
      }
    }
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.kick.com' },
      { protocol: 'https', hostname: 'files.kick.com' },
      { protocol: 'https', hostname: 'ismptoxqzpmgssursgzl.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    unoptimized: false,
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/videos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/store/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/((?!_next/static|_next/image|favicon.ico|api/|account|admin|library).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self)',
          },
        ],
      },
      {
        source: '/account/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/library',
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
