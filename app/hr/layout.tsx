'use client';

import AppLayout from '@/components/layout/AppLayout';
import { usePathname } from 'next/navigation';
import { getHrSection } from '@/lib/hrNav';

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = getHrSection(pathname);

  return (
    <AppLayout
      title={meta.title}
      subtitle={meta.subtitle}
      allowedRoles={['business_owner', 'hr_manager']}
    >
      {children}
    </AppLayout>
  );
}
