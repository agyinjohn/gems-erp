import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const size = Math.min(512, Math.max(16, parseInt(req.nextUrl.searchParams.get('size') || '192', 10)));
  const slug = req.nextUrl.searchParams.get('slug') || 'store';

  // Initial letter from slug
  const letter = slug.charAt(0).toUpperCase();
  const half = size / 2;
  const r = size * 0.18; // corner radius
  const fontSize = size * 0.38;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0D3B6E"/>
      <stop offset="100%" stop-color="#1A5294"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
  <rect x="${size * 0.08}" y="${size * 0.08}" width="${size * 0.84}" height="${size * 0.84}" rx="${r * 0.6}" ry="${r * 0.6}" fill="rgba(255,255,255,0.06)"/>
  <text
    x="${half}"
    y="${half + fontSize * 0.36}"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="${fontSize}"
    font-weight="800"
    fill="#FBBF24"
    text-anchor="middle"
    dominant-baseline="auto"
  >${letter}</text>
  <text
    x="${half}"
    y="${size * 0.88}"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="${size * 0.1}"
    font-weight="600"
    fill="rgba(255,255,255,0.55)"
    text-anchor="middle"
    letter-spacing="${size * 0.012}"
  >STORE</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
