'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { toast, ConfirmDialog } from '@/components/ui';
import { Plus, X, ChevronRight, TrendingUp, CheckCircle2, PauseCircle, XCircle, FileText } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-50 text-green-700',
  on_hold:   'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  draft:     <FileText className="w-3 h-3" />,
  active:    <TrendingUp className="w-3 h-3" />,
  on_hold:   <PauseCircle className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const money = (n: number, c = 'GHS') =>
  `${c} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  contract: any;
  canManage: boolean;
  reload: () => Promise<void>;
}

export default function ProjectsTab({ contract, canManage, reload }: Props) {
  const linked: any[] = contract.projects || [];

  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [selectedId, setSelectedId]   = useState('');
  const [linking, setLinking]         = useState(false);
  const [showLink, setShowLink]       = useState(false);
  const [confirm, setConfirm]         = useState<{ title: string; message: string; run: () => void } | null>(null);

  useEffect(() => {
    if (!showLink) return;
    api.get('/projects').then(r => setAllProjects(r.data.data || [])).catch(() => {});
  }, [showLink]);

  // Only projects not already linked to this contract
  const linkedIds = new Set(linked.map((p: any) => p.id || String(p._id)));
  const available = allProjects.filter(p => !linkedIds.has(p.id || String(p._id)));

  const linkProject = async () => {
    if (!selectedId) return;
    setLinking(true);
    try {
      await api.post(`/contracts/${contract.id}/projects/${selectedId}`);
      toast.success('Project linked');
      setShowLink(false);
      setSelectedId('');
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not link project');
    } finally {
      setLinking(false);
    }
  };

  const unlink = (p: any) => {
    setConfirm({
      title: `Unlink ${p.code}?`,
      message: `"${p.name}" will no longer be associated with this contract. The project itself is not deleted.`,
      run: async () => {
        try {
          await api.delete(`/contracts/${contract.id}/projects/${p.id || p._id}`);
          toast.success('Project unlinked');
          await reload();
        } catch (e: any) {
          toast.error(e.response?.data?.message || 'Could not unlink');
        }
      },
    });
  };

  return (
    <div className="space-y-4">

      {/* Link bar */}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          {showLink ? (
            <>
              <select
                className="form-input !w-auto flex-1 min-w-[200px]"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Select a project…</option>
                {available.map(p => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
              <button type="button" className="btn-primary !py-1.5 text-sm" onClick={linkProject} disabled={linking || !selectedId}>
                {linking ? 'Linking…' : 'Link'}
              </button>
              <button type="button" className="btn-secondary !py-1.5 text-sm" onClick={() => { setShowLink(false); setSelectedId(''); }}>
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowLink(true)}>
              <Plus className="w-4 h-4" /> Link a project
            </button>
          )}
        </div>
      )}

      {/* Linked projects */}
      {linked.length === 0 ? (
        <div className="card text-center py-14">
          <p className="font-semibold text-gray-700">No projects linked</p>
          <p className="text-sm text-gray-400 mt-1">Link existing projects to track them under this contract.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {linked.map((p: any) => {
            const pct = Math.min(100, Math.max(0, p.progress_pct || 0));
            return (
              <div key={p.id || p._id} className="card !p-0 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{p.code}</span>
                      <span className={`badge gap-1 ${STATUS_STYLE[p.status] || STATUS_STYLE.draft}`}>
                        {STATUS_ICON[p.status]} {label(p.status)}
                      </span>
                      {p.project_type && p.project_type !== 'construction' && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">{label(p.project_type)}</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm mt-0.5">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0D3B6E] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-semibold flex-shrink-0">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-900 hidden sm:block">
                      {money(p.contract_value, p.currency)}
                    </span>
                    {canManage && (
                      <button type="button" onClick={() => unlink(p)}
                        className="btn-icon !text-gray-400 hover:!text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <Link href={`/projects/${p.id || p._id}`} className="btn-icon">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { confirm?.run(); setConfirm(null); }}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
      />
    </div>
  );
}
