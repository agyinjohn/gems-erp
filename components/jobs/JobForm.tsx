'use client';
import { Plus, X } from 'lucide-react';

export const JOB_TYPES = [
  { key: 'printing',     label: 'Printing' },
  { key: 'design',       label: 'Design' },
  { key: 'repair',       label: 'Repair' },
  { key: 'installation', label: 'Installation' },
  { key: 'professional', label: 'Professional' },
  { key: 'general',      label: 'General' },
];

export interface JobFormState {
  title: string; description: string; customer_id: string; job_type: string;
  assigned_to: string; due_date: string; notes: string;
  walk_in_name: string; walk_in_phone: string; is_walk_in: boolean;
}
export interface ItemRow { description: string; quantity: string; unit_price: string }

export const EMPTY_FORM: JobFormState = {
  title: '', description: '', customer_id: '', job_type: 'general',
  assigned_to: '', due_date: '', notes: '',
  walk_in_name: '', walk_in_phone: '', is_walk_in: false,
};
export const EMPTY_ITEM: ItemRow = { description: '', quantity: '1', unit_price: '' };

export const itemsTotal = (rows: ItemRow[]) =>
  rows.reduce((s, i) => s + (parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0), 0);

interface Props {
  form: JobFormState;
  setForm: (f: JobFormState) => void;
  items: ItemRow[];
  setItems: (rows: ItemRow[]) => void;
  customers: { id: string; name: string; company?: string }[];
  employees: { id: string; name: string }[];
}

export default function JobForm({ form, setForm, items, setItems, customers, employees }: Props) {
  const set = <K extends keyof JobFormState>(k: K, v: JobFormState[K]) => setForm({ ...form, [k]: v });
  const setItem = (i: number, k: keyof ItemRow, v: string) => setItems(items.map((r, n) => (n === i ? { ...r, [k]: v } : r)));
  const total = itemsTotal(items);

  return (
    <div className="space-y-5">
      <div>
        <input
          autoFocus
          className="w-full text-lg font-semibold text-gray-900 placeholder:text-gray-300 border-0 border-b-2 border-gray-100 focus:border-[#0D3B6E] px-0 py-2 outline-none transition-colors"
          placeholder="What's the job? e.g. Print 200 flyers"
          value={form.title}
          onChange={e => set('title', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Type</label>
          <select className="form-input" value={form.job_type} onChange={e => set('job_type', e.target.value)}>
            {JOB_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Assigned to</label>
          <select className="form-input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
            <option value="">Unassigned</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Due date</label>
          <input type="date" className="form-input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="form-label !mb-0">Client</label>
          <div className="inline-flex bg-gray-100 rounded-lg p-0.5 text-xs">
            {[{ v: false, l: 'Existing client' }, { v: true, l: 'Walk-in' }].map(o => (
              <button key={o.l} type="button" onClick={() => set('is_walk_in', o.v)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${form.is_walk_in === o.v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
        {form.is_walk_in ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="form-input" placeholder="Full name" value={form.walk_in_name} onChange={e => set('walk_in_name', e.target.value)} />
            <input className="form-input" placeholder="Phone number" value={form.walk_in_phone} onChange={e => set('walk_in_phone', e.target.value)} />
          </div>
        ) : (
          <select className="form-input" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
            <option value="">Not linked</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
          </select>
        )}
      </div>

      <div>
        <label className="form-label">Items</label>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_64px_96px_32px] gap-2 px-3 py-2 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <span>Description</span><span>Qty</span><span>Unit price</span><span />
          </div>
          <div className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_64px_96px_32px] gap-2 items-center px-3 py-2">
                <input className="text-sm outline-none bg-transparent placeholder:text-gray-300" placeholder="e.g. A5 flyers, full colour" value={item.description} onChange={e => setItem(i, 'description', e.target.value)} />
                <input type="number" min={1} className="form-input !py-1 text-sm" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                <input type="number" min={0} className="form-input !py-1 text-sm" placeholder="0.00" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} />
                <button type="button" className="btn-icon !p-1" onClick={() => setItems(items.filter((_, n) => n !== i))} disabled={items.length === 1} aria-label="Remove item">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/60">
            <button type="button" className="text-xs font-semibold text-[#0D3B6E] inline-flex items-center gap-1" onClick={() => setItems([...items, { ...EMPTY_ITEM }])}>
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
            <span className="text-sm font-bold text-gray-900">GHS {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="form-label">Notes</label>
        <textarea rows={2} className="form-input resize-none" placeholder="Anything the person doing it should know" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
    </div>
  );
}
