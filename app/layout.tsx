import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import ResponsiveDebug from '@/components/ResponsiveDebug';

// Inter — the industry-standard SaaS sans-serif. Tighter and more modern than
// Roboto, with better optical sizing at both display and body scales. Loaded
// across the full weight range so headings, labels and body copy all pull from
// the same face without a flash of fallback.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

// Playfair Display — a high-contrast editorial serif for landing page headlines
// and storefront hero text. The hairline-to-slab contrast is what makes a big
// headline read as premium rather than just large. Never set small or bold —
// the face is designed to be used at display size at its normal weight.
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-display',
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
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${playfair.variable}`}>
      <body suppressHydrationWarning>
        <AuthProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </AuthProvider>
        <ResponsiveDebug />
      </body>
    </html>
  );
}
