'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import GeneratedArt from './GeneratedArt';

/**
 * The goods, lit and standing on something.
 *
 * The hero used to put a photograph behind the text and darken it until the
 * text was readable, which is a compromise that costs both: the words sit on a
 * muddy field and the photograph is buried under a scrim. Staging the products
 * instead — glow, plinth, shadow, nothing over them — lets the copy keep a
 * clean dark ground on the left and lets the pictures be pictures on the right.
 *
 * The same rule as everywhere else on this storefront applies: a picture is
 * mounted invisibly first and only joins the stage once the browser confirms it
 * loaded. A shop with no usable photographs gets drawn tiles rather than a gap,
 * so the stage is never empty and never shows a broken-image icon.
 */

/** How long the front item holds before the next photograph takes its place. */
const HOLD_MS = 5000;

interface Props {
  /** The shop's product photographs, best first. */
  images?: string[];
  /** Seeds the drawn tiles when there are no photographs. */
  names?: string[];
  seedHue?: number;
}

export default function ProductStage({ images = [], names = [], seedHue }: Props) {
  const candidates = useMemo(
    () => [...new Set(images.filter(Boolean))].slice(0, 6),
    [images],
  );

  const [ready, setReady] = useState<string[]>([]);
  const [dead, setDead] = useState<string[]>([]);
  const [front, setFront] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // A different shop, or a new set of goods: start again rather than holding an
  // index into a list that no longer exists. Compared during render, because an
  // effect would paint the previous shop's products for a frame first.
  const signature = candidates.join('|');
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setReady([]);
    setDead([]);
    setFront(0);
  }

  useEffect(() => {
    if (ready.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const tick = () => setFront(i => (i + 1) % ready.length);
    const start = () => { stop(); timer.current = setInterval(tick, HOLD_MS); };
    const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [ready.length]);

  const live = candidates.filter(s => !dead.includes(s));
  // The two behind the front one, so the stage has depth rather than one
  // floating rectangle. Drawn from what actually loaded, and skipping whatever
  // is currently at the front.
  const supporting = ready.filter((_, i) => i !== front % Math.max(ready.length, 1)).slice(0, 2);
  const hero = ready[front % Math.max(ready.length, 1)];

  /** Names for the drawn tiles, padded so the stage always has three. */
  const drawn = [...names, 'Products', 'In stock', 'New in'].slice(0, 3);

  return (
    <div className="relative w-full aspect-[4/3] select-none">
      {/* Loaders. Invisible, and the only way onto the stage. */}
      <div aria-hidden className="hidden">
        {live.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setReady(r => (r.includes(src) ? r : [...r, src]))}
            onError={() => setDead(d => (d.includes(src) ? d : [...d, src]))}
          />
        ))}
      </div>

      {/* The light behind everything. */}
      <div aria-hidden className="absolute inset-[6%] rounded-full store-stage-glow" />
      <div aria-hidden className="absolute inset-[10%] rounded-full store-stage-ring" />

      {hero ? (
        <>
          {/* The two behind, offset and smaller. */}
          {supporting.map((src, i) => (
            <div
              key={src}
              aria-hidden
              className={`store-stage-item w-[25%] aspect-square rounded-2xl ${
                i === 0 ? 'left-[3%] top-[11%]' : 'right-[3%] bottom-[13%]'
              }`}
              style={{ animationDelay: `${(i + 1) * 1.4}s` }}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </div>
          ))}

          {/* The one in front. */}
          <div className="store-stage-item inset-x-[30%] inset-y-[15%] rounded-3xl">
            {ready.map(src => (
              <img
                key={src}
                src={src}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                  src === hero ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        </>
      ) : (
        /* Nothing photographed yet. Three drawn tiles, arranged the same way,
           so an empty shop still has a composed stage rather than a hole. */
        <>
          <div aria-hidden className="store-stage-item left-[3%] top-[11%] w-[25%] aspect-square rounded-2xl">
            <GeneratedArt name={drawn[1]} seedHue={seedHue} />
          </div>
          <div aria-hidden className="store-stage-item right-[3%] bottom-[13%] w-[25%] aspect-square rounded-2xl" style={{ animationDelay: '2.8s' }}>
            <GeneratedArt name={drawn[2]} seedHue={seedHue} />
          </div>
          <div aria-hidden className="store-stage-item inset-x-[30%] inset-y-[15%] rounded-3xl" style={{ animationDelay: '1.4s' }}>
            <GeneratedArt name={drawn[0]} seedHue={seedHue} />
          </div>
        </>
      )}

      {/* What they are standing on. */}
      <div aria-hidden className="absolute left-[12%] right-[12%] bottom-[4%] h-[9%] rounded-[50%] store-stage-plinth" />
    </div>
  );
}
