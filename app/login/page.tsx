'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, type TwoFactorChallenge } from '@/lib/auth';
import api from '@/lib/api';
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight,
  ChevronRight, Package, BarChart3, ShoppingCart,
  Users, Calculator, Truck, UserCheck, Shield, Sparkles,
  CheckCircle2, ArrowLeft, KeyRound,
} from 'lucide-react';

/* ─── constants ──────────────────────────────────────────────────────────── */

// Demo logins are for a seeded demo database only. They stay hidden unless the
// deployment sets NEXT_PUBLIC_SHOW_DEMO_LOGINS=true, so a live site never
// advertises passwords.
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === 'true';

const DEMO_ACCOUNTS = [
  { label: 'Business Owner', email: 'owner@gems-store.com', password: 'Admin@1234', color: 'bg-violet-100 text-violet-700' },
  { label: 'Sales Staff', email: 'sales@gthink.com', password: 'Staff@1234', color: 'bg-blue-100 text-blue-700' },
  { label: 'Inventory', email: 'warehouse@gthink.com', password: 'Staff@1234', color: 'bg-cyan-100 text-cyan-700' },
  { label: 'Accountant', email: 'accounts@gthink.com', password: 'Staff@1234', color: 'bg-emerald-100 text-emerald-700' },
  { label: 'HR Manager', email: 'hr@gthink.com', password: 'Staff@1234', color: 'bg-pink-100 text-pink-700' },
  { label: 'Procurement', email: 'procurement@gthink.com', password: 'Staff@1234', color: 'bg-orange-100 text-orange-700' },
];

const MODULES = [
  { icon: Package, label: 'Stocks & Inventory', desc: 'Real-time stock tracking & alerts' },
  { icon: ShoppingCart, label: 'Sales, POS & eCommerce', desc: 'Orders, invoices & online storefront' },
  { icon: Calculator, label: 'Accounting & Finance', desc: 'GL, AP/AR & financial reports' },
  { icon: Shield, label: 'Payment System', desc: 'Paystack & mobile money integration' },
  { icon: Truck, label: 'Procurement', desc: 'Suppliers, POs & approvals' },
  { icon: Users, label: 'HR & Payroll', desc: 'Staff, leave & payslips' },
  { icon: UserCheck, label: 'CRM', desc: 'Customers & relationships' },
];

/* ─── main page ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Second step: set once the password has been accepted for a two-factor account.
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);
  // Count down until another text/email code may be asked for.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await login(email, password);
      if (r.challenge) {
        setChallenge(r.challenge); setCode(''); setUseRecovery(false);
        setCooldown(r.challenge.method === 'totp' ? 0 : r.challenge.resendIn || 30);
        setInfo('');
        if (r.challenge.sendFailed) setError(r.challenge.message || 'We could not send your code. Try again shortly, or use a recovery code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setError('');
    setLoading(true);
    try {
      await verifyTwoFactor(challenge.token, useRecovery ? { recovery_code: code.trim() } : { code: code.trim() });
    } catch (err: any) {
      const status = err.response?.status;
      setError(err.response?.data?.message || 'That code did not work. Please try again.');
      // The pass is good for five minutes; once it has lapsed, start over.
      if (status === 401 && /sign-in has expired|sign in again/i.test(err.response?.data?.message || '')) setChallenge(null);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!challenge || cooldown > 0) return;
    setError(''); setInfo('');
    try {
      const r = await api.post('/auth/2fa/resend', { challenge_token: challenge.token });
      setInfo(r.data.message || 'A new code is on its way.');
      setCooldown(r.data.data?.resend_in || 30);
      setCode('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not send a new code.');
      if (err.response?.data?.data?.resend_in) setCooldown(err.response.data.data.resend_in);
      if (err.response?.status === 401) setChallenge(null);
    }
  };

  const sentBy = challenge?.method === 'sms' ? 'text message' : 'email';
  const codeHint = useRecovery
    ? 'Enter one of the recovery codes you saved when you turned on two-factor sign-in.'
    : challenge?.method === 'totp'
      ? 'Open your authenticator app and enter the 6-digit code for GEMS.'
      : `We sent a 6-digit code by ${sentBy} to ${challenge?.destination || 'you'}. It expires in 10 minutes.`;

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
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:bg-white/15 transition-colors backdrop-blur-sm">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-2xl leading-none tracking-tight">GEMS</div>
              <div className="text-xs text-blue-300/60 font-medium tracking-wide mt-1">GTHINK Enterprise Management System</div>
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

          {/* Feature grid */}
          <div className="mt-10 grid grid-cols-2 gap-3">
            {MODULES.map(({ icon: Icon, label, desc }) => (
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
        <header className="lg:hidden flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white shadow-sm">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0D3B6E] flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-[#0D3B6E] text-base leading-none tracking-tight">GEMS</div>
              <div className="text-[9px] text-gray-400 font-medium tracking-widest uppercase mt-0.5">Enterprise Management</div>
            </div>
          </Link>
          <Link href="/register"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D3B6E] bg-[#0D3B6E]/8 hover:bg-[#0D3B6E]/14 px-4 py-2.5 rounded-xl transition-colors">
            Sign up <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </header>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-10 lg:px-12 xl:px-16 py-6 sm:py-10 lg:py-10">
          <div
            className={`w-full max-w-[420px] transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
            style={{ transitionDelay: '100ms' }}
          >
            {/* Heading */}
            <div className="mb-6 sm:mb-7">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
              <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">Sign in to access your business workspace.</p>
            </div>

            {challenge && (
              <form onSubmit={handleCode} className="space-y-4">
                {error && (
                  <div role="alert" className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-sm animate-pop-in">
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">!</span>
                    <span>{error}</span>
                  </div>
                )}
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-[#0D3B6E] text-sm">
                  <KeyRound className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{codeHint}</span>
                </div>
                {info && !error && (
                  <div role="status" className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">{info}</div>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="code" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {useRecovery ? 'Recovery code' : challenge.method === 'totp' ? 'Authentication code' : `Code from your ${sentBy}`}
                  </label>
                  <input
                    id="code"
                    autoFocus
                    required
                    inputMode={useRecovery ? 'text' : 'numeric'}
                    autoComplete="one-time-code"
                    maxLength={useRecovery ? 12 : 6}
                    placeholder={useRecovery ? 'XXXXX-XXXXX' : '000000'}
                    value={code}
                    onChange={e => setCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-center text-xl font-bold tracking-[0.3em] text-gray-900 placeholder:text-gray-300 placeholder:tracking-normal focus:outline-none focus:bg-white focus:border-[#0D3B6E]/50 focus:ring-4 focus:ring-[#0D3B6E]/8 transition-all"
                  />
                </div>
                <button type="submit" disabled={loading || code.trim().length < (useRecovery ? 10 : 6)}
                  className="w-full h-12 rounded-xl bg-[#0D3B6E] hover:bg-[#134a82] disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify and sign in <ArrowRight className="w-4 h-4" /></>}
                </button>
                {challenge.method !== 'totp' && !useRecovery && (
                  <p className="text-center text-xs text-gray-500">
                    Didn&apos;t get it?{' '}
                    <button type="button" onClick={resend} disabled={cooldown > 0} className="font-semibold text-[#0D3B6E] hover:underline disabled:text-gray-400 disabled:no-underline">
                      {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send a new code'}
                    </button>
                  </p>
                )}
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => { setChallenge(null); setCode(''); setError(''); setInfo(''); }} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button type="button" onClick={() => { setUseRecovery(v => !v); setCode(''); setError(''); }} className="font-semibold text-[#0D3B6E] hover:underline">
                    {useRecovery
                      ? (challenge.method === 'totp' ? 'Use my authenticator app' : `Use the code from my ${sentBy}`)
                      : challenge.method === 'totp' ? "Can't use your app? Use a recovery code" : 'Use a recovery code instead'}
                  </button>
                </div>
              </form>
            )}

            {/* Form */}
            {!challenge && (
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
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#0D3B6E]/50 focus:ring-4 focus:ring-[#0D3B6E]/8 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                    className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#0D3B6E]/50 focus:ring-4 focus:ring-[#0D3B6E]/8 transition-all"
                  />
                  <button type="button"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-shine w-full h-12 rounded-xl bg-[#0D3B6E] hover:bg-[#134a82] active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0D3B6E]/25 transition-all mt-1"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</>
                  : <>Sign in to dashboard <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>
            )}

            {/* Demo accounts — only when the deployment turns them on */}
            {SHOW_DEMO && !challenge && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowDemo(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-gray-200 hover:border-[#0D3B6E]/30 hover:bg-blue-50/40 transition-all text-left group"
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
                <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 overflow-hidden animate-panel-in">
                  {DEMO_ACCOUNTS.map(acc => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => { setEmail(acc.email); setPassword(acc.password); setShowDemo(false); setError(''); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white transition-colors text-left group"
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
            )}

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-3">
              <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#0D3B6E]/50" /> SSL secured
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500/60" /> 14-day free trial
                </span>
              </div>
              <p className="text-center text-sm text-gray-400">
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