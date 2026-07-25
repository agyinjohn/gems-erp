'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, ArrowRight, ArrowUpRight, Sparkles, ShieldCheck, Wallet, Store, Package, Tag,
} from 'lucide-react';
import { publicApi } from '@/lib/api';
import Reveal from '@/components/landing/Reveal';
import { useCounter } from '@/hooks/useCounter';

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

const ACCENTS = [
  { name: 'gold', bg: 'bg-[#C9A227]', text: 'text-[#C9A227]', hex: '#C9A227' },
  { name: 'coral', bg: 'bg-[#D65F4C]', text: 'text-[#D65F4C]', hex: '#D65F4C' },
  { name: 'teal', bg: 'bg-[#3E8E7E]', text: 'text-[#3E8E7E]', hex: '#3E8E7E' },
];

const BADGE_ICONS = [Store, Package, Tag, Sparkles];

function hashStr(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
}

function accentFor(seed: string) {
  return ACCENTS[hashStr(seed) % ACCENTS.length];
}

function badgeIconFor(seed: string) {
  return BADGE_ICONS[hashStr(`${seed}-icon`) % BADGE_ICONS.length];
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}

// Fixed layout slots for the hero photo-stack — filled with as many real
// product photos as are available (0 to 6), rest left empty.
const HERO_SLOTS = [
  { top: '2%', left: '6%', w: '30%', h: '38%', rotate: -7 },
  { top: '4%', left: '58%', w: '34%', h: '34%', rotate: 5 },
  { top: '46%', left: '2%', w: '26%', h: '30%', rotate: 6 },
  { top: '52%', left: '66%', w: '30%', h: '36%', rotate: -4 },
  { top: '62%', left: '32%', w: '24%', h: '28%', rotate: -9 },
  { top: '8%', left: '32%', w: '22%', h: '24%', rotate: 10 },
];

export default function MarketplacePage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');

  useEffect(() => {
    publicApi.get('/marketplace/shops')
      .then((r) => setShops(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const s of shops) for (const c of s.categories) seen.set(c, (seen.get(c) || 0) + 1);
    return ['All', ...Array.from(seen.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 10)];
  }, [shops]);

  const filtered = shops.filter((s) => {
    const matchesCat = cat === 'All' || s.categories.includes(cat);
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || s.business_name.toLowerCase().includes(q) || s.categories.some((c) => c.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  const totalProducts = useMemo(() => shops.reduce((sum, s) => sum + s.product_count, 0), [shops]);
  const shopsCount = useCounter(shops.length, !loading);
  const productsCount = useCounter(totalProducts, !loading);

  const heroImages = useMemo(() => {
    const imgs: string[] = [];
    outer: for (const s of shops) {
      for (const img of s.sample_images) {
        if (!imgs.includes(img)) imgs.push(img);
        if (imgs.length >= 6) break outer;
      }
    }
    return imgs;
  }, [shops]);

  return (
    <div className="min-h-dvh w-full text-[#EDE6D6]" style={{ background: '#15171C', fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .mp-serif { font-family: 'Instrument Serif', serif; font-style: italic; }
        .mp-mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes mpRiseIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .mp-rise { animation: mpRiseIn 0.6s ease both; }
      `}</style>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md" style={{ background: 'rgba(21,23,28,0.85)' }}>
        <div className="max-w-6xl mx-auto px-6 h-[68px] flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#C9A227] flex items-center justify-center">
              <Package className="w-4 h-4 text-[#15171C]" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight text-[#EDE6D6] leading-tight">GEMS</div>
              <div className="mp-mono text-[10px] text-[#EDE6D6]/40 leading-tight uppercase tracking-widest">Marketplace</div>
            </div>
          </Link>
          <div className="relative w-full max-w-sm hidden md:block">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#EDE6D6]/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shops or categories"
              className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2.5 w-full text-sm outline-none focus:border-[#C9A227]/50 transition-colors placeholder:text-[#EDE6D6]/30"
            />
          </div>
          <Link
            href="/register"
            className="mp-mono inline-flex items-center gap-1.5 bg-[#C9A227] hover:bg-[#dab646] text-[#15171C] text-xs font-medium uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-full transition-colors flex-shrink-0"
          >
            List your shop <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="relative max-w-6xl mx-auto px-6 pt-14 sm:pt-20 pb-16 sm:pb-24 border-b border-white/10 overflow-hidden">
        {/* ambient art */}
        <div className="absolute inset-0 pointer-events-none -z-[1]">
          <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full opacity-[0.12]" style={{ background: 'radial-gradient(circle, #C9A227, transparent 70%)' }} />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full opacity-[0.10]" style={{ background: 'radial-gradient(circle, #3E8E7E, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(rgba(237,230,214,0.5) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <Reveal>
              <p className="mp-mono text-xs tracking-[0.25em] uppercase text-[#C9A227] mb-5">
                Curated marketplace &middot; GEMS
              </p>
              <h1 className="mp-serif text-5xl sm:text-6xl leading-[0.95] mb-6">
                A shelf for every
                <br />
                maker on GEMS.
              </h1>
              <p className="max-w-md text-[#EDE6D6]/55 text-[15px] leading-relaxed mb-10">
                Independent shops, one storefront. Browse real inventory from real businesses running on the platform — secure checkout, direct to the seller.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-5 py-3 w-full sm:w-80 focus-within:border-[#C9A227]/50 transition-colors">
                  <Search size={16} className="text-[#EDE6D6]/40 shrink-0" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search shops or categories"
                    className="bg-transparent outline-none text-sm placeholder:text-[#EDE6D6]/30 w-full"
                  />
                </div>
              </div>
            </Reveal>
          </div>

          {/* photo stack — real product photos pulled from live shops */}
          <div className="relative hidden lg:block h-[420px]">
            {heroImages.length > 0 ? (
              heroImages.map((src, i) => {
                const slot = HERO_SLOTS[i];
                return (
                  <div
                    key={src}
                    className="mp-rise absolute rounded-2xl overflow-hidden shadow-2xl border-4"
                    style={{
                      top: slot.top, left: slot.left, width: slot.w, height: slot.h,
                      transform: `rotate(${slot.rotate}deg)`,
                      borderColor: '#15171C',
                      animationDelay: `${i * 90}ms`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </div>
                );
              })
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-56 h-56 rounded-full opacity-[0.15]" style={{ background: 'radial-gradient(circle, #C9A227, transparent 70%)' }} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── STATS ── */}
      <section className="relative z-10 -mt-8 sm:-mt-10 px-6 pb-2">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { value: loading ? '—' : shopsCount.toLocaleString(), label: `Shop${shops.length === 1 ? '' : 's'} open`, icon: Store },
            { value: loading ? '—' : productsCount.toLocaleString(), label: 'Products listed', icon: Package },
            { value: '100%', label: 'Secure checkout', icon: ShieldCheck },
            { value: 'Direct', label: 'Payout to seller', icon: Wallet },
          ].map((s, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            const Icon = s.icon;
            return (
              <Reveal key={s.label} delay={i * 100}>
                <div className="bg-white/[0.04] backdrop-blur border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center gap-3 hover:bg-white/[0.06] transition-colors">
                  <div className={`w-10 h-10 rounded-full ${accent.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className="text-[#15171C]" />
                  </div>
                  <div className="min-w-0">
                    <div className="mp-serif text-2xl leading-none">{s.value}</div>
                    <div className="mp-mono text-[10px] uppercase tracking-widest text-[#EDE6D6]/40 mt-1">{s.label}</div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 sm:py-24 px-6 border-b border-white/10" style={{ background: '#1A1C22' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="mp-mono text-xs tracking-[0.25em] uppercase text-[#C9A227]">Shopping made simple</span>
            <h2 className="mp-serif text-4xl sm:text-5xl mt-3 mb-4">Three steps, one platform.</h2>
            <p className="text-[#EDE6D6]/50 text-base">Between browsing and having it delivered.</p>
          </Reveal>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-white/10" />
            {[
              { step: '1', title: 'Browse shops', desc: 'Search or scroll the directory to find real shops selling on GEMS.' },
              { step: '2', title: 'Add to cart & pay securely', desc: 'Checkout runs through Paystack — the same secure flow as every GEMS storefront.' },
              { step: '3', title: 'Track your order', desc: 'The seller fulfills your order directly and you can follow its status until it arrives.' },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 180} className="relative text-center">
                <div
                  className="mp-serif relative z-10 inline-flex w-16 h-16 rounded-full items-center justify-center text-2xl mb-5 border-4"
                  style={{ background: '#1A1C22', borderColor: ACCENTS[i % ACCENTS.length].hex }}
                >
                  {s.step}
                </div>
                <h3 className="font-medium text-[#EDE6D6] text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-[#EDE6D6]/50 leading-relaxed">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHOP GRID ── */}
      <main id="shops" className="max-w-6xl mx-auto px-6 py-14 sm:py-16">
        <Reveal className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <span className="mp-mono text-xs tracking-[0.25em] uppercase text-[#C9A227]">Directory</span>
            <h2 className="mp-serif text-3xl sm:text-4xl mt-2">
              {search ? `Results for "${search}"` : 'All shops'}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`mp-mono text-xs px-4 py-2 rounded-full border transition-colors ${
                  cat === c
                    ? 'border-[#C9A227] text-[#C9A227] bg-[#C9A227]/10'
                    : 'border-white/10 text-[#EDE6D6]/50 hover:border-white/25 hover:text-[#EDE6D6]/80'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Reveal>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 animate-pulse">
                <div className="w-full h-36 rounded-xl bg-white/5 mb-4" />
                <div className="h-3.5 bg-white/5 rounded w-3/4 mb-2" />
                <div className="h-2.5 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-white/10 bg-white/[0.02]">
            <Store className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-[#EDE6D6]/50 font-medium">{shops.length === 0 ? 'No shops are open yet — check back soon.' : `No shops match "${search || cat}".`}</p>
            {shops.length === 0 && (
              <Link href="/register" className="mp-mono inline-flex items-center gap-1.5 mt-4 text-xs uppercase tracking-widest text-[#C9A227] hover:underline">
                Be the first to list your shop <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((shop, i) => {
              const accent = accentFor(shop.id);
              const BadgeIcon = badgeIconFor(shop.id);
              const cover = shop.sample_images[0];
              return (
                <Reveal key={shop.id} delay={(i % 6) * 70}>
                  <Link
                    href={`/store/${shop.slug}?ref=marketplace`}
                    className="group relative rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col h-full transition-all duration-300 hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-1"
                  >
                    {/* cover */}
                    {cover ? (
                      <div className="relative w-full h-36 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cover} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(21,23,28,0.85) 100%)' }} />
                      </div>
                    ) : (
                      <div className={`relative w-full h-36 flex items-center justify-center ${accent.bg}`}>
                        <span className="mp-serif text-5xl text-[#15171C]/70">{initials(shop.business_name) || <Store className="w-6 h-6" />}</span>
                      </div>
                    )}

                    {/* wax-seal badge */}
                    <div
                      className={`absolute top-28 left-6 w-10 h-10 rounded-full ${accent.bg} flex items-center justify-center shadow-md`}
                      style={{ boxShadow: '0 0 0 4px #15171C' }}
                    >
                      <BadgeIcon size={16} className="text-[#15171C]" />
                    </div>

                    <div className="p-6 pt-8 flex flex-col flex-1">
                      {shop.categories.length > 0 && (
                        <p className={`mp-mono text-[11px] uppercase tracking-widest ${accent.text} mb-2`}>
                          {shop.categories.slice(0, 2).join(' · ')}
                        </p>
                      )}
                      <h3 className="mp-serif text-3xl leading-snug mb-3">{shop.business_name}</h3>
                      <p className="text-sm text-[#EDE6D6]/50 leading-relaxed mb-6 flex-1">
                        {shop.announcement || 'Visit this shop to see what’s in stock.'}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <span className="mp-mono text-xs text-[#EDE6D6]/40 flex items-center gap-1.5">
                          <Package size={12} /> {shop.product_count} product{shop.product_count === 1 ? '' : 's'}
                        </span>
                        <ArrowUpRight
                          size={16}
                          className="text-[#EDE6D6]/30 group-hover:text-[#EDE6D6] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                        />
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </main>

      {/* ── FOR SELLERS ── */}
      <section id="sell" className="py-20 sm:py-24 px-6 border-t border-white/10" style={{ background: '#1A1C22' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <Reveal variant="left">
            <span className="mp-mono text-xs tracking-[0.25em] uppercase text-[#C9A227]">For businesses</span>
            <h2 className="mp-serif text-4xl sm:text-5xl mt-3 mb-5">Grow your business on GEMS.</h2>
            <p className="text-[#EDE6D6]/55 text-base leading-relaxed mb-8 max-w-md">
              Every shop on the marketplace keeps its own branded storefront — the marketplace just brings extra buyers to it.
            </p>
            <Link
              href="/register"
              className="mp-mono inline-flex items-center gap-1.5 bg-[#C9A227] hover:bg-[#dab646] text-[#15171C] font-medium uppercase tracking-wider px-6 py-3.5 rounded-full text-xs transition-colors"
            >
              List your shop <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Reveal>
          <Reveal variant="right" delay={120}>
            <ul className="space-y-5">
              {[
                { title: 'Reach shoppers already browsing', desc: 'Get discovered by people searching the directory, on top of your own customer base.' },
                { title: 'Keep your own storefront', desc: 'Your shop still has its own page and branding — the marketplace just links to it.' },
                { title: 'A small, transparent commission', desc: 'Only a modest fee applies to orders placed through the marketplace — no hidden charges.' },
                { title: 'Fast payouts to your own account', desc: 'Order payments are collected securely and paid out directly to your business.' },
              ].map((b) => (
                <li key={b.title} className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-[#3E8E7E]/15 text-[#3E8E7E] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShieldCheck size={14} />
                  </div>
                  <div>
                    <div className="font-medium text-[#EDE6D6] text-sm mb-0.5">{b.title}</div>
                    <div className="text-sm text-[#EDE6D6]/50 leading-relaxed">{b.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative py-20 sm:py-24 px-6 overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 pointer-events-none -z-[1]">
          <div className="absolute -top-24 left-1/4 w-80 h-80 rounded-full opacity-[0.12]" style={{ background: 'radial-gradient(circle, #D65F4C, transparent 70%)' }} />
          <div className="absolute -bottom-24 right-1/4 w-80 h-80 rounded-full opacity-[0.12]" style={{ background: 'radial-gradient(circle, #C9A227, transparent 70%)' }} />
        </div>
        <div className="max-w-2xl mx-auto text-center relative">
          <Reveal>
            <h2 className="mp-serif text-4xl sm:text-5xl mb-4">Ready to find your next favorite shop?</h2>
            <p className="text-[#EDE6D6]/55 text-base mb-10 max-w-lg mx-auto">Browse real shops running on GEMS, or list your own and start reaching new buyers today.</p>
          </Reveal>
          <Reveal delay={150}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#shops" className="mp-mono inline-flex items-center justify-center gap-2 bg-[#C9A227] hover:bg-[#dab646] text-[#15171C] font-medium uppercase tracking-wider px-8 py-4 rounded-full text-xs transition-colors">
                <Store size={14} /> Browse Shops
              </a>
              <Link href="/register" className="mp-mono inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-[#EDE6D6] font-medium uppercase tracking-wider px-8 py-4 rounded-full text-xs transition-colors">
                List Your Shop
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-[#EDE6D6]" />
          </div>
          <span className="font-medium text-sm">GEMS Marketplace</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-[#EDE6D6]/40">
          <Link href="/" className="hover:text-[#EDE6D6] transition-colors">Home</Link>
          <Link href="/login" className="hover:text-[#EDE6D6] transition-colors">Log in</Link>
          <Link href="/register" className="hover:text-[#EDE6D6] transition-colors">List your shop</Link>
        </div>
        <p className="mp-mono text-xs text-[#EDE6D6]/30">© {new Date().getFullYear()} GEMS by GTHINK.</p>
      </footer>
    </div>
  );
}
