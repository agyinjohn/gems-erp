'use client';

import { useEffect, useState } from 'react';
import { EmptyState, Spinner, toast } from '@/components/ui';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import HrConfirmModal from '@/components/hr/HrConfirmModal';

export default function AccountingCreditNotesTab() {
  const [notes, setNotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ invoice_id: '', amount: '', reason: '' });
  const [confirm, setConfirm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cn, inv] = await Promise.all([
        api.get('/credit-notes'),
        api.get('/invoices?status=paid,partially_paid'),
      ]);
      setNotes(cn.data.data || []);
      setInvoices((inv.data.data || []).filter((i: any) => i.amount_paid > 0));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/credit-notes', {
        invoice_id: form.invoice_id,
        amount: parseFloat(form.amount),
        reason: form.reason,
      });
      toast.success('Credit note applied');
      setModal(false);
      setForm({ invoice_id: '', amount: '', reason: '' });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
      throw e;
    } finally { setSaving(false); }
  };

  const requestSubmit = () => {
    if (!form.invoice_id || !form.amount || !form.reason.trim()) {
      toast.error('Invoice, amount and reason are required');
      return;
    }
    const inv = invoices.find((i) => i.id === form.invoice_id);
    setConfirm({
      title: 'Issue credit note?',
      message: `Refund GH₵ ${parseFloat(form.amount).toFixed(2)} against ${inv?.invoice_number}. GL entries will be reversed.`,
      confirmLabel: 'Issue credit note',
      details: [
        { label: 'Invoice', value: inv?.invoice_number || '—' },
        { label: 'Customer', value: inv?.customer_name || '—' },
        { label: 'Amount', value: `GH₵ ${parseFloat(form.amount).toFixed(2)}` },
        { label: 'Reason', value: form.reason },
      ],
      action: submit,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary text-sm" onClick={() => setModal(true)}><Plus className="w-4 h-4" />New credit note</button>
      </div>
      <div className="card p-0 overflow-hidden">
        {loading ? <Spinner /> : notes.length === 0 ? (
          <EmptyState message="No credit notes yet" />
        ) : (
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>{['Credit note', 'Invoice', 'Customer', 'Amount', 'Reason', 'Date'].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {notes.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{n.credit_note_number}</td>
                  <td className="px-4 py-3">{n.invoice_id?.invoice_number || '—'}</td>
                  <td className="px-4 py-3">{n.customer_name}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">GH₵ {parseFloat(n.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{n.reason}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(n.createdAt || n.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-gray-900">New credit note</h3>
            <div>
              <label className="form-label">Invoice (with payments)</label>
              <select className="form-input" value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}>
                <option value="">Select invoice</option>
                {invoices.map((i) => (
                  <option key={i.id} value={i.id}>{i.invoice_number} — {i.customer_name} (paid GH₵ {parseFloat(i.amount_paid).toFixed(2)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Credit amount (GH₵)</label>
              <input type="number" className="form-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Reason</label>
              <textarea className="form-input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={requestSubmit} disabled={saving}>Continue</button>
            </div>
          </div>
        </div>
      )}

      <HrConfirmModal
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        details={confirm?.details}
        saving={saving}
        onClose={() => setConfirm(null)}
        onConfirm={async () => { await confirm?.action(); setConfirm(null); }}
      />
    </div>
  );
}
