'use client';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast, ConfirmDialog } from '@/components/ui';
import {
  Wallet, Banknote, ArrowDownToLine, Plus, Star, Trash2, RefreshCw,
  CheckCircle, Clock, XCircle, Building2, AlertCircle,
} from 'lucide-react';

const MOMO_NETWORKS = [
  { code: 'MTN', label: 'MTN MoMo' },
  { code: 'VOD', label: 'Telecel / Vodafone Cash' },
  { code: 'ATL', label: 'AirtelTigo Money' },
];

interface PayoutMethod {
  id: string;
  type: string;
  label: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
  branch_id?: { id: string; name: string } | string | null;
}

interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'reversed';
  trigger: 'manual' | 'auto';
  reference: string;
  method_label?: string;
  failure_reason?: string;
  createdAt: string;
  branch_id?: { id: string; name: string } | null;
  requested_by?: { id: string; name: string } | null;
}

interface Balance {
  currency: string;
  gross_sales: number;
  platform_fees: number;
  refunds: number;
  earned: number;
  withdrawn: number;
  available: number;
  order_count: number;
  settings: { auto_payout: boolean; per_branch_methods: boolean; min_payout_amount: number };
  scope: { is_org_level: boolean; branch_id: string | null };
  destination: { id: string; label: string; account_name: string } | null;
}

const STATUS_STYLES: Record<string, { badge: string; icon: any; label: string }> = {
  paid:       { badge: 'bg-green-50 text-green-700',   icon: CheckCircle, label: 'Paid' },
  processing: { badge: 'bg-blue-50 text-blue-700',     icon: Clock,       label: 'Processing' },
  pending:    { badge: 'bg-amber-50 text-amber-700',   icon: Clock,       label: 'Pending' },
  failed:     { badge: 'bg-red-50 text-red-600',       icon: XCircle,     label: 'Failed' },
  reversed:   { badge: 'bg-gray-100 text-gray-600',    icon: XCircle,     label: 'Reversed' },
};

const cedis = (n: number) => `GHS ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const branchNameOf = (b: PayoutMethod['branch_id']) =>
  b && typeof b === 'object' ? b.name : null;

export default function PayoutsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'business_owner' || user?.role === 'platform_admin';

  const [balance, setBalance] = useState<Balance | null>(null);
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [requesting, setRequesting] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: 'mobile_money', account_number: '', account_name: '', bank_code: 'MTN', branch_id: '' });
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState<{ title: string; message: string; danger?: boolean; run: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = targetBranch ? { branch_id: targetBranch } : {};
      const [b, m, p] = await Promise.all([
        api.get('/payouts/balance', { params }),
        api.get('/payout-methods', { params }),
        api.get('/payouts', { params }),
      ]);
      setBalance(b.data.data);
      setMethods(m.data.data || []);
      setPayouts(p.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load payouts');
    } finally {
      setLoading(false);
    }
  }, [targetBranch]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isOwner) return;
    api.get('/branches').then(r => setBranches(r.data.data || [])).catch(() => {});
  }, [isOwner]);

  const askPayout = () => {
    if (!balance) return;
    const value = amount.trim() === '' ? balance.available : Number(amount);
    if (!Number.isFinite(value) || value <= 0) return toast.error('Enter a valid amount');
    if (value > balance.available) return toast.error(`Only ${cedis(balance.available)} is available`);

    setConfirm({
      title: 'Request this payout?',
      message: `${cedis(value)} will be transferred to ${balance.destination?.label || 'your payout account'}. This cannot be undone.`,
      run: () => doRequestPayout(value),
    });
  };

  const doRequestPayout = async (value: number) => {
    setRequesting(true);
    try {
      await api.post('/payouts', {
        amount: value,
        ...(targetBranch ? { branch_id: targetBranch } : {}),
      });
      toast.success('Payout requested — the transfer is on its way');
      setAmount('');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not request payout');
    } finally {
      setRequesting(false);
    }
  };

  const addMethod = async () => {
    if (!form.account_number.trim() || !form.account_name.trim()) {
      return toast.error('Account number and name are required');
    }
    setSaving(true);
    try {
      await api.post('/payout-methods', {
        ...form,
        branch_id: form.branch_id || undefined,
      });
      toast.success('Payout method added');
      setForm({ type: 'mobile_money', account_number: '', account_name: '', bank_code: 'MTN', branch_id: '' });
      setShowAdd(false);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not add payout method');
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    try {
      await api.patch(`/payout-methods/${id}/default`);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update');
    }
  };

  const removeMethod = (m: PayoutMethod) => {
    setConfirm({
      title: 'Remove this payout method?',
      message: `${m.account_name} (${m.label}) will no longer receive payouts.`,
      danger: true,
      run: async () => {
        try {
          await api.delete(`/payout-methods/${m.id}`);
          toast.success('Payout method removed');
          await load();
        } catch (e: any) {
          toast.error(e.response?.data?.message || 'Could not remove');
        }
      },
    });
  };

  const toggleSetting = async (key: 'auto_payout' | 'per_branch_methods', value: boolean) => {
    try {
      await api.put('/payouts/settings', { [key]: value });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update settings');
    }
  };

  const minAmount = balance?.settings.min_payout_amount ?? 10;
  const canWithdraw = !!balance && balance.available >= minAmount && !!balance.destination;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Payouts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Withdraw the money your shop has collected through Paystack.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && branches.length > 0 && (
              <select
                className="form-input !w-auto"
                value={targetBranch}
                onChange={e => setTargetBranch(e.target.value)}
              >
                <option value="">All branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Balance + withdraw ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Available to withdraw</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {balance?.scope.branch_id ? 'This branch’s takings' : 'Across the whole business'}
                </p>
              </div>
            </div>

            <p className="text-4xl font-extrabold text-gray-900 mb-1">
              {loading && !balance ? '—' : cedis(balance?.available || 0)}
            </p>
            <p className="text-xs text-gray-400 mb-5">
              {cedis(balance?.earned || 0)} earned · {cedis(balance?.withdrawn || 0)} already paid out
            </p>

            {balance && !balance.destination && (
              <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Add a payout method below before you can withdraw.</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label className="form-label">Amount</label>
                <input
                  className="form-input"
                  inputMode="decimal"
                  placeholder={balance ? `Leave blank to withdraw all (${cedis(balance.available)})` : 'Amount'}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={askPayout}
                disabled={requesting || !canWithdraw}
                className="btn-primary h-[42px]"
              >
                <ArrowDownToLine className="w-4 h-4" />
                {requesting ? 'Requesting…' : 'Request payout'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Minimum {cedis(minAmount)}. Paystack transfer fees are deducted from each payout.
              {balance?.destination && <> Paid to <span className="font-semibold text-gray-500">{balance.destination.label}</span>.</>}
            </p>
          </div>

          <div className="card">
            <h3 className="font-bold text-gray-900 mb-4">Where it came from</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Gross sales</dt>
                <dd className="font-semibold text-gray-900">{cedis(balance?.gross_sales || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Marketplace commission</dt>
                <dd className="font-semibold text-gray-500">− {cedis(balance?.platform_fees || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Refunds</dt>
                <dd className="font-semibold text-gray-500">− {cedis(balance?.refunds || 0)}</dd>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <dt className="text-gray-900 font-semibold">Earned</dt>
                <dd className="font-bold text-gray-900">{cedis(balance?.earned || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Paid out</dt>
                <dd className="font-semibold text-gray-500">− {cedis(balance?.withdrawn || 0)}</dd>
              </div>
            </dl>
            <p className="text-xs text-gray-400 mt-4">
              From {balance?.order_count || 0} Paystack-paid order{balance?.order_count === 1 ? '' : 's'}. Cash sales are not
              included — that money never passed through Paystack.
            </p>
          </div>
        </div>

        {/* ── Owner settings ── */}
        {isOwner && balance && (
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-4">Payout settings</h3>
            <div className="space-y-3">
              {[
                {
                  key: 'per_branch_methods' as const,
                  on: balance.settings.per_branch_methods,
                  title: 'Separate payout account per branch',
                  desc: 'Each branch is paid into its own account. Off means one account receives everything.',
                },
                {
                  key: 'auto_payout' as const,
                  on: balance.settings.auto_payout,
                  title: 'Pay out automatically after each order',
                  desc: 'Transfers every order as it is paid instead of building up a balance you withdraw yourself.',
                },
              ].map(s => (
                <div key={s.key} className="flex items-start justify-between gap-4 bg-gray-50 rounded-xl px-4 py-3.5 ring-1 ring-gray-100">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.on}
                    onClick={() => toggleSetting(s.key, !s.on)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${s.on ? 'bg-[#0D3B6E]' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Payout methods ── */}
        <div className="card">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Banknote className="w-5 h-5 text-[#0D3B6E]" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Payout methods</h2>
                <p className="text-sm text-gray-500 mt-0.5">Where your money is sent</p>
              </div>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setShowAdd(v => !v)}>
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {methods.length > 0 ? (
            <div className="space-y-2 mb-4">
              {methods.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm truncate">{m.account_name}</p>
                      {m.is_default && <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Default</span>}
                      <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {branchNameOf(m.branch_id) || 'All branches'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">
                      {m.label} · {m.type === 'mobile_money' ? 'Mobile Money' : 'Bank'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!m.is_default && (
                      <button type="button" onClick={() => setDefault(m.id)} className="text-gray-400 hover:text-[#0D3B6E]" title="Set as default">
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button type="button" onClick={() => removeMethod(m)} className="text-gray-400 hover:text-red-500" title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !showAdd && <p className="text-sm text-gray-400 mb-4">No payout method yet.</p>
          )}

          {showAdd && (
            <div className="border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value, bank_code: e.target.value === 'mobile_money' ? 'MTN' : '' }))}
                  >
                    <option value="mobile_money">Mobile Money</option>
                    <option value="bank">Bank Account</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">{form.type === 'mobile_money' ? 'Network' : 'Bank code'}</label>
                  {form.type === 'mobile_money' ? (
                    <select className="form-input" value={form.bank_code} onChange={e => setForm(p => ({ ...p, bank_code: e.target.value }))}>
                      {MOMO_NETWORKS.map(n => <option key={n.code} value={n.code}>{n.label}</option>)}
                    </select>
                  ) : (
                    <input className="form-input" placeholder="e.g. 030100" value={form.bank_code} onChange={e => setForm(p => ({ ...p, bank_code: e.target.value }))} />
                  )}
                </div>
                <div>
                  <label className="form-label">{form.type === 'mobile_money' ? 'Phone number' : 'Account number'}</label>
                  <input
                    className="form-input"
                    placeholder={form.type === 'mobile_money' ? '024XXXXXXX' : 'Account number'}
                    value={form.account_number}
                    onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Account name</label>
                  <input className="form-input" placeholder="Name on account" value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} />
                </div>
                {isOwner && balance?.settings.per_branch_methods && branches.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="form-label">Applies to</label>
                    <select className="form-input" value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))}>
                      <option value="">All branches</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" className="btn-primary" onClick={addMethod} disabled={saving}>
                  <Plus className="w-4 h-4" /> {saving ? 'Adding…' : 'Add payout method'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* ── History ── */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Payout history</h2>
          {payouts.length === 0 ? (
            <p className="text-sm text-gray-400">No payouts yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="table-header text-left">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Reference</th>
                    <th className="px-4 py-2.5">Destination</th>
                    <th className="px-4 py-2.5">Branch</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => {
                    const s = STATUS_STYLES[p.status] || STATUS_STYLES.pending;
                    const Icon = s.icon;
                    return (
                      <tr key={p.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.reference}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {p.method_label || '—'}
                          {p.trigger === 'auto' && <span className="ml-2 text-xs text-gray-400">(automatic)</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.branch_id?.name || 'All branches'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{cedis(p.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${s.badge} inline-flex items-center gap-1`}>
                            <Icon className="w-3 h-3" /> {s.label}
                          </span>
                          {p.failure_reason && <p className="text-xs text-red-500 mt-1">{p.failure_reason}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => { confirm?.run(); setConfirm(null); }}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          danger={confirm?.danger}
        />
      </div>
    </AppLayout>
  );
}
