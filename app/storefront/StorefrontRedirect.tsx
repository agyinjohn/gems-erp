'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

/** Legacy route — redirects to the tenant-scoped storefront. */
export default function StorefrontRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const slug = searchParams.get('slug') || tenant?.slug || 'gems-store';
    router.replace(`/store/${slug}`);
  }, [loading, router, searchParams, tenant?.slug]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-gray-50">
      <Spinner />
      <p className="text-sm text-gray-500">Opening store…</p>
    </div>
  );
}
