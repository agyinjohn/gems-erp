'use client';

import AppLayout from '@/components/layout/AppLayout';
import RefundsPanel from '@/components/finance/RefundsPanel';

/**
 * Money given back.
 *
 * Filed under Finance next to Payments and Payouts, because that is what it is
 * — the same money moving the other way, recorded as it happens at the till or
 * on the store. It sat inside Accounting, which is where the ledger entry for a
 * refund ends up, not where somebody goes to ask what was refunded last week.
 */
export default function RefundsPage() {
  return (
    <AppLayout
      title="Refunds"
      subtitle="Money given back, and what it was given back on"
      allowedRoles={['business_owner', 'branch_manager', 'accountant']}
    >
      <RefundsPanel />
    </AppLayout>
  );
}
