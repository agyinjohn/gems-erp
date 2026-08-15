'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  BadgeCheck, ChevronRight, Heart, Lock, Minus, Package, Plus, RotateCcw, Truck,
} from 'lucide-react';
import ProductImageGallery from './ProductImageGallery';
import ProductFacts from './ProductFacts';
import VariantPicker from './VariantPicker';
import { categoryGradient, categoryIconColor, formatGhs } from './theme';
import { tracksStock, type ProductVariant, type StoreProduct } from '@/lib/storefrontSettings';

/**
 * One product, given the room to be a page.
 *
 * This used to be a gallery beside a single tall card, and everything the shop
 * knew was poured into that card: badges, price, highlights, description,
 * specifications, what's in the bundle, the SKU, the quantity stepper and three
 * buttons, in one 380px column with a panel background and a scrollbar. It read
 * as a sidebar that had been asked to do a page's job.
 *
 * So the page is now two things rather than one. Up top, the picture and the
 * decision: what it is, what it costs, what to choose, and the button. Below
 * that, across the full width, everything a customer reads once they have
 * decided to care — the description, the specification, what is in the box.
 *
 * No panel, and that is the point. The buying column sits on the page ground
 * with rules and space doing the separating, because a card inside a page is a
 * border around content that had nothing to be bordered off from.
 */

interface Props {
  product: StoreProduct;
  inCartQty: number;
  qty: number;
  onQty: (next: number) => void;
  onAdd: (variant: ProductVariant | null) => void;
  onUpdateCartQty: (delta: number) => void;
  onBuyNow: (variant: ProductVariant | null) => void;
  onOpenCart: () => void;
  onClose: () => void;
  onCategory: (name: string) => void;
  related: StoreProduct[];
  onOpenRelated: (p: StoreProduct) => void;
  wishlisted: boolean;
  onToggleWishlist: () => void;
  freeDeliveryOver: number;
  deliveryEstimate?: string;
}

export default function ProductDetail({
  product, inCartQty, qty, onQty, onAdd, onUpdateCartQty, onBuyNow, onOpenCart,
  onClose, onCategory, related, onOpenRelated, wishlisted, onToggleWishlist,
  freeDeliveryOver, deliveryEstimate,
}: Props) {
  const isService = product.item_type === 'service';
  const stocked = tracksStock(product);

  // Which one of it. Null until every question is answered, and null again if
  // the answers name a combination the shop does not make.
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const onResolve = useCallback((v: ProductVariant | null) => setVariant(v), []);

  const options = useMemo(() => product.options || [], [product.options]);
  const hasOptions = options.length > 0;
  // Every question answered, which is not the same as the answers naming
  // something buyable — "2XL, White" is complete and sold out.
  const answeredAll = hasOptions && options.every(o => chosen[o.name]);
  const soldOutChoice = Boolean(variant && variant.available < 1);

  // A shirt with a size to pick is not buyable until one is picked, and not
  // buyable at all if the picked one has gone. The button says which, rather
  // than failing after the click.
  const needsChoice = hasOptions && (!variant || soldOutChoice);
  const buyLabel = !answeredAll
    ? 'Choose an option'
    : soldOutChoice ? 'Sold out'
    : !variant ? 'Not available'
    : isService ? 'Add to order' : 'Add to cart';

  const available = (!stocked || product.stock_qty > 0) && !(hasOptions && product.stock_qty <= 0);

  // Once a combination is chosen it is that combination's price and count that
  // matter — a large white costs ten more, and there are six of it, not
  // twenty-three across the rail.
  const price = variant ? variant.price : product.price;
  const ceiling = variant ? variant.available : product.stock_qty;
  const onSale = price > 0
    && !!product.compare_price
    && product.compare_price > price + 0.01;

  const highlights = useMemo(
    () => (product.highlights || []).filter(Boolean).slice(0, 6),
    [product.highlights],
  );

  // The long description only earns its own column when there is enough of it
  // to be a column. A one-line description in a half-width block beside an
  // empty space looks like something failed to load.
  const hasStory = Boolean(product.description?.trim() || highlights.length);

  return (
    <div className="pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
          <button type="button" onClick={onClose} className="hover:underline hover:[color:var(--store-brand-on-paper)]">Home</button>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <button type="button" onClick={() => onCategory(product.category_name || '')} className="hover:underline hover:[color:var(--store-brand-on-paper)]">
            {product.category_name || 'General'}
          </button>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-gray-700 truncate max-w-[200px] sm:max-w-md">{product.name}</span>
        </nav>
      </div>

      {/* ── The picture and the decision ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-24">
              <ProductImageGallery
                key={product.id}
                product={product}
                gradientClass={categoryGradient(product.category_name)}
              />
            </div>
          </div>

          <div className="lg:col-span-5 lg:pt-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--store-brand-on-paper)' }}>
              {product.category_name || 'General'}
            </div>

            <h1 className="store-detail-title mt-1.5">{product.name}</h1>

            {(product.brand || product.sku) && (
              <p className="text-sm text-gray-500 mt-2">
                {product.brand && <>By <span className="font-semibold text-gray-700">{product.brand}</span></>}
                {product.brand && product.sku && <span className="text-gray-300 mx-2">·</span>}
                {product.sku && <span className="font-mono text-xs">{product.sku}</span>}
              </p>
            )}

            {product.short_description?.trim() && (
              <p className="text-[15px] text-gray-700 leading-relaxed mt-4">
                {product.short_description.trim()}
              </p>
            )}

            {/* Price, on its own, with air around it. It was previously the
                fourth thing in a stack of eight and read like one more row. */}
            <div className="mt-6 pt-6 border-t border-gray-200/80">
              <div className="flex items-baseline gap-3 flex-wrap">
                {price > 0 ? (
                  <span className="store-detail-price">{formatGhs(price)}</span>
                ) : (
                  <span className="text-2xl font-semibold text-gray-400 italic">Price on request</span>
                )}
                {onSale && (
                  <>
                    <span className="text-lg text-gray-400 line-through tabular-nums">{formatGhs(product.compare_price!)}</span>
                    <span className="store-badge store-badge-sale">
                      {product.promotion_name || `Save ${Math.round((1 - price / product.compare_price!) * 100)}%`}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Inclusive of all taxes</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              {isService ? (
                <span className="store-status store-status-good">
                  <BadgeCheck className="w-3.5 h-3.5" /> Service available
                </span>
              ) : !stocked ? (
                <span className="store-status store-status-good">
                  <BadgeCheck className="w-3.5 h-3.5" /> Available
                </span>
              ) : soldOutChoice ? (
                // The chosen combination, not the rail. "In stock · 0
                // available" is what this said before, which is two claims that
                // contradict each other inside one green pill.
                <span className="store-status store-status-bad">This one has sold out</span>
              ) : product.stock_qty > 0 ? (
                <span className="store-status store-status-good">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {variant
                    ? `In stock · ${variant.available} available`
                    : hasOptions ? 'In stock' : `In stock · ${product.stock_qty} available`}
                </span>
              ) : (
                <span className="store-status store-status-bad">Out of stock</span>
              )}
              <button
                type="button"
                onClick={onToggleWishlist}
                className="store-status store-status-quiet"
                style={wishlisted ? { borderColor: '#fecdd3', color: '#e11d48', background: '#fff1f2' } : undefined}
              >
                <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
                {wishlisted ? 'Saved' : 'Save'}
              </button>
            </div>

            {hasOptions && (
              <div className="mt-6 pt-6 border-t border-gray-200/80">
                <VariantPicker
                  product={product}
                  chosen={chosen}
                  onChange={setChosen}
                  onResolve={onResolve}
                />
              </div>
            )}

            {/* ── The decision ── */}
            <div className="mt-6 space-y-3">
              {available ? (
                <>
                  <div className="flex items-stretch gap-3">
                    {inCartQty > 0 ? (
                      <div className="flex items-center gap-3 rounded-xl px-4 ring-1 ring-gray-200 bg-white">
                        <button type="button" onClick={() => onUpdateCartQty(-1)} className="store-qty-btn" aria-label="Remove one">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-gray-900 w-6 text-center tabular-nums">{inCartQty}</span>
                        <button type="button" onClick={() => onUpdateCartQty(1)} className="store-qty-btn store-qty-btn-primary" aria-label="Add one">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl px-4 ring-1 ring-gray-200 bg-white">
                        <button type="button" onClick={() => onQty(Math.max(1, qty - 1))} className="store-qty-btn" aria-label="Fewer">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-gray-900 w-6 text-center tabular-nums">{qty}</span>
                        <button
                          type="button"
                          onClick={() => onQty(stocked ? Math.min(Math.max(1, ceiling), qty + 1) : qty + 1)}
                          className="store-qty-btn store-qty-btn-primary"
                          aria-label="More"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={inCartQty > 0 ? onOpenCart : () => onAdd(variant)}
                      disabled={needsChoice}
                      className="store-btn store-btn-primary flex-1 disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      {inCartQty > 0
                        ? `View cart (${inCartQty} item${inCartQty !== 1 ? 's' : ''})`
                        : buyLabel}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onBuyNow(variant)}
                    disabled={needsChoice}
                    className="store-btn store-btn-buy w-full disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    Buy it now
                  </button>
                </>
              ) : (
                <div className="rounded-xl bg-gray-50 ring-1 ring-gray-200 px-4 py-5 text-center">
                  <p className="font-semibold text-gray-900">This one has sold out</p>
                  <p className="text-sm text-gray-500 mt-1">We&apos;ll have more soon — have a look at the rest.</p>
                  <button type="button" onClick={onClose} className="store-btn-outline mt-3.5">Back to the shop</button>
                </div>
              )}
            </div>

            {/* The promises, as a plain list rather than a tinted box. */}
            <ul className="mt-6 pt-5 border-t border-gray-200/80 space-y-2.5">
              <li className="flex items-center gap-2.5 text-sm text-gray-600">
                <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Free delivery on orders over <strong className="font-semibold text-gray-900">{formatGhs(freeDeliveryOver)}</strong></span>
              </li>
              {deliveryEstimate && (
                <li className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>Usually arrives in <strong className="font-semibold text-gray-900">{deliveryEstimate}</strong></span>
                </li>
              )}
              <li className="flex items-center gap-2.5 text-sm text-gray-600">
                <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Secure checkout by card or mobile money</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-600">
                <RotateCcw className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>Track your order from the moment you pay</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Everything you read after you have decided to care ───────────── */}
      <div className="border-t border-gray-200/80 mt-12 lg:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">

            {hasStory && (
              <div className="lg:col-span-7">
                <h2 className="store-detail-heading">About this {product.item_type === 'bundle' ? 'package' : isService ? 'service' : 'product'}</h2>

                {highlights.length > 0 && (
                  <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                    {highlights.map((h, i) => (
                      <li key={`${h}-${i}`} className="flex items-start gap-2.5 text-[15px] text-gray-700">
                        <span className="store-detail-bullet" aria-hidden />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {product.description?.trim() && (
                  <p className="mt-5 text-[15px] text-gray-600 leading-[1.75] whitespace-pre-line max-w-prose">
                    {product.description.trim()}
                  </p>
                )}
              </div>
            )}

            <div className={hasStory ? 'lg:col-span-5' : 'lg:col-span-8'}>
              <ProductFacts
                specs={product.specs}
                attributes={product.attributes}
                // Deliberately not passed: the maker is already named under the
                // product's title, where a customer looks for it. Saying it
                // again forty lines down is not thoroughness, it is a repeat.
                brand={undefined}
                bundleItems={product.bundle_items}
                itemType={product.item_type}
                requiresFile={product.requires_file}
                unit={product.unit}
              />
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="border-t border-gray-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <h2 className="store-detail-heading mb-5">More from {product.category_name || 'this shop'}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(p => (
                <button key={p.id} type="button" onClick={() => onOpenRelated(p)} className="store-product-card text-left">
                  <div className={`aspect-[4/3] bg-gradient-to-br ${categoryGradient(p.category_name)} flex items-center justify-center overflow-hidden`}>
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      : <Package className={`w-12 h-12 ${categoryIconColor(p.category_name)}`} />}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{p.name}</p>
                    <p className="text-sm font-extrabold text-gray-900 tabular-nums">{formatGhs(p.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
