'use client';

import AppLayout from '@/components/layout/AppLayout';
import PosTerminal from '@/components/pos/PosTerminal';

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
