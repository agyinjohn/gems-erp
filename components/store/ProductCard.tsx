'use client';
import { Plus, Minus, MapPin, Heart } from 'lucide-react';
import { formatGhs } from './theme';
import ProductCardImage from './ProductCardImage';
import { getProductImages } from './productImages';

interface Props {
  product: any;
  inCartQty?: number;
  showBranch?: boolean;
  cartLoading?: boolean;
  wishlisted?: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onUpdateQty: (delta: number) => void;
  onToggleWishlist?: () => void;
}

export default function ProductCard({ product: p, inCartQty, showBranch, cartLoading, wishlisted, onOpen, onAdd, onUpdateQty, onToggleWishlist }: Props) {
  const outOfStock = p.stock_qty <= 0;
  const lowStock = p.stock_qty > 0 && p.stock_qty <= (p.low_stock_threshold || 5);
  const multiImage = getProductImages(p).length > 1;

  return (
    <article className="store-product-card group flex flex-col">
      <div className="relative">
        <button type="button" onClick={onOpen} className="relative block w-full text-left">
          <ProductCardImage product={p} />

          {outOfStock && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-xs font-bold text-red-600 bg-white px-3 py-1.5 rounded-full border border-red-100 shadow-sm">
                Out of Stock
              </span>
            </div>
          )}
          {lowStock && (
            <span className="absolute top-2 left-2 store-badge store-badge-warn text-[9px] px-2 py-0.5">
              Only {p.stock_qty} left
            </span>
          )}
          {!lowStock && p.compare_price && parseFloat(p.compare_price) > parseFloat(p.price) + 0.01 && (
            <span className="absolute top-2 left-2 store-badge bg-red-500 text-white text-[9px] px-2 py-0.5">
              {p.promotion_name ? p.promotion_name : `-${Math.round((1 - parseFloat(p.price) / parseFloat(p.compare_price)) * 100)}%`}
            </span>
          )}
          {showBranch && p.branch_name && (
            <span className={`absolute left-2 store-badge store-badge-dark text-[9px] px-2 py-0.5 ${multiImage ? 'bottom-7' : 'bottom-2'}`}>
              <MapPin className="w-2.5 h-2.5" />
              {p.branch_name}
            </span>
          )}
        </button>
        {onToggleWishlist && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onToggleWishlist(); }}
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center hover:scale-110 transition-transform"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
        )}
      </div>

      <div className="p-2.5 sm:p-3 flex flex-col flex-1 gap-1">
        <div className="text-[9px] font-bold uppercase tracking-wider text-[#1A5294] truncate">
          {p.category_name || 'General'}
        </div>
        <button type="button" onClick={onOpen} className="text-left">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-[#0D3B6E] transition-colors">
            {p.name}
          </h3>
        </button>

        <div className="mt-auto pt-0.5">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            {parseFloat(p.price) > 0 ? (
              <span className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight">{formatGhs(parseFloat(p.price))}</span>
            ) : (
              <span className="text-sm font-semibold text-gray-400 italic">Price on request</span>
            )}
            {parseFloat(p.price) > 0 && p.compare_price && parseFloat(p.compare_price) > parseFloat(p.price) + 0.01 && (
              <span className="text-xs text-gray-400 line-through">{formatGhs(parseFloat(p.compare_price))}</span>
            )}
          </div>

          <div className="mt-2">
            {outOfStock ? (
              <button disabled className="store-btn store-btn-muted store-btn-sm w-full cursor-not-allowed">
                Unavailable
              </button>
            ) : inCartQty && inCartQty > 0 ? (
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onUpdateQty(-1); }}
                  className="store-qty-btn w-7 h-7"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-bold text-xs text-gray-900 min-w-[1.25rem] text-center">{inCartQty}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onUpdateQty(1); }}
                  className="store-qty-btn store-qty-btn-primary w-7 h-7"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onAdd(); }}
                disabled={cartLoading}
                className="store-btn store-btn-primary store-btn-sm w-full disabled:opacity-60"
              >
                {cartLoading ? '…' : 'Add to Cart'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
