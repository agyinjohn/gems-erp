'use client';
import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import {
  Search, RefreshCw, Filter, ChevronLeft, ChevronRight,
  LogIn, LogOut, KeyRound, Package, Edit2, Trash2, BarChart2,
  ShoppingCart, RefreshCcw, UserPlus, UserCheck, UserX,
  Store, CheckCircle, XCircle, GitBranch, Zap, Eye,
  Truck, DollarSign, Users, FileText, ClipboardList,
  TrendingDown, Building2, Lock,
} from 'lucide-react';
import api from '@/lib/api';

const MODULE_COLORS: Record<string, string> = {
  auth:       'bg-blue-100 text-blue-700',
  inventory:  'bg-green-100 text-green-700',
  orders:     'bg-purple-100 text-purple-700',
  users:      'bg-orange-100 text-orange-700',
  hr:         'bg-pink-100 text-pink-700',
  accounting: 'bg-yellow-100 text-yellow-700',
  procurement:'bg-cyan-100 text-cyan-700',
  branches:   'bg-indigo-100 text-indigo-700',
  platform:   'bg-red-100 text-red-700',
  crm:        'bg-teal-100 text-teal-700',
  reports:    'bg-gray-100 text-gray-700',
  dashboard:  'bg-slate-100 text-slate-700',
  billing:    'bg-emerald-100 text-emerald-700',
};

const ACTION_ICONS: Record<string, any> = {
  LOGIN:                 LogIn,
  LOGOUT:                LogOut,
  CHANGE_PASSWORD:       KeyRound,
  FORGOT_PASSWORD:       Lock,
  RESET_PASSWORD:        Lock,
  CREATE_PRODUCT:        Package,
  UPDATE_PRODUCT:        Edit2,
  DELETE_PRODUCT:        Trash2,
  ADJUST_STOCK:          TrendingDown,
  CREATE_CATEGORY:       ClipboardList,
  VIEW_PRODUCTS:         Eye,
  VIEW_PRODUCT:          Eye,
  CREATE_ORDER:          ShoppingCart,
  UPDATE_ORDER_STATUS:   RefreshCcw,
  VIEW_ORDERS:           Eye,
  VIEW_ORDER:            Eye,
  POS_SALE:              ShoppingCart,
  CREATE_USER:           UserPlus,
  UPDATE_USER:           UserCheck,
  DEACTIVATE_USER:       UserX,
  VIEW_USERS:            Users,
  CREATE_BRANCH:         Store,
  UPDATE_BRANCH:         Edit2,
  DELETE_BRANCH:         Trash2,
  VIEW_BRANCHES:         GitBranch,
  CREATE_PURCHASE_ORDER: Truck,
  APPROVE_PO:            CheckCircle,
  SEND_PO:               Truck,
  RECEIVE_PO:            Package,
  VIEW_PURCHASE_ORDERS:  Eye,
  CREATE_SUPPLIER:       Building2,
  UPDATE_SUPPLIER:       Edit2,
  CREATE_EXPENSE:        DollarSign,
  UPDATE_EXPENSE:        Edit2,
  DELETE_EXPENSE:        Trash2,
  CREATE_ACCOUNT:        FileText,
  CREATE_JOURNAL_ENTRY:  FileText,
  VIEW_FINANCIAL_REPORT: BarChart2,
  CREATE_EMPLOYEE:       UserPlus,
  MARK_ATTENDANCE:       CheckCircle,
  CREATE_LEAVE_REQUEST:  ClipboardList,
  UPDATE_LEAVE_REQUEST:  Edit2,
  RUN_PAYROLL:           DollarSign,
  APPROVE_PAYROLL:       CheckCircle,
  CREATE_CUSTOMER:       UserPlus,
  CREATE_LEAD:           Zap,
  UPDATE_LEAD:           Edit2,
  LOG_CONTACT:           Users,
  VIEW_REPORT:           BarChart2,
  VIEW_DASHBOARD:        Eye,
  VIEW_ALL_TENANTS:      Building2,
  VIEW_TENANT:           Eye,
  SUSPEND_TENANT:        XCircle,
  ACTIVATE_TENANT:       CheckCircle,
  UPDATE_TENANT:         Edit2,
  BILLING_PAYMENT:       DollarSign,
};

const MODULES = ['auth','inventory','orders','users','hr','accounting','procurement','branches','platform'];

export default function ActivityPage() {
  const [logs, setLogs]         = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 50 };
      if (search)       params.action = search;
      if (filterModule) params.module = filterModule;
      if (dateFrom)     params.from   = dateFrom;
      if (dateTo)       params.to     = dateTo;
      const r = await api.get('/audit-logs', { params });
      setLogs(r.data.data);
      setTotal(r.data.total);
      setPages(r.data.pages);
    } finally { setLoading(false); }
  }, [page, search, filterModule, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const clearFilters = () => {
    setSearch(''); setFilterModule(''); setFilterStatus('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasFilters = search || filterModule || filterStatus || dateFrom || dateTo;

  return (
    <AppLayout title="Activity Log" subtitle="Full audit trail of all system actions" allowedRoles={['platform_admin']}>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9"
            placeholder="Search action or description…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-input w-auto" value={filterModule} onChange={e => { setFilterModule(e.target.value); setPage(1); }}>
          <option value="">All Modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <select className="form-input w-auto" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <input type="date" className="form-input w-auto" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
        <input type="date" className="form-input w-auto" value={dateTo}   onChange={e => { setDateTo(e.target.value);   setPage(1); }} />
        {hasFilters && (
          <button onClick={clearFilters} className="btn-secondary text-red-500 border-red-200 hover:bg-red-50">
            <Filter className="w-4 h-4" /> Clear
          </button>
        )}
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-xs text-gray-400">{total.toLocaleString()} total events</span>
          <span className="text-xs text-gray-400">Page {page} of {pages}</span>
        </div>

        {loading ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No activity found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  {['Time','User','Role','Module','Action','Description','IP','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${log.status === 'failed' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-GH', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 text-xs">{log.user_name || '—'}</div>
                      <div className="text-gray-400 text-xs">{log.user_email || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 capitalize">{log.user_role?.replace(/_/g,' ') || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${MODULE_COLORS[log.module] || 'bg-gray-100 text-gray-500'}`}>
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono text-gray-700 flex items-center gap-1.5">
                        {(() => { const Icon = ACTION_ICONS[log.action]; return Icon ? <Icon className="w-3.5 h-3.5 flex-shrink-0" /> : <Zap className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />; })()}
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{log.description}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ip || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs text-gray-400">{page} / {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
