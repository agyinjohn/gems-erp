import type { Metadata } from 'next';
import { Roboto, Playfair_Display } from 'next/font/google';
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

// A high-contrast display serif, for storefront headlines only. The thin
// strokes and the swell into the thick ones are the whole reason an editorial
// hero reads as expensive rather than as a page with big text on it, and no
// weight of a grotesque gets near it. Loaded at 400 and 500 only — this face
// is never set small or bold, so the rest would be bytes nobody sees.
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500'],
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
    <html lang="en" data-scroll-behavior="smooth" className={`${roboto.variable} ${playfair.variable}`}>
      <body suppressHydrationWarning>
        <AuthProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </AuthProvider>
        <ResponsiveDebug />
      </body>
    </html>
  );
}
