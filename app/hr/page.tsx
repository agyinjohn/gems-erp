'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, toast } from '@/components/ui';
import { Plus, Search, DollarSign, CheckCircle, Calendar, Users, Clock, Umbrella, Banknote } from 'lucide-react';
import api from '@/lib/api';

export default function HRPage() {
  const [tab, setTab] = useState<'employees'|'attendance'|'leave'|'payroll'>('employees');
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [leave, setLeave] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add_emp'|'add_payroll'|'add_leave'|'add_attendance'|null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [empForm, setEmpForm] = useState({ name:'', email:'', phone:'', department_id:'', job_title:'', gross_salary:'', start_date:'', employee_code:'' });
  const [payForm, setPayForm] = useState({ employee_id:'', month: new Date().getMonth()+1, year: new Date().getFullYear(), allowances:'0', deductions:'0' });
  const [leaveForm, setLeaveForm] = useState({ employee_id:'', leave_type:'annual', start_date:'', end_date:'', reason:'' });
  const [attendanceForm, setAttendanceForm] = useState({ employee_id:'', date: new Date().toISOString().split('T')[0], status:'present', notes:'' });

  const load = async () => {
    setLoading(true);
    try {
      const [e, d, l, p] = await Promise.all([
        api.get('/employees').catch(()=>({data:{data:[]}})),
        api.get('/departments').catch(()=>({data:{data:[]}})),
        api.get('/leave-requests').catch(()=>({data:{data:[]}})),
        api.get('/payroll').catch(()=>({data:{data:[]}})),
      ]);
      setEmployees(e.data.data); setDepartments(d.data.data);
      setLeave(l.data.data); setPayroll(p.data.data);
    } finally { setLoading(false); }
  };

  const loadAttendance = async (date: string) => {
    const r = await api.get(`/attendance?date=${date}`).catch(()=>({data:{data:[]}}));
    setAttendance(r.data.data);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'attendance') loadAttendance(attendanceDate); }, [tab, attendanceDate]);

  const filtered = employees.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employee_code?.toLowerCase().includes(search.toLowerCase()));

  const saveEmployee = async () => {
    setSaving(true); setError('');
    try { await api.post('/employees', empForm); setModal(null); load(); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const runPayroll = async () => {
    setSaving(true); setError('');
    try { await api.post('/payroll', payForm); setModal(null); load(); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const approveLeave = async (id: number, status: string) => {
    await api.patch(`/leave-requests/${id}`, { status }).catch(()=>{});
    toast.success('Updated successfully');
    load();
  };

  const submitLeave = async () => {
    setSaving(true); setError('');
    try { await api.post('/leave-requests', leaveForm); setModal(null); load(); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const saveAttendance = async () => {
    setSaving(true); setError('');
    try { await api.post('/attendance', attendanceForm); toast.success('Attendance recorded'); setModal(null); loadAttendance(attendanceDate); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const [bulkStatus, setBulkStatus] = useState<Record<string,string>>({});

  const initBulk = () => {
    const map: Record<string,string> = {};
    employees.forEach(e => { map[e.id] = 'present'; });
    setBulkStatus(map);
  };

  const saveBulkAttendance = async () => {
    setSaving(true); setError('');
    try {
      await Promise.all(
        Object.entries(bulkStatus).map(([employee_id, status]) =>
          api.post('/attendance', { employee_id, date: attendanceDate, status })
        )
      );
      loadAttendance(attendanceDate);
      toast.success('Attendance saved for all employees');
    } catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const approvePayroll = async (id: number) => {
    await api.patch(`/payroll/${id}/approve`).catch(()=>{});
    toast.success('Updated successfully');
    load();
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <AppLayout title="HR & Payroll" subtitle="Manage employees, attendance, leave and payroll" allowedRoles={['business_owner','hr_manager']}>
      <div className="flex flex-wrap gap-2 mb-5">
        {([{t:'employees',l:'Employees',icon:<Users className="w-4 h-4"/>},{t:'attendance',l:'Attendance',icon:<Clock className="w-4 h-4"/>},{t:'leave',l:'Leave Requests',icon:<Umbrella className="w-4 h-4"/>},{t:'payroll',l:'Payroll',icon:<Banknote className="w-4 h-4"/>}]).map(({t,l,icon}) => (
          <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab===t?'bg-blue-700 text-white':'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{icon}{l}</button>
        ))}
        <div className="ml-auto flex gap-2">
          {tab==='employees' && <button className="btn-primary" onClick={() => { setEmpForm({name:'',email:'',phone:'',department_id:'',job_title:'',gross_salary:'',start_date:'',employee_code:'EMP-'+Date.now().toString().slice(-4)}); setError(''); setModal('add_emp'); }}><Plus className="w-4 h-4"/>Add Employee</button>}
          {tab==='attendance' && <button className="btn-primary" onClick={() => { setAttendanceForm({employee_id:'',date:attendanceDate,status:'present',notes:''}); setError(''); setModal('add_attendance'); }}><Calendar className="w-4 h-4"/>Record Attendance</button>}
          {tab==='leave' && <button className="btn-primary" onClick={() => { setLeaveForm({employee_id:'',leave_type:'annual',start_date:'',end_date:'',reason:''}); setError(''); setModal('add_leave'); }}><Plus className="w-4 h-4"/>Apply Leave</button>}
          {tab==='payroll' && <button className="btn-primary" onClick={() => { setPayForm({employee_id:'',month:new Date().getMonth()+1,year:new Date().getFullYear(),allowances:'0',deductions:'0'}); setError(''); setModal('add_payroll'); }}><DollarSign className="w-4 h-4"/>Run Payroll</button>}
        </div>
      </div>

      {/* Employees Tab */}
      {tab==='employees' && (
        <>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="form-input pl-9" placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : filtered.length===0 ? <EmptyState message="No employees found" icon={<Users className="w-8 h-8 text-gray-300"/>} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header"><tr>{['Employee','Code','Department','Job Title','Salary','Status'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{e.name}</div>
                          <div className="text-xs text-gray-400">{e.email||'—'}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.employee_code}</td>
                        <td className="px-4 py-3 text-gray-600">{e.department_name||'—'}</td>
                        <td className="px-4 py-3 text-gray-600">{e.job_title||'—'}</td>
                        <td className="px-4 py-3 font-semibold">GHS {parseFloat(e.gross_salary).toFixed(2)}</td>
                        <td className="px-4 py-3"><Badge status={e.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Attendance Tab */}
      {tab==='attendance' && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium text-gray-700">Date:</label>
            <input type="date" className="form-input w-auto" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
            <span className="text-sm text-gray-500">{attendance.length} records</span>
            {attendance.length > 0 && (
              <div className="ml-2 flex gap-3 text-xs">
                {['present','absent','half_day','leave'].map(s => (
                  <span key={s} className="text-gray-500">
                    <span className="font-semibold text-gray-700">{attendance.filter((a:any)=>a.status===s).length}</span> {s.replace('_',' ')}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bulk Mark */}
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">Mark Attendance for All Employees</h3>
              <div className="flex gap-2">
                <button className="btn-secondary py-1 text-xs" onClick={() => setBulkStatus(Object.fromEntries(employees.map(e=>[e.id,'present'])))}> All Present</button>
                <button className="btn-secondary py-1 text-xs" onClick={() => setBulkStatus(Object.fromEntries(employees.map(e=>[e.id,'absent'])))}> All Absent</button>
                <button className="btn-primary py-1 text-xs" onClick={saveBulkAttendance} disabled={saving || !Object.keys(bulkStatus).length}>{saving ? 'Saving…' : 'Save All'}</button>
              </div>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}
            {Object.keys(bulkStatus).length === 0 ? (
              <button className="btn-secondary text-sm" onClick={initBulk}>Load Employees to Mark</button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {employees.map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{e.name}</div>
                      <div className="text-xs text-gray-400">{e.employee_code}</div>
                    </div>
                    <select
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                      value={bulkStatus[e.id] || 'present'}
                      onChange={ev => setBulkStatus({...bulkStatus, [e.id]: ev.target.value})}
                    >
                      {['present','absent','half_day','leave'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Records Table */}
          <div className="card p-0 overflow-hidden">
            {attendance.length === 0 ? <EmptyState message="No attendance records for this date" icon={<Clock className="w-8 h-8 text-gray-300"/>} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header"><tr>{['Employee','Date','Status','Notes'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {attendance.map((a:any) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{a.employee_name||'—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3"><Badge status={a.status} /></td>
                        <td className="px-4 py-3 text-gray-500">{a.notes||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Leave Tab */}
      {tab==='leave' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : leave.length===0 ? <EmptyState message="No leave requests" icon={<Umbrella className="w-8 h-8 text-gray-300"/>} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-header"><tr>{['Employee','Type','From','To','Reason','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {leave.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{l.employee_name||'—'}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{l.leave_type}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.start_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.end_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.reason||'—'}</td>
                      <td className="px-4 py-3"><Badge status={l.status} /></td>
                      <td className="px-4 py-3">
                        {l.status==='pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => approveLeave(l.id,'approved')} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100">Approve</button>
                            <button onClick={() => approveLeave(l.id,'rejected')} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">Reject</button>
                          </div>
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

      {/* Payroll Tab */}
      {tab==='payroll' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : payroll.length===0 ? <EmptyState message="No payroll runs yet" icon={<Banknote className="w-8 h-8 text-gray-300"/>} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-header"><tr>{['Employee','Period','Gross','Allowances','Deductions','Net','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {payroll.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{p.employee_name||'—'}</td>
                      <td className="px-4 py-3 text-gray-500">{months[p.month-1]} {p.year}</td>
                      <td className="px-4 py-3">GHS {parseFloat(p.gross_salary).toFixed(2)}</td>
                      <td className="px-4 py-3 text-green-600">+GHS {parseFloat(p.allowances||0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-red-600">-GHS {parseFloat(p.deductions||0).toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold">GHS {parseFloat(p.net_salary).toFixed(2)}</td>
                      <td className="px-4 py-3"><Badge status={p.status} /></td>
                      <td className="px-4 py-3">
                        {p.status==='submitted' && <button onClick={() => approvePayroll(p.id)} className="p-1.5 hover:bg-green-50 rounded text-green-600"><CheckCircle className="w-4 h-4"/></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Attendance Modal */}
      <Modal open={modal==='add_attendance'} onClose={() => setModal(null)} title="Record Attendance" size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Employee *</label>
            <select className="form-input" value={attendanceForm.employee_id} onChange={e => setAttendanceForm({...attendanceForm,employee_id:e.target.value})}>
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Date</label><input type="date" className="form-input" value={attendanceForm.date} onChange={e => setAttendanceForm({...attendanceForm,date:e.target.value})} /></div>
            <div><label className="form-label">Status</label>
              <select className="form-input" value={attendanceForm.status} onChange={e => setAttendanceForm({...attendanceForm,status:e.target.value})}>
                {['present','absent','half_day','leave'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
          <div><label className="form-label">Notes</label><input className="form-input" value={attendanceForm.notes} onChange={e => setAttendanceForm({...attendanceForm,notes:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveAttendance} disabled={saving}>{saving?'Saving…':'Save'}</button>
        </div>
      </Modal>

      {/* Apply Leave Modal */}
      <Modal open={modal==='add_leave'} onClose={() => setModal(null)} title="Apply for Leave" size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Employee *</label>
            <select className="form-input" value={leaveForm.employee_id} onChange={e => setLeaveForm({...leaveForm,employee_id:e.target.value})}>
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div><label className="form-label">Leave Type</label>
            <select className="form-input" value={leaveForm.leave_type} onChange={e => setLeaveForm({...leaveForm,leave_type:e.target.value})}>
              {['annual','sick','maternity','paternity','unpaid','other'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Start Date *</label><input type="date" className="form-input" value={leaveForm.start_date} onChange={e => setLeaveForm({...leaveForm,start_date:e.target.value})} /></div>
            <div><label className="form-label">End Date *</label><input type="date" className="form-input" value={leaveForm.end_date} onChange={e => setLeaveForm({...leaveForm,end_date:e.target.value})} /></div>
          </div>
          <div><label className="form-label">Reason</label><textarea className="form-input" rows={2} value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm,reason:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={submitLeave} disabled={saving}>{saving?'Submitting…':'Submit'}</button>
        </div>
      </Modal>

      {/* Add Employee Modal */}
      <Modal open={modal==='add_emp'} onClose={() => setModal(null)} title="Add Employee" size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="form-label">Full Name *</label><input className="form-input" value={empForm.name} onChange={e => setEmpForm({...empForm,name:e.target.value})} /></div>
          <div><label className="form-label">Employee Code</label><input className="form-input" value={empForm.employee_code} onChange={e => setEmpForm({...empForm,employee_code:e.target.value})} /></div>
          <div><label className="form-label">Job Title</label><input className="form-input" value={empForm.job_title} onChange={e => setEmpForm({...empForm,job_title:e.target.value})} /></div>
          <div><label className="form-label">Email</label><input type="email" className="form-input" value={empForm.email} onChange={e => setEmpForm({...empForm,email:e.target.value})} /></div>
          <div><label className="form-label">Phone</label><input className="form-input" value={empForm.phone} onChange={e => setEmpForm({...empForm,phone:e.target.value})} /></div>
          <div><label className="form-label">Department</label>
            <select className="form-input" value={empForm.department_id} onChange={e => setEmpForm({...empForm,department_id:e.target.value})}>
              <option value="">Select</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="form-label">Gross Salary (GHS) *</label><input type="number" className="form-input" value={empForm.gross_salary} onChange={e => setEmpForm({...empForm,gross_salary:e.target.value})} /></div>
          <div><label className="form-label">Start Date</label><input type="date" className="form-input" value={empForm.start_date} onChange={e => setEmpForm({...empForm,start_date:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveEmployee} disabled={saving}>{saving?'Saving…':'Add Employee'}</button>
        </div>
      </Modal>

      {/* Run Payroll Modal */}
      <Modal open={modal==='add_payroll'} onClose={() => setModal(null)} title="Run Payroll" size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Employee *</label>
            <select className="form-input" value={payForm.employee_id} onChange={e => setPayForm({...payForm,employee_id:e.target.value})}>
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} — GHS {e.gross_salary}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Month</label>
              <select className="form-input" value={payForm.month} onChange={e => setPayForm({...payForm,month:parseInt(e.target.value)})}>
                {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div><label className="form-label">Year</label><input type="number" className="form-input" value={payForm.year} onChange={e => setPayForm({...payForm,year:parseInt(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Allowances (GHS)</label><input type="number" className="form-input" value={payForm.allowances} onChange={e => setPayForm({...payForm,allowances:e.target.value})} /></div>
            <div><label className="form-label">Deductions (GHS)</label><input type="number" className="form-input" value={payForm.deductions} onChange={e => setPayForm({...payForm,deductions:e.target.value})} /></div>
          </div>
          {payForm.employee_id && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <div className="font-medium text-blue-800">Payroll Preview</div>
              <div className="text-blue-600 mt-1">
                Gross: GHS {employees.find(e=>e.id==payForm.employee_id)?.gross_salary || 0} +
                Allowances: GHS {payForm.allowances} −
                Deductions: GHS {payForm.deductions} =
                <strong> Net: GHS {(parseFloat(employees.find(e=>e.id==payForm.employee_id)?.gross_salary||0) + parseFloat(payForm.allowances||'0') - parseFloat(payForm.deductions||'0')).toFixed(2)}</strong>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={runPayroll} disabled={saving}>{saving?'Running…':'Run Payroll'}</button>
        </div>
      </Modal>
    </AppLayout>
  );
}
