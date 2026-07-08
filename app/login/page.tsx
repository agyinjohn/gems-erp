'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight,
  ChevronRight, Package, Shield, Sparkles, CheckCircle2,
  BarChart3, Users, Calculator, Truck, UserCheck, ShoppingCart,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Business Owner', email: 'owner@gems-store.com', password: 'Admin@1234', color: 'bg-violet-100 text-violet-700' },
  { label: 'Sales Staff', email: 'sales@gthink.com', password: 'Staff@1234', color: 'bg-blue-100 text-blue-700' },
  { label: 'Inventory', email: 'warehouse@gthink.com', password: 'Staff@1234', color: 'bg-cyan-100 text-cyan-700' },
  { label: 'Accountant', email: 'accounts@gthink.com', password: 'Staff@1234', color: 'bg-emerald-100 text-emerald-700' },
  { label: 'HR Manager', email: 'hr@gthink.com', password: 'Staff@1234', color: 'bg-pink-100 text-pink-700' },
  { label: 'Procurement', email: 'procurement@gthink.com', password: 'Staff@1234', color: 'bg-orange-100 text-orange-700' },
];

const FEATURES = [
  { icon: ShoppingCart, label: 'Sales & POS', desc: 'Orders, invoices & storefront' },
  { icon: BarChart3, label: 'Accounting', desc: 'GL, AP/AR & financial reports' },
  { icon: Package, label: 'Inventory', desc: 'Stock tracking & procurement' },
  { icon: Users, label: 'HR & Payroll', desc: 'Staff, leave & payslips' },
  { icon: UserCheck, label: 'CRM', desc: 'Customers & relationships' },
  { icon: Calculator, label: 'Reports', desc: 'Insights across all modules' },
];

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
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .dot-bg {
          background-color: #060d1a;
          background-image: radial-gradient(circle, rgba(255,255,255,0.11) 1px, transparent 1px);
          background-size: 26px 26px;
        }
        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
      `}</style>

      <div className="flex flex-col lg:flex-row h-dvh lg:overflow-hidden">

        {/* ── LEFT: dark branded panel ─────────────────────────────────────── */}
        <div className="dot-bg hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col relative overflow-hidden h-full">

          {/* Glow orbs for depth */}
          <div className="glow-orb w-[420px] h-[420px] bg-blue-600/20 top-[-80px] left-[-80px]" />
          <div className="glow-orb w-[300px] h-[300px] bg-indigo-500/15 bottom-[10%] right-[-60px]" />

          <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-12">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-lg leading-none tracking-tight">GEMS</div>
                <div className="text-[10px] text-blue-300/60 font-medium tracking-wide mt-0.5">GTHINK Enterprise Management System</div>
              </div>
            </div>

            {/* Hero */}
            <div className="mt-16 xl:mt-20">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-amber-400/80 mb-4">
                <span className="w-4 h-px bg-amber-400/60" />
                All-in-one ERP
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15] tracking-tight">
                Run your entire<br />
                <span className="text-blue-300/80 font-light">business smarter.</span>
              </h1>
              <p className="mt-4 text-sm text-white/45 leading-relaxed max-w-sm">
                From inventory to payroll, sales to accounting — everything your team needs in one place.
              </p>
            </div>

            {/* Feature grid */}
            <div className="mt-12 grid grid-cols-2 gap-3">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-blue-300" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/85">{label}</div>
                    <div className="text-[10px] text-white/35 mt-0.5 leading-snug">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom stats */}
            <div className="mt-auto pt-10">
              <div className="flex items-center gap-px mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-2 text-xs text-white/40">Trusted by 100+ businesses</span>
              </div>
              <p className="text-[11px] text-white/25">
                © {new Date().getFullYear()} GTHINK Company Limited
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT: white form panel ───────────────────────────────────────── */}
        <div className="flex-1 bg-white flex flex-col lg:overflow-hidden">

          {/* Mobile top bar */}
          <header className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0D3B6E] flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-[#0D3B6E] text-base leading-none">GEMS</div>
                <div className="text-[9px] text-gray-400 tracking-wide mt-0.5">GTHINK Enterprise Management System</div>
              </div>
            </div>
            <Link href="/register" className="text-xs font-semibold text-[#0D3B6E] bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-colors inline-flex items-center gap-1">
              Sign up <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </header>

          {/* Form area — vertically centered */}
          <div className="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-14 xl:px-20 py-12 lg:overflow-y-auto">
            <div
              className={`w-full max-w-[400px] transition-all duration-500 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              {/* Desktop logo — hidden on mobile */}
              {/* <div className="hidden lg:flex items-center gap-3 mb-10">
                <div className="w-9 h-9 rounded-xl bg-[#0D3B6E] flex items-center justify-center shadow-md shadow-[#0D3B6E]/20">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-[#0D3B6E] text-base leading-none">GEMS</div>
                  <div className="text-[10px] text-gray-400 tracking-wide mt-0.5">GTHINK Enterprise Management System</div>
                </div>
              </div> */}

              {/* Heading */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome</h2>
                <p className="text-gray-400 text-sm mt-1">Access your business workspace.</p>
              </div>

              {/* Error */}
              {error && (
                <div role="alert" className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-5">
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#0D3B6E]/60 focus:ring-4 focus:ring-[#0D3B6E]/8 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Password
                    </label>
                    <Link href="/forgot-password" className="text-xs font-semibold text-[#0D3B6E] hover:underline">
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
                      className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#0D3B6E]/60 focus:ring-4 focus:ring-[#0D3B6E]/8 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#0D3B6E] hover:bg-[#134a82] active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0D3B6E]/20 transition-all"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</>
                    : <>Sign in to dashboard <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>

              {/* Divider */}
              {/* <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div> */}

              {/* Demo accounts */}
              {/* <div>
                <button
                  type="button"
                  onClick={() => setShowDemo(v => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-200 hover:border-[#0D3B6E]/30 hover:bg-blue-50/40 transition-all text-left group"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#0D3B6E]/8 text-[#0D3B6E] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-gray-700">Try a demo account</span>
                    <span className="block text-xs text-gray-400 mt-0.5">Auto-fill credentials by role</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${showDemo ? 'rotate-90' : ''}`} />
                </button>

                {showDemo && (
                  <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 overflow-hidden">
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
              </div> */}

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#0D3B6E]/40" /> SSL secured
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500/60" /> 14-day free trial
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
          <footer className="px-8 py-3 border-t border-gray-100 text-center text-[11px] text-gray-300">
            © {new Date().getFullYear()} GTHINK Company Limited · GEMS — GTHINK Enterprise Management System
          </footer>
        </div>

      </div>
    </>
  );
}
