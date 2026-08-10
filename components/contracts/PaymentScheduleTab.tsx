'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { toast, ConfirmDialog } from '@/components/ui';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const STATUSES = ['pending', 'invoiced', 'paid'];
const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const money = (n: number, c = 'GHS') =>
  `${c} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateVal = (d?: string | null) => (d ? String(d).slice(0, 10) : '');
const dateStr = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700',
  invoiced: 'bg-blue-50 text-blue-700',
  paid:     'bg-green-50 text-green-700',
};

const EMPTY = { label: '', pct: '', amount: '', due_date: '', status: 'pending' };

interface Props {
  contract: any;
  canManage: boolean;
  reload: () => Promise<void>;
}

export default function PaymentScheduleTab({ contract, canManage, reload }: Props) {
  const schedule: any[] = contract.payment_schedule || [];
  const contractValue   = contract.value || 0;
  const currency        = contract.currency || 'GHS';

  const [showAdd, setShowAdd]   = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState(EMPTY);
  const [editForm, setEditForm] = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState<{ title: string; message: string; run: () => void } | null>(null);

  const set     = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setEdit = (k: string, v: string) => setEditForm(f => ({ ...f, [k]: v }));

  // Derive amount from pct if amount is blank, and vice-versa for display
  const resolveAmount = (f: typeof EMPTY) => {
    const amt = parseFloat(f.amount);
    const pct = parseFloat(f.pct);
    if (amt > 0) return amt;
    if (pct > 0 && contractValue > 0) return (pct / 100) * contractValue;
    return 0;
  };

  const scheduledTotal = schedule.reduce((s, ms) => {
    const amt = ms.amount > 0 ? ms.amount : (ms.pct / 100) * contractValue;
    return s + amt;
  }, 0);
  const paidTotal = schedule
    .filter(ms => ms.status === 'paid')
    .reduce((s, ms) => {
      const amt = ms.amount > 0 ? ms.amount : (ms.pct / 100) * contractValue;
      return s + amt;
    }, 0);

  const add = async () => {
    if (!form.label.trim()) return toast.error('A label is required');
    setSaving(true);
    try {
      await api.post(`/contracts/${contract.id}/payment-schedule`, {
        label:    form.label.trim(),
        pct:      parseFloat(form.pct)    || 0,
        amount:   parseFloat(form.amount) || 0,
        due_date: form.due_date || undefined,
        status:   form.status,
      });
      toast.success('Milestone added');
      setShowAdd(false);
      setForm(EMPTY);
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not add milestone');
    } finally { setSaving(false); }
  };

  const openEdit = (ms: any) => {
    setEditId(ms.id || String(ms._id));
    setEditForm({
      label:    ms.label    || '',
      pct:      String(ms.pct    ?? ''),
      amount:   String(ms.amount ?? ''),
      due_date: dateVal(ms.due_date),
      status:   ms.status   || 'pending',
    });
  };

  const saveEdit = async () => {
    if (!editForm.label.trim()) return toast.error('A label is required');
    setSaving(true);
    try {
      await api.put(`/contracts/${contract.id}/payment-schedule/${editId}`, {
        label:    editForm.label.trim(),
        pct:      parseFloat(editForm.pct)    || 0,
        amount:   parseFloat(editForm.amount) || 0,
        due_date: editForm.due_date || undefined,
        status:   editForm.status,
      });
      toast.success('Milestone updated');
      setEditId(null);
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update');
    } finally { setSaving(false); }
  };

  const remove = (ms: any) => setConfirm({
    title: 'Remove this milestone?',
    message: `"${ms.label}" will be deleted from the payment schedule.`,
    run: async () => {
      try {
        await api.delete(`/contracts/${contract.id}/payment-schedule/${ms.id || ms._id}`);
        toast.success('Milestone removed');
        await reload();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Could not remove');
      }
    },
  });

  return (
    <div className="space-y-4">

      {/* Summary strip */}
      {schedule.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Scheduled',  value: money(scheduledTotal, currency), sub: `of ${money(contractValue, currency)} contract` },
            { label: 'Paid',       value: money(paidTotal, currency),      sub: `${schedule.filter(m => m.status === 'paid').length} milestone${schedule.filter(m => m.status === 'paid').length !== 1 ? 's' : ''}` },
            { label: 'Remaining',  value: money(scheduledTotal - paidTotal, currency), sub: 'outstanding' },
          ].map(s => (
            <div key={s.label} className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
              <p className="text-lg font-extrabold text-gray-900 mt-1">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {canManage && !showAdd && (
        <button type="button" className="btn-secondary text-sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add milestone
        </button>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-800">New payment milestone</p>
            <button type="button" className="btn-icon" onClick={() => { setShowAdd(false); setForm(EMPTY); }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <MilestoneForm f={form} set={set} contractValue={contractValue} currency={currency} resolveAmount={resolveAmount} />
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn-primary text-sm" onClick={add} disabled={saving}>
              {saving ? 'Adding…' : 'Add milestone'}
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => { setShowAdd(false); setForm(EMPTY); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {schedule.length === 0 && !showAdd ? (
        <div className="card text-center py-14">
          <p className="font-semibold text-gray-700">No payment schedule yet</p>
          <p className="text-sm text-gray-400 mt-1">Add milestones to define when payments are due.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedule.map((ms: any) => {
            const msId = ms.id || String(ms._id);
            const amt  = ms.amount > 0 ? ms.amount : (ms.pct / 100) * contractValue;
            const isEditing = editId === msId;

            return (
              <div key={msId} className="card !p-0 overflow-hidden">
                {isEditing ? (
                  <div className="px-4 py-4 space-y-4">
                    <MilestoneForm f={editForm} set={setEdit} contractValue={contractValue} currency={currency} resolveAmount={resolveAmount} />
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button type="button" className="btn-primary text-sm" onClick={saveEdit} disabled={saving}>
                        <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="btn-secondary text-sm" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900">{ms.label}</p>
                        <span className={`badge ${STATUS_STYLE[ms.status] || STATUS_STYLE.pending}`}>
                          {label(ms.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                        {ms.pct > 0 && <p className="text-xs text-gray-400">{ms.pct}% of contract</p>}
                        {ms.due_date && <p className="text-xs text-gray-400">Due {dateStr(ms.due_date)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-gray-900 text-sm">{money(amt, currency)}</span>
                      {canManage && (
                        <>
                          <button type="button" className="btn-icon" onClick={() => openEdit(ms)}>
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button type="button" className="btn-icon" onClick={() => remove(ms)}>
                            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { confirm?.run(); setConfirm(null); }}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        danger
      />
    </div>
  );
}

// Shared form fields for add and edit
function MilestoneForm({ f, set, contractValue, currency, resolveAmount }: {
  f: any; set: (k: string, v: string) => void;
  contractValue: number; currency: string;
  resolveAmount: (f: any) => number;
}) {
  const preview = resolveAmount(f);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className="form-label">Label *</label>
        <input className="form-input" placeholder="e.g. On signing" value={f.label} onChange={e => set('label', e.target.value)} />
      </div>
      <div>
        <label className="form-label">Percentage (%)</label>
        <input type="number" min={0} max={100} className="form-input" placeholder="e.g. 30"
          value={f.pct} onChange={e => set('pct', e.target.value)} />
        <p className="form-hint">% of contract value ({currency} {contractValue.toLocaleString()})</p>
      </div>
      <div>
        <label className="form-label">Fixed amount (overrides %)</label>
        <input type="number" min={0} className="form-input" placeholder="Leave blank to use %"
          value={f.amount} onChange={e => set('amount', e.target.value)} />
        {preview > 0 && (
          <p className="form-hint">= {currency} {preview.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        )}
      </div>
      <div>
        <label className="form-label">Due date</label>
        <input type="date" className="form-input" value={f.due_date} onChange={e => set('due_date', e.target.value)} />
      </div>
      <div>
        <label className="form-label">Status</label>
        <select className="form-input" value={f.status} onChange={e => set('status', e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
    </div>
  );
}
