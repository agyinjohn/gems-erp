'use client';
import { Package, Wrench, Layers } from 'lucide-react';

export interface PosItem {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  stock_qty: number;
  category_name: string;
  images: string[];
  item_type?: string;
  unit_type?: string;
  duration?: number;
  pricing_mode?: string;
  min_price?: number;
  max_price?: number;
}

/**
 * A sellable tile in the POS grid.
 *
 * Products, services and bundles share one shape and one media aspect ratio.
 * Grid rows size to their tallest cell, so mixing card heights leaves stretched
 * cards and prices that don't line up across a row — the type is signalled by
 * accent colour, badge and icon instead, which keeps every row even.
 */

/** Palette a category is assigned from. */
const CATEGORY_TONES = [
  { media: 'from-blue-100 to-blue-50',     icon: 'text-blue-300',     label: 'text-blue-600' },
  { media: 'from-amber-100 to-amber-50',   icon: 'text-amber-300',    label: 'text-amber-600' },
  { media: 'from-emerald-100 to-emerald-50', icon: 'text-emerald-300', label: 'text-emerald-600' },
  { media: 'from-orange-100 to-orange-50', icon: 'text-orange-300',   label: 'text-orange-600' },
  { media: 'from-pink-100 to-pink-50',     icon: 'text-pink-300',     label: 'text-pink-600' },
  { media: 'from-lime-100 to-lime-50',     icon: 'text-lime-300',     label: 'text-lime-600' },
  { media: 'from-cyan-100 to-cyan-50',     icon: 'text-cyan-300',     label: 'text-cyan-600' },
  { media: 'from-violet-100 to-violet-50', icon: 'text-violet-300',   label: 'text-violet-600' },
];

/**
 * Colour a category by hashing its name.
 *
 * Every tenant names categories differently, so a fixed lookup table only ever
 * colours the handful it was written for and greys out the rest. Hashing gives
 * each category a stable colour whatever it is called.
 */
export function categoryTone(name: string) {
  const key = (name || '').trim().toLowerCase();
  if (!key) return CATEGORY_TONES[0];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return CATEGORY_TONES[hash % CATEGORY_TONES.length];
}

const UNIT_LABELS: Record<string, string> = { hour: '/hr', day: '/day', unit: '/unit' };

export default function PosItemCard({
  item, inCartQty, onSelect,
}: {
  item: PosItem;
  inCartQty: number;
  onSelect: (item: PosItem) => void;
}) {
  const type = item.item_type || 'product';
  const isService = type === 'service';
  const isBundle = type === 'bundle';

  // Only stocked goods can run out — services and bundles are always sellable.
  const tracksStock = !isService && !isBundle;
  const outOfStock = tracksStock && item.stock_qty <= 0;
  const lowStock = tracksStock && !outOfStock && item.stock_qty <= 5;

  const tone = categoryTone(item.category_name);
  const accent = isService
    ? { ring: 'border-purple-500 ring-purple-400', badge: 'bg-purple-600', chip: 'text-purple-600' }
    : { ring: 'border-[#0D3B6E] ring-[#0D3B6E]', badge: 'bg-[#0D3B6E]', chip: 'text-[#0D3B6E]' };

  const TypeIcon = isService ? Wrench : isBundle ? Layers : Package;
  const inCart = inCartQty > 0;
  // Open-price items have no catalog amount — showing GH₵ 0.00 would read as
  // free, so the tile says so and the amount is quoted when it's rung up.
  const isOpenPrice = item.pricing_mode === 'open';

  return (
    <button
      type="button"
      onClick={() => !outOfStock && onSelect(item)}
      disabled={outOfStock}
      aria-label={`${item.name}, ${isOpenPrice ? 'price on request' : `GHS ${Number(item.price).toFixed(2)}`}${outOfStock ? ', out of stock' : ''}`}
      className={`group text-left bg-white rounded-xl border overflow-hidden flex flex-col transition-all duration-200 ${
        outOfStock
          ? 'opacity-50 cursor-not-allowed border-gray-100'
          : inCart
            ? `${accent.ring} ring-2 shadow-md cursor-pointer`
            : 'border-gray-100 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
      }`}
    >
      {/* Media — same height for every type, so rows stay even */}
      <div className={`relative h-36 shrink-0 flex items-center justify-center overflow-hidden bg-gradient-to-br ${
        isService ? 'from-purple-100 to-purple-50' : tone.media
      }`}>
        {item.images?.[0] && !isService ? (
          <img
            src={item.images[0]}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <TypeIcon className={`w-14 h-14 ${isService ? 'text-purple-300' : tone.icon}`} />
        )}

        {(isService || isBundle) && (
          <span className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isService ? 'bg-purple-600' : 'bg-blue-600'
          }`}>
            {isService ? 'Service' : 'Bundle'}
          </span>
        )}
        {lowStock && (
          <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Only {item.stock_qty} left
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-bold text-red-500 bg-white px-3 py-1 rounded-full border border-red-200">
              Out of stock
            </span>
          </span>
        )}
        {inCart && (
          <span className={`absolute top-2 right-2 min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1 shadow ${accent.badge}`}>
            <span className="text-white text-[11px] font-extrabold">{inCartQty}</span>
          </span>
        )}
      </div>

      {/* Content — fixed slots so prices align across a row */}
      <div className="p-3.5 flex flex-col flex-1">
        <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 truncate ${
          isService ? 'text-purple-500' : tone.label
        }`}>
          {item.category_name || (isService ? 'Service' : 'General')}
        </p>
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem]">{item.name}</h3>
        <div className="mt-auto pt-2">
          <div className="text-lg font-extrabold text-gray-900">
            {isOpenPrice ? (
              <span className="text-base text-purple-600">Price on request</span>
            ) : (
              <>
                GH₵ {Number(item.price).toFixed(2)}
                {isService && item.unit_type && UNIT_LABELS[item.unit_type] && (
                  <span className="text-xs font-normal text-gray-400 ml-1">{UNIT_LABELS[item.unit_type]}</span>
                )}
              </>
            )}
          </div>
          <div className="text-[10px] font-semibold h-4">
            {inCart
              ? <span className={accent.chip}>{inCartQty} in cart</span>
              : outOfStock
                ? <span className="text-red-500">Unavailable</span>
                : isOpenPrice
                  ? <span className="text-purple-500">Quoted at sale</span>
                  : <span className="text-green-600">{isService ? 'Available' : 'In stock'}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
