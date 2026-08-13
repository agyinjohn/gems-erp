'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AccountingWorkspace from '@/components/accounting/AccountingWorkspace';
import { isAccountingSection, MOVED_SECTIONS } from '@/lib/accountingNav';

export default function AccountingSectionPage() {
  const params = useParams();
  const router = useRouter();
  const section = String(params.section || 'overview');

  useEffect(() => {
    // A section that has moved keeps its old link working; anything else
    // unrecognised falls back to the overview.
    const moved = MOVED_SECTIONS[section];
    if (moved) router.replace(moved);
    else if (!isAccountingSection(section)) router.replace('/accounting/overview');
  }, [section, router]);

  if (!isAccountingSection(section)) {
    return null;
  }

  return <AccountingWorkspace section={section} />;
}
