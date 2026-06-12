'use client';
import { Package, Search, ShoppingCart, MapPin, ChevronDown, ChevronRight, Menu, SlidersHorizontal } from 'lucide-react';

interface Props {
  businessName?: string;
  cartCount: number;
  cartTotal: number;
  search: string;
  filterCat: string;
  categories: { id: string; name: string }[];
  deliveryLocation: string;
  branches: any[];
  activeBranch: any;
  showBranchMenu: boolean;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onResetPage: () => void;
  onGoHome: () => void;
  onOpenCart: () => void;
  onOpenLocation: () => void;
  onToggleBranchMenu: () => void;
  onSelectBranch: (branch: any | null) => void;
  onOpenMobileFilters?: () => void;
}

export default function StoreNavbar({
  businessName,
  cartCount,
  cartTotal,
  search,
  filterCat,
  categories,
  deliveryLocation,
  branches,
  activeBranch,
  showBranchMenu,
  onSearchChange,
  onCategoryChange,
  onResetPage,
  onGoHome,
  onOpenCart,
  onOpenLocation,
  onToggleBranchMenu,
  onSelectBranch,
  onOpenMobileFilters,
}: Props) {
  const categoryPills = [{ id: '', name: 'All' }, ...categories.map(c => ({ id: c.name, name: c.name }))];

  return (
    <header className="store-nav sticky top-0 z-40">
      {/* Main bar */}
      <div className="store-nav-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4">
          <button type="button" onClick={onGoHome} className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center group-hover:bg-white/15 transition-colors">
              <Package className="w-5 h-5 text-amber-300" />
            </div>
            <div className="hidden sm:block text-left leading-tight min-w-0">
              <div className="text-white font-bold text-sm truncate max-w-[140px] md:max-w-[200px]">
                {businessName || 'GEMS Store'}
              </div>
              <div className="text-amber-200/80 text-[10px] font-semibold tracking-widest uppercase">Online Shop</div>
            </div>
          </button>

          {branches.length > 1 && (
            <div className="relative shrink-0 hidden md:block">
              <button
                type="button"
                onClick={onToggleBranchMenu}
                className="flex items-center gap-1.5 text-white/90 text-xs font-medium px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 ring-1 ring-white/10 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-300" />
                <span className="max-w-[100px] truncate">{activeBranch ? activeBranch.name : 'All branches'}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              {showBranchMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button
                    type="button"
                    onClick={() => onSelectBranch(null)}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm ${!activeBranch ? 'bg-blue-50 text-[#0D3B6E] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <MapPin className="w-4 h-4" /> All branches
                  </button>
                  {branches.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onSelectBranch(b)}
                      className={`w-full flex items-center gap-2 px-4 py-3 text-sm border-t border-gray-50 ${activeBranch?.id === b.id ? 'bg-blue-50 text-[#0D3B6E] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
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
              {onOpenMobileFilters && (
                <button type="button" onClick={onOpenMobileFilters} className="lg:hidden p-2 text-gray-500 hover:text-[#0D3B6E]" aria-label="Filters">
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenLocation}
            className="hidden lg:flex flex-col items-start shrink-0 pl-3 border-l border-white/15 max-w-[130px]"
          >
            <span className="text-[10px] text-white/50 uppercase tracking-wide">Deliver to</span>
            <span className="flex items-center gap-1 text-white text-xs font-semibold truncate w-full">
              <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
              <span className="truncate">{deliveryLocation || 'Set location'}</span>
            </span>
          </button>

          <button type="button" onClick={onOpenCart} className="relative shrink-0 p-2 rounded-xl hover:bg-white/10 transition-colors group">
            <ShoppingCart className="w-6 h-6 text-white" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-amber-400 text-gray-900 text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
                {cartCount}
              </span>
            )}
            <span className="sr-only">Cart, {cartCount} items</span>
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="store-nav-categories border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-hide">
          {categoryPills.map(c => (
            <button
              key={c.id || 'all'}
              type="button"
              onClick={() => { onCategoryChange(c.id); onResetPage(); }}
              className={`store-pill shrink-0 ${filterCat === c.id ? 'store-pill-active' : ''}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
