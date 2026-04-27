'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import { Plus, Umbrella, Banknote, User, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import api from '@/lib/api';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ESSPage() {
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

  const days = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / 86400000) + 1;
  };

  const pendingLeave  = leave.filter(l => l.status === 'pending').length;
  const approvedLeave = leave.filter(l => l.status === 'approved').length;
  const latestPayslip = payslips[0];

  return (
    <AppLayout title="My Portal" subtitle="View your profile, request leave and access payslips">
      {/* Tabs */}
      <div className="mb-5">
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <div className="flex min-w-max border-b border-gray-100">
            {([
              { t: 'overview', l: 'Overview',  icon: <User className="w-3.5 h-3.5" /> },
              { t: 'leave',    l: 'My Leave',  icon: <Umbrella className="w-3.5 h-3.5" /> },
              { t: 'payslips', l: 'Payslips',  icon: <Banknote className="w-3.5 h-3.5" /> },
            ] as const).map(item => (
              <button key={item.t} onClick={() => setTab(item.t)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === item.t ? 'text-blue-700 bg-blue-50/60' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                {item.icon}{item.l}
                {tab === item.t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-3">
          {tab === 'leave' && (
            <button className="btn-primary" onClick={() => { setForm({ leave_type:'annual', start_date:'', end_date:'', reason:'' }); setModal(true); }}>
              <Plus className="w-4 h-4" />Request Leave
            </button>
          )}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Overview */}
          {tab === 'overview' && (
            <div className="space-y-5">
              {!me ? (
                <div className="card text-center py-10">
                  <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No employee record linked to your account.</p>
                  <p className="text-gray-400 text-xs mt-1">Contact HR to link your account to an employee profile.</p>
                </div>
              ) : (
                <>
                  {/* Profile Card */}
                  <div className="card">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                        {me.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">{me.name}</h2>
                        <p className="text-gray-500 text-sm">{me.job_title || '—'}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                          <span>📧 {me.email || '—'}</span>
                          <span>📞 {me.phone || '—'}</span>
                          <span>🏢 {me.department_name || '—'}</span>
                          <span>🪪 {me.employee_code}</span>
                          {me.start_date && <span>📅 Joined {new Date(me.start_date).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</span>}
                        </div>
                      </div>
                      <Badge status={me.status} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Gross Salary" value={`GHS ${parseFloat(me.gross_salary||0).toLocaleString('en-GH', { minimumFractionDigits:2 })}`} icon={<Banknote className="w-6 h-6 text-green-600" />} color="bg-green-50" />
                    <StatCard label="Leave Requests" value={leave.length} icon={<Umbrella className="w-6 h-6 text-blue-600" />} color="bg-blue-50" />
                    <StatCard label="Pending Leave" value={pendingLeave} icon={<Clock className="w-6 h-6 text-yellow-600" />} color="bg-yellow-50" />
                    <StatCard label="Approved Leave" value={approvedLeave} icon={<CheckCircle className="w-6 h-6 text-purple-600" />} color="bg-purple-50" />
                  </div>

                  {/* Latest Payslip */}
                  {latestPayslip && (
                    <div className="card">
                      <h3 className="font-semibold text-gray-800 mb-3">Latest Payslip — {months[latestPayslip.month - 1]} {latestPayslip.year}</h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Gross Salary</div><div className="font-semibold">GHS {parseFloat(latestPayslip.gross_salary).toFixed(2)}</div></div>
                        <div className="bg-green-50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Allowances</div><div className="font-semibold text-green-700">+GHS {parseFloat(latestPayslip.allowances||0).toFixed(2)}</div></div>
                        <div className="bg-red-50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Deductions</div><div className="font-semibold text-red-600">-GHS {parseFloat(latestPayslip.deductions||0).toFixed(2)}</div></div>
                        <div className="bg-blue-50 rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">Net Pay</div><div className="font-bold text-blue-700">GHS {parseFloat(latestPayslip.net_salary).toFixed(2)}</div></div>
                      </div>
                      <div className="mt-2 flex justify-end"><Badge status={latestPayslip.status} /></div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Leave */}
          {tab === 'leave' && (
            <div className="card p-0 overflow-hidden">
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

          {/* Payslips */}
          {tab === 'payslips' && (
            <div className="card p-0 overflow-hidden">
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
