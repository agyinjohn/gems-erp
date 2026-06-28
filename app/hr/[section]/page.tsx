'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import HrWorkspace from '@/components/hr/HrWorkspace';
import { isHrSection } from '@/lib/hrNav';

export default function HrSectionPage() {
  const params = useParams();
  const router = useRouter();
  const section = String(params.section || 'employees');

  useEffect(() => {
    if (!isHrSection(section)) {
      router.replace('/hr/employees');
    }
  }, [section, router]);

  if (!isHrSection(section)) {
    return null;
  }

  return <HrWorkspace section={section} />;
}
