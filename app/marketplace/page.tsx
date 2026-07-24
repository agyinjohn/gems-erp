'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Store, Package, Search, ArrowRight, ArrowUpRight, Sparkles, ShieldCheck } from 'lucide-react';
import { publicApi } from '@/lib/api';

interface Shop {
  id: string;
  business_name: string;
  slug: string;
  logo: string;
  announcement: string;
  product_count: number;
}

const AVATAR_GRADIENTS = [
  'from-[#0D3B6E] to-[#1a5f9e]',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-fuchsia-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-blue-600',
];

function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}

export default function MarketplacePage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    publicApi.get('/marketplace/shops')
      .then((r) => setShops(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = shops.filter((s) => !search || s.business_name.toLowerCase().includes(search.toLowerCase()));
  const totalProducts = useMemo(() => shops.reduce((sum, s) => sum + s.product_count, 0), [shops]);

  return (
    <div className="landing-page min-h-dvh font-sans">
      {/* ── NAV ── */}
      <nav className="landing-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-10 h-10 bg-[#0D3B6E] rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="font-extrabold text-xl tracking-tight text-[#0D3B6E] leading-tight">GEMS</div>
              <div className="text-[11px] text-gray-400 font-medium leading-tight">Marketplace</div>
            </div>
          </Link>
          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pl-10 w-full bg-gray-50/80"
              placeholder="Search shops…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 bg-[#0D3B6E] hover:bg-[#1A5294] text-white text-sm font-bold px-4 sm:px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-blue-200 flex-shrink-0"
          >
            List your shop <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="landing-hero text-white">
        <div className="landing-hero-glow" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24 relative z-[1]">
          <div className="max-w-2xl">
            <div className="landing-eyebrow">
              <Sparkles className="w-3 h-3" /> Shop directory
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4">
              Shop from businesses<br className="hidden sm:block" /> <span className="text-yellow-400">built on GEMS.</span>
            </h1>
            <p className="text-blue-200 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
              Browse and buy directly from real shops running on the GEMS platform — secure checkout, real stock, one place to discover them all.
            </p>

            {/* Search — mobile + prominent hero copy */}
            <div className="relative max-w-md md:hidden mb-6">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-gray-900 bg-white/95 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Search shops…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {!loading && shops.length > 0 && (
              <div className="flex items-center gap-6 sm:gap-8 pt-2">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold">{shops.length}</div>
                  <div className="text-xs sm:text-sm text-blue-300">Shop{shops.length === 1 ? '' : 's'} open</div>
                </div>
                <div className="w-px h-9 bg-white/15" />
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold">{totalProducts.toLocaleString()}</div>
                  <div className="text-xs sm:text-sm text-blue-300">Products listed</div>
                </div>
                <div className="w-px h-9 bg-white/15 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-1.5 text-sm text-blue-200">
                  <ShieldCheck className="w-4 h-4 text-yellow-400" /> Secure checkout on every order
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SHOP GRID ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {search ? `Results for "${search}"` : 'All shops'}
          </h2>
          {!loading && <span className="text-sm text-gray-400">{filtered.length} shop{filtered.length === 1 ? '' : 's'}</span>}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Store className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{shops.length === 0 ? 'No shops are open yet — check back soon.' : `No shops match "${search}".`}</p>
            {shops.length === 0 && (
              <Link href="/register" className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-[#0D3B6E] hover:underline">
                Be the first to list your shop <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((shop) => (
              <Link
                key={shop.id}
                href={`/store/${shop.slug}?ref=marketplace`}
                className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-gray-200/60 hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-200 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden text-white font-extrabold text-lg bg-gradient-to-br ${gradientFor(shop.business_name)} shadow-md`}>
                    {shop.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shop.logo} alt={shop.business_name} className="w-full h-full object-cover" />
                    ) : (
                      initials(shop.business_name) || <Store className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 truncate group-hover:text-[#0D3B6E] transition-colors">{shop.business_name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Package className="w-3 h-3" /> {shop.product_count} product{shop.product_count === 1 ? '' : 's'}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#0D3B6E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mt-auto min-h-[2rem]">
                  {shop.announcement || 'Visit this shop to see what’s in stock.'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">GEMS Marketplace</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
            <Link href="/register" className="hover:text-white transition-colors">List your shop</Link>
          </div>
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} GEMS by GTHINK.</p>
        </div>
      </footer>
    </div>
  );
}
