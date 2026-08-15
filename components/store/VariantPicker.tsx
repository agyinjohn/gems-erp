'use client';

import { useEffect, useMemo } from 'react';
import { formatGhs } from './theme';
import type { ProductOption, ProductVariant, StoreProduct } from '@/lib/storefrontSettings';

/**
 * Which one of it.
 *
 * A shirt is a size and a colour. Until now the storefront let a customer add
 * one to a cart having said neither, and the shop received an order for "1 ×
 * Corporate Polo Shirt" that nobody could pick from a shelf.
 *
 * Two rules run this. The customer cannot buy until every question is answered
 * — enforced by the button being disabled and again by the server, because the
 * form is not the only thing that can post an order. And a combination the shop
 * has run out of is shown and struck through rather than hidden: a customer who
 * came for a white 2XL should learn that it is sold out, not be left wondering
 * whether this shop stocks their size at all.
 */

interface Props {
  product: StoreProduct;
  /** What has been chosen so far, by option name. */
  chosen: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  /** Told the resolved combination, or null while the choice is incomplete. */
  onResolve: (variant: ProductVariant | null) => void;
}

const norm = (s: string) => s.trim().toLowerCase();

/** The combination matching a full set of answers, if the shop sells one. */
export function resolveVariant(
  variants: ProductVariant[] | undefined,
  options: ProductOption[] | undefined,
  chosen: Record<string, string>,
): ProductVariant | null {
  if (!variants?.length || !options?.length) return null;
  // Every question answered, or there is nothing to resolve yet.
  if (!options.every(o => chosen[o.name])) return null;

  return variants.find(v =>
    options.every(o => v.selections.some(s => norm(s.name) === norm(o.name) && norm(s.value) === norm(chosen[o.name])))
  ) || null;
}

/**
 * Whether picking this value could still lead to something buyable.
 *
 * Judged against the choices already made rather than in isolation: once navy
 * is picked, 2XL is only offerable if a navy 2XL exists. Showing every size as
 * available and then failing on the last click is the behaviour this avoids.
 */
function reachable(
  variants: ProductVariant[],
  chosen: Record<string, string>,
  optionName: string,
  value: string,
): boolean {
  return variants.some(v => {
    if (v.available < 1) return false;
    if (!v.selections.some(s => norm(s.name) === norm(optionName) && norm(s.value) === norm(value))) return false;
    // Every *other* answer already given must also hold for this combination.
    return Object.entries(chosen).every(([name, picked]) =>
      norm(name) === norm(optionName)
      || !picked
      || v.selections.some(s => norm(s.name) === norm(name) && norm(s.value) === norm(picked)));
  });
}

export default function VariantPicker({ product, chosen, onChange, onResolve }: Props) {
  const options = product.options || [];
  const variants = useMemo(() => product.variants || [], [product.variants]);

  const resolved = useMemo(
    () => resolveVariant(variants, options, chosen),
    [variants, options, chosen],
  );

  useEffect(() => { onResolve(resolved); }, [resolved, onResolve]);

  if (!options.length) return null;

  const unanswered = options.filter(o => !chosen[o.name]);

  return (
    <div className="space-y-5">
      {options.map(option => {
        const picked = chosen[option.name];

        return (
          <div key={option.name}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-sm font-bold text-gray-900">{option.name}</span>
              {picked && <span className="text-sm text-gray-500">{picked}</span>}
            </div>

            <div className="flex flex-wrap gap-2">
              {option.values.map(({ value }) => {
                const isPicked = norm(picked || '') === norm(value);
                const can = reachable(variants, chosen, option.name, value);

                return (
                  <button
                    key={value}
                    type="button"
                    // Selectable even when sold out, so a customer can see the
                    // combination and the price rather than being told nothing.
                    onClick={() => onChange({ ...chosen, [option.name]: value })}
                    aria-pressed={isPicked}
                    className={`store-swatch ${isPicked ? 'store-swatch-on' : ''} ${can ? '' : 'store-swatch-gone'}`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Say what is still needed, and what the answer costs, in one line. */}
      {unanswered.length > 0 ? (
        <p className="text-sm text-gray-500">
          Choose {unanswered.map(o => o.name.toLowerCase()).join(' and ')} to continue.
        </p>
      ) : !resolved ? (
        <p className="text-sm text-amber-800">
          We don&apos;t make that combination. Try another {options[options.length - 1].name.toLowerCase()}.
        </p>
      ) : resolved.available < 1 ? (
        // The status pill above already says it has sold out, so this says the
        // half the pill cannot: what to do instead.
        <p className="text-sm text-amber-800">
          Try a different {options[0].name.toLowerCase()} — the rest are in stock.
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          {resolved.price !== product.price && (
            <span className="font-semibold text-gray-900">{formatGhs(resolved.price)} · </span>
          )}
          {resolved.available <= 5
            ? `Only ${resolved.available} left in this one`
            : `${resolved.available} in stock`}
          {resolved.sku && <span className="text-gray-400"> · {resolved.sku}</span>}
        </p>
      )}
    </div>
  );
}
