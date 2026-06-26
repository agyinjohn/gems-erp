'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ToastContainer } from '@/components/ui';

const POS_ROLES = ['business_owner', 'branch_manager', 'sales_staff'];

export default function PosShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !POS_ROLES.includes(user.role)) {
      if (user.role !== 'business_owner') {
        router.push(user.role === 'platform_admin' ? '/platform' : user.role === 'employee' ? '/ess' : '/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading POS…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 min-h-0 flex flex-col">
        {children}
      </div>
      <ToastContainer />
    </div>
  );
}
