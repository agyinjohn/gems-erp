'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus, Download, RefreshCw, Edit2, Trash2, Receipt, AlertTriangle, CheckCircle2, FileText,
} from 'lucide-react';

const CedisIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold font-serif leading-none flex items-center justify-center ${className}`}>₵</span>
);
import { EmptyState, Modal, Spinner, StatCard, toast } from '@/components/ui';
import api, { apiCache } from '@/lib/api';

type PeriodKey = 'mtd' | 'ytd' | 'all' | 'custom';

function fmt(n: number | string | undefined | null) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function displayDateRange(from?: string | null, to?: string | null) {
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return 'All dates';
}

const PERIOD_PRESETS: { key: PeriodKey; label: string }[] = [
  { key: 'mtd', label: 'MTD' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All time' },
];

interface Props {
  onDataChange?: () => void;
}

export default function AccountingTaxPanel(_: Props) {
  const [period, setPeriod] = useState<PeriodKey>('ytd');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [taxModal, setTaxModal] = useState<'add' | 'edit' | null>(null);
  const [selectedTax, setSelectedTax] = useState<any>(null);
  const [taxForm, setTaxForm] = useState({ name: '', rate: '', applies_to: 'both', is_active: true });

  const load = useCallback(async (silent = false) => {
    if (period === 'custom' && !from && !to) {
      setData(null);
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    if (period === 'custom') {
      params.append('period', 'custom');
      if (from) params.append('from', from);
      if (to) params.append('to', to);
    } else {
      params.append('period', period);
    }
    const key = `/accounting/tax?${params.toString()}`;
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
    } catch (e: any) {
      if (!cached) { toast.error(e.response?.data?.message || 'Could not load tax data'); setData(null); }
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => { load(); }, [load]);

  const vat = data?.vat?.empty ? null : data?.vat;
  const rates = data?.rows || [];
  const ratesSummary = data?.summary || {};
  const customNeedsDates = period === 'custom' && !from && !to;

  const openAdd = () => {
    setSelectedTax(null);
    setTaxForm({ name: '', rate: '', applies_to: 'both', is_active: true });
    setError('');
    setTaxModal('add');
  };

  const openEdit = (t: any) => {
    setSelectedTax(t);
    setTaxForm({
      name: t.name,
      rate: String(t.rate),
      applies_to: t.applies_to,
      is_active: t.is_active,
    });
    setError('');
    setTaxModal('edit');
  };

  const saveTax = async () => {
    if (!taxForm.name.trim() || !taxForm.rate) {
      toast.error('Name and rate are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (selectedTax) await api.put(`/tax-rates/${selectedTax.id}`, taxForm);
      else await api.post('/tax-rates', taxForm);
      toast.success('Tax rate saved');
      setTaxModal(null);
      apiCache.invalidate('/accounting/tax');
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteTax = async (id: string) => {
    if (!confirm('Delete this tax rate?')) return;
    try {
      await api.delete(`/tax-rates/${id}`);
      toast.success('Tax rate deleted');
      apiCache.invalidate('/accounting/tax');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const exportVatCsv = () => {
    if (!vat) return;
    const rows: string[][] = [
      ['VAT Return', vat.period_label || '', displayDateRange(vat.filters?.from, vat.filters?.to)],
      [],
      ['Output VAT (collected)', String(vat.output_vat ?? 0)],
      ['Input VAT (paid)', String(vat.input_vat ?? 0)],
      ['Net VAT payable', String(vat.net_vat_payable ?? 0)],
      ['Status', vat.status || ''],
      [],
      ['Output credits', String(vat.breakdown?.output?.credits ?? 0)],
      ['Output debits / adjustments', String(vat.breakdown?.output?.debits ?? 0)],
      ['Input debits', String(vat.breakdown?.input?.debits ?? 0)],
      ['Input credits / reversals', String(vat.breakdown?.input?.credits ?? 0)],
      [],
      ['GL VAT Payable balance', String(vat.gl_balances?.vat_payable ?? 0)],
      ['GL VAT Input balance', String(vat.gl_balances?.vat_input ?? 0)],
    ];
    const csv = rows.map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `vat-return-${Date.now()}.csv`;
    a.click();
  };

  const printVat = () => {
    const el = document.getElementById('vat-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<html><head><title>VAT Return</title><style>body{font-family:Arial,sans-serif;font-size:13px;padding:32px;}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <div className={`space-y-5 relative ${loading && data ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* VAT Return */}
      <div className="card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1 space-y-3">
            <h3 className="font-semibold text-gray-800">VAT Return</h3>
            <div>
              <label className="form-label">Period</label>
              <div className="flex flex-wrap gap-2">
                {PERIOD_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => { setPeriod(p.key); setFrom(''); setTo(''); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${period === p.key ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPeriod('custom')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${period === 'custom' ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Custom
                </button>
              </div>
            </div>
            {period === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div><label className="form-label">From</label><input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                <div><label className="form-label">To</label><input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-xs" onClick={() => load()} disabled={loading || customNeedsDates}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            {vat && (
              <>
                <button type="button" className="btn-secondary text-xs" onClick={exportVatCsv}><Download className="w-3.5 h-3.5" /> CSV</button>
                <button type="button" className="btn-secondary text-xs" onClick={printVat}><FileText className="w-3.5 h-3.5" /> Print</button>
              </>
            )}
          </div>
        </div>
        {vat && (
          <p className="text-xs text-gray-500">
            {vat.period_label} · {displayDateRange(vat.filters?.from, vat.filters?.to)} · GL accounts {vat.accounts?.vat_payable_code} / {vat.accounts?.vat_input_code}
          </p>
        )}
      </div>

      {loading && !data && !customNeedsDates && <Spinner />}
      {customNeedsDates && !loading && (
        <EmptyState message="Pick a from and/or to date" icon={<Receipt className="w-8 h-8 text-gray-300" />} />
      )}

      {vat && (
        <>
          {!vat.checks?.vat_input_account_present && (
            <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 py-3 text-sm text-gray-700">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>VAT Input account (1135) is not configured. Input VAT will show as zero until the chart of accounts is seeded.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Output VAT (collected)" value={fmt(vat.output_vat)} icon={<CedisIcon className="w-5 h-5 text-[#0D3B6E] text-sm" />} color="bg-[#0D3B6E]/8" sub="VAT charged to customers" />
            <StatCard label="Input VAT (paid)" value={fmt(vat.input_vat)} icon={<CedisIcon className="w-5 h-5 text-[#0D3B6E] text-sm" />} color="bg-[#0D3B6E]/8" sub="VAT paid to suppliers" />
            <StatCard
              label={`Net VAT ${vat.status === 'payable' ? 'payable' : 'reclaimable'}`}
              value={fmt(vat.net_vat_payable)}
              icon={<CedisIcon className={`w-5 h-5 text-sm ${vat.status === 'payable' ? 'text-red-600' : 'text-[#0D3B6E]'}`} />}
              color={vat.status === 'payable' ? 'bg-red-50' : 'bg-[#0D3B6E]/8'}
              sub={vat.status_label}
            />
          </div>

          <div id="vat-print" className="card">
            <h4 className="font-semibold text-gray-800 mb-3">VAT movement detail</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-[#0D3B6E]/5 border border-[#0D3B6E]/15 p-4 space-y-2">
                <p className="font-medium text-[#0D3B6E]">Output VAT — {vat.accounts?.vat_payable_name}</p>
                <div className="flex justify-between"><span className="text-gray-600">Credits (collected)</span><span className="tabular-nums">{fmt(vat.breakdown?.output?.credits)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Debits (adjustments)</span><span className="tabular-nums">{fmt(vat.breakdown?.output?.debits)}</span></div>
                <div className="flex justify-between font-semibold border-t border-[#0D3B6E]/15 pt-2"><span>Net output</span><span className="tabular-nums">{fmt(vat.output_vat)}</span></div>
                <p className="text-xs text-gray-500">{vat.breakdown?.output?.entry_count ?? 0} journal entries</p>
              </div>
              <div className="rounded-lg bg-[#0D3B6E]/5 border border-[#0D3B6E]/15 p-4 space-y-2">
                <p className="font-medium text-[#0D3B6E]">Input VAT — {vat.accounts?.vat_input_name}</p>
                <div className="flex justify-between"><span className="text-gray-600">Debits (paid)</span><span className="tabular-nums">{fmt(vat.breakdown?.input?.debits)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Credits (reversals)</span><span className="tabular-nums">{fmt(vat.breakdown?.input?.credits)}</span></div>
                <div className="flex justify-between font-semibold border-t border-[#0D3B6E]/15 pt-2"><span>Net input</span><span className="tabular-nums">{fmt(vat.input_vat)}</span></div>
                <p className="text-xs text-gray-500">{vat.breakdown?.input?.entry_count ?? 0} journal entries</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
              <span>GL balances as at {vat.gl_balances?.as_of}: Payable {fmt(vat.gl_balances?.vat_payable)} · Input {fmt(vat.gl_balances?.vat_input)}</span>
              <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> From posted journal entries</span>
            </div>
          </div>
        </>
      )}

      {/* Tax Rates */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">Tax Rates</h3>
            {data && (
              <p className="text-xs text-gray-500 mt-0.5">
                {ratesSummary.active ?? 0} active · {ratesSummary.total ?? 0} total configured
              </p>
            )}
          </div>
          <button type="button" className="btn-primary text-xs self-start sm:self-auto" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add tax rate
          </button>
        </div>

        {loading && !data ? (
          <Spinner />
        ) : rates.length === 0 ? (
          <EmptyState message="No tax rates configured" icon={<Receipt className="w-8 h-8 text-gray-300" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  {['Name', 'Rate (%)', 'Applies to', 'Status', ''].map((h) => (
                    <th key={h} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rates.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50/80">
                    <td className="px-3 md:px-4 py-2 md:py-3 font-medium">{t.name}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-[#0D3B6E] tabular-nums">{parseFloat(t.rate).toFixed(2)}%</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 hidden md:table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0D3B6E]/8 text-[#0D3B6E]">{t.applies_to}</span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      {t.is_active
                        ? <span className="badge bg-green-100 text-green-700 text-xs">Active</span>
                        : <span className="badge bg-gray-100 text-gray-500 text-xs">Inactive</span>}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => openEdit(t)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => deleteTax(t.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!taxModal} onClose={() => setTaxModal(null)} title={taxModal === 'edit' ? 'Edit tax rate' : 'Add tax rate'} size="sm">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="form-label">Name *</label>
            <input className="form-input" value={taxForm.name} onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })} placeholder="e.g. VAT" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Rate (%) *</label>
              <input type="number" step="0.01" className="form-input" value={taxForm.rate} onChange={(e) => setTaxForm({ ...taxForm, rate: e.target.value })} placeholder="e.g. 15" />
            </div>
            <div>
              <label className="form-label">Applies to</label>
              <select className="form-input" value={taxForm.applies_to} onChange={(e) => setTaxForm({ ...taxForm, applies_to: e.target.value })}>
                <option value="both">Both</option>
                <option value="sales">Sales</option>
                <option value="purchases">Purchases</option>
              </select>
            </div>
          </div>
          {taxModal === 'edit' && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="tax-active" checked={taxForm.is_active} onChange={(e) => setTaxForm({ ...taxForm, is_active: e.target.checked })} />
              <label htmlFor="tax-active" className="text-sm text-gray-700">Active</label>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary" onClick={() => setTaxModal(null)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={saveTax} disabled={saving}>
            {saving ? 'Saving…' : taxModal === 'edit' ? 'Update' : 'Add tax rate'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
