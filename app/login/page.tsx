'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  Package,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Shield,
  BarChart3,
  ShoppingCart,
  Users,
  Calculator,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const MODULES = [
  { icon: Package, label: 'Inventory' },
  { icon: ShoppingCart, label: 'Sales & POS' },
  { icon: Calculator, label: 'Finance' },
  { icon: Users, label: 'HR & CRM' },
];

const STATS = [
  { label: 'Businesses', value: '100+' },
  { label: 'Uptime', value: '99.9%' },
  { label: 'Modules', value: '12+' },
];

const DEMO_ACCOUNTS = [
  { label: 'Business Owner', email: 'owner@gems-store.com', password: 'Admin@1234' },
  { label: 'Sales Staff', email: 'sales@gthink.com', password: 'Staff@1234' },
  { label: 'Inventory', email: 'warehouse@gthink.com', password: 'Staff@1234' },
  { label: 'Accountant', email: 'accounts@gthink.com', password: 'Staff@1234' },
  { label: 'HR Manager', email: 'hr@gthink.com', password: 'Staff@1234' },
  { label: 'Procurement', email: 'procurement@gthink.com', password: 'Staff@1234' },
];

function DashboardPreview() {
  return (
    <div
      aria-hidden
      className="hidden xl:block absolute right-[4%] top-1/2 w-[420px] opacity-[0.18] pointer-events-none select-none"
      style={{ transform: 'translateY(-48%) perspective(1200px) rotateY(-12deg) rotateX(4deg)' }}
    >
      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0c1a2e]">
        <div className="flex h-[280px]">
          <div className="w-14 bg-[#0D3B6E] border-r border-white/5 p-2 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`h-2 rounded-full ${i === 1 ? 'bg-white/90 w-8' : 'bg-white/20 w-6'}`} />
            ))}
          </div>
          <div className="flex-1 p-4 space-y-3">
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-1 h-14 rounded-lg bg-white/10 border border-white/5" />
              ))}
            </div>
            <div className="h-24 rounded-lg bg-white/5 border border-white/5" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 rounded-lg bg-white/5" />
              <div className="h-16 rounded-lg bg-amber-400/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [showPw, setShowPw] = useState(false);
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
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-mesh-bg relative min-h-dvh flex flex-col overflow-x-hidden">

      <DashboardPreview />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 py-5 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center group-hover:bg-white/15 transition-colors">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-white font-bold text-lg leading-none tracking-tight">GEMS</div>
            <div className="text-[10px] text-blue-200/70 font-medium tracking-wide uppercase mt-0.5">
              Enterprise Platform
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex text-sm font-medium text-blue-200/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D3B6E] bg-white hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors shadow-lg shadow-black/20"
          >
            Get started
            <ChevronRight className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div
          className={`w-full max-w-[920px] transition-all duration-700 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="grid lg:grid-cols-5 rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.45)] border border-white/10">

            {/* Brand panel */}
            <div className="lg:col-span-2 relative bg-gradient-to-br from-[#0D3B6E] via-[#134a82] to-[#0a2540] p-7 sm:p-8 lg:p-9 flex flex-col justify-between min-h-[200px] lg:min-h-[520px]">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl" />
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                  }}
                />
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-amber-400/90 mb-5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Smart Workplace
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug tracking-tight">
                  One platform.
                  <br />
                  <span className="text-blue-200/90 font-normal">Every department.</span>
                </h1>
                <p className="mt-3 text-sm text-blue-200/70 leading-relaxed max-w-xs hidden sm:block">
                  Inventory, sales, finance, HR, procurement and eCommerce — unified for growing businesses.
                </p>
              </div>

              <div className="relative z-10 mt-6 lg:mt-0">
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {MODULES.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur-sm"
                    >
                      <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] font-medium text-white/85 truncate">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-5 border-t border-white/10">
                  {STATS.map(s => (
                    <div key={s.label}>
                      <div className="text-lg font-bold text-white tabular-nums">{s.value}</div>
                      <div className="text-[10px] text-blue-300/60 uppercase tracking-wider">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form panel */}
            <div className="lg:col-span-3 bg-white p-7 sm:p-8 lg:p-10 flex flex-col justify-center">
              <div className="w-full max-w-md mx-auto">
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in</h2>
                  <p className="text-gray-500 text-sm mt-1.5">
                    Access your business workspace with your credentials.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div
                      role="alert"
                      className="flex gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100"
                    >
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        !
                      </span>
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Email address
                    </label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D3B6E] transition-colors pointer-events-none" />
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        required
                        autoFocus
                        placeholder="name@company.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#0D3B6E]/40 focus:ring-4 focus:ring-[#0D3B6E]/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-[#0D3B6E] hover:text-[#1A5294] transition-colors"
                      >
                        Forgot?
                      </Link>
                    </div>
                    <div className="relative group">
                      <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D3B6E] transition-colors pointer-events-none" />
                      <input
                        id="login-password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        placeholder="••••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full h-12 pl-11 pr-12 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#0D3B6E]/40 focus:ring-4 focus:ring-[#0D3B6E]/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-slate-100 transition-colors"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 btn-shine bg-[#0D3B6E] hover:bg-[#134a82] disabled:opacity-50 disabled:pointer-events-none text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0D3B6E]/25 transition-colors mt-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authenticating…
                      </>
                    ) : (
                      <>
                        Continue to dashboard
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Demo */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDemo(v => !v)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors text-left"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-lg bg-[#0D3B6E]/10 text-[#0D3B6E] flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-800">Explore with demo access</span>
                        <span className="block text-xs text-gray-400">Select a role to auto-fill</span>
                      </span>
                    </span>
                    <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${showDemo ? 'rotate-90' : ''}`} />
                  </button>

                  {showDemo && (
                    <div className="mt-2 p-1 rounded-xl bg-slate-50 border border-slate-100 max-h-44 overflow-y-auto">
                      {DEMO_ACCOUNTS.map(account => (
                        <button
                          key={account.email}
                          type="button"
                          onClick={() => {
                            setEmail(account.email);
                            setPassword(account.password);
                            setShowDemo(false);
                            setError('');
                          }}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-white text-left transition-colors group"
                        >
                          <span>
                            <span className="block text-sm font-medium text-gray-800 group-hover:text-[#0D3B6E]">
                              {account.label}
                            </span>
                            <span className="block text-[11px] text-gray-400 truncate">{account.email}</span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0D3B6E] shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#0D3B6E]/50" />
                    Secured login
                  </span>
                  <span>·</span>
                  <span>14-day free trial</span>
                  <span className="hidden sm:inline">·</span>
                  <Link href="/register" className="hidden sm:inline font-semibold text-[#0D3B6E] hover:underline">
                    Create account
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-blue-200/40 mt-6">
            © {new Date().getFullYear()} GTHINK · GEMS v1.3.5
          </p>
        </div>
      </main>
    </div>
  );
}
