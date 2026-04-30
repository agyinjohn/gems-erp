'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner, toast } from '@/components/ui';
import { Save, Info } from 'lucide-react';
import api from '@/lib/api';

const PLAN_COLORS: Record<string, string> = {
  starter:    'bg-blue-50 text-blue-700',
  pro:        'bg-purple-50 text-purple-700',
  enterprise: 'bg-orange-50 text-orange-700',
};

export default function PlatformSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [plans, setPlans]     = useState([
    { key: 'starter',    label: 'Starter',    price: 29,  max_branches: 1,   max_users: 5   },
    { key: 'pro',        label: 'Pro',        price: 79,  max_branches: 5,   max_users: 20  },
    { key: 'enterprise', label: 'Enterprise', price: 199, max_branches: 999, max_users: 999 },
  ]);
  const [trialDays, setTrialDays] = useState(14);
  const [graceDays, setGraceDays] = useState(7);

  useEffect(() => {
    api.get('/platform/settings')
      .then(r => {
        const s = r.data.data;
        setTrialDays(s.trial_days);
        setGraceDays(s.grace_days);
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

  const save = async () => {
    setSaving(true);
    try {
      const plansPayload = Object.fromEntries(
        plans.map(p => [p.key, { price: p.price, max_branches: p.max_branches, max_users: p.max_users }])
      );
      await api.put('/platform/settings', { trial_days: trialDays, grace_days: graceDays, plans: plansPayload });
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <AppLayout title="Platform Settings" subtitle="Configure plans, trial and billing settings" allowedRoles={['platform_admin']}>
      <Spinner />
    </AppLayout>
  );

  return (
    <AppLayout title="Platform Settings" subtitle="Configure plans, trial and billing settings" allowedRoles={['platform_admin']}>
      <div className="space-y-6">

        {/* Plan Configuration */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Plan Configuration</h2>
            <p className="text-sm text-gray-400 mt-0.5">Set pricing and limits for each subscription plan.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                {['Plan','Price / mo','Max Branches','Max Users'].map(h => (
                  <th key={h} className="px-6 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {plans.map(p => (
                <tr key={p.key}>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${PLAN_COLORS[p.key]}`}>
                      {p.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number" min={0} className="form-input pl-7"
                        value={p.price}
                        onChange={e => updatePlan(p.key, 'price', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number" min={1} className="form-input w-28"
                      value={p.max_branches === 999 ? '' : p.max_branches}
                      placeholder="Unlimited"
                      onChange={e => updatePlan(p.key, 'max_branches', parseInt(e.target.value) || 999)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number" min={1} className="form-input w-28"
                      value={p.max_users === 999 ? '' : p.max_users}
                      placeholder="Unlimited"
                      onChange={e => updatePlan(p.key, 'max_users', parseInt(e.target.value) || 999)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trial & Grace Period */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-0.5">Trial & Grace Period</h2>
          <p className="text-sm text-gray-400 mb-5">Control how long new businesses can trial and the grace period after expiry.</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="form-label">Trial Duration (days)</label>
              <input
                type="number" className="form-input" min={1} max={90}
                value={trialDays}
                onChange={e => setTrialDays(parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-400 mt-1.5">
                New businesses get <strong>{trialDays} days</strong> free before needing to subscribe.
              </p>
            </div>
            <div>
              <label className="form-label">Grace Period (days)</label>
              <input
                type="number" className="form-input" min={0} max={30}
                value={graceDays}
                onChange={e => setGraceDays(parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Accounts stay accessible for <strong>{graceDays} days</strong> after expiry before lockout.
              </p>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Plan pricing changes only affect new subscriptions. Existing tenants keep their current pricing until renewal.</span>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>

      </div>
    </AppLayout>
  );
}
