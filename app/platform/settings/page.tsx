'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner, toast } from '@/components/ui';
import { Save, Info, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

const PLAN_COLORS: Record<string, string> = {
  starter:    'bg-blue-50 text-blue-700',
  pro:        'bg-purple-50 text-purple-700',
  enterprise: 'bg-orange-50 text-orange-700',
};

const TABS = [
  { key: 'plans',     label: 'Subscription Plans' },
  { key: 'billing',   label: 'Billing Policy' },
  { key: 'gateway',   label: 'Payment Gateway' },
  { key: 'identity',  label: 'Platform Identity' },
  { key: 'alerts',    label: 'Alerts' },
  { key: 'features',  label: 'Feature Flags' },
];

const MODULES = ['crm', 'accounting', 'hr', 'procurement', 'reports', 'storefront'] as const;
type Module = typeof MODULES[number];

const DEFAULT_FLAGS = {
  starter:    { crm: false, accounting: false, hr: false, procurement: false, reports: false, storefront: true },
  pro:        { crm: true,  accounting: true,  hr: true,  procurement: true,  reports: true,  storefront: true },
  enterprise: { crm: true,  accounting: true,  hr: true,  procurement: true,  reports: true,  storefront: true },
};

export default function PlatformSettingsPage() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState('plans');
  const [showSecret, setShowSecret] = useState(false);

  // Plans
  const [plans, setPlans] = useState([
    { key: 'starter',    label: 'Starter',    price: 29,  max_branches: 1,   max_users: 5   },
    { key: 'pro',        label: 'Pro',        price: 79,  max_branches: 5,   max_users: 20  },
    { key: 'enterprise', label: 'Enterprise', price: 199, max_branches: 999, max_users: 999 },
  ]);

  // Billing policy
  const [trialDays, setTrialDays]           = useState(14);
  const [graceDays, setGraceDays]           = useState(7);
  const [currency, setCurrency]             = useState('GHS');
  const [autoRenew, setAutoRenew]           = useState(true);

  // Platform identity
  const [platformName, setPlatformName]     = useState('GEMS');
  const [supportEmail, setSupportEmail]     = useState('support@gthink.com');
  const [platformLogo, setPlatformLogo]     = useState('');

  // Payment gateway
  const [paystackPublic, setPaystackPublic] = useState('');
  const [paystackSecret, setPaystackSecret] = useState('');
  const [webhookUrl, setWebhookUrl]         = useState('');

  // Alerts
  const [trialWarnDays, setTrialWarnDays]   = useState(3);
  const [expiryAlertDays, setExpiryAlertDays] = useState(7);

  // Audit retention
  const [auditRetention, setAuditRetention] = useState(90);

  // Feature flags
  const [flags, setFlags] = useState<typeof DEFAULT_FLAGS>(DEFAULT_FLAGS);

  useEffect(() => {
    api.get('/platform/settings')
      .then(r => {
        const s = r.data.data;
        setTrialDays(s.trial_days ?? 14);
        setGraceDays(s.grace_days ?? 7);
        setCurrency(s.currency ?? 'GHS');
        setAutoRenew(s.auto_renew_default ?? true);
        setPlatformName(s.platform_name ?? 'GEMS');
        setSupportEmail(s.support_email ?? 'support@gthink.com');
        setPlatformLogo(s.platform_logo ?? '');
        setPaystackPublic(s.paystack_public_key ?? '');
        setPaystackSecret(s.paystack_secret_key ?? '');
        setWebhookUrl(s.paystack_webhook_url ?? '');
        setTrialWarnDays(s.trial_warning_days ?? 3);
        setExpiryAlertDays(s.expiry_alert_days ?? 7);
        setAuditRetention(s.audit_retention_days ?? 90);
        if (s.feature_flags) setFlags(s.feature_flags);
        if (s.plans) {
          setPlans(prev => prev.map(p => ({
            ...p,
            price:        s.plans[p.key]?.price        ?? p.price,
            max_branches: s.plans[p.key]?.max_branches ?? p.max_branches,
            max_users:    s.plans[p.key]?.max_users    ?? p.max_users,
          })));
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const updatePlan = (key: string, field: string, value: number) =>
    setPlans(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p));

  const toggleFlag = (plan: keyof typeof DEFAULT_FLAGS, mod: Module) =>
    setFlags(prev => ({ ...prev, [plan]: { ...prev[plan], [mod]: !prev[plan][mod] } }));

  const save = async () => {
    setSaving(true);
    try {
      const plansPayload = Object.fromEntries(
        plans.map(p => [p.key, { price: p.price, max_branches: p.max_branches, max_users: p.max_users }])
      );
      await api.put('/platform/settings', {
        trial_days: trialDays, grace_days: graceDays, currency, auto_renew_default: autoRenew,
        platform_name: platformName, support_email: supportEmail, platform_logo: platformLogo,
        paystack_public_key: paystackPublic, paystack_secret_key: paystackSecret, paystack_webhook_url: webhookUrl,
        trial_warning_days: trialWarnDays, expiry_alert_days: expiryAlertDays,
        audit_retention_days: auditRetention,
        plans: plansPayload, feature_flags: flags,
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <AppLayout title="Platform Settings" subtitle="Configure platform-wide settings" allowedRoles={['platform_admin']}>
      <Spinner />
    </AppLayout>
  );

  return (
    <AppLayout title="Platform Settings" subtitle="Configure platform-wide settings" allowedRoles={['platform_admin']}>
      <div className="space-y-5">

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Plans ── */}
        {tab === 'plans' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Subscription Plans</h2>
              <p className="text-sm text-gray-400 mt-0.5">Set pricing and limits for each plan. Changes apply to new subscriptions only.</p>
            </div>
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>{['Plan', 'Price / mo', 'Max Branches', 'Max Users'].map(h => (
                  <th key={h} className="px-6 py-3 text-left">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plans.map(p => (
                  <tr key={p.key}>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${PLAN_COLORS[p.key]}`}>{p.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input type="number" min={0} className="form-input pl-7" value={p.price}
                          onChange={e => updatePlan(p.key, 'price', parseInt(e.target.value) || 0)} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input type="number" min={1} className="form-input w-28"
                        value={p.max_branches === 999 ? '' : p.max_branches} placeholder="Unlimited"
                        onChange={e => updatePlan(p.key, 'max_branches', parseInt(e.target.value) || 999)} />
                    </td>
                    <td className="px-6 py-4">
                      <input type="number" min={1} className="form-input w-28"
                        value={p.max_users === 999 ? '' : p.max_users} placeholder="Unlimited"
                        onChange={e => updatePlan(p.key, 'max_users', parseInt(e.target.value) || 999)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Billing Policy ── */}
        {tab === 'billing' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="font-bold text-gray-900 mb-0.5">Billing Policy</h2>
              <p className="text-sm text-gray-400">Control trial periods, grace windows, currency and auto-renew defaults.</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="form-label">Trial Duration (days)</label>
                <input type="number" className="form-input" min={1} max={90} value={trialDays}
                  onChange={e => setTrialDays(parseInt(e.target.value))} />
                <p className="text-xs text-gray-400 mt-1.5">New businesses get <strong>{trialDays} days</strong> free before needing to subscribe.</p>
              </div>
              <div>
                <label className="form-label">Grace Period (days)</label>
                <input type="number" className="form-input" min={0} max={30} value={graceDays}
                  onChange={e => setGraceDays(parseInt(e.target.value))} />
                <p className="text-xs text-gray-400 mt-1.5">Accounts stay accessible for <strong>{graceDays} days</strong> after expiry before lockout.</p>
              </div>
              <div>
                <label className="form-label">Default Currency</label>
                <select className="form-input" value={currency} onChange={e => setCurrency(e.target.value)}>
                  {['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">Used for payment logs and invoices across the platform.</p>
              </div>
              <div>
                <label className="form-label">Auto-Renew Default</label>
                <div className="flex items-center gap-3 mt-2">
                  <button type="button" onClick={() => setAutoRenew(!autoRenew)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${autoRenew ? 'bg-[#0D3B6E]' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoRenew ? 'translate-x-5' : ''}`} />
                  </button>
                  <span className="text-sm text-gray-600">{autoRenew ? 'Enabled for new tenants' : 'Disabled for new tenants'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Payment Gateway ── */}
        {tab === 'gateway' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
            <div>
              <h2 className="font-bold text-gray-900 mb-0.5">Payment Gateway — Paystack</h2>
              <p className="text-sm text-gray-400">Configure Paystack API keys used for tenant billing and storefront payments.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 max-w-lg">
              <div>
                <label className="form-label">Public Key</label>
                <input type="text" className="form-input font-mono text-sm" placeholder="pk_live_…"
                  value={paystackPublic} onChange={e => setPaystackPublic(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Secret Key</label>
                <div className="relative">
                  <input type={showSecret ? 'text' : 'password'} className="form-input font-mono text-sm pr-10"
                    placeholder="sk_live_…" value={paystackSecret} onChange={e => setPaystackSecret(e.target.value)} />
                  <button type="button" onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Leave unchanged to keep the existing key. Only the last 4 characters are shown.</p>
              </div>
              <div>
                <label className="form-label">Webhook URL</label>
                <input type="text" className="form-input font-mono text-sm" placeholder="https://api.yourdomain.com/webhooks/paystack"
                  value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1.5">Register this URL in your Paystack dashboard to receive payment events.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-sm text-yellow-700 max-w-lg">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Keys are stored securely. The secret key is masked after saving and never returned in full.</span>
            </div>
          </div>
        )}

        {/* ── Platform Identity ── */}
        {tab === 'identity' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
            <div>
              <h2 className="font-bold text-gray-900 mb-0.5">Platform Identity</h2>
              <p className="text-sm text-gray-400">Branding and contact details shown across the platform.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 max-w-lg">
              <div>
                <label className="form-label">Platform Name</label>
                <input type="text" className="form-input" value={platformName}
                  onChange={e => setPlatformName(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Support Email</label>
                <input type="email" className="form-input" value={supportEmail}
                  onChange={e => setSupportEmail(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1.5">Shown to tenants on billing and support pages.</p>
              </div>
              <div>
                <label className="form-label">Logo URL</label>
                <input type="text" className="form-input" placeholder="https://…" value={platformLogo}
                  onChange={e => setPlatformLogo(e.target.value)} />
                {platformLogo && (
                  <img src={platformLogo} alt="Logo preview" className="mt-2 h-12 object-contain rounded border border-gray-100" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Alerts ── */}
        {tab === 'alerts' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="font-bold text-gray-900 mb-0.5">Alerts & Notifications</h2>
              <p className="text-sm text-gray-400">Control when warning emails and admin alerts are triggered.</p>
            </div>
            <div className="grid grid-cols-2 gap-6 max-w-xl">
              <div>
                <label className="form-label">Trial Warning (days before expiry)</label>
                <input type="number" className="form-input" min={1} max={30} value={trialWarnDays}
                  onChange={e => setTrialWarnDays(parseInt(e.target.value))} />
                <p className="text-xs text-gray-400 mt-1.5">Send trial expiry warning email <strong>{trialWarnDays} days</strong> before trial ends.</p>
              </div>
              <div>
                <label className="form-label">Expiry Alert Threshold (days)</label>
                <input type="number" className="form-input" min={1} max={30} value={expiryAlertDays}
                  onChange={e => setExpiryAlertDays(parseInt(e.target.value))} />
                <p className="text-xs text-gray-400 mt-1.5">Flag tenants on the dashboard when subscription expires within <strong>{expiryAlertDays} days</strong>.</p>
              </div>
              <div>
                <label className="form-label">Audit Log Retention (days)</label>
                <input type="number" className="form-input" min={30} max={365} value={auditRetention}
                  onChange={e => setAuditRetention(parseInt(e.target.value))} />
                <p className="text-xs text-gray-400 mt-1.5">Audit logs older than <strong>{auditRetention} days</strong> will be purged automatically.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Feature Flags ── */}
        {tab === 'features' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Feature Flags per Plan</h2>
              <p className="text-sm text-gray-400 mt-0.5">Control which modules are available on each subscription plan.</p>
            </div>
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left">Module</th>
                  {plans.map(p => (
                    <th key={p.key} className="px-6 py-3 text-center">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${PLAN_COLORS[p.key]}`}>{p.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MODULES.map(mod => (
                  <tr key={mod}>
                    <td className="px-6 py-3.5 font-medium text-gray-700 capitalize">{mod}</td>
                    {plans.map(p => {
                      const planKey = p.key as keyof typeof DEFAULT_FLAGS;
                      const enabled = flags[planKey]?.[mod] ?? false;
                      return (
                        <td key={p.key} className="px-6 py-3.5 text-center">
                          <button type="button" onClick={() => toggleFlag(planKey, mod)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#0D3B6E]' : 'bg-gray-200'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-gray-50">
              <div className="flex items-start gap-2 text-xs text-gray-400">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Feature flag enforcement requires middleware integration on protected routes. These settings define the intended access policy per plan.</span>
              </div>
            </div>
          </div>
        )}

        {/* Save */}
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>

      </div>
    </AppLayout>
  );
}
