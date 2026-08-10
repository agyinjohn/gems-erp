'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSidebar } from './SidebarContext';
import { ToastContainer, toast } from '@/components/ui';
import ChatWidget from '@/components/ChatWidget';

// Map routes to their required module key
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/procurement': 'procurement',
  '/hr':          'hr',
  '/crm':         'crm',
  '/orders':      'sales',
  '/inventory':   'inventory',
  '/service-catalog': 'inventory',
  '/pos':         'pos',
  '/reports':     'reports',
  '/store-settings': 'online_storefront',
  '/accounting':  'advanced_accounting',
  '/projects':    'projects',
  '/contracts':   'projects',
  '/jobs':        'projects',
  '/labour':      'projects',
};

function getRequiredModule(pathname: string): string | null {
  for (const [prefix, mod] of Object.entries(ROUTE_MODULE_MAP)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return mod;
  }
  return null;
}

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  allowedRoles?: string[];
}

export default function AppLayout({ children, title, subtitle, allowedRoles }: Props) {
  const { user, loading, tenant, hasModule } = useAuth();
  const pathname = usePathname();

  // Days until subscription expires
  const daysLeft = tenant?.subscription_expires_at
    ? Math.ceil((new Date(tenant.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const router = useRouter();
  const { open: sidebarOpen, collapsed: sidebarCollapsed, setOpen: setSidebarOpen, toggleCollapsed: toggleSidebarCollapse } = useSidebar();

  /**
   * Evict any service worker controlling the back office.
   *
   * The storefront's offline shell was once registered at the origin root, so a
   * single visit to a shop page left it in charge of every admin page too —
   * serving build assets from a cache that outlived the deploy they belonged
   * to, which is how a page ends up unable to load. Narrowing the scope stops
   * that happening again, but does nothing for the registrations already out
   * there: only these pages can clear those, because only these pages are the
   * ones being wrongly controlled.
   *
   * Runs once, does nothing when nothing is controlling, and reloads only if it
   * actually removed something — the page in front of you was served by the
   * worker being removed.
   */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!navigator.serviceWorker.controller) return;

    let cancelled = false;
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(
        regs
          .filter((r) => !new URL(r.scope).pathname.startsWith('/store/'))
          .map((r) => r.unregister()),
      ))
      .then((results) => {
        if (cancelled || !results.some(Boolean)) return;
        return caches?.keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {})
          .then(() => { if (!cancelled) window.location.reload(); });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      if (!['business_owner'].includes(user.role)) {
        router.push(user.role === 'platform_admin' ? '/platform' : user.role === 'employee' ? '/ess' : '/dashboard');
        return;
      }
    }
    // Module access gate
    if (!loading && user && tenant) {
      const requiredModule = getRequiredModule(pathname);
      if (requiredModule && !hasModule(requiredModule)) {
        toast.error('Your current plan does not include this feature. Upgrade to unlock it.');
        router.push('/dashboard');
      }
    }
  }, [user, loading, router, allowedRoles, pathname, tenant, hasModule]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading GEMS…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh h-dvh bg-gray-50 overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />
      <div
        className={`flex-1 flex flex-col overflow-hidden min-w-0 transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        }`}
      >
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={toggleSidebarCollapse}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-w-0">
          {/* Subscription expiry banner */}
          {tenant && daysLeft !== null && daysLeft <= 7 && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${
              daysLeft <= 0 ? 'bg-red-50 border border-red-200 text-red-700' :
              daysLeft <= 3 ? 'bg-orange-50 border border-orange-200 text-orange-700' :
              'bg-yellow-50 border border-yellow-200 text-yellow-700'
            }`}>
              <span>
                {daysLeft <= 0
                  ? 'Your subscription has expired. Please renew to avoid losing access.'
                  : `Your subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now to avoid interruption.`
                }
              </span>
              <a href="/billing" className="ml-4 underline font-bold flex-shrink-0">Renew</a>
            </div>
          )}
          {children}
        </main>
        <ToastContainer />
      </div>
      <ChatWidget />
    </div>
  );
}
