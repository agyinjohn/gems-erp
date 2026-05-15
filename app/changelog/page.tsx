import Link from 'next/link';
import { Package, CheckCircle, Zap, Shield, Star } from 'lucide-react';

export const metadata = { title: 'Changelog — GEMS by GTHINK' };

const RELEASES = [
  {
    version: 'v1.4.0',
    date: 'June 2025',
    tag: 'Latest',
    tagColor: 'bg-green-100 text-green-700',
    changes: [
      { type: 'new',  text: 'SMS & Email notification channels added to contact forms' },
      { type: 'new',  text: 'Call floating action button on landing page' },
      { type: 'new',  text: 'Payment System module added to features section' },
      { type: 'fix',  text: 'Testimonial card height alignment fixed across screen sizes' },
      { type: 'imp',  text: 'Stocks & Inventory description now clearly differentiates the two concepts' },
    ],
  },
  {
    version: 'v1.3.0',
    date: 'May 2025',
    tag: 'Stable',
    tagColor: 'bg-blue-100 text-blue-700',
    changes: [
      { type: 'new',  text: 'Multi-branch inventory management' },
      { type: 'new',  text: 'Paystack mobile money integration (MTN, Vodafone, AirtelTigo)' },
      { type: 'new',  text: 'Employee Self-Service (ESS) portal' },
      { type: 'imp',  text: 'Dashboard performance improved by 40%' },
      { type: 'fix',  text: 'POS receipt printing on mobile devices' },
    ],
  },
  {
    version: 'v1.2.0',
    date: 'April 2025',
    tag: 'Stable',
    tagColor: 'bg-blue-100 text-blue-700',
    changes: [
      { type: 'new',  text: 'CRM lead pipeline with drag-and-drop stages' },
      { type: 'new',  text: 'Procurement approval workflows' },
      { type: 'new',  text: 'Public storefront with branded URL' },
      { type: 'imp',  text: 'Accounting module now supports bank reconciliation' },
      { type: 'sec',  text: 'JWT token refresh mechanism hardened' },
    ],
  },
  {
    version: 'v1.1.0',
    date: 'March 2025',
    tag: 'Stable',
    tagColor: 'bg-blue-100 text-blue-700',
    changes: [
      { type: 'new',  text: 'HR & Payroll module with leave management' },
      { type: 'new',  text: 'Role-based access control (RBAC) for all modules' },
      { type: 'new',  text: 'Real-time reports and analytics dashboard' },
      { type: 'fix',  text: 'Order status sync between POS and online storefront' },
    ],
  },
  {
    version: 'v1.0.0',
    date: 'January 2025',
    tag: 'Launch',
    tagColor: 'bg-yellow-100 text-yellow-700',
    changes: [
      { type: 'new',  text: 'Initial launch of GEMS platform' },
      { type: 'new',  text: 'Inventory, Sales, Accounting, and Procurement modules' },
      { type: 'new',  text: 'Built-in POS terminal' },
      { type: 'new',  text: 'Paystack card payment integration' },
      { type: 'new',  text: 'Multi-tenant architecture for platform admin' },
    ],
  },
];

const TYPE_STYLES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'New',         color: 'bg-blue-50 text-blue-600',   icon: Star },
  fix: { label: 'Fix',         color: 'bg-red-50 text-red-500',     icon: CheckCircle },
  imp: { label: 'Improvement', color: 'bg-purple-50 text-purple-600', icon: Zap },
  sec: { label: 'Security',    color: 'bg-green-50 text-green-600', icon: Shield },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#0D3B6E] rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-xl text-[#0D3B6E]">GEMS</div>
              <div className="text-[10px] text-gray-400">GTHINK Enterprise Management System</div>
            </div>
          </Link>
          <Link href="/" className="text-sm font-semibold text-[#0D3B6E] hover:underline">← Back to Home</Link>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1.5 rounded-full mb-6">Changelog</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">What's New in GEMS</h1>
          <p className="text-blue-200 text-lg">Every update, improvement and fix — documented here.</p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto space-y-10">
          {RELEASES.map(release => (
            <div key={release.version} className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-gray-900 text-lg">{release.version}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${release.tagColor}`}>{release.tag}</span>
                </div>
                <span className="text-sm text-gray-400">{release.date}</span>
              </div>
              <div className="px-6 py-5 space-y-3">
                {release.changes.map((change, i) => {
                  const style = TYPE_STYLES[change.type];
                  const Icon = style.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${style.color}`}>
                        <Icon className="w-2.5 h-2.5" />{style.label}
                      </span>
                      <span className="text-sm text-gray-600">{change.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-gray-900 text-center py-4">
        <p className="text-gray-500 text-xs">Copyright © 2026 GTHINK Company Limited — All rights reserved</p>
      </div>
    </div>
  );
}
