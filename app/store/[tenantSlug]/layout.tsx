import type { Metadata } from 'next';

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
    return { title: 'Online Store', description: 'Shop online securely.' };
  }
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
