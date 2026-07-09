'use client';
import { Package, Images } from 'lucide-react';
import { categoryGradient, categoryIconColor } from './theme';
import { getProductImages } from './productImages';

interface Props {
  product: { name: string; images?: string[] | string | null; category_name?: string };
  className?: string;
}

export default function ProductCardImage({ product, className = '' }: Props) {
  const bg = categoryGradient(product.category_name);
  const iconColor = categoryIconColor(product.category_name);
  const images = getProductImages(product);

  return (
    <div className={`relative aspect-[4/3] sm:aspect-[3/2] bg-gradient-to-br ${bg} overflow-hidden ${className}`}>
      {images.length > 0 ? (
        <img
          src={images[0]}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package className={`w-10 h-10 sm:w-12 sm:h-12 ${iconColor}`} />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {images.length > 1 && (
        <>
          <span className="absolute top-2 right-2 store-badge store-badge-dark text-[9px] px-2 py-0.5 gap-1">
            <Images className="w-2.5 h-2.5" />
            {images.length}
          </span>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 px-2 pointer-events-none">
            {images.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === 0 ? 'w-3 bg-white' : 'w-1 bg-white/60'}`}
              />
            ))}
            {images.length > 5 && (
              <span className="text-[8px] text-white/90 font-bold ml-0.5">+{images.length - 5}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
