'use client';

/**
 * Responsive Debug Indicator
 * Shows current Tailwind breakpoint in development
 * Add to layout.tsx during responsive testing
 */
export default function ResponsiveDebug() {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 left-4 z-[999] bg-black/80 text-white text-xs font-mono px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="sm:hidden">XS (&lt;640px)</span>
        <span className="hidden sm:inline md:hidden">SM (≥640px)</span>
        <span className="hidden md:inline lg:hidden">MD (≥768px)</span>
        <span className="hidden lg:inline xl:hidden">LG (≥1024px)</span>
        <span className="hidden xl:inline 2xl:hidden">XL (≥1280px)</span>
        <span className="hidden 2xl:inline">2XL (≥1536px)</span>
      </div>
    </div>
  );
}
