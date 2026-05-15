import Link from 'next/link';
import { Package, ArrowRight, CheckCircle } from 'lucide-react';

export const metadata = { title: 'Partners — GEMS by GTHINK' };

const BENEFITS = [
  'Revenue share on every referral',
  'Co-marketing opportunities',
  'Early access to new features',
  'Dedicated partner support',
  'Partner badge & certification',
  'Joint case studies & press',
];

const TYPES = [
  {
    title: 'Referral Partners',
    desc: 'Refer businesses to GEMS and earn a commission on every successful subscription. Perfect for consultants, accountants and business advisors.',
    color: 'bg-blue-50 border-blue-100',
    accent: 'text-blue-600',
  },
  {
    title: 'Technology Partners',
    desc: 'Integrate your software or platform with GEMS via our API. Reach thousands of businesses already using GEMS every day.',
    color: 'bg-purple-50 border-purple-100',
    accent: 'text-purple-600',
  },
  {
    title: 'Implementation Partners',
    desc: 'Help businesses onboard, configure and get the most out of GEMS. Ideal for IT firms and ERP consultants across Africa.',
    color: 'bg-green-50 border-green-100',
    accent: 'text-green-600',
  },
];

export default function PartnersPage() {
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
          <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1.5 rounded-full mb-6">Partners</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Grow Together with GEMS</h1>
          <p className="text-blue-200 text-lg">Join our partner ecosystem and help businesses across Africa run smarter — while building a new revenue stream for yourself.</p>
        </div>
      </section>

      {/* Partner Types */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Partnership Types</span>
            <h2 className="text-3xl font-extrabold text-gray-900">Find the right partnership for you</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TYPES.map(({ title, desc, color, accent }) => (
              <div key={title} className={`rounded-2xl border p-6 ${color}`}>
                <h3 className={`font-extrabold text-lg mb-3 ${accent}`}>{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-gray-900">Partner Benefits</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map(b => (
              <div key={b} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-5 py-4">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 font-medium">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Ready to become a partner?</h2>
        <p className="text-gray-500 mb-8 max-w-xl mx-auto">Get in touch with our partnerships team and we will find the best way to work together.</p>
        <a href="mailto:gthinkcompanylimited@gmail.com?subject=Partnership Enquiry"
          className="inline-flex items-center gap-2 bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold px-8 py-3.5 rounded-xl transition-colors">
          Apply to Partner <ArrowRight className="w-4 h-4" />
        </a>
      </section>

      <div className="bg-gray-900 text-center py-4">
        <p className="text-gray-500 text-xs">Copyright © 2026 GTHINK Company Limited — All rights reserved</p>
      </div>
    </div>
  );
}
