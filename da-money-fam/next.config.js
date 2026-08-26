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
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self)',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
