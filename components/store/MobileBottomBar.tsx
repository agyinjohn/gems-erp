'use client';
import { Home, SlidersHorizontal, ShoppingCart, Search } from 'lucide-react';

interface Props {
  cartCount: number;
  filterCount: number;
  active: 'shop' | 'filters' | 'cart' | 'track';
  onHome: () => void;
  onFilters: () => void;
  onCart: () => void;
  onTrack: () => void;
}

export default function MobileBottomBar({ cartCount, filterCount, active, onHome, onFilters, onCart, onTrack }: Props) {
  const items = [
    { id: 'shop' as const, label: 'Shop', icon: Home, onClick: onHome },
    { id: 'filters' as const, label: 'Filters', icon: SlidersHorizontal, onClick: onFilters, badge: filterCount || undefined },
    { id: 'cart' as const, label: 'Cart', icon: ShoppingCart, onClick: onCart, badge: cartCount || undefined },
    { id: 'track' as const, label: 'Track', icon: Search, onClick: onTrack },
  ];

  return (
    <nav className="store-mobile-bar" aria-label="Store navigation">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`relative flex flex-col items-center gap-0.5 min-w-[4rem] py-1 rounded-lg transition-colors ${
              isActive ? 'text-[#0D3B6E]' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              {item.badge ? (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-amber-400 text-gray-900 text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {item.badge}
                </span>
              ) : null}
            </span>
            <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
