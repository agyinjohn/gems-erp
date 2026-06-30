'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Download, Eye, Edit2, BookMarked, RefreshCw,
  Ban, CheckCircle2, FolderTree, Loader2,
} from 'lucide-react';
import { Modal, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api from '@/lib/api';
import AccountingLedgerPanel from '@/components/accounting/AccountingLedgerPanel';

const TYPE_COLORS: Record<string, string> = {
  asset: 'bg-green-100 text-green-800',
  liability: 'bg-red-100 text-red-800',
  equity: 'bg-blue-100 text-blue-800',
  revenue: 'bg-purple-100 text-purple-800',
  expense: 'bg-yellow-100 text-yellow-800',
};

const TYPE_OPTIONS = ['', 'asset', 'liability', 'equity', 'revenue', 'expense'];

function fmt(n: number | string | undefined) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  onDataChange?: () => void;
}

export default function AccountingAccountsPanel({ onDataChange }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showGroups, setShowGroups] = useState(true);
  const [ledgerAccount, setLedgerAccount] = useState<any>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [syncingCoa, setSyncingCoa] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    code: '', name: '', type: 'asset', description: '', opening_balance: '', parent_id: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: 'coa', include_groups: String(showGroups) });
      if (typeFilter) params.set('type', typeFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/accounts?${params.toString()}`);
      setData(res.data.data);
    } catch {
      toast.error('Could not load chart of accounts');
    } finally {
      setLoading(false);
    }
  }, [showGroups, typeFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const groupAccounts = useMemo(
    () => (data?.accounts || []).filter((a: any) => a.is_group),
    [data],
  );

  const openAdd = () => {
    setSelected(null);
    setForm({ code: '', name: '', type: 'asset', description: '', opening_balance: '', parent_id: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (a: any) => {
    if (a.is_group) {
      toast.error('Group header accounts are managed via Update COA.');
      return;
    }
    setSelected(a);
    setForm({
      code: a.code,
      name: a.name,
      type: a.type,
      description: a.description || '',
      opening_balance: String(a.display_balance ?? 0),
      parent_id: a.parent_id || '',
    });
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and name are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (selected) {
        await api.put(`/accounts/${selected.id}`, form);
        toast.success('Account updated');
      } else {
        await api.post('/accounts', form);
        toast.success('Account created');
      }
      setModalOpen(false);
      load();
      onDataChange?.();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (a: any) => {
    if (a.is_group) return;
    const next = a.is_active === false;
    const label = next ? 'reactivate' : 'deactivate';
    if (!confirm(`${next ? 'Reactivate' : 'Deactivate'} account "${a.code} ${a.name}"?`)) return;
    try {
      await api.patch(`/accounts/${a.id}/active`, { is_active: next });
      toast.success(`Account ${label}d`);
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || `Could not ${label} account`);
    }
  };

  const seedCoa = async () => {
    setSyncingCoa(true);
    try {
      await api.post('/accounting/seed-coa');
      toast.success('Standard chart of accounts synced');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'COA sync failed');
    } finally {
      setSyncingCoa(false);
    }
  };

  const exportCsv = () => {
    const rows = data?.accounts || [];
    const header = ['Code', 'Name', 'Type', 'Group', 'Parent', 'Balance', 'Debit Total', 'Credit Total', 'Entries', 'Last Activity'];
    const body = rows.map((a: any) => [
      a.code,
      a.name,
      a.type,
      a.is_group ? 'Yes' : 'No',
      a.parent_code || '',
      a.is_group ? '' : (a.display_balance ?? 0).toFixed(2),
      a.is_group ? '' : (a.debit_total ?? 0).toFixed(2),
      a.is_group ? '' : (a.credit_total ?? 0).toFixed(2),
      a.entry_count ?? 0,
      a.last_activity ? new Date(a.last_activity).toLocaleDateString() : '',
    ]);
    const csv = [header, ...body].map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `chart-of-accounts-${Date.now()}.csv`;
    a.click();
  };

  const balanceDiff = selected
    ? Math.abs(parseFloat(form.opening_balance || '0') - parseFloat(selected.display_balance || '0'))
    : 0;

  if (loading && !data) return <Spinner />;

  const summary = data?.summary;
  const accounts: any[] = data?.accounts || [];

  return (
    <div className={`space-y-5 relative ${loading || syncingCoa ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <StatCard label="Total accounts" value={summary.total} icon={<BookMarked className="w-5 h-5 text-blue-600" />} color="bg-blue-50" sub={`${summary.posting} posting · ${summary.groups} groups`} />
          <StatCard label="With activity" value={summary.with_activity} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} color="bg-green-50" sub="Posting accounts used in GL" />
          {(summary.by_type || []).slice(0, 3).map((t: any) => (
            <StatCard key={t.type} label={t.type.charAt(0).toUpperCase() + t.type.slice(1)} value={t.count} icon={<FolderTree className="w-5 h-5 text-gray-600" />} color="bg-gray-50" sub={t.count ? fmt(t.balance) : 'No balance'} />
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="form-input pl-9"
              placeholder="Search by code, name or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="form-input w-full lg:w-40" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {TYPE_OPTIONS.map((t) => (
              <option key={t || 'all'} value={t}>{t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All types'}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
            <input type="checkbox" checked={showGroups} onChange={(e) => setShowGroups(e.target.checked)} className="rounded" />
            Show group headers
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={seedCoa} disabled={syncingCoa}>
              {syncingCoa
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing…</>
                : <><RefreshCw className="w-3.5 h-3.5" /> Sync COA</>}
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={exportCsv} disabled={!accounts.length}><Download className="w-3.5 h-3.5" /> CSV</button>
            <button type="button" className="btn-primary text-xs" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add account</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {syncingCoa ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-600 mt-3 font-medium">Syncing chart of accounts…</p>
            <p className="text-xs text-gray-400 mt-1">Adding standard GL accounts and parent links</p>
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState
            message="No accounts match your filters"
            description="Sync the standard COA or add a custom posting account."
            icon={<BookMarked className="w-8 h-8 text-gray-300" />}
            action={{ label: 'Sync standard COA', onClick: seedCoa }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  {['Code', 'Account', 'Type', 'Balance', 'Activity', ''].map((h) => (
                    <th key={h || 'actions'} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {accounts.map((a) => {
                  const indent = Math.max(0, (a.level || 1) - 1) * 12;
                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-gray-50/80 ${a.is_group ? 'bg-gray-50/60 font-semibold' : ''} ${a.is_active === false ? 'opacity-50' : ''}`}
                    >
                      <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{a.code}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3" style={{ paddingLeft: `${12 + indent}px` }}>
                        <div className="font-medium text-gray-900">{a.name}</div>
                        {a.description && <div className="text-xs text-gray-400 truncate max-w-xs">{a.description}</div>}
                        {a.parent_code && <div className="text-[10px] text-gray-400">Under {a.parent_code}</div>}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <span className={`badge text-xs ${TYPE_COLORS[a.type] || 'bg-gray-100 text-gray-800'}`}>
                          {a.type}{a.is_group ? ' · group' : ''}
                        </span>
                        {a.is_system && !a.is_group && (
                          <span className="ml-1 text-[10px] text-gray-400 uppercase">std</span>
                        )}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 tabular-nums font-semibold whitespace-nowrap">
                        {a.is_group ? '—' : fmt(a.display_balance)}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-xs text-gray-500 whitespace-nowrap hidden md:table-cell">
                        {a.is_group ? '—' : (
                          <>
                            {a.entry_count || 0} entr{(a.entry_count || 0) === 1 ? 'y' : 'ies'}
                            {a.last_activity && (
                              <div className="text-[10px] text-gray-400">{new Date(a.last_activity).toLocaleDateString()}</div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        {!a.is_group && (
                          <div className="flex gap-1 justify-end">
                            <button type="button" onClick={() => setLedgerAccount(a)} title="View ledger" className="p-1.5 hover:bg-blue-50 rounded text-blue-600">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => openEdit(a)} title="Edit" className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive(a)}
                              title={a.is_active === false ? 'Reactivate' : 'Deactivate'}
                              className="p-1.5 hover:bg-red-50 rounded text-red-500"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Balances are live from the general ledger. Liability, equity and revenue accounts show credit-normal balances as positive amounts.
        Group accounts cannot be posted to directly.
      </p>

      {/* Add / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Edit Account' : 'Add Account'} size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Code *</label>
              <input className="form-input font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 5910" disabled={!!selected} />
            </div>
            <div>
              <label className="form-label">Type *</label>
              <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} disabled={!!selected && selected.is_system}>
                {['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Account name *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Travel Expenses" />
          </div>
          {!selected && groupAccounts.length > 0 && (
            <div>
              <label className="form-label">Parent group (optional)</label>
              <select className="form-input" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                <option value="">None</option>
                {groupAccounts.filter((g: any) => g.type === form.type).map((g: any) => (
                  <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="form-label">{selected ? 'Balance (GH₵)' : 'Opening balance (GH₵)'}</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={form.opening_balance}
              onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
              placeholder="0.00"
            />
            {selected && balanceDiff > 0.001 && (
              <p className="text-xs text-blue-600 mt-1">
                A balancing journal entry of {fmt(balanceDiff)} will be posted to Owner&apos;s Equity (3001).
              </p>
            )}
            {!selected && parseFloat(form.opening_balance || '0') !== 0 && (
              <p className="text-xs text-blue-600 mt-1">Opening balance posts via journal entry to equity account 3001.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setModalOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : selected ? 'Update account' : 'Create account'}
          </button>
        </div>
      </Modal>

      <AccountingLedgerPanel account={ledgerAccount} onClose={() => setLedgerAccount(null)} />
    </div>
  );
}
