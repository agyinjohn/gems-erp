'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
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
    { role: 'Super Admin', email: 'admin@gthink.com',    password: 'Admin@1234' },
    { role: 'Sales Staff', email: 'sales@gthink.com',    password: 'Staff@1234' },
    { role: 'Accountant',  email: 'accounts@gthink.com', password: 'Staff@1234' },
    { role: 'HR Manager',  email: 'hr@gthink.com',       password: 'Staff@1234' },
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
              <div className="text-3xl font-black">GThink ERP</div>
              <div className="text-blue-200">Enterprise Resource Planning</div>
            </div>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Manage your entire<br />business from one place.
          </h2>
          <p className="text-blue-200 text-lg max-w-md">
            Inventory, Sales, Procurement, Finance, HR, CRM — all unified in a single powerful platform.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 max-w-sm">
            {['Inventory Management', 'Sales & eCommerce', 'HR & Payroll', 'Accounting & Finance'].map(m => (
              <div key={m} className="bg-white/10 rounded-xl px-4 py-3 text-sm text-blue-100">✓ {m}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right login form ── */}
      <div className="flex items-center justify-center w-full lg:w-[45%] bg-gray-50 px-12 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">GThink ERP</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}
            <div>
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="form-input pr-10"
                  placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary justify-center py-2.5 text-base">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-3 uppercase tracking-wide">Demo Accounts</p>
            <div className="space-y-2">
              {demoAccounts.map(a => (
                <button key={a.email} onClick={() => { setEmail(a.email); setPassword(a.password); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                  <span className="text-xs font-semibold text-blue-800">{a.role}</span>
                  <span className="text-xs text-blue-500 ml-2">{a.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
