import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    minimumCacheTTL: 3600,
  },
  allowedDevOrigins: ['192.168.100.7'],
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) return [];
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(:path*\.(?:ico|png|jpg|jpeg|svg|webp|woff2|woff|ttf))',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
      {
        source: '/((?!api).*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, stale-while-revalidate=60' }],
      },
    ];
  },
};

export default nextConfig;
