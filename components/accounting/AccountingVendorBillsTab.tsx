'use client';

import { useEffect, useState } from 'react';
import { Badge, EmptyState, Spinner, toast } from '@/components/ui';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import HrConfirmModal from '@/components/hr/HrConfirmModal';

export default function AccountingVendorBillsTab({ accounts }: { accounts: any[] }) {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [payModal, setPayModal] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'bank_transfer', reference: '' });
  const [form, setForm] = useState({
    vendor_name: '', issue_date: new Date().toISOString().slice(0, 10),
    due_date: '', description: '', amount: '', tax_rate: '0', expense_account_id: '',
  });
  const [confirm, setConfirm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendor-bills');
      setBills(res.data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createBill = async () => {
    setSaving(true);
    try {
      await api.post('/vendor-bills', {
        vendor_name: form.vendor_name,
        issue_date: form.issue_date,
        due_date: form.due_date,
        expense_account_id: form.expense_account_id || null,
        lines: [{
          description: form.description || 'Vendor bill',
          quantity: 1,
          unit_price: parseFloat(form.amount),
          tax_rate: parseFloat(form.tax_rate) || 0,
        }],
      });
      toast.success('Vendor bill created');
      setModal(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
      throw e;
    } finally { setSaving(false); }
  };

  const postBill = async (id: string) => {
    await api.patch(`/vendor-bills/${id}/post`);
    toast.success('Bill posted to GL');
    load();
  };

  const payBill = async () => {
    if (!payModal) return;
    setSaving(true);
    try {
      await api.post(`/vendor-bills/${payModal.id}/payments`, {
        amount: parseFloat(payForm.amount),
        method: payForm.method,
        reference: payForm.reference,
      });
      toast.success('Payment recorded');
      setPayModal(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
      throw e;
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary text-sm" onClick={() => setModal(true)}><Plus className="w-4 h-4" />New vendor bill</button>
      </div>
      <div className="card p-0 overflow-hidden">
        {loading ? <Spinner /> : bills.length === 0 ? <EmptyState message="No vendor bills" /> : (
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>{['Bill #', 'Vendor', 'Total', 'Due', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bills.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{b.bill_number}</td>
                  <td className="px-4 py-3 font-medium">{b.vendor_name}</td>
                  <td className="px-4 py-3">GH₵ {parseFloat(b.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(b.due_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {b.status === 'draft' && (
                        <button className="text-xs text-blue-600 hover:underline" onClick={() => setConfirm({
                          title: 'Post vendor bill?',
                          message: `Post ${b.bill_number} to accounts payable.`,
                          confirmLabel: 'Post bill',
                          action: async () => { await postBill(b.id); },
                        })}>Post</button>
                      )}
                      {['posted', 'partially_paid'].includes(b.status) && (
                        <button className="text-xs text-green-600 hover:underline" onClick={() => {
                          setPayModal(b);
                          setPayForm({ amount: String(b.amount_due), method: 'bank_transfer', reference: '' });
                        }}>Pay</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold">New vendor bill</h3>
            <div><label className="form-label">Vendor name *</label><input className="form-input" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="form-label">Issue date</label><input type="date" className="form-input" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div><label className="form-label">Due date *</label><input type="date" className="form-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="form-label">Amount (GH₵) *</label><input type="number" className="form-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><label className="form-label">VAT %</label><input type="number" className="form-input" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
            </div>
            <div>
              <label className="form-label">Expense account</label>
              <select className="form-input" value={form.expense_account_id} onChange={(e) => setForm({ ...form, expense_account_id: e.target.value })}>
                <option value="">Default (Other expenses)</option>
                {accounts.filter((a) => a.type === 'expense' && !a.is_group).map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={saving} onClick={() => setConfirm({
                title: 'Create vendor bill?',
                message: `Record a bill from ${form.vendor_name} for GH₵ ${form.amount || 0}.`,
                confirmLabel: 'Create bill',
                action: createBill,
              })}>Create</button>
            </div>
          </div>
        </div>
      )}

      <HrConfirmModal
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        saving={saving}
        onClose={() => setConfirm(null)}
        onConfirm={async () => { await confirm?.action(); setConfirm(null); }}
      />

      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-3">
            <h3 className="font-bold">Pay {payModal.bill_number}</h3>
            <div><label className="form-label">Amount</label><input type="number" className="form-input" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></div>
            <div><label className="form-label">Reference</label><input className="form-input" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} /></div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="btn-primary" disabled={saving} onClick={() => setConfirm({
                title: 'Record payment?',
                message: `Pay GH₵ ${payForm.amount} for ${payModal.bill_number}.`,
                confirmLabel: 'Record payment',
                action: payBill,
              })}>Pay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
