'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import api, { apiCache } from './api';

interface UseApiOptions {
  ttl?: number;          // cache TTL in ms (default 30s)
  revalidate?: boolean;  // show stale data while fetching fresh (default true)
  enabled?: boolean;     // set false to skip fetching (default true)
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Data fetching hook with stale-while-revalidate caching.
 * - Returns cached data instantly on revisit (no spinner flash)
 * - Revalidates in the background after TTL expires
 * - Deduplicates in-flight requests for the same URL
 */
export function useApi<T = any>(
  url: string | null,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { ttl = 30_000, revalidate = true, enabled = true } = options;

  const [data, setData] = useState<T | null>(() =>
    url ? (apiCache.get(url) as T | null) : null,
  );
  const [loading, setLoading] = useState<boolean>(!data && !!url && enabled);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Set<string>>(new Set());

  const fetch = useCallback(async (silent = false) => {
    if (!url || !enabled) return;
    if (inFlight.current.has(url)) return;

    inFlight.current.add(url);
    if (!silent) setLoading(true);
    setError(null);

    try {
      const res = await api.get(url);
      const result = res.data.data ?? res.data;
      apiCache.set(url, result);
      setData(result);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load data');
    } finally {
      inFlight.current.delete(url);
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    if (!url || !enabled) return;
    const cached = apiCache.get(url);
    if (cached) {
      setData(cached as T);
      setLoading(false);
      if (revalidate && apiCache.isStale(url, ttl)) fetch(true);
    } else {
      fetch(false);
    }
  }, [url, enabled, ttl, revalidate, fetch]);

  return { data, loading, error, refresh: () => fetch(false) };
}
