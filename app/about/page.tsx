import Link from 'next/link';
import { Package, Users, Globe, Zap, Shield, ArrowRight, CheckCircle } from 'lucide-react';

export const metadata = { title: 'About Us — GEMS by GTHINK' };

const VALUES = [
  { icon: Zap,      title: 'Speed',       desc: 'We build fast, ship fast, and help your business move fast.' },
  { icon: Shield,   title: 'Trust',        desc: 'Security and reliability are at the core of everything we build.' },
  { icon: Users,    title: 'People First', desc: 'We design for real people running real businesses in Africa and beyond.' },
  { icon: Globe,    title: 'Accessibility',desc: 'Powerful ERP tools should not be reserved for large corporations.' },
];

const TEAM = [
  { name: 'Kwame Asante',  role: 'CEO & Co-Founder',      avatar: 'K', color: 'from-blue-500 to-blue-700' },
  { name: 'Abena Mensah',  role: 'CTO & Co-Founder',      avatar: 'A', color: 'from-purple-500 to-purple-700' },
  { name: 'Kofi Boateng',  role: 'Head of Product',       avatar: 'K', color: 'from-orange-400 to-orange-600' },
  { name: 'Ama Darko',     role: 'Head of Customer Success', avatar: 'A', color: 'from-green-500 to-green-700' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Navbar */}
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
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D3B6E] hover:underline">
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1.5 rounded-full mb-6">About Us</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">Built in Africa.<br /><span className="text-yellow-400">Built for Africa.</span></h1>
          <p className="text-blue-200 text-lg leading-relaxed">GEMS is a product of GTHINK Company Limited — a technology company on a mission to give every growing business access to enterprise-grade management tools.</p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Our Mission</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Empowering businesses with tools that actually work</h2>
            <p className="text-gray-500 leading-relaxed mb-4">We started GEMS because we saw too many businesses in Ghana and across Africa struggling with spreadsheets, disconnected tools, and expensive ERP systems built for the West.</p>
            <p className="text-gray-500 leading-relaxed">GEMS brings Inventory, Sales, Procurement, Finance, HR, and CRM into one affordable, easy-to-use platform — built specifically for the way African businesses operate.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[['100+', 'Businesses'], ['10', 'Modules'], ['99.9%', 'Uptime'], ['24/7', 'Support']].map(([v, l]) => (
              <div key={l} className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                <div className="text-3xl font-extrabold text-[#0D3B6E] mb-1">{v}</div>
                <div className="text-sm text-gray-400">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Our Values</span>
            <h2 className="text-3xl font-extrabold text-gray-900">What we stand for</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-blue-50 text-[#0D3B6E] rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">The Team</span>
            <h2 className="text-3xl font-extrabold text-gray-900">The people behind GEMS</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map(({ name, role, avatar, color }) => (
              <div key={name} className="text-center">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-extrabold text-xl mx-auto mb-3`}>{avatar}</div>
                <div className="font-semibold text-gray-900">{name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#0D3B6E] to-[#1A5294] py-16 px-6 text-white text-center">
        <h2 className="text-2xl font-extrabold mb-4">Ready to get started?</h2>
        <p className="text-blue-200 mb-8">Join 100+ businesses already running on GEMS.</p>
        <Link href="/register" className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-extrabold px-8 py-3.5 rounded-xl transition-colors">
          Start Free Trial <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <div className="bg-gray-900 text-center py-4">
        <p className="text-gray-500 text-xs">Copyright © 2026 GTHINK Company Limited — All rights reserved</p>
      </div>
    </div>
  );
}
