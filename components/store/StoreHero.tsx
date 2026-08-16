'use client';

import { useMemo, useState } from 'react';
import type { StageItem } from './ProductStage';
import { DEFAULT_HERO_MESSAGE } from '@/lib/storefrontSettings';

/**
 * The first thing a customer sees.
 *
 * Editorial rather than retail: one photograph filling the whole band, the
 * shop's name set large in a display serif over it, and everything centred.
 * The serif is the load-bearing part — the thin strokes and the swell into the
 * thick ones are why this reads as a shopfront somebody cared about, and no
 * weight of a grotesque gets close.
 *
 * This does put type over a photograph, which an earlier version of this file
 * argued against. The objection was sound and the answer is the scrim below:
 * that version darkened the picture just enough for text and ended up with
 * muddy words on a muddy field. Here the picture is deliberately pushed well
 * back — dimmed, tinted toward the shop's own colour and vignetted — so it is
 * atmosphere rather than subject. A photograph asked to be atmosphere can be
 * any photograph, which matters, because a shop uploads what it has.
 *
 * With nothing uploaded the band is the shop's colour on near-black, lit from
 * the middle. That is the same composition minus the photograph, not a
 * fallback that looks like one.
 */

interface Props {
  businessName: string;
  /** The shop's own big line. Falls back to the business name. */
  heroHeadline?: string;
  tagline?: string;
  /** The shop's own banner. The deliberate choice, so it wins. */
  bannerImage?: string;
  /** Their goods, for a shop that set no banner but has photographed stock. */
  stageItems?: StageItem[];
  productCount: number;
  categoryCount: number;
  /** The shop's own words, e.g. "3 – 5 business days". */
  deliveryEstimate?: string;
  onShop: () => void;
  onSecondary?: () => void;
  secondaryLabel?: string;
}

export default function StoreHero({
  businessName, heroHeadline, tagline, bannerImage, stageItems = [],
  productCount, categoryCount, deliveryEstimate,
  onShop, onSecondary, secondaryLabel,
}: Props) {
  /**
   * What might end up behind the type, best first. A banner is a deliberate
   * choice about how the shop should feel and beats a photograph of one
   * product, which was only ever chosen because it was first in the list.
   */
  const candidates = useMemo(
    () => [bannerImage, ...stageItems.map(i => i.image)]
      .filter((s): s is string => typeof s === 'string' && !!s.trim())
      .slice(0, 4),
    [bannerImage, stageItems],
  );

  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // A different shop: start again rather than holding an index into a list
  // that no longer exists. Compared during render — an effect would show the
  // previous shop's photograph for a frame first.
  const signature = candidates.join('|');
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setIndex(0);
    setLoaded(false);
  }

  const src = candidates[index];
  // Nothing is displayed until the browser confirms it: a dead address costs
  // the photograph, never the hero.
  const backdrop = loaded ? src : undefined;

  /** A qualifying line, built only from things the shop actually has. */
  const eyebrow = [
    productCount > 0 && `${productCount} item${productCount === 1 ? '' : 's'} in stock`,
    categoryCount > 1 && `${categoryCount} categories`,
    deliveryEstimate?.trim(),
  ].filter(Boolean).join(' · ');

  return (
    <section className="store-hero-band store-hero-editorial">
      {/* The shop's colour on near-black, always. Everything else sits over it,
          so a slow, blocked or missing photograph leaves a composed band. */}
      <div aria-hidden className="absolute inset-0 store-ink-panel" />
      <div aria-hidden className="absolute inset-0 store-hero-bloom" />

      {/* The loader. Invisible, and the only way a picture gets in. */}
      {src && !loaded && (
        <img
          aria-hidden
          src={src}
          alt=""
          className="hidden"
          onLoad={() => setLoaded(true)}
          onError={() => setIndex(i => i + 1)}
          // A cached picture can already be complete before React attaches
          // onLoad, and then it never fires — on a return visit, when
          // everything is cached. The ref asks the element at commit.
          ref={el => { if (el?.complete && el.naturalWidth > 0) setLoaded(true); }}
        />
      )}

      {backdrop && (
        <img
          aria-hidden
          src={backdrop}
          alt=""
          className="absolute inset-0 w-full h-full object-cover store-hero-photo"
        />
      )}

      {/* Pushed back far enough that any photograph works underneath any
          headline. See store-hero-scrim for what each layer is doing. */}
      <div aria-hidden className="absolute inset-0 store-hero-scrim" />

      {/* No logo here. It sits in the header directly above, and a mark
          repeated twice within a hundred pixels of itself is not branding —
          it reads as the page having started over. The hero's job is the
          shop's words, not its name a second time. */}
      <div className="relative max-w-3xl mx-auto px-6 py-20 sm:py-28 text-center flex flex-col items-center">
        {eyebrow && <p className="store-hero-eyebrow">{eyebrow}</p>}

        {/* The shop's own words if it wrote any, its name if not. The name is
            the right default — it is always true and always specific — but a
            shop selling a season or an offer should be able to say that
            instead of repeating what the navigation already says. */}
        <h1 className="store-hero-display mt-5">{heroHeadline?.trim() || businessName}</h1>

        <p className="mt-6 max-w-lg text-sm sm:text-base text-white/75 leading-relaxed store-hero-sub">
          {tagline?.trim() || DEFAULT_HERO_MESSAGE}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onShop} className="store-btn-outline">
            Start shopping
          </button>
          {onSecondary && secondaryLabel && (
            <button type="button" onClick={onSecondary} className="store-btn-outline">
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
