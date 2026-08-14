'use client';

import GeneratedArt from './GeneratedArt';

/**
 * Categories as places to go, rather than words in a row of pills.
 *
 * The pills in the navbar stay — they are how somebody who already knows what
 * they want narrows the list. These are for the customer who has just arrived
 * and is deciding what to look at, which is a different job and wants pictures.
 *
 * Each tile says what is actually inside it, by naming the first couple of
 * products rather than counting them. "Holland Wax, Kente Stole & more" tells
 * somebody whether to click; "12 items" does not, and a shopper who has never
 * heard of this shop cannot tell a good category from a bad one by its size.
 * The count is still there, as a mark on the picture, because it is worth
 * knowing whether a category holds three things or ninety.
 */

/**
 * What the categories endpoint returns. Plain strings are accepted too, since
 * more than one caller in this app has a list of names rather than records.
 */
type CategoryLike = string | { id?: string; name?: string };

interface ProductLike {
  name?: string;
  category_name?: string;
  images?: string[] | string | null;
}

interface Props {
  categories: CategoryLike[];
  /** Every product, to describe each category and find it a picture. */
  products: ProductLike[];
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

/**
 * Roughly what fits on one line of a tile before CSS cuts it.
 *
 * Sized for the narrow case rather than the wide one. Tiles are six across on
 * a desktop and two across on a phone, so the phone's tile is the shorter of
 * the two — and it is the one most customers will see. A budget that fills the
 * desktop tile clips the phone's; this one leaves the desktop tile slightly
 * short, which nobody notices.
 */
const BLURB_CHARS = 22;

/**
 * What is in this category, in the shop's own words.
 *
 * Built to fit rather than truncated to fit. Naming a fixed two products and
 * letting the overflow rule clip them produced "Holland Wax, 6 yards, Java
 * Print, …", which reads as a bug — and how many names fit depends entirely on
 * how long the shop's product names are, which is not something this can know
 * in advance. So it adds names only while they fit and says "& more" when it
 * has left something out.
 */
function describe(items: ProductLike[]): string {
  const names = items.map(p => String(p.name ?? '').trim()).filter(Boolean);
  if (!names.length) return '';

  const shown: string[] = [];
  for (const name of names) {
    const candidate = [...shown, name].join(', ');
    // Always take the first, however long — one clipped name still says more
    // than nothing, and a shop is allowed a wordy product.
    if (shown.length && candidate.length > BLURB_CHARS) break;
    shown.push(name);
  }

  return shown.length < names.length ? `${shown.join(', ')} & more` : shown.join(', ');
}

export default function CategoryTiles({ categories, products, active, seedHue, limit = 6, onSelect }: Props) {
  // A category with no name is nothing anybody can be sent to.
  const names = categories.map(nameOf).filter(Boolean);
  if (names.length < 2) return null;

  const tiles = names.slice(0, limit).map(name => {
    const inCategory = products.filter(p => (p.category_name || 'General') === name);
    return {
      name,
      count: inCategory.length,
      image: inCategory.map(p => firstImage(p.images)).find(Boolean) || '',
      blurb: describe(inCategory),
    };
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

            {tile.count > 0 && (
              <span className="store-category-count">{tile.count}</span>
            )}
          </span>

          <span className="block px-3 py-3">
            <span className="block text-sm font-bold text-gray-900 truncate">{tile.name}</span>
            <span className="block text-[11px] text-gray-500 truncate mt-0.5">
              {tile.blurb || (tile.count === 1 ? '1 item' : `${tile.count} items`)}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
