'use client';

import { ArrowRight, Truck, Lock, BadgeCheck } from 'lucide-react';
import { formatGhs } from './theme';
import HeroCarousel from './HeroCarousel';

/**
 * The first thing a customer sees.
 *
 * There wasn't one. The classes for it have been sitting in globals.css since
 * the storefront was built and nothing ever rendered them, so every shop opened
 * straight into a wall of small product tiles — which reads as a spreadsheet
 * with pictures rather than as somewhere to buy something.
 *
 * It says three things and stops: whose shop this is, what they'd like you to
 * know, and how to start looking. Behind it, the brand colour is always there
 * as a surface, with photographs layered over the top — see HeroCarousel for
 * which ones and why. That order matters: a slow connection, a blocked host or
 * a dead link leaves a composed hero rather than a hole.
 */

/**
 * The shop's mark, top-left.
 *
 * A logo when they have uploaded one. When they have not — which is most shops
 * on day one, and plenty of them a year later — their initial, set in the same
 * badge. The alternative is what was here before: nothing, so the hero opened
 * on a bare headline floating in colour, which reads as a page that failed to
 * finish loading rather than as a shopfront.
 *
 * Decorative either way. The business name is already the <h1> directly
 * beneath it, so a screen reader gains nothing from hearing the letter too.
 */
function StoreMark({ logo, businessName }: { logo?: string; businessName: string }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className="w-14 h-14 rounded-2xl object-cover bg-white/10 ring-1 ring-white/25 shadow-lg"
      />
    );
  }

  return (
    <div
      aria-hidden
      className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/25 shadow-lg
        flex items-center justify-center text-2xl font-extrabold text-white tracking-tight"
    >
      {businessName.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}

interface Props {
  businessName: string;
  tagline?: string;
  bannerImage?: string;
  /** The shop's own product photographs, for the rotating background. */
  productImages?: string[];
  logo?: string;
  productCount: number;
  categoryCount: number;
  freeDeliveryOver: number;
  onShop: () => void;
}

export default function StoreHero({
  businessName, tagline, bannerImage, productImages, logo,
  productCount, categoryCount, freeDeliveryOver, onShop,
}: Props) {
  return (
    <section className="store-hero mb-6 sm:mb-8">
      {/* The colour, always — everything else is layered over it, so a slow or
          missing photograph leaves a hero rather than a hole. */}
      <div className="absolute inset-0 store-hero-bg" />
      <div className="absolute inset-0 store-hero-sheen store-drift" />

      <HeroCarousel banner={bannerImage} productImages={productImages} />

      <div className="relative px-6 sm:px-10 py-10 sm:py-14 lg:py-16">
        <div className="max-w-2xl">
          <div className="mb-5">
            <StoreMark logo={logo} businessName={businessName} />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05]">
            {businessName}
          </h1>

          <p className="mt-3 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl">
            {tagline || `Order online and we'll take it from there.`}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onShop} className="store-btn store-btn-hero inline-flex items-center gap-2">
              Start shopping <ArrowRight className="w-4 h-4" />
            </button>
            {productCount > 0 && (
              <span className="text-sm text-white/70">
                {productCount} item{productCount === 1 ? '' : 's'}
                {categoryCount > 1 && ` across ${categoryCount} categories`}
              </span>
            )}
          </div>
        </div>

        {/* Why it is safe to buy here — the three things a first-time customer
            of a shop they have not heard of actually wants to know.

            Three across at every width, rather than stacking on a phone.
            Stacked, these three cards ran to about 250px and pushed the first
            product clean off the first screen, so the shop spent a customer's
            whole opening view on reassurance and never showed them anything to
            buy. Across, they cost about 60px and the explanatory line is
            dropped — on a narrow column the heading is the whole message
            anyway, and the detail is repeated at checkout where it matters. */}
        <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-2 sm:gap-3 max-w-3xl">
          {[
            { icon: Truck, title: 'Free delivery', note: `On orders over ${formatGhs(freeDeliveryOver)}` },
            { icon: Lock, title: 'Secure checkout', note: 'Card and mobile money, via Paystack' },
            { icon: BadgeCheck, title: 'Live stock', note: 'What you see is what is on the shelf' },
          ].map(({ icon: Icon, title, note }) => (
            <div key={title} className="store-hero-stat flex flex-col sm:flex-row items-start gap-1.5 sm:gap-3">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 flex-shrink-0 sm:mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] leading-tight sm:text-sm font-semibold text-white">{title}</p>
                <p className="hidden sm:block text-xs text-white/65 leading-snug">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
