'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, toast } from '@/components/ui';
import { Plus, Umbrella, Banknote, User, CheckCircle, Clock, XCircle, Mail, Phone, Building2, Hash, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ESSPage() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';

  const [tab, setTab] = useState<'overview'|'leave'|'payslips'>('overview');
  const [me, setMe] = useState<any>(null);
  const [leave, setLeave] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [m, l, p] = await Promise.all([
        api.get('/ess/me').catch(() => ({ data: { data: null } })),
        api.get('/ess/leave-requests').catch(() => ({ data: { data: [] } })),
        api.get('/ess/payslips').catch(() => ({ data: { data: [] } })),
      ]);
      setMe(m.data.data);
      setLeave(l.data.data);
      setPayslips(p.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitLeave = async () => {
    if (!form.start_date || !form.end_date) { toast.error('Please select start and end dates'); return; }
    if (new Date(form.end_date) < new Date(form.start_date)) { toast.error('End date cannot be before start date'); return; }
    setSaving(true);
    try {
      await api.post('/ess/leave-requests', form);
      toast.success('Leave request submitted successfully');
      setModal(false);
      setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
      load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Failed to submit leave request'); }
    finally { setSaving(false); }
  };

  const days = (start: string, end: string) => Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;

  const pendingLeave  = leave.filter(l => l.status === 'pending').length;
  const approvedLeave = leave.filter(l => l.status === 'approved').length;
  const latestPayslip = payslips[0];
  const totalEarned   = payslips.filter(p => p.status === 'approved').reduce((s, p) => s + parseFloat(p.net_salary || 0), 0);

  const tabs = [
    { t: 'overview', l: 'Overview', icon: <User className="w-3.5 h-3.5" /> },
    ...(!isEmployee ? [
      { t: 'leave',    l: 'My Leave',  icon: <Umbrella className="w-3.5 h-3.5" /> },
      { t: 'payslips', l: 'Payslips',  icon: <Banknote className="w-3.5 h-3.5" /> },
    ] : []),
  ] as { t: 'overview'|'leave'|'payslips'; l: string; icon: React.ReactNode }[];

  return (
    <AppLayout title="My Portal" subtitle="Your personal workspace" allowedRoles={['business_owner','branch_manager','sales_staff','warehouse_staff','accountant','hr_manager','procurement_officer','employee']}>

      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <div className="flex min-w-max border-b border-gray-100">
            {tabs.map(item => (
              <button key={item.t} onClick={() => setTab(item.t)}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === item.t ? 'text-blue-700 bg-blue-50/60' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                {item.icon}{item.l}
                {tab === item.t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
              </button>
            ))}
          </div>
        </div>
        {tab === 'leave' && (
          <div className="flex justify-end mt-3">
            <button className="btn-primary" onClick={() => { setForm({ leave_type:'annual', start_date:'', end_date:'', reason:'' }); setModal(true); }}>
              <Plus className="w-4 h-4" />Request Leave
            </button>
          </div>
        )}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {!me ? (
                <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-600 font-medium">No employee record linked</p>
                  <p className="text-gray-400 text-sm mt-1">Contact HR to link your account to an employee profile.</p>
                </div>
              ) : (
                <>
                  {/* Hero profile banner */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-2xl bg-[#0D3B6E] flex items-center justify-center text-white text-3xl font-extrabold flex-shrink-0">
                        {me.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-2xl font-extrabold text-gray-900">{me.name}</h2>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${me.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {me.status}
                          </span>
                        </div>
                        <p className="text-gray-500 mt-0.5">{me.job_title || '—'} {me.department_name ? `· ${me.department_name}` : ''}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1.5"><Hash className="w-3 h-3" />{me.employee_code}</span>
                          {me.start_date && <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />Joined {new Date(me.start_date).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info + Stats grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Contact info */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Email</div>
                            <div className="text-sm font-medium text-gray-800 truncate">{me.email || '—'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Phone className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Phone</div>
                            <div className="text-sm font-medium text-gray-800">{me.phone || '—'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Department</div>
                            <div className="text-sm font-medium text-gray-800">{me.department_name || '—'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats — hidden for employee role */}
                    {!isEmployee && (
                      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-3">
                            <Banknote className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="text-xs text-gray-400 mb-0.5">Gross Salary</div>
                          <div className="text-lg font-extrabold text-gray-900">GHS {parseFloat(me.gross_salary||0).toLocaleString('en-GH', { minimumFractionDigits:2 })}</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-xs text-gray-400 mb-0.5">Total Earned</div>
                          <div className="text-lg font-extrabold text-gray-900">GHS {totalEarned.toLocaleString('en-GH', { minimumFractionDigits:2 })}</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                          <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center mb-3">
                            <Clock className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div className="text-xs text-gray-400 mb-0.5">Pending Leave</div>
                          <div className="text-lg font-extrabold text-gray-900">{pendingLeave}</div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                          <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="text-xs text-gray-400 mb-0.5">Approved Leave</div>
                          <div className="text-lg font-extrabold text-gray-900">{approvedLeave}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Latest payslip + recent leave — staff only */}
                  {!isEmployee && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                      {/* Latest payslip */}
                      <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-700">Latest Payslip</h3>
                          {latestPayslip && <Badge status={latestPayslip.status} />}
                        </div>
                        {!latestPayslip ? (
                          <div className="text-center py-6">
                            <Banknote className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">No payslips yet</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-gray-400 mb-4">{months[latestPayslip.month - 1]} {latestPayslip.year}</p>
                            <div className="space-y-2">
                              {[
                                { label: 'Gross Salary',  value: `GHS ${parseFloat(latestPayslip.gross_salary).toFixed(2)}`,        color: 'text-gray-800' },
                                { label: 'Allowances',    value: `+ GHS ${parseFloat(latestPayslip.allowances||0).toFixed(2)}`,     color: 'text-green-600' },
                                { label: 'Deductions',    value: `- GHS ${parseFloat(latestPayslip.deductions||0).toFixed(2)}`,     color: 'text-red-500' },
                              ].map(row => (
                                <div key={row.label} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                                  <span className="text-gray-500">{row.label}</span>
                                  <span className={`font-medium ${row.color}`}>{row.value}</span>
                                </div>
                              ))}
                              <div className="flex justify-between text-sm pt-2">
                                <span className="font-bold text-gray-800">Net Pay</span>
                                <span className="font-extrabold text-blue-700 text-base">GHS {parseFloat(latestPayslip.net_salary).toFixed(2)}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Recent leave */}
                      <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-700">Recent Leave</h3>
                          <button onClick={() => setTab('leave')} className="text-xs text-blue-600 hover:underline">View all</button>
                        </div>
                        {leave.length === 0 ? (
                          <div className="text-center py-6">
                            <Umbrella className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">No leave requests yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {leave.slice(0, 4).map(l => (
                              <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div>
                                  <div className="text-sm font-medium text-gray-800 capitalize">{l.leave_type} leave</div>
                                  <div className="text-xs text-gray-400">{new Date(l.start_date).toLocaleDateString()} · {days(l.start_date, l.end_date)} day{days(l.start_date, l.end_date) !== 1 ? 's' : ''}</div>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  l.status === 'approved' ? 'bg-green-100 text-green-700' :
                                  l.status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-600'
                                }`}>{l.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── LEAVE ── staff only */}
          {!isEmployee && tab === 'leave' && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {leave.length === 0 ? <EmptyState message="No leave requests yet" icon={<Umbrella className="w-8 h-8 text-gray-300" />} /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="table-header">
                      <tr>{['Type','From','To','Days','Reason','Status'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {leave.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 capitalize font-medium">{l.leave_type}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(l.start_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(l.end_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-semibold text-blue-700">{days(l.start_date, l.end_date)}d</td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.reason || '—'}</td>
                          <td className="px-4 py-3"><Badge status={l.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── PAYSLIPS ── staff only */}
          {!isEmployee && tab === 'payslips' && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {payslips.length === 0 ? <EmptyState message="No payslips available yet" icon={<Banknote className="w-8 h-8 text-gray-300" />} /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="table-header">
                      <tr>{['Period','Gross','Allowances','Deductions','Net Pay','Status'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {payslips.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{months[p.month - 1]} {p.year}</td>
                          <td className="px-4 py-3">GHS {parseFloat(p.gross_salary).toFixed(2)}</td>
                          <td className="px-4 py-3 text-green-600">+GHS {parseFloat(p.allowances||0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-red-600">-GHS {parseFloat(p.deductions||0).toFixed(2)}</td>
                          <td className="px-4 py-3 font-bold text-blue-700">GHS {parseFloat(p.net_salary).toFixed(2)}</td>
                          <td className="px-4 py-3"><Badge status={p.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Leave Request Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Request Leave" size="md">
        <div className="space-y-4">
          <div>
            <label className="form-label">Leave Type</label>
            <select className="form-input" value={form.leave_type} onChange={e => setForm({...form, leave_type: e.target.value})}>
              {['annual','sick','maternity','paternity','unpaid','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Start Date *</label>
              <input type="date" className="form-input" value={form.start_date} min={new Date().toISOString().split('T')[0]} onChange={e => setForm({...form, start_date: e.target.value})} />
            </div>
            <div>
              <label className="form-label">End Date *</label>
              <input type="date" className="form-input" value={form.end_date} min={form.start_date || new Date().toISOString().split('T')[0]} onChange={e => setForm({...form, end_date: e.target.value})} />
            </div>
          </div>
          {form.start_date && form.end_date && new Date(form.end_date) >= new Date(form.start_date) && (
            <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700 font-medium">
              {days(form.start_date, form.end_date)} day{days(form.start_date, form.end_date) !== 1 ? 's' : ''} requested
            </div>
          )}
          <div>
            <label className="form-label">Reason</label>
            <textarea className="form-input" rows={3} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Optional — briefly describe the reason for your leave" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={submitLeave} disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
        </div>
      </Modal>
    </AppLayout>
  );
}
