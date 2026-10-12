'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import { Send, Trash2, FileUp, MessageSquare, CalendarClock, ChevronDown, PenLine, X } from 'lucide-react';
import { HEALTH, FREQUENCY, dueText, ago, initials, type Health, type ReportStatus } from '../reporting';

interface Comment { _id?: string; body: string; author_name?: string; created_at: string }
interface Report {
  id: string;
  title: string;
  summary: string;
  issues?: string;
  next_steps?: string;
  progress_pct?: number | null;
  health?: Health;
  report_date: string;
  author_name?: string;
  comments?: Comment[];
}

interface Props {
  projectId: string;
  project: unknown;
  canManage: boolean;
  /** Open the report form straight away (arriving from a "Write report" link). */
  autoWrite?: boolean;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const EMPTY = { title: '', summary: '', progress_pct: '', issues: '', next_steps: '', report_date: today(), health: 'on_track' as Health };
const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** Periodic status reports: the lead writes them on a schedule, management reads and replies. */
export default function ReportsTab({ projectId, canManage, autoWrite }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [canReport, setCanReport] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [lead, setLead] = useState<{ name: string; job_title?: string } | null>(null);
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/projects/${projectId}/reports`);
      const list: Report[] = r.data.data || [];
      setReports(list);
      setCanReport(!!r.data.can_report);
      setCanComment(!!r.data.can_comment);
      setLead(r.data.lead || null);
      setStatus(r.data.report_status || null);
      setOpenId(id => id ?? list[0]?.id ?? null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load reports');
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // Arriving from a "Write report" link: open the form once we know they may.
  const [autoOpened, setAutoOpened] = useState(false);
  if (autoWrite && !autoOpened && !loading && canReport) {
    setAutoOpened(true);
    setWriting(true);
    setForm({ ...EMPTY, report_date: today(), progress_pct: reports[0]?.progress_pct != null ? String(reports[0].progress_pct) : '', health: reports[0]?.health || 'on_track' });
  }

  const startWriting = () => {
    // Carry the last progress figure forward — it is the most likely starting point.
    const last = reports[0];
    setForm({ ...EMPTY, report_date: today(), progress_pct: last?.progress_pct != null ? String(last.progress_pct) : '', health: last?.health || 'on_track' });
    setWriting(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.summary.trim()) return toast.error('Add a title and a summary');
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/reports`, { ...form, progress_pct: form.progress_pct === '' ? undefined : Number(form.progress_pct) });
      toast.success('Report submitted');
      setWriting(false);
      setOpenId(null);
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not submit the report'); }
    finally { setSaving(false); }
  };

  const fromFile = async (file?: File) => {
    if (!file) return;
    setReading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post(`/projects/${projectId}/reports/extract`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { title, text, truncated } = r.data.data;
      setForm(f => ({ ...f, title: f.title || title, summary: text }));
      toast.success(truncated ? 'Text loaded (shortened to fit) — review it before submitting' : 'Text loaded — review it before submitting');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not read that file'); }
    finally { setReading(false); }
  };

  const sendReply = async (id: string) => {
    if (!reply.trim()) return;
    try {
      await api.post(`/projects/${projectId}/reports/${id}/comments`, { body: reply });
      setReply('');
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not post the comment'); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this report?')) return;
    try { await api.delete(`/projects/${projectId}/reports/${id}`); await load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Could not delete the report'); }
  };

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm(f => ({ ...f, [k]: v }));
  const due = dueText(status);

  return (
    <div className="space-y-4">
      {/* Who reports, how often, and whether it's late */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="w-11 h-11 rounded-full bg-[#0D3B6E] text-white font-bold flex items-center justify-center flex-shrink-0">{lead ? initials(lead.name) : '?'}</span>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">{lead ? lead.name : 'No project lead assigned'}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
              <CalendarClock className="w-3.5 h-3.5" /> {FREQUENCY[status?.frequency || 'weekly']}
              <span>·</span> last report {ago(status?.last_report_at)}
              {due && <><span>·</span><span className={status?.overdue ? 'text-red-600 font-semibold' : 'text-gray-700 font-medium'}>{due}</span></>}
            </div>
          </div>
        </div>
        {reports.length > 0 && (
          <div className="flex items-center gap-1.5" title="Health of recent reports, newest on the right">
            {reports.slice(0, 8).reverse().map(r => (
              <span key={r.id} className={`w-2 h-2 rounded-full ${HEALTH[r.health || 'on_track'].dot}`} />
            ))}
          </div>
        )}
        {canReport && !writing && (
          <button type="button" onClick={startWriting} className="btn-primary justify-center !bg-[#0D3B6E] hover:!bg-[#0a2f58]">
            <PenLine className="w-4 h-4" /> Write report
          </button>
        )}
      </div>

      {/* Writer */}
      {canReport && writing && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-bold text-gray-900">New progress report</h3>
            <div className="flex items-center gap-2">
              <label className={`btn-secondary cursor-pointer ${reading ? 'opacity-60 pointer-events-none' : ''}`}>
                <FileUp className="w-4 h-4" /> {reading ? 'Reading…' : 'Fill from a document'}
                <input type="file" className="hidden" accept=".docx,.pdf,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={e => { fromFile(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <button type="button" className="btn-icon" onClick={() => setWriting(false)} aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div>
            <label className="form-label">How is the project going?</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(HEALTH) as Health[]).map(h => (
                <button key={h} type="button" onClick={() => set('health', h)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                    form.health === h ? 'border-[#0D3B6E] bg-[#0D3B6E]/5 text-[#0D3B6E]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${HEALTH[h].dot}`} />{HEALTH[h].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g. Week 12 update" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Report date</label>
              <input type="date" className="form-input" value={form.report_date} onChange={e => set('report_date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Progress (%)</label>
              <input type="number" min={0} max={100} className="form-input" value={form.progress_pct} onChange={e => set('progress_pct', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">What was done *</label>
            <textarea rows={4} className="form-input resize-y" placeholder="Work completed since the last report" value={form.summary} onChange={e => set('summary', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Issues & risks</label>
              <textarea rows={3} className="form-input resize-y" placeholder="Anything blocking or threatening the plan" value={form.issues} onChange={e => set('issues', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Next steps</label>
              <textarea rows={3} className="form-input resize-y" placeholder="Plan until the next report" value={form.next_steps} onChange={e => set('next_steps', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setWriting(false)}>Cancel</button>
            <button type="button" className="btn-primary !bg-[#0D3B6E] hover:!bg-[#0a2f58]" onClick={submit} disabled={saving}>
              <Send className="w-4 h-4" /> {saving ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3 animate-pulse">{[0, 1].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-gray-100" />)}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border border-dashed border-gray-200">
          <div className="w-12 h-12 rounded-2xl bg-[#0D3B6E]/5 text-[#0D3B6E] flex items-center justify-center mx-auto mb-3"><PenLine className="w-6 h-6" /></div>
          <p className="font-semibold text-gray-800">No reports yet</p>
          <p className="text-sm text-gray-500 mt-1">{canReport ? 'Write the first one — it takes two minutes.' : lead ? `${lead.name} hasn't filed a report yet.` : 'Assign a project lead to start reporting.'}</p>
        </div>
      ) : (
        <ol className="relative space-y-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
          {reports.map(r => {
            const h = HEALTH[r.health || 'on_track'];
            const open = openId === r.id;
            const comments = r.comments || [];
            return (
              <li key={r.id} className="relative pl-12">
                <span className={`absolute left-3 top-4 w-4 h-4 rounded-full ring-4 ring-gray-50 ${h.dot}`} aria-hidden />
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <button type="button" onClick={() => setOpenId(open ? null : r.id)} className="w-full text-left px-4 py-3.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{r.title}</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${h.chip}`}>{h.label}</span>
                        {typeof r.progress_pct === 'number' && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{r.progress_pct}%</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(r.report_date)} · {r.author_name || 'Unknown'}{comments.length > 0 && ` · ${comments.length} comment${comments.length > 1 ? 's' : ''}`}</p>
                      {!open && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{r.summary}</p>}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-300 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>

                  {open && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                      <Block label="Work done" text={r.summary} />
                      {r.issues && <Block label="Issues & risks" text={r.issues} />}
                      {r.next_steps && <Block label="Next steps" text={r.next_steps} />}

                      <div className="border-t border-gray-100 pt-3 space-y-2.5">
                        {comments.map((c, i) => (
                          <div key={c._id || i} className="flex gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{initials(c.author_name)}</span>
                            <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1 min-w-0">
                              <div className="text-xs text-gray-400"><span className="font-semibold text-gray-700">{c.author_name}</span> · {ago(c.created_at)}</div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{c.body}</p>
                            </div>
                          </div>
                        ))}
                        {canComment && (
                          <div className="flex gap-2">
                            <input className="form-input flex-1" placeholder="Reply to this report…" value={reply} onChange={e => setReply(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') sendReply(r.id); }} />
                            <button type="button" className="btn-secondary" onClick={() => sendReply(r.id)} disabled={!reply.trim()}><MessageSquare className="w-4 h-4" /> Reply</button>
                          </div>
                        )}
                      </div>

                      {canManage && (
                        <div className="flex justify-end">
                          <button type="button" onClick={() => remove(r.id)} className="text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete report</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Block({ label, text, tone }: { label: string; text: string; tone?: string }) {
  return (
    <div>
      <div className={`text-[11px] font-bold uppercase tracking-wider ${tone || 'text-gray-400'}`}>{label}</div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5 leading-relaxed">{text}</p>
    </div>
  );
}
