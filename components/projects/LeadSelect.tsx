'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Props {
  value: string;
  onChange: (employeeId: string) => void;
}

/**
 * Picks the project lead from employees already on the system. The lead sees
 * the project and can file progress reports on it.
 */
export default function LeadSelect({ value, onChange }: Props) {
  const [employees, setEmployees] = useState<{ id: string; name: string; job_title?: string; user_id?: unknown }[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.get('/employees')
      .then(r => setEmployees((r.data.data || []).filter((e: { status?: string }) => e.status !== 'terminated')))
      .catch(() => setFailed(true));
  }, []);

  return (
    <div>
      <label className="form-label">Project lead</label>
      <select className="form-input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">No lead assigned</option>
        {employees.map(e => (
          <option key={e.id} value={e.id}>{e.name}{e.job_title ? ` — ${e.job_title}` : ''}{e.user_id ? '' : ' (no login)'}</option>
        ))}
      </select>
      <p className="form-hint">
        {failed
          ? 'Employees could not be loaded — your plan may not include HR.'
          : 'The lead submits progress reports. They need a user account to sign in and report.'}
      </p>
    </div>
  );
}
