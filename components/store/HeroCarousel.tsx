'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * The pictures behind the hero, changing slowly.
 *
 * Three sources, in the order a shop would want them:
 *
 *   1. Their own banner, if they set one. Nothing overrides a deliberate choice.
 *   2. Their own product photographs. This is the good one — real pictures of
 *      the actual goods, already loading on the page, already paid for. A shop
 *      selling fabric ends up with a hero of its own fabric rather than a stock
 *      photograph of somebody else's shop, which is both more honest and better
 *      looking.
 *   3. A small set of stock photographs, for a shop with nothing uploaded yet,
 *      so day one does not look like a broken page.
 *
 * Every slide has to prove itself before it is shown: it is mounted invisibly,
 * and only joins the rotation once the browser says it loaded. Anything that
 * 404s, times out or is blocked is dropped and never seen. The brand-colour
 * surface stays underneath throughout, so the worst case is exactly the hero
 * that was there before — no blank frames, no broken-image icons, no flash.
 */

/**
 * Stock photographs for an empty shop.
 *
 * Unsplash, whose licence permits this and whose CDN is built for it. Left
 * deliberately generic — market stalls, workbenches, parcels — because they
 * stand in for any trade, and any shop that cares will have replaced them with
 * its own within a week.
 *
 * Note: these could not be checked from where this was written; the network
 * there refuses those hosts. That is precisely why nothing is displayed until
 * it has loaded — a wrong address costs a slide, not a storefront.
 */
export const STOCK_SLIDES = [
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=70',
  'https://images.unsplash.com/photo-1567696911980-2eed69a46042?auto=format&fit=crop&w=1600&q=70',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=70',
  'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=1600&q=70',
];

/** How long each picture holds before the next one comes up. */
const HOLD_MS = 6000;

interface Props {
  /** The shop's own banner. Wins over everything. */
  banner?: string;
  /** Their product photographs, best first. */
  productImages?: string[];
  /** Whether to fall back to stock when the shop has no pictures of its own. */
  allowStock?: boolean;
}

export default function HeroCarousel({ banner, productImages = [], allowStock = true }: Props) {
  const slides = useMemo(() => {
    if (banner) return [banner];
    const own = [...new Set(productImages.filter(Boolean))].slice(0, 5);
    if (own.length) return own;
    return allowStock ? STOCK_SLIDES : [];
  }, [banner, productImages, allowStock]);

  // Only what the browser has actually fetched.
  const [ready, setReady] = useState<string[]>([]);
  const [dead, setDead] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // A new shop, or a new banner: start again rather than holding an index into
  // a set that no longer exists. Adjusted during render rather than in an
  // effect — an effect would paint the old pictures once first, and would spend
  // a second render doing it.
  const signature = slides.join('|');
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setReady([]);
    setDead([]);
    setCurrent(0);
  }

  useEffect(() => {
    if (ready.length < 2) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const tick = () => setCurrent(i => (i + 1) % ready.length);
    const start = () => { stop(); timer.current = setInterval(tick, HOLD_MS); };
    const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };

    // Nothing turns over in a tab nobody is looking at — it costs a phone
    // battery and a data bundle to animate to an empty room.
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [ready.length]);

  if (!slides.length) return null;

  const live = slides.filter(s => !dead.includes(s));
  const shown = ready[current % Math.max(ready.length, 1)];

  return (
    <>
      {/* Loaders. Invisible, and the only way into `ready`. */}
      <div aria-hidden className="hidden">
        {live.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            // The first one matters for how quickly the page looks finished;
            // the rest can wait until the browser is otherwise idle.
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setReady(r => (r.includes(src) ? r : [...r, src]))}
            onError={() => setDead(d => (d.includes(src) ? d : [...d, src]))}
          />
        ))}
      </div>

      {shown && (
        <>
          {ready.map(src => (
            <img
              key={src}
              src={src}
              alt=""
              aria-hidden
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
                src === shown ? 'opacity-100 store-drift' : 'opacity-0'
              }`}
            />
          ))}
          {/* Enough darkness for white text to hold over any photograph. */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />
        </>
      )}

      {/* Where you are in the set. Only worth showing when there is a set. */}
      {ready.length > 1 && (
        <div className="absolute bottom-4 right-5 z-10 flex items-center gap-1.5">
          {ready.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Show picture ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current % ready.length ? 'w-6 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
