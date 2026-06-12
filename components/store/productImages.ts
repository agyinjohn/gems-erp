/** Normalize product.images from API (array, single string, or missing). */
export function getProductImages(product: { images?: string[] | string | null } | null | undefined): string[] {
  if (!product?.images) return [];
  if (Array.isArray(product.images)) return product.images.filter(Boolean);
  if (typeof product.images === 'string' && product.images.trim()) return [product.images.trim()];
  return [];
}

export function hasMultipleImages(product: { images?: string[] | string | null } | null | undefined): boolean {
  return getProductImages(product).length > 1;
}
