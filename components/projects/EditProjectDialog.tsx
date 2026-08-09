'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import { X, AlertTriangle } from 'lucide-react';
import type { ProjectTypeProfile } from '@/lib/projectTypes';

/**
 * Editing the contract facts of a job.
 *
 * Everything here was settable at creation and nowhere afterwards, which meant
 * a mistyped contract sum or a client attached to the wrong job could only be
 * fixed by starting again — losing the stages, the diary and the billing with
 * it.
 *
 * Two changes are worth warning about rather than blocking, since both are
 * legitimate: moving the completion date, which is measured against a frozen
 * programme, and changing the kind of work, which takes tabs away.
 */

interface Props {
  project: any;
  types: ProjectTypeProfile[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const STATUSES = ['draft', 'active', 'on_hold', 'completed', 'cancelled'];
const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const dateValue = (d?: string | null) => (d ? String(d).slice(0, 10) : '');

export default function EditProjectDialog({ project, types, onClose, onSaved }: Props) {
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: project.name || '',
    description: project.description || '',
    project_type: project.project_type || 'construction',
    customer_id: project.customer_id?._id || project.customer_id || '',
    contract_value: String(project.contract_value ?? ''),
    retention_pct: String(project.retention_pct ?? ''),
    payment_terms_days: String(project.payment_terms_days ?? 30),
    defects_liability_days: String(project.defects_liability_days ?? 0),
    working_hours_per_day: String(project.working_hours_per_day ?? 8),
    start_date: dateValue(project.start_date),
    planned_end_date: dateValue(project.planned_end_date),
    actual_end_date: dateValue(project.actual_end_date),
    site_address: project.site_address || '',
    status: project.status || 'draft',
  });

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data.data || [])).catch(() => {});
  }, []);

  const profile = types.find(t => t.key === form.project_type) || types[0];
  const cap = profile?.capabilities;
  const typeChanged = form.project_type !== (project.project_type || 'construction');
  const endDateChanged = form.planned_end_date !== dateValue(project.planned_end_date);

  const save = async () => {
    if (!form.name.trim()) return toast.error('Give the project a name');
    setSaving(true);
    try {
      await api.put(`/projects/${project.id || project._id}`, {
        ...form,
        contract_value: parseFloat(form.contract_value) || 0,
        // Only send a retention figure the type can actually hold, or a switch
        // back to construction would revive a percentage nobody re-entered.
        retention_pct: cap?.retention ? (parseFloat(form.retention_pct) || 0) : 0,
        payment_terms_days: parseInt(form.payment_terms_days) || 0,
        defects_liability_days: parseInt(form.defects_liability_days) || 0,
        working_hours_per_day: parseInt(form.working_hours_per_day) || 8,
        customer_id: form.customer_id || '',
        start_date: form.start_date || null,
        planned_end_date: form.planned_end_date || null,
        actual_end_date: form.actual_end_date || null,
      });
      toast.success('Project updated');
      await onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save the project');
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Edit {project.code}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              The contract facts. Stages, billing and the diary aren&apos;t touched.
            </p>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Project name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Description</label>
              <textarea rows={2} className="form-input resize-none" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Kind of work</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {types.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => set('project_type', t.key)}
                    className={`text-left rounded-xl px-3 py-2.5 ring-1 transition-colors text-sm font-semibold ${
                      form.project_type === t.key
                        ? 'ring-[#0D3B6E] bg-blue-50 text-[#0D3B6E]'
                        : 'ring-gray-200 hover:ring-gray-300 text-gray-700'
                    }`}
                  >{t.label}</button>
                ))}
              </div>
              {typeChanged && (
                <div className="flex items-start gap-2 mt-2 bg-amber-50 text-amber-800 rounded-lg px-3 py-2 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                  <span>
                    Changing to {profile?.label.toLowerCase()} takes away any tab it doesn&apos;t use.
                    Nothing already recorded is deleted — it just stops being shown.
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Client</label>
              <select className="form-input" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
                <option value="">Not linked</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="form-hint">Needed before the job can be invoiced.</p>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">Contract value</label>
              <input type="number" className="form-input" value={form.contract_value} onChange={e => set('contract_value', e.target.value)} />
              <p className="form-hint">The original sum. Variations are added on top.</p>
            </div>
            {cap?.retention && (
              <div>
                <label className="form-label">Retention (%)</label>
                <input type="number" className="form-input" value={form.retention_pct} onChange={e => set('retention_pct', e.target.value)} />
                <p className="form-hint">Applies to applications raised from now on.</p>
              </div>
            )}

            <div>
              <label className="form-label">Payment terms (days)</label>
              <input type="number" min={0} className="form-input" value={form.payment_terms_days} onChange={e => set('payment_terms_days', e.target.value)} />
            </div>
            {cap?.retention && (
              <div>
                <label className="form-label">Defects period (days)</label>
                <input type="number" min={0} className="form-input" value={form.defects_liability_days} onChange={e => set('defects_liability_days', e.target.value)} />
              </div>
            )}

            <div>
              <label className="form-label">Start date</label>
              <input type="date" className="form-input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Planned completion</label>
              <input type="date" className="form-input" value={form.planned_end_date} onChange={e => set('planned_end_date', e.target.value)} />
              {endDateChanged && (
                <p className="form-hint text-amber-700">
                  Slip is measured against the frozen programme, so this will change it.
                </p>
              )}
            </div>
            <div>
              <label className="form-label">Actual completion</label>
              <input type="date" className="form-input" value={form.actual_end_date} onChange={e => set('actual_end_date', e.target.value)} />
              <p className="form-hint">Set automatically when the status becomes completed.</p>
            </div>
            {cap?.time_claims && (
              <div>
                <label className="form-label">Working hours per day</label>
                <input type="number" min={1} className="form-input" value={form.working_hours_per_day} onChange={e => set('working_hours_per_day', e.target.value)} />
                <p className="form-hint">Turns hours lost into days claimed.</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="form-label">Site / location</label>
              <input className="form-input" value={form.site_address} onChange={e => set('site_address', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-6 pb-6 pt-4 border-t border-gray-100">
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
