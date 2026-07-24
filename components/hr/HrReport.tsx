'use client';

import { X, Printer } from 'lucide-react';
import { fmtGhs, printReport } from '@/lib/reportUtils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const NAVY = '#0D3B6E';

interface Props {
  summary: any;
  businessName?: string;
  onClose: () => void;
}

export default function HrReport({ summary, businessName, onClose }: Props) {
  const printId = 'hr-report-print-area';
  const generatedOn = new Date().toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">HR Report</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => printReport(`HR Report - ${generatedOn}`, printId)} className="btn-primary text-xs">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>

        <div id={printId} className="px-6 py-5 text-sm text-gray-800">
          <div className="flex items-start justify-between border-b-2 pb-3 mb-4" style={{ borderColor: NAVY }}>
            <div>
              <div className="text-xl font-extrabold" style={{ color: NAVY }}>{businessName || 'GEMS'}</div>
              <div className="text-xs text-gray-500 mt-0.5">HR Report</div>
            </div>
            <div className="text-[11px] text-gray-400 text-right">Generated {generatedOn}</div>
          </div>

          <section className="mb-5">
            <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Workforce Summary</h2>
            <table className="w-full">
              <tbody>
                <tr><td>Active staff</td><td className="text-right tabular-nums">{summary.active}</td></tr>
                <tr><td>Total employees (incl. terminated)</td><td className="text-right tabular-nums">{summary.total_employees}</td></tr>
                <tr><td>On leave today</td><td className="text-right tabular-nums">{summary.on_leave}</td></tr>
                <tr><td>Pending leave approvals</td><td className="text-right tabular-nums">{summary.pending_leave}</td></tr>
                <tr><td>Present today</td><td className="text-right tabular-nums">{summary.attendance_today}</td></tr>
                <tr><td>Last approved payroll run</td><td className="text-right tabular-nums">{fmtGhs(summary.payroll_total)}</td></tr>
                <tr><td>Outstanding staff loans</td><td className="text-right tabular-nums">{fmtGhs(summary.outstanding_loans_total)} ({summary.outstanding_loans_count})</td></tr>
              </tbody>
            </table>
          </section>

          {summary.department_breakdown?.length > 0 && (
            <section className="mb-5">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Headcount by Department</h2>
              <table className="w-full">
                <tbody>
                  {summary.department_breakdown.map((d: any) => (
                    <tr key={d.department}><td>{d.department}</td><td className="text-right tabular-nums">{d.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {summary.employment_type_breakdown?.length > 0 && (
            <section className="mb-5">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Employment Type Mix</h2>
              <table className="w-full">
                <tbody>
                  {summary.employment_type_breakdown.map((t: any) => (
                    <tr key={t.type}><td className="capitalize">{t.type.replace(/_/g, ' ')}</td><td className="text-right tabular-nums">{t.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {summary.payroll_trend?.length > 0 && (
            <section className="mb-5">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Payroll Trend</h2>
              <table className="w-full">
                <tbody>
                  {summary.payroll_trend.map((p: any) => (
                    <tr key={`${p.year}-${p.month}`}><td>{MONTHS[p.month - 1]} {p.year}</td><td className="text-right tabular-nums">{fmtGhs(p.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {summary.pending_leave_list?.length > 0 && (
            <section className="mb-5">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Pending Leave Approvals</h2>
              <table className="w-full">
                <tbody>
                  {summary.pending_leave_list.map((l: any) => (
                    <tr key={l.id}>
                      <td>{l.employee_name}</td>
                      <td className="capitalize">{l.leave_type}</td>
                      <td className="text-right tabular-nums">{new Date(l.start_date).toLocaleDateString()} – {new Date(l.end_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {summary.on_leave_list?.length > 0 && (
            <section className="mb-5">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">On Leave Today</h2>
              <table className="w-full">
                <tbody>
                  {summary.on_leave_list.map((l: any, i: number) => (
                    <tr key={i}>
                      <td>{l.employee_name}</td>
                      <td className="capitalize">{l.leave_type}</td>
                      <td className="text-right tabular-nums">Back {new Date(l.end_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {(summary.upcoming_birthdays?.length > 0 || summary.upcoming_anniversaries?.length > 0) && (
            <section>
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Upcoming (Next 30 Days)</h2>
              <table className="w-full">
                <tbody>
                  {summary.upcoming_birthdays?.map((b: any, i: number) => (
                    <tr key={`b${i}`}><td>{b.name} — Birthday</td><td className="text-right tabular-nums">{b.days_until === 0 ? 'Today' : `in ${b.days_until}d`}</td></tr>
                  ))}
                  {summary.upcoming_anniversaries?.map((a: any, i: number) => (
                    <tr key={`a${i}`}><td>{a.name} — {a.years}-year anniversary</td><td className="text-right tabular-nums">{a.days_until === 0 ? 'Today' : `in ${a.days_until}d`}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <div className="text-[11px] text-gray-400 mt-4 border-t border-gray-100 pt-3">
            {businessName || 'GEMS'} · This is a system-generated HR report, current as of {generatedOn}.
          </div>
        </div>
      </div>
    </div>
  );
}
