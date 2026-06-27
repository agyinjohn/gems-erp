'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import api from '@/lib/api';
import { toast } from '@/components/ui';

interface EmployeeDocumentsProps {
  employeeId: string;
  documents: any[];
  onChange: () => void;
}

export default function EmployeeDocuments({ employeeId, documents, onChange }: EmployeeDocumentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('contract');
  const [docName, setDocName] = useState('');

  const upload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', docName.trim() || file.name);
    formData.append('type', docType);
    setUploading(true);
    try {
      await api.post(`/employees/${employeeId}/documents`, formData);
      toast.success('Document uploaded');
      setDocName('');
      onChange();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (docId: string) => {
    try {
      await api.delete(`/employees/${employeeId}/documents/${docId}`);
      toast.success('Document removed');
      onChange();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="form-label">Document name</label>
          <input className="form-input" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Employment contract" />
        </div>
        <div>
          <label className="form-label">Type</label>
          <select className="form-input" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {['contract', 'id_card', 'passport', 'certificate', 'other'].map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="btn-secondary w-full"
      >
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload document (PDF or image)</>}
      </button>

      {documents?.length > 0 ? (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {documents.map((doc: any) => (
            <li key={doc._id || doc.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{doc.name}</div>
                <div className="text-xs text-gray-400 capitalize">{(doc.type || 'other').replace(/_/g, ' ')}</div>
              </div>
              <a href={doc.file} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View</a>
              <button type="button" onClick={() => remove(doc._id || doc.id)} className="p-1 text-red-400 hover:bg-red-50 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400 text-center py-2">No documents yet</p>
      )}
    </div>
  );
}
