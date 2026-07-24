'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store, Package, Search } from 'lucide-react';
import { publicApi } from '@/lib/api';

interface Shop {
  id: string;
  business_name: string;
  slug: string;
  logo: string;
  announcement: string;
  product_count: number;
}

const NAVY = '#0D3B6E';

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

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-extrabold" style={{ color: NAVY }}>GEMS Marketplace</Link>
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pl-9 w-full"
              placeholder="Search shops…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Browse Shops</h1>
          <p className="text-sm text-gray-500 mt-1">Discover businesses selling on GEMS and shop directly from their stores.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">{shops.length === 0 ? 'No shops are open yet — check back soon.' : 'No shops match your search.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((shop) => (
              <Link
                key={shop.id}
                href={`/store/${shop.slug}?ref=marketplace`}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all flex flex-col"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-100">
                    {shop.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shop.logo} alt={shop.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{shop.business_name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Package className="w-3 h-3" /> {shop.product_count} product{shop.product_count === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                {shop.announcement && <p className="text-xs text-gray-500 line-clamp-2 mt-auto">{shop.announcement}</p>}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
