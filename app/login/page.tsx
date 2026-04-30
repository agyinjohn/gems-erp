'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Building2, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Platform Admin', email: 'admin@gthink.com',        password: 'Admin@1234', badge: 'bg-red-100 text-red-700' },
    { role: 'Business Owner', email: 'owner@gems-store.com',    password: 'Admin@1234', badge: 'bg-purple-100 text-purple-700' },
    { role: 'Sales Staff',    email: 'sales@gthink.com',        password: 'Staff@1234', badge: 'bg-green-100 text-green-700' },
    { role: 'Accountant',     email: 'accounts@gthink.com',     password: 'Staff@1234', badge: 'bg-blue-100 text-blue-700' },
    { role: 'HR Manager',     email: 'hr@gthink.com',           password: 'Staff@1234', badge: 'bg-orange-100 text-orange-700' },
    { role: 'Warehouse',      email: 'warehouse@gthink.com',    password: 'Staff@1234', badge: 'bg-yellow-100 text-yellow-700' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0D3B6E 0%, #1A6BB5 100%)' }}>

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-center px-16 flex-1 text-white relative overflow-hidden">
        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80')" }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(13,59,110,0.88) 0%, rgba(26,107,181,0.80) 100%)' }}
        />
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-blue-900" />
            </div>
            <div>
              <div className="text-3xl font-black">GEMS</div>
              <div className="text-blue-200">GTHINK Enterprise Management System</div>
            </div>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Your Business. One System.<br /><span className="text-yellow-400">Smart Workplace.</span>
          </h2>
          <p className="text-blue-200 text-lg max-w-md">
            All-in-one platform for Stocks, Inventory, Sales, Payment, Procurement, Finance, HR, and CRM.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 max-w-sm">
            {['Stocks & Inventory', 'PoS, Sales & eCommerce', 'HR & Payroll', 'Accounting & Finance'].map(m => (
              <div key={m} className="bg-white/10 rounded-xl px-4 py-3 text-sm text-blue-100">✓ {m}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right login form ── */}
      <div className="flex items-center justify-center w-full lg:w-[45%] bg-white px-4 sm:px-8 lg:px-14 py-10 relative">

        {/* Subtle background pattern */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full opacity-60" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-yellow-50 rounded-full opacity-60" />
        </div>

        <div className="w-full max-w-[400px] relative z-10">

          {/* Logo — desktop only */}
          <div className="hidden lg:flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-[#0D3B6E] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-3">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <span className="font-extrabold text-2xl text-[#0D3B6E] tracking-tight">GEMS</span>
            <span className="text-xs text-gray-400 mt-1 tracking-widest uppercase">by GTHINK</span>
          </div>

          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="w-12 h-12 bg-[#0D3B6E] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">GEMS</h1>
            <p className="text-xs text-gray-400 mt-1">Smart Workplace</p>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome</h2>
            <p className="text-gray-400 text-sm">Enter your credentials to access your workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">!</span>
                {error}
              </div>
            )}
            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input
                  type="email"
                  className="form-input pl-10 h-12 text-base"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-input pl-10 pr-11 h-12 text-base"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link href="/forgot-password" className="text-xs text-[#0D3B6E] hover:underline font-medium">Forgot password?</Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] disabled:opacity-60 text-white font-bold h-12 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200 mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                : <>Sign In <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Demo Accounts — click to fill</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(a => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => { setEmail(a.email); setPassword(a.password); }}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium border border-transparent hover:border-gray-200 hover:bg-white transition-all ${a.badge}`}
                >
                  {a.role}
                </button>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-6">
            {[
              { icon: '🔒', text: 'SSL Secured' },
              { icon: '🛡️', text: 'Data Protected' },
              { icon: '⚡', text: '99.9% Uptime' },
            ].map(b => (
              <div key={b.text} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="text-sm">{b.icon}</span>
                {b.text}
              </div>
            ))}
          </div>

          {/* Register CTA */}
          <div className="mt-7 pt-6 border-t border-gray-100 flex items-center justify-center gap-2.5">
            <span className="text-sm text-gray-400">Don't have an account?</span>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D3B6E] bg-white border border-[#0D3B6E]/20 hover:border-[#0D3B6E]/60 hover:bg-blue-50 px-4 py-2 rounded-full transition-all shadow-sm"
            >
              Start free trial <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-300 mt-6">
            &copy; {new Date().getFullYear()} GEMS by GTHINK &middot; All rights reserved
          </p>

        </div>
      </div>

    </div>
  );
}
