import { HR_SECTIONS } from '@/lib/hrNav';
import { ACCOUNTING_SECTIONS } from '@/lib/accountingNav';

/**
 * Page-level access for custom roles.
 *
 * Every page a custom role can be given is listed here. A page is granted by
 * the key `page:<href>`. Roles saved before page-level access existed only hold
 * module keys ("hr.view"), which keep opening every page of that module; roles
 * saved from the role builder carry PAGES_V2 and are judged by page keys alone.
 */
export interface PageDef {
  href: string;
  label: string;
  group: string;
  /** The module key that used to grant this page, if any. */
  legacy: string | null;
  /** Open to every signed-in user; not offered in the role builder. */
  always?: boolean;
}

export const PAGES_V2 = 'pages.v2';
export const pageKey = (href: string) => `page:${href}`;

const HR: PageDef[] = HR_SECTIONS.map(s => ({ href: `/hr/${s.slug}`, label: s.label, group: 'HR & Payroll', legacy: 'hr.view' }));
const ACC: PageDef[] = ACCOUNTING_SECTIONS.map(s => ({ href: `/accounting/${s.slug}`, label: s.label, group: 'Accounting', legacy: 'accounting.view' }));

export const PAGE_CATALOG: PageDef[] = [
  { href: '/dashboard',      label: 'Dashboard',        group: 'General', legacy: 'dashboard.view' },
  { href: '/ess',            label: 'My Portal',        group: 'General', legacy: 'ess.view' },
  { href: '/tasks',          label: 'My Tasks',         group: 'General', legacy: null, always: true },
  { href: '/account/security', label: 'Account security', group: 'General', legacy: null, always: true },

  { href: '/pos',            label: 'POS',              group: 'Sales & Stock', legacy: 'pos.view' },
  { href: '/pos/shifts',     label: 'Shift History',    group: 'Sales & Stock', legacy: 'pos.view' },
  { href: '/orders',         label: 'Orders / Sales',   group: 'Sales & Stock', legacy: 'orders.view' },
  { href: '/daily-sales',    label: 'Daily Sales',      group: 'Sales & Stock', legacy: 'reports.view' },
  { href: '/inventory',      label: 'Inventory',        group: 'Sales & Stock', legacy: 'inventory.view' },
  { href: '/assets',         label: 'Assets',           group: 'Sales & Stock', legacy: 'inventory.view' },
  { href: '/procurement',    label: 'Procurement',      group: 'Sales & Stock', legacy: 'procurement.view' },

  { href: '/crm',            label: 'Customers (CRM)',  group: 'Operations', legacy: 'crm.view' },
  { href: '/jobs',           label: 'Jobs',             group: 'Operations', legacy: null },
  { href: '/contracts',      label: 'Contracts',        group: 'Operations', legacy: null },
  { href: '/projects',       label: 'Projects',         group: 'Operations', legacy: null },
  { href: '/service-requests', label: 'Service requests', group: 'Operations', legacy: null },
  { href: '/labour',         label: 'Labour',           group: 'Operations', legacy: null },
  { href: '/service-catalog', label: 'Services & solutions', group: 'Operations', legacy: 'inventory.view' },
  { href: '/reviews',        label: 'Reviews',          group: 'Operations', legacy: null },

  ...HR,

  { href: '/payment-logs',   label: 'Payments',         group: 'Finance', legacy: 'accounting.view' },
  { href: '/refunds',        label: 'Refunds',          group: 'Finance', legacy: 'accounting.view' },
  { href: '/payouts',        label: 'Payouts',          group: 'Finance', legacy: null },
  { href: '/approvals',      label: 'Approvals',        group: 'Finance', legacy: 'accounting.view' },

  ...ACC,

  { href: '/reports',        label: 'Reports',          group: 'Reports', legacy: 'reports.view' },

  { href: '/store-settings', label: 'Online Store',     group: 'Settings', legacy: 'branches.manage' },
  { href: '/messaging',      label: 'Messaging',        group: 'Settings', legacy: null },
  { href: '/branches',       label: 'Branches',         group: 'Settings', legacy: 'branches.manage' },
  { href: '/departments',    label: 'Departments',      group: 'Settings', legacy: 'hr.view' },
  { href: '/users',          label: 'Users',            group: 'Settings', legacy: 'users.manage' },
  { href: '/billing',        label: 'Billing',          group: 'Settings', legacy: 'billing.view' },
  { href: '/activity',       label: 'Activity Log',     group: 'Settings', legacy: null },
];

/** Actions a role can take inside the pages it can open. */
export const ACTION_GROUPS = [
  { group: 'Inventory',   perms: [{ key: 'inventory.manage', label: 'Manage Inventory' }] },
  { group: 'Sales',       perms: [{ key: 'orders.manage', label: 'Manage Orders' }] },
  { group: 'Procurement', perms: [{ key: 'procurement.manage', label: 'Manage Procurement' }, { key: 'procurement.approve', label: 'Approve POs' }] },
  { group: 'Accounting',  perms: [{ key: 'accounting.manage', label: 'Manage Accounting' }] },
  { group: 'HR & Payroll', perms: [{ key: 'hr.manage', label: 'Manage HR' }, { key: 'hr.payroll', label: 'Run Payroll' }] },
  { group: 'CRM',         perms: [{ key: 'crm.manage', label: 'Manage CRM' }] },
];

/** Longest catalog entry that covers this path (so /hr/payroll/x belongs to /hr/payroll). */
export function findPage(pathname: string): PageDef | undefined {
  const clean = pathname.replace(/\/+$/, '') || '/';
  let best: PageDef | undefined;
  for (const p of PAGE_CATALOG) {
    if (clean === p.href || clean.startsWith(p.href + '/')) {
      if (!best || p.href.length > best.href.length) best = p;
    }
  }
  // /hr and /accounting alone are landing redirects to their first section.
  if (!best && clean === '/hr') return PAGE_CATALOG.find(p => p.href === '/hr/employees');
  if (!best && clean === '/accounting') return PAGE_CATALOG.find(p => p.href === '/accounting/overview');
  return best;
}

export function canAccessPage(perms: string[], page: PageDef): boolean {
  if (page.always) return true;
  if (perms.includes(pageKey(page.href))) return true;
  if (perms.includes(PAGES_V2)) return false;
  return !!page.legacy && perms.includes(page.legacy);
}

/** The page keys a role effectively grants, for showing a legacy role in the builder. */
export function effectivePageKeys(perms: string[]): string[] {
  return PAGE_CATALOG.filter(p => canAccessPage(perms, p)).map(p => pageKey(p.href));
}

/**
 * Turn the builder's selection into what is stored: the page keys, the action
 * keys, the v2 marker, and the module view keys the pages imply (kept so
 * anything still reading the old keys sees a consistent role).
 */
export function buildPermissions(pageKeys: string[], actionKeys: string[]): string[] {
  const legacy = PAGE_CATALOG.filter(p => p.legacy && pageKeys.includes(pageKey(p.href))).map(p => p.legacy as string);
  return [...new Set([PAGES_V2, ...pageKeys, ...actionKeys, ...legacy])];
}
