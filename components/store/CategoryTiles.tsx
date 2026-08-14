'use client';

import { LayoutGrid } from 'lucide-react';
import GeneratedArt from './GeneratedArt';

/**
 * Categories as places to go, rather than words in a row of pills.
 *
 * The pills in the navbar stay — they are how somebody who already knows what
 * they want narrows the list. These are for the customer who has just arrived
 * and is deciding what to look at, which is a different job and wants pictures.
 *
 * Each tile borrows the first photograph in that category; a category with no
 * photographs anywhere gets a drawn tile, the same way a product does, so the
 * row never has a hole in it.
 */

interface Props {
  categories: string[];
  /** Every product, to count each category and find it a picture. */
  products: { category_name?: string; images?: string[] | string | null }[];
  active: string;
  seedHue?: number;
  onSelect: (category: string) => void;
}

const firstImage = (value: unknown): string => {
  if (Array.isArray(value)) return String(value.find(Boolean) || '');
  if (typeof value === 'string' && value.trim()) return value;
  return '';
};

export default function CategoryTiles({ categories, products, active, seedHue, onSelect }: Props) {
  if (categories.length < 2) return null;

  const tiles = categories.slice(0, 8).map(name => {
    const inCategory = products.filter(p => (p.category_name || 'General') === name);
    const image = inCategory.map(p => firstImage(p.images)).find(Boolean) || '';
    return { name, count: inCategory.length, image };
  });

  return (
    <section className="mb-7">
      <div className="flex items-center gap-3 mb-3.5">
        <h2 className="store-section-title">Shop by category</h2>
        <span className="store-section-rule" />
        {active && (
          <button type="button" onClick={() => onSelect('')} className="text-xs font-semibold text-gray-400 hover:text-gray-700">
            Show everything
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map(tile => (
          <button
            key={tile.name}
            type="button"
            onClick={() => onSelect(active === tile.name ? '' : tile.name)}
            className={`store-category-tile group ${active === tile.name ? 'store-category-tile-active' : ''}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/70 ring-1 ring-black/5">
                {tile.image
                  ? <img src={tile.image} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  : <GeneratedArt name={tile.name} seedHue={seedHue} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-gray-900 truncate">{tile.name}</span>
                <span className="block text-xs text-gray-500">
                  {tile.count} item{tile.count === 1 ? '' : 's'}
                </span>
              </span>
            </div>
          </button>
        ))}

        {categories.length > 8 && (
          <button
            type="button"
            onClick={() => onSelect('')}
            className="store-category-tile group flex items-center gap-3"
          >
            <span className="w-12 h-12 rounded-xl flex-shrink-0 bg-white/70 ring-1 ring-black/5 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-gray-400" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-900">Everything else</span>
              <span className="block text-xs text-gray-500">{categories.length - 8} more categories</span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
