'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Calculator,
  Users, UserCheck, BarChart2, Store, Settings, Building2, UserCircle
} from 'lucide-react';

const allNavItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard, roles: ['super_admin','sales_staff','warehouse_staff','accountant','hr_manager','procurement_officer'] },
  { href: '/ess',         label: 'My Portal',   icon: UserCircle,      roles: ['super_admin','sales_staff','warehouse_staff','accountant','hr_manager','procurement_officer'] },
  { href: '/inventory',   label: 'Inventory',   icon: Package,         roles: ['super_admin','warehouse_staff'] },
  { href: '/orders',      label: 'Sales',       icon: ShoppingCart,    roles: ['super_admin','sales_staff'] },
  { href: '/procurement', label: 'Procurement', icon: Truck,           roles: ['super_admin','procurement_officer'] },
  { href: '/accounting',  label: 'Accounting',  icon: Calculator,      roles: ['super_admin','accountant'] },
  { href: '/hr',          label: 'HR & Payroll',icon: Users,           roles: ['super_admin','hr_manager'] },
  { href: '/departments', label: 'Departments', icon: Building2,       roles: ['super_admin','hr_manager'] },
  { href: '/crm',         label: 'CRM',         icon: UserCheck,       roles: ['super_admin','sales_staff'] },
  { href: '/reports',     label: 'Reports',     icon: BarChart2,       roles: ['super_admin','accountant','hr_manager'] },
  { href: '/storefront',  label: 'Storefront',  icon: Store,           roles: ['super_admin','sales_staff'] },
  { href: '/users',       label: 'Users',       icon: Settings,        roles: ['super_admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = allNavItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-30" style={{ background: 'linear-gradient(180deg, #0D3B6E 0%, #1A5294 100%)' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">GThink</div>
            <div className="text-blue-200 text-xs">ERP System</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : 'inactive'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-4 py-3 rounded-lg bg-white/10">
          <div className="text-white text-sm font-medium truncate">{user?.name}</div>
          <div className="text-blue-200 text-xs truncate">{user?.email}</div>
        </div>
      </div>
    </aside>
  );
}
