'use client';

import { X, Printer } from 'lucide-react';
import { printReport } from '@/lib/reportUtils';

const NAVY = '#0D3B6E';

interface Props {
  appraisal: any;      // an Appraisal (category_ratings, overall_rating, period_start/end…)
  employee?: any;      // employee record (name, code, job_title, department_name…)
  businessName?: string;
  onClose: () => void;
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Stars({ value }: { value: number }) {
  return (
    <span className="tabular-nums" style={{ color: '#f59e0b' }}>
      {'★'.repeat(Math.round(value))}{'☆'.repeat(5 - Math.round(value))}
      <span className="text-gray-400 text-xs ml-1">({value.toFixed(1)})</span>
    </span>
  );
}

export default function AppraisalForm({ appraisal, employee, businessName, onClose }: Props) {
  const emp = employee || appraisal.employee_id || {};
  const name = appraisal.employee_name || emp.name || '—';
  const period = `${fmtDate(appraisal.period_start)} – ${fmtDate(appraisal.period_end)}`;
  const printId = 'appraisal-print-area';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">Appraisal — {name}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => printReport(`Appraisal - ${name} - ${period}`, printId)} className="btn-primary text-xs">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>

        <div id={printId} className="px-6 py-5 text-sm text-gray-800">
          <div className="flex items-start justify-between border-b-2 pb-3 mb-4" style={{ borderColor: NAVY }}>
            <div>
              <div className="text-xl font-extrabold" style={{ color: NAVY }}>{businessName || 'GEMS'}</div>
              <div className="text-xs text-gray-500 mt-0.5">Performance Appraisal</div>
            </div>
            <div className="text-right">
              <div
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block"
                style={{ color: NAVY, backgroundColor: '#0D3B6E14' }}
              >
                {appraisal.status || 'draft'}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Period: {period}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card border border-gray-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold uppercase text-gray-400 mb-1">Employee</div>
              <div className="font-semibold">{name}</div>
              <div className="text-xs text-gray-500">{emp.employee_code || appraisal.employee_code || ''} {emp.job_title ? `· ${emp.job_title}` : ''}</div>
              {emp.department_name && <div className="text-xs text-gray-500">{emp.department_name}</div>}
            </div>
            <div className="card border border-gray-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold uppercase text-gray-400 mb-1">Reviewer</div>
              <div className="font-semibold">{appraisal.reviewer_name || '—'}</div>
              <div className="text-base font-bold mt-1" style={{ color: NAVY }}>Overall <Stars value={appraisal.overall_rating || 0} /></div>
            </div>
          </div>

          <section className="mb-4">
            <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Rating by Category</h2>
            <table className="w-full">
              <tbody>
                {(appraisal.category_ratings || []).map((c: any) => (
                  <tr key={c.category}><td>{c.category}</td><td className="text-right"><Stars value={c.rating} /></td></tr>
                ))}
              </tbody>
            </table>
          </section>

          {appraisal.strengths && (
            <section className="mb-4">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Strengths</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{appraisal.strengths}</p>
            </section>
          )}

          {appraisal.areas_for_improvement && (
            <section className="mb-4">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Areas for Improvement</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{appraisal.areas_for_improvement}</p>
            </section>
          )}

          {appraisal.goals_next_period && (
            <section className="mb-4">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Goals for Next Period</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{appraisal.goals_next_period}</p>
            </section>
          )}

          {appraisal.employee_comments && (
            <section className="mb-4">
              <h2 className="text-sm font-bold border-b border-gray-100 pb-1 mb-2">Employee Comments</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{appraisal.employee_comments}</p>
            </section>
          )}

          <div className="grid grid-cols-2 gap-6 mt-8 pt-4">
            <div>
              <div className="border-b border-gray-400 h-8" />
              <div className="text-xs text-gray-400 mt-1">Reviewer signature &amp; date</div>
            </div>
            <div>
              <div className="border-b border-gray-400 h-8" />
              <div className="text-xs text-gray-400 mt-1">Employee signature &amp; date</div>
            </div>
          </div>

          <div className="text-[11px] text-gray-400 mt-4">Generated {fmtDate(new Date())} · {businessName || 'GEMS'}</div>
        </div>
      </div>
    </div>
  );
}
