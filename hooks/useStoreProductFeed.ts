'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { publicApi } from '@/lib/api';

const ITEMS_PER_PAGE = 16;

function dedupeProducts(items: any[]) {
  const seen = new Set<string>();
  return items.filter(p => {
    const id = String(p.id ?? p._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

interface FeedQuery {
  tenantSlug: string;
  search: string;
  filterCat: string;
  branchSlug?: string;
}

export function useStoreProductFeed({ tenantSlug, search, filterCat, branchSlug }: FeedQuery) {
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchingRef = useRef(false);
  const queryRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const productsRef = useRef<any[]>([]);

  const queryKey = `${tenantSlug}|${search}|${filterCat}|${branchSlug ?? ''}`;

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const fetchPage = useCallback(async (pageNum: number, replace: boolean, key: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const isFirst = pageNum === 1;
    if (isFirst) {
      if (productsRef.current.length === 0) setLoadingInitial(true);
      else setRefreshing(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params: Record<string, string | number> = {
        page: pageNum,
        limit: ITEMS_PER_PAGE,
        tenant_slug: tenantSlug,
      };
      if (search) params.search = search;
      if (filterCat) params.category = filterCat;
      if (branchSlug) params.branch_slug = branchSlug;

      const r = await publicApi.get('/storefront/products', {
        params,
        signal: controller.signal,
      });

      if (key !== queryRef.current) return;

      const newProds = r.data.data ?? [];
      setProducts(prev => dedupeProducts(replace ? newProds : [...prev, ...newProds]));
      setHasMore(Boolean(r.data.hasMore));
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      if (key === queryRef.current && isFirst) setProducts([]);
    } finally {
      if (key === queryRef.current) {
        setLoadingInitial(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
      fetchingRef.current = false;
    }
  }, [tenantSlug, search, filterCat, branchSlug]);

  // Reset feed when server-side filters change
  useEffect(() => {
    queryRef.current = queryKey;
    setPage(1);
    setHasMore(true);
    fetchPage(1, true, queryKey);
  }, [queryKey, fetchPage]);

  // Subsequent pages
  useEffect(() => {
    if (page <= 1) return;
    fetchPage(page, false, queryRef.current);
  }, [page, fetchPage]);

  const loadMore = useCallback(() => {
    if (fetchingRef.current || !hasMore || loadingInitial || loadingMore || refreshing) return;
    setPage(p => p + 1);
  }, [hasMore, loadingInitial, loadingMore, refreshing]);

  return {
    products,
    hasMore,
    loadingInitial,
    loadingMore,
    refreshing,
    loadMore,
    itemsPerPage: ITEMS_PER_PAGE,
  };
}
