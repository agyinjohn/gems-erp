import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || 'store';

  let name = 'GEMS Store';
  let shortName = 'Store';
  let themeColor = '#0D3B6E';

  try {
    const res = await fetch(`${BASE}/storefront/${slug}/branches`, { next: { revalidate: 3600 } });
    const data = await res.json();
    const tenant = data?.data?.tenant;
    if (tenant?.business_name) {
      name = `${tenant.business_name} Store`;
      shortName = tenant.business_name.split(' ')[0];
    }
  } catch {}

  const manifest = {
    name,
    short_name: shortName,
    description: `Shop online at ${name}. Browse products and pay securely.`,
    start_url: `/store/${slug}`,
    scope: `/store/${slug}`,
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f8fafc',
    theme_color: themeColor,
    categories: ['shopping', 'business'],
    icons: [
      { src: `/api/store-icon?slug=${slug}&size=192`, sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
      { src: `/api/store-icon?slug=${slug}&size=512`, sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: 'Browse Products',
        url: `/store/${slug}`,
        description: 'Browse all products',
      },
      {
        name: 'Track Order',
        url: `/store/${slug}?track=1`,
        description: 'Track your order',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
  });
}
