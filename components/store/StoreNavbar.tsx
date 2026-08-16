'use client';
import { useState } from 'react';
import { Package, Search, ShoppingCart, MapPin, ChevronDown, SlidersHorizontal, User } from 'lucide-react';

interface Props {
  businessName?: string;
  /**
   * The shop's own mark, uploaded in store settings.
   *
   * The header has been drawing a generic parcel icon since it was written,
   * which is the one place on the page where a shop most wants to be itself.
   * The footer has shown the logo the whole time.
   */
  logo?: string;
  cartCount: number;
  cartTotal: number;
  search: string;
  deliveryLocation: string;
  branches: any[];
  activeBranch: any;
  showBranchMenu: boolean;
  customerName?: string;
  onSearchChange: (v: string) => void;
  onResetPage: () => void;
  onGoHome: () => void;
  onOpenCart: () => void;
  onOpenLocation: () => void;
  onToggleBranchMenu: () => void;
  onSelectBranch: (branch: any | null) => void;
  onOpenFilters?: () => void;
  onOpenAccount?: () => void;
}

export default function StoreNavbar({
  businessName,
  logo,
  cartCount,
  cartTotal,
  search,
  deliveryLocation,
  branches,
  activeBranch,
  showBranchMenu,
  onSearchChange,
  onResetPage,
  onGoHome,
  onOpenCart,
  onOpenLocation,
  onToggleBranchMenu,
  onSelectBranch,
  onOpenFilters,
  onOpenAccount,
  customerName,
}: Props) {
  const [broken, setBroken] = useState(false);
  const showLogo = Boolean(logo?.trim()) && !broken;

  return (
    <header className="store-nav sticky top-0 z-40">
      {/* Main bar */}
      <div className="store-nav-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4">
          <button type="button" onClick={onGoHome} className="flex items-center gap-2.5 shrink-0 group">
            <div
              className="w-10 h-10 rounded-xl ring-1 ring-black/5 flex items-center justify-center overflow-hidden transition-colors"
              style={{ background: showLogo ? '#fff' : 'color-mix(in srgb, var(--store-brand) 12%, white)' }}
            >
              {showLogo ? (
                <img
                  src={logo}
                  alt={businessName || 'Shop'}
                  className="w-full h-full object-contain"
                  /* A logo that 404s must fall back to the icon rather than
                     leave a hole where the shop's name should be. Checked on
                     the ref as well as onError: a cached or instantly-failing
                     image is already complete before React attaches the
                     handler, and onError never fires. */
                  ref={el => { if (el?.complete && el.naturalWidth === 0) setBroken(true); }}
                  onError={() => setBroken(true)}
                />
              ) : (
                <Package className="w-5 h-5 [color:var(--store-brand-on-paper)]" />
              )}
            </div>
            <div className="hidden sm:block text-left leading-tight min-w-0">
              <div className="text-gray-900 font-bold text-sm truncate max-w-[140px] md:max-w-[200px]">
                {businessName || 'GEMS Store'}
              </div>
              <div className="text-gray-400 text-[10px] font-semibold tracking-widest uppercase">Online Shop</div>
            </div>
          </button>

          {branches.length > 1 && (
            <div className="relative shrink-0 hidden md:block">
              <button
                type="button"
                onClick={onToggleBranchMenu}
                className="flex items-center gap-1.5 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 ring-1 ring-gray-200 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 [color:var(--store-brand-on-paper)]" />
                <span className="max-w-[100px] truncate">{activeBranch ? activeBranch.name : 'All branches'}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              {showBranchMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button
                    type="button"
                    onClick={() => onSelectBranch(null)}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm ${!activeBranch ? 'bg-[color-mix(in_srgb,var(--store-brand)_10%,white)] [color:var(--store-brand)] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <MapPin className="w-4 h-4" /> All branches
                  </button>
                  {branches.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onSelectBranch(b)}
                      className={`w-full flex items-center gap-2 px-4 py-3 text-sm border-t border-gray-50 ${activeBranch?.id === b.id ? 'bg-[color-mix(in_srgb,var(--store-brand)_10%,white)] [color:var(--store-brand)] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="truncate">{b.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 flex items-center min-w-0">
            <div className="store-search flex-1 min-w-0">
              <Search className="w-4 h-4 text-gray-400 shrink-0 ml-1 hidden sm:block" />
              <input
                className="store-search-input"
                placeholder="Search products…"
                value={search}
                onChange={e => { onSearchChange(e.target.value); onResetPage(); }}
              />
              {onOpenFilters && (
                <button type="button" onClick={onOpenFilters} className="p-2 text-gray-500 hover:[color:var(--store-brand)]" aria-label="Filters">
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenLocation}
            className="hidden lg:flex flex-col items-start shrink-0 pl-3 border-l border-gray-200 max-w-[130px]"
          >
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Deliver to</span>
            <span className="flex items-center gap-1 text-gray-900 text-xs font-semibold truncate w-full">
              <MapPin className="w-3 h-3 [color:var(--store-brand-on-paper)] shrink-0" />
              <span className="truncate">{deliveryLocation || 'Set location'}</span>
            </span>
          </button>

          {onOpenAccount && (
            <button type="button" onClick={onOpenAccount} className="hidden sm:flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-700 text-xs font-medium" title="Account">
              <User className="w-4 h-4" />
              <span className="max-w-[80px] truncate">{customerName || 'Account'}</span>
            </button>
          )}

          <button type="button" onClick={onOpenCart} className="relative shrink-0 p-2 rounded-xl hover:bg-gray-100 transition-colors group">
            <ShoppingCart className="w-6 h-6 text-gray-800" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow [background:var(--store-brand)] [color:var(--store-on-brand)]">
                {cartCount}
              </span>
            )}
            <span className="sr-only">Cart, {cartCount} items</span>
          </button>
        </div>
      </div>

    </header>
  );
}
