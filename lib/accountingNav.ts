import {
  LayoutDashboard, BookMarked, Receipt, BookOpen, ArrowDownCircle, ArrowUpCircle,
  FileText, Landmark, DollarSign, Activity, TrendingUp, RotateCcw,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type AccountingSectionSlug =
  | 'overview' | 'accounts' | 'expenses' | 'journal'
  | 'ar' | 'ap' | 'vendor-bills' | 'credit-notes' | 'reconciliation'
  | 'pl' | 'bs' | 'cashflow' | 'budget' | 'tax' | 'trial-balance'
  | 'invoices' | 'periods' | 'refunds';

export interface AccountingNavItem {
  slug: AccountingSectionSlug;
  label: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
}

export const ACCOUNTING_SECTIONS: AccountingNavItem[] = [
  // ── Dashboard ──────────────────────────────────────────────────────────────
  { slug: 'overview',       label: 'Overview',       title: 'Accounting Overview',    subtitle: 'Financial summary and quick actions',        icon: LayoutDashboard },

  // ── Transactions ───────────────────────────────────────────────────────────
  { slug: 'invoices',       label: 'Invoices',       title: 'Invoices',               subtitle: 'Create and manage customer invoices',        icon: FileText },
  { slug: 'ar',             label: 'Receivables',    title: 'Accounts Receivable',    subtitle: 'Customer invoices and aging',                icon: ArrowDownCircle },
  { slug: 'expenses',       label: 'Expenses',       title: 'Expenses',               subtitle: 'Record and track business expenses',         icon: Receipt },
  { slug: 'ap',             label: 'Payables',       title: 'Accounts Payable',       subtitle: 'Supplier balances and payments',             icon: ArrowUpCircle },
  { slug: 'vendor-bills',   label: 'Vendor Bills',   title: 'Vendor Bills',           subtitle: 'Non-PO supplier invoices',                   icon: Receipt },
  { slug: 'credit-notes',   label: 'Credit Notes',   title: 'Credit Notes',           subtitle: 'Customer refunds and adjustments',           icon: FileText },
  { slug: 'refunds',        label: 'Refunds',        title: 'Refund Records',          subtitle: 'POS and storefront refund history',          icon: RotateCcw },

  // ── Ledger ─────────────────────────────────────────────────────────────────
  { slug: 'journal',        label: 'Journal',        title: 'Journal Entries',        subtitle: 'Manual general ledger postings',             icon: BookOpen },
  { slug: 'accounts',       label: 'Accounts',       title: 'Chart of Accounts',      subtitle: 'Manage GL accounts and balances',            icon: BookMarked },
  { slug: 'reconciliation', label: 'Reconciliation', title: 'Bank Reconciliation',    subtitle: 'Match bank statements to the ledger',        icon: Landmark },
  { slug: 'periods',        label: 'Periods',        title: 'Fiscal Periods',         subtitle: 'Open, close and year-end processing',        icon: Landmark },

  // ── Reports ────────────────────────────────────────────────────────────────
  { slug: 'pl',             label: 'P&L Report',     title: 'Profit & Loss',          subtitle: 'Income statement from the general ledger',   icon: FileText },
  { slug: 'bs',             label: 'Balance Sheet',  title: 'Balance Sheet',          subtitle: 'Assets, liabilities and equity snapshot',    icon: DollarSign },
  { slug: 'cashflow',       label: 'Cash Flow',      title: 'Cash Flow Statement',    subtitle: 'Cash movement from GL activity',             icon: Activity },
  { slug: 'trial-balance',  label: 'Trial Balance',  title: 'Trial Balance',          subtitle: 'Debit and credit balances as of date',       icon: BookOpen },
  { slug: 'budget',         label: 'Budget',         title: 'Budget vs Actual',       subtitle: 'Plan and compare spending',                  icon: TrendingUp },
  { slug: 'tax',            label: 'Tax / VAT',      title: 'Tax & VAT',              subtitle: 'Tax rates and VAT returns',                  icon: Receipt },
];

const SLUG_SET = new Set(ACCOUNTING_SECTIONS.map((s) => s.slug));

export function isAccountingSection(slug: string): slug is AccountingSectionSlug {
  return SLUG_SET.has(slug as AccountingSectionSlug);
}

export function getAccountingSection(pathname: string): AccountingNavItem {
  const parts = pathname.split('/').filter(Boolean);
  const slug = parts[1] || 'overview';
  return ACCOUNTING_SECTIONS.find((s) => s.slug === slug) || ACCOUNTING_SECTIONS[0];
}

export function accountingHref(slug: AccountingSectionSlug) {
  return `/accounting/${slug}`;
}
