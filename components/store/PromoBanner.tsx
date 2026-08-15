'use client';

import { ArrowRight, Megaphone, Truck } from 'lucide-react';
import ProductStage, { type StageItem } from './ProductStage';
import { formatGhs } from './theme';

/**
 * The one thing the shop most wants said, given a band of its own.
 *
 * Reference designs put a "Limited time offer" banner here. GEMS does carry
 * real discounts — products have compare_price and promotion_name, and the
 * product cards badge them — but a discount belongs to one product, and this
 * band speaks for the whole shop. What speaks for the whole shop is the
 * announcement typed into store settings: it is, by definition, the thing the
 * owner wants everybody to see. It used to render as a thin amber strip under
 * the navigation, where it read as a cookie notice.
 *
 * Failing that, the delivery promise is the next most useful thing a shop can
 * say to somebody deciding whether to fill a basket. If it has neither, this
 * renders nothing rather than filling the space with something invented.
 */

interface Props {
  announcement?: string;
  freeDeliveryOver: number;
  deliveryFee: number;
  /** For the small stage on the right. */
  stageItems?: StageItem[];
  seedHue?: number;
  onShop: () => void;
}

export default function PromoBanner({
  announcement, freeDeliveryOver, deliveryFee, stageItems, seedHue, onShop,
}: Props) {
  const notice = (announcement || '').trim();
  const offersFreeDelivery = deliveryFee > 0 && freeDeliveryOver > 0;

  if (!notice && !offersFreeDelivery) return null;

  const { chip, Icon, headline, sub } = notice
    ? {
        chip: 'From the shop',
        Icon: Megaphone,
        headline: notice,
        sub: '',
      }
    : {
        chip: 'Delivery',
        Icon: Truck,
        headline: `Free delivery over ${formatGhs(freeDeliveryOver)}`,
        sub: `Under that it is a flat ${formatGhs(deliveryFee)}, anywhere we deliver.`,
      };

  return (
    <section className="store-hero">
      <div className="absolute inset-0 store-ink-panel" />

      <div className="relative grid sm:grid-cols-[1.15fr_0.85fr] items-center gap-4 px-6 sm:pl-10 sm:pr-8 py-8 sm:py-5">
        <div className="min-w-0 sm:py-6">
          <span className="store-chip-ink mb-4">
            <Icon className="w-3 h-3" /> {chip}
          </span>

          {/* An announcement is written by a shop owner in a textarea, so it can
              be a sentence or a paragraph. Two lines, then it stops — the rest
              is still in the strip further up the page. */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight line-clamp-2 text-balance">
            {headline}
          </h2>

          {sub && <p className="mt-2.5 text-sm text-white/55 max-w-md">{sub}</p>}

          <button type="button" onClick={onShop} className="store-btn store-btn-hero inline-flex items-center gap-2 mt-6">
            Shop now <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* The picture fills its column and runs to the panel's edge rather
            than sitting in a 210px box out on the right. It can, now that it
            has no edge of its own: the mask fades it to nothing well before
            the panel's rounded corner. Not quite to the edge, though: the
            glow and the arcs reach past the picture, and with the column flush
            to the panel the overflow rule cut both of them off.

            Width is capped rather than height: the stage takes its height from
            its width, so letting it fill a wide column drove the whole banner
            past 400px — taller than the band deserves, and taller than the
            copy beside it could fill. Capping the width instead keeps the
            picture large without the panel growing to match. */}
        <div className="hidden sm:block w-full min-w-0 max-w-[400px] ml-auto">
          <ProductStage items={stageItems} seedHue={seedHue} compact />
        </div>
      </div>
    </section>
  );
}
