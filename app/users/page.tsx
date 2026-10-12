'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, ConfirmDialog, toast } from '@/components/ui';
import { Plus, Edit2, UserX, Shield, Trash2, Download } from 'lucide-react';
import api from '@/lib/api';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { PAGE_CATALOG, ACTION_GROUPS, pageKey, effectivePageKeys, buildPermissions } from '@/lib/pagePermissions';

// Pages grouped for the role builder (pages open to everyone are not offered).
const PAGE_GROUPS = Object.entries(
  PAGE_CATALOG.filter(p => !p.always).reduce<Record<string, typeof PAGE_CATALOG>>((acc, p) => { (acc[p.group] ||= []).push(p); return acc; }, {}),
).map(([group, pages]) => ({ group, perms: pages.map(p => ({ key: pageKey(p.href), label: p.label })) }));
const ACTION_BUILDER_GROUP = { group: 'Actions', title: 'Actions inside pages', perms: ACTION_GROUPS.flatMap(g => g.perms.map(p => ({ key: p.key, label: `${g.group}: ${p.label}` }))) };
const BUILDER_GROUPS = [...PAGE_GROUPS.map(g => ({ ...g, title: g.group })), ACTION_BUILDER_GROUP];
const ACTION_KEYS = ACTION_GROUPS.flatMap(g => g.perms.map(p => p.key));
/** A stored role (old or new) -> the keys the builder shows ticked. */
const toBuilder = (perms: string[]) => [...effectivePageKeys(perms), ...perms.filter(k => ACTION_KEYS.includes(k))];

// ── Preset role templates ─────────────────────────────────────────────────────
const ROLE_TEMPLATES = [
  {
    name: 'Sales Staff',
    permissions: ['dashboard.view', 'orders.view', 'orders.manage', 'pos.view', 'crm.view', 'crm.manage', 'ess.view'],
  },
  {
    name: 'Warehouse Staff',
    permissions: ['dashboard.view', 'inventory.view', 'inventory.manage', 'procurement.view', 'ess.view'],
  },
  {
    name: 'Accountant',
    permissions: ['dashboard.view', 'accounting.view', 'accounting.manage', 'reports.view', 'billing.view', 'ess.view'],
  },
  {
    name: 'HR Manager',
    permissions: ['dashboard.view', 'hr.view', 'hr.manage', 'hr.payroll', 'reports.view', 'ess.view'],
  },
  {
    name: 'Procurement Officer',
    permissions: ['dashboard.view', 'procurement.view', 'procurement.manage', 'inventory.view', 'ess.view'],
  },
  {
    name: 'Branch Manager',
    permissions: ['dashboard.view', 'orders.view', 'orders.manage', 'pos.view', 'inventory.view', 'inventory.manage', 'crm.view', 'reports.view', 'ess.view'],
  },
];

const SYSTEM_ROLES = [
  { value: 'business_owner',      label: 'Business Owner' },
  { value: 'branch_manager',      label: 'Branch Manager' },
  { value: 'sales_staff',         label: 'Sales Staff' },
  { value: 'warehouse_staff',     label: 'Warehouse Staff' },
  { value: 'accountant',          label: 'Accountant' },
  { value: 'hr_manager',          label: 'HR Manager' },
  { value: 'procurement_officer', label: 'Procurement Officer' },
  { value: 'employee',            label: 'Employee (Self-Service)' },
  { value: 'custom',              label: 'Custom Role' },
];

export default function UsersPage() {
  const [tab, setTab] = useState<'users' | 'roles'>('users');

  // ── Users state ──
  const [users, setUsers]           = useState<any[]>([]);
  const [branches, setBranches]     = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [userModal, setUserModal]   = useState<'add' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [confirmUser, setConfirmUser]   = useState<any>(null);
  const [userSaving, setUserSaving] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'custom', custom_role_id: '',
    branch_id: '', is_active: true, job_title: '', gross_salary: '', department_id: '', employee_id: '',
  });
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<any[]>([]);

  // ── Roles state ──
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleModal, setRoleModal]       = useState<'add' | 'edit' | 'import' | null>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [confirmRole, setConfirmRole]   = useState<any>(null);
  const [roleSaving, setRoleSaving]     = useState(false);
  const [openModules, setOpenModules]   = useState<Record<string, boolean>>({});
  const [roleForm, setRoleForm] = useState({ name: '', permissions: [] as string[] });

  // ── Load ──
  const load = async () => {
    setLoading(true);
    const [u, b, d, r] = await Promise.all([
      api.get('/users'),
      api.get('/branches'),
      api.get('/departments'),
      api.get('/roles'),
    ]);
    setUsers(u.data.data);
    setBranches(b.data.data);
    setDepartments(d.data.data);
    setCustomRoles(r.data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadRoles = async () => {
    setRolesLoading(true);
    const r = await api.get('/roles');
    setCustomRoles(r.data.data);
    setRolesLoading(false);
  };

  // ── User actions ──
  const openAddUser = () => {
    setUserForm({ name: '', email: '', password: '', role: 'sales_staff', custom_role_id: '', branch_id: '', is_active: true, job_title: '', gross_salary: '', department_id: '', employee_id: '' });
    api.get('/users/unlinked-employees').then(r => setUnlinkedEmployees(r.data.data || [])).catch(() => setUnlinkedEmployees([]));
    setUserModal('add');
  };
  // Picking an existing employee fills in their details; clearing it goes back to a brand-new person.
  const pickEmployee = (id: string) => {
    const emp = unlinkedEmployees.find(e => e.id === id);
    if (!emp) { setUserForm({ ...userForm, employee_id: '', name: '', email: '' }); return; }
    setUserForm({
      ...userForm, employee_id: id, name: emp.name, email: emp.email || '',
      branch_id: emp.branch_id?._id || emp.branch_id || userForm.branch_id,
    });
  };
  const openEditUser = (u: any) => {
    setSelectedUser(u);
    // If custom role, set role to the custom role ID so the dropdown selects it directly
    const roleValue = u.role === 'custom'
      ? (u.custom_role_id?.id || u.custom_role_id || '')
      : u.role;
    setUserForm({
      name: u.name, email: u.email, password: '', role: roleValue,
      custom_role_id: '',
      branch_id: u.branch_id?._id || u.branch_id || '',
      is_active: u.is_active, job_title: '', gross_salary: '', department_id: '', employee_id: '',
    });
    setUserModal('edit');
  };
  const saveUser = async () => {
    setUserSaving(true);
    try {
      // If the selected role value is a custom role ID (not a system role string), set role='custom'
      const systemRoleValues = SYSTEM_ROLES.filter(r => r.value !== 'custom').map(r => r.value);
      const isCustomRoleId = !systemRoleValues.includes(userForm.role);
      const payload = {
        ...userForm,
        role: isCustomRoleId ? 'custom' : userForm.role,
        custom_role_id: isCustomRoleId ? userForm.role : '',
      };
      if (userModal === 'add') await api.post('/users', payload);
      else await api.put(`/users/${selectedUser.id}`, payload);
      setUserModal(null);
      load();
      toast.success(userModal === 'add' ? 'User created' : 'User updated');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setUserSaving(false); }
  };
  const deactivateUser = async (id: string) => {
    await api.delete(`/users/${id}`);
    toast.success('User deactivated');
    load();
  };

  // ── Role actions ──
  const openAddRole = () => {
    setOpenModules({});
    setRoleForm({ name: '', permissions: [] });
    setRoleModal('add');
  };
  const openEditRole = (r: any) => {
    setOpenModules({});
    setSelectedRole(r);
    setRoleForm({ name: r.name, permissions: toBuilder(r.permissions || []) });
    setRoleModal('edit');
  };
  const importTemplate = (tpl: typeof ROLE_TEMPLATES[0]) => {
    setRoleForm({ name: tpl.name, permissions: toBuilder(tpl.permissions) });
    setRoleModal('add');
  };
  const saveRole = async () => {
    if (!roleForm.name.trim()) return toast.error('Role name is required');
    setRoleSaving(true);
    try {
      const body = {
        name: roleForm.name,
        permissions: buildPermissions(
          roleForm.permissions.filter(k => k.startsWith('page:')),
          roleForm.permissions.filter(k => ACTION_KEYS.includes(k)),
        ),
      };
      if (roleModal === 'edit' && selectedRole) {
        await api.put(`/roles/${selectedRole.id}`, body);
        toast.success('Role updated');
      } else {
        await api.post('/roles', body);
        toast.success('Role created');
      }
      setRoleModal(null);
      loadRoles();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setRoleSaving(false); }
  };
  const deleteRole = async (id: string) => {
    try {
      await api.delete(`/roles/${id}`);
      toast.success('Role deleted');
      loadRoles();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Cannot delete role'); }
  };

  const togglePerm = (key: string) => {
    setRoleForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }));
  };
  const toggleGroup = (keys: string[]) => {
    const allOn = keys.every(k => roleForm.permissions.includes(k));
    setRoleForm(f => ({
      ...f,
      permissions: allOn
        ? f.permissions.filter(p => !keys.includes(p))
        : [...new Set([...f.permissions, ...keys])],
    }));
  };

  const getRoleLabel = (u: any) => {
    if (u.role === 'custom') return u.custom_role_id?.name || 'Custom';
    return SYSTEM_ROLES.find(r => r.value === u.role)?.label || u.role;
  };

  return (
    <AppLayout title="User Management" subtitle="Manage users and custom roles" allowedRoles={['business_owner']}>

      {/* Tab bar */}
      <div className="tab-bar mb-5">
        <div className="tab-bar-inner">
          {([
            { key: 'users', label: 'Users', count: users.length },
            { key: 'roles', label: 'Custom Roles', count: customRoles.length },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`tab-btn ${tab === t.key ? 'tab-btn-active' : ''}`}>
              {tab === t.key && <span className="tab-indicator" />}
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-[#0D3B6E]/15 text-[#0D3B6E]' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <>
          <div className="flex justify-end mb-4">
            <button className="btn-primary" onClick={openAddUser}>
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : users.length === 0
              ? <EmptyState message="No users yet" icon={<Shield className="w-8 h-8 text-gray-300" />} />
              : (
                <ResponsiveTable
                  headers={['Name', 'Email', 'Role', 'Branch', 'Status', 'Joined', 'Actions']}
                  data={users}
                  renderRow={(u) => {
                    const branch = branches.find(b => b.id === (u.branch_id?._id || u.branch_id));
                    return [
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0D3B6E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </div>,
                      <span className="text-gray-500">{u.email}</span>,
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0D3B6E]/8 text-[#0D3B6E]">{getRoleLabel(u)}</span>,
                      <span className="text-gray-500 text-xs">{branch ? branch.name : <span className="text-gray-300">Company-wide</span>}</span>,
                      <Badge status={u.is_active ? 'active' : 'inactive'} />,
                      <span className="text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</span>,
                      <div className="flex gap-2">
                        <button onClick={() => openEditUser(u)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Edit2 className="w-4 h-4" /></button>
                        {u.is_active && <button onClick={() => setConfirmUser(u)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><UserX className="w-4 h-4" /></button>}
                      </div>,
                    ];
                  }}
                />
              )}
          </div>
        </>
      )}

      {/* ── ROLES TAB ── */}
      {tab === 'roles' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Define what each role can see and do.</p>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setRoleModal('import')}>
                <Download className="w-4 h-4" /> Import Template
              </button>
              <button className="btn-primary" onClick={openAddRole}>
                <Plus className="w-4 h-4" /> New Role
              </button>
            </div>
          </div>

          {rolesLoading ? <Spinner /> : customRoles.length === 0
            ? (
              <div className="card text-center py-16">
                <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-700 mb-1">No custom roles yet</p>
                <p className="text-sm text-gray-400 mb-5">Create a role or import one of our preset templates to get started.</p>
                <div className="flex gap-2 justify-center">
                  <button className="btn-secondary" onClick={() => setRoleModal('import')}><Download className="w-4 h-4" /> Import Template</button>
                  <button className="btn-primary" onClick={openAddRole}><Plus className="w-4 h-4" /> New Role</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {customRoles.map(role => {
                  const assignedCount = users.filter(u => u.custom_role_id?.id === role.id || u.custom_role_id === role.id).length;
                  return (
                    <div key={role.id} className="card flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#0D3B6E]/8 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-[#0D3B6E]" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{role.name}</div>
                            <div className="text-xs text-gray-400">{assignedCount} user{assignedCount !== 1 ? 's' : ''} assigned</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditRole(role)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setConfirmRole(role)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.length === 0
                          ? <span className="text-xs text-gray-400">No permissions assigned</span>
                          : role.permissions.map((p: string) => (
                            <span key={p} className="text-[11px] bg-[#0D3B6E]/8 text-[#0D3B6E] px-2 py-0.5 rounded-full font-medium">{p}</span>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </>
      )}

      {/* ── USER MODAL ── */}
      <Modal open={!!userModal} onClose={() => setUserModal(null)} title={userModal === 'add' ? 'Add User' : 'Edit User'} size="md">
        <div className="space-y-3">
          {userModal === 'add' && (
            <div>
              <label className="form-label">Existing Employee <span className="text-gray-400 font-normal">(optional)</span></label>
              <select className="form-input" value={userForm.employee_id} onChange={e => pickEmployee(e.target.value)}>
                <option value="">New person — enter details below</option>
                {unlinkedEmployees.map(e => <option key={e.id} value={e.id}>{e.name}{e.job_title ? ` — ${e.job_title}` : ''}{e.employee_code ? ` (${e.employee_code})` : ''}</option>)}
              </select>
              <p className="form-hint">Employees without a login. Choosing one links the new account to their record instead of creating a duplicate.</p>
            </div>
          )}
          <div><label className="form-label">Full Name *</label><input className="form-input" disabled={!!userForm.employee_id} value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} /></div>
          <div><label className="form-label">Email *</label><input type="email" className="form-input" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} /></div>
          {userModal === 'add' && <div><label className="form-label">Password *</label><input type="password" className="form-input" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder="Min 6 characters" /></div>}

          <div>
            <label className="form-label">Role *</label>
            <select className="form-input" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value, custom_role_id: '' })}>
              <optgroup label="System Roles">
                {SYSTEM_ROLES.filter(r => r.value !== 'custom').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </optgroup>
              {customRoles.length > 0 && (
                <optgroup label="Custom Roles">
                  {customRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </optgroup>
              )}
            </select>
            {userModal === 'edit' && (
              <p className="form-hint">A new role takes effect straight away — their menu updates the next time they open or return to the app.</p>
            )}
            {customRoles.length === 0 && (
              <p className="form-hint">No custom roles yet — <button type="button" className="text-[#0D3B6E] hover:underline" onClick={() => { setUserModal(null); setTab('roles'); }}>create one in the Roles tab</button>.</p>
            )}
          </div>

          <div>
            <label className="form-label">Branch <span className="text-gray-400 font-normal">(leave blank for company-wide)</span></label>
            <select className="form-input" value={userForm.branch_id} onChange={e => setUserForm({ ...userForm, branch_id: e.target.value })}>
              <option value="">Company-wide</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {userModal === 'add' && !userForm.employee_id && (
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee Details</p>
              <div><label className="form-label">Job Title</label><input className="form-input" placeholder="e.g. Sales Executive" value={userForm.job_title} onChange={e => setUserForm({ ...userForm, job_title: e.target.value })} /></div>
              <div>
                <label className="form-label">Department</label>
                <select className="form-input" value={userForm.department_id} onChange={e => setUserForm({ ...userForm, department_id: e.target.value })}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div><label className="form-label">Gross Salary (GH₵)</label><input type="number" className="form-input" placeholder="0.00" value={userForm.gross_salary} onChange={e => setUserForm({ ...userForm, gross_salary: e.target.value })} /></div>
            </div>
          )}

          {userModal === 'edit' && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_active" checked={userForm.is_active} onChange={e => setUserForm({ ...userForm, is_active: e.target.checked })} className="w-4 h-4 text-[#0D3B6E]" />
              <label htmlFor="is_active" className="text-sm text-gray-700">Account Active</label>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setUserModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveUser} disabled={userSaving}>{userSaving ? 'Saving…' : 'Save User'}</button>
        </div>
      </Modal>

      {/* ── ROLE BUILDER MODAL ── */}
      <Modal open={roleModal === 'add' || roleModal === 'edit'} onClose={() => setRoleModal(null)} title={roleModal === 'edit' ? `Edit Role — ${selectedRole?.name}` : 'New Custom Role'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="form-label">Role Name *</label>
            <input className="form-input" placeholder="e.g. Store Manager" value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} />
          </div>

          <div>
            <label className="form-label mb-1">Modules &amp; pages</label>
            <p className="text-xs text-gray-400 mb-3">Tick a module to give access to all of its pages, then untick any page you want to leave out. Open a module to see its pages.</p>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {BUILDER_GROUPS.map(group => {
                const keys = group.perms.map(p => p.key);
                const onCount = keys.filter(k => roleForm.permissions.includes(k)).length;
                const allOn = onCount === keys.length;
                const someOn = onCount > 0 && !allOn;
                const isOpen = openModules[group.group] ?? someOn;
                return (
                  <div key={group.group} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-[#0D3B6E] rounded"
                        checked={allOn}
                        ref={el => { if (el) el.indeterminate = someOn; }}
                        onChange={() => toggleGroup(keys)}
                        aria-label={`Select all of ${group.title}`}
                      />
                      <button type="button" onClick={() => setOpenModules(m => ({ ...m, [group.group]: !isOpen }))} className="flex-1 flex items-center justify-between text-left">
                        <span className="text-sm font-semibold text-gray-700">{group.title}</span>
                        <span className="flex items-center gap-2 text-xs text-gray-400">
                          {onCount} of {keys.length}
                          <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                        </span>
                      </button>
                    </div>
                    {isOpen && (
                      <div className="px-4 py-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.perms.map(perm => (
                          <label key={perm.key} className="flex items-center gap-2.5 cursor-pointer py-1">
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(perm.key)}
                              onChange={() => togglePerm(perm.key)}
                              className="w-4 h-4 text-[#0D3B6E] rounded"
                            />
                            <span className="text-sm text-gray-600">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-gray-400 pt-1">
            {roleForm.permissions.length} item{roleForm.permissions.length !== 1 ? 's' : ''} selected
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setRoleModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveRole} disabled={roleSaving}>{roleSaving ? 'Saving…' : roleModal === 'edit' ? 'Update Role' : 'Create Role'}</button>
        </div>
      </Modal>

      {/* ── IMPORT TEMPLATE MODAL ── */}
      <Modal open={roleModal === 'import'} onClose={() => setRoleModal(null)} title="Import Role Template" size="md">
        <p className="text-sm text-gray-500 mb-4">Choose a preset template. You can rename it and adjust permissions after importing.</p>
        <div className="space-y-2">
          {ROLE_TEMPLATES.map(tpl => {
            const alreadyImported = customRoles.some(r => r.name.toLowerCase() === tpl.name.toLowerCase());
            return (
              <button
                key={tpl.name}
                onClick={() => { if (!alreadyImported) { setRoleModal(null); importTemplate(tpl); } }}
                className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl border transition-all group ${
                  alreadyImported
                    ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                    : 'border-gray-200 hover:border-[#0D3B6E]/40 hover:bg-[#0D3B6E]/5 cursor-pointer'
                }`}
              >
                <div>
                  <div className={`font-semibold ${alreadyImported ? 'text-gray-400' : 'text-gray-800 group-hover:text-[#0D3B6E]'}`}>{tpl.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{tpl.permissions.length} permissions</div>
                </div>
                {alreadyImported
                  ? <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full font-medium">Already imported</span>
                  : <span className="text-xs text-[#0D3B6E] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Use this →</span>
                }
              </button>
            );
          })}
        </div>
        <div className="flex justify-end mt-5">
          <button className="btn-secondary" onClick={() => setRoleModal(null)}>Cancel</button>
        </div>
      </Modal>

      {/* ── CONFIRM DIALOGS ── */}
      <ConfirmDialog
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        onConfirm={() => deactivateUser(confirmUser?.id)}
        title="Deactivate User"
        message={`Deactivate ${confirmUser?.name}? They will lose access immediately.`}
        danger
      />
      <ConfirmDialog
        open={!!confirmRole}
        onClose={() => setConfirmRole(null)}
        onConfirm={() => deleteRole(confirmRole?.id)}
        title="Delete Role"
        message={`Delete "${confirmRole?.name}"? This cannot be undone.`}
        danger
      />
    </AppLayout>
  );
}
