'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui';
import { Send, Trash2 } from 'lucide-react';

interface Note {
  _id: string;
  body: string;
  author_name: string;
  createdAt: string;
}

interface Props {
  projectId: string;
  canManage: boolean;
}

export default function ProjectNotesTab({ projectId, canManage }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await api.get(`/projects/${projectId}/messages`);
      // Only show internal (staff) messages
      setNotes((r.data.data || []).filter((m: any) => m.from === 'staff'));
    } catch { /* silent — notes are non-critical */ }
  };

  useEffect(() => { load(); }, [projectId]);

  const post = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/messages`, {
        body: body.trim(),
        from: 'staff',
        author_name: user?.name || 'Staff',
      });
      setBody('');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not post note');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        Internal notes — visible to staff only, never shown to the client.
      </p>

      {/* Input */}
      {canManage && (
        <div className="card flex gap-3 items-end">
          <textarea
            rows={2}
            className="form-input flex-1 resize-none"
            placeholder="Add an internal note…"
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post(); }}
          />
          <button
            type="button"
            className="btn-primary flex-shrink-0"
            onClick={post}
            disabled={saving || !body.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="card text-center py-14">
          <p className="font-semibold text-gray-700">No internal notes yet</p>
          <p className="text-sm text-gray-400 mt-1">Use this to leave updates for your team.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <div key={n._id} className="card !p-4 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0D3B6E]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#0D3B6E]">
                {(n.author_name || 'S')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700">{n.author_name || 'Staff'}</span>
                  <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">{n.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
