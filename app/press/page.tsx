import Link from 'next/link';
import { Package, Download } from 'lucide-react';

export const metadata = { title: 'Press — GEMS by GTHINK' };

const PRESS = [
  { outlet: 'Ghana Business News', title: 'GTHINK Launches GEMS ERP Platform for African SMEs', date: 'May 2025' },
  { outlet: 'Tech in Africa',      title: 'How GEMS is Digitising Business Operations Across Ghana', date: 'April 2025' },
  { outlet: 'Graphic Business',    title: 'Local Tech Firm Builds All-in-One ERP for Growing Businesses', date: 'March 2025' },
];

export default function PressPage() {
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
          <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1.5 rounded-full mb-6">Press</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">GEMS in the News</h1>
          <p className="text-blue-200 text-lg">Press coverage, media resources and brand assets for journalists and media partners.</p>
        </div>
      </section>

      {/* Press Coverage */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8">Recent Coverage</h2>
          <div className="space-y-4">
            {PRESS.map(item => (
              <div key={item.title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-[#0D3B6E] mb-1">{item.outlet} · {item.date}</div>
                  <div className="font-semibold text-gray-900">{item.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Assets */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Brand Assets</h2>
          <p className="text-gray-500 mb-8">Download official GEMS logos, brand guidelines and product screenshots for media use.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {['Logo Pack (PNG/SVG)', 'Brand Guidelines PDF', 'Product Screenshots'].map(asset => (
              <div key={asset} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between hover:shadow-sm transition-shadow">
                <span className="text-sm font-medium text-gray-700">{asset}</span>
                <Download className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press Contact */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Press Enquiries</h2>
          <p className="text-gray-500 mb-6">For interviews, quotes or media requests, reach out to our press team directly.</p>
          <a href="mailto:gthinkcompanylimited@gmail.com?subject=Press Enquiry"
            className="inline-flex items-center gap-2 bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold px-8 py-3.5 rounded-xl transition-colors">
            Contact Press Team
          </a>
        </div>
      </section>

      <div className="bg-gray-900 text-center py-4">
        <p className="text-gray-500 text-xs">Copyright © 2026 GTHINK Company Limited — All rights reserved</p>
      </div>
    </div>
  );
}
