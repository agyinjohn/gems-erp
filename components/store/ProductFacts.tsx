'use client';

import { Layers, Paperclip, Ruler, Tag } from 'lucide-react';

/**
 * What the shop already knows about a product, finally said out loud.
 *
 * Every field here has been stored since the catalogue was built and rendered
 * nowhere. A shop could fill in a full specification, list what a bundle
 * contains and mark a service as needing artwork, and a customer would see a
 * name, a price and one paragraph.
 *
 * So this adds no schema and asks nothing of a shop owner. It shows what they
 * have already typed.
 */

/** A specification value the browser can safely print. */
type Primitive = string | number | boolean;

interface BundleLine {
  name?: string;
  quantity?: number;
}

interface Props {
  /**
   * Specifications the server resolved against the product's category, so the
   * labels and the order are the ones the shop chose rather than ones derived
   * from a storage key. Preferred over `attributes` whenever it is present.
   */
  specs?: { label?: string; value?: string }[];
  /** The raw bag. Still the fallback, for a catalogue served by an older API. */
  attributes?: Record<string, unknown> | null;
  /** Maker or label, when the shop has recorded one. */
  brand?: string;
  /** What is inside a bundle, already priced and stock-checked without ever being listed. */
  bundleItems?: BundleLine[];
  itemType?: string;
  /** Whether a service cannot start until the client sends something in. */
  requiresFile?: boolean;
  /** Piece, yard, kilo — what the price is per. */
  unit?: string;
}

/**
 * Turn a stored key into something a customer reads.
 *
 * Shop owners type these keys themselves, so they arrive as anything —
 * `fabric_width`, `fabricWidth`, `Fabric Width`. All three should print the
 * same way rather than leaking how they were stored.
 */
export function humanise(key: string): string {
  const spaced = String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  if (!spaced) return '';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * Whether a stored value can be shown as it is.
 *
 * `attributes` is a Mixed field — genuinely anything can be in it, including
 * nested objects from an import that nobody has looked at since. A row reading
 * "[object Object]" is worse than no row, so anything that is not a plain
 * value is dropped rather than coerced.
 */
export function displayable(value: unknown): value is Primitive {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  return false;
}

/** The rows worth drawing, in the order the shop entered them. */
export function specRows(attributes?: Record<string, unknown> | null) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return [];
  return Object.entries(attributes)
    .filter(([key, value]) => humanise(key) && displayable(value))
    .map(([key, value]) => ({
      label: humanise(key),
      value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value),
    }));
}

export default function ProductFacts({
  specs, attributes, brand, bundleItems = [], itemType, requiresFile, unit,
}: Props) {
  // The server's rows when it sent any; otherwise derive them here. Keeping
  // the fallback means a storefront pointed at a backend that has not been
  // deployed yet still shows a specification table rather than nothing.
  const resolved = (specs || [])
    .filter(r => r?.label?.trim() && r?.value?.trim())
    .map(r => ({ label: r.label!.trim(), value: r.value!.trim() }));
  const rows = resolved.length ? resolved : specRows(attributes);

  const brandName = brand?.trim();
  const contents = bundleItems.filter(b => b.name);
  const showUnit = Boolean(unit && unit.trim() && unit.trim().toLowerCase() !== 'piece');

  // A service that needs artwork is the one thing here a customer must know
  // *before* buying, so it is not folded in with the rest.
  const notice = itemType === 'service' && requiresFile;

  if (!rows.length && !contents.length && !notice && !showUnit && !brandName) return null;

  return (
    <div className="space-y-4">
      {notice && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 ring-1 ring-amber-100 p-3">
          <Paperclip className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            <strong className="font-semibold">We&apos;ll need a file from you.</strong>{' '}
            Artwork or documents can be sent after you order — we&apos;ll start once it arrives.
          </p>
        </div>
      )}

      {brandName && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>By <strong className="font-semibold text-gray-900">{brandName}</strong></span>
        </div>
      )}

      {showUnit && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Ruler className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>Sold per <strong className="font-semibold text-gray-900">{unit!.trim()}</strong></span>
        </div>
      )}

      {contents.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
            <Layers className="w-4 h-4 text-gray-400" /> What&apos;s included
          </h3>
          <ul className="rounded-xl ring-1 ring-gray-100 divide-y divide-gray-100 overflow-hidden">
            {contents.map((b, i) => (
              <li key={`${b.name}-${i}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <span className="text-gray-700 min-w-0 truncate">{b.name}</span>
                <span className="text-gray-400 tabular-nums flex-shrink-0">× {b.quantity || 1}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-2">Specifications</h3>
          <dl className="rounded-xl ring-1 ring-gray-100 divide-y divide-gray-100 overflow-hidden">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3 px-3.5 py-2.5 text-sm odd:bg-gray-50/60">
                <dt className="text-gray-500 w-2/5 flex-shrink-0">{label}</dt>
                <dd className="text-gray-900 font-medium min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
