'use client';

import { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import api from '@/lib/api';
import { Spinner } from '@/components/ui';
import { fmtGhs, printReport, getPresetRange, formatPeriodLabel, type DatePreset } from '@/lib/reportUtils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const NAVY = '#0D3B6E';

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'this_month',   label: 'This month' },
  { id: 'last_month',   label: 'Last month' },
  { id: 'last_30',      label: 'Last 30 days' },
  { id: 'last_quarter', label: 'Last quarter' },
  { id: 'ytd',          label: 'Year to date' },
  { id: 'all',          label: 'All time' },
];

interface Props {
  businessName?: string;
  onClose: () => void;
}

export default function HrReport({ businessName, onClose }: Props) {
  const initial = getPresetRange('this_month');
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async (from: string, to: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/hr/report?from=${from}&to=${to}`);
      setData(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(dateFrom, dateTo); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    const r = getPresetRange(p);
    setDateFrom(r.from);
    setDateTo(r.to);
    load(r.from, r.to);
  };

  const handleDateFrom = (v: string) => { setPreset('all'); setDateFrom(v); load(v, dateTo); };
  const handleDateTo = (v: string) => { setPreset('all'); setDateTo(v); load(dateFrom, v); };

  const printId = 'hr-report-print-area';
  const generatedOn = new Date().toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });
  const periodLabel = formatPeriodLabel(dateFrom, dateTo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">HR Report</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printReport(`HR Report - ${periodLabel}`, printId)}
              className="btn-primary text-xs"
              disabled={loading || !data}
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50/60 sticky top-[57px] z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">Period</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                preset === p.id ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={preset === p.id ? { backgroundColor: NAVY } : undefined}
            >
              {p.label}
            </button>
          ))}
          <span className="hidden sm:inline w-px h-5 bg-gray-200 mx-1" />
          <input type="date" className="form-input py-1 text-xs w-[8.75rem] bg-white" value={dateFrom} onChange={(e) => handleDateFrom(e.target.value)} aria-label="From" />
          <span className="text-gray-300 text-xs">–</span>
          <input type="date" className="form-input py-1 text-xs w-[8.75rem] bg-white" value={dateTo} onChange={(e) => handleDateTo(e.target.value)} aria-label="To" />
        </div>

        {loading ? <div className="py-16"><Spinner /></div> : !data ? (
          <div className="py-16 text-center text-sm text-gray-400">Couldn't load the report for this period.</div>
        ) : (
          <div id={printId} className="px-6 py-5 text-sm text-gray-800">
            <div className="flex items-start justify-between border-b-2 pb-3 mb-4" style={{ borderColor: NAVY }}>
              <div>
                <div className="text-xl font-extrabold" style={{ color: NAVY }}>{businessName || 'GEMS'}</div>
                <div className="text-xs text-gray-500 mt-0.5">HR Report · {periodLabel}</div>
              </div>
              <div className="text-[11px] text-gray-400 text-right">Generated {generatedOn}</div>
            </div>

            <section className="mb-5">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Workforce Snapshot (current)</h2>
              <table className="w-full">
                <tbody>
                  <tr><td>Active staff</td><td className="text-right tabular-nums">{data.active}</td></tr>
                  <tr><td>Total employees (incl. terminated)</td><td className="text-right tabular-nums">{data.total_employees}</td></tr>
                  <tr><td>Outstanding staff loans</td><td className="text-right tabular-nums">{fmtGhs(data.outstanding_loans_total)} ({data.outstanding_loans_count})</td></tr>
                </tbody>
              </table>
            </section>

            {data.department_breakdown?.length > 0 && (
              <section className="mb-5">
                <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Headcount by Department</h2>
                <table className="w-full">
                  <tbody>
                    {data.department_breakdown.map((d: any) => (
                      <tr key={d.department}><td>{d.department}</td><td className="text-right tabular-nums">{d.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <section className="mb-5">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Hiring & Turnover — {periodLabel}</h2>
              <table className="w-full">
                <tbody>
                  <tr><td>New hires</td><td className="text-right tabular-nums">{data.new_hires?.length || 0}</td></tr>
                  <tr><td>Terminations</td><td className="text-right tabular-nums">{data.terminations?.length || 0}</td></tr>
                </tbody>
              </table>
              {data.new_hires?.length > 0 && (
                <table className="w-full mt-2">
                  <tbody>
                    {data.new_hires.map((h: any, i: number) => (
                      <tr key={i}><td className="text-gray-500">{h.name} — {h.department}</td><td className="text-right tabular-nums text-gray-500">{new Date(h.start_date).toLocaleDateString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="mb-5">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Leave — {periodLabel}</h2>
              <table className="w-full">
                <tbody>
                  <tr><td>Approved</td><td className="text-right tabular-nums">{data.leave_by_status?.approved || 0}</td></tr>
                  <tr><td>Pending</td><td className="text-right tabular-nums">{data.leave_by_status?.pending || 0}</td></tr>
                  <tr><td>Rejected</td><td className="text-right tabular-nums">{data.leave_by_status?.rejected || 0}</td></tr>
                </tbody>
              </table>
            </section>

            <section className="mb-5">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Attendance — {periodLabel}</h2>
              <table className="w-full">
                <tbody>
                  <tr><td>Present</td><td className="text-right tabular-nums">{data.attendance_by_status?.present || 0}</td></tr>
                  <tr><td>Absent</td><td className="text-right tabular-nums">{data.attendance_by_status?.absent || 0}</td></tr>
                  <tr><td>Half day</td><td className="text-right tabular-nums">{data.attendance_by_status?.half_day || 0}</td></tr>
                  <tr><td>Leave</td><td className="text-right tabular-nums">{data.attendance_by_status?.leave || 0}</td></tr>
                  <tr><td>Holiday</td><td className="text-right tabular-nums">{data.attendance_by_status?.holiday || 0}</td></tr>
                </tbody>
              </table>
            </section>

            <section className="mb-5">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Payroll — {periodLabel}</h2>
              <table className="w-full">
                <tbody>
                  <tr><td>Total net pay ({data.payroll_runs || 0} run{data.payroll_runs === 1 ? '' : 's'})</td><td className="text-right tabular-nums">{fmtGhs(data.payroll_total)}</td></tr>
                </tbody>
              </table>
              {data.payroll_by_month?.length > 0 && (
                <table className="w-full mt-2">
                  <tbody>
                    {data.payroll_by_month.map((p: any) => (
                      <tr key={`${p.year}-${p.month}`}><td className="text-gray-500">{MONTHS[p.month - 1]} {p.year}</td><td className="text-right tabular-nums text-gray-500">{fmtGhs(p.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Loans — {periodLabel}</h2>
              <table className="w-full">
                <tbody>
                  <tr><td>Disbursed ({data.loans_disbursed_count || 0})</td><td className="text-right tabular-nums">{fmtGhs(data.loans_disbursed_total)}</td></tr>
                  <tr><td>Repayments collected</td><td className="text-right tabular-nums">{fmtGhs(data.loan_repayments_total)}</td></tr>
                </tbody>
              </table>
            </section>

            <div className="text-[11px] text-gray-400 mt-4 border-t border-gray-100 pt-3">
              {businessName || 'GEMS'} · This is a system-generated HR report for {periodLabel}, generated {generatedOn}.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
