'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner, toast } from '@/components/ui';
import { CheckCircle, Clock, XCircle, AlertTriangle, CreditCard, RefreshCw, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

const DEFAULT_PLANS = [
  {
    key:       'starter',
    label:     'Starter',
    price:     29,
    color:     'border-blue-200 bg-blue-50',
    badge:     'bg-blue-100 text-blue-700',
    highlight: 'text-blue-600',
    features:  ['1 Branch', '5 Users', 'All core modules', 'Storefront', 'POS'],
  },
  {
    key:       'pro',
    label:     'Pro',
    price:     79,
    color:     'border-purple-200 bg-purple-50',
    badge:     'bg-purple-100 text-purple-700',
    highlight: 'text-purple-600',
    features:  ['5 Branches', '20 Users', 'All core modules', 'Storefront', 'POS', 'Priority support'],
    popular:   true,
  },
  {
    key:       'enterprise',
    label:     'Enterprise',
    price:     199,
    color:     'border-orange-200 bg-orange-50',
    badge:     'bg-orange-100 text-orange-700',
    highlight: 'text-orange-600',
    features:  ['Unlimited Branches', 'Unlimited Users', 'All modules', 'Storefront', 'POS', 'Dedicated support'],
  },
];

const DURATIONS = [
  { days: 30,  label: '1 Month',  discount: 0 },
  { days: 90,  label: '3 Months', discount: 5 },
  { days: 180, label: '6 Months', discount: 10 },
  { days: 365, label: '1 Year',   discount: 20 },
];

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  active:    { icon: CheckCircle,  color: 'text-green-600 bg-green-50 border-green-200',  label: 'Active' },
  trial:     { icon: Clock,        color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Trial' },
  expired:   { icon: XCircle,      color: 'text-red-600 bg-red-50 border-red-200',        label: 'Expired' },
  suspended: { icon: AlertTriangle,color: 'text-gray-600 bg-gray-50 border-gray-200',     label: 'Suspended' },
};

export default function BillingPage() {
  const { tenant: authTenant } = useAuth();
  const [status, setStatus]             = useState<any>(null);
  const [transactions, setTransactions]  = useState<any[]>([]);
  const [card, setCard]                  = useState<any>(null);
  const [plans, setPlans]                = useState(DEFAULT_PLANS);
  const [loading, setLoading]            = useState(true);
  const [selectedPlan, setSelectedPlan]  = useState('');
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [paying, setPaying]              = useState(false);
  const [cardSaving, setCardSaving]      = useState(false);

  // Auto-save card after Paystack redirect back with ?card_saved=true&reference=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (params.get('card_saved') !== 'true' || !reference) return;
    // Clean URL immediately
    window.history.replaceState({}, '', '/billing');
    setCardSaving(true);
    api.post('/billing/save-card', { reference })
      .then(() => { toast.success('Card saved! Auto-renewal is now active.'); })
      .catch(() => { toast.error('Could not save card. Please try again.'); })
      .finally(() => { setCardSaving(false); load(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [s, t, cfg, c] = await Promise.all([
        api.get('/billing/status'),
        api.get('/billing/transactions'),
        api.get('/plan-prices').catch(() => ({ data: { data: null } })),
        api.get('/billing/card').catch(() => ({ data: { data: null } })),
      ]);
      setStatus(s.data.data);
      setTransactions(t.data.data);
      setCard(c.data.data);
      setSelectedPlan(s.data.data.plan);
      if (cfg.data.data?.plans) {
        const backendPlans = cfg.data.data.plans;
        setPlans(DEFAULT_PLANS.map(p => ({
          ...p,
          price: backendPlans[p.key]?.price ?? p.price,
        })));
      }
    } catch { toast.error('Failed to load billing info'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const getAmount = (plan: string, days: number) => {
    const base = plans.find(p => p.key === plan)?.price || 0;
    const dur  = DURATIONS.find(d => d.days === days);
    const disc = dur?.discount || 0;
    return ((base * (days / 30)) * (1 - disc / 100)).toFixed(2);
  };

  const handlePay = async () => {
    if (!selectedPlan) return;
    setPaying(true);
    try {
      const r = await api.post('/billing/subscribe', { plan: selectedPlan, duration_days: selectedDuration });
      const { transaction_id, amount, email, paystack_public_key, reference } = r.data.data;

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => {
        const handler = (window as any).PaystackPop.setup({
          key:      paystack_public_key || 'pk_test_demo',
          email,
          amount:   Math.round(parseFloat(amount) * 100),
          currency: 'GHS',
          ref:      reference,
          onClose:  () => setPaying(false),
          callback: async (response: any) => {
            try {
              await api.post('/billing/verify', { reference: response.reference, transaction_id });
              toast.success('Payment successful! Subscription activated.');
              load();
            } catch { toast.error('Payment verification failed. Contact support.'); }
            finally { setPaying(false); }
          },
        });
        handler.openIframe();
      };
      document.body.appendChild(script);
    } catch(e: any) {
      toast.error(e.response?.data?.message || 'Failed to initiate payment');
      setPaying(false);
    }
  };

  if (loading) return (
    <AppLayout title="Billing" subtitle="Manage your subscription" allowedRoles={['business_owner']}>
      <Spinner />
    </AppLayout>
  );

  const statusCfg = STATUS_CONFIG[status?.subscription_status] || STATUS_CONFIG.trial;
  const StatusIcon = statusCfg.icon;
  const daysLeft  = status?.days_remaining;
  const daysTotal  = status?.total_days || 30;
  const progressPct = daysLeft !== null && daysLeft > 0
    ? Math.min(100, Math.round((daysLeft / daysTotal) * 100))
    : 0;

  return (
    <AppLayout title="Billing" subtitle="Manage your subscription and payments" allowedRoles={['business_owner']}>
      {cardSaving && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-sm text-blue-700">
          <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
          Saving your card… please wait.
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — Current status */}
        <div className="lg:col-span-2 space-y-5">

          {/* Current subscription card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Current Subscription</h2>
                <p className="text-sm text-gray-400 mt-0.5">{authTenant?.business_name}</p>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${statusCfg.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusCfg.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Current Plan</div>
                <div className="font-bold text-gray-900 capitalize text-lg">{status?.plan}</div>
                <div className="text-xs text-gray-400">${status?.plan_price}/mo</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Expires</div>
                <div className="font-bold text-gray-900 text-sm">
                  {status?.subscription_expires_at
                    ? new Date(status.subscription_expires_at).toLocaleDateString('en-GH', { day:'2-digit', month:'short', year:'numeric' })
                    : '—'}
                </div>
                <div className={`text-xs font-semibold mt-0.5 ${daysLeft !== null && daysLeft <= 7 ? 'text-red-500' : 'text-gray-400'}`}>
                  {daysLeft !== null ? (daysLeft <= 0 ? 'Expired' : `${daysLeft} days left`) : '—'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Limits</div>
                <div className="text-sm font-semibold text-gray-900">{status?.max_branches === 999 ? '∞' : status?.max_branches} branches</div>
                <div className="text-xs text-gray-400">{status?.max_users === 999 ? 'Unlimited' : status?.max_users} users</div>
              </div>
            </div>

            {/* Days remaining progress bar */}
            {daysLeft !== null && daysLeft > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Subscription progress</span>
                  <span>{daysLeft} days remaining</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${daysLeft <= 7 ? 'bg-red-400' : daysLeft <= 14 ? 'bg-orange-400' : 'bg-green-400'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Saved card + auto-renew status */}
            <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {card ? (
                  <>
                    <div className="w-10 h-7 bg-gray-800 rounded flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800 capitalize">{card.card_type} •••• {card.last4}</div>
                      <div className="text-xs text-gray-400">{card.bank} · Expires {card.exp_month}/{card.exp_year}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-orange-600 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> No card saved — add one to enable auto-renewal
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!card && (
                  <button
                    onClick={async () => {
                      try {
                        const r = await api.post('/billing/authorize-card');
                        window.location.href = r.data.data.authorization_url;
                      } catch(e: any) { toast.error(e.response?.data?.message || 'Failed'); }
                    }}
                    className="text-xs font-bold text-[#0D3B6E] hover:underline"
                  >
                    + Add Card
                  </button>
                )}
                {status?.auto_renew && card && (
                  <button
                    onClick={async () => {
                      if (!confirm('Cancel auto-renewal? Your subscription will expire at the end of the current period.')) return;
                      try {
                        await api.post('/billing/cancel');
                        toast.success('Auto-renewal cancelled.');
                        load();
                      } catch(e: any) { toast.error(e.response?.data?.message || 'Failed'); }
                    }}
                    className="text-xs text-red-500 hover:underline font-medium"
                  >
                    Cancel Auto-Renewal
                  </button>
                )}
                {!status?.auto_renew && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Auto-renewal off</span>
                )}
              </div>
            </div>
            {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
              <div className="mt-4 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Your subscription expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>. Renew now to avoid interruption.
              </div>
            )}
            {daysLeft !== null && daysLeft <= 0 && (
              <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                Your subscription has expired. Renew immediately to restore full access.
              </div>
            )}

            {/* Saved card + auto-renew */}
            <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {card ? (
                  <>
                    <div className="w-10 h-7 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800 capitalize">{card.card_type} •••• {card.last4}</div>
                      <div className="text-xs text-gray-400">{card.bank} · Expires {card.exp_month}/{card.exp_year}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-orange-600 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> No card saved — add one to enable auto-renewal
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!card && (
                  <button
                    onClick={async () => {
                      try {
                        const r = await api.post('/billing/authorize-card');
                        window.location.href = r.data.data.authorization_url;
                      } catch(e: any) { toast.error(e.response?.data?.message || 'Failed to initialize'); }
                    }}
                    className="text-xs font-bold text-[#0D3B6E] border border-[#0D3B6E] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    + Add Card
                  </button>
                )}
                {status?.auto_renew && card && (
                  <button
                    onClick={async () => {
                      if (!confirm('Cancel auto-renewal? Your subscription will expire at the end of the current period.')) return;
                      try {
                        await api.post('/billing/cancel');
                        toast.success('Auto-renewal cancelled.');
                        load();
                      } catch(e: any) { toast.error(e.response?.data?.message || 'Failed'); }
                    }}
                    className="text-xs text-red-500 hover:underline font-medium"
                  >
                    Cancel Auto-Renewal
                  </button>
                )}
                {!status?.auto_renew && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Auto-renewal off</span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right — Transaction history */}
        <div className="space-y-5">

          {/* Smart upgrade tip based on current plan */}
          {status?.plan !== 'enterprise' && (() => {
            const isStarter = status?.plan === 'starter';
            const next = isStarter
              ? { key: 'pro',        label: 'Pro',        price: plans.find(p=>p.key==='pro')?.price || 79,  features: '5 branches, 20 users and priority support', gradient: 'from-purple-600 to-purple-800' }
              : { key: 'enterprise', label: 'Enterprise', price: plans.find(p=>p.key==='enterprise')?.price || 199, features: 'unlimited branches, unlimited users and dedicated support', gradient: 'from-orange-500 to-orange-700' };
            return (
              <div className={`bg-gradient-to-br ${next.gradient} rounded-xl p-5 text-white`}>
                <Zap className="w-6 h-6 text-yellow-400 mb-3" />
                <h3 className="font-bold text-lg mb-1">Upgrade to {next.label}</h3>
                <p className="text-white/70 text-sm mb-4">Get {next.features} for just ${next.price}/month.</p>
                <button
                  onClick={() => { setSelectedPlan(next.key); setSelectedDuration(30); }}
                  className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Upgrade to {next.label}
                </button>
              </div>
            );
          })()}

          {/* Payment history removed — moved to full width below */}
        </div>
      </div>

      {/* Plan selection — full width */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mt-6">
        <h2 className="font-bold text-gray-900 mb-1">Choose a Plan</h2>
        <p className="text-sm text-gray-400 mb-5">Select a plan to renew or upgrade your subscription.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {plans.map(p => (
            <button
              key={p.key}
              onClick={() => setSelectedPlan(p.key)}
              className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                selectedPlan === p.key ? `${p.color} border-current` : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-3 ${p.badge}`}>{p.label}</div>
              <div className={`text-3xl font-extrabold ${selectedPlan === p.key ? p.highlight : 'text-gray-900'}`}>
                ${p.price}<span className="text-sm font-normal text-gray-400">/mo</span>
              </div>
              <ul className="mt-4 space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="text-sm text-gray-500 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* Duration selection */}
        <div className="mb-5">
          <label className="form-label">Billing Duration</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DURATIONS.map(d => (
              <button
                key={d.days}
                onClick={() => setSelectedDuration(d.days)}
                className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  selectedDuration === d.days ? 'border-[#0D3B6E] bg-[#0D3B6E] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {d.label}
                {d.discount > 0 && (
                  <div className={`text-xs mt-0.5 ${selectedDuration === d.days ? 'text-yellow-300' : 'text-green-600'}`}>
                    Save {d.discount}%
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Summary + Pay button */}
        <div className="bg-gray-50 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900 capitalize">{selectedPlan}</span> plan ·{' '}
              {DURATIONS.find(d => d.days === selectedDuration)?.label}
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">
              ${getAmount(selectedPlan, selectedDuration)}
              {DURATIONS.find(d => d.days === selectedDuration)?.discount ? (
                <span className="text-base font-normal text-green-600 ml-2">
                  {DURATIONS.find(d => d.days === selectedDuration)?.discount}% off
                </span>
              ) : null}
            </div>
          </div>
          <button
            onClick={handlePay}
            disabled={paying || !selectedPlan}
            className="btn-primary px-8 py-4 text-base disabled:opacity-50 w-full sm:w-auto"
          >
            {paying ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Pay with Paystack</>
            )}
          </button>
        </div>
      </div>

      {/* Payment History — full width */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mt-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Payment History</h2>
            <p className="text-xs text-gray-400 mt-0.5">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No payments yet. Your transactions will appear here after your first payment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  {['Date','Plan','Duration','Amount','Reference','Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(t => (
                  <tr key={t._id || t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString('en-GH', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                        t.plan === 'starter' ? 'bg-blue-50 text-blue-700' :
                        t.plan === 'pro'     ? 'bg-purple-50 text-purple-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>{t.plan}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{t.duration_days} days</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">${parseFloat(t.amount).toFixed(2)}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{t.payment_ref || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        t.status === 'success' ? 'bg-green-100 text-green-700' :
                        t.status === 'failed'  ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
