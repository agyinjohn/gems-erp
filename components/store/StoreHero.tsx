'use client';

import { ArrowRight } from 'lucide-react';
import ProductStage from './ProductStage';

/**
 * The first thing a customer sees.
 *
 * Two halves. On the left, in order: whose shop this is, what they'd like you
 * to know, and the one button that starts the shopping. On the right, the goods
 * themselves, lit and standing on a plinth — see ProductStage.
 *
 * The panel is near-black for every shop, with the shop's own colour bloomed in
 * behind the goods and carrying the accent line of the headline. That split is
 * deliberate. Letting the colour be the whole surface meant a shop that picked
 * yellow got a yellow wall, and one that picked the default navy got something
 * indistinguishable from every other shop; keeping the surface fixed and
 * spending the colour on the accents gives both of them a storefront that looks
 * composed and still looks like theirs.
 *
 * The trust promises used to live down here. They have their own band now — see
 * TrustStrip — because in the hero they competed with the headline and, stacked
 * on a phone, pushed the first purchasable thing off the screen entirely.
 */

interface Props {
  businessName: string;
  tagline?: string;
  /** Set by the shop; used as a faint backdrop behind the whole panel. */
  bannerImage?: string;
  /** The shop's own product photographs, for the stage. */
  productImages?: string[];
  /** Product names, to seed the drawn tiles when there are no photographs. */
  productNames?: string[];
  logo?: string;
  productCount: number;
  categoryCount: number;
  /** Steers the drawn tiles toward the shop's colour. */
  seedHue?: number;
  onShop: () => void;
  /** The second, quieter action. Omitted when there is nowhere to send them. */
  onSecondary?: () => void;
  secondaryLabel?: string;
}

/**
 * The shop's mark. A logo when they have uploaded one, otherwise their initial
 * in the same badge — the hero should never open on a bare headline, which is
 * what most shops got, since most have uploaded nothing.
 *
 * Decorative either way: the business name is written out right beside it.
 */
function StoreMark({ logo, businessName }: { logo?: string; businessName: string }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className="w-6 h-6 rounded-full object-cover bg-white/10 ring-1 ring-white/20 flex-shrink-0"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="w-6 h-6 rounded-full bg-white/12 ring-1 ring-white/20 flex-shrink-0
        flex items-center justify-center text-[11px] font-extrabold text-white"
    >
      {businessName.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

export default function StoreHero({
  businessName, tagline, bannerImage, productImages, productNames, logo,
  productCount, categoryCount, seedHue, onShop, onSecondary, secondaryLabel,
}: Props) {
  return (
    <section className="store-hero-band">
      <div className="absolute inset-0 store-ink-panel" />

      {/* A shop that went to the trouble of uploading a banner still gets it,
          but underneath rather than over — enough to tint the panel, never
          enough to fight the headline for the text's ground. */}
      {bannerImage && (
        <>
          <img src={bannerImage} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0a0e14] via-[#0a0e14]/85 to-[#0a0e14]/55" />
        </>
      )}

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.02fr_0.98fr] items-center
        gap-10 lg:gap-6 px-4 sm:px-6 py-12 sm:py-16 lg:py-20">

        {/* The shop's name is said once, as the accent line of the headline.
            It was being said three times — mark, headline and navigation —
            which is how a hero starts to read like a form. The mark now sits
            inside the chip rather than floating above it on its own line,
            where it read as an orphan. */}
        <div className="min-w-0">
          <span className="store-chip-ink mb-6 !pl-1.5">
            <StoreMark logo={logo} businessName={businessName} />
            Now open online
          </span>

          <h1 className="font-extrabold text-white tracking-[-0.035em] leading-[0.98] text-balance
            text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem]">
            Everything from
            <br />
            <span className="store-ink-accent">{businessName}</span>
          </h1>

          <p className="mt-5 text-base text-white/55 leading-relaxed max-w-md">
            {tagline || 'Order online and we’ll take it from there.'}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onShop} className="store-btn store-btn-hero inline-flex items-center gap-2">
              Start shopping <ArrowRight className="w-4 h-4" />
            </button>
            {onSecondary && secondaryLabel && (
              <button type="button" onClick={onSecondary} className="store-btn store-btn-ink">
                {secondaryLabel}
              </button>
            )}
          </div>

          {productCount > 0 && (
            <p className="mt-6 text-xs text-white/35">
              {productCount} item{productCount === 1 ? '' : 's'} in stock
              {categoryCount > 1 && ` across ${categoryCount} categories`}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <ProductStage images={productImages} names={productNames} seedHue={seedHue} />
        </div>
      </div>
    </section>
  );
}
