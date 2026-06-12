'use client';
import { Package, Truck, ShieldCheck, BadgeCheck, Search } from 'lucide-react';

interface Props {
  businessName?: string;
  categories: { id: string; name: string }[];
  onCategorySelect: (name: string) => void;
  onTrackOrder: () => void;
}

export default function StoreFooter({ businessName, categories, onCategorySelect, onTrackOrder }: Props) {
  const storeName = businessName || 'GEMS Store';

  return (
    <footer className="bg-gradient-to-b from-slate-900 to-gray-950 text-white mt-auto">
      <div className="border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
          {[
            { icon: <Truck className="w-5 h-5" />, title: 'Free Delivery', sub: 'On orders over GH₵ 500' },
            { icon: <ShieldCheck className="w-5 h-5" />, title: 'Secure Checkout', sub: 'Paystack — card & mobile money' },
            { icon: <BadgeCheck className="w-5 h-5" />, title: 'Quality Guaranteed', sub: 'Verified inventory' },
            { icon: <Search className="w-5 h-5" />, title: 'Order Tracking', sub: 'Track your purchase' },
          ].map(b => (
            <div key={b.title} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 flex-shrink-0 ring-1 ring-amber-400/20">
                {b.icon}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{b.title}</div>
                <div className="text-xs text-gray-400 mt-0.5 leading-snug">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/20">
                <Package className="w-5 h-5 text-gray-900" />
              </div>
              <div>
                <div className="font-extrabold text-lg">{storeName}</div>
                <div className="text-gray-400 text-xs">Powered by GEMS ERP</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md">
              Shop quality products with secure checkout and reliable delivery. Browse our catalog and order with confidence.
            </p>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Shop</h4>
            <ul className="space-y-2.5">
              {['All Products', ...categories.map(c => c.name)].map(name => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => onCategorySelect(name === 'All Products' ? '' : name)}
                    className="text-gray-400 hover:text-amber-400 text-sm transition-colors"
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Help</h4>
            <ul className="space-y-2.5 mb-6">
              <li>
                <button type="button" onClick={onTrackOrder} className="text-gray-400 hover:text-amber-400 text-sm transition-colors">
                  Track My Order
                </button>
              </li>
              <li><span className="text-gray-500 text-sm">Shipping & delivery info</span></li>
              <li><span className="text-gray-500 text-sm">Returns & refunds</span></li>
            </ul>
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">We accept</p>
            <div className="flex flex-wrap gap-2">
              {['Visa', 'Mastercard', 'MTN MoMo', 'Telecel Cash', 'AT Money'].map(p => (
                <span key={p} className="bg-white/5 border border-white/10 text-gray-300 text-[10px] font-semibold px-2.5 py-1 rounded-md">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-gray-500 text-xs">&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <p className="text-gray-600 text-xs">Secure payments via Paystack</p>
        </div>
      </div>
    </footer>
  );
}
