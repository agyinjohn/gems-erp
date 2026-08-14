'use client';

/**
 * A tile for a product with no photograph.
 *
 * Most shops on GEMS will never have studio photography, and the honest
 * consequence used to be a storefront of identical grey boxes with a faint
 * parcel icon in the middle — which reads as broken rather than as a shop.
 *
 * So each photoless product gets its own picture, drawn from its name. The name
 * is hashed into a hue, a pattern and an angle, which means the tile is stable
 * (the same product looks the same on every visit and every device), distinct
 * (two products beside each other rarely collide) and free — no upload, no
 * request, no bytes over a Ghanaian mobile connection.
 *
 * The hue is pulled toward the shop's own colour rather than picked from the
 * whole wheel, so a wall of these still looks like one shop's wall.
 */

/**
 * Stable, well-spread, and the same on the server as in the browser.
 *
 * Coerced rather than trusted. This draws every product tile in every shop, so
 * one caller handing it something that is not a string must not be able to
 * take a storefront down — which is exactly what happened when the categories
 * endpoint turned out to return records rather than names.
 */
function hashOf(text: unknown) {
  let hash = 0;
  const key = String(text ?? '').trim().toLowerCase();
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash;
}

const PATTERNS = ['arcs', 'grid', 'waves', 'burst', 'tiles'] as const;
type Pattern = typeof PATTERNS[number];

interface Props {
  /** What the picture is drawn from. */
  name: unknown;
  /** Steers the palette toward the shop's colour. */
  seedHue?: number;
  className?: string;
}

export default function GeneratedArt({ name, seedHue, className = '' }: Props) {
  const label = String(name ?? '').trim();
  const hash = hashOf(label);

  // Within 50° of the shop's hue: related, never uniform. Without a shop hue,
  // the whole wheel is fair game.
  const spread = seedHue === undefined ? 360 : 100;
  const base = seedHue === undefined ? 0 : seedHue - spread / 2;
  const hue = Math.round((base + (hash % spread) + 360) % 360);
  const hue2 = (hue + 24 + (hash >> 5) % 40) % 360;

  const pattern: Pattern = PATTERNS[(hash >> 3) % PATTERNS.length];
  const angle = 20 + ((hash >> 7) % 5) * 25;

  const light = `hsl(${hue} 62% 93%)`;
  const mid = `hsl(${hue2} 55% 82%)`;
  const ink = `hsl(${hue} 45% 55%)`;
  // Stable per product, so the pattern does not shift between renders.
  const id = `art-${hash.toString(36)}`;

  return (
    <svg
      viewBox="0 0 120 90"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label=""
      className={`w-full h-full ${className}`}
    >
      <defs>
        <linearGradient id={`${id}-bg`} gradientTransform={`rotate(${angle})`}>
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={mid} />
        </linearGradient>
      </defs>

      <rect width="120" height="90" fill={`url(#${id}-bg)`} />

      <g fill="none" stroke={ink} strokeOpacity="0.34" strokeWidth="1.4">
        {pattern === 'arcs' && [18, 30, 42, 54, 66].map((r, i) => (
          <circle key={i} cx={96} cy={78} r={r} />
        ))}

        {pattern === 'grid' && (
          <>
            {[0, 1, 2, 3, 4, 5].map(i => <line key={`v${i}`} x1={20 * i} y1="0" x2={20 * i} y2="90" />)}
            {[0, 1, 2, 3, 4].map(i => <line key={`h${i}`} x1="0" y1={22 * i} x2="120" y2={22 * i} />)}
          </>
        )}

        {pattern === 'waves' && [16, 34, 52, 70].map((y, i) => (
          <path key={i} d={`M-10 ${y} q 20 -14 40 0 t 40 0 t 40 0 t 40 0`} />
        ))}

        {pattern === 'burst' && [0, 30, 60, 90, 120, 150].map((a, i) => (
          <line key={i} x1="60" y1="45" x2={60 + 90 * Math.cos((a * Math.PI) / 180)} y2={45 + 90 * Math.sin((a * Math.PI) / 180)} />
        ))}

        {pattern === 'tiles' && [0, 1, 2, 3].flatMap(row => [0, 1, 2, 3, 4].map(col => (
          <rect key={`${row}-${col}`} x={6 + col * 24} y={4 + row * 22} width="16" height="14" rx="3" />
        )))}
      </g>

      {/* The initial, so a shelf of these is still readable as products. */}
      <text
        x="60" y="45"
        textAnchor="middle" dominantBaseline="central"
        fontSize="34" fontWeight="700"
        fill={ink} fillOpacity="0.5"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {(label || '?').charAt(0).toUpperCase()}
      </text>
    </svg>
  );
}
