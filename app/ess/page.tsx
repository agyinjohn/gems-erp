'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, toast } from '@/components/ui';
import { Plus, Umbrella, Banknote, User, CheckCircle, Clock, Mail, Phone, Building2, Hash, Calendar, TrendingUp, CalendarDays, Printer } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const days = (start: string, end: string) => Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;

const ALL_ROLES = ['business_owner','branch_manager','sales_staff','warehouse_staff','accountant','hr_manager','procurement_officer','employee'];

export default function ESSPage() {
  const { user } = useAuth();

  const [tab, setTab] = useState<'overview'|'leave'|'payslips'|'attendance'>('overview');
  const [me, setMe]               = useState<any>(null);
  const [leave, setLeave]         = useState<any[]>([]);
  const [payslips, setPayslips]   = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [leaveModal, setLeaveModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ leave_type:'annual', start_date:'', end_date:'', reason:'' });

  // Payslip picker state
  const now = new Date();
  const [slipMonth, setSlipMonth] = useState(String(now.getMonth() + 1));
  const [slipYear,  setSlipYear]  = useState(String(now.getFullYear()));
  const [slipLoading, setSlipLoading] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [slipNotFound, setSlipNotFound] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [m, l, a] = await Promise.all([
        api.get('/ess/me').catch(() => ({ data: { data: null } })),
        api.get('/ess/leave-requests').catch(() => ({ data: { data: [] } })),
        api.get('/ess/attendance').catch(() => ({ data: { data: [] } })),
      ]);
      setMe(m.data.data);
      setLeave(l.data.data);
      setAttendance(a.data.data);
      // Load latest payslip for overview
      const p = await api.get(`/ess/payslips?month=${now.getMonth()+1}&year=${now.getFullYear()}`).catch(() => ({ data: { data: [] } }));
      setPayslips(p.data.data);
    } finally { setLoading(false); }
  };

  const fetchPayslip = async () => {
    setSlipLoading(true);
    setSelectedSlip(null);
    setSlipNotFound(false);
    try {
      const res = await api.get(`/ess/payslips?month=${slipMonth}&year=${slipYear}`);
      const data = res.data.data;
      if (data.length > 0) setSelectedSlip(data[0]);
      else setSlipNotFound(true);
    } catch { setSlipNotFound(true); }
    finally { setSlipLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitLeave = async () => {
    if (!form.start_date || !form.end_date) { toast.error('Please select start and end dates'); return; }
    if (new Date(form.end_date) < new Date(form.start_date)) { toast.error('End date cannot be before start date'); return; }
    setSaving(true);
    try {
      await api.post('/ess/leave-requests', form);
      toast.success('Leave request submitted');
      setLeaveModal(false);
      setForm({ leave_type:'annual', start_date:'', end_date:'', reason:'' });
      load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Failed to submit'); }
    finally { setSaving(false); }
  };

  const cancelLeave = async (id: string) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await api.patch(`/ess/leave-requests/${id}/cancel`);
      toast.success('Leave request cancelled');
      load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const printPayslip = (p: any) => {
    const win = window.open('', '_blank', 'width=700,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Payslip — ${months[p.month-1]} ${p.year}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; font-size: 13px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .sub { color: #666; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        td { padding: 10px 12px; border-bottom: 1px solid #eee; }
        .label { color: #666; }
        .amount { text-align: right; font-weight: 600; }
        .net { font-size: 16px; font-weight: 800; color: #0D3B6E; }
        .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; }
      </style></head><body>
      <h1>GEMS — Payslip</h1>
      <div class="sub">${months[p.month-1]} ${p.year} &nbsp;·&nbsp; ${me?.name || ''} &nbsp;·&nbsp; ${me?.employee_code || ''}</div>
      <table>
        <tr><td class="label">Gross Salary</td><td class="amount">GH₵ ${parseFloat(p.gross_salary).toFixed(2)}</td></tr>
        <tr><td class="label">Allowances</td><td class="amount" style="color:#16a34a">+ GH₵ ${parseFloat(p.allowances||0).toFixed(2)}</td></tr>
        <tr><td class="label">PAYE</td><td class="amount" style="color:#dc2626">- GH₵ ${parseFloat(p.paye||0).toFixed(2)}</td></tr>
        <tr><td class="label">SSNIT (5.5%)</td><td class="amount" style="color:#dc2626">- GH₵ ${parseFloat(p.ssnit_employee||0).toFixed(2)}</td></tr>
        <tr><td class="label">Other deductions</td><td class="amount" style="color:#dc2626">- GH₵ ${Math.max(0, parseFloat(p.deductions||0) - parseFloat(p.paye||0) - parseFloat(p.ssnit_employee||0)).toFixed(2)}</td></tr>
        <tr><td class="label net">Net Pay</td><td class="amount net">GH₵ ${parseFloat(p.net_salary).toFixed(2)}</td></tr>
      </table>
      <div class="footer">Generated by GEMS &middot; ${new Date().toLocaleDateString()}</div>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const pendingLeave  = leave.filter(l => l.status === 'pending').length;
  const approvedLeave = leave.filter(l => l.status === 'approved').length;
  const latestPayslip = payslips[0];

  // Attendance stats for last 30 days
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const absentDays  = attendance.filter(a => a.status === 'absent').length;
  const halfDays    = attendance.filter(a => a.status === 'half_day').length;

  const statusColor: Record<string,string> = {
    present:  'bg-green-100 text-green-700',
    absent:   'bg-red-100 text-red-700',
    half_day: 'bg-yellow-100 text-yellow-700',
    leave:    'bg-blue-100 text-blue-700',
  };

  return (
    <AppLayout title="My Portal" subtitle="Your personal workspace" allowedRoles={ALL_ROLES}>

      {/* Tab bar */}
      <div className="mb-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <div className="flex min-w-max border-b border-gray-100">
            {([
              { t:'overview',   l:'Overview',   icon:<User className="w-3.5 h-3.5"/> },
              { t:'leave',      l:'My Leave',   icon:<Umbrella className="w-3.5 h-3.5"/> },
              { t:'payslips',   l:'Payslips',   icon:<Banknote className="w-3.5 h-3.5"/> },
              { t:'attendance', l:'Attendance', icon:<CalendarDays className="w-3.5 h-3.5"/> },
            ] as const).map(item => (
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
            <button className="btn-primary" onClick={() => { setForm({ leave_type:'annual', start_date:'', end_date:'', reason:'' }); setLeaveModal(true); }}>
              <Plus className="w-4 h-4" />Request Leave
            </button>
          </div>
        )}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              {!me ? (
                <div className="card text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-600 font-medium">No employee record linked</p>
                  <p className="text-gray-400 text-sm mt-1">Contact HR to link your account to an employee profile.</p>
                </div>
              ) : (
                <>
                  {/* Profile banner */}
                  <div className="card">
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
                        <p className="text-gray-500 mt-0.5">{me.job_title || '—'}{me.department_name ? ` · ${me.department_name}` : ''}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1.5"><Hash className="w-3 h-3"/>{me.employee_code}</span>
                          {me.start_date && <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3"/>Joined {new Date(me.start_date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="card bg-green-50">
                      <div className="text-xs text-gray-500 mb-1">Gross Salary</div>
                      <div className="text-xl font-extrabold text-gray-900">GH₵ {parseFloat(me.gross_salary||0).toLocaleString('en-GH',{minimumFractionDigits:2})}</div>
                    </div>
                    <div className="card bg-blue-50">
                      <div className="text-xs text-gray-500 mb-1">Latest Net Pay</div>
                      <div className="text-xl font-extrabold text-gray-900">{latestPayslip ? `GH₵ ${parseFloat(latestPayslip.net_salary).toFixed(2)}` : '—'}</div>
                    </div>
                    <div className="card bg-yellow-50">
                      <div className="text-xs text-gray-500 mb-1">Annual leave left</div>
                      <div className="text-xl font-extrabold text-gray-900">{me.leave_balance?.annual_remaining ?? '—'} days</div>
                    </div>
                    <div className="card bg-purple-50">
                      <div className="text-xs text-gray-500 mb-1">Sick leave left</div>
                      <div className="text-xl font-extrabold text-gray-900">{me.leave_balance?.sick_remaining ?? '—'} days</div>
                    </div>
                  </div>

                  {/* Contact + Latest payslip + Recent leave */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Contact */}
                    <div className="card">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        {[
                          { icon:<Mail className="w-4 h-4 text-blue-600"/>,   bg:'bg-blue-50',   label:'Email',      val: me.email },
                          { icon:<Phone className="w-4 h-4 text-green-600"/>, bg:'bg-green-50',  label:'Phone',      val: me.phone },
                          { icon:<Building2 className="w-4 h-4 text-purple-600"/>, bg:'bg-purple-50', label:'Department', val: me.department_name },
                        ].map(row => (
                          <div key={row.label} className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${row.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>{row.icon}</div>
                            <div>
                              <div className="text-xs text-gray-400">{row.label}</div>
                              <div className="text-sm font-medium text-gray-800 truncate">{row.val || '—'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Latest payslip */}
                    <div className="card">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Latest Payslip</h3>
                        {latestPayslip && <Badge status={latestPayslip.status} />}
                      </div>
                      {!latestPayslip ? (
                        <div className="text-center py-6"><Banknote className="w-8 h-8 text-gray-200 mx-auto mb-2"/><p className="text-gray-400 text-sm">No payslips yet</p></div>
                      ) : (
                        <>
                          <p className="text-xs text-gray-400 mb-3">{months[latestPayslip.month-1]} {latestPayslip.year}</p>
                          <div className="space-y-2">
                            {[
                              { label:'Gross Salary', val:`GH₵ ${parseFloat(latestPayslip.gross_salary).toFixed(2)}`,    color:'text-gray-800' },
                              { label:'Allowances',   val:`+ GH₵ ${parseFloat(latestPayslip.allowances||0).toFixed(2)}`, color:'text-green-600' },
                              { label:'PAYE',         val:`- GH₵ ${parseFloat(latestPayslip.paye||0).toFixed(2)}`,         color:'text-red-500' },
                              { label:'SSNIT',        val:`- GH₵ ${parseFloat(latestPayslip.ssnit_employee||0).toFixed(2)}`, color:'text-red-500' },
                            ].map(row => (
                              <div key={row.label} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                                <span className="text-gray-500">{row.label}</span>
                                <span className={`font-medium ${row.color}`}>{row.val}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm pt-2">
                              <span className="font-bold text-gray-800">Net Pay</span>
                              <span className="font-extrabold text-blue-700 text-base">GH₵ {parseFloat(latestPayslip.net_salary).toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Recent leave */}
                    <div className="card">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Recent Leave</h3>
                        <button onClick={() => setTab('leave')} className="text-xs text-blue-600 hover:underline">View all</button>
                      </div>
                      {leave.length === 0 ? (
                        <div className="text-center py-6"><Umbrella className="w-8 h-8 text-gray-200 mx-auto mb-2"/><p className="text-gray-400 text-sm">No leave requests yet</p></div>
                      ) : (
                        <div className="space-y-2">
                          {leave.slice(0,4).map(l => (
                            <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                              <div>
                                <div className="text-sm font-medium text-gray-800 capitalize">{l.leave_type} leave</div>
                                <div className="text-xs text-gray-400">{new Date(l.start_date).toLocaleDateString()} · {days(l.start_date, l.end_date)}d</div>
                              </div>
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                l.status==='approved' ? 'bg-green-100 text-green-700' :
                                l.status==='pending'  ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-600'
                              }`}>{l.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attendance summary */}
                  {attendance.length > 0 && (
                    <div className="card">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Attendance — Last 30 Days</h3>
                        <button onClick={() => setTab('attendance')} className="text-xs text-blue-600 hover:underline">Full history</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="text-center"><div className="text-2xl font-bold text-green-600">{presentDays}</div><div className="text-xs text-gray-500">Present</div></div>
                        <div className="text-center"><div className="text-2xl font-bold text-yellow-600">{halfDays}</div><div className="text-xs text-gray-500">Half Day</div></div>
                        <div className="text-center"><div className="text-2xl font-bold text-red-500">{absentDays}</div><div className="text-xs text-gray-500">Absent</div></div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── LEAVE ── */}
          {tab === 'leave' && (
            <div className="card p-0 overflow-hidden">
              {leave.length === 0 ? <EmptyState message="No leave requests yet" icon={<Umbrella className="w-8 h-8 text-gray-300"/>} /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="table-header">
                      <tr>{['Type','From','To','Days','Reason','Status',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
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
                          <td className="px-4 py-3">
                            {l.status === 'pending' && (
                              <button onClick={() => cancelLeave(l.id)} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded">Cancel</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── PAYSLIPS ── */}
          {tab === 'payslips' && (
            <div className="space-y-4">
              {/* Picker */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">Select Period</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="form-label">Month</label>
                    <select className="form-input" value={slipMonth} onChange={e => { setSlipMonth(e.target.value); setSelectedSlip(null); setSlipNotFound(false); }}>
                      {months.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Year</label>
                    <select className="form-input" value={slipYear} onChange={e => { setSlipYear(e.target.value); setSelectedSlip(null); setSlipNotFound(false); }}>
                      {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-primary" onClick={fetchPayslip} disabled={slipLoading}>
                    {slipLoading ? 'Loading…' : 'View Payslip'}
                  </button>
                </div>
              </div>

              {/* Result */}
              {slipNotFound && (
                <div className="card text-center py-10">
                  <Banknote className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
                  <p className="text-gray-500 font-medium">No payslip found for {months[parseInt(slipMonth)-1]} {slipYear}</p>
                  <p className="text-gray-400 text-sm mt-1">Contact HR if you believe this is an error.</p>
                </div>
              )}

              {selectedSlip && (
                <div className="card">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{months[selectedSlip.month-1]} {selectedSlip.year}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{me?.name} · {me?.employee_code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={selectedSlip.status} />
                      <button onClick={() => printPayslip(selectedSlip)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Print">
                        <Printer className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    {[
                      { label:'Gross Salary',  value: `GH₵ ${parseFloat(selectedSlip.gross_salary).toFixed(2)}`,    color:'text-gray-800',  bg:'' },
                      { label:'Allowances',    value: `+ GH₵ ${parseFloat(selectedSlip.allowances||0).toFixed(2)}`, color:'text-green-600', bg:'bg-green-50/40' },
                      { label:'PAYE',          value: `- GH₵ ${parseFloat(selectedSlip.paye||0).toFixed(2)}`,         color:'text-red-600',   bg:'bg-red-50/40' },
                      { label:'SSNIT',         value: `- GH₵ ${parseFloat(selectedSlip.ssnit_employee||0).toFixed(2)}`, color:'text-red-600', bg:'bg-red-50/40' },
                    ].map(row => (
                      <div key={row.label} className={`flex justify-between items-center px-5 py-3.5 border-b border-gray-100 ${row.bg}`}>
                        <span className="text-sm text-gray-600">{row.label}</span>
                        <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center px-5 py-4 bg-blue-50">
                      <span className="font-bold text-gray-900">Net Pay</span>
                      <span className="text-xl font-extrabold text-blue-700">GH₵ {parseFloat(selectedSlip.net_salary).toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 text-center mt-4">This payslip was generated by GEMS. For queries contact HR.</p>
                </div>
              )}
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab === 'attendance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card bg-green-50 text-center"><div className="text-2xl font-bold text-green-600">{presentDays}</div><div className="text-sm text-gray-500">Present</div></div>
                <div className="card bg-yellow-50 text-center"><div className="text-2xl font-bold text-yellow-600">{halfDays}</div><div className="text-sm text-gray-500">Half Day</div></div>
                <div className="card bg-red-50 text-center"><div className="text-2xl font-bold text-red-500">{absentDays}</div><div className="text-sm text-gray-500">Absent</div></div>
              </div>
              <div className="card p-0 overflow-hidden">
                {attendance.length === 0 ? <EmptyState message="No attendance records yet" icon={<CalendarDays className="w-8 h-8 text-gray-300"/>} /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="table-header">
                        <tr>{['Date','Day','Status','Notes'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {attendance.map((a: any) => {
                          const d = new Date(a.date);
                          return (
                            <tr key={a.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</td>
                              <td className="px-4 py-3 text-gray-500">{d.toLocaleDateString('en-GB',{weekday:'long'})}</td>
                              <td className="px-4 py-3"><span className={`badge ${statusColor[a.status] || 'bg-gray-100 text-gray-600'}`}>{a.status.replace('_',' ')}</span></td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{a.notes || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Leave Request Modal */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="Request Leave" size="md">
        <div className="space-y-4">
          <div>
            <label className="form-label">Leave Type</label>
            <select className="form-input" value={form.leave_type} onChange={e => setForm({...form, leave_type: e.target.value})}>
              {['annual','sick','maternity','paternity','unpaid','other'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <textarea className="form-input" rows={3} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Optional — briefly describe the reason" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setLeaveModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={submitLeave} disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
        </div>
      </Modal>
    </AppLayout>
  );
}
