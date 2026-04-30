'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, EmptyState, Spinner, ConfirmDialog, toast } from '@/components/ui';
import { Plus, Edit2, Trash2, MapPin, Users, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

export default function BranchesPage() {
  const { tenant } = useAuth() as any;
  const [branches, setBranches]   = useState<any[]>([]);
  const [users, setUsers]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<'add'|'edit'|null>(null);
  const [selected, setSelected]   = useState<any>(null);
  const [confirm, setConfirm]     = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ name:'', address:'', phone:'', email:'', manager_id:'' });

  const load = async () => {
    setLoading(true);
    const [b, u] = await Promise.all([api.get('/branches'), api.get('/users')]);
    setBranches(b.data.data);
    setUsers(u.data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ name:'', address:'', phone:'', email:'', manager_id:'' });
    setModal('add');
  };

  const openEdit = (b: any) => {
    setSelected(b);
    setForm({ name: b.name, address: b.address||'', phone: b.phone||'', email: b.email||'', manager_id: b.manager_id?._id || b.manager_id || '' });
    setModal('edit');
  };

  const save = async () => {
    if (!form.name) { toast.error('Branch name is required'); return; }
    setSaving(true);
    try {
      if (modal === 'add') await api.post('/branches', form);
      else await api.put(`/branches/${selected.id}`, form);
      toast.success(modal === 'add' ? 'Branch created' : 'Branch updated');
      setModal(null);
      load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Error saving branch'); }
    finally { setSaving(false); }
  };

  const doDelete = async (id: string) => {
    await api.delete(`/branches/${id}`);
    toast.success('Branch deactivated');
    load();
  };

  const inp = (key: string) => ({
    value: (form as any)[key],
    onChange: (e: any) => setForm({ ...form, [key]: e.target.value }),
    className: 'form-input',
  });

  return (
    <AppLayout title="Branches" subtitle="Manage your business locations" allowedRoles={['platform_admin','business_owner']}>

      {/* Plan limit banner */}
      {tenant && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between mb-5 text-sm">
          <span className="text-blue-700">
            <strong>{branches.length}</strong> of <strong>{tenant.max_branches}</strong> branches used
            <span className="text-blue-400 ml-2">({tenant.plan} plan)</span>
          </span>
          {branches.length >= tenant.max_branches && (
            <span className="text-xs text-orange-600 font-semibold">Upgrade to add more branches</span>
          )}
        </div>
      )}

      <div className="flex justify-end mb-5">
        <button className="btn-primary" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Branch
        </button>
      </div>

      {loading ? <Spinner /> : branches.length === 0 ? <EmptyState message="No branches yet" icon="🏪" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(b => {
            const manager = users.find(u => u.id === (b.manager_id?._id || b.manager_id));
            const staffCount = users.filter(u => u.branch_id === b.id || u.branch_id?._id === b.id).length;
            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#0D3B6E]" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirm({ id: b.id, name: b.name })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 mb-1">{b.name}</h3>
                {b.address && <p className="text-xs text-gray-400 mb-3">{b.address}</p>}

                <div className="space-y-1.5 text-xs text-gray-500">
                  {b.phone && <div>📞 {b.phone}</div>}
                  {b.email && <div>✉️ {b.email}</div>}
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {staffCount} staff member{staffCount !== 1 ? 's' : ''}
                  </div>
                  {manager && <div>👤 Manager: <strong>{manager.name}</strong></div>}
                </div>

                {/* Storefront link */}
                {tenant && (
                  <a
                    href={`/store/${tenant.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex items-center gap-1.5 text-xs text-[#0D3B6E] font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Storefront
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Branch' : 'Edit Branch'} size="md">
        <div className="space-y-4">
          <div>
            <label className="form-label">Branch Name *</label>
            <input {...inp('name')} placeholder="e.g. East Legon Branch" />
          </div>
          <div>
            <label className="form-label">Address</label>
            <input {...inp('address')} placeholder="e.g. 12 Ring Road, Accra" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone</label>
              <input {...inp('phone')} placeholder="+233 XX XXX XXXX" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input {...inp('email')} placeholder="branch@email.com" />
            </div>
          </div>
          <div>
            <label className="form-label">Branch Manager</label>
            <select {...inp('manager_id')}>
              <option value="">Select manager (optional)</option>
              {users.filter(u => ['branch_manager','sales_staff'].includes(u.role)).map(u => (
                <option key={u.id} value={u.id}>{u.name} — {u.role.replace('_',' ')}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : modal === 'add' ? 'Create Branch' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => doDelete(confirm?.id)}
        title="Deactivate Branch"
        message={`Are you sure you want to deactivate "${confirm?.name}"?`}
        danger
      />
    </AppLayout>
  );
}
