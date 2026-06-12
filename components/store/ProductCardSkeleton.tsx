export default function ProductCardSkeleton() {
  return (
    <div className="store-product-card animate-pulse">
      <div className="aspect-[4/3] sm:aspect-[3/2] bg-gray-200" />
      <div className="p-2.5 sm:p-3 space-y-2">
        <div className="h-2 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-4/5" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-1" />
        <div className="h-8 bg-gray-200 rounded-lg w-full mt-2" />
      </div>
    </div>
  );
}
