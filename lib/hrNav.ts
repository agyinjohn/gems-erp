import { Users, Clock, Umbrella, Banknote, Wallet, Star } from 'lucide-react';
import type { ComponentType } from 'react';

export type HrSectionSlug = 'employees' | 'attendance' | 'leave' | 'payroll' | 'loans' | 'appraisals';

export interface HrNavItem {
  slug: HrSectionSlug;
  label: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
}

export const HR_SECTIONS: HrNavItem[] = [
  {
    slug: 'employees',
    label: 'Employees',
    title: 'Employees',
    subtitle: 'Staff records, documents and employment details',
    icon: Users,
  },
  {
    slug: 'attendance',
    label: 'Attendance',
    title: 'Attendance',
    subtitle: 'Daily attendance and bulk marking',
    icon: Clock,
  },
  {
    slug: 'leave',
    label: 'Leave',
    title: 'Leave Requests',
    subtitle: 'Apply for leave and approve requests',
    icon: Umbrella,
  },
  {
    slug: 'payroll',
    label: 'Payroll',
    title: 'Payroll',
    subtitle: 'Run payroll with PAYE and SSNIT',
    icon: Banknote,
  },
  {
    slug: 'loans',
    label: 'Loans',
    title: 'Loans & Advances',
    subtitle: 'Staff loans and salary advances, repaid automatically through payroll',
    icon: Wallet,
  },
  {
    slug: 'appraisals',
    label: 'Appraisals',
    title: 'Performance Appraisals',
    subtitle: 'Rate employees each period and share feedback',
    icon: Star,
  },
];

const SLUG_SET = new Set(HR_SECTIONS.map((s) => s.slug));

export function isHrSection(slug: string): slug is HrSectionSlug {
  return SLUG_SET.has(slug as HrSectionSlug);
}

export function getHrSection(pathname: string): HrNavItem {
  const parts = pathname.split('/').filter(Boolean);
  const slug = parts[1] || 'employees';
  return HR_SECTIONS.find((s) => s.slug === slug) || HR_SECTIONS[0];
}

export function hrHref(slug: HrSectionSlug) {
  return `/hr/${slug}`;
}
