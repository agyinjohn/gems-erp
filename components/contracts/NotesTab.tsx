'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { toast, ConfirmDialog } from '@/components/ui';
import { Plus, Trash2, StickyNote } from 'lucide-react';

interface Props {
  contract: any;
  canManage: boolean;
  reload: () => Promise<void>;
}

export default function NotesTab({ contract, canManage, reload }: Props) {
  const notes: any[] = [...(contract.notes || [])].reverse(); // newest first

  const [body,    setBody]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => void } | null>(null);

  const add = async () => {
    if (!body.trim()) return toast.error('Note cannot be empty');
    setSaving(true);
    try {
      await api.post(`/contracts/${contract.id}/notes`, { body: body.trim() });
      toast.success('Note added');
      setBody('');
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not add note');
    } finally { setSaving(false); }
  };

  const remove = (note: any) => setConfirm({
    title: 'Delete this note?',
    message: 'This note will be permanently removed.',
    run: async () => {
      try {
        await api.delete(`/contracts/${contract.id}/notes/${note.id || note._id}`);
        toast.success('Note deleted');
        await reload();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Could not delete');
      }
    },
  });

  return (
    <div className="space-y-4">

      {/* Add note */}
      {canManage && (
        <div className="card space-y-3">
          <textarea
            rows={3}
            className="form-input resize-none"
            placeholder="Add an internal note…"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={add}
            disabled={saving || !body.trim()}
          >
            <Plus className="w-4 h-4" /> {saving ? 'Adding…' : 'Add note'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {notes.length === 0 ? (
        <div className="card text-center py-14">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <StickyNote className="w-6 h-6 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">No notes yet</p>
          <p className="text-sm text-gray-400 mt-1">Internal notes are only visible to your team.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note: any) => (
            <div key={note.id || note._id} className="card flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800 whitespace-pre-line">{note.body}</p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {note.created_at ? new Date(note.created_at).toLocaleString() : ''}
                </p>
              </div>
              {canManage && (
                <button type="button" className="btn-icon flex-shrink-0" onClick={() => remove(note)}>
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { confirm?.run(); setConfirm(null); }}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        danger
      />
    </div>
  );
}
