'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import { Plus, Trash2, Eye, EyeOff, Send, MessageSquare } from 'lucide-react';
import type { TabProps } from '@/components/projects/shared';
import { WEATHER, WEATHER_LABEL, label } from '@/components/projects/shared';
import type { DiaryEntry, DiarySummary, ProjectDoc, Delay } from '@/components/projects/types';

/**
 * The daily record, and the job's paperwork.
 *
 * Beyond being a log of what happened, the diary is the evidence a claim for
 * more time is argued from — which is why delays are captured as a cause and
 * hours lost rather than buried in prose.
 */
interface Props extends TabProps {
  diary: { entries: DiaryEntry[]; summary: DiarySummary | null };
  docs: ProjectDoc[];
}

export default function SiteTab({
  projectId, profile, canManage, reload, removeIt, diary, docs
}: Props) {
  const cap = profile.capabilities;
  const [diaryForm, setDiaryForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    weather: 'fine', worked: true, labour_count: '', work_done: '',
    materials_received: '', visitors: '', instructions: '',
  });
  const [delayRows, setDelayRows] = useState<Delay[]>([]);
  const [siteBusy, setSiteBusy] = useState(false);
  const [docForm, setDocForm] = useState({ category: profile.document_categories[0] || 'other', name: '' });
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/projects/${projectId}/messages`)
      .then(r => setMessages(r.data.data || []))
      .catch(() => {});
  }, [projectId, docs]);

  /** Publish a document to the client's page, or take it back. */
  const toggleShare = async (d: ProjectDoc) => {
    try {
      await api.patch(`/projects/${projectId}/documents/${d.id}/share`, { shared: !d.shared_with_client });
      await reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not change sharing'); }
  };

  const reply = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const r = await api.post(`/projects/${projectId}/messages`, { body: draft.trim() });
      setMessages(m => [...m, r.data.data]);
      setDraft('');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not send');
    } finally { setSending(false); }
  };

  const saveDiary = async () => {
    setSiteBusy(true);
    try {
      await api.post(`/projects/${projectId}/diary`, {
        ...diaryForm,
        labour_count: parseInt(diaryForm.labour_count) || 0,
        delays: delayRows.filter(d => d.cause),
      });
      toast.success('Day recorded');
      setDelayRows([]);
      setDiaryForm(f => ({ ...f, work_done: '', materials_received: '', visitors: '', instructions: '', labour_count: '' }));
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save the entry');
    } finally { setSiteBusy(false); }
  };

  const uploadDoc = async (file: File) => {
    setSiteBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', docForm.category);
      if (docForm.name.trim()) fd.append('name', docForm.name.trim());
      await api.post(`/projects/${projectId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Uploaded');
      setDocForm({ category: docForm.category, name: '' });
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not upload');
    } finally { setSiteBusy(false); }
  };

  return (
    <>
      {cap.site_diary && (
      <>
      {/* Lost time */}
      {!!diary.summary?.entries && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Days recorded', String(diary.summary.entries), 'text-gray-900'],
              ['Non-working days', String(diary.summary.non_working_days), diary.summary.non_working_days ? 'text-amber-600' : 'text-gray-900'],
              ['Hours lost', String(diary.summary.hours_lost), diary.summary.hours_lost ? 'text-red-600' : 'text-gray-900'],
              ['Labour days', String(diary.summary.labour_days), 'text-gray-900'],
            ].map(([l, v, tone]) => (
              <div key={l} className="card">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{l}</p>
                <p className={`text-2xl font-extrabold mt-1 ${tone}`}>{v}</p>
              </div>
            ))}
          </div>

          {diary.summary.hours_lost_by_cause.length > 0 && (
            <div className="card">
              <div className="mb-4">
                <h2 className="font-bold text-gray-900">Lost time by cause</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  What an extension-of-time claim is argued from. Weather usually earns time alone; a client
                  instruction or denied access usually carries cost as well.
                </p>
              </div>
              <div className="space-y-2">
                {diary.summary.hours_lost_by_cause.map(c => {
                  const share = diary.summary!.hours_lost > 0 ? (c.hours / diary.summary!.hours_lost) * 100 : 0;
                  return (
                    <div key={c.cause}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700">{label(c.cause)}</span>
                        <span className="text-gray-500">
                          <strong className="text-gray-900">{c.hours}h</strong> over {c.occurrences} day{c.occurrences === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.cause === 'weather' ? 'bg-blue-400' : 'bg-amber-400'}`} style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Record a day */}
      <div className="card">
        <div className="mb-4">
          <h2 className="font-bold text-gray-900">Record a day</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            One entry per date — saving again for the same day updates it rather than adding a second record.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="form-label">Date *</label>
            <input type="date" className="form-input" value={diaryForm.entry_date} onChange={e => setDiaryForm(f => ({ ...f, entry_date: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Weather</label>
            <select className="form-input" value={diaryForm.weather} onChange={e => setDiaryForm(f => ({ ...f, weather: e.target.value }))}>
              {WEATHER.map(w => <option key={w} value={w}>{WEATHER_LABEL[w]}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Labour on site</label>
            <input type="number" min={0} className="form-input" placeholder="0" value={diaryForm.labour_count} onChange={e => setDiaryForm(f => ({ ...f, labour_count: e.target.value }))} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={diaryForm.worked} onChange={e => setDiaryForm(f => ({ ...f, worked: e.target.checked }))} className="w-4 h-4 accent-[#0D3B6E]" />
              Site was worked
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Work carried out</label>
            <textarea rows={2} className="form-input" value={diaryForm.work_done} onChange={e => setDiaryForm(f => ({ ...f, work_done: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Materials received</label>
            <textarea rows={2} className="form-input" value={diaryForm.materials_received} onChange={e => setDiaryForm(f => ({ ...f, materials_received: e.target.value }))} />
          </div>
        </div>

        {/* Delays */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="form-label !mb-0">Delays</label>
            <button type="button" className="btn-ghost text-xs" onClick={() => setDelayRows(r => [...r, { cause: profile.delay_causes[0] || 'other', hours_lost: 0, description: '' }])}>
              <Plus className="w-3.5 h-3.5" /> Add delay
            </button>
          </div>
          {delayRows.length === 0 ? (
            <p className="text-xs text-gray-400">None recorded for this day.</p>
          ) : (
            <div className="space-y-2">
              {delayRows.map((d, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_2fr_auto] gap-2 items-center">
                  <select className="form-input" value={d.cause} onChange={e => setDelayRows(r => r.map((x, xi) => xi === i ? { ...x, cause: e.target.value } : x))}>
                    {profile.delay_causes.map(c => <option key={c} value={c}>{label(c)}</option>)}
                  </select>
                  <input type="number" min={0} className="form-input" placeholder="hrs" value={d.hours_lost || ''} onChange={e => setDelayRows(r => r.map((x, xi) => xi === i ? { ...x, hours_lost: parseFloat(e.target.value) || 0 } : x))} />
                  <input className="form-input" placeholder="What happened" value={d.description || ''} onChange={e => setDelayRows(r => r.map((x, xi) => xi === i ? { ...x, description: e.target.value } : x))} />
                  <button type="button" onClick={() => setDelayRows(r => r.filter((_, xi) => xi !== i))} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="btn-primary mt-4" onClick={saveDiary} disabled={siteBusy}>
          {siteBusy ? 'Saving…' : 'Save entry'}
        </button>
      </div>

      {/* Diary */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-4">Site diary</h2>
        {diary.entries.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {diary.entries.map(e => (
              <div key={e.id} className="bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{new Date(e.entry_date).toLocaleDateString()}</p>
                      <span className="badge bg-gray-100 text-gray-600">{WEATHER_LABEL[e.weather] || e.weather}</span>
                      {!e.worked && <span className="badge bg-red-50 text-red-600">Not worked</span>}
                      {e.labour_count > 0 && <span className="text-xs text-gray-400">{e.labour_count} on site</span>}
                    </div>
                    {e.work_done && <p className="text-sm text-gray-600 mt-1">{e.work_done}</p>}
                    {e.delays.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {e.delays.map((d, i) => (
                          <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                            {label(d.cause)} · {d.hours_lost}h
                          </span>
                        ))}
                      </div>
                    )}
                    {e.recorded_by && <p className="text-xs text-gray-400 mt-1.5">Recorded by {e.recorded_by.name}</p>}
                  </div>
                  {canManage && (
                    <button onClick={() => removeIt('diary entry', `/projects/${projectId}/diary/${e.id}`, new Date(e.entry_date).toLocaleDateString())} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </>
      )}

      {/* Documents */}
      <div className="card">
        <div className="mb-4">
          <h2 className="font-bold text-gray-900">Documents</h2>
          <p className="text-sm text-gray-500 mt-0.5">Contracts, drawings, permits, certificates and site photographs.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="form-label">Category</label>
            <select className="form-input" value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))}>
              {profile.document_categories.map(c => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="form-input" placeholder="Defaults to the filename" value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <label className="btn-secondary w-full justify-center cursor-pointer">
              <Plus className="w-4 h-4" /> {siteBusy ? 'Uploading…' : 'Choose file'}
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                disabled={siteBusy}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }}
              />
            </label>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4">Images and PDFs, up to 10MB.</p>

        {docs.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing uploaded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map(d => (
              <div key={d.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 ring-1 ring-gray-100">
                <span className="badge bg-blue-50 text-[#0D3B6E] flex-shrink-0">{label(d.category)}</span>
                <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-sm text-gray-800 hover:text-[#0D3B6E] truncate">{d.name}</a>
                {d.from_client ? (
                  <span className="badge bg-amber-50 text-amber-700 flex-shrink-0">From the client</span>
                ) : canManage && (
                  <button
                    type="button"
                    onClick={() => toggleShare(d)}
                    title={d.shared_with_client
                      ? 'Visible to the client — click to withdraw'
                      : 'Internal — click to share with the client'}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full flex-shrink-0 transition-colors ${
                      d.shared_with_client
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {d.shared_with_client ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {d.shared_with_client ? 'Shared' : 'Internal'}
                  </button>
                )}
                <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">{new Date(d.createdAt).toLocaleDateString()}</span>
                {canManage && (
                  <button onClick={() => removeIt('document', `/projects/${projectId}/documents/${d.id}`, d.name)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Talking to the client */}
      <div className="card">
        <div className="mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400" /> Messages with the client
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Kept with the job rather than in somebody&apos;s phone, so it can be found when it matters.
            Sending here also texts the client, where updates are switched on.
          </p>
        </div>

        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">Nothing yet.</p>
        ) : (
          <ul className="space-y-3 mb-4 max-h-80 overflow-y-auto">
            {messages.map((m: any) => (
              <li key={m.id} className={m.from === 'staff' ? 'flex justify-end' : ''}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  m.from === 'staff' ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className={`text-xs mb-0.5 ${m.from === 'staff' ? 'text-white/70' : 'text-gray-500'}`}>
                    {m.author_name || (m.from === 'staff' ? 'Your team' : 'The client')} ·{' '}
                    {new Date(m.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <div className="flex items-end gap-2">
            <textarea rows={2} className="form-input resize-none flex-1"
              placeholder="Write to the client…"
              value={draft} onChange={e => setDraft(e.target.value)} />
            <button type="button" className="btn-primary flex-shrink-0" disabled={sending || !draft.trim()} onClick={reply}>
              <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
