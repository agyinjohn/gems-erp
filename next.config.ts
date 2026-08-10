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
  /**
   * Order matters here: where two rules set the same header, the last one wins.
   * The catch-all therefore goes first, and anything that needs different
   * treatment overrides it below.
   *
   * The previous arrangement had the catch-all last, and its pattern —
   * everything not beginning "api" — also matched /_next/static. So the
   * immutable rule above it was overridden, and every hashed build asset went
   * out as `public, max-age=0, stale-while-revalidate=60`: revalidated on every
   * load, and servable stale by any shared cache. Authenticated pages went out
   * the same way, which on a CDN means one deploy can still be handing people
   * the previous build's HTML — HTML that asks for chunks which are no longer
   * there.
   */
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) return [];
    return [
      // The app: pages behind a login. Nothing shared may hold these, and
      // nothing should serve one from yesterday.
      {
        source: '/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, must-revalidate' }],
      },
      // The public storefront carries no session and gains from being cached.
      {
        source: '/store/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, stale-while-revalidate=60' }],
      },
      // Build output is content-hashed, so a given URL never changes meaning.
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Images, icons and fonts out of /public. Not sw.js — a stale service
      // worker is its own kind of trouble, and it falls to the rule above.
      {
        source: '/:file*.:ext(ico|png|jpg|jpeg|svg|webp|woff2|woff|ttf)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
    ];
  },
};

export default nextConfig;
