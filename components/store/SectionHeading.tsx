'use client';

import { ArrowRight } from 'lucide-react';

/**
 * The heading above each band of the shop.
 *
 * An eyebrow in the shop's colour, the heading under it, and — when there is
 * somewhere else to go — an action out on the right. It exists so the page has
 * a rhythm: without it every section began with a bare bold line and the page
 * read as one long list with occasional larger text in it.
 *
 * The eyebrow is the part doing the work. It says what kind of thing follows
 * before the heading says which one, so somebody scrolling knows whether to
 * stop without reading the heading at all.
 */

interface Props {
  /** The small uppercase line above. Say what the band is, not what it sells. */
  eyebrow: string;
  title: string;
  /** Optional right-hand action, e.g. "View all categories". */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function SectionHeading({ eyebrow, title, actionLabel, onAction, className = '' }: Props) {
  return (
    <div className={`flex items-end justify-between gap-4 mb-4 ${className}`}>
      <div className="min-w-0">
        <span className="store-eyebrow">{eyebrow}</span>
        <h2 className="store-section-title truncate">{title}</h2>
      </div>

      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="store-section-action">
          {actionLabel} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
