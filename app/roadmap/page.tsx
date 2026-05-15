import Link from 'next/link';
import { Package, CheckCircle, Clock, Zap } from 'lucide-react';

export const metadata = { title: 'Roadmap — GEMS by GTHINK' };

const ROADMAP = [
  {
    quarter: 'Q1 2025',
    status: 'done',
    items: [
      'Core ERP modules (Inventory, Sales, Accounting, Procurement)',
      'Built-in POS terminal',
      'Paystack card payment integration',
      'Multi-tenant platform architecture',
      'Role-based access control',
    ],
  },
  {
    quarter: 'Q2 2025',
    status: 'done',
    items: [
      'HR & Payroll module',
      'CRM with lead pipeline',
      'Public branded storefront',
      'Mobile money payments (MTN, Vodafone, AirtelTigo)',
      'Employee Self-Service (ESS) portal',
    ],
  },
  {
    quarter: 'Q3 2025',
    status: 'current',
    items: [
      'SMS & Email notification system',
      'Advanced analytics & custom reports',
      'Mobile app (iOS & Android)',
      'Barcode scanner integration',
      'Bulk product import via CSV',
    ],
  },
  {
    quarter: 'Q4 2025',
    status: 'planned',
    items: [
      'API access for third-party integrations',
      'Automated payroll tax calculations (Ghana SSNIT & PAYE)',
      'Multi-currency support',
      'Offline POS mode',
      'WhatsApp order notifications',
    ],
  },
  {
    quarter: 'Q1 2026',
    status: 'planned',
    items: [
      'AI-powered demand forecasting',
      'Supplier portal for procurement',
      'Customer loyalty & rewards programme',
      'Advanced HR: performance reviews & appraisals',
      'GEMS marketplace for add-ons',
    ],
  },
];

const STATUS = {
  done:    { label: 'Completed', color: 'bg-green-100 text-green-700',  icon: CheckCircle, dot: 'bg-green-500' },
  current: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Zap,          dot: 'bg-blue-500' },
  planned: { label: 'Planned',   color: 'bg-gray-100 text-gray-500',   icon: Clock,        dot: 'bg-gray-300' },
};

export default function RoadmapPage() {
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
          <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1.5 rounded-full mb-6">Roadmap</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Where GEMS is Headed</h1>
          <p className="text-blue-200 text-lg">Our public roadmap — see what we've built, what we're building, and what's coming next.</p>
        </div>
      </section>

      {/* Legend */}
      <div className="max-w-3xl mx-auto px-6 pt-10 flex items-center gap-6 flex-wrap">
        {Object.entries(STATUS).map(([key, { label, color, icon: Icon }]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>
              <Icon className="w-3 h-3" />{label}
            </span>
          </div>
        ))}
      </div>

      <section className="py-10 px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {ROADMAP.map(({ quarter, status, items }) => {
            const s = STATUS[status as keyof typeof STATUS];
            const Icon = s.icon;
            return (
              <div key={quarter} className={`border rounded-2xl overflow-hidden ${status === 'current' ? 'border-[#0D3B6E]/30 shadow-md shadow-blue-50' : 'border-gray-100'}`}>
                <div className={`flex items-center justify-between px-6 py-4 ${status === 'current' ? 'bg-blue-50' : 'bg-gray-50'} border-b border-gray-100`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                    <span className="font-extrabold text-gray-900">{quarter}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>
                    <Icon className="w-3 h-3" />{s.label}
                  </span>
                </div>
                <div className="px-6 py-5 space-y-2.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${status === 'done' ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={`text-sm ${status === 'done' ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto mt-10 text-center">
          <p className="text-sm text-gray-400">Have a feature request? <a href="mailto:gthinkcompanylimited@gmail.com?subject=Feature Request" className="text-[#0D3B6E] font-semibold hover:underline">Let us know</a></p>
        </div>
      </section>

      <div className="bg-gray-900 text-center py-4">
        <p className="text-gray-500 text-xs">Copyright © 2026 GTHINK Company Limited — All rights reserved</p>
      </div>
    </div>
  );
}
