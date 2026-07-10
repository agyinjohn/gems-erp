'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package, Building2, Mail, Lock, Phone, MapPin,
  CheckCircle, XCircle, ArrowRight, ArrowLeft, Eye, EyeOff,
  Loader2, Zap, Shield, Globe, Users, CreditCard,
} from 'lucide-react';
import api from '@/lib/api';

const TESTIMONIALS = [
  { quote: 'GEMS transformed how we run our 3 branches. Inventory is always accurate and our staff love the POS.', name: 'Kwame Asante', role: 'Owner, Asante Electronics' },
  { quote: 'The online storefront alone was worth it. We went from zero online sales to 40% of our revenue in 2 months.', name: 'Abena Mensah', role: 'Manager, Chic Boutique' },
  { quote: 'Finally an ERP that just works. Real-time reports and role-based access made all the difference.', name: 'Kofi Boateng', role: 'CFO, ProTools Ltd' },
  { quote: 'Payroll used to take us two days every month. With GEMS HR it takes under an hour. Game changer.', name: 'Efua Darko', role: 'HR Manager, Goldfields Trading' },
  { quote: 'Our procurement team now raises and approves purchase orders in minutes. Suppliers love the paperwork too.', name: 'Yaw Amponsah', role: 'Operations Director, BuildRight Ghana' },
  { quote: 'The accounting module gives me a live P&L at any time. I no longer wait for month-end reports.', name: 'Akosua Frimpong', role: 'Accountant, Sunrise Retail Ltd' },
  { quote: 'Setting up our branded storefront took less than a day. Customers are already ordering online.', name: 'Nana Adjei', role: 'Founder, Kente & Co.' },
  { quote: 'Role-based access means every staff member sees exactly what they need — nothing more, nothing less.', name: 'Kwesi Acheampong', role: 'IT Lead, Metro Distributors' },
];

const PLANS = [
  {
    key: 'starter', label: 'Starter', price: 350,
    badge: 'bg-blue-100 text-blue-700',
    features: ['1 Branch', '5 Users', 'Stocks & Inventory', 'Sales & Orders', 'POS Terminal', 'Basic Financial Reports'],
  },
  {
    key: 'pro', label: 'Pro', price: 1000, popular: true,
    badge: 'bg-purple-100 text-purple-700',
    features: ['5 Branches', '20 Users', 'All Starter Features', 'Online Storefront', 'Procurement', 'HR & Payroll', 'CRM', 'Advanced Reports & Financial Analytics', 'Priority Support'],
  },
  {
    key: 'enterprise', label: 'Enterprise', price: 2500,
    badge: 'bg-orange-100 text-orange-700',
    features: ['15 Branches', 'Unlimited Users', 'All Pro Features', 'Advanced Accounting', 'Dedicated Support', 'Custom Onboarding', 'SLA Guarantee'],
  },
];

const REMOVABLE_FEATURES: Record<string, { label: string; deduction: Partial<Record<'starter'|'pro'|'enterprise', number>> }> = {
  online_storefront:   { label: 'Online Storefront',   deduction: { pro: 150, enterprise: 150 } },
  procurement:         { label: 'Procurement',         deduction: { pro: 100, enterprise: 100 } },
  hr:                  { label: 'HR & Payroll',        deduction: { pro: 150, enterprise: 150 } },
  crm:                 { label: 'CRM',                 deduction: { pro: 100, enterprise: 100 } },
  advanced_accounting: { label: 'Advanced Accounting', deduction: { enterprise: 500 } },
  priority_support:    { label: 'Priority Support',    deduction: { pro: 80,  enterprise: 80  } },
};

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1=business, 2=account, 3=plan, 4=card, 5=success
  const [tIdx, setTIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTIdx(i => (i + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(id);
  }, []);
  const [loading, setLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [createdBusiness, setCreatedBusiness] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [paystackKey, setPaystackKey] = useState('');
  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [removedFeatures, setRemovedFeatures] = useState<string[]>([]);

  const toggleRemoved = (plan: string, key: string) => {
    if (!REMOVABLE_FEATURES[key]?.deduction[plan as 'starter'|'pro'|'enterprise']) return;
    setRemovedFeatures(r => r.includes(key) ? r.filter(x => x !== key) : [...r, key]);
  };

  const planTotal = (plan: string) => {
    const base = PLANS.find(p => p.key === plan)?.price || 0;
    const deduction = removedFeatures.reduce((s, f) => s + (REMOVABLE_FEATURES[f]?.deduction[plan as 'starter'|'pro'|'enterprise'] || 0), 0);
    return base - deduction;
  };

  // Preload Paystack script so it's ready on step 3
  useEffect(() => {
    if ((window as any).PaystackPop) return;
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const [form, setForm] = useState({
    business_name: '', phone: '', address: '',
    email: '', password: '', confirm_password: '',
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const slug = form.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const pwChecks = [
    { label: '8+ characters', ok: form.password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(form.password) },
    { label: 'Number', ok: /[0-9]/.test(form.password) },
    { label: 'Special char', ok: /[^A-Za-z0-9]/.test(form.password) },
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
        email: form.email.toLowerCase().trim(),
        password: form.password,
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      // Auto-login to get token for card authorization
      const loginRes = await api.post('/auth/login', {
        email: form.email.toLowerCase().trim(),
        password: form.password,
      });
      setAuthToken(loginRes.data.data.token);
      const keyRes = await api.get('/plan-prices').catch(() => ({ data: { data: null } }));
      setPaystackKey(loginRes.data.data.paystack_public_key || keyRes.data.data?.paystack_public_key || '');
      setCreatedBusiness(form.business_name.trim());
      setStep(3); // go to plan selection
    } catch (e: any) {
      setError(e.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleCardAuthorize = async () => {
    setCardLoading(true);
    setError('');
    try {
      const r = await api.post('/billing/authorize-card', {}, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const { reference } = r.data.data;
      const key = paystackKey || r.data.data.paystack_public_key || '';
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) throw new Error('Paystack failed to load. Please refresh and try again.');
      PaystackPop.setup({
        key,
        email: form.email.toLowerCase().trim(),
        amount: 50,
        currency: 'GHS',
        ref: reference,
        channels: ['card'],
        label: `${form.business_name} — Card Authorization`,
        onClose: () => setCardLoading(false),
        callback: async (transaction: any) => {
          try {
            await api.post('/billing/save-card', { reference: transaction.reference }, {
              headers: { Authorization: `Bearer ${authToken}` },
            });
            setStep(5);
          } catch (e: any) {
            setError(e.response?.data?.message || 'Card saved but could not confirm. Please check billing settings.');
          } finally { setCardLoading(false); }
        },
      }).openIframe();
    } catch (e: any) {
      setError(e.message || e.response?.data?.message || 'Failed to initialize card. Please try again.');
      setCardLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] flex-col relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-400/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/3 rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-10">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 w-fit">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-2xl leading-none tracking-tight">GEMS</div>
              <div className="text-blue-200/70 text-xs font-medium tracking-wide mt-1">GTHINK Enterprise Management System</div>
            </div>
          </Link>

          {/* Description + Perks */}
          <div className="mt-12 xl:mt-16">
            <p className="text-blue-200 text-base leading-relaxed mb-8">
              All-in-one platform for Stocks, Inventory, Sales, eCommerce, Payments, Procurement, Finance, HR, CRM, POS and More — all connected, all in real time.
            </p>
            <div className="space-y-3">
              {[
                { icon: Zap,    text: 'Up and running in minutes' },
                { icon: Shield, text: '14-day free trial, subscribe to continue' },
                { icon: Globe,  text: 'Your own branded eCommerce store' },
                { icon: Users,  text: 'Invite your whole team' },
              ].map(p => {
                const Icon = p.icon;
                return (
                  <div key={p.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-yellow-400" />
                    </div>
                    <span className="text-white text-base font-medium">{p.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Testimonial carousel */}
          <div className="mt-10 bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-blue-100 text-sm leading-relaxed italic mb-4 min-h-[60px] transition-all duration-500">
              &ldquo;{TESTIMONIALS[tIdx].quote}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {TESTIMONIALS[tIdx].name[0]}
              </div>
              <div>
                <div className="text-white text-xs font-semibold">{TESTIMONIALS[tIdx].name}</div>
                <div className="text-blue-300 text-xs">{TESTIMONIALS[tIdx].role}</div>
              </div>
              <div className="ml-auto flex gap-1">
                {TESTIMONIALS.map((_, i) => (
                  <button key={i} onClick={() => setTIdx(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === tIdx ? 'bg-yellow-400 w-4' : 'w-1.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-auto pt-8 text-blue-300/60 text-xs">
            © {new Date().getFullYear()} GEMS — GTHINK Enterprise Management System
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col bg-gray-50 min-h-screen">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 lg:py-5 bg-white border-b border-gray-100 lg:bg-transparent lg:border-0">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <Package className="w-8 h-8 text-[#0D3B6E]" />
            <span className="text-lg font-extrabold text-gray-900">GEMS</span>
          </Link>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-400 hidden sm:block">Already have an account?</span>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0D3B6E] bg-white border border-[#0D3B6E]/20 hover:border-[#0D3B6E]/60 hover:bg-blue-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all shadow-sm"
            >
              <span className="hidden sm:inline">Log in</span>
              <span className="sm:hidden">Login</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Link>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
          <div className="w-full max-w-md">

            {/* Step indicator */}
            {step < 5 && (
              <div className="flex items-center mb-6 sm:mb-8 px-4 sm:px-0">
                {[1, 2, 3, 4].map((n, i) => (
                  <div key={n} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step > n ? 'bg-green-500 text-white' :
                        step === n ? 'bg-[#0D3B6E] text-white shadow-lg shadow-blue-200' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {step > n ? <CheckCircle className="w-3.5 h-3.5" /> : n}
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-semibold text-center ${
                        step === n ? 'text-[#0D3B6E]' : 'text-gray-400'
                      }`}>
                        {n === 1 ? 'Business' : n === 2 ? 'Account' : n === 3 ? 'Plan' : 'Card'}
                      </span>
                    </div>
                    {i < 3 && (
                      <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${step > n ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div>
                <div className="mb-6 sm:mb-7">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1">Tell us about your business</h1>
                  <p className="text-gray-500 text-xs sm:text-sm">This becomes your business identity on the platform.</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">!</span>
                    {error}
                  </div>
                )}

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="form-label">Business Name *</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        className="form-input pl-10 h-11 sm:h-12 text-sm sm:text-base"
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
                        <span className="text-xs text-blue-600 break-all">
                          Store URL: <span className="font-mono font-semibold">/store/{slug}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Phone *</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input className="form-input pl-10 h-11 sm:h-12 text-sm sm:text-base" placeholder="+233 XX XXX XXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Address *</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input className="form-input pl-10 h-11 sm:h-12 text-sm sm:text-base" placeholder="Accra, Ghana" value={form.address} onChange={e => set('address', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={handleNext} className="w-full mt-5 sm:mt-6 bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold h-11 sm:h-12 rounded-xl text-sm sm:text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
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
                <div className="mb-6 sm:mb-7">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1">Create your account</h1>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Owner login for <span className="font-semibold text-gray-700">{form.business_name}</span>
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">!</span>
                    {error}
                  </div>
                )}

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="form-label">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" className="form-input pl-10 h-11 sm:h-12 text-sm sm:text-base" placeholder="you@business.com" value={form.email} onChange={e => set('email', e.target.value)} autoFocus />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type={showPw ? 'text' : 'password'} className="form-input pl-10 pr-11 h-11 sm:h-12 text-sm sm:text-base" placeholder="Create a strong password" value={form.password} onChange={e => set('password', e.target.value)} />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.password && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {pwChecks.map(c => (
                          <div key={c.label} className={`flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 rounded-lg font-medium transition-all ${c.ok ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
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
                        className={`form-input pl-10 pr-11 h-11 sm:h-12 text-sm sm:text-base ${form.confirm_password && form.password !== form.confirm_password ? 'border-red-300 focus:ring-red-200' : ''}`}
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

                <div className="flex flex-col-reverse sm:flex-row gap-3 mt-5 sm:mt-6">
                  <button onClick={() => { setStep(1); setError(''); }} className="h-11 sm:h-12 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 font-medium text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-[#0D3B6E] hover:bg-[#1A5294] disabled:opacity-60 text-white font-bold h-11 sm:h-12 rounded-xl text-sm sm:text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                      : <>Create Account <ArrowRight className="w-4 h-4" /></>
                    }
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2.5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700"><strong>14-day free trial</strong> — card required, not charged for 14 days. Subscribe to continue.</p>
                </div>
              </div>
            )}

            {/* ── STEP 3 — Plan Selection ── */}
            {step === 3 && (
              <div>
                <div className="mb-5">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1">Choose your subscription</h1>
                  <p className="text-gray-500 text-xs sm:text-sm">Pick a plan then remove features you don't need. You can change this anytime.</p>
                </div>

                {/* Plan cards */}
                <div className="space-y-3 mb-4">
                  {PLANS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => { setSelectedPlan(p.key); setRemovedFeatures([]); }}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        selectedPlan === p.key ? 'border-[#0D3B6E] bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.badge}`}>{p.label}</span>
                          {p.popular && <span className="text-[10px] font-bold bg-[#0D3B6E] text-white px-2 py-0.5 rounded-full">Popular</span>}
                        </div>
                        <div className={`text-lg font-extrabold ${
                          selectedPlan === p.key ? 'text-[#0D3B6E]' : 'text-gray-900'
                        }`}>GH₵ {p.price.toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span></div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {p.features.map(f => (
                          <span key={f} className="text-xs text-gray-500 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {f}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Remove features */}
                {(() => {
                  const removable = Object.entries(REMOVABLE_FEATURES).filter(
                    ([key, f]) => f.deduction[selectedPlan as 'starter'|'pro'|'enterprise']
                  );
                  return removable.length > 0 ? (
                    <div className="mb-4 bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Remove features you don't need</p>
                      <p className="text-[10px] text-gray-400 mb-2">Price adjusts automatically.</p>
                      <div className="grid grid-cols-2 gap-2">
                        {removable.map(([key, f]) => {
                          const removed = removedFeatures.includes(key);
                          const saving = f.deduction[selectedPlan as 'starter'|'pro'|'enterprise'] || 0;
                          return (
                            <button
                              key={key}
                              onClick={() => toggleRemoved(selectedPlan, key)}
                              className={`rounded-lg border-2 p-2.5 text-left transition-all ${
                                removed ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                                  removed ? 'bg-red-400' : 'bg-green-500'
                                }`}>
                                  {removed
                                    ? <XCircle className="w-2.5 h-2.5 text-white" />
                                    : <CheckCircle className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className={`text-[10px] font-semibold ${
                                  removed ? 'text-red-600 line-through' : 'text-green-700'
                                }`}>{f.label}</span>
                              </div>
                              <div className={`text-[9px] font-bold pl-5 ${
                                removed ? 'text-red-400' : 'text-green-600'
                              }`}>
                                {removed ? `+GH₵${saving}/mo` : `-GH₵${saving}/mo`}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {removedFeatures.length > 0 && (
                        <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <span className="text-xs text-blue-700">{removedFeatures.length} feature{removedFeatures.length !== 1 ? 's' : ''} removed</span>
                          <span className="text-sm font-extrabold text-[#0D3B6E]">GH₵ {planTotal(selectedPlan).toLocaleString()}/mo</span>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}

                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button onClick={() => { setStep(2); setError(''); }} className="h-11 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 font-medium text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => { setError(''); setStep(4); }}
                    className="flex-1 bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold h-11 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    Continue to Card <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {error && (
                  <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">!</span>
                    {error}
                  </div>
                )}

                <p className="text-xs text-gray-400 text-center mt-3">14-day free trial — not charged until day 14</p>
              </div>
            )}

            {/* ── STEP 4 — Card ── */}
            {step === 4 && (
              <div>
                <div className="mb-5 sm:mb-6">
                  <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full mb-3 sm:mb-4">
                    <CheckCircle className="w-3.5 h-3.5" /> Account created successfully!
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1">One last step — secure your trial</h1>
                  <p className="text-gray-500 text-xs sm:text-sm">Add a card to keep access after your free trial. <strong className="text-gray-700">Nothing is charged today.</strong></p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">!</span>
                    {error}
                  </div>
                )}

                {/* Mock card visual */}
                <div className="relative h-40 sm:h-44 rounded-2xl bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0a2d54] p-5 sm:p-6 mb-4 sm:mb-5 overflow-hidden shadow-xl shadow-blue-200">
                  {/* Decorative circles */}
                  <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full" />
                  <div className="absolute -bottom-10 -left-6 w-40 h-40 bg-yellow-400/10 rounded-full" />
                  {/* Chip */}
                  <div className="w-9 h-6 sm:w-10 sm:h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 mb-4 sm:mb-5 flex items-center justify-center">
                    <div className="w-5 h-3.5 sm:w-6 sm:h-4 rounded-sm border border-yellow-600/40 grid grid-cols-2 gap-px p-0.5">
                      <div className="bg-yellow-600/30 rounded-sm" /><div className="bg-yellow-600/30 rounded-sm" />
                      <div className="bg-yellow-600/30 rounded-sm" /><div className="bg-yellow-600/30 rounded-sm" />
                    </div>
                  </div>
                  {/* Card number placeholder */}
                  <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
                    {['••••', '••••', '••••', '••••'].map((g, i) => (
                      <span key={i} className="text-white/60 font-mono text-sm sm:text-base tracking-widest">{g}</span>
                    ))}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-0.5">Card Holder</div>
                      <div className="text-white font-semibold text-xs sm:text-sm tracking-wide truncate max-w-[150px] sm:max-w-none">{form.business_name || 'Your Name'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-0.5">Expires</div>
                      <div className="text-white font-semibold text-xs sm:text-sm">••/••</div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 shadow-sm">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">What happens next</p>
                  <div className="space-y-0">
                    {[
                      { dot: 'bg-green-500', day: 'Today', text: 'Card saved — GH₵ 0 charged now' },
                      { dot: 'bg-blue-400', day: 'Days 1–13', text: 'Full access to every module, free' },
                      { dot: 'bg-yellow-400', day: 'Day 13', text: 'We remind you before any charge' },
                      { dot: 'bg-[#0D3B6E]', day: 'Day 14', text: 'Auto-billed only if you keep access' },
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
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 mb-4 sm:mb-5">
                  {[
                    { icon: Shield, text: 'SSL Secured' },
                    { icon: Lock, text: 'PCI Compliant' },
                    { icon: Zap, text: 'Subscribe to continue' },
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
                  className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] disabled:opacity-60 text-white font-bold h-11 sm:h-13 py-3 sm:py-3.5 rounded-xl text-sm sm:text-base transition-colors flex items-center justify-center gap-2.5 shadow-lg shadow-blue-200"
                >
                  {cardLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening payment…</>
                    : <><CreditCard className="w-4 h-4" /> Secure my trial with a card</>
                  }
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">Powered by Paystack · Your card details are never stored on our servers</p>

                <button
                  onClick={() => { setStep(3); setError(''); }}
                  className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors py-1.5 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to plan selection
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="w-full mt-1 text-sm text-gray-400 hover:text-gray-600 transition-colors py-2 underline underline-offset-2"
                >
                  Skip for now — remind me later
                </button>
              </div>
            )}

            {/* ── STEP 5 — Success ── */}
            {step === 5 && (
              <div className="text-center">
                {/* Animated success icon */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 sm:mb-6">
                  <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-200">
                    <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">You're all set! 🎉</h1>
                <p className="text-gray-500 mb-1 text-sm sm:text-base">
                  <span className="font-bold text-gray-800">{createdBusiness}</span> has been created.
                </p>
                <p className="text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8">Your 14-day free trial has started. Log in to get started.</p>

                <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 text-left shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">What to do next</p>
                  <div className="space-y-3">
                    {[
                      { step: '1', text: 'Add your products to inventory', color: 'bg-blue-500' },
                      { step: '2', text: 'Invite your staff members', color: 'bg-purple-500' },
                      { step: '3', text: 'Set up your online eCommerce store', color: 'bg-green-500' },
                      { step: '4', text: 'Configure your branches', color: 'bg-orange-500' },
                    ].map(item => (
                      <div key={item.step} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full ${item.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>{item.step}</div>
                        <span className="text-sm text-gray-600">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link href="/login" className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold h-11 sm:h-12 rounded-xl text-sm sm:text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
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
