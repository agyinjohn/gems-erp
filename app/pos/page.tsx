'use client';

import dynamic from 'next/dynamic';
import AppLayout from '@/components/layout/AppLayout';

const PosTerminal = dynamic(() => import('@/components/pos/PosTerminal'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#0D3B6E] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function POSPage() {
  return (
    <AppLayout
      title="Point of Sale"
      subtitle="Walk-in sales terminal"
      allowedRoles={['business_owner', 'branch_manager', 'sales_staff']}
    >
      <PosTerminal />
    </AppLayout>
  );
}