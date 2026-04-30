'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, ConfirmDialog, toast } from '@/components/ui';
import { Plus, Edit2, UserX } from 'lucide-react';
import api from '@/lib/api';

const ROLES = [
  { value:'business_owner',       label:'Business Owner' },
  { value:'branch_manager',       label:'Branch Manager' },
  { value:'sales_staff',          label:'Sales Staff' },
  { value:'warehouse_staff',      label:'Warehouse Staff' },
  { value:'accountant',           label:'Accountant' },
  { value:'hr_manager',           label:'HR Manager' },
  { value:'procurement_officer',  label:'Procurement Officer' },
];

export default function UsersPage() {
  const [users, setUsers]       = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<'add'|'edit'|null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [confirm, setConfirm]   = useState<any>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({ name:'', email:'', password:'', role:'sales_staff', branch_id:'', is_active: true });

  const load = async () => {
    setLoading(true);
    const [r, b] = await Promise.all([api.get('/users'), api.get('/branches')]);
    setUsers(r.data.data);
    setBranches(b.data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name:'', email:'', password:'', role:'sales_staff', branch_id:'', is_active:true }); setError(''); setModal('add'); };
  const openEdit = (u: any) => { setSelected(u); setForm({ name:u.name, email:u.email, password:'', role:u.role, branch_id: u.branch_id?._id || u.branch_id || '', is_active:u.is_active }); setError(''); setModal('edit'); };

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (modal==='add') await api.post('/users', form);
      else await api.put(`/users/${selected.id}`, form);
      setModal(null); load();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const deactivate = async (id: number) => { await api.delete(`/users/${id}`);
    toast.success('Deleted successfully');
    load(); };

  return (
    <AppLayout title="User Management" subtitle="Manage system users and role-based access" allowedRoles={['business_owner']}>
      <div className="flex justify-between items-center mb-5">
        <div className="text-sm text-gray-500">{users.length} users registered</div>
        <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4"/>Add User</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <Spinner /> : users.length===0 ? <EmptyState message="No users found" icon="👤" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>{['Name','Email','Role','Branch','Status','Joined','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => {
                  const branch = branches.find(b => b.id === (u.branch_id?._id || u.branch_id));
                  return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3"><span className="badge badge-blue">{ROLES.find(r=>r.value===u.role)?.label||u.role}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{branch ? branch.name : <span className="text-gray-300">Company-wide</span>}</td>
                    <td className="px-4 py-3"><Badge status={u.is_active?'active':'inactive'} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Edit2 className="w-4 h-4"/></button>
                        {u.is_active && <button onClick={() => setConfirm(u)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><UserX className="w-4 h-4"/></button>}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal==='add'||modal==='edit'} onClose={() => setModal(null)} title={modal==='add'?'Add User':'Edit User'} size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} /></div>
          <div><label className="form-label">Email *</label><input type="email" className="form-input" value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></div>
          {modal==='add' && <div><label className="form-label">Password *</label><input type="password" className="form-input" value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="Min 6 characters" /></div>}
          <div><label className="form-label">Role *</label>
            <select className="form-input" value={form.role} onChange={e => setForm({...form,role:e.target.value})}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Branch <span className="text-gray-400 font-normal">(leave blank for company-wide staff)</span></label>
            <select className="form-input" value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})}>
              <option value="">Company-wide (no specific branch)</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          {modal==='edit' && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({...form,is_active:e.target.checked})} className="w-4 h-4 text-blue-600" />
              <label htmlFor="is_active" className="text-sm text-gray-700">Account Active</label>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save User'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => deactivate(confirm?.id)} title="Deactivate User" message={`Deactivate ${confirm?.name}? They will lose access to the system.`} danger />
    </AppLayout>
  );
}
