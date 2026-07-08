'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Download, RefreshCw, Edit2, Trash2, TrendingUp, AlertTriangle } from 'lucide-react';
import { EmptyState, Modal, Spinner, StatCard, toast } from '@/components/ui';
import api, { apiCache } from '@/lib/api';

function fmt(n: number | string | undefined | null) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  onDataChange?: () => void;
}

export default function AccountingBudgetPanel(_: Props) {
  const [periodType, setPeriodType] = useState<'monthly' | 'annual'>('monthly');
  const [period, setPeriod] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [form, setForm] = useState({ category: '', amount: '' });

  const load = useCallback(async (silent = false) => {
    const key = `/budgets/vs-actual?period=${period}&period_type=${periodType}`;
    const cached = apiCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      if (!apiCache.isStale(key)) return;
    }
    if (!silent) setLoading(true);
    try {
      const res = await api.get(key);
      apiCache.set(key, res.data.data);
      setData(res.data.data);
    } catch {
      if (!cached) { toast.error('Could not load budget report'); setData(null); }
    } finally {
      setLoading(false);
    }
  }, [period, periodType]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingRow(null);
    setForm({ category: '', amount: '' });
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingRow(row);
    setForm({ category: row.category, amount: String(row.budgeted || '') });
    setModalOpen(true);
  };

  const saveBudget = async () => {
    if (!form.category.trim() || !form.amount) {
      toast.error('Category and amount are required');
      return;
    }
    setSaving(true);
    try {
      if (editingRow?.budget_id) {
        await api.put(`/budgets/${editingRow.budget_id}`, { amount: form.amount });
      } else {
        await api.post('/budgets', {
          category: form.category,
          amount: form.amount,
          period,
          period_type: periodType,
        });
      }
      toast.success('Budget saved');
      setModalOpen(false);
      apiCache.invalidate('/budgets');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteBudget = async (id: string) => {
    if (!confirm('Remove this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      toast.success('Budget removed');
      apiCache.invalidate('/budgets');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Budget vs Actual', data.period_label || data.period],
      ['From', data.from || ''],
      ['To', data.to || ''],
      [],
      ['Category', 'Budget', 'Actual', 'Variance', '% Used'],
      ...(data.rows || []).map((r: any) => [
        r.category,
        String(r.budgeted),
        String(r.actual),
        String(r.variance),
        r.pct != null ? `${r.pct}%` : 'N/A',
      ]),
      [],
      ['TOTAL', String(data.totals?.budgeted ?? 0), String(data.totals?.actual ?? 0), String(data.totals?.variance ?? 0), ''],
    ];
    const csv = rows.map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `budget-${data.period}-${Date.now()}.csv`;
    a.click();
  };

  const rows = data?.rows || [];
  const totals = data?.totals || {};
  const summary = data?.summary || {};
  const categories: { value: string; label: string }[] = data?.categories || [];

  return (
    <div className={`space-y-5 relative ${loading && data ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div>
              <label className="form-label">Period type</label>
              <select className="form-input" value={periodType} onChange={(e) => {
                const t = e.target.value as 'monthly' | 'annual';
                setPeriodType(t);
                if (t === 'annual') setPeriod(String(new Date().getFullYear()));
                else {
                  const n = new Date();
                  setPeriod(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`);
                }
              }}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="form-label">{periodType === 'annual' ? 'Year' : 'Month'}</label>
              {periodType === 'annual'
                ? <input type="number" className="form-input w-full sm:w-28" value={period} onChange={(e) => setPeriod(e.target.value)} />
                : <input type="month" className="form-input" value={period} onChange={(e) => setPeriod(e.target.value)} />}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-xs" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button type="button" className="btn-primary text-xs" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> Set budget
            </button>
            {data && (
              <button type="button" className="btn-secondary text-xs" onClick={exportCsv}>
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}
          </div>
        </div>
        {data && (
          <p className="text-xs text-gray-500 mt-3">
            {data.period_label} · {data.from} → {data.to} · Actuals from expense records
          </p>
        )}
      </div>

      {loading && !data && <Spinner />}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total budgeted" value={fmt(totals.budgeted)} icon={<TrendingUp className="w-5 h-5 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" />
            <StatCard label="Total actual" value={fmt(totals.actual)} icon={<TrendingUp className="w-5 h-5 text-red-600" />} color="bg-red-50" />
            <StatCard label="Variance" value={fmt(totals.variance)} icon={<TrendingUp className="w-5 h-5 text-green-600" />} color={totals.variance >= 0 ? 'bg-green-50' : 'bg-red-50'} sub={totals.pct != null ? `${totals.pct}% used` : undefined} />
            <StatCard label="Over budget" value={String(summary.over_budget_count ?? 0)} icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} color="bg-amber-50" sub={`${summary.budgeted_categories ?? 0} budgeted categories`} />
          </div>

          {summary.unbudgeted_spend > 0 && (
            <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 py-3 text-sm text-gray-700">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{fmt(summary.unbudgeted_spend)} spent in categories without a budget set.</span>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-3 md:px-4 py-2 text-left">Category</th>
                  <th className="px-3 md:px-4 py-2 text-right">Budget</th>
                  <th className="px-3 md:px-4 py-2 text-right">Actual</th>
                  <th className="px-3 md:px-4 py-2 text-right hidden md:table-cell">Variance</th>
                  <th className="px-3 md:px-4 py-2 text-left w-32 md:w-40">% used</th>
                  <th className="px-3 md:px-4 py-2 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r: any) => {
                  const pct = r.pct ?? 0;
                  const barColor = pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-green-500';
                  return (
                    <tr key={r.category} className="hover:bg-gray-50/80">
                      <td className="px-3 md:px-4 py-2 md:py-3 font-medium">
                        {r.category}
                        {r.status === 'unbudgeted' && <span className="ml-2 text-xs text-amber-600">No budget</span>}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-right text-gray-700 tabular-nums">{fmt(r.budgeted)}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-right font-semibold text-red-600 tabular-nums">{fmt(r.actual)}</td>
                      <td className={`px-3 md:px-4 py-2 md:py-3 text-right font-semibold tabular-nums hidden md:table-cell ${r.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(r.variance)}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        {r.pct != null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                              <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-xs tabular-nums w-10 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="flex gap-1 justify-end">
                          <button type="button" onClick={() => openEdit(r)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 className="w-3.5 h-3.5" /></button>
                          {r.budget_id && (
                            <button type="button" onClick={() => deleteBudget(r.budget_id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t bg-gray-50 font-semibold">
                <tr>
                  <td className="px-3 md:px-4 py-2 md:py-3">Total</td>
                  <td className="px-3 md:px-4 py-2 md:py-3 text-right tabular-nums">{fmt(totals.budgeted)}</td>
                  <td className="px-3 md:px-4 py-2 md:py-3 text-right tabular-nums text-red-700">{fmt(totals.actual)}</td>
                  <td className={`px-3 md:px-4 py-2 md:py-3 text-right tabular-nums hidden md:table-cell ${totals.variance >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(totals.variance)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {!data && !loading && (
        <EmptyState message="No budget data for this period" icon={<TrendingUp className="w-8 h-8 text-gray-300" />} />
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingRow(null); }} title={editingRow?.budget_id ? 'Edit budget' : 'Set budget'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="form-label">Category *</label>
            {editingRow?.budget_id ? (
              <input className="form-input bg-gray-50" value={form.category} disabled />
            ) : categories.length > 0 ? (
              <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            ) : (
              <input className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. rent, salaries" />
            )}
          </div>
          <div>
            <label className="form-label">Budget amount (GH₵) *</label>
            <input type="number" step="0.01" className="form-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          </div>
          <p className="text-xs text-gray-400">Period: <strong>{period}</strong> ({periodType})</p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); setEditingRow(null); }}>Cancel</button>
          <button type="button" className="btn-primary" onClick={saveBudget} disabled={saving}>{saving ? 'Saving…' : 'Save budget'}</button>
        </div>
      </Modal>
    </div>
  );
}
