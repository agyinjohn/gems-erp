'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState, useEffect, type ComponentType } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Calculator,
  Users, UserCheck, BarChart2, Store, Settings, Building2, UserCircle,
  X, Monitor, TrendingUp, CreditCard, ChevronDown,
  MessageCircle, CheckSquare, Wrench, ShoppingBag, BookOpen, History,
} from 'lucide-react';
import { isNavAllowed, PRODUCT_MODE, PRODUCT_LABELS } from '@/lib/productMode';
import { ACCOUNTING_SECTIONS } from '@/lib/accountingNav';
import { HR_SECTIONS } from '@/lib/hrNav';

/** Sidebar highlight — avoid parent /pos matching /pos/shifts */
function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/accounting/overview' && pathname === '/accounting') return true;
  if (href === '/hr/employees' && pathname === '/hr') return true;
  if (href === '/platform' || href === '/dashboard') return false;
  if (href === '/pos') {
    return (
      pathname.startsWith('/pos/terminal') ||
      pathname.startsWith('/pos/customer-display')
    );
  }
  return pathname.startsWith(`${href}/`);
}

function SidebarLink({
  href, label, icon: Icon, isActive, collapsed, onNavigate,
}: {
  href: string; label: string; icon: ComponentType<{ className?: string }>;
  isActive: boolean; collapsed: boolean; onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`sidebar-link ${isActive ? 'active' : 'inactive'} ${collapsed ? 'justify-center !px-2 !gap-0' : ''}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

const navGroups = [
  {
    label: null,
    items: [
      { href: '/platform',               label: 'Dashboard',     icon: LayoutDashboard, roles: ['platform_admin'],                                          permission: null },
      { href: '/platform/tenants',       label: 'Businesses',    icon: Building2,       roles: ['platform_admin'],                                          permission: null },
      { href: '/platform/subscriptions', label: 'Subscriptions', icon: Calculator,      roles: ['platform_admin'],                                          permission: null },
      { href: '/platform/revenue',       label: 'Revenue',       icon: TrendingUp,      roles: ['platform_admin'],                                          permission: null },
      { href: '/platform/activity',      label: 'Activity',      icon: BarChart2,       roles: ['platform_admin'],                                          permission: null },
      { href: '/platform/settings',      label: 'Settings',      icon: Settings,        roles: ['platform_admin'],                                          permission: null },
      { href: '/platform/support',       label: 'Support Chat',  icon: MessageCircle,   roles: ['platform_admin'],                                          permission: null },
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['business_owner','branch_manager','warehouse_staff','accountant','hr_manager','procurement_officer'], permission: 'dashboard.view' },
      { href: '/ess',       label: 'My Portal', icon: UserCircle,      roles: ['branch_manager','warehouse_staff','accountant','hr_manager','procurement_officer','employee'],      permission: 'ess.view' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/pos',    label: 'POS Terminal', icon: Monitor,      roles: ['sales_staff'], permission: 'pos.view' },
      { href: '/pos/shifts', label: 'Shift History', icon: History, roles: ['sales_staff'], permission: 'pos.view' },
      { href: '/orders', label: 'Orders',       icon: ShoppingCart, roles: ['sales_staff'], permission: 'orders.view' },
      { href: '/crm',    label: 'Customers',    icon: UserCheck,    roles: ['sales_staff'], permission: 'crm.view' },
    ],
  },
  {
    label: null,
    items: [
      { href: '/ess', label: 'My Portal', icon: UserCircle, roles: ['sales_staff'], permission: 'ess.view' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/pos',         label: 'POS',         icon: Monitor,      roles: ['business_owner','branch_manager'],                    permission: 'pos.view' },
      { href: '/pos/shifts',  label: 'Shift History', icon: History,    roles: ['business_owner','branch_manager'],                    permission: 'pos.view' },
      { href: '/orders',      label: 'Sales',       icon: ShoppingCart, roles: ['business_owner','branch_manager'],                    permission: 'orders.view' },
      { href: '/inventory',   label: 'Inventory',   icon: Package,      roles: ['business_owner','branch_manager','warehouse_staff'],  permission: 'inventory.view' },
      { href: '/assets',      label: 'Assets',      icon: Wrench,       roles: ['business_owner','branch_manager','warehouse_staff'],  permission: 'inventory.view' },
      { href: '/procurement', label: 'Procurement', icon: Truck,        roles: ['business_owner','procurement_officer','warehouse_staff'], permission: 'procurement.view' },
    ],
  },
  {
    label: 'HR & Payroll',
    items: HR_SECTIONS.map((s) => ({
      href: `/hr/${s.slug}`,
      label: s.label,
      icon: s.icon,
      roles: ['business_owner', 'hr_manager'],
      permission: 'hr.view',
    })),
  },
  {
    label: 'People',
    items: [
      { href: '/departments', label: 'Departments', icon: Building2, roles: ['business_owner', 'hr_manager'], permission: 'hr.view' },
    ],
  },
  {
    label: 'Accounting',
    items: ACCOUNTING_SECTIONS.map((s) => ({
      href: `/accounting/${s.slug}`,
      label: s.label,
      icon: s.icon,
      roles: ['business_owner', 'accountant'],
      permission: 'accounting.view',
    })),
  },
  {
    label: 'Finance',
    items: [
      { href: '/payment-logs', label: 'Payments',   icon: CreditCard, roles: ['business_owner','accountant'], permission: 'accounting.view' },
    ],
  },
  {
    label: 'Approvals',
    items: [
      { href: '/approvals', label: 'Approvals', icon: CheckSquare, roles: ['business_owner','accountant','hr_manager'], permission: 'accounting.view' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart2, roles: ['business_owner','accountant','hr_manager'], permission: 'reports.view' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { href: '/crm', label: 'CRM', icon: UserCheck, roles: ['business_owner','branch_manager'], permission: 'crm.view' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/store-settings', label: 'Online Store', icon: ShoppingBag, roles: ['business_owner', 'branch_manager'], permission: 'branches.manage' },
      { href: '/catalog',         label: 'Catalog',      icon: Package,      roles: ['business_owner', 'branch_manager', 'warehouse_staff'], permission: 'inventory.view' },
      { href: '/branches',     label: 'Branches',     icon: Store,      roles: ['business_owner'],                   permission: 'branches.manage' },
      { href: '/users',        label: 'Users',        icon: Settings,   roles: ['business_owner'],                   permission: 'users.manage' },
      { href: '/billing',      label: 'Billing',      icon: Calculator, roles: ['business_owner'],                   permission: 'billing.view' },
      { href: '/api-docs',     label: 'Store API',    icon: BookOpen,   roles: ['business_owner', 'branch_manager'], permission: 'branches.manage' },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
}

export default function Sidebar({ open, onClose, collapsed }: Props) {
  const pathname = usePathname();
  const { user, tenant } = useAuth();

  // Build initial collapsed state — auto-open the group that contains the active route
  const getInitialOpen = () => {
    const state: Record<string, boolean> = {};
    navGroups.forEach((group, gi) => {
      if (!group.label) return;
      state[gi] = true; // all groups open by default
    });
    return state;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpen);

  // Save & restore sidebar scroll position across navigations
  useEffect(() => {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    const saved = sessionStorage.getItem('sidebar-scroll');
    if (saved) nav.scrollTop = parseInt(saved);
    const onScroll = () => sessionStorage.setItem('sidebar-scroll', String(nav.scrollTop));
    nav.addEventListener('scroll', onScroll);
    return () => nav.removeEventListener('scroll', onScroll);
  }, [pathname]);

  // Re-evaluate when pathname changes
  useEffect(() => {
    setOpenGroups(prev => {
      const next = { ...prev };
      navGroups.forEach((group, gi) => {
        if (!group.label) return;
        const hasActive = group.items.some(item => isNavActive(pathname, item.href));
        if (hasActive) next[gi] = true;
      });
      return next;
    });
  }, [pathname]);

  const toggle = (gi: number) => setOpenGroups(prev => ({ ...prev, [gi]: !prev[gi] }));

  const filterByProductMode = (items: typeof navGroups[0]['items']) =>
    items.filter((item) => isNavAllowed(item.href));

  const renderContent = (isCollapsed: boolean) => (
    <aside className="h-full w-full flex flex-col" style={{ background: 'linear-gradient(180deg, #0D3B6E 0%, #1A5294 100%)' }}>

      {/* Logo */}
      <div className={`border-b border-white/10 flex items-center shrink-0 ${
        isCollapsed ? 'justify-center px-2 py-4' : 'px-4 py-4 justify-between gap-2'
      }`}>
        {isCollapsed ? (
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center" title="GEMS">
            <Building2 className="w-5 h-5 text-blue-900" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-blue-900" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-bold text-lg leading-tight">{PRODUCT_LABELS[PRODUCT_MODE] || 'GEMS'}</div>
                <div className="text-blue-200 text-xs truncate uppercase">{tenant?.business_name || 'Business Portal'}</div>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 shrink-0" aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav id="sidebar-nav" className={`flex-1 py-4 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {(() => {
          const isAdminOrOwner = user?.role === 'platform_admin' || user?.role === 'business_owner';
          const isCustom = user?.role === 'custom';
          const perms: string[] = (user as any)?.permissions || [];

          // ── Custom role: flat list driven purely by permissions ──
          if (isCustom) {
            const seen = new Set<string>();
            const items = filterByProductMode(
              navGroups.flatMap(g => g.items).filter(item => {
                if (!item.permission) return false;
                if (seen.has(item.href)) return false;
                if (!perms.includes(item.permission)) return false;
                seen.add(item.href);
                return true;
              }),
            );
            const main = items.filter(i => i.href !== '/ess');
            const ess  = items.find(i => i.href === '/ess');
            return (
              <div className="space-y-0.5">
                {main.map(item => {
                  const isActive = isNavActive(pathname, item.href);
                  return (
                    <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon}
                      isActive={isActive} collapsed={isCollapsed} onNavigate={onClose} />
                  );
                })}
                {ess && (
                  <>
                    <div className="my-2 border-t border-white/10" />
                    <SidebarLink href="/ess" label="My Portal" icon={UserCircle}
                      isActive={pathname === '/ess'} collapsed={isCollapsed} onNavigate={onClose} />
                  </>
                )}
              </div>
            );
          }

          // ── Business owner / platform admin: full grouped nav ──
          if (isAdminOrOwner) {
            // Full grouped nav with labels
            return navGroups.map((group, gi) => {
              const visibleItems = filterByProductMode(group.items.filter(item => user && item.roles.includes(user.role)));
              if (!visibleItems.length) return null;

              if (!group.label) {
                return (
                  <div key={gi} className="mb-1">
                    {visibleItems.map(item => {
                      const isActive = isNavActive(pathname, item.href);
                      return (
                        <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon}
                          isActive={isActive} collapsed={isCollapsed} onNavigate={onClose} />
                      );
                    })}
                  </div>
                );
              }

              const isExpanded = isCollapsed || !!openGroups[gi];

              return (
                <div key={gi} className="mb-1">
                  {!isCollapsed && (
                    <button
                      onClick={() => toggle(gi)}
                      className="w-full flex items-center justify-between px-3 py-1.5 mt-3 mb-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-blue-100/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span>{group.label}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                  {isCollapsed && <div className="my-2 border-t border-white/10 first:mt-0" />}
                  {isExpanded && (
                    <div className={`space-y-0.5 ${isCollapsed ? '' : 'mt-0.5'}`}>
                      {visibleItems.map(item => {
                        const isActive = isNavActive(pathname, item.href);
                        return (
                          <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon}
                            isActive={isActive} collapsed={isCollapsed} onNavigate={onClose} />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          }

          // ── Other roles: flat list ──
          // Non-admin/owner: flat list, no labels, My Portal always last
          const allItems = navGroups.flatMap(g => g.items);
          const seen = new Set<string>();
          const flat = filterByProductMode(allItems.filter(item => {
            if (!user || !item.roles.includes(user.role)) return false;
            if (item.href === '/ess') return false;
            if (seen.has(item.href)) return false;
            seen.add(item.href);
            return true;
          }));
          const myPortal = allItems.find(item => item.href === '/ess' && item.roles.includes(user?.role || ''));

          return (
            <div className="space-y-0.5">
              {flat.map(item => {
                const isActive = isNavActive(pathname, item.href);
                return (
                  <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon}
                    isActive={isActive} collapsed={isCollapsed} onNavigate={onClose} />
                );
              })}
              {myPortal && (
                <>
                  <div className="my-2 border-t border-white/10" />
                  <SidebarLink href="/ess" label="My Portal" icon={UserCircle}
                    isActive={pathname === '/ess' || pathname.startsWith('/ess/')}
                    collapsed={isCollapsed} onNavigate={onClose} />
                </>
              )}
            </div>
          );
        })()}
      </nav>

      {/* GEMS Store */}
      {tenant?.slug && user?.role !== 'platform_admin' && (PRODUCT_MODE === 'full' || PRODUCT_MODE === 'storefront') && (
        <div className={isCollapsed ? 'px-2 pb-2' : 'px-3 pb-3'}>
          <a
            href={`/store/${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            title={isCollapsed ? 'GEMS Store' : undefined}
            className={`flex items-center rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
            }`}
          >
            <Store className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && 'GEMS Store'}
          </a>
        </div>
      )}

      {/* User Info */}
      <div className={`border-t border-white/10 ${isCollapsed ? 'px-2 py-3' : 'px-3 py-4'}`}>
        {isCollapsed ? (
          <div
            className="w-10 h-10 mx-auto rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold"
            title={`${user?.name}\n${user?.email}`}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        ) : (
          <>
            <div className="px-4 py-3 rounded-lg bg-white/10">
              <div className="text-white text-sm font-medium truncate">{user?.name}</div>
              <div className="text-blue-200 text-xs truncate">{user?.email}</div>
            </div>
            <div className="text-blue-300 text-[10px] mt-2 text-center truncate uppercase">GTHINK Enterprise Management System</div>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <div
        className={`hidden lg:block fixed left-0 top-0 h-dvh z-30 transition-[width] duration-300 ease-in-out ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderContent(collapsed)}
      </div>

      {/* Mobile: overlay drawer — always expanded */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="relative w-64 max-w-[85vw] h-full shadow-2xl">
            {renderContent(false)}
          </div>
        </div>
      )}
    </>
  );
}
