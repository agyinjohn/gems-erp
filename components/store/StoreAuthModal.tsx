'use client';
import { useEffect, useRef, useState } from 'react';
import { X, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { publicApi } from '@/lib/api';
import type { StoreCustomer } from '@/lib/storefrontSettings';

interface Props {
  tenantSlug: string;
  onSuccess: (customer: StoreCustomer, token: string) => void;
  onClose: () => void;
}

type Mode = 'choose' | 'login' | 'register';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function StoreAuthModal({ tenantSlug, onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('choose');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Load Google Identity Services and render button
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || mode !== 'choose') return;

    const initGoogle = () => {
      (window as any).google?.accounts?.id?.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      });
      if (googleBtnRef.current) {
        (window as any).google?.accounts?.id?.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: googleBtnRef.current.offsetWidth || 320,
          logo_alignment: 'left',
        });
      }
    };

    if ((window as any).google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    }
  }, [mode]);

  const handleGoogleCredential = async (response: { credential: string }) => {
    setLoading(true);
    setError('');
    try {
      const res = await publicApi.post(`/storefront/${tenantSlug}/customers/google`, {
        credential: response.credential,
      });
      const { token, customer } = res.data.data;
      onSuccess(customer, token);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setError('');
    if (!form.email.trim() || !form.password) { setError('Email and password are required.'); return; }
    if (mode === 'register' && !form.name.trim()) { setError('Full name is required.'); return; }
    setLoading(true);
    try {
      const path = mode === 'register'
        ? `/storefront/${tenantSlug}/customers/register`
        : `/storefront/${tenantSlug}/customers/login`;
      const body = mode === 'register'
        ? { name: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone }
        : { email: form.email.trim(), password: form.password };
      const res = await publicApi.post(path, body);
      const { token, customer } = res.data.data;
      onSuccess(customer, token);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-[#0D3B6E] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-amber-300" />
            <h2 className="font-bold text-white text-base">
              {mode === 'choose' ? 'Sign in to your account' : mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* ── Choose mode ── */}
          {mode === 'choose' && (
            <>
              <p className="text-sm text-gray-500 text-center">Sign in to track orders and save your details.</p>

              {/* Google button */}
              {GOOGLE_CLIENT_ID ? (
                <div className="w-full">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 h-11 border border-gray-200 rounded-xl text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                    </div>
                  ) : (
                    <div ref={googleBtnRef} className="w-full" />
                  )}
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or use email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={() => setMode('login')}
                className="w-full border border-gray-200 hover:border-[#0D3B6E] text-gray-700 hover:text-[#0D3B6E] font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                Sign in with email
              </button>
              <button
                onClick={() => setMode('register')}
                className="w-full bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold text-sm py-3 rounded-xl transition-colors"
              >
                Create new account
              </button>

              <p className="text-xs text-gray-400 text-center">
                Your cart and progress are saved — signing in won&apos;t reset anything.
              </p>
            </>
          )}

          {/* ── Login / Register form ── */}
          {(mode === 'login' || mode === 'register') && (
            <>
              {mode === 'register' && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name *</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0D3B6E]"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email *</label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0D3B6E]"
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Password *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#0D3B6E]"
                    placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone (optional)</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0D3B6E]"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              )}

              <button
                onClick={submit}
                disabled={loading}
                className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button onClick={() => { setMode('choose'); setError(''); }} className="text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
                <button
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                  className="text-[#0D3B6E] font-semibold hover:underline"
                >
                  {mode === 'login' ? 'Need an account?' : 'Already have an account?'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
