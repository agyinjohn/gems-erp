'use client';

import { useEffect, useState } from 'react';
import { Modal, EmptyState, Spinner, toast } from '@/components/ui';
import { Plus, Search, DollarSign, CheckCircle, XCircle, Calendar, Users, Clock, Umbrella, Banknote, Edit2, UserX, FileText, Download, Eye, Send, Trash2 } from 'lucide-react';
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
import StarRating from '@/components/hr/StarRating';
import AppraisalForm from '@/components/hr/AppraisalForm';
import { type HrSectionSlug } from '@/lib/hrNav';

interface HrWorkspaceProps {
  section: HrSectionSlug;
}

export default function HrWorkspace({ section }: HrWorkspaceProps) {
  const { tenant, isRole } = useAuth();
  const [payrollSettings, setPayrollSettings] = useState({ apply_ssnit: true, apply_paye: true });
  const [payrollSettingsSaving, setPayrollSettingsSaving] = useState(false);
  const [payslipRow, setPayslipRow] = useState<any>(null);
  // ── Loans & advances ──
  const [loans, setLoans] = useState<any[]>([]);
  const [loanStatusFilter, setLoanStatusFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [loanSaving, setLoanSaving] = useState(false);
  const [loanForm, setLoanForm] = useState({ employee_id: '', type: 'loan', reason: '', principal: '', monthly_deduction: '' });
  // ── Performance appraisals ──
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [appraisalCategories, setAppraisalCategories] = useState<string[]>([]);
  const [appraisalSaving, setAppraisalSaving] = useState(false);
  const [appraisalForm, setAppraisalForm] = useState<{
    employee_id: string;
    period_start: string;
    period_end: string;
    category_ratings: Record<string, number>;
    strengths: string;
    areas_for_improvement: string;
    goals_next_period: string;
  }>({ employee_id: '', period_start: '', period_end: '', category_ratings: {}, strengths: '', areas_for_improvement: '', goals_next_period: '' });
  const [appraisalDetail, setAppraisalDetail] = useState<any>(null);
  const [printAppraisal, setPrintAppraisal] = useState<any>(null);
  const [editingAppraisalId, setEditingAppraisalId] = useState<string | null>(null);
  // ── Leave types & holidays ──
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveTypeForm, setLeaveTypeForm] = useState({ name: '', default_days: '', paid: true });
  const [leaveTypeSaving, setLeaveTypeSaving] = useState(false);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', is_recurring: false });
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [attendanceSettings, setAttendanceSettings] = useState({ standard_hours_per_day: 8 });
  const [clockEmployeeId, setClockEmployeeId] = useState('');
  const [clocking, setClocking] = useState(false);
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
  const [modal, setModal] = useState<'add_emp'|'edit_emp'|'terminate'|'emp_detail'|'add_payroll'|'bulk_payroll'|'pay_run'|'payroll_detail'|'add_leave'|'add_attendance'|'add_loan'|'manage_holidays'|'manage_leave_types'|'add_appraisal'|'appraisal_detail'|null>(null);
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

  const formatLeaveType = (type: string) => {
    const known = leaveTypes.find((lt) => lt.code === type);
    return known ? known.name : type.replace(/_/g, ' ');
  };

  // Client-side estimate: excludes weekends (matches the server's rule).
  // Public holidays are additionally excluded server-side at approval —
  // the actual balance charge may be slightly lower than shown here.
  const leaveDurationDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const cursor = new Date(start);
    const last = new Date(end);
    if (cursor > last) return 0;
    let count = 0;
    while (cursor <= last) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) count += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
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
        const [e, d] = await Promise.all([
          api.get('/employees').catch(() => ({ data: { data: [] } })),
          api.get('/departments').catch(() => ({ data: { data: [] } })),
        ]);
        apiCache.set('/employees', e.data.data);
        apiCache.set('/departments', d.data.data);
        setEmployees(e.data.data);
        setDepartments(d.data.data);
      } else if (sec === 'attendance') {
        const [e, a] = await Promise.all([
          api.get('/employees').catch(() => ({ data: { data: [] } })),
          api.get(`/attendance?date=${date}`).catch(() => ({ data: { data: [] } })),
        ]);
        apiCache.set('/employees', e.data.data);
        setEmployees(e.data.data);
        setAttendance(a.data.data);
      } else if (sec === 'leave') {
        const [l, e] = await Promise.all([
          api.get('/leave-requests').catch(() => ({ data: { data: [] } })),
          api.get('/employees').catch(() => ({ data: { data: [] } })),
        ]);
        apiCache.set('/leave-requests', l.data.data);
        apiCache.set('/employees', e.data.data);
        setLeave(l.data.data);
        setEmployees(e.data.data);
      } else if (sec === 'payroll') {
        const [p, e] = await Promise.all([
          api.get('/payroll').catch(() => ({ data: { data: [] } })),
          api.get('/employees').catch(() => ({ data: { data: [] } })),
        ]);
        apiCache.set('/payroll', p.data.data);
        apiCache.set('/employees', e.data.data);
        setPayroll(p.data.data);
        setEmployees(e.data.data);
      } else if (sec === 'loans' || sec === 'appraisals') {
        const e = await api.get('/employees').catch(() => ({ data: { data: [] } }));
        apiCache.set('/employees', e.data.data);
        setEmployees(e.data.data);
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
    if (section === 'attendance') {
      loadSection(section, attendanceDate);
      loadHolidays();
      loadAttendanceSettings();
      return;
    }
    const cacheKey = section === 'employees' ? '/employees' : section === 'leave' ? '/leave-requests' : (section === 'loans' || section === 'appraisals') ? '/employees' : '/payroll';
    const hasCache = !!apiCache.get(cacheKey);
    loadSection(section, attendanceDate, hasCache && !apiCache.isStale(cacheKey));
    if (section === 'payroll') { loadBatches(); loadPayrollSettings(); }
    if (section === 'loans') loadLoans();
    if (section === 'leave') loadLeaveTypes();
    if (section === 'appraisals') loadAppraisals();
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

  const loadPayrollSettings = async () => {
    try {
      const r = await api.get('/hr/payroll-settings');
      setPayrollSettings(r.data.data);
    } catch { /* ignore */ }
  };

  const togglePayrollSetting = async (key: 'apply_ssnit' | 'apply_paye') => {
    const next = { ...payrollSettings, [key]: !payrollSettings[key] };
    setPayrollSettingsSaving(true);
    try {
      const r = await api.patch('/hr/payroll-settings', { [key]: next[key] });
      setPayrollSettings(r.data.data);
      toast.success('Payroll settings updated');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update payroll settings');
    } finally { setPayrollSettingsSaving(false); }
  };

  // ── Loans & advances ──
  const loadLoans = async () => {
    try {
      const r = await api.get('/loans');
      setLoans(r.data.data || []);
    } catch { /* ignore */ }
  };

  const openNewLoan = () => {
    setLoanForm({ employee_id: '', type: 'loan', reason: '', principal: '', monthly_deduction: '' });
    setModal('add_loan');
  };

  const saveLoan = async () => {
    if (!loanForm.employee_id) { toast.error('Select an employee'); return; }
    if (!parseFloat(loanForm.principal) || parseFloat(loanForm.principal) <= 0) { toast.error('Enter a principal amount'); return; }
    if (!parseFloat(loanForm.monthly_deduction) || parseFloat(loanForm.monthly_deduction) <= 0) { toast.error('Enter a monthly deduction amount'); return; }
    setLoanSaving(true);
    try {
      await api.post('/loans', {
        ...loanForm,
        principal: parseFloat(loanForm.principal),
        monthly_deduction: parseFloat(loanForm.monthly_deduction),
      });
      toast.success('Loan recorded');
      setModal(null);
      loadLoans();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to record loan');
    } finally { setLoanSaving(false); }
  };

  const cancelLoan = async (loan: any) => {
    try {
      await api.patch(`/loans/${loan._id || loan.id}/cancel`);
      toast.success('Loan cancelled');
      loadLoans();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to cancel loan');
      throw e;
    }
  };

  const requestCancelLoan = (loan: any) => {
    setHrConfirm({
      title: 'Cancel loan / advance?',
      message: `Cancel this ${loan.type} for ${loan.employee_name}? The remaining balance will no longer be deducted from their pay.`,
      confirmLabel: 'Cancel loan',
      danger: true,
      details: [
        { label: 'Employee', value: loan.employee_name },
        { label: 'Type', value: loan.type },
        { label: 'Remaining balance', value: `GH₵ ${parseFloat(loan.balance).toFixed(2)}` },
      ],
      action: () => cancelLoan(loan),
    });
  };

  const filteredLoans = loans.filter((l) => loanStatusFilter === 'all' || l.status === loanStatusFilter);

  // ── Performance appraisals ──
  const loadAppraisals = async () => {
    try {
      const [r, c] = await Promise.all([
        api.get('/appraisals'),
        appraisalCategories.length ? Promise.resolve(null) : api.get('/appraisals/categories'),
      ]);
      setAppraisals(r.data.data || []);
      if (c) setAppraisalCategories(c.data.data || []);
    } catch { /* ignore */ }
  };

  const defaultAppraisalPeriod = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = now.toISOString().slice(0, 10);
    return { start, end };
  };

  const openNewAppraisal = () => {
    const { start, end } = defaultAppraisalPeriod();
    setEditingAppraisalId(null);
    setAppraisalForm({ employee_id: '', period_start: start, period_end: end, category_ratings: {}, strengths: '', areas_for_improvement: '', goals_next_period: '' });
    setModal('add_appraisal');
  };

  // Some drafts may predate the standardized period_start/period_end fields
  // (created before that migration) — fall back to today rather than crash.
  const toDateInputValue = (value: any) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
  };

  const openEditAppraisal = (a: any) => {
    const categoryRatings: Record<string, number> = {};
    for (const c of a.category_ratings || []) categoryRatings[c.category] = c.rating;
    setEditingAppraisalId(a._id || a.id);
    setAppraisalForm({
      employee_id: a.employee_id?._id || a.employee_id,
      period_start: toDateInputValue(a.period_start),
      period_end: toDateInputValue(a.period_end),
      category_ratings: categoryRatings,
      strengths: a.strengths || '',
      areas_for_improvement: a.areas_for_improvement || '',
      goals_next_period: a.goals_next_period || '',
    });
    setModal('add_appraisal');
  };

  const appraisalOverallPreview = appraisalCategories.length
    ? Math.round((appraisalCategories.reduce((sum, c) => sum + (appraisalForm.category_ratings[c] || 0), 0) / appraisalCategories.length) * 100) / 100
    : 0;

  const saveAppraisal = async () => {
    if (!appraisalForm.employee_id) { toast.error('Select an employee'); return; }
    if (!appraisalForm.period_start || !appraisalForm.period_end) { toast.error('Set a review period'); return; }
    if (new Date(appraisalForm.period_end) < new Date(appraisalForm.period_start)) { toast.error('Period end cannot be before period start'); return; }
    const unrated = appraisalCategories.filter((c) => !appraisalForm.category_ratings[c]);
    if (unrated.length > 0) { toast.error(`Rate every category — missing: ${unrated.join(', ')}`); return; }
    setAppraisalSaving(true);
    try {
      const payload = {
        employee_id: appraisalForm.employee_id,
        period_start: appraisalForm.period_start,
        period_end: appraisalForm.period_end,
        category_ratings: appraisalCategories.map((category) => ({ category, rating: appraisalForm.category_ratings[category] })),
        strengths: appraisalForm.strengths,
        areas_for_improvement: appraisalForm.areas_for_improvement,
        goals_next_period: appraisalForm.goals_next_period,
      };
      if (editingAppraisalId) {
        await api.put(`/appraisals/${editingAppraisalId}`, payload);
        toast.success('Draft updated');
      } else {
        await api.post('/appraisals', payload);
        toast.success('Appraisal saved as draft');
      }
      setModal(null);
      setEditingAppraisalId(null);
      loadAppraisals();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save appraisal');
    } finally { setAppraisalSaving(false); }
  };

  const openAppraisalDetail = (a: any) => {
    setAppraisalDetail(a);
    setModal('appraisal_detail');
  };

  const submitAppraisalRow = async (a: any) => {
    try {
      await api.patch(`/appraisals/${a._id || a.id}/submit`);
      toast.success('Appraisal submitted — the employee can now see it in their portal');
      setModal(null);
      loadAppraisals();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit appraisal');
    }
  };

  const deleteAppraisalRow = async (a: any) => {
    try {
      await api.delete(`/appraisals/${a._id || a.id}`);
      toast.success('Draft deleted');
      loadAppraisals();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete appraisal');
      throw e;
    }
  };

  const requestDeleteAppraisal = (a: any) => {
    setModal(null);
    setHrConfirm({
      title: 'Delete draft appraisal?',
      message: `Delete this draft appraisal for ${a.employee_name}? This cannot be undone.`,
      confirmLabel: 'Delete draft',
      danger: true,
      details: [
        { label: 'Employee', value: a.employee_name },
        { label: 'Period', value: `${new Date(a.period_start).toLocaleDateString()} – ${new Date(a.period_end).toLocaleDateString()}` },
      ],
      action: () => deleteAppraisalRow(a),
    });
  };

  const appraisalStatusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-500',
    submitted: 'bg-blue-100 text-blue-700',
    acknowledged: 'bg-green-100 text-green-700',
  };

  // ── Leave types ──
  const loadLeaveTypes = async () => {
    try {
      const r = await api.get('/leave-types');
      setLeaveTypes(r.data.data || []);
    } catch { /* ignore */ }
  };

  const saveLeaveType = async () => {
    if (!leaveTypeForm.name.trim()) { toast.error('Enter a name'); return; }
    setLeaveTypeSaving(true);
    try {
      await api.post('/leave-types', {
        name: leaveTypeForm.name.trim(),
        default_days: parseInt(leaveTypeForm.default_days, 10) || 0,
        paid: leaveTypeForm.paid,
      });
      toast.success('Leave type added');
      setLeaveTypeForm({ name: '', default_days: '', paid: true });
      loadLeaveTypes();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add leave type');
    } finally { setLeaveTypeSaving(false); }
  };

  const updateLeaveTypeField = async (lt: any, patch: any) => {
    try {
      await api.patch(`/leave-types/${lt._id || lt.id}`, patch);
      loadLeaveTypes();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update leave type');
    }
  };

  // ── Public holidays ──
  const loadHolidays = async () => {
    try {
      const r = await api.get('/holidays');
      setHolidays(r.data.data || []);
    } catch { /* ignore */ }
  };

  const saveHoliday = async () => {
    if (!holidayForm.name.trim() || !holidayForm.date) { toast.error('Enter a name and date'); return; }
    setHolidaySaving(true);
    try {
      await api.post('/holidays', holidayForm);
      toast.success('Holiday added');
      setHolidayForm({ name: '', date: '', is_recurring: false });
      loadHolidays();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add holiday');
    } finally { setHolidaySaving(false); }
  };

  const removeHoliday = async (h: any) => {
    try {
      await api.delete(`/holidays/${h._id || h.id}`);
      toast.success('Holiday removed');
      loadHolidays();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to remove holiday');
      throw e;
    }
  };

  const requestRemoveHoliday = (h: any) => {
    setHrConfirm({
      title: 'Remove public holiday?',
      message: `Remove "${h.name}" from the public holiday calendar?`,
      confirmLabel: 'Remove holiday',
      danger: true,
      details: [
        { label: 'Name', value: h.name },
        { label: 'Date', value: new Date(h.date).toLocaleDateString() },
        { label: 'Recurring', value: h.is_recurring ? 'Yes — repeats every year' : 'No — one-off' },
      ],
      action: () => removeHoliday(h),
    });
  };

  // ── Attendance: clock in/out + settings ──
  const loadAttendanceSettings = async () => {
    try {
      const r = await api.get('/hr/attendance-settings');
      setAttendanceSettings(r.data.data);
    } catch { /* ignore */ }
  };

  const updateStandardHours = async (hours: string) => {
    try {
      const r = await api.patch('/hr/attendance-settings', { standard_hours_per_day: parseFloat(hours) });
      setAttendanceSettings(r.data.data);
      toast.success('Attendance settings updated');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update');
    }
  };

  const doClockIn = async () => {
    if (!clockEmployeeId) { toast.error('Select an employee'); return; }
    setClocking(true);
    try {
      await api.post('/attendance/clock-in', { employee_id: clockEmployeeId });
      toast.success('Clocked in');
      reloadSection();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Clock-in failed');
    } finally { setClocking(false); }
  };

  const doClockOut = async () => {
    if (!clockEmployeeId) { toast.error('Select an employee'); return; }
    setClocking(true);
    try {
      await api.post('/attendance/clock-out', { employee_id: clockEmployeeId });
      toast.success('Clocked out');
      reloadSection();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Clock-out failed');
    } finally { setClocking(false); }
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

  const leaveRemaining = (e: any, code: string) => e.leave_balance?.find((b: any) => b.code === code)?.remaining_days ?? '';

  const exportHrCsv = () => {
    const rows = employees.map((e: any) => [
      e.employee_code, e.name, e.department_name || '', e.job_title || '', e.status,
      e.gross_salary, leaveRemaining(e, 'annual'), leaveRemaining(e, 'sick'),
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

  return (
    <>
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
                          <div>Annual: {leaveRemaining(e, 'annual') || '—'}</div>
                          <div>Sick: {leaveRemaining(e, 'sick') || '—'}</div>
                          {(e.leave_balance || []).filter((b: any) => !['annual', 'sick'].includes(b.code) && b.used_days > 0).length > 0 && (
                            <div className="text-gray-400">+{(e.leave_balance || []).filter((b: any) => !['annual', 'sick'].includes(b.code) && b.used_days > 0).length} other</div>
                          )}
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
                  {['present','absent','half_day','leave','holiday'].map(s => (
                    <span key={s} className="text-gray-500">
                      <span className="font-semibold text-gray-700">{attendance.filter((a:any)=>a.status===s).length}</span> {s.replace('_',' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" className="btn-secondary" onClick={() => setModal('manage_holidays')}>Public Holidays</button>
              <button type="button" className="btn-primary" onClick={openRecordAttendance}>
                <Calendar className="w-4 h-4" />Record Attendance
              </button>
            </div>
          </div>

          {/* Clock in / out */}
          <div className="card mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="form-label">Clock in / out for</label>
                <select className="form-input w-full" value={clockEmployeeId} onChange={(e) => setClockEmployeeId(e.target.value)}>
                  <option value="">Select employee…</option>
                  {employees.filter((e) => e.status === 'active').map((e) => <option key={e.id || e._id} value={e.id || e._id}>{e.name}</option>)}
                </select>
              </div>
              <button className="btn-secondary" onClick={doClockIn} disabled={clocking}>Clock In</button>
              <button className="btn-secondary" onClick={doClockOut} disabled={clocking}>Clock Out</button>
              <div className="flex items-center gap-2 ml-auto text-xs text-gray-500">
                <span>Standard hours/day:</span>
                <input
                  type="number"
                  step="0.5"
                  className="form-input w-20 py-1 text-xs"
                  defaultValue={attendanceSettings.standard_hours_per_day}
                  onBlur={(e) => e.target.value && updateStandardHours(e.target.value)}
                  disabled={!isRole('business_owner')}
                />
              </div>
            </div>
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
                        {['present','absent','half_day','leave','holiday'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
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
                  <thead className="table-header"><tr>{['Employee','Date','Status','Clock in/out','Hours','Overtime','Notes',''].map(h=><th key={h || 'actions'} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {attendance.map((a:any) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{a.employee_name||'—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3"><span className="text-xs text-gray-600 capitalize">{a.status.replace('_', ' ')}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {a.clock_in ? new Date(a.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          {' – '}
                          {a.clock_out ? new Date(a.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{a.hours_worked != null ? a.hours_worked.toFixed(2) : '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{a.overtime_hours ? a.overtime_hours.toFixed(2) : '—'}</td>
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
            <button type="button" className="btn-secondary shrink-0" onClick={() => setModal('manage_leave_types')}>Leave Types</button>
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
          {/* Payroll Settings — statutory deductions on/off */}
          <div className="card mb-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Payroll Settings</h3>
            <p className="text-xs text-gray-400 mb-3">
              Turn off a statutory deduction if it doesn't apply to your business. This changes how PAYE and SSNIT are calculated on every payroll run going forward.
              {!isRole('business_owner') && ' Only the business owner can change this.'}
            </p>
            <div className="flex flex-wrap gap-6">
              {([
                { key: 'apply_ssnit' as const, label: 'SSNIT', hint: 'Pension contribution (5.5% employee / 13% employer)' },
                { key: 'apply_paye' as const, label: 'PAYE', hint: 'Progressive income tax' },
              ]).map(({ key, label, hint }) => (
                <label key={key} className={`flex items-center gap-3 ${isRole('business_owner') ? 'cursor-pointer' : 'cursor-default'}`}>
                  <span
                    onClick={() => isRole('business_owner') && !payrollSettingsSaving && togglePayrollSetting(key)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${payrollSettings[key] ? 'bg-[#0D3B6E]' : 'bg-gray-300'} ${!isRole('business_owner') || payrollSettingsSaving ? 'opacity-60' : ''}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${payrollSettings[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-gray-800">Apply {label}</span>
                    <span className="block text-xs text-gray-400">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

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

      {section === 'loans' && (
        <>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="w-full sm:w-auto sm:min-w-[160px]">
              <label className="form-label">Status</label>
              <select className="form-input w-full" value={loanStatusFilter} onChange={(e) => setLoanStatusFilter(e.target.value as typeof loanStatusFilter)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex-1" />
            <button type="button" className="btn-primary" onClick={openNewLoan}>
              <Plus className="w-4 h-4" /> New Loan / Advance
            </button>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : filteredLoans.length === 0 ? (
              <EmptyState message={loans.length === 0 ? 'No loans or advances recorded yet' : 'No loans match your filter'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header"><tr>
                    {['Employee', 'Type', 'Reason', 'Principal', 'Monthly deduction', 'Balance', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-2 text-left">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLoans.map((l) => (
                      <tr key={l._id || l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{l.employee_name}</td>
                        <td className="px-4 py-2 capitalize">{l.type}</td>
                        <td className="px-4 py-2 text-gray-500">{l.reason || '—'}</td>
                        <td className="px-4 py-2">GH₵ {parseFloat(l.principal).toFixed(2)}</td>
                        <td className="px-4 py-2">GH₵ {parseFloat(l.monthly_deduction).toFixed(2)}</td>
                        <td className="px-4 py-2 font-semibold">GH₵ {parseFloat(l.balance).toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${l.status === 'active' ? 'bg-blue-100 text-blue-700' : l.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{l.status}</span>
                        </td>
                        <td className="px-4 py-2">
                          {l.status === 'active' && (
                            <button type="button" onClick={() => requestCancelLoan(l)} title="Cancel loan" className="p-1.5 hover:bg-red-50 rounded text-red-600"><XCircle className="w-4 h-4" /></button>
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

      {/* Performance Appraisals */}
      {section === 'appraisals' && (
        <>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1" />
            <button type="button" className="btn-primary" onClick={openNewAppraisal}>
              <Plus className="w-4 h-4" /> New Appraisal
            </button>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : appraisals.length === 0 ? (
              <EmptyState message="No appraisals recorded yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header"><tr>
                    {['Employee', 'Period', 'Rating', 'Reviewer', 'Status', 'Date', ''].map((h) => <th key={h} className="px-4 py-2 text-left">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {appraisals.map((a) => (
                      <tr key={a._id || a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openAppraisalDetail(a)}>
                        <td className="px-4 py-2 font-medium">{a.employee_name}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{new Date(a.period_start).toLocaleDateString()} – {new Date(a.period_end).toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <StarRating value={Math.round(a.overall_rating || 0)} readOnly />
                            <span className="text-xs text-gray-400">{(a.overall_rating || 0).toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-500">{a.reviewer_name}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${appraisalStatusBadge[a.status] || 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{new Date(a.created_at || a.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          {a.status === 'draft' && (
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => openEditAppraisal(a)} title="Edit draft" className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Edit2 className="w-4 h-4" /></button>
                              <button type="button" onClick={() => submitAppraisalRow(a)} title="Submit to employee" className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Send className="w-4 h-4" /></button>
                              <button type="button" onClick={() => requestDeleteAppraisal(a)} title="Delete draft" className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
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
        </>
      )}

      {/* New Loan / Advance Modal */}
      <Modal open={modal==='add_loan'} onClose={() => setModal(null)} title="New Loan / Advance" size="md">
        <p className="text-sm text-gray-600 mb-4">The monthly deduction is automatically taken from the employee's pay each period until the balance is cleared.</p>
        <div className="space-y-3">
          <div>
            <label className="form-label">Employee</label>
            <select className="form-input" value={loanForm.employee_id} onChange={(e) => setLoanForm({ ...loanForm, employee_id: e.target.value })}>
              <option value="">Select employee…</option>
              {employees.filter((e) => e.status === 'active').map((e) => <option key={e.id || e._id} value={e.id || e._id}>{e.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Type</label>
              <select className="form-input" value={loanForm.type} onChange={(e) => setLoanForm({ ...loanForm, type: e.target.value })}>
                <option value="loan">Loan</option>
                <option value="advance">Salary advance</option>
              </select>
            </div>
            <div><label className="form-label">Reason (optional)</label><input className="form-input" value={loanForm.reason} onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })} placeholder="e.g. Emergency, School fees" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Principal (GH₵)</label><input type="number" className="form-input" value={loanForm.principal} onChange={(e) => setLoanForm({ ...loanForm, principal: e.target.value })} /></div>
            <div><label className="form-label">Monthly deduction (GH₵)</label><input type="number" className="form-input" value={loanForm.monthly_deduction} onChange={(e) => setLoanForm({ ...loanForm, monthly_deduction: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveLoan} disabled={loanSaving}>{loanSaving ? 'Saving…' : 'Record loan'}</button>
        </div>
      </Modal>

      {/* New/Edit Appraisal Modal */}
      <Modal open={modal==='add_appraisal'} onClose={() => setModal(null)} title={editingAppraisalId ? 'Edit Draft Appraisal' : 'New Appraisal'} size="xl">
        <p className="text-sm text-gray-600 mb-4">Saved as a draft first — the employee only sees it once you submit it.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Employee</label>
              <select className="form-input" value={appraisalForm.employee_id} onChange={(e) => setAppraisalForm({ ...appraisalForm, employee_id: e.target.value })}>
                <option value="">Select employee…</option>
                {employees.filter((e) => e.status === 'active' || (e.id || e._id) === appraisalForm.employee_id).map((e) => <option key={e.id || e._id} value={e.id || e._id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Period start</label>
              <input type="date" className="form-input" value={appraisalForm.period_start} onChange={(e) => setAppraisalForm({ ...appraisalForm, period_start: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Period end</label>
              <input type="date" className="form-input" value={appraisalForm.period_end} min={appraisalForm.period_start} onChange={(e) => setAppraisalForm({ ...appraisalForm, period_end: e.target.value })} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Rate each category</label>
              <span className="text-xs text-gray-400">Overall: <span className="font-semibold text-gray-700">{appraisalOverallPreview.toFixed(1)}</span></span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 border border-gray-100 rounded-lg p-3">
              {appraisalCategories.map((c) => (
                <div key={c} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700">{c}</span>
                  <StarRating value={appraisalForm.category_ratings[c] || 0} onChange={(v) => setAppraisalForm({ ...appraisalForm, category_ratings: { ...appraisalForm.category_ratings, [c]: v } })} />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Strengths</label>
              <textarea className="form-input" rows={3} value={appraisalForm.strengths} onChange={(e) => setAppraisalForm({ ...appraisalForm, strengths: e.target.value })} placeholder="What went well this period" />
            </div>
            <div>
              <label className="form-label">Areas for improvement</label>
              <textarea className="form-input" rows={3} value={appraisalForm.areas_for_improvement} onChange={(e) => setAppraisalForm({ ...appraisalForm, areas_for_improvement: e.target.value })} placeholder="What to work on" />
            </div>
          </div>
          <div>
            <label className="form-label">Goals for next period</label>
            <textarea className="form-input" rows={2} value={appraisalForm.goals_next_period} onChange={(e) => setAppraisalForm({ ...appraisalForm, goals_next_period: e.target.value })} placeholder="What to focus on next" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveAppraisal} disabled={appraisalSaving}>{appraisalSaving ? 'Saving…' : editingAppraisalId ? 'Update draft' : 'Save draft'}</button>
        </div>
      </Modal>

      {/* Appraisal Detail Modal */}
      <Modal open={modal==='appraisal_detail'} onClose={() => setModal(null)} title="Appraisal" size="md">
        {appraisalDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{appraisalDetail.employee_name}</div>
                <div className="text-xs text-gray-400">
                  {new Date(appraisalDetail.period_start).toLocaleDateString()} – {new Date(appraisalDetail.period_end).toLocaleDateString()} · Reviewed by {appraisalDetail.reviewer_name}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${appraisalStatusBadge[appraisalDetail.status] || 'bg-gray-100 text-gray-500'}`}>{appraisalDetail.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <StarRating value={Math.round(appraisalDetail.overall_rating || 0)} readOnly />
              <span className="text-sm text-gray-500">Overall {(appraisalDetail.overall_rating || 0).toFixed(1)}</span>
            </div>
            <div className="space-y-1.5 border border-gray-100 rounded-lg p-3">
              {(appraisalDetail.category_ratings || []).map((c: any) => (
                <div key={c.category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{c.category}</span>
                  <StarRating value={c.rating} readOnly />
                </div>
              ))}
            </div>
            {appraisalDetail.strengths && (
              <div><div className="text-xs font-semibold text-gray-400 uppercase mb-1">Strengths</div><p className="text-sm text-gray-700 whitespace-pre-wrap">{appraisalDetail.strengths}</p></div>
            )}
            {appraisalDetail.areas_for_improvement && (
              <div><div className="text-xs font-semibold text-gray-400 uppercase mb-1">Areas for improvement</div><p className="text-sm text-gray-700 whitespace-pre-wrap">{appraisalDetail.areas_for_improvement}</p></div>
            )}
            {appraisalDetail.goals_next_period && (
              <div><div className="text-xs font-semibold text-gray-400 uppercase mb-1">Goals for next period</div><p className="text-sm text-gray-700 whitespace-pre-wrap">{appraisalDetail.goals_next_period}</p></div>
            )}
            {appraisalDetail.employee_comments && (
              <div><div className="text-xs font-semibold text-gray-400 uppercase mb-1">Employee comments</div><p className="text-sm text-gray-700 whitespace-pre-wrap">{appraisalDetail.employee_comments}</p></div>
            )}
            <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
              <button className="btn-secondary" onClick={() => setPrintAppraisal(appraisalDetail)}><FileText className="w-4 h-4" /> Print</button>
              {appraisalDetail.status === 'draft' && (
                <>
                  <button className="btn-secondary text-red-600" onClick={() => requestDeleteAppraisal(appraisalDetail)}>Delete draft</button>
                  <button className="btn-secondary" onClick={() => openEditAppraisal(appraisalDetail)}><Edit2 className="w-4 h-4" /> Edit</button>
                  <button className="btn-primary" onClick={() => submitAppraisalRow(appraisalDetail)}><Send className="w-4 h-4" /> Submit to employee</button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {printAppraisal && (
        <AppraisalForm
          appraisal={printAppraisal}
          employee={employees.find((e) => (e.id || e._id) === (printAppraisal.employee_id?._id || printAppraisal.employee_id))}
          businessName={tenant?.business_name}
          onClose={() => setPrintAppraisal(null)}
        />
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
                {['present','absent','half_day','leave','holiday'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
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
              {(leaveTypes.length ? leaveTypes.filter((lt) => lt.is_active !== false).map((lt) => lt.code) : ['annual','sick','maternity','paternity','unpaid','other']).map(t => <option key={t} value={t}>{formatLeaveType(t)}</option>)}
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

      {/* Manage Leave Types Modal */}
      <Modal open={modal==='manage_leave_types'} onClose={() => setModal(null)} title="Leave Types" size="lg">
        <p className="text-sm text-gray-600 mb-4">Each leave type has its own entitlement pool, so e.g. maternity leave no longer competes with annual leave.</p>
        <div className="overflow-x-auto mb-5 rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="table-header"><tr>{['Name', 'Default days/yr', 'Paid', 'Active'].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {leaveTypes.map((lt) => (
                <tr key={lt._id || lt.id}>
                  <td className="px-3 py-2 font-medium">{lt.name}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="form-input w-24 py-1 text-xs"
                      defaultValue={lt.default_days}
                      onBlur={(e) => e.target.value !== String(lt.default_days) && updateLeaveTypeField(lt, { default_days: parseInt(e.target.value, 10) || 0 })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={lt.paid} onChange={(e) => updateLeaveTypeField(lt, { paid: e.target.checked })} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={lt.is_active !== false} onChange={(e) => updateLeaveTypeField(lt, { is_active: e.target.checked })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Add a leave type</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <div className="sm:col-span-2"><label className="form-label">Name</label><input className="form-input" value={leaveTypeForm.name} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })} placeholder="e.g. Bereavement Leave" /></div>
          <div><label className="form-label">Days/yr</label><input type="number" className="form-input" value={leaveTypeForm.default_days} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, default_days: e.target.value })} /></div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-gray-600"><input type="checkbox" checked={leaveTypeForm.paid} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, paid: e.target.checked })} /> Paid</label>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button className="btn-primary" onClick={saveLeaveType} disabled={leaveTypeSaving}>{leaveTypeSaving ? 'Adding…' : 'Add leave type'}</button>
        </div>
      </Modal>

      {/* Manage Public Holidays Modal */}
      <Modal open={modal==='manage_holidays'} onClose={() => setModal(null)} title="Public Holidays" size="md">
        <p className="text-sm text-gray-600 mb-4">Holidays are excluded from leave-day counts. Recurring holidays repeat on the same date every year.</p>
        <div className="overflow-x-auto mb-5 rounded-lg border border-gray-100 max-h-64 overflow-y-auto">
          {holidays.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No holidays added yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="table-header"><tr>{['Name', 'Date', 'Recurring', ''].map((h) => <th key={h || 'a'} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {holidays.map((h) => (
                  <tr key={h._id || h.id}>
                    <td className="px-3 py-2 font-medium">{h.name}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(h.date).toLocaleDateString('en-GH', { day: '2-digit', month: 'short' })}</td>
                    <td className="px-3 py-2">{h.is_recurring ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2"><button onClick={() => requestRemoveHoliday(h)} className="p-1 hover:bg-red-50 rounded text-red-600"><XCircle className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Add a holiday</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div><label className="form-label">Name</label><input className="form-input" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="e.g. Independence Day" /></div>
          <div><label className="form-label">Date</label><input type="date" className="form-input" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} /></div>
          <label className="flex items-center gap-1.5 text-sm text-gray-600"><input type="checkbox" checked={holidayForm.is_recurring} onChange={(e) => setHolidayForm({ ...holidayForm, is_recurring: e.target.checked })} /> Repeats every year</label>
        </div>
        <div className="flex justify-end mt-4">
          <button className="btn-primary" onClick={saveHoliday} disabled={holidaySaving}>{holidaySaving ? 'Adding…' : 'Add holiday'}</button>
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
