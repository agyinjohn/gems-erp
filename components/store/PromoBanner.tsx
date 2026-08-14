'use client';

import { ArrowRight, Megaphone, Truck } from 'lucide-react';
import ProductStage from './ProductStage';
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
  productImages?: string[];
  productNames?: string[];
  seedHue?: number;
  onShop: () => void;
}

export default function PromoBanner({
  announcement, freeDeliveryOver, deliveryFee,
  productImages, productNames, seedHue, onShop,
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

      <div className="relative grid sm:grid-cols-[1.2fr_0.8fr] items-center gap-6 px-6 sm:px-10 py-8 sm:py-10">
        <div className="min-w-0">
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

        {/* w-full is load-bearing: ml-auto opts a grid item out of stretching,
            and every child of the stage is absolutely positioned, so without an
            explicit width the box shrink-to-fits to nothing and the stage
            disappears entirely. */}
        <div className="hidden sm:block w-full min-w-0 max-w-[210px] ml-auto">
          <ProductStage images={productImages} names={productNames} seedHue={seedHue} />
        </div>
      </div>
    </section>
  );
}
