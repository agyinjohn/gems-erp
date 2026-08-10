'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast, ConfirmDialog } from '@/components/ui';
import {
  ArrowLeft, RefreshCw, Pencil, Trash2,
  User, Calendar, FileSignature,
  CheckCircle2, PauseCircle, XCircle, FileText, Activity,
} from 'lucide-react';
import OverviewTab from '@/components/contracts/OverviewTab';
import ProjectsTab from '@/components/contracts/ProjectsTab';
import PaymentScheduleTab from '@/components/contracts/PaymentScheduleTab';
import SignatoriesTab from '@/components/contracts/SignatoriesTab';
import DocumentsTab from '@/components/contracts/DocumentsTab';
import NotesTab from '@/components/contracts/NotesTab';

type TabKey = 'overview' | 'projects' | 'schedule' | 'signatories' | 'documents' | 'notes';

const STATUS_STYLE: Record<string, string> = {
  draft:      'bg-gray-100 text-gray-600',
  active:     'bg-green-50 text-green-700',
  on_hold:    'bg-amber-50 text-amber-700',
  completed:  'bg-blue-50 text-blue-700',
  terminated: 'bg-red-50 text-red-600',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  draft:      <FileText className="w-3 h-3" />,
  active:     <Activity className="w-3 h-3" />,
  on_hold:    <PauseCircle className="w-3 h-3" />,
  completed:  <CheckCircle2 className="w-3 h-3" />,
  terminated: <XCircle className="w-3 h-3" />,
};

const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const money = (n: number, c = 'GHS') =>
  `${c} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview',    label: 'Overview' },
  { key: 'projects',    label: 'Projects' },
  { key: 'schedule',    label: 'Payment schedule' },
  { key: 'signatories', label: 'Signatories' },
  { key: 'documents',   label: 'Documents' },
  { key: 'notes',       label: 'Notes' },
];

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();
  const canManage = ['platform_admin', 'business_owner', 'branch_manager', 'accountant'].includes(user?.role || '');
  const isOwner   = ['platform_admin', 'business_owner'].includes(user?.role || '');

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<TabKey>('overview');
  const [confirm, setConfirm]   = useState<{ title: string; message: string; danger?: boolean; run: () => void } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await api.get(`/contracts/${id}`);
      setContract(r.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load contract');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const deleteContract = () => {
    setConfirm({
      title: `Delete ${contract.contract_number}?`,
      message: `"${contract.title}" will be removed. Any linked projects will be unlinked but not deleted.`,
      danger: true,
      run: async () => {
        try {
          await api.delete(`/contracts/${id}`);
          toast.success(`${contract.contract_number} deleted`);
          router.push('/contracts');
        } catch (e: any) {
          toast.error(e.response?.data?.message || 'Could not delete');
        }
      },
    });
  };

  if (loading) {
    return (
      <AppLayout title="Contract" subtitle="Loading…">
        <div className="space-y-4">
          <div className="card animate-pulse h-28" />
          <div className="card animate-pulse h-48" />
        </div>
      </AppLayout>
    );
  }

  if (!contract) {
    return (
      <AppLayout title="Contract" subtitle="Not found">
        <div className="card text-center py-20">
          <p className="font-semibold text-gray-700">Contract not found</p>
          <Link href="/contracts" className="btn-primary mt-4 inline-flex">Back to contracts</Link>
        </div>
      </AppLayout>
    );
  }

  const projectCount = (contract.projects || []).length;

  return (
    <AppLayout
      title={contract.contract_number}
      subtitle={contract.title}
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager', 'accountant']}
    >
      <div className="space-y-5">

        {/* Top nav */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/contracts" className="btn-secondary !py-1.5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Contracts
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {canManage && (
              <button type="button" onClick={() => setTab('overview')} className="btn-secondary">
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
            {isOwner && (
              <button type="button" onClick={deleteContract} className="btn-secondary !text-red-600 hover:!bg-red-50">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Header card */}
        <div className="card">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono text-gray-400 tracking-wide">{contract.contract_number}</span>
                <span className={`badge gap-1 ${STATUS_STYLE[contract.status] || STATUS_STYLE.draft}`}>
                  {STATUS_ICON[contract.status]} {label(contract.status)}
                </span>
                <span className="badge bg-gray-100 text-gray-600">{label(contract.contract_type)}</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900">{contract.title}</h1>
              {contract.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{contract.description}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {contract.customer_name && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="w-3 h-3" /> {contract.customer_name}
                  </span>
                )}
                {contract.start_date && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(contract.start_date).toLocaleDateString()}
                    {contract.end_date && ` → ${new Date(contract.end_date).toLocaleDateString()}`}
                  </span>
                )}
                {projectCount > 0 && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <FileSignature className="w-3 h-3" /> {projectCount} project{projectCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-extrabold text-gray-900">{money(contract.value, contract.currency)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Contract value</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-[#0D3B6E] text-[#0D3B6E]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              {t.key === 'projects' && projectCount > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">{projectCount}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'overview'    && <OverviewTab contract={contract} canManage={canManage} reload={load} />}
        {tab === 'projects'    && <ProjectsTab contract={contract} canManage={canManage} reload={load} />}
        {tab === 'schedule'    && <PaymentScheduleTab contract={contract} canManage={canManage} reload={load} />}
        {tab === 'signatories' && <SignatoriesTab contract={contract} canManage={canManage} reload={load} />}
        {tab === 'documents'   && <DocumentsTab contract={contract} canManage={canManage} reload={load} />}
        {tab === 'notes'       && <NotesTab contract={contract} canManage={canManage} reload={load} />}

        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => { confirm?.run(); setConfirm(null); }}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          danger={confirm?.danger}
        />
      </div>
    </AppLayout>
  );
}
