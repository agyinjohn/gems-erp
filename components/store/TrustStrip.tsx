'use client';

import { Truck, ShieldCheck, PackageCheck, MapPin } from 'lucide-react';
import { formatGhs } from './theme';

/**
 * Why it is safe to buy here.
 *
 * The four things a first-time customer of a shop they have never heard of
 * wants to know, in their own band between the hero and the goods. They used to
 * sit inside the hero, where they competed with the headline for attention and,
 * stacked on a phone, ran to roughly 250px — enough to push the first product
 * off the opening screen, so a shop spent a customer's whole first view on
 * reassurance without showing them one thing to buy.
 *
 * Each one is derived from something the shop has actually configured or the
 * platform actually does. There is no "24/7 support" here, and no returns
 * policy, because GEMS cannot promise either on a tenant's behalf.
 */

interface Props {
  /** The shop's own threshold, from store settings. */
  freeDeliveryOver: number;
  deliveryFee: number;
  /** Opens the order-tracking view. */
  onTrack?: () => void;
}

export default function TrustStrip({ freeDeliveryOver, deliveryFee, onTrack }: Props) {
  // Two ways a shop ends up delivering free on everything: no fee at all, or a
  // threshold of zero, which every order clears.
  const alwaysFree = deliveryFee <= 0 || freeDeliveryOver <= 0;

  const items = [
    {
      icon: Truck,
      title: 'Free delivery',
      note: alwaysFree ? 'On every order' : `On orders over ${formatGhs(freeDeliveryOver)}`,
    },
    {
      icon: ShieldCheck,
      title: 'Secure checkout',
      note: 'Card and mobile money, via Paystack',
    },
    {
      icon: PackageCheck,
      title: 'Live stock',
      note: 'What you see is what is on the shelf',
    },
    {
      icon: MapPin,
      title: 'Track your order',
      note: 'Follow it from packing to your door',
      onClick: onTrack,
    },
  ];

  return (
    <div className="store-trust-strip">
      {items.map(({ icon: Icon, title, note, onClick }) => {
        const body = (
          <>
            <span className="store-trust-icon">
              <Icon className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              {/* Not truncated: at 390px "Secure checkout" clipped to "Secure
                  chec…", and a promise nobody can finish reading is worse than
                  one that takes two lines. */}
              <span className="block text-sm font-bold text-gray-900 leading-tight">{title}</span>
              <span className="block text-xs text-gray-500 leading-snug">{note}</span>
            </span>
          </>
        );

        // Only the one that goes somewhere is a button. Making all four
        // focusable would put three dead stops in the keyboard path.
        return onClick ? (
          <button key={title} type="button" onClick={onClick} className="store-trust-item text-left hover:bg-gray-50 transition-colors">
            {body}
          </button>
        ) : (
          <div key={title} className="store-trust-item">{body}</div>
        );
      })}
    </div>
  );
}
