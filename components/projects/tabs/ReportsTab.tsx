'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import { Send, Trash2 } from 'lucide-react';

interface Report {
  id: string;
  title: string;
  summary: string;
  issues?: string;
  next_steps?: string;
  progress_pct?: number | null;
  report_date: string;
  author_name?: string;
}

interface Props {
  projectId: string;
  project: { manager_id?: { name?: string } | string | null };
  canManage: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { title: '', summary: '', progress_pct: '', issues: '', next_steps: '', report_date: today() };

/** Periodic status reports, written by the project lead and read by management. */
export default function ReportsTab({ projectId, canManage }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [canReport, setCanReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/projects/${projectId}/reports`);
      setReports(r.data.data || []);
      setCanReport(!!r.data.can_report);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load reports');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.title.trim() || !form.summary.trim()) return toast.error('Add a title and a summary');
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/reports`, {
        ...form,
        progress_pct: form.progress_pct === '' ? undefined : Number(form.progress_pct),
      });
      toast.success('Report submitted');
      setForm({ ...EMPTY, report_date: today() });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not submit the report');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await api.delete(`/projects/${projectId}/reports/${id}`);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not delete the report');
    }
  };

  const set = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      {canReport && (
        <div className="card space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">New progress report</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g. Week 12 update" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Report date</label>
              <input type="date" className="form-input" value={form.report_date} onChange={e => set('report_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">Summary of work done *</label>
            <textarea rows={3} className="form-input resize-none" value={form.summary} onChange={e => set('summary', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Overall progress (%)</label>
              <input type="number" min={0} max={100} className="form-input" value={form.progress_pct} onChange={e => set('progress_pct', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Issues / risks</label>
              <textarea rows={2} className="form-input resize-none" value={form.issues} onChange={e => set('issues', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Next steps</label>
              <textarea rows={2} className="form-input resize-none" value={form.next_steps} onChange={e => set('next_steps', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={submit} disabled={saving}>
              <Send className="w-4 h-4" /> {saving ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </div>
      )}

      {!canReport && !loading && (
        <p className="text-xs text-gray-400">Only the project lead can submit reports. Reports appear here as they are filed.</p>
      )}

      {loading ? null : reports.length === 0 ? (
        <div className="card text-center text-sm text-gray-400 py-10">No reports yet</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="card space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm">{r.title}</h4>
                  <p className="text-xs text-gray-400">
                    {new Date(r.report_date).toLocaleDateString()} · {r.author_name || 'Unknown'}
                    {typeof r.progress_pct === 'number' && ` · ${r.progress_pct}% complete`}
                  </p>
                </div>
                {canManage && (
                  <button type="button" onClick={() => remove(r.id)} className="btn-icon text-red-500" title="Delete report">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.summary}</p>
              {r.issues && <p className="text-sm text-gray-700 whitespace-pre-wrap"><span className="font-semibold">Issues: </span>{r.issues}</p>}
              {r.next_steps && <p className="text-sm text-gray-700 whitespace-pre-wrap"><span className="font-semibold">Next steps: </span>{r.next_steps}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
