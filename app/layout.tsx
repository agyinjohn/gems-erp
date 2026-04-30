import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GEMS — Smart Workplace | Your Business. One System.',
  description: 'GEMS by GTHINK — All-in-one platform for Stocks, Inventory, Sales, Payment, Procurement, Finance, HR, and CRM. Manage your entire business from one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
