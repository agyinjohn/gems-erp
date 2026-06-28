'use client';

import AppLayout from '@/components/layout/AppLayout';
import { usePathname } from 'next/navigation';
import { getAccountingSection } from '@/lib/accountingNav';

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = getAccountingSection(pathname);

  return (
    <AppLayout title={meta.title} subtitle={meta.subtitle} allowedRoles={['business_owner', 'accountant']}>
      {children}
    </AppLayout>
  );
}
