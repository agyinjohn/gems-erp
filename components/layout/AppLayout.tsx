'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from './Sidebar';
import Header from './Header';
import { ToastContainer } from '@/components/ui';
import ChatWidget from '@/components/ChatWidget';

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  allowedRoles?: string[];
}

export default function AppLayout({ children, title, subtitle, allowedRoles }: Props) {
  const { user, loading, tenant } = useAuth();

  // Days until subscription expires
  const daysLeft = tenant?.subscription_expires_at
    ? Math.ceil((new Date(tenant.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      if (!['business_owner'].includes(user.role)) {
        router.push(user.role === 'platform_admin' ? '/platform' : user.role === 'employee' ? '/ess' : '/dashboard');
      }
    }
  }, [user, loading, router, allowedRoles]);

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {/* Subscription expiry banner */}
          {tenant && daysLeft !== null && daysLeft <= 7 && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between ${
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
