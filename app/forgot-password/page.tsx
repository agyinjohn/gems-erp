'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Mail, ArrowRight, ArrowLeft, Loader2, Shield, Zap, Globe, Users } from 'lucide-react';
import api from '@/lib/api';

const PERKS = [
  { icon: Shield, text: 'Your data is always secure' },
  { icon: Zap,    text: 'Reset takes less than 2 minutes' },
  { icon: Globe,  text: 'Access from anywhere' },
  { icon: Users,  text: 'Your team stays connected' },
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true); setError('');
    try {
      const r = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      const verificationId = r.data.data?.verificationId || '';
      router.push(`/reset-password?id=${verificationId}&email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch(e: any) {
      setError(e.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-400/10 rounded-full" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-5 h-5 text-gray-900" />
            </div>
            <span className="font-extrabold text-2xl text-white">GEMS <span className="text-yellow-400">by GTHINK</span></span>
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-white leading-tight mb-4">
              Locked out?<br />
              <span className="text-yellow-400">We've got you covered.</span>
            </h2>
            <p className="text-blue-200 text-base leading-relaxed">
              Enter your email and we'll send a 6-digit code to reset your password in minutes.
            </p>
          </div>

          <div className="space-y-4">
            {PERKS.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.text} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-white text-sm font-medium">{p.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-blue-300 text-xs">
          © {new Date().getFullYear()} GEMS — GTHINK Enterprise Management System
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col bg-white relative">

        {/* Subtle background circles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full opacity-60" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-yellow-50 rounded-full opacity-60" />
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 relative z-10">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-[#0D3B6E] rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-[#0D3B6E]">GEMS</span>
          </Link>
          <div className="hidden lg:block" />
          <Link href="/login" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0D3B6E] transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 relative z-10">
          <div className="w-full max-w-md">

            {/* Icon + heading */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-[#0D3B6E] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">Forgot password?</h1>
              <p className="text-gray-400 text-sm text-center max-w-xs">
                No worries — enter your email and we'll send you a 6-digit reset code.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-5">
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">!</span>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    className="form-input pl-10 h-12 text-base"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    autoFocus
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] disabled:opacity-60 text-white font-bold h-12 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code…</>
                  : <>Send Reset Code <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </div>

            <p className="text-center text-xs text-gray-300 mt-10">
              © {new Date().getFullYear()} GEMS by GTHINK · All rights reserved
            </p>

          </div>
        </div>
      </div>

    </div>
  );
}
