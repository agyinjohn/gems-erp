'use client';

import { useEffect, useState } from 'react';
import { Modal, EmptyState, Spinner, toast } from '@/components/ui';
import { Plus, Search, DollarSign, CheckCircle, XCircle, Calendar, Users, Clock, Umbrella, Banknote, Edit2, UserX, FileText, Download, Eye } from 'lucide-react';
import api, { apiCache } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import EmployeeDocuments from '@/components/hr/EmployeeDocuments';
import Payslip from '@/components/hr/Payslip';
import PayrollLineEditor, {
  DEFAULT_ALLOWANCE_LINES,
  DEFAULT_DEDUCTION_LINES,
  ALLOWANCE_PRESETS,
  DEDUCTION_PRESETS,
  activePayLines,
  formatPayLinesForDisplay,
  type PayLine,
} from '@/components/hr/PayrollLineEditor';
import HrConfirmModal from '@/components/hr/HrConfirmModal';
import { type HrSectionSlug } from '@/lib/hrNav';

interface HrWorkspaceProps {
  section: HrSectionSlug;
}

export default function HrWorkspace({ section }: HrWorkspaceProps) {
  const { tenant } = useAuth();
  const [payslipRow, setPayslipRow] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>(() => apiCache.get('/employees') || []);
  const [departments, setDepartments] = useState<any[]>(() => apiCache.get('/departments') || []);
  const [leave, setLeave] = useState<any[]>(() => apiCache.get('/leave-requests') || []);
  const [payroll, setPayroll] = useState<any[]>(() => apiCache.get('/payroll') || []);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(() => {
    if (section === 'employees') return !apiCache.get('/employees');
    if (section === 'leave') return !apiCache.get('/leave-requests');
    if (section === 'payroll') return !apiCache.get('/payroll');
    return true;
  });
  const [modal, setModal] = useState<'add_emp'|'edit_emp'|'terminate'|'emp_detail'|'add_payroll'|'bulk_payroll'|'pay_run'|'payroll_detail'|'add_leave'|'add_attendance'|null>(null);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [detailEmployee, setDetailEmployee] = useState<any>(null);
  const [terminateTarget, setTerminateTarget] = useState<any>(null);
  const [terminateForm, setTerminateForm] = useState({ end_date: new Date().toISOString().slice(0, 10), reason: '' });
  const [payrollDetail, setPayrollDetail] = useState<any>(null);
  const [hrConfirm, setHrConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    details?: { label: string; value: string }[];
    action: () => Promise<void>;
  } | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [linkableUsers, setLinkableUsers] = useState<any[]>([]);
  const [hrSummary, setHrSummary] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [leaveDateFrom, setLeaveDateFrom] = useState('');
  const [leaveDateTo, setLeaveDateTo] = useState('');
  const [payrollSearch, setPayrollSearch] = useState('');
  const [payrollFilter, setPayrollFilter] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'paid'>('all');
  const [payrollFilterMonth, setPayrollFilterMonth] = useState<'all' | number>('all');
  const [payrollFilterYear, setPayrollFilterYear] = useState<'all' | number>('all');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const [empStep, setEmpStep] = useState(1);
  const [empForm, setEmpForm] = useState({
    // Step 1 — Personal
    name:'', date_of_birth:'', gender:'', nationality:'', marital_status:'', national_id:'', photo:'',
    // Step 2 — Contact
    email:'', phone:'', address:'', emergency_name:'', emergency_phone:'', emergency_relation:'',
    // Step 3 — Employment
    employee_code:'', job_title:'', department_id:'', manager_id:'', user_id:'', gross_salary:'', start_date:'', employment_type:'full_time',
    annual_leave_entitlement:'21', sick_leave_entitlement:'10',
    // Step 3 — Statutory & payment
    ssnit_number:'', tin:'', payment_method:'bank', bank_name:'', bank_account_name:'', bank_account_number:'', bank_branch:'', momo_number:'',
  });
  const [payForm, setPayForm] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    allowance_lines: DEFAULT_ALLOWANCE_LINES as PayLine[],
    deduction_lines: DEFAULT_DEDUCTION_LINES as PayLine[],
  });
  const [bulkPayForm, setBulkPayForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    allowance_lines: DEFAULT_ALLOWANCE_LINES as PayLine[],
    deduction_lines: DEFAULT_DEDUCTION_LINES as PayLine[],
  });

  // ── Batch pay runs ──
  const [batches, setBatches] = useState<any[]>([]);
  const [batchDetail, setBatchDetail] = useState<any>(null); // { batch, runs }
  const [batchActing, setBatchActing] = useState<string | null>(null);
  const [runningBatch, setRunningBatch] = useState(false);
  const [payRunForm, setPayRunForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    allowance_lines: DEFAULT_ALLOWANCE_LINES as PayLine[],
    deduction_lines: DEFAULT_DEDUCTION_LINES as PayLine[],
  });
  const [leaveForm, setLeaveForm] = useState({ employee_id:'', leave_type:'annual', start_date:'', end_date:'', reason:'' });
  const [attendanceForm, setAttendanceForm] = useState({ employee_id:'', date: new Date().toISOString().split('T')[0], status:'present', notes:'' });
  const [attendanceEditing, setAttendanceEditing] = useState(false);

  const getAttendanceEmployeeId = (record: any) => {
    const id = record?.employee_id?.id ?? record?.employee_id?._id ?? record?.employee_id;
    return id != null ? String(id) : '';
  };

  const openApplyLeave = () => {
    setLeaveForm({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' });
    setError('');
    setModal('add_leave');
  };

  const formatLeaveType = (type: string) => type.replace(/_/g, ' ');

  const leaveDurationDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return ms >= 0 ? Math.floor(ms / (1000 * 60 * 60 * 24)) + 1 : 0;
  };

  const openRecordAttendance = () => {
    setAttendanceEditing(false);
    setAttendanceForm({ employee_id: '', date: attendanceDate, status: 'present', notes: '' });
    setError('');
    setModal('add_attendance');
  };

  const openEditAttendance = (record: any) => {
    setAttendanceEditing(true);
    setAttendanceForm({
      employee_id: getAttendanceEmployeeId(record),
      date: attendanceDate,
      status: record.status || 'present',
      notes: record.notes || '',
    });
    setError('');
    setModal('add_attendance');
  };

  const loadSection = async (sec: HrSectionSlug, date = attendanceDate, silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (sec === 'employees') {
        const [e, d, s] = await Promise.all([
          api.get('/employees').catch(() => ({ data: { data: [] } })),
          api.get('/departments').catch(() => ({ data: { data: [] } })),
          api.get('/hr/summary').catch(() => ({ data: { data: null } })),
        ]);
        apiCache.set('/employees', e.data.data);
        apiCache.set('/departments', d.data.data);
        setEmployees(e.data.data);
        setDepartments(d.data.data);
        setHrSummary(s.data.data);
      } else if (sec === 'attendance') {
        const [e, a] = await Promise.all([
          api.get('/employees').catch(() => ({ data: { data: [] } })),
          api.get(`/attendance?date=${date}`).catch(() => ({ data: { data: [] } })),
        ]);
        apiCache.set('/employees', e.data.data);
        setEmployees(e.data.data);
        setAttendance(a.data.data);
        setHrSummary(null);
      } else if (sec === 'leave') {
        const [l, e] = await Promise.all([
          api.get('/leave-requests').catch(() => ({ data: { data: [] } })),
          api.get('/employees').catch(() => ({ data: { data: [] } })),
        ]);
        apiCache.set('/leave-requests', l.data.data);
        apiCache.set('/employees', e.data.data);
        setLeave(l.data.data);
        setEmployees(e.data.data);
        setHrSummary(null);
      } else if (sec === 'payroll') {
        const [p, e] = await Promise.all([
          api.get('/payroll').catch(() => ({ data: { data: [] } })),
          api.get('/employees').catch(() => ({ data: { data: [] } })),
        ]);
        apiCache.set('/payroll', p.data.data);
        apiCache.set('/employees', e.data.data);
        setPayroll(p.data.data);
        setEmployees(e.data.data);
        setHrSummary(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const reloadSection = (invalidate?: string) => {
    if (invalidate) apiCache.invalidate(invalidate);
    loadSection(section);
  };

  useEffect(() => {
    // attendance always re-fetches (date-specific, not cacheable globally)
    if (section === 'attendance') { loadSection(section, attendanceDate); return; }
    const cacheKey = section === 'employees' ? '/employees' : section === 'leave' ? '/leave-requests' : '/payroll';
    const hasCache = !!apiCache.get(cacheKey);
    loadSection(section, attendanceDate, hasCache && !apiCache.isStale(cacheKey));
    if (section === 'payroll') loadBatches();
  }, [section, attendanceDate]);

  const filtered = employees.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employee_code?.toLowerCase().includes(search.toLowerCase()));

  const toDateOnly = (value: string | Date) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const filteredLeave = leave.filter((l) => {
    if (leaveFilter !== 'all' && l.status !== leaveFilter) return false;
    if (leaveDateFrom && toDateOnly(l.end_date) < toDateOnly(leaveDateFrom)) return false;
    if (leaveDateTo && toDateOnly(l.start_date) > toDateOnly(leaveDateTo)) return false;
    if (!leaveSearch.trim()) return true;
    const q = leaveSearch.toLowerCase();
    return (
      l.employee_name?.toLowerCase().includes(q) ||
      l.leave_type?.toLowerCase().includes(q) ||
      l.reason?.toLowerCase().includes(q) ||
      l.status?.toLowerCase().includes(q)
    );
  });

  const leaveFilterOptions: { value: typeof leaveFilter; label: string }[] = [
    { value: 'all', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const payrollFilterOptions: { value: typeof payrollFilter; label: string }[] = [
    { value: 'all', label: 'All statuses' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'paid', label: 'Paid' },
    { value: 'draft', label: 'Draft' },
  ];

  const payrollYearOptions = Array.from(
    new Set([new Date().getFullYear(), ...payroll.map((p) => Number(p.year))])
  ).sort((a, b) => b - a);

  const filteredPayroll = payroll.filter((p) => {
    if (payrollFilter !== 'all' && p.status !== payrollFilter) return false;
    if (payrollFilterMonth !== 'all' && Number(p.month) !== payrollFilterMonth) return false;
    if (payrollFilterYear !== 'all' && Number(p.year) !== payrollFilterYear) return false;
    if (!payrollSearch.trim()) return true;
    const q = payrollSearch.toLowerCase();
    const period = `${months[p.month - 1]} ${p.year}`.toLowerCase();
    return (
      p.employee_name?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q) ||
      period.includes(q)
    );
  });

  const emptyEmpForm = () => ({
    name:'', date_of_birth:'', gender:'', nationality:'', marital_status:'', national_id:'', photo:'',
    email:'', phone:'', address:'', emergency_name:'', emergency_phone:'', emergency_relation:'',
    employee_code:'EMP-'+Date.now().toString().slice(-4), job_title:'', department_id:'', manager_id:'', user_id:'',
    gross_salary:'', start_date:'', employment_type:'full_time', annual_leave_entitlement:'21', sick_leave_entitlement:'10',
    ssnit_number:'', tin:'', payment_method:'bank', bank_name:'', bank_account_name:'', bank_account_number:'', bank_branch:'', momo_number:'',
  });

  const loadLinkableUsers = async (employeeId?: string) => {
    const url = employeeId ? `/employees/linkable-users?employee_id=${employeeId}` : '/employees/linkable-users';
    const r = await api.get(url).catch(() => ({ data: { data: [] } }));
    setLinkableUsers(r.data.data || []);
  };

  const openAddEmp = () => {
    setEditingEmployee(null);
    setEmpForm(emptyEmpForm());
    setEmpStep(1);
    setError('');
    loadLinkableUsers();
    setModal('add_emp');
  };

  const openEditEmp = async (e: any) => {
    setEditingEmployee(e);
    setEmpForm({
      name: e.name || '',
      date_of_birth: e.date_of_birth ? String(e.date_of_birth).slice(0, 10) : '',
      gender: e.gender || '',
      nationality: e.nationality || '',
      marital_status: e.marital_status || '',
      national_id: e.national_id || '',
      photo: e.photo || '',
      email: e.email || '',
      phone: e.phone || '',
      address: e.address || '',
      emergency_name: e.emergency_name || '',
      emergency_phone: e.emergency_phone || '',
      emergency_relation: e.emergency_relation || '',
      employee_code: e.employee_code || '',
      job_title: e.job_title || '',
      department_id: e.department_id?._id || e.department_id || '',
      manager_id: e.manager_id?._id || e.manager_id || '',
      user_id: e.user_id?._id || e.user_id || e.linked_user?.id || '',
      gross_salary: e.gross_salary ?? '',
      start_date: e.start_date ? String(e.start_date).slice(0, 10) : '',
      employment_type: e.employment_type || 'full_time',
      annual_leave_entitlement: String(e.annual_leave_entitlement ?? 21),
      sick_leave_entitlement: String(e.sick_leave_entitlement ?? 10),
      ssnit_number: e.ssnit_number || '',
      tin: e.tin || '',
      payment_method: e.payment_method || 'bank',
      bank_name: e.bank_name || '',
      bank_account_name: e.bank_account_name || '',
      bank_account_number: e.bank_account_number || '',
      bank_branch: e.bank_branch || '',
      momo_number: e.momo_number || '',
    });
    setEmpStep(1);
    setError('');
    await loadLinkableUsers(e.id);
    setModal('edit_emp');
  };

  const openTerminate = (e: any) => {
    setTerminateTarget(e);
    setTerminateForm({ end_date: new Date().toISOString().slice(0, 10), reason: '' });
    setModal('terminate');
  };

  const openDetail = async (e: any) => {
    const r = await api.get(`/employees/${e.id}`).catch(() => ({ data: { data: e } }));
    setDetailEmployee(r.data.data);
    setModal('emp_detail');
  };

  const executeHrConfirm = async () => {
    if (!hrConfirm) return;
    setConfirmSaving(true);
    try {
      await hrConfirm.action();
      setHrConfirm(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally {
      setConfirmSaving(false);
    }
  };

  const saveEmployee = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        ...empForm,
        gross_salary: parseFloat(empForm.gross_salary) || 0,
        annual_leave_entitlement: parseInt(empForm.annual_leave_entitlement, 10) || 21,
        sick_leave_entitlement: parseInt(empForm.sick_leave_entitlement, 10) || 10,
        user_id: empForm.user_id || null,
        manager_id: empForm.manager_id || null,
        department_id: empForm.department_id || null,
      };
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, payload);
        toast.success('Employee updated');
      } else {
        await api.post('/employees', payload);
        toast.success('Employee added');
      }
      setModal(null);
      setEditingEmployee(null);
      setEmpStep(1);
      reloadSection('/employees');
    } catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); throw e; }
    finally { setSaving(false); }
  };

  const requestSaveEmployee = () => {
    if (!empForm.name.trim()) { toast.error('Full name is required'); return; }
    setHrConfirm({
      title: editingEmployee ? 'Save employee changes?' : 'Add employee?',
      message: editingEmployee
        ? `Update the record for ${empForm.name}.`
        : `Create a new employee record for ${empForm.name}.`,
      confirmLabel: editingEmployee ? 'Save changes' : 'Add employee',
      details: [
        { label: 'Name', value: empForm.name },
        { label: 'Job title', value: empForm.job_title || '—' },
        { label: 'Gross salary', value: `GH₵ ${parseFloat(empForm.gross_salary || '0').toFixed(2)}` },
      ],
      action: saveEmployee,
    });
  };

  const confirmTerminate = async () => {
    if (!terminateTarget) return;
    setSaving(true);
    try {
      await api.patch(`/employees/${terminateTarget.id}/terminate`, terminateForm);
      toast.success('Employee terminated');
      setModal(null);
      reloadSection('/employees');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const runPayroll = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/payroll', {
        employee_id: payForm.employee_id,
        month: payForm.month,
        year: payForm.year,
        allowance_lines: activePayLines(payForm.allowance_lines),
        deduction_lines: activePayLines(payForm.deduction_lines),
      });
      toast.success('Payroll run created (PAYE & SSNIT calculated)');
      setModal(null);
      reloadSection('/payroll');
    } catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); throw e; }
    finally { setSaving(false); }
  };

  const requestRunPayroll = () => {
    if (!payForm.employee_id) { toast.error('Select an employee'); return; }
    const emp = employees.find((e) => e.id === payForm.employee_id);
    const allowLines = activePayLines(payForm.allowance_lines);
    const dedLines = activePayLines(payForm.deduction_lines);
    setModal(null);
    setHrConfirm({
      title: 'Run payroll?',
      message: `Create payroll for ${emp?.name} for ${months[payForm.month - 1]} ${payForm.year}. PAYE and SSNIT will be added automatically.`,
      confirmLabel: 'Run payroll',
      details: [
        { label: 'Employee', value: emp?.name || '—' },
        { label: 'Period', value: `${months[payForm.month - 1]} ${payForm.year}` },
        { label: 'Base gross', value: `GH₵ ${parseFloat(emp?.gross_salary || 0).toFixed(2)}` },
        ...allowLines.map((line) => ({ label: line.name, value: `+ GH₵ ${line.amount.toFixed(2)}` })),
        ...dedLines.map((line) => ({ label: line.name, value: `- GH₵ ${line.amount.toFixed(2)}` })),
      ],
      action: runPayroll,
    });
  };

  const approveLeave = async (id: number, status: string) => {
    await api.patch(`/leave-requests/${id}`, { status });
    toast.success(status === 'approved' ? 'Leave approved' : 'Leave rejected');
    reloadSection('/leave-requests');
  };

  const requestApproveLeave = (row: any, status: 'approved' | 'rejected') => {
    const days = leaveDurationDays(row.start_date, row.end_date);
    setHrConfirm({
      title: status === 'approved' ? 'Approve leave request?' : 'Reject leave request?',
      message: status === 'approved'
        ? `Approve ${row.employee_name}'s ${formatLeaveType(row.leave_type)} leave request.`
        : `Reject ${row.employee_name}'s ${formatLeaveType(row.leave_type)} leave request.`,
      confirmLabel: status === 'approved' ? 'Approve leave' : 'Reject leave',
      danger: status === 'rejected',
      details: [
        { label: 'Employee', value: row.employee_name || '—' },
        { label: 'Type', value: formatLeaveType(row.leave_type) },
        { label: 'From', value: new Date(row.start_date).toLocaleDateString() },
        { label: 'To', value: new Date(row.end_date).toLocaleDateString() },
        { label: 'Duration', value: `${days} day${days === 1 ? '' : 's'}` },
        { label: 'Reason', value: row.reason?.trim() || '—' },
      ],
      action: async () => { await approveLeave(row.id, status); },
    });
  };

  const submitLeave = async () => {
    setSaving(true); setError('');
    try { await api.post('/leave-requests', leaveForm); toast.success('Leave request submitted'); setModal(null); reloadSection('/leave-requests'); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); throw e; }
    finally { setSaving(false); }
  };

  const requestSubmitLeave = () => {
    if (!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date) {
      toast.error('Employee and dates are required');
      return;
    }
    if (leaveForm.end_date < leaveForm.start_date) {
      toast.error('End date cannot be before start date');
      return;
    }
    const emp = employees.find((e) => e.id === leaveForm.employee_id);
    const days = leaveDurationDays(leaveForm.start_date, leaveForm.end_date);
    setModal(null);
    setHrConfirm({
      title: 'Submit leave request?',
      message: `Create a ${formatLeaveType(leaveForm.leave_type)} leave request for ${emp?.name}.`,
      confirmLabel: 'Submit request',
      details: [
        { label: 'Employee', value: emp?.name || '—' },
        { label: 'Type', value: formatLeaveType(leaveForm.leave_type) },
        { label: 'From', value: leaveForm.start_date },
        { label: 'To', value: leaveForm.end_date },
        { label: 'Duration', value: `${days} day${days === 1 ? '' : 's'}` },
        ...(leaveForm.reason.trim() ? [{ label: 'Reason', value: leaveForm.reason.trim() }] : []),
      ],
      action: submitLeave,
    });
  };

  const saveAttendance = async () => {
    setSaving(true); setError('');
    try { await api.post('/attendance', attendanceForm); toast.success(attendanceEditing ? 'Attendance updated' : 'Attendance recorded'); setModal(null); setAttendanceEditing(false); reloadSection(); } // attendance not cached
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); throw e; }
    finally { setSaving(false); }
  };

  const requestSaveAttendance = () => {
    if (!attendanceForm.employee_id) { toast.error('Select an employee'); return; }
    const emp = employees.find((e) => e.id === attendanceForm.employee_id);
    setHrConfirm({
      title: 'Record attendance?',
      message: `Save attendance for ${emp?.name} on ${attendanceForm.date}.`,
      confirmLabel: 'Save attendance',
      details: [
        { label: 'Employee', value: emp?.name || '—' },
        { label: 'Date', value: attendanceForm.date },
        { label: 'Status', value: attendanceForm.status.replace('_', ' ') },
        ...(attendanceForm.notes.trim() ? [{ label: 'Notes', value: attendanceForm.notes.trim() }] : []),
      ],
      action: saveAttendance,
    });
  };

  const [bulkStatus, setBulkStatus] = useState<Record<string,string>>({});
  const [bulkNotes, setBulkNotes] = useState<Record<string, string>>({});

  const initBulk = () => {
    const statusMap: Record<string, string> = {};
    const notesMap: Record<string, string> = {};
    employees.forEach((e) => {
      const existing = attendance.find((a) => getAttendanceEmployeeId(a) === String(e.id));
      statusMap[e.id] = existing?.status || 'present';
      notesMap[e.id] = existing?.notes || '';
    });
    setBulkStatus(statusMap);
    setBulkNotes(notesMap);
  };

  const saveBulkAttendance = async () => {
    setSaving(true); setError('');
    try {
      await Promise.all(
        Object.entries(bulkStatus).map(([employee_id, status]) =>
          api.post('/attendance', {
            employee_id,
            date: attendanceDate,
            status,
            notes: bulkNotes[employee_id]?.trim() || '',
          })
        )
      );
      reloadSection(); // attendance not cached
      toast.success('Attendance saved for all employees');
    } catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); throw e; }
    finally { setSaving(false); }
  };

  const requestSaveBulkAttendance = () => {
    const count = Object.keys(bulkStatus).length;
    if (!count) { toast.error('Load employees first'); return; }
    setHrConfirm({
      title: 'Save bulk attendance?',
      message: `Record attendance for ${count} employees on ${attendanceDate}.`,
      confirmLabel: 'Save all',
      details: [
        { label: 'Date', value: attendanceDate },
        { label: 'Employees', value: String(count) },
        { label: 'Present', value: String(Object.values(bulkStatus).filter((s) => s === 'present').length) },
        { label: 'Absent', value: String(Object.values(bulkStatus).filter((s) => s === 'absent').length) },
      ],
      action: saveBulkAttendance,
    });
  };

  const runBulkPayroll = async () => {
    setSaving(true);
    try {
      const res = await api.post('/payroll/bulk', {
        month: bulkPayForm.month,
        year: bulkPayForm.year,
        allowance_lines: activePayLines(bulkPayForm.allowance_lines),
        deduction_lines: activePayLines(bulkPayForm.deduction_lines),
      });
      const { created, skipped, errors } = res.data.data;
      toast.success(`Payroll: ${created.length} created, ${skipped.length} skipped`);
      if (errors?.length) toast.error(`${errors.length} failed — check console`);
      setModal(null);
      reloadSection('/payroll');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Bulk payroll failed'); throw e; }
    finally { setSaving(false); }
  };

  const requestBulkPayroll = () => {
    const activeCount = employees.filter((e) => e.status === 'active').length;
    const allowLines = activePayLines(bulkPayForm.allowance_lines);
    const dedLines = activePayLines(bulkPayForm.deduction_lines);
    setModal(null);
    setHrConfirm({
      title: 'Run bulk payroll?',
      message: `Create payroll for all ${activeCount} active employees for ${months[bulkPayForm.month - 1]} ${bulkPayForm.year}. Existing runs for this period will be skipped.`,
      confirmLabel: 'Run for all staff',
      details: [
        { label: 'Period', value: `${months[bulkPayForm.month - 1]} ${bulkPayForm.year}` },
        { label: 'Active staff', value: String(activeCount) },
        ...allowLines.map((line) => ({ label: `Allowance: ${line.name}`, value: `+ GH₵ ${line.amount.toFixed(2)} each` })),
        ...dedLines.map((line) => ({ label: `Deduction: ${line.name}`, value: `- GH₵ ${line.amount.toFixed(2)} each` })),
      ],
      action: runBulkPayroll,
    });
  };

  // ── Batch pay runs ──
  const loadBatches = async () => {
    try {
      const r = await api.get('/payroll/batches');
      setBatches(r.data.data || []);
    } catch { /* ignore */ }
  };

  const runPayRun = async () => {
    setRunningBatch(true);
    try {
      await api.post('/payroll/batches', {
        month: payRunForm.month,
        year: payRunForm.year,
        allowance_lines: activePayLines(payRunForm.allowance_lines),
        deduction_lines: activePayLines(payRunForm.deduction_lines),
      });
      toast.success('Pay run created');
      setModal(null);
      loadBatches();
      reloadSection('/payroll');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Pay run failed');
    } finally { setRunningBatch(false); }
  };

  const openBatch = async (b: any) => {
    try {
      const r = await api.get(`/payroll/batches/${b._id || b.id}`);
      setBatchDetail(r.data.data);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not load pay run'); }
  };

  const batchAction = async (b: any, kind: 'approve' | 'mark-paid') => {
    const id = b._id || b.id;
    setBatchActing(id);
    try {
      await api.patch(`/payroll/batches/${id}/${kind}`);
      toast.success(kind === 'approve' ? 'Pay run approved' : 'Pay run marked paid');
      loadBatches();
      if (batchDetail?.batch && (batchDetail.batch._id || batchDetail.batch.id) === id) openBatch(b);
      reloadSection('/payroll');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Action failed'); }
    finally { setBatchActing(null); }
  };

  const downloadBankFile = async (b: any) => {
    try {
      const r = await api.get(`/payroll/batches/${b._id || b.id}/bank-file`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank-file-${(b.label || 'payrun').replace(/\s+/g, '-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not download bank file'); }
  };

  const exportHrCsv = () => {
    const rows = employees.map((e: any) => [
      e.employee_code, e.name, e.department_name || '', e.job_title || '', e.status,
      e.gross_salary, e.leave_balance?.annual_remaining ?? '', e.leave_balance?.sick_remaining ?? '',
      e.linked_user?.email || e.email || '',
    ]);
    const header = ['Code', 'Name', 'Department', 'Job Title', 'Status', 'Gross Salary', 'Annual Leave Left', 'Sick Leave Left', 'Email'];
    const csv = [header, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const approvePayroll = async (id: number) => {
    await api.patch(`/payroll/${id}/approve`);
    toast.success('Payroll approved');
    reloadSection('/payroll');
  };

  const requestApprovePayroll = (row: any) => {
    const { allowances, deductions } = formatPayLinesForDisplay(row);
    setHrConfirm({
      title: 'Approve payroll?',
      message: `Mark ${row.employee_name}'s payroll for ${months[row.month - 1]} ${row.year} as approved.`,
      confirmLabel: 'Approve payroll',
      details: [
        { label: 'Employee', value: row.employee_name || '—' },
        { label: 'Net pay', value: `GH₵ ${parseFloat(row.net_salary).toFixed(2)}` },
        ...allowances.map((line: any) => ({ label: line.name, value: `+ GH₵ ${parseFloat(line.amount).toFixed(2)}` })),
        ...deductions.map((line: any) => ({ label: line.name, value: `- GH₵ ${parseFloat(line.amount).toFixed(2)}` })),
      ],
      action: async () => { await approvePayroll(row.id); },
    });
  };

  const openPayrollDetail = (row: any) => {
    setPayrollDetail(row);
    setModal('payroll_detail');
  };

  const resetPayForm = () => setPayForm({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    allowance_lines: [...DEFAULT_ALLOWANCE_LINES],
    deduction_lines: [...DEFAULT_DEDUCTION_LINES],
  });

  const resetBulkPayForm = () => setBulkPayForm({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    allowance_lines: [...DEFAULT_ALLOWANCE_LINES],
    deduction_lines: [...DEFAULT_DEDUCTION_LINES],
  });

  const openRunPayroll = () => {
    resetPayForm();
    setError('');
    setModal('add_payroll');
  };

  const openBulkPayroll = () => {
    resetBulkPayForm();
    setModal('bulk_payroll');
  };

  const sectionKpis = (): { label: string; value: string | number }[] => {
    if (section === 'employees' && hrSummary) {
      return [
        { label: 'Active staff', value: hrSummary.active },
        { label: 'Terminated', value: hrSummary.terminated },
        { label: 'Total employees', value: hrSummary.total_employees },
        { label: 'Departments', value: departments.length },
      ];
    }
    return [];
  };

  const kpis = sectionKpis();

  return (
    <>
      {kpis.length > 0 && (
        <div className={`grid grid-cols-2 gap-3 mb-5 ${kpis.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {kpis.map((k) => (
            <div key={k.label} className="card py-3 px-4">
              <div className="text-lg font-bold text-gray-900">{k.value}</div>
              <div className="text-xs text-gray-400">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Employees */}
      {section === 'employees' && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="form-input pl-9 w-full" placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" className="btn-secondary" onClick={exportHrCsv} title="Export CSV"><Download className="w-4 h-4" /></button>
              <button type="button" className="btn-primary" onClick={openAddEmp}><Plus className="w-4 h-4" />Add Employee</button>
            </div>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : filtered.length===0 ? <EmptyState message="No employees found" icon={<Users className="w-8 h-8 text-gray-300"/>} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header"><tr>{['Employee','Code','Department','Job Title','Leave Bal.','Salary','Status',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#0D3B6E] flex items-center justify-center flex-shrink-0">
                              {e.photo
                                ? <img src={e.photo} alt={e.name} className="w-full h-full object-cover" />
                                : <span className="text-white text-sm font-bold">{e.name?.charAt(0).toUpperCase()}</span>}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{e.name}</div>
                              <div className="text-xs text-gray-400">{e.linked_user?.email || e.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.employee_code}</td>
                        <td className="px-4 py-3 text-gray-600">{e.department_name||'—'}</td>
                        <td className="px-4 py-3 text-gray-600">{e.job_title||'—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div>Annual: {e.leave_balance?.annual_remaining ?? '—'}</div>
                          <div>Sick: {e.leave_balance?.sick_remaining ?? '—'}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold">GH₵ {parseFloat(e.gross_salary).toFixed(2)}</td>
                        <td className="px-4 py-3"><span className="text-xs text-gray-600 capitalize">{e.status.replace('_', ' ')}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEditEmp(e)} title="Edit" className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Edit2 className="w-4 h-4"/></button>
                            <button onClick={() => openDetail(e)} title="Documents" className="p-1.5 hover:bg-[#0D3B6E]/8 rounded text-[#0D3B6E]"><FileText className="w-4 h-4"/></button>
                            {e.status !== 'terminated' && (
                              <button onClick={() => openTerminate(e)} title="Terminate" className="p-1.5 hover:bg-red-50 rounded text-red-500"><UserX className="w-4 h-4"/></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {section === 'attendance' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <input type="date" className="form-input w-auto" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
              <span className="text-sm text-gray-500">{attendance.length} records</span>
              {attendance.length > 0 && (
                <div className="flex flex-wrap gap-3 text-xs">
                  {['present','absent','half_day','leave'].map(s => (
                    <span key={s} className="text-gray-500">
                      <span className="font-semibold text-gray-700">{attendance.filter((a:any)=>a.status===s).length}</span> {s.replace('_',' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="btn-primary shrink-0" onClick={openRecordAttendance}>
              <Calendar className="w-4 h-4" />Record Attendance
            </button>
          </div>

          {/* Bulk Mark */}
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">Mark Attendance for All Employees</h3>
              <div className="flex gap-2">
                <button className="btn-secondary py-1 text-xs" onClick={() => setBulkStatus(Object.fromEntries(employees.map(e=>[e.id,'present'])))}> All Present</button>
                <button className="btn-secondary py-1 text-xs" onClick={() => setBulkStatus(Object.fromEntries(employees.map(e=>[e.id,'absent'])))}> All Absent</button>
                <button className="btn-primary py-1 text-xs" onClick={requestSaveBulkAttendance} disabled={saving || !Object.keys(bulkStatus).length}>{saving ? 'Saving…' : 'Save All'}</button>
              </div>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}
            {Object.keys(bulkStatus).length === 0 ? (
              <button className="btn-secondary text-sm" onClick={initBulk}>Load Employees to Mark</button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {employees.map(e => (
                  <div key={e.id} className="bg-gray-50 rounded-lg px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{e.name}</div>
                        <div className="text-xs text-gray-400">{e.employee_code}</div>
                      </div>
                      <select
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white shrink-0"
                        value={bulkStatus[e.id] || 'present'}
                        onChange={ev => setBulkStatus({ ...bulkStatus, [e.id]: ev.target.value })}
                      >
                        {['present','absent','half_day','leave'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                    </div>
                    <input
                      className="form-input text-xs py-1.5"
                      placeholder="Notes (optional)"
                      value={bulkNotes[e.id] || ''}
                      onChange={ev => setBulkNotes({ ...bulkNotes, [e.id]: ev.target.value })}
                    />
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
                  <thead className="table-header"><tr>{['Employee','Date','Status','Notes',''].map(h=><th key={h || 'actions'} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {attendance.map((a:any) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{a.employee_name||'—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3"><span className="text-xs text-gray-600 capitalize">{a.status.replace('_', ' ')}</span></td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs">{a.notes?.trim() ? a.notes : '—'}</td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => openEditAttendance(a)} className="p-1.5 hover:bg-[#0D3B6E]/8 rounded text-[#0D3B6E]" title="Edit attendance">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {section === 'leave' && (
        <>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="form-input pl-9 w-full"
                placeholder="Search leave requests…"
                value={leaveSearch}
                onChange={(e) => setLeaveSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-auto sm:min-w-[160px]">
              <label className="form-label">Status</label>
              <select className="form-input w-full" value={leaveFilter} onChange={(e) => setLeaveFilter(e.target.value as typeof leaveFilter)}>
                {leaveFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <label className="form-label">From</label>
              <input type="date" className="form-input w-full sm:w-auto" value={leaveDateFrom} onChange={(e) => setLeaveDateFrom(e.target.value)} />
            </div>
            <div className="w-full sm:w-auto">
              <label className="form-label">To</label>
              <input type="date" className="form-input w-full sm:w-auto" value={leaveDateTo} onChange={(e) => setLeaveDateTo(e.target.value)} />
            </div>
            <button type="button" className="btn-primary shrink-0" onClick={openApplyLeave}>
              <Plus className="w-4 h-4" />Apply Leave
            </button>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : filteredLeave.length === 0 ? (
              <EmptyState message={leave.length === 0 ? 'No leave requests' : 'No leave requests match your filters'} icon={<Umbrella className="w-8 h-8 text-gray-300" />} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>{['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', ''].map((h) => <th key={h || 'actions'} className="px-4 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLeave.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{l.employee_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{formatLeaveType(l.leave_type)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.start_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.end_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-gray-600">{leaveDurationDays(l.start_date, l.end_date)}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs">{l.reason?.trim() ? l.reason : '—'}</td>
                        <td className="px-4 py-3"><span className="text-xs text-gray-600 capitalize">{l.status}</span></td>
                        <td className="px-4 py-3">
                          {l.status === 'pending' ? (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => requestApproveLeave(l, 'approved')}
                                title="Approve leave"
                                className="p-1.5 hover:bg-green-50 rounded text-green-600"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => requestApproveLeave(l, 'rejected')}
                                title="Reject leave"
                                className="p-1.5 hover:bg-red-50 rounded text-red-600"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {section === 'payroll' && (
        <>
          {/* Pay Runs (period batches) */}
          <div className="card p-0 overflow-hidden mb-5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Pay Runs</h3>
                <p className="text-xs text-gray-400">Run, approve and pay a whole period at once</p>
              </div>
              <button type="button" className="btn-primary text-sm" onClick={() => setModal('pay_run')}>
                <DollarSign className="w-4 h-4" /> New Pay Run
              </button>
            </div>
            {batches.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No pay runs yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header"><tr>
                    {['Period', 'Employees', 'Total net', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-2 text-left">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {batches.map((b) => {
                      const id = b._id || b.id;
                      return (
                        <tr key={id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{b.label}</td>
                          <td className="px-4 py-2">{b.employee_count}</td>
                          <td className="px-4 py-2 font-semibold">GH₵ {parseFloat(b.total_net || 0).toFixed(2)}</td>
                          <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${b.status === 'paid' ? 'bg-green-100 text-green-700' : b.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{b.status}</span></td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <button type="button" onClick={() => openBatch(b)} title="View pay run" className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Eye className="w-4 h-4" /></button>
                              {b.status === 'draft' && <button type="button" disabled={batchActing === id} onClick={() => batchAction(b, 'approve')} title="Approve" className="p-1.5 hover:bg-green-50 rounded text-green-600"><CheckCircle className="w-4 h-4" /></button>}
                              {b.status === 'approved' && <button type="button" disabled={batchActing === id} onClick={() => batchAction(b, 'mark-paid')} title="Mark paid" className="p-1.5 hover:bg-green-50 rounded text-green-600"><Banknote className="w-4 h-4" /></button>}
                              <button type="button" onClick={() => downloadBankFile(b)} title="Bank file (CSV)" className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Download className="w-4 h-4" /></button>
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

          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="form-input pl-9 w-full"
                placeholder="Search payroll runs…"
                value={payrollSearch}
                onChange={(e) => setPayrollSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-auto sm:min-w-[160px]">
              <label className="form-label">Status</label>
              <select className="form-input w-full" value={payrollFilter} onChange={(e) => setPayrollFilter(e.target.value as typeof payrollFilter)}>
                {payrollFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[140px]">
              <label className="form-label">Month</label>
              <select className="form-input w-full" value={payrollFilterMonth} onChange={(e) => setPayrollFilterMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}>
                <option value="all">All months</option>
                {months.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[120px]">
              <label className="form-label">Year</label>
              <select className="form-input w-full" value={payrollFilterYear} onChange={(e) => setPayrollFilterYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}>
                <option value="all">All years</option>
                {payrollYearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" className="btn-secondary" onClick={openBulkPayroll}>Bulk Run</button>
              <button type="button" className="btn-primary" onClick={openRunPayroll}>
                <DollarSign className="w-4 h-4" />Run Payroll
              </button>
            </div>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : filteredPayroll.length === 0 ? (
              <EmptyState
                message={payroll.length === 0 ? 'No payroll runs yet' : 'No payroll runs match your filters'}
                icon={<Banknote className="w-8 h-8 text-gray-300" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>{['Employee', 'Period', 'Gross', 'Allowances', 'Deductions', 'Net', 'Status', ''].map((h) => <th key={h || 'actions'} className="px-4 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPayroll.map((p) => {
                      const lines = formatPayLinesForDisplay(p);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{p.employee_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{months[p.month - 1]} {p.year}</td>
                          <td className="px-4 py-3">GH₵ {parseFloat(p.gross_salary).toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs">
                            {lines.allowances.length === 0 ? <span className="text-gray-400">—</span> : lines.allowances.map((line: any) => (
                              <div key={line.name} className="text-green-600">{line.name}: GH₵ {parseFloat(line.amount).toFixed(2)}</div>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {lines.deductions.length === 0 ? <span className="text-gray-400">—</span> : lines.deductions.map((line: any) => (
                              <div key={line.name} className="text-red-600">{line.name}: GH₵ {parseFloat(line.amount).toFixed(2)}</div>
                            ))}
                          </td>
                          <td className="px-4 py-3 font-semibold">GH₵ {parseFloat(p.net_salary).toFixed(2)}</td>
                          <td className="px-4 py-3"><span className="text-xs text-gray-600 capitalize">{p.status}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button type="button" onClick={() => openPayrollDetail(p)} title="View details" className="p-1.5 hover:bg-gray-100 rounded text-gray-600">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => setPayslipRow(p)} title="Payslip" className="p-1.5 hover:bg-blue-50 rounded text-blue-600">
                                <FileText className="w-4 h-4" />
                              </button>
                              {p.status === 'submitted' && (
                                <button type="button" onClick={() => requestApprovePayroll(p)} title="Approve payroll" className="p-1.5 hover:bg-green-50 rounded text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
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
        </>
      )}

      {/* Add Attendance Modal */}
      <Modal open={modal==='add_attendance'} onClose={() => { setModal(null); setAttendanceEditing(false); }} title={attendanceEditing ? 'Edit Attendance' : 'Record Attendance'} size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Employee *</label>
            <select
              className="form-input"
              value={attendanceForm.employee_id}
              disabled={attendanceEditing}
              onChange={e => setAttendanceForm({...attendanceForm,employee_id:e.target.value})}
            >
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="form-label">Date</label><input type="date" className="form-input" value={attendanceForm.date} onChange={e => setAttendanceForm({...attendanceForm,date:e.target.value})} /></div>
            <div><label className="form-label">Status</label>
              <select className="form-input" value={attendanceForm.status} onChange={e => setAttendanceForm({...attendanceForm,status:e.target.value})}>
                {['present','absent','half_day','leave'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="form-input min-h-[88px] resize-y"
              placeholder="Optional note (e.g. late arrival, remote work, medical appointment)"
              value={attendanceForm.notes}
              onChange={e => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => { setModal(null); setAttendanceEditing(false); }}>Cancel</button>
          <button className="btn-primary" onClick={requestSaveAttendance} disabled={saving}>{saving ? 'Saving…' : attendanceEditing ? 'Save changes' : 'Save'}</button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="form-label">Start Date *</label><input type="date" className="form-input" value={leaveForm.start_date} onChange={e => setLeaveForm({...leaveForm,start_date:e.target.value})} /></div>
            <div><label className="form-label">End Date *</label><input type="date" className="form-input" value={leaveForm.end_date} onChange={e => setLeaveForm({...leaveForm,end_date:e.target.value})} /></div>
          </div>
          <div><label className="form-label">Reason</label><textarea className="form-input min-h-[88px] resize-y" rows={3} placeholder="Optional reason for leave" value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm,reason:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={requestSubmitLeave} disabled={saving}>{saving?'Submitting…':'Submit'}</button>
        </div>
      </Modal>

      {/* Add Employee Modal — multi-step */}
      <Modal open={modal==='add_emp' || modal==='edit_emp'} onClose={() => { setModal(null); setEditingEmployee(null); setEmpStep(1); }} title={editingEmployee ? 'Edit Employee' : 'Add Employee'} size="lg">
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {['Personal','Contact','Employment'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                empStep > i+1 ? 'bg-green-500 text-white' : empStep === i+1 ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-400'
              }`}>{empStep > i+1 ? '✓' : i+1}</div>
              <span className={`text-xs font-medium ${empStep === i+1 ? 'text-[#0D3B6E]' : 'text-gray-400'}`}>{s}</span>
              {i < 2 && <div className={`flex-1 h-px ${empStep > i+1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}

        {/* Step 1 — Personal */}
        {empStep === 1 && (
          <div className="space-y-4">
            {/* Photo upload */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                {empForm.photo
                  ? <img src={empForm.photo} alt="photo" className="w-full h-full object-cover" />
                  : <span className="text-2xl text-gray-300">👤</span>}
              </div>
              <div>
                <label className="form-label">Passport Photo</label>
                <input type="file" accept="image/*" className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0D3B6E]/8 file:text-[#0D3B6E] hover:file:bg-[#0D3B6E]/15"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => setEmpForm({...empForm, photo: ev.target?.result as string});
                    reader.readAsDataURL(file);
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">JPG or PNG, max 2MB</p>
              </div>
            </div>
            <div><label className="form-label">Full Name *</label><input className="form-input" value={empForm.name} onChange={e => setEmpForm({...empForm,name:e.target.value})} placeholder="e.g. Kofi Mensah" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="form-label">Date of Birth</label><input type="date" className="form-input" value={empForm.date_of_birth} onChange={e => setEmpForm({...empForm,date_of_birth:e.target.value})} /></div>
              <div><label className="form-label">Gender</label>
                <select className="form-input" value={empForm.gender} onChange={e => setEmpForm({...empForm,gender:e.target.value})}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div><label className="form-label">Nationality</label><input className="form-input" value={empForm.nationality} onChange={e => setEmpForm({...empForm,nationality:e.target.value})} placeholder="e.g. Ghanaian" /></div>
              <div><label className="form-label">Marital Status</label>
                <select className="form-input" value={empForm.marital_status} onChange={e => setEmpForm({...empForm,marital_status:e.target.value})}>
                  <option value="">Select</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
              <div className="col-span-2"><label className="form-label">National ID Number</label><input className="form-input" value={empForm.national_id} onChange={e => setEmpForm({...empForm,national_id:e.target.value})} placeholder="GHA-XXXXXXXXX-X" /></div>
            </div>
          </div>
        )}

        {/* Step 2 — Contact */}
        {empStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="form-label">Email</label><input type="email" className="form-input" value={empForm.email} onChange={e => setEmpForm({...empForm,email:e.target.value})} /></div>
              <div><label className="form-label">Phone</label><input className="form-input" value={empForm.phone} onChange={e => setEmpForm({...empForm,phone:e.target.value})} placeholder="+233 XX XXX XXXX" /></div>
            </div>
            <div><label className="form-label">Residential Address</label><textarea className="form-input" rows={2} value={empForm.address} onChange={e => setEmpForm({...empForm,address:e.target.value})} placeholder="Street, City, Region" /></div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Emergency Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="form-label">Full Name</label><input className="form-input" value={empForm.emergency_name} onChange={e => setEmpForm({...empForm,emergency_name:e.target.value})} /></div>
                <div><label className="form-label">Phone</label><input className="form-input" value={empForm.emergency_phone} onChange={e => setEmpForm({...empForm,emergency_phone:e.target.value})} /></div>
                <div className="col-span-2"><label className="form-label">Relationship</label><input className="form-input" value={empForm.emergency_relation} onChange={e => setEmpForm({...empForm,emergency_relation:e.target.value})} placeholder="e.g. Spouse, Parent, Sibling" /></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Employment */}
        {empStep === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="form-label">Employee Code</label><input className="form-input" value={empForm.employee_code} onChange={e => setEmpForm({...empForm,employee_code:e.target.value})} /></div>
            <div><label className="form-label">Job Title</label><input className="form-input" value={empForm.job_title} onChange={e => setEmpForm({...empForm,job_title:e.target.value})} /></div>
            <div><label className="form-label">Department</label>
              <select className="form-input" value={empForm.department_id} onChange={e => setEmpForm({...empForm,department_id:e.target.value})}>
                <option value="">Select</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">Reports to (Manager)</label>
              <select className="form-input" value={empForm.manager_id} onChange={e => setEmpForm({...empForm,manager_id:e.target.value})}>
                <option value="">None</option>
                {employees.filter(em => em.id !== editingEmployee?.id && em.status === 'active').map(em => (
                  <option key={em.id} value={em.id}>{em.name} ({em.employee_code})</option>
                ))}
              </select>
            </div>
            <div><label className="form-label">Link system user (ESS login)</label>
              <select className="form-input" value={empForm.user_id} onChange={e => setEmpForm({...empForm,user_id:e.target.value})}>
                <option value="">No linked user</option>
                {linkableUsers.map((u: any) => (
                  <option key={u._id || u.id} value={u._id || u.id}>{u.name} — {u.email} ({u.role})</option>
                ))}
              </select>
            </div>
            <div><label className="form-label">Employment Type</label>
              <select className="form-input" value={empForm.employment_type} onChange={e => setEmpForm({...empForm,employment_type:e.target.value})}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div><label className="form-label">Gross Salary (GH₵) *</label><input type="number" className="form-input" value={empForm.gross_salary} onChange={e => setEmpForm({...empForm,gross_salary:e.target.value})} /></div>
            <div><label className="form-label">Start Date</label><input type="date" className="form-input" value={empForm.start_date} onChange={e => setEmpForm({...empForm,start_date:e.target.value})} /></div>
            <div><label className="form-label">Annual leave entitlement (days)</label><input type="number" className="form-input" value={empForm.annual_leave_entitlement} onChange={e => setEmpForm({...empForm,annual_leave_entitlement:e.target.value})} /></div>
            <div><label className="form-label">Sick leave entitlement (days)</label><input type="number" className="form-input" value={empForm.sick_leave_entitlement} onChange={e => setEmpForm({...empForm,sick_leave_entitlement:e.target.value})} /></div>

            <div className="col-span-2 pt-2 mt-1 border-t border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">Statutory &amp; payment</div>
            <div><label className="form-label">SSNIT Number</label><input className="form-input" value={empForm.ssnit_number} onChange={e => setEmpForm({...empForm,ssnit_number:e.target.value})} placeholder="e.g. C0123456789" /></div>
            <div><label className="form-label">TIN (Tax ID)</label><input className="form-input" value={empForm.tin} onChange={e => setEmpForm({...empForm,tin:e.target.value})} placeholder="e.g. P0001234567" /></div>
            <div className="col-span-2">
              <label className="form-label">Payment method</label>
              <select className="form-input" value={empForm.payment_method} onChange={e => setEmpForm({...empForm,payment_method:e.target.value})}>
                <option value="bank">Bank transfer</option>
                <option value="momo">Mobile money</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            {empForm.payment_method === 'bank' && (<>
              <div><label className="form-label">Bank name</label><input className="form-input" value={empForm.bank_name} onChange={e => setEmpForm({...empForm,bank_name:e.target.value})} placeholder="e.g. GCB Bank" /></div>
              <div><label className="form-label">Bank branch</label><input className="form-input" value={empForm.bank_branch} onChange={e => setEmpForm({...empForm,bank_branch:e.target.value})} placeholder="e.g. Accra Main" /></div>
              <div><label className="form-label">Account name</label><input className="form-input" value={empForm.bank_account_name} onChange={e => setEmpForm({...empForm,bank_account_name:e.target.value})} /></div>
              <div><label className="form-label">Account number</label><input className="form-input" value={empForm.bank_account_number} onChange={e => setEmpForm({...empForm,bank_account_number:e.target.value})} /></div>
            </>)}
            {empForm.payment_method === 'momo' && (
              <div className="col-span-2"><label className="form-label">Mobile money number</label><input className="form-input" value={empForm.momo_number} onChange={e => setEmpForm({...empForm,momo_number:e.target.value})} placeholder="+233 XX XXX XXXX" /></div>
            )}
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button className="btn-secondary" onClick={() => empStep > 1 ? setEmpStep(empStep-1) : setModal(null)}>
            {empStep > 1 ? '← Back' : 'Cancel'}
          </button>
          {empStep < 3
            ? <button className="btn-primary" onClick={() => { if (!empForm.name && empStep===1) { toast.error('Full name is required'); return; } setEmpStep(empStep+1); }}>Next →</button>
            : <button className="btn-primary" onClick={requestSaveEmployee} disabled={saving}>{saving ? 'Saving…' : editingEmployee ? 'Save Changes' : 'Add Employee'}</button>
          }
        </div>
      </Modal>

      {/* Run Payroll Modal */}
      <Modal open={modal==='add_payroll'} onClose={() => setModal(null)} title="Run Payroll" size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Employee *</label>
            <select className="form-input" value={payForm.employee_id} onChange={e => setPayForm({...payForm,employee_id:e.target.value})}>
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} — GH₵ {e.gross_salary}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="form-label">Month</label>
              <select className="form-input" value={payForm.month} onChange={e => setPayForm({...payForm,month:parseInt(e.target.value)})}>
                {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div><label className="form-label">Year</label><input type="number" className="form-input" value={payForm.year} onChange={e => setPayForm({...payForm,year:parseInt(e.target.value)})} /></div>
          </div>
          <PayrollLineEditor
            label="Allowances"
            lines={payForm.allowance_lines}
            onChange={(allowance_lines) => setPayForm({ ...payForm, allowance_lines })}
            presets={ALLOWANCE_PRESETS}
            amountPrefix="+"
          />
          <PayrollLineEditor
            label="Other deductions (PAYE & SSNIT added automatically)"
            lines={payForm.deduction_lines}
            onChange={(deduction_lines) => setPayForm({ ...payForm, deduction_lines })}
            presets={DEDUCTION_PRESETS}
            amountPrefix="-"
          />
          <p className="text-xs text-gray-500">Each allowance and deduction is stored by name on the payslip.</p>
          {payForm.employee_id && (
            <div className="bg-[#0D3B6E]/8 rounded-lg p-3 text-sm text-[#0D3B6E]">
              Employee gross: GH₵ {employees.find(e=>e.id==payForm.employee_id)?.gross_salary || 0}
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={requestRunPayroll} disabled={saving}>{saving?'Running…':'Run Payroll'}</button>
        </div>
      </Modal>

      <Modal open={modal==='bulk_payroll'} onClose={() => setModal(null)} title="Bulk Payroll Run" size="md">
        <p className="text-sm text-gray-600 mb-4">Creates payroll for all active employees. PAYE and SSNIT are auto-calculated. Skips employees who already have a run for this period.</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="form-label">Month</label>
            <select className="form-input" value={bulkPayForm.month} onChange={e => setBulkPayForm({...bulkPayForm, month: parseInt(e.target.value)})}>
              {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div><label className="form-label">Year</label><input type="number" className="form-input" value={bulkPayForm.year} onChange={e => setBulkPayForm({...bulkPayForm, year: parseInt(e.target.value)})} /></div>
        </div>
        <PayrollLineEditor
          label="Shared allowances (applied to each employee)"
          lines={bulkPayForm.allowance_lines}
          onChange={(allowance_lines) => setBulkPayForm({ ...bulkPayForm, allowance_lines })}
          presets={ALLOWANCE_PRESETS}
          amountPrefix="+"
        />
        <PayrollLineEditor
          label="Shared deductions (PAYE & SSNIT added per employee)"
          lines={bulkPayForm.deduction_lines}
          onChange={(deduction_lines) => setBulkPayForm({ ...bulkPayForm, deduction_lines })}
          presets={DEDUCTION_PRESETS}
          amountPrefix="-"
        />
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={requestBulkPayroll} disabled={saving}>{saving ? 'Running…' : 'Run for all staff'}</button>
        </div>
      </Modal>

      {/* New Pay Run (batch) Modal */}
      <Modal open={modal==='pay_run'} onClose={() => setModal(null)} title="New Pay Run" size="md">
        <p className="text-sm text-gray-600 mb-4">Runs payroll for all active employees in scope as one pay run. PAYE and SSNIT are auto-calculated. Employees already paid for this period are skipped.</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="form-label">Month</label>
            <select className="form-input" value={payRunForm.month} onChange={e => setPayRunForm({...payRunForm, month: parseInt(e.target.value)})}>
              {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div><label className="form-label">Year</label><input type="number" className="form-input" value={payRunForm.year} onChange={e => setPayRunForm({...payRunForm, year: parseInt(e.target.value)})} /></div>
        </div>
        <PayrollLineEditor
          label="Shared allowances (applied to each employee)"
          lines={payRunForm.allowance_lines}
          onChange={(allowance_lines) => setPayRunForm({ ...payRunForm, allowance_lines })}
          presets={ALLOWANCE_PRESETS}
          amountPrefix="+"
        />
        <PayrollLineEditor
          label="Shared deductions (PAYE & SSNIT added per employee)"
          lines={payRunForm.deduction_lines}
          onChange={(deduction_lines) => setPayRunForm({ ...payRunForm, deduction_lines })}
          presets={DEDUCTION_PRESETS}
          amountPrefix="-"
        />
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={runPayRun} disabled={runningBatch}>{runningBatch ? 'Running…' : 'Run pay run'}</button>
        </div>
      </Modal>

      {/* Pay Run detail Modal */}
      <Modal open={!!batchDetail} onClose={() => setBatchDetail(null)} title={`Pay Run — ${batchDetail?.batch?.label || ''}`} size="lg">
        {batchDetail && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="rounded-lg border border-gray-200 p-2"><div className="text-xs text-gray-400">Employees</div><div className="font-bold">{batchDetail.batch.employee_count}</div></div>
              <div className="rounded-lg border border-gray-200 p-2"><div className="text-xs text-gray-400">Total gross</div><div className="font-bold">GH₵ {parseFloat(batchDetail.batch.total_gross || 0).toFixed(2)}</div></div>
              <div className="rounded-lg border border-gray-200 p-2"><div className="text-xs text-gray-400">Deductions</div><div className="font-bold">GH₵ {parseFloat(batchDetail.batch.total_deductions || 0).toFixed(2)}</div></div>
              <div className="rounded-lg border border-gray-200 p-2"><div className="text-xs text-gray-400">Total net</div><div className="font-bold text-[#0D3B6E]">GH₵ {parseFloat(batchDetail.batch.total_net || 0).toFixed(2)}</div></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${batchDetail.batch.status === 'paid' ? 'bg-green-100 text-green-700' : batchDetail.batch.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{batchDetail.batch.status}</span>
              {batchDetail.batch.status === 'draft' && <button className="btn-secondary text-xs" onClick={() => batchAction(batchDetail.batch, 'approve')}>Approve pay run</button>}
              {batchDetail.batch.status === 'approved' && <button className="btn-secondary text-xs" onClick={() => batchAction(batchDetail.batch, 'mark-paid')}>Mark paid</button>}
              <button className="btn-secondary text-xs" onClick={() => downloadBankFile(batchDetail.batch)}><Download className="w-3.5 h-3.5" /> Bank file</button>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="table-header"><tr>{['Employee', 'Gross', 'Deductions', 'Net', ''].map((h, i) => <th key={i} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {batchDetail.runs.map((r: any) => (
                    <tr key={r._id || r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{r.employee_name}</td>
                      <td className="px-3 py-2">GH₵ {parseFloat(r.gross_salary || 0).toFixed(2)}</td>
                      <td className="px-3 py-2">GH₵ {parseFloat(r.deductions || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 font-semibold">GH₵ {parseFloat(r.net_salary || 0).toFixed(2)}</td>
                      <td className="px-3 py-2"><button type="button" onClick={() => setPayslipRow(r)} title="Payslip" className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><FileText className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal==='payroll_detail'} onClose={() => setModal(null)} title="Payroll details" size="md">
        {payrollDetail && (() => {
          const lines = formatPayLinesForDisplay(payrollDetail);
          return (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <div className="font-semibold text-gray-900">{payrollDetail.employee_name}</div>
                <div>{months[payrollDetail.month - 1]} {payrollDetail.year} · <span className="text-xs text-gray-600 capitalize">{payrollDetail.status}</span></div>
              </div>
              <div className="rounded-xl border border-gray-100 overflow-hidden text-sm">
                <div className="flex justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-gray-600">Base gross salary</span>
                  <span className="font-semibold">GH₵ {parseFloat(payrollDetail.gross_salary).toFixed(2)}</span>
                </div>
                {lines.allowances.map((line: any) => (
                  <div key={line.name} className="flex justify-between px-4 py-2.5 border-b border-gray-50">
                    <span className="text-green-700">{line.name}</span>
                    <span className="font-medium text-green-600">+ GH₵ {parseFloat(line.amount).toFixed(2)}</span>
                  </div>
                ))}
                {lines.deductions.map((line: any) => (
                  <div key={line.name} className="flex justify-between px-4 py-2.5 border-b border-gray-50">
                    <span className="text-red-700">{line.name}</span>
                    <span className="font-medium text-red-600">- GH₵ {parseFloat(line.amount).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 bg-[#0D3B6E]/8">
                  <span className="font-bold text-gray-900">Net pay</span>
                  <span className="font-extrabold text-[#0D3B6E]">GH₵ {parseFloat(payrollDetail.net_salary).toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <HrConfirmModal
        open={!!hrConfirm}
        title={hrConfirm?.title || ''}
        message={hrConfirm?.message || ''}
        confirmLabel={hrConfirm?.confirmLabel}
        danger={hrConfirm?.danger}
        details={hrConfirm?.details}
        saving={confirmSaving || saving}
        onClose={() => setHrConfirm(null)}
        onConfirm={executeHrConfirm}
      />

      <Modal open={modal==='terminate'} onClose={() => setModal(null)} title={`Terminate — ${terminateTarget?.name}`} size="sm">
        <p className="text-sm text-gray-600 mb-3">This ends employment and unlinks their system user from ESS.</p>
        <div className="space-y-3">
          <div><label className="form-label">Last working day</label><input type="date" className="form-input" value={terminateForm.end_date} onChange={e => setTerminateForm({...terminateForm, end_date: e.target.value})} /></div>
          <div><label className="form-label">Reason</label><textarea className="form-input" rows={3} value={terminateForm.reason} onChange={e => setTerminateForm({...terminateForm, reason: e.target.value})} placeholder="Resignation, end of contract…" /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={confirmTerminate} disabled={saving}>{saving ? 'Processing…' : 'Confirm termination'}</button>
        </div>
      </Modal>

      <Modal open={modal==='emp_detail'} onClose={() => setModal(null)} title={detailEmployee ? `${detailEmployee.name} — Documents` : 'Employee'} size="md">
        {detailEmployee && (
          <EmployeeDocuments
            employeeId={detailEmployee.id || detailEmployee._id}
            documents={detailEmployee.documents || []}
            onChange={async () => {
              const r = await api.get(`/employees/${detailEmployee.id || detailEmployee._id}`);
              setDetailEmployee(r.data.data);
              reloadSection('/employees');
            }}
          />
        )}
      </Modal>

      {payslipRow && (
        <Payslip
          run={payslipRow}
          employee={employees.find((e) => (e.id || e._id) === (payslipRow.employee_id?._id || payslipRow.employee_id)) || payslipRow.employee}
          businessName={tenant?.business_name}
          onClose={() => setPayslipRow(null)}
        />
      )}
    </>
  );
}
