'use client';

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

/**
 * What the categories endpoint returns. Plain strings are accepted too, since
 * more than one caller in this app has a list of names rather than records.
 */
type CategoryLike = string | { id?: string; name?: string };

interface Props {
  categories: CategoryLike[];
  /** Every product, to count each category and find it a picture. */
  products: { category_name?: string; images?: string[] | string | null }[];
  active: string;
  seedHue?: number;
  /** How many to show before the rest are left to the navbar pills. */
  limit?: number;
  onSelect: (category: string) => void;
}

const firstImage = (value: unknown): string => {
  if (Array.isArray(value)) return String(value.find(Boolean) || '');
  if (typeof value === 'string' && value.trim()) return value;
  return '';
};

/** A name, whichever of the two shapes it arrived in. */
const nameOf = (c: CategoryLike): string =>
  (typeof c === 'string' ? c : String(c?.name ?? '')).trim();

export default function CategoryTiles({ categories, products, active, seedHue, limit = 6, onSelect }: Props) {
  // A category with no name is nothing anybody can be sent to.
  const names = categories.map(nameOf).filter(Boolean);
  if (names.length < 2) return null;

  const tiles = names.slice(0, limit).map(name => {
    const inCategory = products.filter(p => (p.category_name || 'General') === name);
    const image = inCategory.map(p => firstImage(p.images)).find(Boolean) || '';
    return { name, count: inCategory.length, image };
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {tiles.map(tile => (
        <button
          key={tile.name}
          type="button"
          onClick={() => onSelect(active === tile.name ? '' : tile.name)}
          aria-pressed={active === tile.name}
          className={`store-category-tile group ${active === tile.name ? 'store-category-tile-active' : ''}`}
        >
          <span className="store-category-thumb block">
            {tile.image
              ? <img src={tile.image} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              : <GeneratedArt name={tile.name} seedHue={seedHue} />}
          </span>

          <span className="block px-3 py-3">
            <span className="block text-sm font-bold text-gray-900 truncate">{tile.name}</span>
            <span className="block text-xs text-gray-500 mt-0.5">
              {tile.count} item{tile.count === 1 ? '' : 's'}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
