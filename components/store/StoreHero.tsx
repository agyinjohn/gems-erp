'use client';
import { Truck, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  businessName?: string;
  onBrowse: () => void;
}

export default function StoreHero({ businessName, onBrowse }: Props) {
  return (
    <section className="store-hero relative overflow-hidden rounded-2xl mb-6">
      <div className="absolute inset-0 store-hero-bg" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-sky-400/20 rounded-full blur-3xl" />

      <div className="relative px-6 sm:px-10 py-10 sm:py-14 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-amber-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 ring-1 ring-white/15">
            <Sparkles className="w-3.5 h-3.5" />
            Welcome to {businessName || 'our store'}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3">
            Quality products.<br />
            <span className="text-amber-300">Delivered to your door.</span>
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed mb-6 max-w-md">
            Browse our catalog, pay securely with Paystack, and track your order — all in one place.
          </p>
          <button type="button" onClick={onBrowse} className="store-btn store-btn-hero inline-flex items-center gap-2">
            Shop now <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3 lg:gap-3 w-full lg:max-w-md xl:max-w-none">
          {[
            { icon: Truck, title: 'Fast delivery', sub: 'Free over GH₵ 500' },
            { icon: ShieldCheck, title: 'Secure pay', sub: 'Card & mobile money' },
            { icon: Sparkles, title: 'Verified stock', sub: 'Real-time inventory' },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="store-hero-stat">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-amber-300 mb-2">
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold text-white">{title}</div>
              <div className="text-xs text-blue-200/80 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
