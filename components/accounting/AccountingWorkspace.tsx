'use client';
import { useEffect, useState } from 'react';
import { Modal, Badge, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import { Plus, DollarSign, TrendingUp, TrendingDown, BookOpen, BookMarked, Receipt, FileText, Landmark, ArrowDownCircle, ArrowUpCircle, Edit2, Trash2, Download, Activity, Eye } from 'lucide-react';
import api from '@/lib/api';
import InvoiceModal from '@/components/InvoiceModal';
import AccountingOverviewPanel from '@/components/accounting/AccountingOverviewPanel';
import AccountingAccountsPanel from '@/components/accounting/AccountingAccountsPanel';
import AccountingExpensesPanel from '@/components/accounting/AccountingExpensesPanel';
import AccountingJournalPanel from '@/components/accounting/AccountingJournalPanel';
import AccountingReceivablesPanel from '@/components/accounting/AccountingReceivablesPanel';
import AccountingPayablesPanel from '@/components/accounting/AccountingPayablesPanel';
import AccountingCreditNotesPanel from '@/components/accounting/AccountingCreditNotesPanel';
import AccountingVendorBillsPanel from '@/components/accounting/AccountingVendorBillsPanel';
import AccountingReconciliationPanel from '@/components/accounting/AccountingReconciliationPanel';
import AccountingPlPanel from '@/components/accounting/AccountingPlPanel';
import AccountingBalanceSheetPanel from '@/components/accounting/AccountingBalanceSheetPanel';
import AccountingCashFlowPanel from '@/components/accounting/AccountingCashFlowPanel';
import AccountingBudgetPanel from '@/components/accounting/AccountingBudgetPanel';
import AccountingTaxPanel from '@/components/accounting/AccountingTaxPanel';
import HrConfirmModal from '@/components/hr/HrConfirmModal';
import type { AccountingSectionSlug } from '@/lib/accountingNav';

interface AccountingWorkspaceProps {
  section: AccountingSectionSlug;
}

export default function AccountingWorkspace({ section }: AccountingWorkspaceProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{ order: any; business: any } | null>(null);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importType, setImportType] = useState<'expenses'|'journal'>('expenses');
  const [importCsv, setImportCsv] = useState('');
  const [importing, setImporting] = useState(false);

  // Trial Balance
  const [tb, setTb] = useState<any>(null);
  const [tbLoading, setTbLoading] = useState(false);
  const [tbAsOf, setTbAsOf] = useState('');

  // Invoices
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invModal, setInvModal] = useState(false);
  const [invForm, setInvForm] = useState({ customer_name:'', customer_email:'', due_date:'', notes:'', lines:[{ description:'', quantity:'1', unit_price:'', tax_rate:'0' }] });
  const [invSaving, setInvSaving] = useState(false);
  const [payModal, setPayModal] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount:'', method:'cash', reference:'', note:'' });

  // Fiscal Periods
  const [periods, setPeriods] = useState<any[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodModal, setPeriodModal] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name:'', type:'month', start_date:'', end_date:'' });
  const [acctConfirm, setAcctConfirm] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([
        api.get('/accounts').catch(()=>({data:{data:[]}})),
        api.get('/accounting/summary').catch(()=>({data:{data:{}}})),
      ]);
      const allAccounts = a.data.data || [];
      const postingAccounts = allAccounts.filter((acc: any) => !acc.is_group);
      setAccounts(postingAccounts);
      setSummary(s.data.data||{});
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (section === 'trial-balance') loadTrialBalance(); }, [section]);
  useEffect(() => { if (section === 'invoices') loadInvoices(); }, [section]);
  useEffect(() => { if (section === 'periods') loadPeriods(); }, [section]);

  const openInvoice = async (orderId: string) => {
    try {
      const r = await api.get(`/orders/${orderId}/invoice`);
      setInvoiceData(r.data.data);
      setInvoiceModal(true);
    } catch { toast.error('Could not load invoice'); }
  };

  const seedAdvancedCoa = async () => {
    try {
      await api.post('/accounting/seed-coa');
      toast.success('Chart of accounts updated with advanced accounts');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const runDepreciation = async () => {
    setAcctConfirm({
      title: 'Run monthly depreciation?',
      message: 'Post depreciation for all active fixed assets (straight-line, default 10% annual).',
      confirmLabel: 'Run depreciation',
      action: async () => {
        const res = await api.post('/accounting/depreciation/run', { rate: 0.1 });
        toast.success(`Posted ${res.data.data.posted} depreciation entries`);
      },
    });
  };

  const parseCsvRows = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cols[i] || ''; });
      return row;
    });
  };

  const exportAccounting = async (format: 'quickbooks' | 'xero') => {
    try {
      const res = await api.get(`/accounting/export/${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${format}-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const runImport = async () => {
    const rows = parseCsvRows(importCsv);
    if (!rows.length) { toast.error('Paste CSV with a header row and at least one data row.'); return; }
    setImporting(true);
    try {
      const res = await api.post('/accounting/import', { type: importType, rows });
      toast.success(`Imported ${res.data.data.imported} record(s)`);
      setImportModal(false);
      setImportCsv('');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Import failed');
    } finally { setImporting(false); }
  };

  const loadTrialBalance = async () => {
    setTbLoading(true);
    try {
      const params = tbAsOf ? `?asOf=${tbAsOf}` : '';
      const res = await api.get(`/accounting/trial-balance${params}`);
      setTb(res.data.data);
    } finally { setTbLoading(false); }
  };

  const loadInvoices = async () => {
    setInvLoading(true);
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data.data || []);
    } finally { setInvLoading(false); }
  };

  const loadPeriods = async () => {
    setPeriodsLoading(true);
    try {
      const res = await api.get('/accounting/periods');
      setPeriods(res.data.data || []);
    } finally { setPeriodsLoading(false); }
  };

  const saveInvoice = async () => {
    setInvSaving(true);
    try {
      const lines = invForm.lines.map(l => ({
        description: l.description,
        quantity: parseFloat(l.quantity) || 1,
        unit_price: parseFloat(l.unit_price) || 0,
        tax_rate: parseFloat(l.tax_rate) || 0,
      }));
      await api.post('/invoices', { ...invForm, lines });
      setInvModal(false);
      setInvForm({ customer_name:'', customer_email:'', due_date:'', notes:'', lines:[{ description:'', quantity:'1', unit_price:'', tax_rate:'0' }] });
      toast.success('Invoice created');
      loadInvoices();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setInvSaving(false); }
  };

  const recordPayment = async () => {
    if (!payModal) return;
    setInvSaving(true);
    try {
      await api.post(`/invoices/${payModal.id}/payments`, payForm);
      setPayModal(null);
      setPayForm({ amount:'', method:'cash', reference:'', note:'' });
      toast.success('Payment recorded');
      loadInvoices();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setInvSaving(false); }
  };

  const savePeriod = async () => {
    setInvSaving(true);
    try {
      await api.post('/accounting/periods', periodForm);
      setPeriodModal(false);
      setPeriodForm({ name:'', type:'month', start_date:'', end_date:'' });
      toast.success('Period created');
      loadPeriods();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setInvSaving(false); }
  };

  const typeColors: Record<string,string> = { asset:'bg-green-100 text-green-800', liability:'bg-red-100 text-red-800', equity:'bg-blue-100 text-blue-800', revenue:'bg-purple-100 text-purple-800', expense:'bg-yellow-100 text-yellow-800' };

  return (
    <>
      {/* Section action bar */}
      <div className="flex flex-wrap justify-end gap-2 mb-4 md:mb-5">
          {section==='trial-balance' && tb && <button className="btn-secondary" onClick={() => { const rows = [['Code','Account','Type','Debit','Credit'],...(tb.accounts||[]).map((r:any)=>[r.code,r.name,r.type,r.debit_balance.toFixed(2),r.credit_balance.toFixed(2)]),['','TOTALS','',tb.totals.debit.toFixed(2),tb.totals.credit.toFixed(2)]]; const csv=rows.map(r=>r.map((c:any)=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`trial-balance-${Date.now()}.csv`; a.click(); }}><Download className="w-4 h-4" />CSV</button>}
          {section==='invoices'      && <button className="btn-primary text-xs md:text-sm" onClick={() => setInvModal(true)}><Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">New </span>Invoice</button>}
        {section==='periods'       && <button className="btn-primary text-xs md:text-sm" onClick={() => setPeriodModal(true)}><Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">New </span>Period</button>}
      </div>

      {section==='overview' && (
        <AccountingOverviewPanel onDataChange={load} onImport={() => setImportModal(true)} />
      )}

      {section==='accounts' && (
        <AccountingAccountsPanel onDataChange={load} />
      )}

      {section==='expenses' && (
        <AccountingExpensesPanel onDataChange={load} />
      )}

      {section==='ar' && (
        <AccountingReceivablesPanel onDataChange={load} />
      )}

      {section==='vendor-bills' && (
        <AccountingVendorBillsPanel onDataChange={load} />
      )}
      {section==='credit-notes' && (
        <AccountingCreditNotesPanel onDataChange={load} />
      )}

      {section==='ap' && (
        <AccountingPayablesPanel onDataChange={load} />
      )}

      {section==='reconciliation' && (
        <AccountingReconciliationPanel onDataChange={load} />
      )}

      {section==='journal' && (
        <AccountingJournalPanel onDataChange={load} />
      )}

      {section==='bs' && (
        <AccountingBalanceSheetPanel onDataChange={load} />
      )}

      {section==='cashflow' && (
        <AccountingCashFlowPanel onDataChange={load} />
      )}

      {section==='pl' && (
        <AccountingPlPanel onDataChange={load} />
      )}

      {section==='budget' && (
        <AccountingBudgetPanel onDataChange={load} />
      )}

      {section==='tax' && (
        <AccountingTaxPanel onDataChange={load} />
      )}

      {/* Trial Balance Tab */}
      {section==='trial-balance' && (
        <div className="space-y-4 md:space-y-5">
          <div className="card">
            <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3">
              <div><label className="form-label">As of Date</label><input type="date" className="form-input" value={tbAsOf} onChange={e => setTbAsOf(e.target.value)} /></div>
              <button className="btn-primary w-full sm:w-auto" onClick={loadTrialBalance} disabled={tbLoading}>{tbLoading ? 'Loading…' : 'Generate'}</button>
              {tb && <button className="btn-secondary w-full sm:w-auto" onClick={() => { setTb(null); setTbAsOf(''); }}>Clear</button>}
            </div>
          </div>
          {tbLoading && <Spinner />}
          {tb && (() => {
            const fmt = (v: number) => v.toFixed(2);
            const isBalanced = Math.abs(tb.totals.debit - tb.totals.credit) < 0.01;
            return (
              <div className="card p-0 overflow-hidden">
                <div className="text-center py-4 md:py-5 px-4 md:px-6 border-b border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">GEMS</p>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Trial Balance</h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">As at {new Date(tb.as_of).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="table-header">
                      <tr>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-left">Code</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-left">Account Name</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-left hidden md:table-cell">Type</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-right">Debit (GH₵)</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-right">Credit (GH₵)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tb.accounts.map((r: any) => (
                        <tr key={r.code} className="hover:bg-gray-50">
                          <td className="px-3 md:px-4 py-2 md:py-2.5 font-mono text-xs text-gray-500">{r.code}</td>
                          <td className="px-3 md:px-4 py-2 md:py-2.5 font-medium">{r.name}</td>
                          <td className="px-3 md:px-4 py-2 md:py-2.5 hidden md:table-cell"><span className={`badge text-xs ${typeColors[r.type]}`}>{r.type}</span></td>
                          <td className="px-3 md:px-4 py-2 md:py-2.5 text-right tabular-nums">{r.debit_balance > 0 ? fmt(r.debit_balance) : '—'}</td>
                          <td className="px-3 md:px-4 py-2 md:py-2.5 text-right tabular-nums">{r.credit_balance > 0 ? fmt(r.credit_balance) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                        <td className="px-3 md:px-4 py-2 md:py-3" colSpan={3}>TOTALS</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-right tabular-nums">{fmt(tb.totals.debit)}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-right tabular-nums">{fmt(tb.totals.credit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className={`mx-3 md:mx-4 mb-3 md:mb-4 mt-2 rounded-lg px-3 md:px-4 py-2 md:py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs md:text-sm ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className={`font-mono ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>Debit {fmt(tb.totals.debit)} = Credit {fmt(tb.totals.credit)}</span>
                  <span className={`font-bold ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>{isBalanced ? '✓ Balanced' : '✗ Unbalanced'}</span>
                </div>
              </div>
            );
          })()}
          {!tb && !tbLoading && <EmptyState message="Select a date and click Generate" icon={<BookOpen className="w-8 h-8 text-gray-300"/>} />}
        </div>
      )}

      {/* Invoices Tab */}
      {section==='invoices' && (
        <div className="space-y-4">
          {invLoading ? <Spinner /> : invoices.length === 0
            ? <EmptyState message="No invoices yet" icon={<FileText className="w-8 h-8 text-gray-300"/>} />
            : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="table-header">
                    <tr>{['Invoice #','Customer','Subtotal','Tax','Total','Amount Due','Issued','Due','Status',''].map(h=><th key={h} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoices.map((inv: any) => {
                      const statusColor: Record<string,string> = {
                        draft:'bg-gray-100 text-gray-600', sent:'bg-blue-100 text-blue-700',
                        partially_paid:'bg-yellow-100 text-yellow-700', paid:'bg-green-100 text-green-700',
                        overdue:'bg-red-100 text-red-700', void:'bg-red-50 text-red-400',
                      };
                      return (
                        <tr key={inv.id} className={`hover:bg-gray-50 ${inv.status==='void'?'opacity-50':''}`}>
                          <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs text-blue-700">{inv.invoice_number}</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 font-medium">
                            <div>{inv.customer_name}</div>
                            {inv.customer_email && <div className="text-xs text-gray-400 hidden md:block">{inv.customer_email}</div>}
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 tabular-nums hidden lg:table-cell">GH₵ {parseFloat(inv.subtotal||0).toFixed(2)}</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 tabular-nums text-gray-500 hidden lg:table-cell">GH₵ {parseFloat(inv.tax_amount||0).toFixed(2)}</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 font-semibold tabular-nums">GH₵ {parseFloat(inv.total||0).toFixed(2)}</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-red-600 tabular-nums">GH₵ {parseFloat(inv.amount_due||0).toFixed(2)}</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs text-gray-400 hidden md:table-cell">{new Date(inv.issue_date).toLocaleDateString()}</td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs text-gray-400 hidden lg:table-cell">{new Date(inv.due_date).toLocaleDateString()}</td>
                          <td className="px-3 md:px-4 py-2 md:py-3"><span className={`badge text-xs ${statusColor[inv.status]||'bg-gray-100 text-gray-600'}`}>{inv.status.replace('_',' ')}</span></td>
                          <td className="px-3 md:px-4 py-2 md:py-3">
                            <div className="flex gap-1">
                              {inv.status==='draft' && (
                                <button onClick={async () => { try { await api.patch(`/invoices/${inv.id}/send`); toast.success('Invoice sent'); loadInvoices(); } catch(e:any){ toast.error(e.response?.data?.message||'Failed'); } }} className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2 md:px-2.5 py-1 rounded-lg">Send</button>
                              )}
                              {['sent','partially_paid','overdue'].includes(inv.status) && (
                                <button onClick={() => { setPayModal(inv); setPayForm({ amount: String(inv.amount_due), method:'cash', reference:'', note:'' }); }} className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2 md:px-2.5 py-1 rounded-lg">Pay</button>
                              )}
                              {inv.payments?.length > 0 && (
                                <button onClick={() => setHistoryModal({ type:'invoice', label: inv.invoice_number, payments: inv.payments, total: inv.total, paid: inv.amount_paid })} className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded hidden md:inline-block">History</button>
                              )}
                              {['draft','sent','overdue'].includes(inv.status) && (
                                <button onClick={async () => { if (!confirm('Void this invoice?')) return; try { await api.patch(`/invoices/${inv.id}/void`); toast.success('Voided'); loadInvoices(); } catch(e:any){ toast.error(e.response?.data?.message||'Failed'); } }} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded hidden md:inline-block">Void</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fiscal Periods Tab */}
      {section==='periods' && (
        <div className="space-y-4">
          {periodsLoading ? <Spinner /> : periods.length === 0
            ? <EmptyState message="No fiscal periods defined" icon={<Landmark className="w-8 h-8 text-gray-300"/>} />
            : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="table-header">
                    <tr>{['Name','Type','Start','End','Status',''].map(h=><th key={h} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {periods.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-4 py-2 md:py-3 font-medium">{p.name}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3"><span className="badge badge-blue text-xs">{p.type}</span></td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs text-gray-500">{new Date(p.start_date).toLocaleDateString()}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs text-gray-500 hidden md:table-cell">{new Date(p.end_date).toLocaleDateString()}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <span className={`badge text-xs ${p.status==='open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <div className="flex gap-1">
                            {p.status==='open' && (
                              <button onClick={async () => { if (!confirm(`Close period "${p.name}"?`)) return; try { await api.patch(`/accounting/periods/${p.id}/close`); toast.success('Period closed'); loadPeriods(); } catch(e:any){ toast.error(e.response?.data?.message||'Failed'); } }} className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 px-2 md:px-2.5 py-1 rounded-lg">Close</button>
                            )}
                            {p.status==='closed' && (
                              <>
                                <button onClick={async () => { if (!confirm(`Reopen period "${p.name}"?`)) return; try { await api.patch(`/accounting/periods/${p.id}/reopen`); toast.success('Period reopened'); loadPeriods(); } catch(e:any){ toast.error(e.response?.data?.message||'Failed'); } }} className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2 md:px-2.5 py-1 rounded-lg">Reopen</button>
                                {p.type==='year' && (
                                  <button onClick={async () => { if (!confirm(`Post year-end closing entries for "${p.name}"? This cannot be undone.`)) return; try { await api.post(`/accounting/periods/${p.id}/year-end-close`); toast.success('Year-end closing posted'); loadPeriods(); } catch(e:any){ toast.error(e.response?.data?.message||'Failed'); } }} className="text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 px-2 md:px-2.5 py-1 rounded-lg hidden md:inline-block">Year-End Close</button>
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
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Record Payment — ${payModal?.invoice_number}`} size="sm">
        <div className="space-y-3">
          <div><label className="form-label">Amount (GH₵) *</label><input type="number" className="form-input" value={payForm.amount} onChange={e => setPayForm({...payForm,amount:e.target.value})} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="form-label">Method</label>
              <select className="form-input" value={payForm.method} onChange={e => setPayForm({...payForm,method:e.target.value})}>
                {['cash','bank_transfer','cheque','mobile_money','card'].map(m=><option key={m} value={m}>{m.replace('_',' ')}</option>)}
              </select>
            </div>
            <div><label className="form-label">Reference</label><input className="form-input" value={payForm.reference} onChange={e => setPayForm({...payForm,reference:e.target.value})} placeholder="e.g. TXN-001" /></div>
          </div>
          <div><label className="form-label">Note</label><input className="form-input" value={payForm.note} onChange={e => setPayForm({...payForm,note:e.target.value})} /></div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button className="btn-secondary w-full sm:w-auto" onClick={() => setPayModal(null)}>Cancel</button>
          <button className="btn-primary w-full sm:w-auto" onClick={recordPayment} disabled={invSaving}>{invSaving?'Saving…':'Record Payment'}</button>
        </div>
      </Modal>

      {/* New Invoice Modal */}
      <Modal open={invModal} onClose={() => setInvModal(false)} title="New Invoice" size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="form-label">Customer Name *</label><input className="form-input" value={invForm.customer_name} onChange={e => setInvForm({...invForm,customer_name:e.target.value})} /></div>
            <div><label className="form-label">Customer Email</label><input type="email" className="form-input" value={invForm.customer_email} onChange={e => setInvForm({...invForm,customer_email:e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="form-label">Due Date *</label><input type="date" className="form-input" value={invForm.due_date} onChange={e => setInvForm({...invForm,due_date:e.target.value})} /></div>
            <div><label className="form-label">Notes</label><input className="form-input" value={invForm.notes} onChange={e => setInvForm({...invForm,notes:e.target.value})} /></div>
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Line Items</h4>
              <button className="btn-secondary py-1 text-xs" onClick={() => setInvForm({...invForm,lines:[...invForm.lines,{description:'',quantity:'1',unit_price:'',tax_rate:'0'}]})}><Plus className="w-3 h-3"/>Add Line</button>
            </div>
            <div className="space-y-2">
              {invForm.lines.map((line,i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className="form-input col-span-12 md:col-span-5" placeholder="Description" value={line.description} onChange={e => { const l=[...invForm.lines]; l[i]={...l[i],description:e.target.value}; setInvForm({...invForm,lines:l}); }} />
                  <input type="number" className="form-input col-span-3 md:col-span-2" placeholder="Qty" value={line.quantity} onChange={e => { const l=[...invForm.lines]; l[i]={...l[i],quantity:e.target.value}; setInvForm({...invForm,lines:l}); }} />
                  <input type="number" className="form-input col-span-3 md:col-span-2" placeholder="Unit Price" value={line.unit_price} onChange={e => { const l=[...invForm.lines]; l[i]={...l[i],unit_price:e.target.value}; setInvForm({...invForm,lines:l}); }} />
                  <input type="number" className="form-input col-span-3 md:col-span-2" placeholder="Tax %" value={line.tax_rate} onChange={e => { const l=[...invForm.lines]; l[i]={...l[i],tax_rate:e.target.value}; setInvForm({...invForm,lines:l}); }} />
                  <button className="col-span-3 md:col-span-1 p-1.5 hover:bg-red-50 rounded text-red-400" onClick={() => setInvForm({...invForm,lines:invForm.lines.filter((_,j)=>j!==i)})} disabled={invForm.lines.length===1}><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2 text-sm font-semibold text-gray-700">
              Total: GH₵ {invForm.lines.reduce((s,l)=>{ const t=parseFloat(l.quantity||'0')*parseFloat(l.unit_price||'0'); return s+t+(t*(parseFloat(l.tax_rate||'0')/100)); },0).toFixed(2)}
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button className="btn-secondary w-full sm:w-auto" onClick={() => setInvModal(false)}>Cancel</button>
          <button className="btn-primary w-full sm:w-auto" onClick={saveInvoice} disabled={invSaving}>{invSaving?'Saving…':'Create Invoice'}</button>
        </div>
      </Modal>

      {/* New Period Modal */}
      <Modal open={periodModal} onClose={() => setPeriodModal(false)} title="New Fiscal Period" size="sm">
        <div className="space-y-3">
          <div><label className="form-label">Name *</label><input className="form-input" value={periodForm.name} onChange={e => setPeriodForm({...periodForm,name:e.target.value})} placeholder="e.g. Q1 2025" /></div>
          <div><label className="form-label">Type</label>
            <select className="form-input" value={periodForm.type} onChange={e => setPeriodForm({...periodForm,type:e.target.value})}>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="form-label">Start Date *</label><input type="date" className="form-input" value={periodForm.start_date} onChange={e => setPeriodForm({...periodForm,start_date:e.target.value})} /></div>
            <div><label className="form-label">End Date *</label><input type="date" className="form-input" value={periodForm.end_date} onChange={e => setPeriodForm({...periodForm,end_date:e.target.value})} /></div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button className="btn-secondary w-full sm:w-auto" onClick={() => setPeriodModal(false)}>Cancel</button>
          <button className="btn-primary w-full sm:w-auto" onClick={savePeriod} disabled={invSaving}>{invSaving?'Saving…':'Create Period'}</button>
        </div>
      </Modal>

      {/* Payment History Modal */}
      <Modal open={!!historyModal} onClose={() => setHistoryModal(null)} title={`Payment History — ${historyModal?.label}`} size="xl">
        {historyModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="text-xs text-gray-500 mb-1">Total</div>
                <div className="font-semibold">GH₵ {parseFloat(historyModal.total||0).toFixed(2)}</div>
              </div>
              <div className="bg-green-50 rounded-xl px-4 py-3">
                <div className="text-xs text-green-600 mb-1">Total Paid</div>
                <div className="font-semibold text-green-700">GH₵ {parseFloat(historyModal.paid||0).toFixed(2)}</div>
              </div>
              <div className="bg-red-50 rounded-xl px-4 py-3">
                <div className="text-xs text-red-500 mb-1">Outstanding</div>
                <div className="font-semibold text-red-600">GH₵ {Math.max(0, parseFloat(historyModal.total||0) - parseFloat(historyModal.paid||0)).toFixed(2)}</div>
              </div>
            </div>
            {historyModal.payments?.length > 0 ? (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>
                      <th className="px-4 py-2.5 text-left">#</th>
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-left">Amount</th>
                      <th className="px-4 py-2.5 text-left">Method</th>
                      <th className="px-4 py-2.5 text-left">Reference</th>
                      <th className="px-4 py-2.5 text-left">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {historyModal.payments.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">
                          {p.date ? new Date(p.date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                          <div className="text-gray-400">{p.date ? new Date(p.date).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : ''}</div>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-green-700">GH₵ {parseFloat(p.amount||0).toFixed(2)}</td>
                        <td className="px-4 py-2.5"><span className="badge bg-blue-50 text-blue-700">{(p.method||'cash').replace('_',' ')}</span></td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{p.reference || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{p.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                      <td className="px-4 py-2.5" colSpan={2}>Total Paid</td>
                      <td className="px-4 py-2.5 text-green-700">GH₵ {historyModal.payments.reduce((s:number,p:any)=>s+parseFloat(p.amount||0),0).toFixed(2)}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No payments recorded yet.</p>
            )}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button className="btn-secondary" onClick={() => setHistoryModal(null)}>Close</button>
        </div>
      </Modal>

      <Modal open={importModal} onClose={() => setImportModal(false)} title="Import CSV">
        <div className="space-y-4">
          <div>
            <label className="form-label">Import type</label>
            <select className="form-input" value={importType} onChange={e => setImportType(e.target.value as 'expenses'|'journal')}>
              <option value="expenses">Expenses — columns: title, amount, category, expense_date, description</option>
              <option value="journal">Journal — columns: description, account_code, debit, credit, entry_date, reference</option>
            </select>
          </div>
          <div>
            <label className="form-label">CSV data</label>
            <textarea className="form-input font-mono text-xs" rows={8} placeholder={importType === 'expenses' ? 'title,amount,category,expense_date\nRent,500,Rent,2025-01-15' : 'description,account_code,debit,credit,reference\nOffice supplies,5200,50,0,EXP-001'} value={importCsv} onChange={e => setImportCsv(e.target.value)} />
          </div>
          <button className="btn-primary w-full" onClick={runImport} disabled={importing}>{importing ? 'Importing…' : 'Run Import'}</button>
        </div>
      </Modal>

      <InvoiceModal
        open={invoiceModal}
        onClose={() => { setInvoiceModal(false); setInvoiceData(null); }}
        order={invoiceData?.order}
        business={invoiceData?.business}
      />

      <HrConfirmModal
        open={!!acctConfirm}
        title={acctConfirm?.title || ''}
        message={acctConfirm?.message || ''}
        confirmLabel={acctConfirm?.confirmLabel}
        saving={saving}
        onClose={() => setAcctConfirm(null)}
        onConfirm={async () => { await acctConfirm?.action(); setAcctConfirm(null); }}
      />
    </>
  );
}
