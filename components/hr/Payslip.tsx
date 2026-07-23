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

export default function Payslip({ run, employee, businessName, onClose }: Props) {
  const emp = employee || run.employee || {};
  const name = run.employee_name || emp.name || '—';
  const period = `${MONTHS[(run.month || 1) - 1]} ${run.year || ''}`;

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
          <h1 className="text-xl font-extrabold text-[#0D3B6E]">{businessName || 'GEMS'}</h1>
          <div className="meta text-xs text-gray-500 mb-1">Payslip · {period} · <span className="capitalize">{run.status || 'submitted'}</span></div>
          {run.proration && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mb-3 inline-block">
              Prorated pay — worked {run.proration.worked_days} of {run.proration.total_days} days this period (full salary {fmtGhs(run.proration.full_gross_salary)}/mo)
            </div>
          )}
          {!run.proration && <div className="mb-3" />}

          <div className="grid grid-cols-2 gap-3 mb-5">
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
              <div className="text-base font-bold text-[#0D3B6E] mt-1">Net {fmtGhs(run.net_salary)}</div>
            </div>
          </div>

          <section>
            <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Earnings</h2>
            <table className="w-full">
              <tbody>
                <tr><td>Basic salary</td><td className="text-right tabular-nums">{fmtGhs(basic)}</td></tr>
                {allowanceLines.map((l, i) => (
                  <tr key={i}><td>{l.name || 'Allowance'}</td><td className="text-right tabular-nums">{fmtGhs(l.amount)}</td></tr>
                ))}
                <tr><td className="font-semibold">Total earnings</td><td className="text-right font-semibold tabular-nums">{fmtGhs(totalEarnings)}</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Deductions</h2>
            <table className="w-full">
              <tbody>
                {/* deduction_lines already includes PAYE / SSNIT (when non-zero) ahead of custom and loan lines */}
                {deductionLines.length === 0 ? (
                  <tr><td className="text-gray-400">No deductions this period</td><td /></tr>
                ) : deductionLines.map((l, i) => (
                  <tr key={i}><td>{l.name || 'Deduction'}</td><td className="text-right tabular-nums">{fmtGhs(l.amount)}</td></tr>
                ))}
                <tr><td className="font-semibold">Total deductions</td><td className="text-right font-semibold tabular-nums">{fmtGhs(run.deductions)}</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <table className="w-full">
              <tbody>
                <tr><td className="font-bold text-base">Net pay</td><td className="text-right font-bold text-base tabular-nums text-[#0D3B6E]">{fmtGhs(run.net_salary)}</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Employer contributions (not deducted from pay)</h2>
            <table className="w-full">
              <tbody>
                <tr><td>SSNIT employer (13%)</td><td className="text-right tabular-nums">{fmtGhs(run.ssnit_employer)}</td></tr>
              </tbody>
            </table>
          </section>

          <div className="text-[11px] text-gray-400 mt-4">Generated {new Date().toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' })} · {businessName || 'GEMS'}</div>
        </div>
      </div>
    </div>
  );
}
