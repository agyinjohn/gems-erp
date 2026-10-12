'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { initials } from './reporting';

interface Props { value: string[]; onChange: (ids: string[]) => void; leadId?: string }

/** The people working on the project, picked from employees already on the system. */
export default function TeamSelect({ value, onChange, leadId }: Props) {
  const [employees, setEmployees] = useState<{ id: string; name: string; job_title?: string; status?: string }[]>([]);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/employees')
      .then(r => setEmployees((r.data.data || []).filter((e: { status?: string }) => e.status !== 'terminated')))
      .catch(() => setFailed(true));
  }, []);

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  const shown = employees.filter(e => e.id !== leadId && (!query || e.name.toLowerCase().includes(query.toLowerCase())));

  return (
    <div>
      <label className="form-label">Team <span className="text-gray-400 font-normal">({value.filter(v => v !== leadId).length} selected)</span></label>
      {failed ? (
        <p className="form-hint">Employees could not be loaded — your plan may not include HR.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {employees.length > 6 && (
            <input className="w-full px-3 py-2 text-sm border-b border-gray-100 outline-none" placeholder="Search people…" value={query} onChange={e => setQuery(e.target.value)} />
          )}
          <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
            {shown.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No employees to add</p>}
            {shown.map(e => (
              <label key={e.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" className="w-4 h-4" checked={value.includes(e.id)} onChange={() => toggle(e.id)} />
                <span className="w-6 h-6 rounded-full bg-[#0D3B6E] text-white text-[10px] font-bold flex items-center justify-center">{initials(e.name)}</span>
                <span className="text-sm text-gray-800">{e.name}{e.job_title && <span className="text-gray-400"> — {e.job_title}</span>}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <p className="form-hint">Team members can see this project and be assigned its tasks.</p>
    </div>
  );
}
