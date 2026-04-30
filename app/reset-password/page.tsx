'use client';
import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

function ResetPasswordForm() {
  const router         = useRouter();
  const params         = useSearchParams();
  const verificationId = params.get('id') || '';
  const email          = params.get('email') || '';

  const [code, setCode]           = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer]         = useState(60);
  const [verifId, setVerifId]     = useState(verificationId);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const handleResend = async () => {
    if (!email || timer > 0) return;
    setResending(true); setError('');
    try {
      const r = await api.post('/auth/forgot-password', { email });
      setVerifId(r.data.data?.verificationId || verifId);
      setTimer(60);
      setCode('');
    } catch(e: any) {
      setError(e.response?.data?.message || 'Failed to resend. Please try again.');
    } finally { setResending(false); }
  };

  const pwChecks = [
    { label: '8+ characters', ok: newPw.length >= 8 },
    { label: 'Uppercase',     ok: /[A-Z]/.test(newPw) },
    { label: 'Number',        ok: /[0-9]/.test(newPw) },
    { label: 'Special char',  ok: /[^A-Za-z0-9]/.test(newPw) },
  ];
  const pwValid = pwChecks.every(c => c.ok);

  const handleReset = async () => {
    if (!code.trim())      { setError('Enter the 6-digit code.'); return; }
    if (!pwValid)          { setError('Password does not meet all requirements.'); return; }
    if (newPw !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { verificationId: verifId, verificationCode: code.trim(), newPassword: newPw });
      setDone(true);
    } catch(e: any) {
      setError(e.response?.data?.message || 'Invalid or expired code. Please try again.');
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
          <h2 className="text-3xl font-extrabold text-white leading-tight mb-4">
            Almost there.<br />
            <span className="text-yellow-400">Set your new password.</span>
          </h2>
          <p className="text-blue-200 text-base leading-relaxed mb-8">
            Enter the 6-digit code we sent to your email, then choose a strong new password.
          </p>

          {/* Steps */}
          <div className="space-y-4">
            {[
              { n: '1', text: 'Check your email for the 6-digit code', done: code.length === 6 },
              { n: '2', text: 'Enter the code on this page', done: code.length === 6 },
              { n: '3', text: 'Set a strong new password', done: pwValid },
              { n: '4', text: 'Sign in with your new credentials', done: false },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${s.done ? 'bg-green-400 text-white' : 'bg-white/10 text-white'}`}>
                  {s.done ? <CheckCircle className="w-4 h-4" /> : s.n}
                </div>
                <span className={`text-sm ${s.done ? 'text-green-300 line-through' : 'text-blue-100'}`}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-blue-300 text-xs">
          © {new Date().getFullYear()} GEMS — GTHINK Enterprise Management System
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col bg-white relative">

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-50 rounded-full opacity-60" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-yellow-50 rounded-full opacity-60" />
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 relative z-10">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-[#0D3B6E] rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-[#0D3B6E]">GEMS</span>
          </Link>
          <div className="hidden lg:block" />
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 relative z-10">
          <div className="w-full max-w-md">

            {!done ? (
              <>
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 bg-[#0D3B6E] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">Set new password</h1>
                  {email && (
                    <p className="text-gray-400 text-sm text-center">
                      Code sent to <span className="font-semibold text-gray-600">{email}</span>
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-5">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">!</span>
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="form-label">6-Digit Code</label>
                    <input
                      className="form-input h-12 text-center text-2xl font-mono tracking-[0.6em]"
                      placeholder="······"
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                    />
                    <p className="text-xs text-gray-400 mt-1.5">Check your inbox and spam folder. Expires in 15 minutes.</p>
                  </div>

                  <div>
                    <label className="form-label">New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        className="form-input pl-10 pr-11 h-12 text-base"
                        placeholder="Create a strong password"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPw && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {pwChecks.map(c => (
                          <div key={c.label} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${c.ok ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${c.ok ? 'bg-green-500' : 'bg-gray-300'}`} />
                            {c.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        className={`form-input pl-10 h-12 text-base ${confirm && newPw !== confirm ? 'border-red-300 focus:ring-red-200' : ''}`}
                        placeholder="Repeat your password"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                      />
                    </div>
                    {confirm && newPw === confirm && pwValid && (
                      <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Passwords match
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] disabled:opacity-60 text-white font-bold h-12 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</>
                      : <>Reset Password <ArrowRight className="w-4 h-4" /></>
                    }
                  </button>

                  {/* Resend timer */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="text-sm text-gray-400">Didn't receive the code?</span>
                    {timer > 0 ? (
                      <span className="text-sm text-gray-400">
                        Resend in <span className="font-semibold text-[#0D3B6E] tabular-nums">{timer}s</span>
                      </span>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={resending}
                        className="flex items-center gap-1 text-sm font-semibold text-[#0D3B6E] hover:underline disabled:opacity-50"
                      >
                        {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        {resending ? 'Sending…' : 'Resend code'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Success */
              <div className="flex flex-col items-center text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
                  <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-200">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Password reset!</h2>
                <p className="text-gray-400 text-sm mb-8 max-w-xs">
                  Your password has been updated successfully. Sign in with your new password.
                </p>
                <Link
                  href="/login"
                  className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold h-12 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  Go to Sign In <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            <p className="text-center text-xs text-gray-300 mt-10">
              © {new Date().getFullYear()} GEMS by GTHINK · All rights reserved
            </p>

          </div>
        </div>
      </div>

    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
