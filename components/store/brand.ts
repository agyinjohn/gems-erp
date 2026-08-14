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

/** The hue on the colour wheel, for steering drawn product tiles. */
export function hueOf(hex: string): number {
  const { r, g, b } = toRgb(/^#[0-9a-fA-F]{6}$/.test(hex || '') ? hex : GEMS_NAVY);
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  if (max === min) return 0;
  const d = max - min;
  const h = max === rr
    ? ((gg - bb) / d + (gg < bb ? 6 : 0))
    : max === gg
      ? (bb - rr) / d + 2
      : (rr - gg) / d + 4;
  return Math.round(h * 60);
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
  };
}
