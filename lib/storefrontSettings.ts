import api, { publicApi } from '@/lib/api';

export interface StorefrontSettings {
  delivery_fee: number;
  free_delivery_threshold: number;
  store_enabled: boolean;
  announcement?: string;
  min_order_amount?: number;
  tax_rate?: number;
  tax_name?: string;
  custom_domain?: string;
  delivery_estimate?: string;       // e.g. "3 – 5 business days"
  location_suggestions?: string[];  // e.g. ["Accra", "Kumasi"]
  phone_placeholder?: string;       // e.g. "+233 XX XXX XXXX"
}

// ── Shared TypeScript interfaces ────────────────────────────────────────────
export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  cost_price?: number;
  compare_price?: number;
  description?: string;
  sku?: string;
  images: string[];
  stock_qty: number;
  low_stock_threshold: number;
  category_name?: string;
  branch_id?: string;
  branch_name?: string;
  branch_slug?: string;
  is_active: boolean;
}

export interface StoreTenant {
  id: string;
  business_name: string;
  slug: string;
  logo?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface StoreBranch {
  id: string;
  name: string;
  slug: string;
  address?: string;
}

export interface StoreCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface StoreOrder {
  id: string;
  _id?: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  createdAt?: string;
  created_at?: string;
  items?: Array<{ product_name: string; quantity: number; unit_price: number }>;
  delivery_address?: string;
}

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  delivery_fee: 30,
  free_delivery_threshold: 500,
  store_enabled: true,
  announcement: '',
  min_order_amount: 0,
  delivery_estimate: '3 – 5 business days',
  location_suggestions: [],
  phone_placeholder: '',
};

export function normalizeStorefrontSettings(raw: Partial<StorefrontSettings> | null | undefined): StorefrontSettings {
  return {
    delivery_fee: Number(raw?.delivery_fee ?? DEFAULT_STOREFRONT_SETTINGS.delivery_fee),
    free_delivery_threshold: Number(raw?.free_delivery_threshold ?? DEFAULT_STOREFRONT_SETTINGS.free_delivery_threshold),
    store_enabled: raw?.store_enabled ?? DEFAULT_STOREFRONT_SETTINGS.store_enabled,
    announcement: raw?.announcement ?? '',
    min_order_amount: Number(raw?.min_order_amount ?? 0),
    tax_rate: Number(raw?.tax_rate ?? 0),
    tax_name: raw?.tax_name ?? '',
    custom_domain: String(raw?.custom_domain ?? '').toLowerCase().trim(),
    delivery_estimate: raw?.delivery_estimate ?? DEFAULT_STOREFRONT_SETTINGS.delivery_estimate,
    location_suggestions: Array.isArray(raw?.location_suggestions) ? raw.location_suggestions : [],
    phone_placeholder: raw?.phone_placeholder ?? '',
  };
}

export function calcTaxAmount(subtotal: number, taxRatePct = 0): number {
  if (!subtotal || !taxRatePct) return 0;
  return Math.round(subtotal * taxRatePct / 100);
}

export function calcDeliveryFee(subtotal: number, settings: StorefrontSettings): number {
  if (subtotal <= 0) return 0;
  return subtotal >= settings.free_delivery_threshold ? 0 : settings.delivery_fee;
}

export function amountUntilFreeDelivery(subtotal: number, settings: StorefrontSettings): number {
  if (subtotal >= settings.free_delivery_threshold) return 0;
  return Math.max(0, settings.free_delivery_threshold - subtotal);
}

/** Public settings for a tenant storefront (no auth). */
export async function fetchPublicStoreSettings(tenantSlug: string): Promise<StorefrontSettings> {
  try {
    const r = await publicApi.get(`/storefront/${tenantSlug}/settings`);
    return normalizeStorefrontSettings(r.data.data);
  } catch {
    return { ...DEFAULT_STOREFRONT_SETTINGS };
  }
}

/** Merchant settings (authenticated). */
export async function fetchMerchantStoreSettings(): Promise<StorefrontSettings> {
  try {
    const r = await api.get('/storefront/settings');
    return normalizeStorefrontSettings(r.data.data);
  } catch {
    return { ...DEFAULT_STOREFRONT_SETTINGS };
  }
}

export async function saveMerchantStoreSettings(settings: StorefrontSettings): Promise<StorefrontSettings> {
  const r = await api.put('/storefront/settings', settings);
  return normalizeStorefrontSettings(r.data.data);
}

/** Public order lookup for customers. */
export async function trackStoreOrder(tenantSlug: string, reference: string) {
  const r = await publicApi.get(
    `/storefront/${tenantSlug}/orders/${encodeURIComponent(reference.trim())}`,
  );
  return r.data.data;
}
