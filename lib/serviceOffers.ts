import { publicApi } from '@/lib/api';

/**
 * The work a shop will take on, and how to ask for it.
 *
 * A shop's catalogue has two halves that behave nothing alike. Goods are
 * bought: a price, a quantity, a cart, a card. Work is asked for — described,
 * looked at, priced, agreed — and only then done. The storefront used to show
 * both in one grid with the same Add to Cart button, which promised a customer
 * they could pay GHS 150 for "IT Support (per hour)" without anybody having
 * established how many hours it would take.
 *
 * This is the client side of the half that gets asked for. The pipeline behind
 * it — quote, accept, stages, collection, payment — has existed the whole time;
 * only a page nobody linked to was using it.
 */

export interface ServiceOffer {
  id: string;
  name: string;
  description: string;
  /** One line written to be quoted, when the shop wrote one. */
  short_description: string;
  highlights: string[];
  images: string[];
  category_name: string;
  unit_type: string;
  /** A package of work sold together, rather than a single job. */
  is_solution?: boolean;
  service_type: string;
  /** Whether the shop cannot start until something is sent in. */
  requires_file: boolean;
  /** False when the shop prices this by hand, in which case price is null. */
  priced: boolean;
  price: number | null;
}

export interface ServiceShop {
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  logo?: string;
}

/** What the customer has asked for, and anything they said about it. */
export interface PickedLine {
  quantity: number;
  spec: string;
}

export interface RequestReceipt {
  reference: string;
  track_token: string;
  estimated_total: number;
  needs_quote: boolean;
}

/** How a price is measured, said the way a person would say it. */
export const UNIT_WORD: Record<string, string> = {
  unit: 'each',
  hour: 'per hour',
  day: 'per day',
  fixed: 'fixed price',
};

export async function fetchServiceOffers(tenantSlug: string): Promise<{ shop: ServiceShop | null; offers: ServiceOffer[] }> {
  const r = await publicApi.get(`/service-requests/${tenantSlug}/services`);
  const data = r.data?.data || {};
  return { shop: data.store || null, offers: data.services || [] };
}

/**
 * What is wrong with this request, in the words the customer needs.
 *
 * Checked here as well as on the server, because being told at the top of the
 * form is kinder than having the whole thing rejected after it is sent — and
 * because the server has to check anyway, since the form is not the only thing
 * that can post to it.
 */
export function requestProblem(args: {
  chosen: ServiceOffer[];
  name: string;
  phone: string;
  fileCount: number;
}): string {
  const { chosen, name, phone, fileCount } = args;
  if (!chosen.length) return 'Choose at least one service.';
  if (!name.trim()) return 'Please give your name.';
  if (!phone.trim()) return 'Please give a phone number so we can reach you.';

  const needing = chosen.filter(s => s.requires_file);
  if (needing.length && !fileCount) {
    return `Attach the file for ${needing.map(s => s.name).join(', ')}.`;
  }
  return '';
}

/** The running total, counting only what the shop has already put a price on. */
export function estimateFor(
  chosen: ServiceOffer[],
  picked: Record<string, PickedLine>,
): { total: number; anyToQuote: boolean } {
  const total = chosen.reduce(
    (sum, s) => sum + (s.priced ? (s.price || 0) * (picked[s.id]?.quantity || 1) : 0),
    0,
  );
  return { total, anyToQuote: chosen.some(s => !s.priced) };
}

export async function submitServiceRequest(args: {
  tenantSlug: string;
  chosen: ServiceOffer[];
  picked: Record<string, PickedLine>;
  files: File[];
  contact: { customer_name: string; customer_phone: string; customer_email: string };
  notes: string;
}): Promise<RequestReceipt> {
  const { tenantSlug, chosen, picked, files, contact, notes } = args;
  const fd = new FormData();
  files.forEach(f => fd.append('files', f));
  fd.append('lines', JSON.stringify(chosen.map(s => ({
    service_id: s.id,
    quantity: picked[s.id]?.quantity || 1,
    spec: picked[s.id]?.spec || '',
  }))));
  Object.entries(contact).forEach(([k, v]) => fd.append(k, v));
  if (notes.trim()) fd.append('notes', notes.trim());

  const r = await publicApi.post(`/service-requests/${tenantSlug}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return r.data.data;
}
