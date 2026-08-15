import type { Metadata } from 'next';
import StorefrontApp from '@/components/store/StorefrontApp';

/**
 * One product, at its own address.
 *
 * The page a customer gets when a shop sends them a link. It renders the same
 * storefront application as the shop front — same cart, same checkout, same
 * everything — opened on this product, so there is one implementation of a
 * product page rather than two that drift apart.
 *
 * What this route adds over opening the product in the grid is everything that
 * happens before React runs: a title, a description and a picture, rendered on
 * the server, which is what WhatsApp, Facebook and Google read. Without it a
 * shared product link previewed as the shop's generic name and logo whatever
 * was being linked to.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RouteParams {
  params: Promise<{ tenantSlug: string; productSlug: string }>;
}

async function fetchProduct(tenantSlug: string, productSlug: string) {
  try {
    const res = await fetch(
      `${BASE}/storefront/${encodeURIComponent(tenantSlug)}/products/${encodeURIComponent(productSlug)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data ?? null;
  } catch {
    // A preview crawler getting no tags is a worse outcome than a slow one,
    // but neither is worth failing the page render over.
    return null;
  }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { tenantSlug, productSlug } = await params;
  const product = await fetchProduct(tenantSlug, productSlug);

  // No product, or the API is down: say nothing rather than something wrong.
  // The layout's shop-level tags still apply.
  if (!product?.name) return {};

  // The shop's own words first. The long description is written for somebody
  // already looking at the page; the short one was written to be quoted.
  const summary = String(product.short_description || product.description || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

  const image = Array.isArray(product.images) ? product.images.find(Boolean) : undefined;

  return {
    title: product.name,
    description: summary || `${product.name}, available now.`,
    openGraph: {
      title: product.name,
      description: summary || `${product.name}, available now.`,
      type: 'website',
      images: image ? [{ url: image }] : [],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: product.name,
      description: summary || `${product.name}, available now.`,
      images: image ? [image] : [],
    },
    alternates: { canonical: `/store/${tenantSlug}/${productSlug}` },
  };
}

export default async function ProductPage({ params }: RouteParams) {
  const { tenantSlug, productSlug } = await params;
  // Already fetched for the metadata above, and cached by the same revalidate
  // window, so this is the same request rather than a second one.
  const product = await fetchProduct(tenantSlug, productSlug);
  return <StorefrontApp initialProduct={product} />;
}
