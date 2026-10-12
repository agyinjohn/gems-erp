'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { FileText, ChevronRight } from 'lucide-react';
import { HEALTH, dueText, type ReportStatus } from '@/components/projects/reporting';

interface LedProject { id: string; code: string; name: string; status: string; report_status?: ReportStatus }

/**
 * The projects this person leads, and when each one's report is due — so a
 * lead never has to go looking for where to write it.
 */
export default function ReportsDue() {
  const [projects, setProjects] = useState<LedProject[]>([]);

  useEffect(() => {
    api.get('/projects', { params: { lead: 'me' } })
      .then(r => setProjects((r.data.data || []).filter((p: LedProject) => p.status === 'active' && p.report_status?.frequency !== 'none')))
      .catch(() => setProjects([]));
  }, []);

  if (!projects.length) return null;
  const sorted = [...projects].sort((a, b) =>
    Number(!!b.report_status?.overdue) - Number(!!a.report_status?.overdue)
    || new Date(a.report_status?.next_due || 0).getTime() - new Date(b.report_status?.next_due || 0).getTime());

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-bold text-gray-800">Project reports</h3>
        <span className="text-xs text-gray-400">You lead {projects.length} project{projects.length > 1 ? 's' : ''}</span>
      </div>
      <ul className="divide-y divide-gray-50">
        {sorted.map(p => {
          const st = p.report_status;
          const h = st?.last_health ? HEALTH[st.last_health] : null;
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-gray-400">{p.code}</span>
                  {h && <><span>·</span><span className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />{h.label}</>}
                  {dueText(st) && <><span>·</span><span className={st?.overdue ? 'text-red-600 font-semibold' : ''}>{dueText(st)}</span></>}
                </div>
              </div>
              <Link href={`/projects/${p.id}?tab=reports&write=1`}
                className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap ${
                  st?.overdue ? 'bg-[#0D3B6E] text-white hover:bg-[#0a2f58]' : 'text-[#0D3B6E] bg-[#0D3B6E]/5 hover:bg-[#0D3B6E]/10'
                }`}>
                Write report <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
