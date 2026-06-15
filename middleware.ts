import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAppPathAllowed, PRODUCT_MODE } from '@/lib/productMode';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function resolveCustomDomainStore(host: string): Promise<string | null> {
  if (!host || host === 'localhost' || host.startsWith('127.0.0.1')) return null;
  try {
    const res = await fetch(`${API_URL}/storefront/resolve-domain?host=${encodeURIComponent(host)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.slug || null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host')?.split(':')[0] || '';

  // Custom domain → rewrite root to tenant storefront
  if (pathname === '/' || pathname === '') {
    const slug = await resolveCustomDomainStore(host);
    if (slug) {
      return NextResponse.rewrite(new URL(`/store/${slug}`, request.url));
    }
  }

  // Product bundle route guard (merchant app only)
  if (PRODUCT_MODE !== 'full' && !isAppPathAllowed(pathname)) {
    const home = PRODUCT_MODE === 'pos' ? '/pos'
      : PRODUCT_MODE === 'storefront' ? '/store-settings'
      : PRODUCT_MODE === 'accounting' ? '/accounting'
      : '/dashboard';
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
