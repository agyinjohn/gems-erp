'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatGhs } from './theme';

/**
 * The goods, lit.
 *
 * Not framed. A photograph in a rounded rectangle reads as a card in a user
 * interface — the corner radius is the giveaway, because nothing in a
 * photograph has one — and no amount of shadow or hairline fixes that. What
 * the reference designs are actually doing is floating a cut-out product in
 * light, with no edge anywhere.
 *
 * A shop on GEMS uploads rectangular photographs, not cut-outs on transparent
 * backgrounds, so that exact trick is not available. Feathering is: the picture
 * is masked with a soft ellipse so it has no edge at all, and dissolves into
 * the panel instead of sitting on it. The result is closer to the intent than a
 * frame ever was, and it works with whatever a shop happens to upload.
 *
 * Around it, an arc rather than a ring. A complete circle reads as a border
 * somebody forgot to remove; an arc reads as light travelling.
 *
 * The rule the rest of this storefront follows still applies: a picture is
 * mounted invisibly and only reaches the stage once the browser confirms it
 * loaded. A shop with no photographs gets its goods set as type in the same
 * light, which is a composition rather than a placeholder.
 */

/** How long each product holds before the next comes forward. */
const HOLD_MS = 5000;

export interface StageItem {
  image?: string;
  name: string;
  price?: number;
}

interface Props {
  items?: StageItem[];
  seedHue?: number;
  /** Smaller panels — the promo banner — drop the caption and the ticks. */
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
   * What the stage turns through. Photographs when there are any, otherwise the
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
    <div className="relative w-full aspect-square sm:aspect-[5/4] select-none">
      {/* Loaders. Invisible, and the only way onto the stage. */}
      <div aria-hidden className="hidden">
        {live.map((s, i) => (
          <img
            key={s.image}
            src={s.image}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            // A cached picture can already be complete by the time React
            // attaches onLoad, and then that event never fires and the stage
            // sits on the fallback for the whole visit — on a return visit,
            // which is when everything is cached. The ref runs at commit and
            // asks the element directly.
            ref={el => { if (el?.complete && el.naturalWidth > 0) markReady(s.image!); }}
            onLoad={() => markReady(s.image!)}
            onError={() => setDead(d => (d.includes(s.image!) ? d : [...d, s.image!]))}
          />
        ))}
      </div>

      {/* The light it stands in. */}
      <div aria-hidden className="absolute inset-[6%] rounded-full store-stage-glow" />

      {/* Arcs, not a ring: a closed circle reads as a stray border, an open one
          reads as light travelling around the thing in the middle. */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="absolute inset-0 w-full h-full overflow-visible store-stage-arcs"
      >
        <circle
          cx="100" cy="100" r="88"
          fill="none"
          stroke="var(--store-brand-on-ink)"
          strokeWidth="0.9"
          strokeOpacity="0.55"
          strokeLinecap="round"
          strokeDasharray="300 253"
          transform="rotate(-115 100 100)"
        />
        <circle
          cx="100" cy="100" r="72"
          fill="none"
          stroke="var(--store-brand-on-ink)"
          strokeWidth="0.6"
          strokeOpacity="0.28"
          strokeLinecap="round"
          strokeDasharray="120 332"
          transform="rotate(58 100 100)"
        />
      </svg>

      {hasPhoto ? (
        /* The picture, with no edge anywhere — masked to nothing before it
           reaches a boundary, so there is no shape to read as a card. */
        <div className="absolute inset-[4%] store-stage-feather">
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
        </div>
      ) : (
        /* No photography. The goods set as type, in the same light. */
        <div className="absolute inset-[16%] flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] store-ink-accent">In stock</p>
          <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white leading-[1.1] text-balance line-clamp-3">
            {shown?.name}
          </p>
          {typeof shown?.price === 'number' && shown.price > 0 && (
            <p className="mt-2 text-lg font-bold text-white/55 tabular-nums">{formatGhs(shown.price)}</p>
          )}
        </div>
      )}

      {/* What is in the light, and what it costs. Plain type under a short rule
          rather than a glass card — a card here would put back exactly the
          boxed-in look the feathering removes. Only alongside a photograph;
          without one the middle of the stage already says both, larger. */}
      {!compact && hasPhoto && shown?.name && (
        <div className="absolute left-0 bottom-0 max-w-[70%]">
          <span aria-hidden className="block h-px w-9 mb-3 store-stage-rule" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">In stock</p>
          <p className="mt-1 text-base font-bold text-white truncate">{shown.name}</p>
          {typeof shown.price === 'number' && shown.price > 0 && (
            <p className="text-sm font-semibold text-white/55 tabular-nums">{formatGhs(shown.price)}</p>
          )}
        </div>
      )}

      {/* Where you are in the set — a row of rules rather than dots, to sit
          with the arcs rather than argue with them. Laid out across: stacked,
          three hairlines one above another read as a menu icon rather than as
          a scale. */}
      {!compact && slots.length > 1 && (
        <div className="absolute right-0 bottom-1 flex items-center gap-2 z-10">
          {slots.map((s, i) => (
            <button
              key={`${s.image || s.name}-${i}`}
              type="button"
              onClick={() => setFront(i)}
              aria-label={`Show item ${i + 1}`}
              className="py-2 group/tick"
            >
              <span
                className={`block h-px transition-all duration-300 ${
                  i === front % slots.length ? 'w-8 bg-white' : 'w-4 bg-white/30 group-hover/tick:bg-white/60'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
