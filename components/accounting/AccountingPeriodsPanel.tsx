'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Landmark, Calendar, Lock, Unlock } from 'lucide-react';
import { EmptyState, Modal, Spinner, StatCard, toast } from '@/components/ui';
import api from '@/lib/api';

interface Props {
  onDataChange?: () => void;
}

export default function AccountingPeriodsPanel({ onDataChange }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'month', start_date: '', end_date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounting/periods');
      setData(res.data.data);
    } catch {
      toast.error('Could not load fiscal periods');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = data?.rows || data?.periods || [];
  const summary = data?.summary || {};

  const savePeriod = async () => {
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      toast.error('Name, start date, and end date are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/accounting/periods', form);
      toast.success('Fiscal period created');
      setModalOpen(false);
      setForm({ name: '', type: 'month', start_date: '', end_date: '' });
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const closePeriod = async (p: any) => {
    if (!confirm(`Close period "${p.name}"? No new entries can be posted to closed periods.`)) return;
    try {
      await api.patch(`/accounting/periods/${p.id}/close`);
      toast.success('Period closed');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Close failed');
    }
  };

  const reopenPeriod = async (p: any) => {
    if (!confirm(`Reopen period "${p.name}"?`)) return;
    try {
      await api.patch(`/accounting/periods/${p.id}/reopen`);
      toast.success('Period reopened');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Reopen failed');
    }
  };

  const yearEndClose = async (p: any) => {
    if (!confirm(`Post year-end closing entries for "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.post(`/accounting/periods/${p.id}/year-end-close`);
      toast.success('Year-end closing posted');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Year-end close failed');
    }
  };

  return (
    <div className={`space-y-5 relative ${loading && data ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">Fiscal periods</h3>
            {summary.current_open && (
              <p className="text-xs text-gray-500 mt-1">
                Current open period: <strong>{summary.current_open.name}</strong>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-xs" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button type="button" className="btn-primary text-xs" onClick={() => setModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> New period
            </button>
          </div>
        </div>
      </div>

      {loading && !data && <Spinner />}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Total periods" value={String(summary.total ?? 0)} icon={<Calendar className="w-5 h-5 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" />
            <StatCard label="Open" value={String(summary.open ?? 0)} icon={<Unlock className="w-5 h-5 text-green-600" />} color="bg-green-50" />
            <StatCard label="Closed" value={String(summary.closed ?? 0)} icon={<Lock className="w-5 h-5 text-gray-600" />} color="bg-gray-50" />
          </div>

          {rows.length === 0 ? (
            <EmptyState message="No fiscal periods defined yet" icon={<Landmark className="w-8 h-8 text-gray-300" />} />
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="table-header">
                    <tr>{['Name', 'Type', 'Start', 'End', 'Status', ''].map((h) => (
                      <th key={h} className="px-3 md:px-4 py-2 text-left">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50/80">
                        <td className="px-3 md:px-4 py-2 font-medium">{p.name}</td>
                        <td className="px-3 md:px-4 py-2"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#0D3B6E]/8 text-[#0D3B6E]">{p.type}</span></td>
                        <td className="px-3 md:px-4 py-2 text-xs text-gray-500">{new Date(p.start_date).toLocaleDateString()}</td>
                        <td className="px-3 md:px-4 py-2 text-xs text-gray-500 hidden md:table-cell">{new Date(p.end_date).toLocaleDateString()}</td>
                        <td className="px-3 md:px-4 py-2">
                          <span className={`badge text-xs ${p.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                        </td>
                        <td className="px-3 md:px-4 py-2">
                          <div className="flex flex-wrap gap-1 justify-end">
                            {p.status === 'open' && (
                              <button type="button" onClick={() => closePeriod(p)} className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 px-2 py-1 rounded-lg">Close</button>
                            )}
                            {p.status === 'closed' && (
                              <>
                                <button type="button" onClick={() => reopenPeriod(p)} className="text-xs font-semibold text-white bg-[#0D3B6E] hover:bg-[#1A5294] px-2 py-1 rounded-lg">Reopen</button>
                                {p.type === 'year' && (
                                  <button type="button" onClick={() => yearEndClose(p)} className="text-xs font-semibold text-white bg-[#0D3B6E] hover:bg-[#1A5294] px-2 py-1 rounded-lg hidden md:inline-block">Year-end close</button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New fiscal period" size="sm">
        <div className="space-y-3">
          <div><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q1 2025" /></div>
          <div>
            <label className="form-label">Type</label>
            <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="form-label">Start date *</label><input type="date" className="form-input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><label className="form-label">End date *</label><input type="date" className="form-input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={savePeriod} disabled={saving}>{saving ? 'Saving…' : 'Create period'}</button>
        </div>
      </Modal>
    </div>
  );
}
