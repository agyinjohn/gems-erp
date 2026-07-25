'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, ArrowRight, ArrowUpRight, ShieldCheck, Wallet, Store, Package, Sparkles, Truck,
} from 'lucide-react';
import { publicApi } from '@/lib/api';
import Reveal from '@/components/landing/Reveal';

interface Shop {
  id: string;
  business_name: string;
  slug: string;
  logo: string;
  announcement: string;
  product_count: number;
  sample_images: string[];
  categories: string[];
}

/* ── Decorative photography ───────────────────────────────────────────────────
 * Editorial imagery only. These are never used to stand in for a specific
 * shop's goods — shop cards always show that shop's own product photos, or a
 * branded initials tile when it has none. Every photo on this page renders
 * through <Photo>, which swaps in styled CSS art if a URL fails to load, so a
 * dead link degrades gracefully instead of leaving a hole.
 * Swap any URL below to restyle the page's decorative imagery.
 */
const STOCK = {
  heroTall: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=700&q=80',
  heroWide: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=700&q=80',
  heroSmall: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=500&q=80',
  band: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80',
  seller: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
};

const CATEGORY_IMAGES: { match: string[]; url: string }[] = [
  { match: ['food', 'grocer', 'pantry', 'snack', 'bak', 'kitchen', 'spice'], url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80' },
  { match: ['fashion', 'cloth', 'wear', 'apparel', 'textile', 'shirt', 'dress'], url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80' },
  { match: ['electronic', 'phone', 'computer', 'tech', 'gadget', 'laptop'], url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80' },
  { match: ['beauty', 'cosmetic', 'skin', 'hair', 'care', 'fragrance'], url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80' },
  { match: ['home', 'furnitur', 'decor', 'interior', 'household'], url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80' },
  { match: ['drink', 'beverage', 'juice', 'water', 'wine', 'coffee', 'tea'], url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80' },
  { match: ['jewel', 'gold', 'accessor', 'watch', 'bead'], url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=400&q=80' },
  { match: ['book', 'stationer', 'print', 'paper', 'craft', 'art'], url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=400&q=80' },
];

function categoryImage(name: string) {
  const n = name.toLowerCase();
  return CATEGORY_IMAGES.find((c) => c.match.some((m) => n.includes(m)))?.url;
}

function hashStr(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
}

const TILE_GRADIENTS = [
  'linear-gradient(135deg, #0D3B6E, #1a5f9e)',
  'linear-gradient(135deg, #1A5294, #2f80c4)',
  'linear-gradient(135deg, #123a5c, #26749f)',
  'linear-gradient(135deg, #0f2f52, #1f6fa8)',
];

function gradientFor(seed: string) {
  return TILE_GRADIENTS[hashStr(seed) % TILE_GRADIENTS.length];
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}

/** <img> that falls back to styled art when the source is missing or fails. */
function Photo({
  src, alt = '', className = '', fallback,
}: { src?: string; alt?: string; className?: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
  );
}

export default function MarketplacePage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    publicApi.get('/marketplace/shops')
      .then((r) => setShops(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const s of shops) for (const c of s.categories) seen.set(c, (seen.get(c) || 0) + 1);
    return Array.from(seen.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [shops]);

  const filtered = shops.filter((s) => {
    const matchesCat = cat === 'All' || s.categories.includes(cat);
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || s.business_name.toLowerCase().includes(q) || s.categories.some((c) => c.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  const totalProducts = useMemo(() => shops.reduce((sum, s) => sum + s.product_count, 0), [shops]);

  // Real product photos from live shops lead the hero collage; decorative
  // stock fills any remaining slots so the composition is never lopsided.
  // `shop` is only set for real photos, so only those get a credit label.
  const heroPhotos = useMemo(() => {
    const real: { src: string; shop: string }[] = [];
    outer: for (const s of shops) {
      for (const img of s.sample_images) {
        if (img && !real.some((r) => r.src === img)) real.push({ src: img, shop: s.business_name });
        if (real.length >= 3) break outer;
      }
    }
    return [
      real[0] || { src: STOCK.heroTall, shop: '' },
      real[1] || { src: STOCK.heroWide, shop: '' },
      real[2] || { src: STOCK.heroSmall, shop: '' },
    ];
  }, [shops]);

  // Type-ahead results for the hero search — ignores the category filter so
  // the box always searches the whole marketplace.
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return shops
      .filter((s) => s.business_name.toLowerCase().includes(q) || s.categories.some((c) => c.toLowerCase().includes(q)))
      .slice(0, 5);
  }, [shops, search]);

  return (
    <div className="min-h-dvh w-full" style={{ background: '#FBF9F6' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap');
        .mp-display { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; }
      `}</style>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-black/[0.06]" style={{ background: 'rgba(251,249,246,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-[68px] flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-[#0D3B6E] rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-gray-900 leading-tight">GEMS</div>
              <div className="text-[11px] text-gray-400 leading-tight">Marketplace</div>
            </div>
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 bg-[#0D3B6E] hover:bg-[#1A5294] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors flex-shrink-0"
          >
            List your shop
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-32 w-[34rem] h-[34rem] rounded-full animate-float-slower" style={{ background: 'radial-gradient(circle, rgba(13,59,110,0.07), transparent 68%)' }} />
          <div className="absolute top-10 -right-32 w-[30rem] h-[30rem] rounded-full animate-float-slow" style={{ background: 'radial-gradient(circle, rgba(217,164,65,0.13), transparent 68%)' }} />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(rgba(13,59,110,0.9) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24 grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-12 lg:gap-16 items-center">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0D3B6E] bg-[#0D3B6E]/[0.07] border border-[#0D3B6E]/10 px-3.5 py-1.5 rounded-full mb-6">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-[#0D3B6E]/60 animate-ping" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#0D3B6E]" />
                </span>
                A marketplace of local shops
              </span>
              <h1 className="mp-display text-[2.75rem] sm:text-6xl leading-[1.05] text-gray-900 mb-5">
                Every shop you love,<br />
                <span className="italic text-[#0D3B6E]">under one roof.</span>
              </h1>
              <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-9 max-w-md">
                Discover independent businesses selling on GEMS — browse their real shelves, pay securely, and buy straight from the people who made it.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="relative max-w-lg z-20">
                <Search className="w-[18px] h-[18px] absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search shops or categories"
                  className="w-full pl-[52px] pr-5 py-4 rounded-full border border-black/[0.08] bg-white text-[15px] text-gray-900 placeholder:text-gray-400 outline-none shadow-[0_4px_24px_rgba(13,59,110,0.07)] focus:ring-2 focus:ring-[#0D3B6E]/25 focus:border-[#0D3B6E]/40 transition-shadow"
                />

                {/* type-ahead results */}
                {searchFocused && search.trim() !== '' && (
                  // preventDefault keeps the input from blurring before the click lands
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute left-0 right-0 top-[calc(100%+0.6rem)] bg-white border border-black/[0.07] rounded-[1.25rem] shadow-[0_20px_50px_rgba(13,59,110,0.16)] overflow-hidden"
                  >
                    {suggestions.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">No shops match “{search.trim()}”.</p>
                    ) : (
                      suggestions.map((s) => (
                        <Link
                          key={s.id}
                          href={`/store/${s.slug}?ref=marketplace`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-black/[0.04] last:border-0"
                        >
                          <Photo
                            src={s.sample_images[0] || s.logo}
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                            fallback={
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: gradientFor(s.id) }}>
                                {initials(s.business_name)}
                              </div>
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-sm text-gray-900 truncate">{s.business_name}</span>
                            <span className="block text-xs text-gray-400 truncate">
                              {s.categories.slice(0, 2).join(' · ') || 'Shop'} · {s.product_count} item{s.product_count === 1 ? '' : 's'}
                            </span>
                          </span>
                          <ArrowUpRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* quick category jumps */}
              {!loading && categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-5">
                  <span className="text-xs text-gray-400 mr-0.5">Popular:</span>
                  {categories.slice(0, 4).map(([name]) => (
                    <button
                      key={name}
                      onClick={() => { setCat(name); setSearch(''); }}
                      className="text-xs font-semibold text-gray-600 bg-white border border-black/[0.07] hover:border-[#0D3B6E]/40 hover:text-[#0D3B6E] px-3 py-1.5 rounded-full transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              {/* live counts + shop avatars */}
              {!loading && shops.length > 0 && (
                <div className="flex items-center gap-3.5 mt-7">
                  <div className="flex -space-x-2.5">
                    {shops.slice(0, 4).map((s) => (
                      <Photo
                        key={s.id}
                        src={s.logo || s.sample_images[0]}
                        className="w-9 h-9 rounded-full object-cover ring-[3px] ring-[#FBF9F6]"
                        fallback={
                          <div className="w-9 h-9 rounded-full ring-[3px] ring-[#FBF9F6] flex items-center justify-center text-white text-[10px] font-bold" style={{ background: gradientFor(s.id) }}>
                            {initials(s.business_name)}
                          </div>
                        }
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    <span className="font-bold text-gray-900">{shops.length}</span> shop{shops.length === 1 ? '' : 's'} open
                    <span className="mx-1.5 text-gray-300">·</span>
                    <span className="font-bold text-gray-900">{totalProducts.toLocaleString()}</span> product{totalProducts === 1 ? '' : 's'}
                  </p>
                </div>
              )}
            </Reveal>
          </div>

          {/* editorial collage */}
          <Reveal variant="scale" delay={180}>
            <div className="relative grid grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-4 sm:space-y-5 pt-8">
                <div className="relative animate-float-slower">
                  <Photo
                    src={heroPhotos[0].src}
                    className="w-full h-52 sm:h-64 object-cover rounded-[1.75rem] shadow-[0_18px_50px_rgba(13,59,110,0.15)]"
                    fallback={<div className="w-full h-52 sm:h-64 rounded-[1.75rem] shadow-[0_18px_50px_rgba(13,59,110,0.15)]" style={{ background: TILE_GRADIENTS[0] }} />}
                  />
                  {heroPhotos[0].shop && (
                    <span className="absolute bottom-3 left-3 right-3 bg-white/92 backdrop-blur text-[11px] font-semibold text-gray-800 px-3 py-1.5 rounded-full shadow-sm truncate">
                      {heroPhotos[0].shop}
                    </span>
                  )}
                </div>
                <Photo
                  src={heroPhotos[2].src}
                  className="w-full h-32 sm:h-40 object-cover rounded-[1.5rem] shadow-[0_14px_40px_rgba(13,59,110,0.12)]"
                  fallback={<div className="w-full h-32 sm:h-40 rounded-[1.5rem] shadow-[0_14px_40px_rgba(13,59,110,0.12)]" style={{ background: TILE_GRADIENTS[2] }} />}
                />
              </div>
              <div className="space-y-4 sm:space-y-5">
                <div className="relative animate-float-slow">
                  <Photo
                    src={heroPhotos[1].src}
                    className="w-full h-40 sm:h-52 object-cover rounded-[1.5rem] shadow-[0_14px_40px_rgba(13,59,110,0.12)]"
                    fallback={<div className="w-full h-40 sm:h-52 rounded-[1.5rem] shadow-[0_14px_40px_rgba(13,59,110,0.12)]" style={{ background: TILE_GRADIENTS[1] }} />}
                  />
                  {heroPhotos[1].shop && (
                    <span className="absolute bottom-3 left-3 right-3 bg-white/92 backdrop-blur text-[11px] font-semibold text-gray-800 px-3 py-1.5 rounded-full shadow-sm truncate">
                      {heroPhotos[1].shop}
                    </span>
                  )}
                </div>
                <div className="rounded-[1.5rem] bg-white border border-black/[0.06] p-5 shadow-[0_14px_40px_rgba(13,59,110,0.08)]">
                  <div className="w-10 h-10 rounded-xl bg-[#0D3B6E]/10 text-[#0D3B6E] flex items-center justify-center mb-3">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">Secure checkout</p>
                  <p className="text-xs text-gray-500 leading-relaxed">Every order is paid for through the same protected flow.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </header>

      {/* ── CATEGORIES ── */}
      {!loading && categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 sm:px-6 pb-4">
          <Reveal>
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2 className="mp-display text-2xl sm:text-3xl text-gray-900">Browse by category</h2>
                <p className="text-sm text-gray-500 mt-1">What the shops are stocking right now.</p>
              </div>
              {cat !== 'All' && (
                <button onClick={() => setCat('All')} className="text-sm font-semibold text-[#0D3B6E] hover:underline flex-shrink-0">
                  Clear filter
                </button>
              )}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-5 px-5 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map(([name, count]) => {
                const active = cat === name;
                return (
                  <button
                    key={name}
                    onClick={() => setCat(active ? 'All' : name)}
                    className={`group relative flex-shrink-0 w-[168px] h-[112px] rounded-2xl overflow-hidden text-left transition-all duration-200 ${
                      active ? 'ring-2 ring-[#0D3B6E] ring-offset-2 ring-offset-[#FBF9F6]' : 'hover:-translate-y-0.5'
                    }`}
                  >
                    <Photo
                      src={categoryImage(name)}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      fallback={<div className="absolute inset-0" style={{ background: gradientFor(name) }} />}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(9,26,45,0.15) 35%, rgba(9,26,45,0.82) 100%)' }} />
                    <div className="absolute inset-x-0 bottom-0 p-3.5">
                      <p className="text-white font-bold text-sm leading-tight line-clamp-1">{name}</p>
                      <p className="text-white/70 text-[11px] mt-0.5">{count} shop{count === 1 ? '' : 's'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Reveal>
        </section>
      )}

      {/* ── SHOP GRID ── */}
      <main id="shops" className="max-w-6xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="mp-display text-2xl sm:text-3xl text-gray-900">
              {search ? `Results for “${search}”` : cat === 'All' ? 'All shops' : cat}
            </h2>
            {!loading && <p className="text-sm text-gray-500 mt-1">{filtered.length} shop{filtered.length === 1 ? '' : 's'} to explore.</p>}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-[1.5rem] bg-white border border-black/[0.05] overflow-hidden animate-pulse">
                <div className="w-full h-44 bg-gray-100" />
                <div className="p-5 space-y-2.5">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[1.5rem] border border-black/[0.05]">
            <Store className="w-10 h-10 text-gray-200 mx-auto mb-4" />
            <p className="mp-display text-xl text-gray-900 mb-1">
              {shops.length === 0 ? 'No shops are open yet' : 'Nothing matches that search'}
            </p>
            <p className="text-sm text-gray-500">
              {shops.length === 0 ? 'Check back soon — new shops open all the time.' : 'Try a different category or search term.'}
            </p>
            {shops.length === 0 && (
              <Link href="/register" className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-[#0D3B6E] hover:underline">
                Be the first to list your shop <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((shop, i) => (
              <Reveal key={shop.id} delay={(i % 6) * 70}>
                <Link
                  href={`/store/${shop.slug}?ref=marketplace`}
                  className="group block h-full rounded-[1.5rem] bg-white border border-black/[0.05] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(13,59,110,0.14)]"
                >
                  <div className="relative w-full h-44 overflow-hidden">
                    <Photo
                      src={shop.sample_images[0]}
                      alt={shop.business_name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                      fallback={
                        <div className="w-full h-full flex items-center justify-center" style={{ background: gradientFor(shop.id) }}>
                          <span className="mp-display text-4xl text-white/90">{initials(shop.business_name) || <Store className="w-7 h-7" />}</span>
                        </div>
                      }
                    />
                    <span className="absolute top-3.5 right-3.5 bg-white/95 backdrop-blur text-[11px] font-bold text-gray-700 px-2.5 py-1 rounded-full shadow-sm">
                      {shop.product_count} item{shop.product_count === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <h3 className="mp-display text-xl text-gray-900 leading-snug group-hover:text-[#0D3B6E] transition-colors">
                        {shop.business_name}
                      </h3>
                      <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#0D3B6E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0 mt-1.5" />
                    </div>
                    {shop.categories.length > 0 && (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0D3B6E]/70 mb-2.5">
                        {shop.categories.slice(0, 2).join(' · ')}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                      {shop.announcement || 'Visit this shop to see what’s in stock.'}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </main>

      {/* ── TRUST BAND ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Photo
            src={STOCK.band}
            className="w-full h-full object-cover"
            fallback={<div className="w-full h-full" style={{ background: 'linear-gradient(152deg, #051525 0%, #0D3B6E 40%, #1a5f9e 75%, #0c2d4d 100%)' }} />}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(5,21,37,0.94) 20%, rgba(13,59,110,0.86) 60%, rgba(26,95,158,0.78) 100%)' }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <Reveal>
            <h2 className="mp-display text-3xl sm:text-4xl text-white text-center mb-3">Shopping here is simple</h2>
            <p className="text-blue-200/80 text-center max-w-lg mx-auto mb-12">
              Every shop runs its own storefront on GEMS. You get one place to find them, and the same protected checkout on every order.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
            {[
              { icon: Store, title: 'Real shops, real stock', desc: 'Every listing comes from a live business managing its own inventory.' },
              { icon: ShieldCheck, title: 'Pay with confidence', desc: 'Checkout runs through the same secure flow as every GEMS storefront.' },
              { icon: Truck, title: 'Straight from the seller', desc: 'Your order is fulfilled by the shop itself — no middleman warehouse.' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 140} className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 text-yellow-400 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-bold mb-2">{f.title}</h3>
                  <p className="text-blue-200/70 text-sm leading-relaxed">{f.desc}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOR SELLERS ── */}
      <section id="sell" className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal variant="left">
            <Photo
              src={STOCK.seller}
              className="w-full h-[300px] sm:h-[400px] object-cover rounded-[2rem] shadow-[0_24px_60px_rgba(13,59,110,0.16)]"
              fallback={
                <div className="w-full h-[300px] sm:h-[400px] rounded-[2rem] shadow-[0_24px_60px_rgba(13,59,110,0.16)] flex items-center justify-center" style={{ background: TILE_GRADIENTS[0] }}>
                  <Store className="w-14 h-14 text-white/40" />
                </div>
              }
            />
          </Reveal>
          <Reveal variant="right" delay={120}>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0D3B6E] bg-[#0D3B6E]/[0.07] border border-[#0D3B6E]/10 px-3.5 py-1.5 rounded-full mb-5">
              For businesses
            </span>
            <h2 className="mp-display text-3xl sm:text-4xl text-gray-900 mb-4 leading-tight">
              Put your shop in front of<br className="hidden sm:block" /> more customers.
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8 max-w-md">
              Your storefront stays yours — your branding, your prices, your stock. The marketplace simply brings new buyers to your door.
            </p>
            <ul className="space-y-4 mb-9">
              {[
                { icon: Sparkles, title: 'Get discovered', desc: 'Reach shoppers already browsing the marketplace.' },
                { icon: Wallet, title: 'Fast, direct payouts', desc: 'Payments are collected securely and paid out to your business.' },
                { icon: ShieldCheck, title: 'A small, transparent commission', desc: 'Only on marketplace orders — no hidden charges.' },
              ].map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0D3B6E]/[0.07] text-[#0D3B6E] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm mb-0.5">{title}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-semibold px-7 py-3.5 rounded-full transition-colors shadow-[0_10px_30px_rgba(13,59,110,0.2)]"
            >
              List your shop <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-9 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0D3B6E] rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-900">GEMS Marketplace</span>
          </div>
          <div className="flex items-center gap-7 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <Link href="/login" className="hover:text-gray-900 transition-colors">Log in</Link>
            <Link href="/register" className="hover:text-gray-900 transition-colors">List your shop</Link>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} GEMS by GTHINK.</p>
        </div>
      </footer>
    </div>
  );
}
