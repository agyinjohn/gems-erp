'use client';
import { useRef, useState } from 'react';
import api from '@/lib/api';
import { toast, ConfirmDialog } from '@/components/ui';
import { Upload, FileText, ExternalLink, Trash2, X } from 'lucide-react';

const CATEGORIES = ['contract', 'amendment', 'nda', 'sow', 'invoice', 'correspondence', 'other'];
const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const fileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface Props {
  contract: any;
  canManage: boolean;
  reload: () => Promise<void>;
}

export default function DocumentsTab({ contract, canManage, reload }: Props) {
  const documents: any[] = contract.documents || [];
  const fileRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState('contract');
  const [name,     setName]     = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirm,   setConfirm]   = useState<{ title: string; message: string; run: () => void } | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      if (name.trim()) fd.append('name', name.trim());
      await api.post(`/contracts/${contract.id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Uploaded');
      setName('');
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not upload');
    } finally { setUploading(false); }
  };

  const remove = (doc: any) => setConfirm({
    title: 'Delete this document?',
    message: `"${doc.name}" will be permanently deleted.`,
    run: async () => {
      try {
        await api.delete(`/contracts/${contract.id}/documents/${doc.id || doc._id}`);
        toast.success('Document deleted');
        await reload();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Could not delete');
      }
    },
  });

  // Group by category
  const grouped = CATEGORIES.reduce<Record<string, any[]>>((acc, cat) => {
    const docs = documents.filter(d => d.category === cat);
    if (docs.length) acc[cat] = docs;
    return acc;
  }, {});

  return (
    <div className="space-y-4">

      {/* Upload area */}
      {canManage && (
        <div className="card space-y-3">
          <p className="font-semibold text-sm text-gray-800">Upload a document</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Category</label>
              <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{label(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Display name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="form-input" placeholder="Defaults to filename" value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
          />
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Choose file'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 ? (
        <div className="card text-center py-14">
          <p className="font-semibold text-gray-700">No documents yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload the signed contract, NDAs, SOWs and any correspondence.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, docs]) => (
          <div key={cat}>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">{label(cat)}</p>
            <div className="space-y-2">
              {docs.map((doc: any) => (
                <div key={doc.id || doc._id}
                  className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 ring-1 ring-gray-100 hover:ring-gray-200 transition-all">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 truncate font-medium">{doc.name}</p>
                    <div className="flex gap-3 mt-0.5">
                      {doc.size && <p className="text-xs text-gray-400">{fileSize(doc.size)}</p>}
                      {doc.uploaded_at && (
                        <p className="text-xs text-gray-400">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={doc.url} target="_blank" rel="noreferrer" className="btn-icon" title="Open">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                    {canManage && (
                      <button type="button" className="btn-icon" onClick={() => remove(doc)} title="Delete">
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
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
