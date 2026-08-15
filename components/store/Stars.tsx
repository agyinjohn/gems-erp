'use client';

import { Star } from 'lucide-react';

/**
 * A score, as five stars.
 *
 * Drawn by clipping a filled row over an empty one rather than by rounding to
 * whole or half stars, so 4.3 looks like 4.3. Rounding up flatters the shop and
 * rounding down cheats it, and both make the number beside the stars look like
 * it disagrees with them.
 *
 * A product nobody has reviewed renders nothing at all. Five empty stars read
 * as a bad score rather than as no score, and "0.0" beside them is worse — the
 * absence of reviews is not a verdict.
 */

interface Props {
  value: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  /** Show the number as well as the stars. */
  showValue?: boolean;
  className?: string;
}

const SIZES = {
  sm: { star: 'w-3 h-3', gap: 'gap-0.5', text: 'text-xs' },
  md: { star: 'w-4 h-4', gap: 'gap-0.5', text: 'text-sm' },
  lg: { star: 'w-5 h-5', gap: 'gap-1', text: 'text-base' },
};

export default function Stars({ value, count, size = 'sm', showValue = false, className = '' }: Props) {
  const score = Math.max(0, Math.min(5, Number(value) || 0));
  const s = SIZES[size];
  const filled = `${(score / 5) * 100}%`;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative inline-flex" aria-hidden>
        <span className={`inline-flex ${s.gap}`}>
          {[0, 1, 2, 3, 4].map(i => (
            <Star key={i} className={`${s.star} text-gray-200 fill-gray-200`} />
          ))}
        </span>
        <span
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: filled }}
        >
          <span className={`inline-flex ${s.gap}`}>
            {[0, 1, 2, 3, 4].map(i => (
              <Star key={i} className={`${s.star} text-amber-400 fill-amber-400 flex-shrink-0`} />
            ))}
          </span>
        </span>
      </span>

      {showValue && <span className={`${s.text} font-semibold text-gray-900 tabular-nums`}>{score.toFixed(1)}</span>}
      {typeof count === 'number' && (
        <span className={`${s.text} text-gray-500 tabular-nums`}>
          ({count})
        </span>
      )}
      <span className="sr-only">
        {score.toFixed(1)} out of 5{typeof count === 'number' ? `, ${count} review${count === 1 ? '' : 's'}` : ''}
      </span>
    </span>
  );
}
