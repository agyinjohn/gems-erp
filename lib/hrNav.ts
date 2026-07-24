import { LayoutDashboard, Users, Clock, Umbrella, Banknote, Wallet } from 'lucide-react';
import type { ComponentType } from 'react';

export type HrSectionSlug = 'dashboard' | 'employees' | 'attendance' | 'leave' | 'payroll' | 'loans';

export interface HrNavItem {
  slug: HrSectionSlug;
  label: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
}

export const HR_SECTIONS: HrNavItem[] = [
  {
    slug: 'dashboard',
    label: 'Overview',
    title: 'HR Overview',
    subtitle: 'Workforce overview, approvals and a printable HR report',
    icon: LayoutDashboard,
  },
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
];

const SLUG_SET = new Set(HR_SECTIONS.map((s) => s.slug));

export function isHrSection(slug: string): slug is HrSectionSlug {
  return SLUG_SET.has(slug as HrSectionSlug);
}

export function getHrSection(pathname: string): HrNavItem {
  const parts = pathname.split('/').filter(Boolean);
  const slug = parts[1] || 'dashboard';
  return HR_SECTIONS.find((s) => s.slug === slug) || HR_SECTIONS[0];
}

export function hrHref(slug: HrSectionSlug) {
  return `/hr/${slug}`;
}
