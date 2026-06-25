'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight,
  ChevronRight, Package, BarChart3, ShoppingCart,
  Users, Calculator, Truck, UserCheck, Shield, Sparkles,
  CheckCircle2,
} from 'lucide-react';

/* ─── constants ──────────────────────────────────────────────────────────── */

const DEMO_ACCOUNTS = [
  { label: 'Business Owner', email: 'owner@gems-store.com', password: 'Admin@1234', color: 'bg-violet-100 text-violet-700' },
  { label: 'Sales Staff', email: 'sales@gthink.com', password: 'Staff@1234', color: 'bg-blue-100 text-blue-700' },
  { label: 'Inventory', email: 'warehouse@gthink.com', password: 'Staff@1234', color: 'bg-cyan-100 text-cyan-700' },
  { label: 'Accountant', email: 'accounts@gthink.com', password: 'Staff@1234', color: 'bg-emerald-100 text-emerald-700' },
  { label: 'HR Manager', email: 'hr@gthink.com', password: 'Staff@1234', color: 'bg-pink-100 text-pink-700' },
  { label: 'Procurement', email: 'procurement@gthink.com', password: 'Staff@1234', color: 'bg-orange-100 text-orange-700' },
];

const MODULES = [
  { icon: Package, label: 'Stocks & Inventory', color: 'text-blue-400' },
  { icon: ShoppingCart, label: 'Sales, POS & eCommerce', color: 'text-violet-400' },
  { icon: Calculator, label: 'Accounting & Finance', color: 'text-amber-400' },
  { icon: Shield, label: 'Payment System', color: 'text-green-400' },
  { icon: Truck, label: 'Procurement', color: 'text-cyan-400' },
  { icon: Users, label: 'HR & Payroll', color: 'text-pink-400' },
  { icon: UserCheck, label: 'CRM', color: 'text-emerald-400' },
];

const TESTIMONIALS = [
  { quote: 'GEMS transformed how we run our 3 branches. Inventory is always accurate and our staff love the POS.', name: 'Kwame Asante', role: 'Owner, Asante Electronics' },
  { quote: 'The online storefront alone was worth it. We went from zero online sales to 40% of our revenue in 2 months.', name: 'Abena Mensah', role: 'Manager, Chic Boutique' },
  { quote: 'Finally an ERP that just works. Real-time reports and role-based access made all the difference.', name: 'Kofi Boateng', role: 'CFO, ProTools Ltd' },
  { quote: 'Payroll used to take us two days every month. With GEMS HR it takes under an hour. Game changer.', name: 'Efua Darko', role: 'HR Manager, Goldfields Trading' },
  { quote: 'Our procurement team now raises and approves purchase orders in minutes. Suppliers love the paperwork too.', name: 'Yaw Amponsah', role: 'Operations Director, BuildRight Ghana' },
  { quote: 'The accounting module gives me a live P&L at any time. I no longer wait for month-end reports.', name: 'Akosua Frimpong', role: 'Accountant, Sunrise Retail Ltd' },
  { quote: 'Setting up our branded storefront took less than a day. Customers are already ordering online.', name: 'Nana Adjei', role: 'Founder, Kente & Co.' },
  { quote: 'Role-based access means every staff member sees exactly what they need — nothing more, nothing less.', name: 'Kwesi Acheampong', role: 'IT Lead, Metro Distributors' },
];

/* ─── main page ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tIdx, setTIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTIdx(i => (i + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-[#060d1a]">

      {/* ── LEFT: immersive brand panel ────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col overflow-hidden">

        {/* Background photo */}
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80&auto=format&fit=crop')" }} />

        {/* Dark gradient overlay — keeps text legible */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(145deg, rgba(6,13,26,0.92) 0%, rgba(10,22,40,0.88) 40%, rgba(13,59,110,0.80) 100%)' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-10">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:bg-white/15 transition-colors backdrop-blur-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none tracking-tight">GEMS</div>
              <div className="text-[10px] text-blue-300/60 font-medium tracking-wide mt-0.5">GTHINK Enterprise Management System</div>
            </div>
          </Link>

          {/* Hero text */}
          <div className="mt-12 xl:mt-16">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-amber-400/90 mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              Smart Workplace
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
              Your entire business.<br />
              <span className="text-blue-300/80 font-normal">One smart system.</span>
            </h1>

          </div>

          {/* Module chips */}
          <div className="mt-8 flex flex-wrap gap-2">
            {MODULES.map(({ icon: Icon, label, color }) => (
              <div key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] border border-white/10 backdrop-blur-sm">
                <Icon className={`w-3 h-3 ${color}`} />
                <span className="text-[11px] font-medium text-white/75">{label}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-10 p-5 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm">
            <div className="text-2xl text-amber-400/60 leading-none mb-3">&ldquo;</div>
            <p className="text-sm text-white/80 leading-relaxed min-h-[60px] transition-all duration-500">
              {TESTIMONIALS[tIdx].quote}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {TESTIMONIALS[tIdx].name[0]}
              </div>
              <div>
                <div className="text-xs font-semibold text-white/90">{TESTIMONIALS[tIdx].name}</div>
                <div className="text-[10px] text-blue-300/50 mt-0.5">{TESTIMONIALS[tIdx].role}</div>
              </div>
              <div className="ml-auto flex gap-1">
                {TESTIMONIALS.map((_, i) => (
                  <button key={i} onClick={() => setTIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === tIdx ? 'bg-amber-400 w-4' : 'bg-white/20 hover:bg-white/40'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Stats footer */}
          <div className="mt-auto pt-10 flex items-center gap-8 border-t border-white/8">
            {[
              { value: '100+', label: 'Businesses' },
              { value: '12+', label: 'Modules' },
              { value: '99.9%', label: 'Uptime' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-xl font-bold text-white tabular-nums">{s.value}</div>
                <div className="text-[10px] text-blue-300/50 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: login form ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0D3B6E] flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="font-bold text-[#0D3B6E] text-base leading-none">GEMS</div>
              <div className="text-[9px] text-gray-400 font-medium tracking-wide mt-0.5">GTHINK Enterprise Management System</div>
            </div>
          </Link>
          <Link href="/register"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D3B6E] bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-colors">
            Sign up <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </header>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-10 lg:px-12 xl:px-16 py-10">
          <div
            className={`w-full max-w-[420px] transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
            style={{ transitionDelay: '100ms' }}
          >
            {/* Desktop header — hidden on mobile (shown in top bar) */}
            {/* <div className="hidden lg:block mb-8">
              <Link href="/" className="inline-flex items-center gap-2.5 group mb-8">
                <div className="w-10 h-10 rounded-xl bg-[#0D3B6E] flex items-center justify-center group-hover:bg-[#134a82] transition-colors">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-[#0D3B6E] text-lg leading-none">GEMS</div>
                  <div className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">GTHINK Enterprise Management System</div>
                </div>
              </Link>
            </div> */}

            {/* Heading */}
            <div className="mb-7 lg:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Welcome</h2>
              <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                Sign in to access your business workspace.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {error && (
                <div role="alert"
                  className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-sm animate-pop-in">
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email 
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D3B6E] transition-colors pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    autoFocus
                    placeholder="name@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50/60 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#0D3B6E]/50 focus:ring-4 focus:ring-[#0D3B6E]/8 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Password
                  </label>
                  <Link href="/forgot-password"
                    className="text-xs font-semibold text-[#0D3B6E] hover:text-[#134a82] transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D3B6E] transition-colors pointer-events-none" />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 bg-gray-50/60 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#0D3B6E]/50 focus:ring-4 focus:ring-[#0D3B6E]/8 transition-all"
                  />
                  <button type="button"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-shine w-full h-12 rounded-xl bg-[#0D3B6E] hover:bg-[#134a82] active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0D3B6E]/30 transition-all mt-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</>
                  : <>Sign in to dashboard <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowDemo(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-200 hover:border-[#0D3B6E]/30 hover:bg-blue-50/40 transition-all text-left group"
              >
                <span className="w-8 h-8 rounded-lg bg-[#0D3B6E]/8 text-[#0D3B6E] flex items-center justify-center shrink-0 group-hover:bg-[#0D3B6E]/12 transition-colors">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-800">Try with a demo account</span>
                  <span className="block text-xs text-gray-400 mt-0.5">Auto-fill credentials by role</span>
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${showDemo ? 'rotate-90' : ''}`} />
              </button>

              {showDemo && (
                <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50/60 divide-y divide-gray-100 overflow-hidden animate-panel-in">
                  {DEMO_ACCOUNTS.map(acc => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => { setEmail(acc.email); setPassword(acc.password); setShowDemo(false); setError(''); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white transition-colors text-left group"
                    >
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${acc.color}`}>
                        {acc.label}
                      </span>
                      <span className="text-xs text-gray-400 truncate flex-1">{acc.email}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0D3B6E] shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-7 pt-6 border-t border-gray-100 flex flex-col gap-3">
              <div className="flex items-center justify-center gap-5 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#0D3B6E]/50" /> SSL secured
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" /> 14-day free trial
                </span>
              </div>
              <p className="text-center text-xs text-gray-400">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-[#0D3B6E] hover:underline">
                  Create one free
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <footer className="px-6 py-3 text-center text-[11px] text-gray-300 border-t border-gray-100">
          © {new Date().getFullYear()} GTHINK Company Limited · GEMS — GTHINK Enterprise Management System
        </footer>
      </div>

    </div>
  );
}
