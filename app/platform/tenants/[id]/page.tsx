'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner, toast } from '@/components/ui';
import { ArrowLeft, Building2, Users, GitBranch, Save } from 'lucide-react';
import api from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  trial:     'bg-yellow-100 text-yellow-700',
  expired:   'bg-red-100 text-red-700',
  suspended: 'bg-gray-100 text-gray-500',
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant]   = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({
    plan: 'starter',
    subscription_status: 'trial',
    subscription_expires_at: '',
    max_branches: 1,
    max_users: 5,
  });

  useEffect(() => {
    api.get(`/platform/tenants/${id}`).then(r => {
      const t = r.data.data;
      setTenant(t);
      setBranches(t.branches || []);
      setUsers(t.users || []);
      setForm({
        plan: t.plan,
        subscription_status: t.subscription_status,
        subscription_expires_at: t.subscription_expires_at ? new Date(t.subscription_expires_at).toISOString().split('T')[0] : '',
        max_branches: t.max_branches,
        max_users: t.max_users,
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/platform/tenants/${id}`, form);
      toast.success('Tenant updated successfully');
    } catch { toast.error('Failed to update tenant'); }
    finally { setSaving(false); }
  };

  const suspend = async () => {
    if (!confirm(`Suspend "${tenant?.business_name}"?`)) return;
    await api.patch(`/platform/tenants/${id}/suspend`);
    toast.success('Tenant suspended');
    router.push('/platform/tenants');
  };

  const activate = async () => {
    await api.patch(`/platform/tenants/${id}/activate`);
    toast.success('Tenant activated');
    router.refresh();
  };

  if (loading) return (
    <AppLayout title="Tenant Detail" allowedRoles={['platform_admin']}>
      <Spinner />
    </AppLayout>
  );

  if (!tenant) return (
    <AppLayout title="Tenant Detail" allowedRoles={['platform_admin']}>
      <div className="p-8 text-center text-gray-400">Tenant not found.</div>
    </AppLayout>
  );

  const days = tenant.subscription_expires_at
    ? Math.ceil((new Date(tenant.subscription_expires_at).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <AppLayout title={tenant.business_name} subtitle={`/${tenant.slug}`} allowedRoles={['platform_admin']}>

      {/* Back */}
      <button onClick={() => router.push('/platform/tenants')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Businesses
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — Tenant info + edit */}
        <div className="lg:col-span-2 space-y-5">

          {/* Status card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Subscription Settings</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[tenant.subscription_status]}`}>
                {tenant.subscription_status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Plan</label>
                <select className="form-input" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="form-label">Status</label>
                <select className="form-input" value={form.subscription_status} onChange={e => setForm({ ...form, subscription_status: e.target.value })}>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="form-label">Expires On</label>
                <input type="date" className="form-input" value={form.subscription_expires_at} onChange={e => setForm({ ...form, subscription_expires_at: e.target.value })} />
                {days !== null && (
                  <p className={`text-xs mt-1 ${days <= 0 ? 'text-red-500' : days <= 7 ? 'text-orange-500' : 'text-gray-400'}`}>
                    {days <= 0 ? 'Already expired' : `${days} days remaining`}
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">Max Branches</label>
                <input type="number" className="form-input" min={1} value={form.max_branches} onChange={e => setForm({ ...form, max_branches: parseInt(e.target.value) })} />
              </div>
              <div>
                <label className="form-label">Max Users</label>
                <input type="number" className="form-input" min={1} value={form.max_users} onChange={e => setForm({ ...form, max_users: parseInt(e.target.value) })} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {tenant.subscription_status !== 'suspended' ? (
                <button onClick={suspend} className="btn-danger">Suspend Tenant</button>
              ) : (
                <button onClick={activate} className="btn-primary bg-green-600 hover:bg-green-500">Activate Tenant</button>
              )}
            </div>
          </div>

          {/* Branches */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-gray-400" />
              <h2 className="font-bold text-gray-900">Branches ({branches.length})</h2>
            </div>
            {branches.length === 0 ? (
              <p className="text-sm text-gray-400">No branches yet.</p>
            ) : (
              <div className="space-y-2">
                {branches.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{b.name}</span>
                      {b.address && <span className="text-gray-400 ml-2 text-xs">{b.address}</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Users + info */}
        <div className="space-y-5">

          {/* Business info */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-gray-400" />
              <h2 className="font-bold text-gray-900">Business Info</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Name</span><span className="font-medium">{tenant.business_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Slug</span><span className="font-mono text-xs">{tenant.slug}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Email</span><span>{tenant.email}</span></div>
              {tenant.phone && <div className="flex justify-between"><span className="text-gray-400">Phone</span><span>{tenant.phone}</span></div>}
              <div className="flex justify-between"><span className="text-gray-400">Registered</span><span>{new Date(tenant.created_at).toLocaleDateString()}</span></div>
            </div>
            <a href={`/store/${tenant.slug}`} target="_blank" rel="noreferrer" className="mt-4 block text-xs text-blue-600 hover:underline">
              View Storefront →
            </a>
          </div>

          {/* Users */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="font-bold text-gray-900">Users ({users.length})</h2>
            </div>
            {users.length === 0 ? (
              <p className="text-sm text-gray-400">No users yet.</p>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 truncate">{u.name}</div>
                      <div className="text-xs text-gray-400 truncate">{u.role.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
