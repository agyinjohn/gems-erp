import { publicApi } from '@/lib/api';

/**
 * What customers said, on the client side.
 *
 * Reading is open to anybody. Leaving one is not: the shop matches the email
 * against a paid order containing the product, so the form asks for the address
 * the receipt went to rather than asking anybody to be trusted. A signed-in
 * customer is already known and is never asked.
 */

export interface ProductReview {
  id: string;
  name: string;
  rating: number;
  body: string;
  hidden: boolean;
  variant_label: string;
  /** The shop's answer, when it gave one. */
  reply: string;
  replied_at: string | null;
  verified: boolean;
  created_at: string;
}

export interface ReviewSummary {
  reviews: ProductReview[];
  total: number;
  page: number;
  has_more: boolean;
  rating_avg: number;
  rating_count: number;
  /** How many gave each star, keyed 1–5. */
  breakdown: Record<string, number>;
}

export interface Eligibility {
  allowed: boolean;
  reason: string;
  /** True when the refusal is "you already have", rather than "you cannot". */
  reviewed: boolean;
}

const authHeaders = (token?: string) =>
  (token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);

export async function fetchReviews(tenantSlug: string, productSlug: string, page = 1): Promise<ReviewSummary> {
  const r = await publicApi.get(
    `/storefront/${tenantSlug}/products/${encodeURIComponent(productSlug)}/reviews`,
    { params: { page } },
  );
  return r.data.data;
}

export async function fetchEligibility(
  tenantSlug: string, productSlug: string, opts: { token?: string; email?: string } = {},
): Promise<Eligibility> {
  const r = await publicApi.get(
    `/storefront/${tenantSlug}/products/${encodeURIComponent(productSlug)}/reviews/eligibility`,
    { params: opts.email ? { email: opts.email } : {}, ...authHeaders(opts.token) },
  );
  return r.data.data;
}

export async function submitReview(
  tenantSlug: string, productSlug: string,
  review: { rating: number; body: string; name?: string; email?: string },
  token?: string,
) {
  const r = await publicApi.post(
    `/storefront/${tenantSlug}/products/${encodeURIComponent(productSlug)}/reviews`,
    review,
    authHeaders(token),
  );
  return r.data.data;
}

/** "2 weeks ago" — close enough, and shorter than a date nobody reads. */
export function whenAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
