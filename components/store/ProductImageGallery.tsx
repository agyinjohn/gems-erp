'use client';
import { useState, useEffect } from 'react';
import { Package, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { categoryIconColor } from './theme';
import { getProductImages } from './productImages';

interface Props {
  product: { id?: string; name: string; images?: string[] | string | null; category_name?: string };
  gradientClass?: string;
  className?: string;
}

export default function ProductImageGallery({ product, gradientClass = 'from-slate-100 via-gray-50 to-zinc-50', className = '' }: Props) {
  const images = getProductImages(product);
  const [activeIndex, setActiveIndex] = useState(0);
  const iconColor = categoryIconColor(product.category_name);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [product.id, product.name, images.length]);

  const go = (delta: number) => {
    if (!hasMultiple) return;
    setActiveIndex(i => (i + delta + images.length) % images.length);
  };

  return (
    <div className={`store-image-gallery ${className}`}>
      <div className={`store-image-gallery-main store-filter-panel relative bg-gradient-to-br ${gradientClass} overflow-hidden`}>
        {images.length > 0 ? (
          <>
            <img
              key={images[activeIndex]}
              src={images[activeIndex]}
              alt={`${product.name}${hasMultiple ? ` — image ${activeIndex + 1} of ${images.length}` : ''}`}
              className="w-full h-full object-contain transition-opacity duration-200"
            />
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="store-image-gallery-nav store-image-gallery-nav-prev"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="store-image-gallery-nav store-image-gallery-nav-next"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="store-image-gallery-counter">
                  <Images className="w-3 h-3" />
                  {activeIndex + 1} / {images.length}
                </span>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center min-h-[240px]">
            <Package className={`w-24 h-24 sm:w-32 sm:h-32 ${iconColor}`} />
          </div>
        )}
      </div>

      {hasMultiple && (
        <div className="store-image-gallery-thumbs" role="tablist" aria-label="Product images">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`View image ${i + 1}`}
              onClick={() => setActiveIndex(i)}
              className={`store-image-gallery-thumb ${i === activeIndex ? 'store-image-gallery-thumb-active' : ''}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
