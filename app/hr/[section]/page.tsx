'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import HrWorkspace from '@/components/hr/HrWorkspace';
import HrDashboard from '@/components/hr/HrDashboard';
import { isHrSection } from '@/lib/hrNav';

export default function HrSectionPage() {
  const params = useParams();
  const router = useRouter();
  const section = String(params.section || 'dashboard');

  useEffect(() => {
    if (!isHrSection(section)) {
      router.replace('/hr/dashboard');
    }
  }, [section, router]);

  if (!isHrSection(section)) {
    return null;
  }

  if (section === 'dashboard') {
    return <HrDashboard />;
  }

  return <HrWorkspace section={section} />;
}
