'use client';

import { ArrowRight, Truck, Lock, BadgeCheck } from 'lucide-react';
import { formatGhs } from './theme';

/**
 * The first thing a customer sees.
 *
 * There wasn't one. The classes for it have been sitting in globals.css since
 * the storefront was built and nothing ever rendered them, so every shop opened
 * straight into a wall of small product tiles — which reads as a spreadsheet
 * with pictures rather than as somewhere to buy something.
 *
 * It says three things and stops: whose shop this is, what they'd like you to
 * know, and how to start looking. The banner is the shop's own photograph when
 * they have given one; without it the brand colour is treated as a surface —
 * two soft lights across a gradient, drifting slowly — which looks deliberate
 * rather than empty.
 */

interface Props {
  businessName: string;
  tagline?: string;
  bannerImage?: string;
  logo?: string;
  productCount: number;
  categoryCount: number;
  freeDeliveryOver: number;
  onShop: () => void;
}

export default function StoreHero({
  businessName, tagline, bannerImage, logo,
  productCount, categoryCount, freeDeliveryOver, onShop,
}: Props) {
  return (
    <section className="store-hero mb-6 sm:mb-8">
      {/* The picture, or the colour treated like one. */}
      <div className="absolute inset-0 store-hero-bg" />
      {bannerImage ? (
        <>
          <img
            src={bannerImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover store-drift"
          />
          {/* Enough darkness for white text to hold, whatever the photograph. */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
        </>
      ) : (
        <div className="absolute inset-0 store-hero-sheen store-drift" />
      )}

      <div className="relative px-6 sm:px-10 py-10 sm:py-14 lg:py-16">
        <div className="max-w-2xl">
          {logo && (
            <img
              src={logo}
              alt=""
              className="w-14 h-14 rounded-2xl object-cover bg-white/10 ring-1 ring-white/25 mb-5 shadow-lg"
            />
          )}

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
            of a shop they have not heard of actually wants to know. */}
        <div className="mt-9 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
          {[
            { icon: Truck, title: 'Free delivery', note: `On orders over ${formatGhs(freeDeliveryOver)}` },
            { icon: Lock, title: 'Secure checkout', note: 'Card and mobile money, via Paystack' },
            { icon: BadgeCheck, title: 'Live stock', note: 'What you see is what is on the shelf' },
          ].map(({ icon: Icon, title, note }) => (
            <div key={title} className="store-hero-stat flex items-start gap-3">
              <Icon className="w-5 h-5 text-white/90 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-white/65 leading-snug">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
