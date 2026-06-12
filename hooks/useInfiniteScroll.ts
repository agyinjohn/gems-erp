'use client';
import { useEffect, useRef } from 'react';

interface Options {
  enabled?: boolean;
  rootMargin?: string;
  /** Re-attach observer when sentinel mounts (e.g. after initial load). */
  watchKey?: string | number;
}

/** Fires `onLoadMore` when sentinel enters viewport (with prefetch margin). */
export function useInfiniteScroll(
  onLoadMore: () => void,
  { enabled = true, rootMargin = '480px', watchKey = 0 }: Options = {},
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) onLoadMoreRef.current();
      },
      { rootMargin, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, rootMargin, watchKey]);

  return sentinelRef;
}
