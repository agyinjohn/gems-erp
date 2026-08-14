/**
 * A shop's own colour, and everything the storefront needs derived from it.
 *
 * One colour is the whole input. A shop owner who is given six pickers uses
 * six, and no two of them agree; a shop owner given one gets a storefront that
 * looks composed whatever they choose. The hover shade, the deep end of the
 * hero gradient, the tint behind a badge and — importantly — whether text on
 * the colour should be white or near-black are all worked out from it.
 *
 * Everything lands as CSS custom properties on the store shell, so the
 * stylesheet keeps saying var(--store-brand) and no component has to know a
 * tenant exists.
 */

/** What every storefront looked like before shops could choose. */
export const GEMS_NAVY = '#0d3b6e';

type Rgb = { r: number; g: number; b: number };

function toRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Toward white at 1, toward black at -1. */
const shift = (hex: string, amount: number) => {
  const { r, g, b } = toRgb(hex);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex({
    r: r + (target - r) * t,
    g: g + (target - g) * t,
    b: b + (target - b) * t,
  });
};

/**
 * Hue, saturation and lightness, all 0–1 except hue in degrees.
 *
 * Needed because some adjustments only make sense in this space: making a
 * colour brighter without making it greyer is a change in lightness, and there
 * is no way to express that by mixing in white.
 */
function toHsl(hex: string) {
  const { r, g, b } = toRgb(hex);
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rr
    ? ((gg - bb) / d + (gg < bb ? 6 : 0))
    : max === gg
      ? (bb - rr) / d + 2
      : (rr - gg) / d + 4;
  return { h: h * 60, s, l };
}

function fromHsl(h: number, s: number, l: number) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return toHex({ r: v, g: v, b: v });
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const hn = (((h % 360) + 360) % 360) / 360;
  return toHex({
    r: channel(hn + 1 / 3) * 255,
    g: channel(hn) * 255,
    b: channel(hn - 1 / 3) * 255,
  });
}

/** Relative luminance, the sRGB way — green carries far more apparent
 *  brightness than blue, so averaging the channels is not good enough. */
function luminance(hex: string) {
  const { r, g, b } = toRgb(hex);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Whether a colour reads as light. Used to decide which way hover moves. */
export function isLight(hex: string) {
  return luminance(hex) > 0.45;
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Near-black rather than pure, which is softer against a saturated colour. */
const INK = '#111827';

/**
 * What to write on the shop's colour.
 *
 * Measured rather than guessed. A brightness threshold gets the obvious cases
 * right and the middle wrong: a mid green or a mid red sits just under the
 * line, takes white by the rule, and lands at about 2:1 — legible on a monitor
 * in an office, not on a phone in Ghanaian sunshine. Trying both and keeping
 * the better one costs two multiplications and is right every time.
 */
export function inkOn(hex: string) {
  return contrast(hex, '#ffffff') >= contrast(hex, INK) ? '#ffffff' : INK;
}

/**
 * The near-black the storefront's dark surfaces are painted in.
 *
 * Fixed rather than derived from the shop's colour. A shop that picks yellow
 * should get yellow accents on near-black, not a yellow wall — the surface is
 * the same everywhere, and the shop's colour is what lands on it.
 */
export const STORE_INK = '#0a0e14';

/**
 * The shop's colour, lifted until it can be read on the dark shell.
 *
 * Necessary because the two halves of this design pull in opposite directions.
 * The shell is near-black; the default shop colour is a deep navy. Painted
 * straight onto the ink, that navy sits at about 1.5:1 — an eyebrow set in it
 * is a rumour, and the whole point of putting the shop's colour on the hero is
 * that somebody can see it.
 *
 * So it is walked toward white until it clears 4.5:1, and no further. A shop
 * whose colour is already bright — an amber, a lime — clears on the first
 * check and is returned untouched, which matters: lifting a colour that did
 * not need it would wash out exactly the shops that chose the boldest.
 *
 * This is for accent *text* on the ink — the eyebrow, the second line of the
 * headline, a link. It is deliberately not what fills the primary button: a
 * single colour cannot do both jobs, because clearing 4.5:1 against near-black
 * needs a relative luminance of at least 0.195 and carrying white text needs
 * at most 0.183, and there is no colour in that gap. So the button keeps the
 * shop's actual colour with --store-on-brand on top, which is already measured
 * both ways, and gets a hairline edge so it still reads as a button on a dark
 * ground. Only the text accent is lifted.
 *
 * The walk is through lightness in HSL rather than a slide toward white, which
 * matters more than it sounds: mixing white into a navy desaturates it to a
 * slate — #6c87a8, the colour of a disabled control — while raising its
 * lightness gives the vivid blue the shop actually chose, just bright enough
 * to read. Hue and saturation are carried through untouched.
 */
const READABLE = 4.5;

export function brandOnInk(hex: string) {
  const brand = /^#[0-9a-fA-F]{6}$/.test(String(hex || '')) ? String(hex).toLowerCase() : GEMS_NAVY;
  const { h, s, l } = toHsl(brand);

  // Step zero is the colour itself, so anything already bright is returned
  // untouched. Twenty steps of 5% reaches white from black, and white clears
  // this ink at 19:1, so the walk always terminates on something legible.
  let lifted = brand;
  for (let step = 0; step < 20; step++) {
    lifted = fromHsl(h, s, Math.min(1, l + step * 0.05));
    if (contrast(lifted, STORE_INK) >= READABLE) break;
  }
  return lifted;
}

/**
 * The same idea pointed the other way: the shop's colour darkened until it can
 * be read on a white card.
 *
 * The storefront is not all dark. Section eyebrows, the trust icons and the
 * active states in the filter menu all put the shop's colour on white, and a
 * shop that picked amber got #fbbf24 on #ffffff — about 1.6:1, which is a
 * label nobody can read. Deep colours pass on the first check and come back
 * untouched, so this only ever fires for the bright ones.
 */
export function brandOnPaper(hex: string) {
  const brand = /^#[0-9a-fA-F]{6}$/.test(String(hex || '')) ? String(hex).toLowerCase() : GEMS_NAVY;
  const { h, s, l } = toHsl(brand);

  let dimmed = brand;
  for (let step = 0; step < 20; step++) {
    dimmed = fromHsl(h, s, Math.max(0, l - step * 0.05));
    if (contrast(dimmed, '#ffffff') >= READABLE) break;
  }
  return dimmed;
}

/** The hue on the colour wheel, for steering drawn product tiles. */
export function hueOf(hex: string): number {
  return Math.round(toHsl(/^#[0-9a-fA-F]{6}$/.test(hex || '') ? hex : GEMS_NAVY).h);
}

/**
 * Custom properties, typed so they can be handed straight to a style prop —
 * React accepts them at runtime but CSSProperties does not admit to knowing
 * about anything beginning with two dashes.
 */
export type BrandVars = React.CSSProperties & Record<`--${string}`, string>;

/** The custom properties for one shop's colour. */
export function brandVars(color?: string): BrandVars {
  const brand = /^#[0-9a-fA-F]{6}$/.test(String(color || '')) ? String(color).toLowerCase() : GEMS_NAVY;
  return {
    '--store-brand': brand,
    // The far end of the hero gradient, and the pressed state of a button.
    '--store-brand-deep': shift(brand, -0.35),
    // Hover: a brand this dark has nowhere to go but lighter, and vice versa.
    '--store-brand-lift': isLight(brand) ? shift(brand, -0.15) : shift(brand, 0.18),
    // Behind a badge or an active pill.
    '--store-brand-soft': shift(brand, 0.82),
    // The barely-there page wash.
    '--store-brand-wash': shift(brand, 0.95),
    // Readable on the brand colour itself, whichever way that falls.
    '--store-on-brand': inkOn(brand),
    // The dark shell the hero and promo banner sit on, and the shop's colour
    // lifted far enough to be read as text against it.
    '--store-ink': STORE_INK,
    '--store-brand-on-ink': brandOnInk(brand),
    // And the same colour darkened, for the places it lands on white.
    '--store-brand-on-paper': brandOnPaper(brand),
  };
}
