import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import ResponsiveDebug from '@/components/ResponsiveDebug';

// Roboto, self-hosted by next/font and exposed as a CSS variable so it maps
// cleanly onto Tailwind's --font-sans (see @theme in globals.css).
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GEMS — Smart Workplace | Your Business. One System.',
  description: 'GEMS by GTHINK — All-in-one platform for Stocks, Inventory, Sales, Payment, Procurement, Finance, HR, and CRM. Manage your entire business from one place.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={roboto.variable}>
      <body suppressHydrationWarning>
        <AuthProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </AuthProvider>
        <ResponsiveDebug />
      </body>
    </html>
  );
}
