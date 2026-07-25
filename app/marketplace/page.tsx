'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, ArrowRight, ArrowUpRight, ShieldCheck, Wallet, Store, Package, Tag, Sparkles,
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

const CATEGORY_ICONS = [Tag, Package, Store, Sparkles];

function hashStr(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
}

function categoryIconFor(seed: string) {
  return CATEGORY_ICONS[hashStr(seed) % CATEGORY_ICONS.length];
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}

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
    return ['All', ...Array.from(seen.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 12)];
  }, [shops]);

  const filtered = shops.filter((s) => {
    const matchesCat = cat === 'All' || s.categories.includes(cat);
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || s.business_name.toLowerCase().includes(q) || s.categories.some((c) => c.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="min-h-dvh w-full bg-white">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-[#0D3B6E] rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="font-extrabold text-base tracking-tight text-gray-900 leading-tight">GEMS</div>
              <div className="text-[11px] text-gray-400 leading-tight">Marketplace</div>
            </div>
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 bg-[#0D3B6E] hover:bg-[#1A5294] text-white text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full transition-colors flex-shrink-0"
          >
            List your shop
          </Link>
        </div>
      </nav>

      {/* ── SEARCH HERO ── */}
      <header className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-6 sm:pb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">Shop from businesses on GEMS</h1>
          <p className="text-gray-500 text-sm sm:text-base mb-6">Real shops, real stock, secure checkout.</p>

          <div className="relative max-w-xl">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shops or categories"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#0D3B6E]/30 focus:border-[#0D3B6E] transition-shadow"
            />
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto mt-5 pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => {
              const Icon = c === 'All' ? Store : categoryIconFor(c);
              const active = cat === c;
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#0D3B6E] border-[#0D3B6E] text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {c}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── SHOP GRID ── */}
      <main id="shops" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">
            {search ? `Results for "${search}"` : cat === 'All' ? 'All shops' : cat}
          </h2>
          {!loading && <span className="text-sm text-gray-400">{filtered.length} shop{filtered.length === 1 ? '' : 's'}</span>}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="w-full h-40 bg-gray-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
            <Store className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{shops.length === 0 ? 'No shops are open yet — check back soon.' : `No shops match "${search || cat}".`}</p>
            {shops.length === 0 && (
              <Link href="/register" className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-[#0D3B6E] hover:underline">
                Be the first to list your shop <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((shop, i) => {
              const cover = shop.sample_images[0];
              return (
                <Reveal key={shop.id} delay={(i % 6) * 60}>
                  <Link
                    href={`/store/${shop.slug}?ref=marketplace`}
                    className="group block rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-200/70 hover:-translate-y-0.5 transition-all duration-200 h-full bg-white"
                  >
                    {cover ? (
                      <div className="w-full h-40 overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cover} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center bg-[#0D3B6E]">
                        <span className="text-3xl font-extrabold text-white/90">{initials(shop.business_name) || <Store className="w-6 h-6" />}</span>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 leading-snug group-hover:text-[#0D3B6E] transition-colors">{shop.business_name}</h3>
                        <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#0D3B6E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0 mt-0.5" />
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        {shop.categories.slice(0, 2).join(' · ') || 'Shop'} · {shop.product_count} product{shop.product_count === 1 ? '' : 's'}
                      </p>
                      <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                        {shop.announcement || 'Visit this shop to see what’s in stock.'}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </main>

      {/* ── SELL STRIP ── */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D3B6E]/10 text-[#0D3B6E] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Own a business? List it here.</p>
              <p className="text-gray-500 text-sm">Keep your own storefront, reach more buyers, get paid directly — for a small commission.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="hidden md:flex items-center gap-1.5 text-xs text-gray-500">
              <Wallet className="w-3.5 h-3.5 text-[#0D3B6E]" /> Fast payouts
            </span>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 bg-[#0D3B6E] hover:bg-[#1A5294] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            >
              List your shop <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#0D3B6E] rounded-lg flex items-center justify-center">
            <Package className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900">GEMS Marketplace</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <Link href="/login" className="hover:text-gray-900 transition-colors">Log in</Link>
          <Link href="/register" className="hover:text-gray-900 transition-colors">List your shop</Link>
        </div>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} GEMS by GTHINK.</p>
      </footer>
    </div>
  );
}
