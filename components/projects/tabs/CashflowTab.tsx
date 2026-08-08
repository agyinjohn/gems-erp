'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Info } from 'lucide-react';
import type { TabProps } from '@/components/projects/shared';
import { label } from '@/components/projects/shared';
import type { CashFlow } from '@/components/projects/types';

/**
 * When money arrives and when it leaves.
 *
 * The deepest point of the running total is the working capital the job
 * demands before it gives any back — routinely the number that decides whether
 * a profitable contract can be taken on at all.
 */
interface Props extends TabProps {
  cash: CashFlow | null;
}

export default function CashflowTab({
  projectId, project, canManage, money, reload, cash
}: Props) {
  const [terms, setTerms] = useState({
    payment_terms_days: String(project.payment_terms_days ?? 30),
    defects_liability_days: String(project.defects_liability_days ?? 0),
  });
  const [planBusy, setPlanBusy] = useState(false);

  const saveTerms = async () => {
    setPlanBusy(true);
    try {
      await api.put(`/projects/${projectId}`, {
        payment_terms_days: parseInt(terms.payment_terms_days) || 0,
        defects_liability_days: parseInt(terms.defects_liability_days) || 0,
      });
      toast.success('Assumptions updated');
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save');
    } finally { setPlanBusy(false); }
  };

  const c = cash;
  if (!c) return <div className="card text-sm text-gray-400">No cash flow available.</div>;

  const compact = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
    if (abs >= 1000) return `${Math.round(n / 1000)}k`;
    return String(Math.round(n));
  };
  const CATEGORY_LABEL: Record<string, string> = {
    receivable: 'Applications outstanding',
    certification: 'Work still to certify',
    retention_release: 'Retention release',
    purchase_order: 'Orders to pay',
    cost_to_complete: 'Cost to complete',
  };
  const BASIS_NOTE: Record<string, string> = {
    budget: 'Remaining cost is taken from the budget.',
    run_rate: 'No budget set — remaining cost is extrapolated from spend per point of progress.',
    committed: 'Too early to forecast — only spend already committed is shown.',
  };

  return (
    <>
      {/* Headline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`card ${c.peak_funding_required > 0 ? 'ring-1 ring-amber-200 bg-amber-50/40' : ''}`}>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Working capital needed</p>
          <p className={`text-2xl font-extrabold mt-1 ${c.peak_funding_required > 0 ? 'text-amber-700' : 'text-green-600'}`}>
            {money(c.peak_funding_required)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {c.peak_funding_required > 0 ? `deepest around ${c.low_point.label}` : 'the job funds itself'}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Still to come in</p>
          <p className="text-2xl font-extrabold text-green-600 mt-1">{money(c.totals.inflow)}</p>
          <p className="text-xs text-gray-400 mt-1">{money(c.totals.receivables_outstanding)} already invoiced</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Still to go out</p>
          <p className="text-2xl font-extrabold text-red-600 mt-1">{money(c.totals.outflow)}</p>
          <p className="text-xs text-gray-400 mt-1">{money(c.totals.po_outstanding)} on open orders</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Net from here</p>
          <p className={`text-2xl font-extrabold mt-1 ${c.totals.net >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {money(c.totals.net)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{money(c.totals.retention_due)} of it is retention</p>
        </div>
      </div>

      {c.warnings.length > 0 && (
        <div className="flex items-start gap-2.5 bg-blue-50 text-blue-900 rounded-xl px-4 py-3 text-sm">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <ul className="space-y-1 min-w-0">
            {c.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Chart */}
      <div className="card">
        <div className="mb-4">
          <h2 className="font-bold text-gray-900">Money in and out by month</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            The line is the running total. Where it dips below zero, the job is being funded out of
            your own pocket — that trough is the cash the contract demands before it gives any back.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={280} minWidth={0}>
          <ComposedChart data={c.buckets} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
            <Tooltip formatter={(v: any, n: any) => [money(Number(v)), n]} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Bar dataKey="inflow" name="In" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="outflow" name="Out" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="cumulative" name="Running total" stroke="#0D3B6E" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> In</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Out</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-4 border-t-2 border-[#0D3B6E] inline-block" /> Running total</span>
        </div>
      </div>

      {/* Assumptions */}
      <div className="card">
        <div className="mb-4">
          <h2 className="font-bold text-gray-900">Assumptions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Payment terms move every inflow. On 60-day terms, work certified in March is May&apos;s money —
            and the wages in between still fall due.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="form-label">Client payment terms</label>
            <input type="number" min={0} className="form-input" value={terms.payment_terms_days}
              disabled={!canManage}
              onChange={e => setTerms(t => ({ ...t, payment_terms_days: e.target.value }))} />
            <p className="form-hint">Days from certification to payment.</p>
          </div>
          <div>
            <label className="form-label">Defects period</label>
            <input type="number" min={0} className="form-input" value={terms.defects_liability_days}
              disabled={!canManage}
              onChange={e => setTerms(t => ({ ...t, defects_liability_days: e.target.value }))} />
            <p className="form-hint">Days after completion before retention is released.</p>
          </div>
          <div>
            <label className="form-label">Retention</label>
            <input className="form-input" value={`${c.assumptions.retention_pct}%`} disabled />
            <p className="form-hint">Set on the project.</p>
          </div>
          {canManage && (
            <div className="flex items-start pt-6">
              <button type="button" className="btn-secondary w-full justify-center" onClick={saveTerms} disabled={planBusy}>
                {planBusy ? 'Saving…' : 'Apply'}
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          {BASIS_NOTE[c.assumptions.cost_basis]} Forecast total cost {money(c.assumptions.forecast_cost)},
          of which {money(c.assumptions.cost_to_complete)} is still to spend.
        </p>
      </div>

      {/* Month table */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-4">Month by month</h2>
        <div className="table-wrap">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="table-header text-left">
                <th className="px-4 py-2.5">Month</th>
                <th className="px-4 py-2.5 text-right">In</th>
                <th className="px-4 py-2.5 text-right">Out</th>
                <th className="px-4 py-2.5 text-right">Net</th>
                <th className="px-4 py-2.5 text-right">Running total</th>
                <th className="px-4 py-2.5">Made up of</th>
              </tr>
            </thead>
            <tbody>
              {c.buckets.map(b => (
                <tr key={b.month}
                  className={`border-t border-gray-100 transition-colors ${
                    b.month === c.low_point.month && c.peak_funding_required > 0 ? 'bg-amber-50/60' : 'hover:bg-gray-50'
                  }`}>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 text-xs">{b.label}</td>
                  <td className="px-4 py-3 text-right text-xs text-green-700">{b.inflow ? money(b.inflow) : '—'}</td>
                  <td className="px-4 py-3 text-right text-xs text-red-600">{b.outflow ? money(b.outflow) : '—'}</td>
                  <td className={`px-4 py-3 text-right text-xs font-semibold ${b.net >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                    {b.net ? money(b.net) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right text-xs font-bold whitespace-nowrap ${b.cumulative >= 0 ? 'text-gray-900' : 'text-amber-700'}`}>
                    {money(b.cumulative)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(b.by_category).map(([k, v]) => (
                        <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {CATEGORY_LABEL[k] || label(k)} {money(v)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
