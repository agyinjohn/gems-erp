'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, EmptyState, Spinner, toast } from '@/components/ui';
import { Plus, Edit2, Users } from 'lucide-react';
import api from '@/lib/api';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [d, e] = await Promise.all([
        api.get('/departments').catch(() => ({ data: { data: [] } })),
        api.get('/employees').catch(() => ({ data: { data: [] } })),
      ]);
      setDepartments(d.data.data);
      setEmployees(e.data.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const headcount = (deptName: string) => employees.filter(e => e.department_name === deptName).length;

  const openAdd = () => { setForm({ name: '', description: '' }); setModal('add'); };
  const openEdit = (d: any) => { setSelected(d); setForm({ name: d.name, description: d.description || '' }); setModal('edit'); };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') await api.post('/departments', form);
      else await api.put(`/departments/${selected.id}`, form);
      toast.success(modal === 'add' ? 'Department created' : 'Department updated');
      setModal(null); load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error saving department'); }
    finally { setSaving(false); }
  };

  return (
    <AppLayout title="Departments" subtitle="Manage company departments and headcount" allowedRoles={['business_owner','hr_manager']}>
      <div className="flex justify-end mb-5">
        <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Department</button>
      </div>

      {loading ? <Spinner /> : departments.length === 0 ? <EmptyState message="No departments yet" icon="🏢" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(d => (
            <div key={d.id} className="card flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{d.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{d.description || '—'}</div>
                  <div className="text-xs text-blue-600 font-medium mt-2">{headcount(d.name)} employee{headcount(d.name) !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Department' : 'Edit Department'} size="sm">
        <div className="space-y-3">
          <div><label className="form-label">Department Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering" /></div>
          <div><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>
    </AppLayout>
  );
}
