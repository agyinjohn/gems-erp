'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Calculator,
  Users, UserCheck, BarChart2, Store, Settings, Building2, UserCircle,
  X, Monitor, TrendingUp, CreditCard, ChevronDown, MessageCircle,
} from 'lucide-react';

const navGroups = [
  {
    label: null,
    items: [
      { href: '/platform',               label: 'Dashboard',     icon: LayoutDashboard, roles: ['platform_admin'] },
      { href: '/platform/tenants',       label: 'Businesses',    icon: Building2,       roles: ['platform_admin'] },
      { href: '/platform/subscriptions', label: 'Subscriptions', icon: Calculator,      roles: ['platform_admin'] },
      { href: '/platform/revenue',       label: 'Revenue',       icon: TrendingUp,      roles: ['platform_admin'] },
      { href: '/platform/activity',      label: 'Activity',      icon: BarChart2,       roles: ['platform_admin'] },
      { href: '/platform/settings',      label: 'Settings',      icon: Settings,        roles: ['platform_admin'] },
      { href: '/platform/support',        label: 'Support Chat',  icon: MessageCircle,   roles: ['platform_admin'] },
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['business_owner','branch_manager','warehouse_staff','accountant','hr_manager','procurement_officer'] },
      { href: '/ess',       label: 'My Portal', icon: UserCircle,      roles: ['branch_manager','warehouse_staff','accountant','hr_manager','procurement_officer','employee'] },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/pos',    label: 'POS Terminal', icon: Monitor,      roles: ['sales_staff'] },
      { href: '/orders', label: 'Orders',       icon: ShoppingCart, roles: ['sales_staff'] },
      { href: '/crm',    label: 'Customers',    icon: UserCheck,    roles: ['sales_staff'] },
    ],
  },
  {
    label: null,
    items: [
      { href: '/ess', label: 'My Portal', icon: UserCircle, roles: ['sales_staff'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/pos',         label: 'POS',         icon: Monitor,      roles: ['business_owner','branch_manager'] },
      { href: '/orders',      label: 'Sales',       icon: ShoppingCart, roles: ['business_owner','branch_manager'] },
      { href: '/inventory',   label: 'Inventory',   icon: Package,      roles: ['business_owner','branch_manager','warehouse_staff'] },
      { href: '/procurement', label: 'Procurement', icon: Truck,        roles: ['business_owner','procurement_officer'] },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/hr',          label: 'HR & Payroll', icon: Users,     roles: ['business_owner','hr_manager'] },
      { href: '/departments', label: 'Departments',  icon: Building2, roles: ['business_owner','hr_manager'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/accounting',   label: 'Accounting', icon: Calculator, roles: ['business_owner','accountant'] },
      { href: '/payment-logs', label: 'Payments',   icon: CreditCard, roles: ['business_owner','accountant'] },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart2, roles: ['business_owner','accountant','hr_manager'] },
    ],
  },
  {
    label: 'Customers',
    items: [
      { href: '/crm', label: 'CRM', icon: UserCheck, roles: ['business_owner','branch_manager'] },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/branches', label: 'Branches', icon: Store,      roles: ['business_owner'] },
      { href: '/users',    label: 'Users',    icon: Settings,   roles: ['business_owner'] },
      { href: '/billing',  label: 'Billing',  icon: Calculator, roles: ['business_owner'] },
    ],
  },
];

interface Props { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: Props) {
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

  // Re-evaluate when pathname changes
  useEffect(() => {
    setOpenGroups(prev => {
      const next = { ...prev };
      navGroups.forEach((group, gi) => {
        if (!group.label) return;
        const hasActive = group.items.some(item =>
          pathname === item.href || pathname.startsWith(item.href + '/')
        );
        if (hasActive) next[gi] = true;
      });
      return next;
    });
  }, [pathname]);

  const toggle = (gi: number) => setOpenGroups(prev => ({ ...prev, [gi]: !prev[gi] }));

  const inner = (
    <aside className="h-full w-64 flex flex-col" style={{ background: 'linear-gradient(180deg, #0D3B6E 0%, #1A5294 100%)' }}>

      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">{tenant?.business_name || 'GEMS'}</div>
            <div className="text-blue-200 text-xs">GTHINK Enterprise Management System</div>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item => user && item.roles.includes(user.role));
          if (!visibleItems.length) return null;

          // Groups without a label render flat (no collapse)
          if (!group.label) {
            return (
              <div key={gi} className="mb-1">
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/platform' && item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                  return (
                    <Link key={item.href} href={item.href} onClick={onClose}
                      className={`sidebar-link ${isActive ? 'active' : 'inactive'}`}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          }

          const isExpanded = !!openGroups[gi];
          const hasActiveChild = visibleItems.some(item =>
            pathname === item.href || pathname.startsWith(item.href + '/')
          );

          return (
            <div key={gi} className="mb-1">
              {/* Collapsible header */}
              <button
                onClick={() => toggle(gi)}
                className="w-full flex items-center justify-between px-3 py-1.5 mt-3 mb-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-blue-100/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Items */}
              {isExpanded && (
                <div className="mt-0.5 space-y-0.5">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/platform' && item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                    return (
                      <Link key={item.href} href={item.href} onClick={onClose}
                        className={`sidebar-link ${isActive ? 'active' : 'inactive'}`}>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* GEMS Store */}
      {tenant?.slug && user?.role !== 'platform_admin' && (
        <div className="px-3 pb-3">
          <a
            href={`/store/${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Store className="w-4 h-4 flex-shrink-0" />
            GEMS Store
          </a>
        </div>
      )}

      {/* User Info */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-4 py-3 rounded-lg bg-white/10">
          <div className="text-white text-sm font-medium truncate">{user?.name}</div>
          <div className="text-blue-200 text-xs truncate">{user?.email}</div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen w-64 z-30">
        {inner}
      </div>

      {/* Mobile: overlay drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="relative w-64 h-full shadow-2xl">
            {inner}
          </div>
        </div>
      )}
    </>
  );
}
