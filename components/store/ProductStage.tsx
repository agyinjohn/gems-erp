'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatGhs } from './theme';

/**
 * One product, lit and standing on something.
 *
 * It used to be three tiles arranged around each other. Three small pictures of
 * a shop's goods is three small pictures — none big enough to want anything,
 * and at a glance they read as a stack of coloured cards rather than as things
 * for sale. One frame, most of the panel, is the whole idea: the photograph
 * gets to be a photograph.
 *
 * What the three tiles were doing — showing there is more than one thing here —
 * is done better by rotating through the shop's goods in that single frame,
 * with the name and price of whatever is currently in it. That is a real
 * product at a real price rather than decoration.
 *
 * The two states are deliberately different rather than one degrading into the
 * other. With photographs, the picture fills the frame and the caption floats
 * at its corner. With none, the frame becomes the caption: the product's name
 * and price set large on a dark tinted panel. The drawn tiles used elsewhere
 * are built for a 120px card, and blown up to fill a hero they are a pale slab
 * with an enormous letter on it — worse than the plain page they replaced.
 */

/** How long each product holds before the next one comes forward. */
const HOLD_MS = 5000;

export interface StageItem {
  image?: string;
  name: string;
  price?: number;
}

interface Props {
  items?: StageItem[];
  seedHue?: number;
  /** Smaller panels — the promo banner — skip the caption and the dots. */
  compact?: boolean;
}

export default function ProductStage({ items = [], compact = false }: Props) {
  // One entry per picture, best first, deduplicated by address so a shop that
  // uploaded six angles of one thing does not get six turns of the same thing.
  const shots = useMemo(() => {
    const seenSrc = new Set<string>();
    return items
      .filter(i => i.image && !seenSrc.has(i.image) && seenSrc.add(i.image))
      .slice(0, 6);
  }, [items]);

  const [ready, setReady] = useState<string[]>([]);
  const [dead, setDead] = useState<string[]>([]);
  const [front, setFront] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // A different shop, or new goods: start again rather than holding an index
  // into a list that no longer exists. Compared during render, because an
  // effect would paint the previous shop's product for a frame first.
  const signature = items.map(i => `${i.image || ''}:${i.name}`).join('|');
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setReady([]);
    setDead([]);
    setFront(0);
  }

  const markReady = (src: string) => setReady(r => (r.includes(src) ? r : [...r, src]));
  const live = shots.filter(s => !dead.includes(s.image!));

  /**
   * What the frame turns through. Photographs when there are any, otherwise the
   * products themselves — a shop with no photography still has goods worth
   * naming, and standing on one name forever would waste the panel.
   */
  const slots: StageItem[] = ready.length
    ? ready.map(src => shots.find(s => s.image === src)!).filter(Boolean)
    : items.slice(0, 4);

  const shown = slots.length ? slots[front % slots.length] : undefined;
  const hasPhoto = Boolean(shown?.image && ready.includes(shown.image));

  useEffect(() => {
    if (slots.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
    const tick = () => setFront(i => (i + 1) % slots.length);
    const start = () => { stop(); timer.current = setInterval(tick, HOLD_MS); };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [slots.length]);

  if (!slots.length) return null;

  return (
    <div className="relative w-full aspect-[4/3] select-none">
      {/* Loaders. Invisible, and the only way into the frame. */}
      <div aria-hidden className="hidden">
        {live.map((s, i) => (
          <img
            key={s.image}
            src={s.image}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            // A cached picture can already be complete by the time React
            // attaches onLoad, and then that event never fires and the frame
            // sits on the fallback for the whole visit — on a return visit,
            // which is when everything is cached, so it would have been the
            // common case rather than the rare one. The ref runs at commit and
            // asks the element directly.
            ref={el => { if (el?.complete && el.naturalWidth > 0) markReady(s.image!); }}
            onLoad={() => markReady(s.image!)}
            onError={() => setDead(d => (d.includes(s.image!) ? d : [...d, s.image!]))}
          />
        ))}
      </div>

      {/* The light behind it. */}
      <div aria-hidden className="absolute inset-[2%] rounded-full store-stage-glow" />
      <div aria-hidden className="absolute inset-[6%] rounded-full store-stage-ring" />

      {/* The frame. One thing, as large as the panel allows. */}
      <div className="store-stage-frame absolute inset-[11%] rounded-[1.75rem] overflow-hidden">
        {hasPhoto ? (
          <>
            {ready.map(src => (
              <img
                key={src}
                src={src}
                alt=""
                aria-hidden
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-in-out ${
                  src === shown?.image ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            {/* Light falling across the top-left, so the frame reads as lit
                rather than pasted on. Faint by design — it sits over somebody
                else's photograph. */}
            <div aria-hidden className="absolute inset-0 store-stage-gloss" />
          </>
        ) : (
          /* No photography. The frame becomes the product. */
          <div className="store-stage-blank absolute inset-0 flex flex-col justify-end p-6 sm:p-7">
            <div aria-hidden className="absolute inset-0 store-stage-gloss" />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.16em] store-ink-accent">
              In stock
            </p>
            <p className="relative mt-2 text-xl sm:text-2xl font-extrabold text-white leading-tight text-balance line-clamp-3">
              {shown?.name}
            </p>
            {typeof shown?.price === 'number' && shown.price > 0 && (
              <p className="relative mt-1.5 text-lg font-bold text-white/70 tabular-nums">
                {formatGhs(shown.price)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* What is in the frame, and what it costs. Only alongside a photograph —
          without one the frame already says both, larger. */}
      {!compact && hasPhoto && shown?.name && (
        <div className="store-stage-caption absolute left-[4%] bottom-[12%] max-w-[62%]">
          <p className="text-[11px] font-semibold text-white/60 truncate">{shown.name}</p>
          {typeof shown.price === 'number' && shown.price > 0 && (
            <p className="text-base font-extrabold text-white tabular-nums leading-tight">
              {formatGhs(shown.price)}
            </p>
          )}
        </div>
      )}

      {/* Where you are in the set. Only worth drawing when there is a set. */}
      {!compact && slots.length > 1 && (
        <div className="absolute right-[6%] bottom-[13%] flex items-center gap-1.5 z-10">
          {slots.map((s, i) => (
            <button
              key={`${s.image || s.name}-${i}`}
              type="button"
              onClick={() => setFront(i)}
              aria-label={`Show item ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === front % slots.length ? 'w-5 bg-white' : 'w-1.5 bg-white/35 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* What it stands on. */}
      <div aria-hidden className="absolute left-[14%] right-[14%] bottom-[3%] h-[8%] rounded-[50%] store-stage-plinth" />
    </div>
  );
}
