'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight,
  ChevronRight, Package,
  Users, Calculator, Truck, UserCheck, Shield, Sparkles,
  CheckCircle2, ShoppingCart,
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

const STATS = [
  { value: '100+', label: 'Businesses' },
  { value: '12+', label: 'Modules' },
  { value: '99.9%', label: 'Uptime' },
];

const METRIC_CARDS = [
  { label: "Today's Revenue", value: 'GH₵ 8,420', change: '+12%', up: true },
  { label: 'Orders', value: '34', change: '+5', up: true },
  { label: 'Low Stock Items', value: '7', change: '-2', up: false },
  { label: 'Active Staff', value: '12', change: '', up: true },
];

const RECENT_ORDERS = [
  { ref: 'ORD-2041', customer: 'Abena M.', amount: 'GH₵ 340', status: 'paid' },
  { ref: 'ORD-2040', customer: 'Kwame A.', amount: 'GH₵ 820', status: 'processing' },
  { ref: 'ORD-2039', customer: 'Efua D.', amount: 'GH₵ 155', status: 'paid' },
  { ref: 'ORD-2038', customer: 'Yaw K.', amount: 'GH₵ 610', status: 'shipped' },
];

const STATUS_COLOR: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-blue-100 text-blue-700',
};

const BAR_HEIGHTS = [35, 55, 42, 70, 60, 85, 65, 90, 75, 88, 72, 95];

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

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
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

          {/* Dashboard mockup */}
          <div className="mt-10 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm overflow-hidden">
            {/* Mockup top bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400/70" />
                <div className="w-2 h-2 rounded-full bg-amber-400/70" />
                <div className="w-2 h-2 rounded-full bg-green-400/70" />
              </div>
              <span className="text-[10px] text-white/30 font-mono">gems · dashboard</span>
              <div className="w-12" />
            </div>

            <div className="p-4 space-y-3">
              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-2">
                {METRIC_CARDS.map(m => (
                  <div key={m.label} className="bg-white/[0.05] rounded-xl px-3 py-2.5 border border-white/8">
                    <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1">{m.label}</div>
                    <div className="text-sm font-bold text-white">{m.value}</div>
                    {m.change && (
                      <div className={`text-[9px] font-semibold mt-0.5 ${m.up ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.up ? '▲' : '▼'} {m.change} vs yesterday
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Mini bar chart */}
              <div className="bg-white/[0.04] rounded-xl px-3 pt-3 pb-2 border border-white/8">
                <div className="text-[9px] text-white/40 uppercase tracking-wider mb-2">Revenue — last 12 days</div>
                <div className="flex items-end gap-1 h-10">
                  {BAR_HEIGHTS.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-blue-400/40"
                      style={{ height: `${h}%`, opacity: i === BAR_HEIGHTS.length - 1 ? 1 : 0.5 + (i / BAR_HEIGHTS.length) * 0.5 }}
                    />
                  ))}
                </div>
              </div>

              {/* Recent orders */}
              <div className="bg-white/[0.04] rounded-xl border border-white/8 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/8">
                  <span className="text-[9px] text-white/40 uppercase tracking-wider">Recent orders</span>
                </div>
                {RECENT_ORDERS.map((o, i) => (
                  <div key={o.ref} className={`flex items-center justify-between px-3 py-1.5 ${i !== RECENT_ORDERS.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-white/50">{o.ref}</span>
                      <span className="text-[9px] text-white/70">{o.customer}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold text-white/80">{o.amount}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[o.status]}`}>{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats footer */}
          <div className="mt-auto pt-10 flex items-center gap-8 border-t border-white/8">
            {STATS.map(s => (
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
