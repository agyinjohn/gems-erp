'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import { Pencil, X, Check } from 'lucide-react';

const STATUSES       = ['draft', 'active', 'on_hold', 'completed', 'terminated'];
const CONTRACT_TYPES = ['service', 'supply', 'maintenance', 'retainer', 'partnership', 'other'];
const label   = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const money   = (n: number, c = 'GHS') =>
  `${c} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateStr = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');
const dateVal = (d?: string | null) => (d ? String(d).slice(0, 10) : '');

interface Props {
  contract: any;
  canManage: boolean;
  reload: () => Promise<void>;
}

export default function OverviewTab({ contract, canManage, reload }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string; company?: string }[]>([]);
  const [form, setForm] = useState(toForm(contract));

  function toForm(c: any) {
    return {
      title:         c.title         || '',
      description:   c.description   || '',
      customer_id:   c.customer_id?._id || c.customer_id || '',
      contract_type: c.contract_type  || 'service',
      value:         String(c.value   ?? ''),
      currency:      c.currency       || 'GHS',
      status:        c.status         || 'draft',
      signed_date:   dateVal(c.signed_date),
      start_date:    dateVal(c.start_date),
      end_date:      dateVal(c.end_date),
      renewal_date:  dateVal(c.renewal_date),
      auto_renew:    !!c.auto_renew,
    };
  }

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data.data || [])).catch(() => {});
  }, []);

  // Reset form whenever contract data refreshes
  useEffect(() => { setForm(toForm(contract)); }, [contract]);

  const save = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      await api.put(`/contracts/${contract.id}`, {
        ...form,
        value:       parseFloat(form.value) || 0,
        customer_id: form.customer_id || undefined,
        signed_date: form.signed_date || undefined,
        start_date:  form.start_date  || undefined,
        end_date:    form.end_date    || undefined,
        renewal_date: form.renewal_date || undefined,
      });
      toast.success('Contract updated');
      setEditing(false);
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => { setForm(toForm(contract)); setEditing(false); };
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const isRetainer = form.contract_type === 'retainer';

  // ── Read view ──────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm">Contract details</p>
            {canManage && (
              <button type="button" onClick={() => setEditing(true)} className="btn-secondary !py-1 text-xs">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Field label="Title"         value={contract.title} />
            <Field label="Client"        value={contract.customer_name || '—'} />
            <Field label="Type"          value={label(contract.contract_type)} />
            <Field label="Status"        value={label(contract.status)} />
            <Field label="Value"         value={money(contract.value, contract.currency)} />
            <Field label="Currency"      value={contract.currency} />
            <Field label="Signed"        value={dateStr(contract.signed_date)} />
            <Field label="Start date"    value={dateStr(contract.start_date)} />
            <Field label="End date"      value={dateStr(contract.end_date)} />
            {isRetainer && <>
              <Field label="Renewal date" value={dateStr(contract.renewal_date)} />
              <Field label="Auto-renew"   value={contract.auto_renew ? 'Yes' : 'No'} />
            </>}
            {contract.owner_id?.name && (
              <Field label="Owner" value={contract.owner_id.name} />
            )}
          </div>

          {contract.description && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{contract.description}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Edit view ──────────────────────────────────────────────────────────────
  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-800 text-sm">Edit contract details</p>
        <button type="button" onClick={cancel} className="btn-icon"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="form-label">Title *</label>
          <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="form-label">Description</label>
          <textarea rows={3} className="form-input resize-none" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Client</label>
          <select className="form-input" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
            <option value="">Not linked</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Type</label>
          <select className="form-input" value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Value</label>
          <input type="number" min={0} className="form-input" value={form.value} onChange={e => set('value', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Currency</label>
          <input className="form-input" value={form.currency} onChange={e => set('currency', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Signed date</label>
          <input type="date" className="form-input" value={form.signed_date} onChange={e => set('signed_date', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Start date</label>
          <input type="date" className="form-input" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className="form-label">End date</label>
          <input type="date" className="form-input" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
        {isRetainer && <>
          <div>
            <label className="form-label">Renewal date</label>
            <input type="date" className="form-input" value={form.renewal_date} onChange={e => set('renewal_date', e.target.value)} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input type="checkbox" id="auto_renew" checked={form.auto_renew}
              onChange={e => set('auto_renew', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#0D3B6E]" />
            <label htmlFor="auto_renew" className="text-sm text-gray-700">Auto-renew</label>
          </div>
        </>}
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-primary" onClick={save} disabled={saving}>
          <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn-secondary" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  );
}
