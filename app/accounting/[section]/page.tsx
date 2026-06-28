'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AccountingWorkspace from '@/components/accounting/AccountingWorkspace';
import { isAccountingSection } from '@/lib/accountingNav';

export default function AccountingSectionPage() {
  const params = useParams();
  const router = useRouter();
  const section = String(params.section || 'overview');

  useEffect(() => {
    if (!isAccountingSection(section)) {
      router.replace('/accounting/overview');
    }
  }, [section, router]);

  if (!isAccountingSection(section)) {
    return null;
  }

  return <AccountingWorkspace section={section} />;
}
