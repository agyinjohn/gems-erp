'use client';

import { X, Printer } from 'lucide-react';
import { fmtGhs, printReport } from '@/lib/reportUtils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Props {
  run: any;               // a PayrollRun (with amounts + optional embedded employee)
  employee?: any;         // employee record (name, code, bank, ssnit, tin…)
  businessName?: string;
  onClose: () => void;
}

const NAVY = '#0D3B6E';

export default function Payslip({ run, employee, businessName, onClose }: Props) {
  const emp = employee || run.employee || {};
  const name = run.employee_name || emp.name || '—';
  const period = `${MONTHS[(run.month || 1) - 1]} ${run.year || ''}`;
  const reference = `PS-${(emp.employee_code || String(run._id || run.id || '').slice(-6)).toString().toUpperCase()}-${String(run.month || '').padStart(2, '0')}${run.year || ''}`;

  const allowanceLines: { name: string; amount: number }[] = run.allowance_lines || [];
  const deductionLines: { name: string; amount: number }[] = run.deduction_lines || [];
  const basic = run.gross_salary || 0;
  const totalEarnings = basic + (run.allowances || 0);

  const printId = 'payslip-print-area';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">Payslip — {name}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => printReport(`Payslip - ${name} - ${period}`, printId)} className="btn-primary text-xs">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>

        <div id={printId} className="px-6 py-5 text-sm text-gray-800">
          {/* Letterhead — colors set inline so they survive the print popup, which doesn't load the app stylesheet */}
          <div className="flex items-start justify-between border-b-2 pb-3 mb-4" style={{ borderColor: NAVY }}>
            <div>
              <div className="text-xl font-extrabold" style={{ color: NAVY }}>{businessName || 'GEMS'}</div>
              <div className="text-xs text-gray-500 mt-0.5">Payslip · {period}</div>
            </div>
            <div className="text-right">
              <div
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block"
                style={{ color: NAVY, backgroundColor: '#0D3B6E14' }}
              >
                {run.status || 'submitted'}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Ref: {reference}</div>
            </div>
          </div>

          {run.proration && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mb-4">
              Prorated pay — worked {run.proration.worked_days} of {run.proration.total_days} days this period (full salary {fmtGhs(run.proration.full_gross_salary)}/mo)
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card border border-gray-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold uppercase text-gray-400 mb-1">Employee</div>
              <div className="font-semibold">{name}</div>
              <div className="text-xs text-gray-500">{emp.employee_code || ''} {emp.job_title ? `· ${emp.job_title}` : ''}</div>
              <div className="text-xs text-gray-500 mt-1">SSNIT: {emp.ssnit_number || '—'}</div>
              <div className="text-xs text-gray-500">TIN: {emp.tin || '—'}</div>
            </div>
            <div className="card border border-gray-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold uppercase text-gray-400 mb-1">Payment</div>
              <div className="text-xs text-gray-500 capitalize">Method: {emp.payment_method || 'bank'}</div>
              {emp.payment_method === 'momo'
                ? <div className="text-xs text-gray-500">MoMo: {emp.momo_number || '—'}</div>
                : <>
                    <div className="text-xs text-gray-500">Bank: {emp.bank_name || '—'}</div>
                    <div className="text-xs text-gray-500">Account: {emp.bank_account_number || '—'}</div>
                  </>}
            </div>
          </div>

          {/* Earnings / Deductions side-by-side — the standard payslip layout */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <section>
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Earnings</h2>
              <table className="w-full">
                <tbody>
                  <tr><td>Basic salary</td><td className="text-right tabular-nums">{fmtGhs(basic)}</td></tr>
                  {allowanceLines.map((l, i) => (
                    <tr key={i}><td>{l.name || 'Allowance'}</td><td className="text-right tabular-nums" style={{ color: '#16a34a' }}>+{fmtGhs(l.amount)}</td></tr>
                  ))}
                  <tr><td className="font-semibold">Total</td><td className="text-right font-semibold tabular-nums">{fmtGhs(totalEarnings)}</td></tr>
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Deductions</h2>
              <table className="w-full">
                <tbody>
                  {/* deduction_lines already includes PAYE / SSNIT (when non-zero) ahead of custom and loan lines */}
                  {deductionLines.length === 0 ? (
                    <tr><td className="text-gray-400">None</td><td /></tr>
                  ) : deductionLines.map((l, i) => (
                    <tr key={i}><td>{l.name || 'Deduction'}</td><td className="text-right tabular-nums" style={{ color: '#dc2626' }}>-{fmtGhs(l.amount)}</td></tr>
                  ))}
                  <tr><td className="font-semibold">Total</td><td className="text-right font-semibold tabular-nums">{fmtGhs(run.deductions)}</td></tr>
                </tbody>
              </table>
            </section>
          </div>

          {/* Net pay banner */}
          <div
            className="flex items-center justify-between rounded-lg px-4 py-3 mb-4"
            style={{ backgroundColor: '#0D3B6E0D', border: `1px solid ${NAVY}33` }}
          >
            <span className="font-bold" style={{ color: NAVY }}>Net Pay</span>
            <span className="font-extrabold text-lg tabular-nums" style={{ color: NAVY }}>{fmtGhs(run.net_salary)}</span>
          </div>

          <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-3">
            <div>Employer SSNIT contribution (13%, not deducted from pay): {fmtGhs(run.ssnit_employer)}</div>
            <div className="mt-1">Generated {new Date().toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' })} · {businessName || 'GEMS'} · This is a system-generated payslip.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
