'use client';

import { Truck, MapPin, User } from 'lucide-react';
import { formatGhs } from './theme';

/**
 * The thin line above the navigation.
 *
 * Two jobs, one on each side. On the left, the delivery promise — the single
 * fact most likely to decide whether somebody starts filling a basket, and the
 * one thing worth saying before they have looked at anything. On the right, the
 * two reasons a customer comes back to a shop they have already bought from:
 * finding an order, and their account.
 *
 * It sits above the sticky header rather than inside it, so it scrolls away
 * once and does not spend a phone's vertical space for the rest of the visit.
 */

interface Props {
  freeDeliveryOver: number;
  deliveryFee: number;
  /** Their own words, e.g. "3 – 5 business days". */
  deliveryEstimate?: string;
  onTrack?: () => void;
  onAccount?: () => void;
  customerName?: string;
}

export default function StoreTopBar({
  freeDeliveryOver, deliveryFee, deliveryEstimate, onTrack, onAccount, customerName,
}: Props) {
  const alwaysFree = deliveryFee <= 0 || freeDeliveryOver <= 0;
  const promise = alwaysFree
    ? 'Free delivery on every order'
    : `Free delivery on orders over ${formatGhs(freeDeliveryOver)}`;

  return (
    <div className="store-topbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between gap-4 text-[11px]">
        <p className="flex items-center gap-1.5 text-white/55 min-w-0">
          <Truck className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{promise}</span>
          {deliveryEstimate && (
            <span className="hidden md:inline text-white/35">· {deliveryEstimate}</span>
          )}
        </p>

        <div className="flex items-center gap-4 flex-shrink-0">
          {onTrack && (
            <button type="button" onClick={onTrack} className="store-topbar-link">
              <MapPin className="w-3.5 h-3.5" /> Track order
            </button>
          )}
          {onAccount && (
            <button type="button" onClick={onAccount} className="store-topbar-link">
              <User className="w-3.5 h-3.5" />
              <span className="max-w-[90px] truncate">{customerName || 'My account'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
