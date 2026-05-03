'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Package, Building2, Mail, Lock, Phone, MapPin,
  CheckCircle, ArrowRight, ArrowLeft, Eye, EyeOff,
  Loader2, Zap, Shield, Globe, Users, CreditCard,
} from 'lucide-react';
import api from '@/lib/api';

const PERKS = [
  { icon: Zap,    text: 'Up and running in minutes' },
  { icon: Shield, text: '14-day free trial, cancel anytime' },
  { icon: Globe,  text: 'Your own branded eCommerce store' },
  { icon: Users,  text: 'Invite your whole team' },
];

export default function RegisterPage() {
  const [step, setStep]       = useState(1); // 1=business, 2=account, 3=card, 4=success
  const [loading, setLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [createdBusiness, setCreatedBusiness] = useState('');
  const [authToken, setAuthToken] = useState(''); // JWT after registration

  const [form, setForm] = useState({
    business_name: '', phone: '', address: '',
    email: '', password: '', confirm_password: '',
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const slug = form.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const pwChecks = [
    { label: '8+ characters', ok: form.password.length >= 8 },
    { label: 'Uppercase',     ok: /[A-Z]/.test(form.password) },
    { label: 'Number',        ok: /[0-9]/.test(form.password) },
    { label: 'Special char',  ok: /[^A-Za-z0-9]/.test(form.password) },
  ];
  const pwValid = pwChecks.every(c => c.ok);

  const validateStep1 = () => {
    if (!form.business_name.trim()) { setError('Business name is required.'); return false; }
    if (!form.phone.trim()) { setError('Phone number is required.'); return false; }
    if (!form.address.trim()) { setError('Business address is required.'); return false; }
    setError(''); return true;
  };

  const validateStep2 = () => {
    if (!form.email.trim()) { setError('Email is required.'); return false; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Enter a valid email address.'); return false; }
    if (!pwValid) { setError('Password does not meet all requirements.'); return false; }
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return false; }
    setError(''); return true;
  };

  const handleNext = () => { if (step === 1 && validateStep1()) setStep(2); };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true); setError('');
    try {
      await api.post('/tenants/register', {
        business_name: form.business_name.trim(),
        email:         form.email.toLowerCase().trim(),
        password:      form.password,
        phone:         form.phone.trim(),
        address:       form.address.trim(),
      });
      // Auto-login to get token for card authorization
      const loginRes = await api.post('/auth/login', {
        email:    form.email.toLowerCase().trim(),
        password: form.password,
      });
      setAuthToken(loginRes.data.data.token);
      setCreatedBusiness(form.business_name.trim());
      setStep(3);
    } catch(e: any) {
      setError(e.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleCardAuthorize = async () => {
    setCardLoading(true);
    try {
      const r = await api.post('/billing/authorize-card', {}, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const { authorization_url } = r.data.data;
      // Redirect to Paystack to collect card
      window.location.href = authorization_url;
    } catch(e: any) {
      setError(e.response?.data?.message || 'Failed to initialize card. Please try again.');
    } finally { setCardLoading(false); }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-400/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/3 rounded-full" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <Package className="w-7 h-7 text-[#0D3B6E]" />
            </div>
            <div>
              <div className="font-extrabold text-3xl text-white leading-tight">GEMS</div>
              <div className="text-blue-200 text-sm font-medium tracking-wide leading-tight">GThink Enterprise Management System</div>
            </div>
          </Link>
        </div>

        {/* Main content */}
        <div className="relative z-10">
          <div className="mb-8">
            <p className="text-blue-200 text-base leading-relaxed">
              All-in-one platform for Stocks, Inventory, Sales, Payment, Procurement, Finance, HR, and CRM.
            </p>
          </div>

          {/* Perks */}
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

          {/* Fake testimonial */}
          <div className="mt-10 bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-blue-100 text-sm leading-relaxed italic mb-4">
              "GEMS transformed how we run our 3 branches. Setup took less than an hour."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-400 text-gray-900 font-bold text-sm flex items-center justify-center">K</div>
              <div>
                <div className="text-white text-xs font-semibold">Kofi Mensah</div>
                <div className="text-blue-300 text-xs">Owner, GEMS Electronics</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-blue-300 text-xs">
          © {new Date().getFullYear()} GEMS — GTHINK Enterprise Management System
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col bg-gray-50">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100 lg:bg-transparent lg:border-0">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-[#0D3B6E] rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-[#0D3B6E]">GEMS</span>
          </Link>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-gray-400 hidden sm:block">Already have an account?</span>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D3B6E] bg-white border border-[#0D3B6E]/20 hover:border-[#0D3B6E]/60 hover:bg-blue-50 px-4 py-2 rounded-full transition-all shadow-sm"
            >
              Log in <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md">

            {/* Step indicator */}
            {step < 4 && (
              <div className="flex items-center mb-8">
                {[1, 2, 3].map((n, i) => (
                  <div key={n} className="flex items-center flex-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step > n ? 'bg-green-500 text-white' :
                        step === n ? 'bg-[#0D3B6E] text-white shadow-lg shadow-blue-200' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {step > n ? <CheckCircle className="w-4 h-4" /> : n}
                      </div>
                      <span className={`text-xs font-semibold hidden sm:block ${step === n ? 'text-[#0D3B6E]' : 'text-gray-400'}`}>
                        {n === 1 ? 'Business' : n === 2 ? 'Account' : 'Card'}
                      </span>
                    </div>
                    {i < 2 && (
                      <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all ${step > n ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div>
                <div className="mb-7">
                  <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Tell us about your business</h1>
                  <p className="text-gray-500 text-sm">This becomes your business identity on the platform.</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">!</span>
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="form-label">Business Name *</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        className="form-input pl-10 h-12 text-base"
                        placeholder="e.g. GEMS Electronics"
                        value={form.business_name}
                        onChange={e => set('business_name', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleNext()}
                        autoFocus
                      />
                    </div>
                    {form.business_name.trim() && (
                      <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-600">
                          Store URL: <span className="font-mono font-semibold">/store/{slug}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Phone *</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input className="form-input pl-10 h-12" placeholder="+233 XX XXX XXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Address *</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input className="form-input pl-10 h-12" placeholder="Accra, Ghana" value={form.address} onChange={e => set('address', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={handleNext} className="w-full mt-6 bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold h-12 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-xs text-gray-400 text-center mt-4">
                  By signing up you agree to our{' '}
                  <a href="#" className="text-[#0D3B6E] hover:underline">Terms</a> and{' '}
                  <a href="#" className="text-[#0D3B6E] hover:underline">Privacy Policy</a>
                </p>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <div>
                <div className="mb-7">
                  <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Create your account</h1>
                  <p className="text-gray-500 text-sm">
                    Owner login for <span className="font-semibold text-gray-700">{form.business_name}</span>
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">!</span>
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="form-label">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" className="form-input pl-10 h-12 text-base" placeholder="you@business.com" value={form.email} onChange={e => set('email', e.target.value)} autoFocus />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type={showPw ? 'text' : 'password'} className="form-input pl-10 pr-11 h-12 text-base" placeholder="Create a strong password" value={form.password} onChange={e => set('password', e.target.value)} />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.password && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {pwChecks.map(c => (
                          <div key={c.label} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${c.ok ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${c.ok ? 'bg-green-500' : 'bg-gray-300'}`}>
                              {c.ok && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            {c.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        className={`form-input pl-10 pr-11 h-12 text-base ${form.confirm_password && form.password !== form.confirm_password ? 'border-red-300 focus:ring-red-200' : ''}`}
                        placeholder="Repeat your password"
                        value={form.confirm_password}
                        onChange={e => set('confirm_password', e.target.value)}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.confirm_password && form.password !== form.confirm_password && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">!</span>
                        Passwords do not match
                      </p>
                    )}
                    {form.confirm_password && form.password === form.confirm_password && pwValid && (
                      <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Passwords match
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setStep(1); setError(''); }} className="h-12 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5 font-medium text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-[#0D3B6E] hover:bg-[#1A5294] disabled:opacity-60 text-white font-bold h-12 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                      : <>Create Account <ArrowRight className="w-4 h-4" /></>
                    }
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2.5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700"><strong>14-day free trial</strong> — card required, not charged for 14 days. Cancel anytime.</p>
                </div>
              </div>
            )}

            {/* ── STEP 3 — Card ── */}
            {step === 3 && (
              <div>
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
                    <CheckCircle className="w-3.5 h-3.5" /> Account created successfully!
                  </div>
                  <h1 className="text-2xl font-extrabold text-gray-900 mb-1">One last step — secure your trial</h1>
                  <p className="text-gray-500 text-sm">Add a card to keep access after your free trial. <strong className="text-gray-700">Nothing is charged today.</strong></p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">!</span>
                    {error}
                  </div>
                )}

                {/* Mock card visual */}
                <div className="relative h-44 rounded-2xl bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0a2d54] p-6 mb-5 overflow-hidden shadow-xl shadow-blue-200">
                  {/* Decorative circles */}
                  <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full" />
                  <div className="absolute -bottom-10 -left-6 w-40 h-40 bg-yellow-400/10 rounded-full" />
                  {/* Chip */}
                  <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 mb-5 flex items-center justify-center">
                    <div className="w-6 h-4 rounded-sm border border-yellow-600/40 grid grid-cols-2 gap-px p-0.5">
                      <div className="bg-yellow-600/30 rounded-sm" /><div className="bg-yellow-600/30 rounded-sm" />
                      <div className="bg-yellow-600/30 rounded-sm" /><div className="bg-yellow-600/30 rounded-sm" />
                    </div>
                  </div>
                  {/* Card number placeholder */}
                  <div className="flex gap-3 mb-4">
                    {['••••', '••••', '••••', '••••'].map((g, i) => (
                      <span key={i} className="text-white/60 font-mono text-base tracking-widest">{g}</span>
                    ))}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">Card Holder</div>
                      <div className="text-white font-semibold text-sm tracking-wide">{form.business_name || 'Your Name'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">Expires</div>
                      <div className="text-white font-semibold text-sm">••/••</div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 shadow-sm">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">What happens next</p>
                  <div className="space-y-0">
                    {[
                      { dot: 'bg-green-500',  day: 'Today',    text: 'Card saved — GHS 0 charged now' },
                      { dot: 'bg-blue-400',   day: 'Days 1–13', text: 'Full access to every module, free' },
                      { dot: 'bg-yellow-400', day: 'Day 13',   text: 'We remind you before any charge' },
                      { dot: 'bg-[#0D3B6E]', day: 'Day 14',   text: 'Auto-billed only if you keep access' },
                    ].map((item, i, arr) => (
                      <div key={item.day} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${item.dot}`} />
                          {i < arr.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                        </div>
                        <div className="pb-3">
                          <span className="text-xs font-bold text-gray-700">{item.day} </span>
                          <span className="text-xs text-gray-400">{item.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-5 mb-5">
                  {[
                    { icon: Shield, text: 'SSL Secured' },
                    { icon: Lock,   text: 'PCI Compliant' },
                    { icon: Zap,    text: 'Cancel anytime' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Icon className="w-3.5 h-3.5 text-gray-300" />
                      {text}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCardAuthorize}
                  disabled={cardLoading}
                  className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] disabled:opacity-60 text-white font-bold h-13 py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2.5 shadow-lg shadow-blue-200"
                >
                  {cardLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Paystack…</>
                    : <><CreditCard className="w-4 h-4" /> Secure my trial with a card</>
                  }
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">Powered by Paystack · Your card details are never stored on our servers</p>

                <button
                  onClick={() => setStep(4)}
                  className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors py-2 underline underline-offset-2"
                >
                  Skip for now — remind me later
                </button>
              </div>
            )}

            {/* ── STEP 4 — Success ── */}
            {step === 4 && (
              <div className="text-center">
                {/* Animated success icon */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
                  <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-200">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                </div>

                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">You're all set! 🎉</h1>
                <p className="text-gray-500 mb-1">
                  <span className="font-bold text-gray-800">{createdBusiness}</span> has been created.
                </p>
                <p className="text-gray-400 text-sm mb-8">Your 14-day free trial has started. Log in to get started.</p>

                <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 text-left shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">What to do next</p>
                  <div className="space-y-3">
                    {[
                      { step: '1', text: 'Add your products to inventory', color: 'bg-blue-500' },
                      { step: '2', text: 'Invite your staff members',      color: 'bg-purple-500' },
                      { step: '3', text: 'Set up your online eCommerce store',  color: 'bg-green-500' },
                      { step: '4', text: 'Configure your branches',        color: 'bg-orange-500' },
                    ].map(item => (
                      <div key={item.step} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full ${item.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>{item.step}</div>
                        <span className="text-sm text-gray-600">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link href="/login" className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold h-12 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                  Go to Login <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-xs text-gray-400 mt-3">Use the email and password you just created</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
