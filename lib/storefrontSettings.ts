import api, { publicApi } from '@/lib/api';

export interface StorefrontSettings {
  delivery_fee: number;
  free_delivery_threshold: number;
  store_enabled: boolean;
  announcement?: string;
  min_order_amount?: number;
}

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  delivery_fee: 30,
  free_delivery_threshold: 500,
  store_enabled: true,
  announcement: '',
  min_order_amount: 0,
};

export function normalizeStorefrontSettings(raw: Partial<StorefrontSettings> | null | undefined): StorefrontSettings {
  return {
    delivery_fee: Number(raw?.delivery_fee ?? DEFAULT_STOREFRONT_SETTINGS.delivery_fee),
    free_delivery_threshold: Number(raw?.free_delivery_threshold ?? DEFAULT_STOREFRONT_SETTINGS.free_delivery_threshold),
    store_enabled: raw?.store_enabled ?? DEFAULT_STOREFRONT_SETTINGS.store_enabled,
    announcement: raw?.announcement ?? '',
    min_order_amount: Number(raw?.min_order_amount ?? 0),
  };
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
