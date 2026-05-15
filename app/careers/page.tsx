import Link from 'next/link';
import { Package, ArrowRight, MapPin, Clock } from 'lucide-react';

export const metadata = { title: 'Careers — GEMS by GTHINK' };

const OPENINGS = [
  { title: 'Full-Stack Developer',       dept: 'Engineering',  type: 'Full-time', location: 'Accra, Ghana', color: 'bg-blue-50 text-blue-600' },
  { title: 'Product Designer (UI/UX)',   dept: 'Design',       type: 'Full-time', location: 'Accra, Ghana', color: 'bg-purple-50 text-purple-600' },
  { title: 'Customer Success Manager',   dept: 'Support',      type: 'Full-time', location: 'Remote',       color: 'bg-green-50 text-green-600' },
  { title: 'Sales & Partnerships Lead',  dept: 'Sales',        type: 'Full-time', location: 'Accra, Ghana', color: 'bg-orange-50 text-orange-600' },
  { title: 'Backend Engineer (Node.js)', dept: 'Engineering',  type: 'Contract',  location: 'Remote',       color: 'bg-cyan-50 text-cyan-600' },
];

const PERKS = [
  '🏥 Health insurance',
  '🏠 Remote-friendly',
  '📚 Learning & development budget',
  '🎯 Performance bonuses',
  '🌍 Work on products used across Africa',
  '⚡ Fast-moving, no-bureaucracy culture',
];

export default function CareersPage() {
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
          <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1.5 rounded-full mb-6">Careers</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Join the GTHINK Team</h1>
          <p className="text-blue-200 text-lg">Help us build the future of business management in Africa. We are a small, ambitious team that moves fast and ships great products.</p>
        </div>
      </section>

      {/* Perks */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-gray-900">Why work with us?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERKS.map(p => (
              <div key={p} className="bg-white border border-gray-100 rounded-xl px-5 py-4 text-sm text-gray-700 font-medium">{p}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Openings */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Open Roles</span>
            <h2 className="text-2xl font-extrabold text-gray-900">Current openings</h2>
          </div>
          <div className="space-y-4">
            {OPENINGS.map(job => (
              <div key={job.title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${job.color}`}>{job.dept}</span>
                  <div>
                    <div className="font-bold text-gray-900">{job.title}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{job.type}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{job.location}</span>
                    </div>
                  </div>
                </div>
                <a href={`mailto:gthinkcompanylimited@gmail.com?subject=Application: ${job.title}`}
                  className="inline-flex items-center gap-1.5 bg-[#0D3B6E] hover:bg-[#1A5294] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0">
                  Apply <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-8">Don't see a role that fits? Send your CV to <a href="mailto:gthinkcompanylimited@gmail.com" className="text-[#0D3B6E] font-semibold hover:underline">gthinkcompanylimited@gmail.com</a></p>
        </div>
      </section>

      <div className="bg-gray-900 text-center py-4">
        <p className="text-gray-500 text-xs">Copyright © 2026 GTHINK Company Limited — All rights reserved</p>
      </div>
    </div>
  );
}
