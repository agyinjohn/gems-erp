'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { toast, ConfirmDialog } from '@/components/ui';
import { Plus, Pencil, Trash2, X, Check, CheckCircle2, Clock } from 'lucide-react';

const PARTIES = ['client', 'internal'];
const label   = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const dateStr = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : null);
const dateVal = (d?: string | null) => (d ? String(d).slice(0, 10) : '');

const EMPTY = { party: 'client', name: '', role: '', email: '', phone: '' };

interface Props {
  contract: any;
  canManage: boolean;
  reload: () => Promise<void>;
}

export default function SignatoriesTab({ contract, canManage, reload }: Props) {
  const signatories: any[] = contract.signatories || [];

  const [showAdd, setShowAdd] = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [form,     setForm]    = useState(EMPTY);
  const [editForm, setEditForm] = useState(EMPTY);
  const [saving,   setSaving]  = useState(false);
  const [confirm,  setConfirm] = useState<{ title: string; message: string; run: () => void } | null>(null);

  const set     = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setEdit = (k: string, v: string) => setEditForm(f => ({ ...f, [k]: v }));

  const add = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await api.post(`/contracts/${contract.id}/signatories`, {
        party: form.party,
        name:  form.name.trim(),
        role:  form.role  || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
      });
      toast.success('Signatory added');
      setShowAdd(false);
      setForm(EMPTY);
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not add signatory');
    } finally { setSaving(false); }
  };

  const openEdit = (sig: any) => {
    setEditId(sig.id || String(sig._id));
    setEditForm({ party: sig.party || 'client', name: sig.name || '', role: sig.role || '', email: sig.email || '', phone: sig.phone || '' });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await api.put(`/contracts/${contract.id}/signatories/${editId}`, {
        party: editForm.party,
        name:  editForm.name.trim(),
        role:  editForm.role  || undefined,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
      });
      toast.success('Signatory updated');
      setEditId(null);
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update');
    } finally { setSaving(false); }
  };

  const markSigned = async (sig: any, signed: boolean) => {
    try {
      await api.put(`/contracts/${contract.id}/signatories/${sig.id || sig._id}`, { signed });
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update');
    }
  };

  const remove = (sig: any) => setConfirm({
    title: 'Remove signatory?',
    message: `"${sig.name}" will be removed from this contract.`,
    run: async () => {
      try {
        await api.delete(`/contracts/${contract.id}/signatories/${sig.id || sig._id}`);
        toast.success('Signatory removed');
        await reload();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Could not remove');
      }
    },
  });

  // Group by party for display
  const clientSigs   = signatories.filter(s => s.party === 'client');
  const internalSigs = signatories.filter(s => s.party === 'internal');
  const allSigned    = signatories.length > 0 && signatories.every(s => s.signed);

  return (
    <div className="space-y-4">

      {/* Status banner */}
      {signatories.length > 0 && (
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm ${
          allSigned ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
        }`}>
          {allSigned
            ? <><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> All parties have signed.</>
            : <><Clock className="w-4 h-4 flex-shrink-0" /> {signatories.filter(s => !s.signed).length} signature{signatories.filter(s => !s.signed).length !== 1 ? 's' : ''} outstanding.</>
          }
        </div>
      )}

      {/* Add button */}
      {canManage && !showAdd && (
        <button type="button" className="btn-secondary text-sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add signatory
        </button>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-800">New signatory</p>
            <button type="button" className="btn-icon" onClick={() => { setShowAdd(false); setForm(EMPTY); }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <SignatoryForm f={form} set={set} />
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn-primary text-sm" onClick={add} disabled={saving}>
              {saving ? 'Adding…' : 'Add signatory'}
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => { setShowAdd(false); setForm(EMPTY); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {signatories.length === 0 && !showAdd && (
        <div className="card text-center py-14">
          <p className="font-semibold text-gray-700">No signatories yet</p>
          <p className="text-sm text-gray-400 mt-1">Add the people who sign on behalf of each party.</p>
        </div>
      )}

      {/* Groups */}
      {[{ title: 'Client', items: clientSigs }, { title: 'Internal (GTHINK)', items: internalSigs }]
        .filter(g => g.items.length > 0)
        .map(group => (
          <div key={group.title}>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">{group.title}</p>
            <div className="space-y-2">
              {group.items.map((sig: any) => {
                const sigId    = sig.id || String(sig._id);
                const isEditing = editId === sigId;

                return (
                  <div key={sigId} className="card !p-0 overflow-hidden">
                    {isEditing ? (
                      <div className="px-4 py-4 space-y-4">
                        <SignatoryForm f={editForm} set={setEdit} />
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button type="button" className="btn-primary text-sm" onClick={saveEdit} disabled={saving}>
                            <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button type="button" className="btn-secondary text-sm" onClick={() => setEditId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Signed indicator */}
                        <button
                          type="button"
                          title={sig.signed ? 'Mark as not signed' : 'Mark as signed'}
                          onClick={() => canManage && markSigned(sig, !sig.signed)}
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            sig.signed
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-900">{sig.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {sig.role  && <p className="text-xs text-gray-500">{sig.role}</p>}
                            {sig.email && <p className="text-xs text-gray-400">{sig.email}</p>}
                            {sig.phone && <p className="text-xs text-gray-400">{sig.phone}</p>}
                            {sig.signed && sig.signed_at && (
                              <p className="text-xs text-green-600">Signed {dateStr(sig.signed_at)}</p>
                            )}
                          </div>
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button type="button" className="btn-icon" onClick={() => openEdit(sig)}>
                              <Pencil className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button type="button" className="btn-icon" onClick={() => remove(sig)}>
                              <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

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

function SignatoryForm({ f, set }: { f: any; set: (k: string, v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="form-label">Party</label>
        <select className="form-input" value={f.party} onChange={e => set('party', e.target.value)}>
          {PARTIES.map(p => <option key={p} value={p}>{p === 'internal' ? 'Internal (GTHINK)' : 'Client'}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">Full name *</label>
        <input className="form-input" placeholder="e.g. Kwame Mensah" value={f.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div>
        <label className="form-label">Role / title</label>
        <input className="form-input" placeholder="e.g. CEO" value={f.role} onChange={e => set('role', e.target.value)} />
      </div>
      <div>
        <label className="form-label">Email</label>
        <input type="email" className="form-input" placeholder="optional" value={f.email} onChange={e => set('email', e.target.value)} />
      </div>
      <div>
        <label className="form-label">Phone</label>
        <input className="form-input" placeholder="optional" value={f.phone} onChange={e => set('phone', e.target.value)} />
      </div>
    </div>
  );
}
