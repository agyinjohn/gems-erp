'use client';
import { ChevronRight } from 'lucide-react';

export type SortOption = 'default' | 'price_asc' | 'price_desc' | 'name';

interface Props {
  categories: { id: string; name: string }[];
  products: any[];
  filterCat: string;
  priceMin: number;
  priceMax: number | '';
  maxProductPrice: number;
  inStockOnly: boolean;
  sortBy: SortOption;
  openSections: Record<string, boolean>;
  activeFilterCount: number;
  onFilterCat: (v: string) => void;
  onPriceMin: (v: number) => void;
  onPriceMax: (v: number | '') => void;
  onInStockOnly: (v: boolean) => void;
  onSortBy: (v: SortOption) => void;
  onToggleSection: (key: string) => void;
  onResetPage: () => void;
  onClearAll: () => void;
  compact?: boolean;
}

export default function StoreFilters({
  categories,
  products,
  filterCat,
  priceMin,
  priceMax,
  maxProductPrice,
  inStockOnly,
  sortBy,
  openSections,
  activeFilterCount,
  onFilterCat,
  onPriceMin,
  onPriceMax,
  onInStockOnly,
  onSortBy,
  onToggleSection,
  onResetPage,
  onClearAll,
  compact,
}: Props) {
  const px = compact ? 'px-4' : 'px-5';

  return (
    <>
      {activeFilterCount > 0 && (
        <div className={`${px} py-3 flex flex-wrap gap-1.5 border-b border-gray-100 flex-shrink-0`}>
          {filterCat && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {filterCat}
              <button type="button" onClick={() => { onFilterCat(''); onResetPage(); }} className="hover:text-blue-900">&times;</button>
            </span>
          )}
          {inStockOnly && (
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
              In Stock
              <button type="button" onClick={() => { onInStockOnly(false); onResetPage(); }} className="hover:text-green-900">&times;</button>
            </span>
          )}
          {(priceMax !== '' || priceMin > 0) && (
            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">
              GH₵ {priceMin}&ndash;{priceMax !== '' ? priceMax : '∞'}
              <button type="button" onClick={() => { onPriceMin(0); onPriceMax(''); onResetPage(); }} className="hover:text-purple-900">&times;</button>
            </span>
          )}
        </div>
      )}

      <div className="border-b border-gray-100">
        <button type="button" onClick={() => onToggleSection('categories')} className={`w-full flex items-center justify-between ${px} py-3.5 hover:bg-gray-50 transition-colors`}>
          <span className="store-filter-section-title">Category</span>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.categories ? 'rotate-90' : ''}`} />
        </button>
        {openSections.categories && (
          <div className="pb-2">
            {[{ id: '', name: 'All Products' }, ...categories.map(c => ({ id: c.name, name: c.name }))].map(c => {
              const count = c.id === '' ? products.length : products.filter(p => p.category === c.id || p.category_name === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onFilterCat(c.id); onResetPage(); }}
                  className={`w-full flex items-center justify-between ${px} py-2.5 text-sm transition-colors ${
                    filterCat === c.id ? 'text-[#0D3B6E] font-semibold bg-blue-50 border-r-2 border-[#0D3B6E]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all ${filterCat === c.id ? 'border-[#0D3B6E] bg-[#0D3B6E]' : 'border-gray-300'}`} />
                    {c.name}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${filterCat === c.id ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-b border-gray-100">
        <button type="button" onClick={() => onToggleSection('price')} className={`w-full flex items-center justify-between ${px} py-3.5 hover:bg-gray-50 transition-colors`}>
          <span className="store-filter-section-title">Price Range</span>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.price ? 'rotate-90' : ''}`} />
        </button>
        {openSections.price && (
          <div className={`${px} pb-5`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-[#0D3B6E] bg-blue-50 px-2.5 py-1.5 rounded-lg">GH₵ {priceMin.toLocaleString()}</span>
              <span className="text-xs text-gray-400">&mdash;</span>
              <span className="text-xs font-semibold text-[#0D3B6E] bg-blue-50 px-2.5 py-1.5 rounded-lg">{priceMax !== '' ? `GH₵ ${Number(priceMax).toLocaleString()}` : 'Any'}</span>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Min</span><span>GH₵ {priceMin}</span></div>
                <input type="range" min={0} max={maxProductPrice} step={50} value={priceMin}
                  onChange={e => { onPriceMin(Number(e.target.value)); onResetPage(); }}
                  className="w-full accent-[#0D3B6E] cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Max</span><span>{priceMax !== '' ? `GH₵ ${priceMax}` : 'Any'}</span></div>
                <input type="range" min={0} max={maxProductPrice} step={50}
                  value={priceMax !== '' ? priceMax : maxProductPrice}
                  onChange={e => { onPriceMax(Number(e.target.value) >= maxProductPrice ? '' : Number(e.target.value)); onResetPage(); }}
                  className="w-full accent-[#0D3B6E] cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {([[0, 200], [200, 500], [500, 1000], [1000, '']] as [number, number | ''][]).map(([mn, mx]) => {
                const label = mx === '' ? `GH₵ ${mn}+` : `GH₵ ${mn}\u2013${mx}`;
                const active = priceMin === mn && priceMax === mx;
                return (
                  <button key={label} type="button" onClick={() => { onPriceMin(mn); onPriceMax(mx); onResetPage(); }}
                    className={`text-xs py-1.5 rounded-lg border transition-colors ${active ? 'bg-[#0D3B6E] text-white border-[#0D3B6E]' : 'border-gray-200 text-gray-600 hover:border-[#0D3B6E] hover:text-[#0D3B6E]'}`}
                  >{label}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-gray-100">
        <button type="button" onClick={() => onToggleSection('availability')} className={`w-full flex items-center justify-between ${px} py-3.5 hover:bg-gray-50 transition-colors`}>
          <span className="store-filter-section-title">Availability</span>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.availability ? 'rotate-90' : ''}`} />
        </button>
        {openSections.availability && (
          <div className={`${px} pb-4 space-y-2`}>
            {[
              { label: 'All Items', value: false, count: products.length },
              { label: 'In Stock Only', value: true, count: products.filter(p => p.stock_qty > 0).length },
            ].map(opt => (
              <button key={String(opt.value)} type="button" onClick={() => { onInStockOnly(opt.value); onResetPage(); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  inStockOnly === opt.value ? 'border-[#0D3B6E] bg-blue-50 text-[#0D3B6E] font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${inStockOnly === opt.value ? 'border-[#0D3B6E] bg-[#0D3B6E]' : 'border-gray-300'}`} />
                  {opt.label}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${inStockOnly === opt.value ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-500'}`}>{opt.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <button type="button" onClick={() => onToggleSection('sort')} className={`w-full flex items-center justify-between ${px} py-3.5 hover:bg-gray-50 transition-colors`}>
          <span className="store-filter-section-title">Sort By</span>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.sort ? 'rotate-90' : ''}`} />
        </button>
        {openSections.sort && (
          <div className="pb-2">
            {([
              { value: 'default' as const, label: 'Relevance' },
              { value: 'price_asc' as const, label: 'Price: Low to High' },
              { value: 'price_desc' as const, label: 'Price: High to Low' },
              { value: 'name' as const, label: 'Name A–Z' },
            ]).map(opt => (
              <button key={opt.value} type="button" onClick={() => { onSortBy(opt.value); onResetPage(); }}
                className={`w-full flex items-center justify-between ${px} py-2.5 text-sm transition-colors ${
                  sortBy === opt.value ? 'text-[#0D3B6E] font-semibold bg-blue-50 border-r-2 border-[#0D3B6E]' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{opt.label}</span>
                {sortBy === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-[#0D3B6E]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeFilterCount > 0 && compact && (
        <div className={`${px} py-4 border-t border-gray-100`}>
          <button type="button" onClick={onClearAll} className="w-full store-btn border border-red-200 text-red-600 hover:bg-red-50 py-2.5">
            Clear all filters
          </button>
        </div>
      )}
    </>
  );
}
