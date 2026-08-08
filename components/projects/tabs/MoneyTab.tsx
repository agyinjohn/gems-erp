'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import { Plus, Trash2, Check, X } from 'lucide-react';
import type { TabProps } from '@/components/projects/shared';
import { STATUS_TONE, label } from '@/components/projects/shared';
import type { Financials, Variation } from '@/components/projects/types';

/**
 * What the job is worth against what it has cost.
 *
 * Earned value less actual cost is the margin, and it is the figure that shows
 * a job losing money while the schedule still looks fine.
 */
interface Props extends TabProps {
  fin: Financials | null;
  variations: Variation[];
}

export default function MoneyTab({
  projectId, canManage, isOwner, money, reload, removeIt, fin, variations
}: Props) {
  const [voForm, setVoForm] = useState({ description: '', amount: '', reference: '' });

  const addVariation = async () => {
    const amt = parseFloat(voForm.amount);
    if (!voForm.description.trim() || !Number.isFinite(amt) || amt === 0) {
      return toast.error('Describe the change and give a non-zero amount');
    }
    try {
      await api.post(`/projects/${projectId}/variations`, { ...voForm, amount: amt });
      setVoForm({ description: '', amount: '', reference: '' });
      await reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not add'); }
  };

  const decide = async (v: Variation, decision: 'approved' | 'rejected') => {
    try {
      await api.patch(`/projects/${projectId}/variations/${v.id}`, { decision });
      toast.success(`${v.reference} ${decision}`);
      await reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  return (
    <>
      {/* Cost vs contract summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Cost position</h2>
          <dl className="space-y-2.5 text-sm">
            {[
              { l: 'Budget',                  v: fin?.budget,         tone: 'text-gray-900', bold: false },
              { l: 'Expenses posted',          v: fin?.expenses,       tone: 'text-gray-700', bold: false },
              { l: 'Labour booked',            v: fin?.labour_cost,    tone: 'text-gray-700', bold: false },
              { l: 'Committed (POs raised)',   v: fin?.committed_cost, tone: 'text-gray-700', bold: false },
            ].map(({ l, v, tone, bold }) => (
              <div key={l} className="flex justify-between items-center">
                <dt className="text-gray-500">{l}</dt>
                <dd className={`${bold ? 'font-bold' : 'font-semibold'} ${tone}`}>{money(v as number)}</dd>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2.5 border-t border-gray-100">
              <dt className="font-semibold text-gray-900">Forecast cost</dt>
              <dd className={`font-bold ${fin?.is_over_budget ? 'text-red-600' : 'text-gray-900'}`}>
                {money(fin?.forecast_cost || 0)}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Budget variance</dt>
              <dd className={`font-semibold ${
                (fin?.budget_variance || 0) < 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {(fin?.budget_variance || 0) < 0 ? '−' : '+'}{money(Math.abs(fin?.budget_variance || 0))}
              </dd>
            </div>
          </dl>
          {fin?.budget && fin.budget > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Spent vs budget</span>
                <span>{Math.round(((fin.actual_cost + fin.committed_cost) / fin.budget) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    fin.is_over_budget ? 'bg-red-500' : 'bg-[#0D3B6E]'
                  }`}
                  style={{ width: `${Math.min(100, ((fin.actual_cost + fin.committed_cost) / fin.budget) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Cost is pulled from expenses and POs tagged to this project, plus booked labour.
          </p>
        </div>

        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Contract &amp; earned value</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Original contract</dt>
              <dd className="font-semibold text-gray-900">{money(fin?.contract_value || 0)}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Approved variations</dt>
              <dd className="font-semibold text-gray-700">{money(fin?.approved_variations || 0)}</dd>
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-gray-100">
              <dt className="font-semibold text-gray-900">Effective contract</dt>
              <dd className="font-bold text-gray-900">{money(fin?.effective_contract || 0)}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Work done ({Math.round(fin?.progress_pct || 0)}%)</dt>
              <dd className="font-semibold text-gray-900">{money(fin?.earned_value || 0)}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Invoiced to date</dt>
              <dd className="font-semibold text-gray-700">{money(fin?.invoiced || 0)}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Not yet billed</dt>
              <dd className="font-semibold text-amber-600">{money(fin?.unbilled || 0)}</dd>
            </div>
            {!!fin?.retention_pct && (
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">Retention held ({fin.retention_pct}%)</dt>
                <dd className="font-semibold text-gray-600">{money(fin.retention_held)}</dd>
              </div>
            )}
          </dl>
          {!!fin?.pending_variations && (
            <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-lg px-3 py-2">
              {money(fin.pending_variations)} in pending variations not counted above.
            </p>
          )}
        </div>
      </div>

      {/* Variations */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-gray-900">Variations</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Changes to the agreed scope. Only approved ones move the contract sum.
            </p>
          </div>
          {variations.length > 0 && (
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
              {variations.filter(v => v.status === 'approved').length} approved
            </span>
          )}
        </div>

        {variations.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">None raised yet.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {variations.map(v => (
              <div key={v.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-500">{v.reference}</span>
                    <span className={`badge ${STATUS_TONE[v.status]}`}>{label(v.status)}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-0.5">{v.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(v.raised_on).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-bold text-sm ${
                    v.amount < 0 ? 'text-red-600' : 'text-green-700'
                  }`}>
                    {v.amount < 0 ? '−' : '+'}{money(Math.abs(v.amount))}
                  </span>
                  {isOwner && v.status === 'pending' && (
                    <>
                      <button onClick={() => decide(v, 'approved')} title="Approve"
                        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => decide(v, 'rejected')} title="Reject"
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {canManage && (
                    <button onClick={() => removeIt('variation', `/projects/${projectId}/variations/${v.id}`, v.reference)}
                      className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canManage && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 border-t border-gray-100 pt-4">
            <div className="sm:col-span-2">
              <label className="form-label text-xs">Description</label>
              <input className="form-input" placeholder="e.g. Additional drainage" value={voForm.description} onChange={e => setVoForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="form-label text-xs">Reference</label>
              <input className="form-input" placeholder="auto" value={voForm.reference} onChange={e => setVoForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <div>
              <label className="form-label text-xs">Amount (+/−)</label>
              <input type="number" className="form-input" placeholder="0.00" value={voForm.amount} onChange={e => setVoForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <button type="button" className="btn-secondary w-full justify-center" onClick={addVariation}>
                <Plus className="w-4 h-4" /> Raise
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
