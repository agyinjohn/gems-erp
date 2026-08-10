import type { Metadata } from 'next';
import Script from 'next/script';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function generateMetadata({ params }: { params: Promise<{ tenantSlug: string }> }): Promise<Metadata> {
  const { tenantSlug } = await params;
  try {
    const res = await fetch(`${BASE}/storefront/${tenantSlug}/branches`, { next: { revalidate: 3600 } });
    const data = await res.json();
    const tenant = data?.data?.tenant;
    const name = tenant?.business_name ?? tenantSlug;
    return {
      title: `${name} Store`,
      description: `Shop online at ${name}. Browse products, add to cart and pay securely with Paystack.`,
      manifest: `/api/store-manifest?slug=${tenantSlug}`,
      appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: `${name} Store`,
      },
      other: {
        'mobile-web-app-capable': 'yes',
        'msapplication-TileColor': '#0D3B6E',
      },
      openGraph: {
        title: `${name} Store`,
        description: `Shop online at ${name}`,
        images: tenant?.logo ? [{ url: tenant.logo }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: `${name} Store`,
        description: `Shop online at ${name}`,
      },
    };
  } catch {
    return {
      title: 'Online Store',
      description: 'Shop online securely.',
      manifest: `/api/store-manifest?slug=${tenantSlug}`,
      appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
    };
  }
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <>
      {/* Apple touch icon */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <link rel="apple-touch-icon" href={`/api/store-icon?slug=${tenantSlug}&size=192`} />
      <link rel="apple-touch-startup-image" href={`/api/store-icon?slug=${tenantSlug}&size=512`} />

      {/* Register the storefront's offline shell.
          Scoped to /store/ — it used to be registered at '/', which put a
          customer-facing cache in charge of the entire domain, back office
          included. Any registration still holding the root scope is removed
          first, or it would go on controlling those pages forever. */}
      <Script id="sw-register" strategy="afterInteractive">{`
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', function () {
            navigator.serviceWorker.getRegistrations().then(function (regs) {
              var stale = regs.filter(function (r) {
                return new URL(r.scope).pathname === '/';
              });
              return Promise.all(stale.map(function (r) { return r.unregister(); }));
            }).catch(function () {}).then(function () {
              return navigator.serviceWorker.register('/sw.js', { scope: '/store/' });
            }).catch(function (err) { console.warn('SW registration failed:', err); });
          });
        }
      `}</Script>

      {children}
    </>
  );
}
