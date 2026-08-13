'use client';

import dynamic from 'next/dynamic';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth';
import { counterName } from '@/lib/counter';

const PosTerminal = dynamic(() => import('@/components/pos/PosTerminal'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#0D3B6E] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function POSPage() {
  const { tenant } = useAuth();
  const name = counterName(tenant?.sells);

  return (
    <AppLayout
      title={name.title}
      subtitle={name.subtitle}
      allowedRoles={['business_owner', 'branch_manager', 'sales_staff']}
    >
      <PosTerminal />
    </AppLayout>
  );
}