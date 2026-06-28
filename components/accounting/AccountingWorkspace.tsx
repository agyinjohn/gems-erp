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
import AccountingCreditNotesTab from '@/components/accounting/AccountingCreditNotesTab';
import AccountingVendorBillsTab from '@/components/accounting/AccountingVendorBillsTab';
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
  const [error, setError] = useState('');
  const [bankStatement, setBankStatement] = useState('');
  const [reconResult, setReconResult] = useState<any>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconError, setReconError] = useState('');
  const [invoiceData, setInvoiceData] = useState<{ order: any; business: any } | null>(null);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [pl, setPl] = useState<any>(null);
  const [plLoading, setPlLoading] = useState(false);
  const [plFrom, setPlFrom] = useState('');
  const [plTo, setPlTo] = useState('');
  const [plSource, setPlSource] = useState<'orders'|'gl'>('gl');
  const [importModal, setImportModal] = useState(false);
  const [importType, setImportType] = useState<'expenses'|'journal'>('expenses');
  const [importCsv, setImportCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [bs, setBs] = useState<any>(null);
  const [bsLoading, setBsLoading] = useState(false);
  const [cf, setCf] = useState<any>(null);
  const [cfLoading, setCfLoading] = useState(false);
  const [cfFrom, setCfFrom] = useState('');
  const [cfTo, setCfTo] = useState('');
  const [budgetData, setBudgetData] = useState<any>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetPeriod, setBudgetPeriod] = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  });
  const [budgetPeriodType, setBudgetPeriodType] = useState('monthly');
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category:'', amount:'', period:'', period_type:'monthly' });
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [taxModal, setTaxModal] = useState<'add'|'edit'|null>(null);
  const [selectedTax, setSelectedTax] = useState<any>(null);
  const [taxForm, setTaxForm] = useState({ name:'', rate:'', applies_to:'both', is_active:true });
  const [vatReturn, setVatReturn] = useState<any>(null);
  const [vatLoading, setVatLoading] = useState(false);
  const [vatFrom, setVatFrom] = useState('');
  const [vatTo, setVatTo] = useState('');

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
      const [a, s, taxRes] = await Promise.all([
        api.get('/accounts').catch(()=>({data:{data:[]}})),
        api.get('/accounting/summary').catch(()=>({data:{data:{}}})),
        api.get('/tax-rates').catch(()=>({data:{data:[]}})),
      ]);
      const allAccounts = a.data.data || [];
      const postingAccounts = allAccounts.filter((acc: any) => !acc.is_group);
      setAccounts(postingAccounts);
      setSummary(s.data.data||{});
      setTaxRates(taxRes.data.data||[]);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (section === 'bs' && !bs) loadBs(); }, [section]);
  useEffect(() => { if (section === 'budget') loadBudget(); }, [section]);
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

  const parseBankStatement = (text: string) => {
    return text.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
      // Extract last number on the line as the amount (avoids matching dates)
      const nums = line.match(/[-+]?\d+(?:\.\d+)?/g) || [];
      const amount = nums.length ? parseFloat(nums[nums.length - 1]) : null;
      // Extract date (YYYY-MM-DD or DD/MM/YYYY)
      const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/);
      const date = dateMatch ? dateMatch[0] : '';
      // Description = everything between date and amount
      const desc = line.replace(dateMatch?.[0] || '', '').replace(String(amount), '').replace(/[+\-]/, '').trim();
      return { id: i, date, description: desc || line, amount };
    }).filter(l => l.amount !== null);
  };

  const [parsedLines, setParsedLines] = useState<any[]>([]);

  const handleStatementChange = (text: string) => {
    setBankStatement(text);
    setParsedLines(parseBankStatement(text));
    setReconResult(null);
  };

  const runReconciliation = async () => {
    if (!parsedLines.length) { setReconError('No valid lines parsed from statement.'); return; }
    setReconLoading(true); setReconError('');
    try {
      const res = await api.post('/accounting/reconcile', { lines: parsedLines });
      setReconResult(res.data.data);
    } catch (e: any) { setReconError(e.response?.data?.message || 'Reconciliation failed.'); }
    finally { setReconLoading(false); }
  };

  const saveReconciliation = async () => {
    if (!reconResult || !parsedLines.length) return;
    try {
      await api.post('/accounting/reconciliations', {
        statement_date: new Date().toISOString().slice(0, 10),
        opening_balance: reconResult.glTotal - reconResult.bankTotal + reconResult.difference,
        closing_balance: reconResult.bankTotal,
        bank_lines: parsedLines.map((line, idx) => ({
          date: line.date,
          description: line.description,
          amount: line.amount,
          matched: reconResult.matched.some((m: any) => m.bank === line || m.bank?.description === line.description),
        })),
        matched_pairs: reconResult.matched.map((m: any) => ({ bank_line_id: m.bank?.description, gl_line_id: m.gl?.id })),
      });
      toast.success('Reconciliation session saved');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Save failed'); }
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

  const loadPl = async () => {
    setPlLoading(true);
    try {
      const params = new URLSearchParams();
      if (plFrom) params.append('from', plFrom);
      if (plTo) params.append('to', plTo);
      if (plSource === 'orders') params.append('source', 'orders');
      const res = await api.get(`/accounting/pl?${params.toString()}`);
      setPl(res.data.data);
    } finally { setPlLoading(false); }
  };

  const loadBs = async () => {
    setBsLoading(true);
    try {
      const res = await api.get('/accounting/balance-sheet');
      setBs(res.data.data);
    } finally { setBsLoading(false); }
  };

  const loadCf = async () => {
    setCfLoading(true);
    try {
      const params = new URLSearchParams();
      if (cfFrom) params.append('from', cfFrom);
      if (cfTo)   params.append('to', cfTo);
      const res = await api.get(`/accounting/cashflow?${params.toString()}`);
      setCf(res.data.data);
    } finally { setCfLoading(false); }
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

  const importReconcileCsv = async () => {
    if (!bankStatement.trim()) { toast.error('Paste bank CSV first'); return; }
    const rows = bankStatement.trim().split('\n').slice(1).map(line => {
      const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
      return { date: parts[0], description: parts[1], amount: parts[2] };
    }).filter(r => r.amount);
    setReconLoading(true);
    try {
      const res = await api.post('/accounting/reconcile/import', { rows });
      setReconResult(res.data.data);
      setParsedLines(rows.map((r, i) => ({ ...r, id: i, amount: parseFloat(r.amount) })));
      toast.success(`Imported ${res.data.data.imported} bank lines`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Import failed');
    } finally { setReconLoading(false); }
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

  const exportCSV = (filename: string, rows: string[][]) => {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  const exportPlCsv = () => {
    if (!pl) return;
    const rows = [
      ['P&L Report', plSource === 'gl' ? 'GL-based' : 'Orders-based', plFrom || 'All time', plTo || ''],
      [],
      ['Metric', 'Amount (GH₵)'],
      ['Revenue', pl.revenue],
      ['Gross Profit', pl.gross_profit],
      ['Total Expenses', pl.total_expenses],
      ['Net Profit', pl.net_profit],
      [],
      ['Category', 'Amount (GH₵)'],
      ...(pl.expenses_by_category?.map((c:any) => [c.category, c.total]) || []),
    ];
    exportCSV(`pl-report-${plSource}-${Date.now()}.csv`, rows);
  };

  const exportBsCsv = () => {
    if (!bs) return;
    const fmt = (v: any) => parseFloat(v||0).toFixed(2);
    const rows = [
      ['Balance Sheet', new Date().toLocaleDateString()],
      [],
      ['ASSETS', ''],
      ['Cash & Bank',           fmt(bs.assets.cash)],
      ['Accounts Receivable',   fmt(bs.assets.accounts_receivable)],
      ['Inventory',             fmt(bs.assets.inventory)],
      ['Total Current Assets',  fmt(bs.assets.total_current)],
      ['Total Assets',          fmt(bs.assets.total)],
      [],
      ['LIABILITIES', ''],
      ['Accounts Payable',          fmt(bs.liabilities.accounts_payable)],
      ['VAT Payable',               fmt(bs.liabilities.vat_payable)],
      ['Total Current Liabilities', fmt(bs.liabilities.total_current)],
      ['Total Liabilities',         fmt(bs.liabilities.total)],
      [],
      ['EQUITY', ''],
      ["Owner's Equity",       fmt(bs.equity.owner_equity)],
      ['Retained Earnings',    fmt(bs.equity.retained_earnings)],
      ['Current Net Income',   fmt(bs.equity.current_net_income)],
      ['Total Equity',         fmt(bs.equity.total)],
    ];
    exportCSV(`balance-sheet-${Date.now()}.csv`, rows);
  };

  const exportCfCsv = () => {
    if (!cf) return;
    const fmt = (v: any) => parseFloat(v||0).toFixed(2);
    const rows = [
      ['Cash Flow Statement', cfFrom || 'All time', cfTo || ''],
      [],
      ['OPERATING ACTIVITIES', ''],
      ['Cash from Sales', fmt(cf.operating.cash_from_sales)],
      ['Cash Paid for Expenses', fmt(cf.operating.cash_paid_expenses)],
      ['Net Operating Cash Flow', fmt(cf.operating.net)],
      [],
      ['INVESTING ACTIVITIES', ''],
      ['Net Investing Cash Flow', fmt(cf.investing.net)],
      [],
      ['FINANCING ACTIVITIES', ''],
      ['Net Financing Cash Flow', fmt(cf.financing.net)],
      [],
      ['NET CHANGE IN CASH', fmt(cf.net_change)],
      ['CLOSING CASH BALANCE', fmt(cf.closing_balance)],
    ];
    exportCSV(`cashflow-${Date.now()}.csv`, rows);
  };

  const printReport = (title: string, contentId: string) => {
    const el = document.getElementById(contentId);
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<html><head><title>${title}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:13px;padding:32px;color:#111;}table{width:100%;border-collapse:collapse;}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #eee;}th{background:#f5f5f5;font-weight:600;}.text-right{text-align:right;}.font-bold{font-weight:700;}.text-gray{color:#666;}.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin:20px 0 8px;border-bottom:2px solid #ddd;padding-bottom:4px;}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const loadBudget = async () => {
    setBudgetLoading(true);
    try {
      const res = await api.get(`/budgets/vs-actual?period=${budgetPeriod}&period_type=${budgetPeriodType}`);
      setBudgetData(res.data.data);
    } finally { setBudgetLoading(false); }
  };

  const saveBudget = async () => {
    setSaving(true);
    try {
      const payload = { ...budgetForm, period: budgetPeriod, period_type: budgetPeriodType };
      if (editingBudget) await api.put(`/budgets/${editingBudget.budget_id}`, { amount: budgetForm.amount });
      else await api.post('/budgets', payload);
      setBudgetModal(false); setEditingBudget(null);
      toast.success('Budget saved'); loadBudget();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const deleteBudget = async (id: string) => {
    if (!confirm('Remove this budget?')) return;
    await api.delete(`/budgets/${id}`);
    toast.success('Removed'); loadBudget();
  };

  const exportBudgetCsv = () => {
    if (!budgetData) return;
    const rows = [
      ['Budget vs Actual', budgetData.period],
      ['Category','Budget (GH₵)','Actual (GH₵)','Variance (GH₵)','% Used'],
      ...budgetData.rows.map((r:any) => [r.category, r.budgeted.toFixed(2), r.actual.toFixed(2), r.variance.toFixed(2), r.pct !== null ? r.pct.toFixed(1)+'%' : 'N/A']),
      [],
      ['TOTAL', budgetData.totals.budgeted.toFixed(2), budgetData.totals.actual.toFixed(2), budgetData.totals.variance.toFixed(2)],
    ];
    exportCSV(`budget-vs-actual-${budgetData.period}.csv`, rows);
  };

  const saveTax = async () => {
    setSaving(true); setError('');
    try {
      if (selectedTax) await api.put(`/tax-rates/${selectedTax.id}`, taxForm);
      else await api.post('/tax-rates', taxForm);
      setTaxModal(null);
      toast.success('Saved successfully');
      load();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const deleteTax = async (id: string) => {
    if (!confirm('Delete this tax rate?')) return;
    await api.delete(`/tax-rates/${id}`);
    toast.success('Deleted successfully');
    load();
  };

  const openAddTax = () => { setSelectedTax(null); setTaxForm({ name:'', rate:'', applies_to:'both', is_active:true }); setError(''); setTaxModal('add'); };
  const openEditTax = (t: any) => { setSelectedTax(t); setTaxForm({ name:t.name, rate:String(t.rate), applies_to:t.applies_to, is_active:t.is_active }); setError(''); setTaxModal('edit'); };

  const loadVatReturn = async () => {
    setVatLoading(true);
    try {
      const params = new URLSearchParams();
      if (vatFrom) params.append('from', vatFrom);
      if (vatTo)   params.append('to', vatTo);
      const res = await api.get(`/accounting/vat-return?${params.toString()}`);
      setVatReturn(res.data.data);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to load VAT return'); }
    finally { setVatLoading(false); }
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
          {section==='tax'          && <button className="btn-primary text-xs md:text-sm" onClick={openAddTax}><Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Add </span>Tax</button>}
          {section==='pl'           && pl && <div className="flex gap-2"><button className="btn-secondary text-xs md:text-sm" onClick={exportPlCsv}><Download className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Export </span>CSV</button><button className="btn-secondary text-xs md:text-sm" onClick={() => printReport('P&L Report','pl-print')}><Download className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Print/</span>PDF</button></div>}
          {section==='bs'           && bs && <div className="flex gap-2"><button className="btn-secondary text-xs md:text-sm" onClick={exportBsCsv}><Download className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Export </span>CSV</button><button className="btn-secondary text-xs md:text-sm" onClick={() => printReport('Balance Sheet','bs-print')}><Download className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Print/</span>PDF</button></div>}
          {section==='cashflow'     && cf && <div className="flex gap-2"><button className="btn-secondary text-xs md:text-sm" onClick={exportCfCsv}><Download className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Export </span>CSV</button><button className="btn-secondary text-xs md:text-sm" onClick={() => printReport('Cash Flow Statement','cf-print')}><Download className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Print/</span>PDF</button></div>}
          {section==='budget'       && <div className="flex gap-2">{budgetData && <button className="btn-secondary text-xs md:text-sm" onClick={exportBudgetCsv}><Download className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Export </span>CSV</button>}<button className="btn-primary text-xs md:text-sm" onClick={() => { setEditingBudget(null); setBudgetForm({ category:'', amount:'', period:budgetPeriod, period_type:budgetPeriodType }); setBudgetModal(true); }}><Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Set </span>Budget</button></div>}
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

      {section==='vendor-bills' && <AccountingVendorBillsTab accounts={accounts} />}
      {section==='credit-notes' && <AccountingCreditNotesTab />}

      {section==='ap' && (
        <AccountingPayablesPanel onDataChange={load} />
      )}

      {/* Reconciliation Tab */}
      {section==='reconciliation' && (
        <div className="space-y-4 md:space-y-6">
          {/* Input */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-1">Bank Reconciliation</h3>
            <p className="text-xs md:text-sm text-gray-500 mb-4">Paste your bank statement below. Each line should contain a date, description, and amount. The last number on each line is used as the amount.</p>
            <p className="text-xs text-gray-400 mb-3 font-mono">e.g. &nbsp; 2024-01-15 &nbsp; Sales receipt &nbsp; 5000.00 &nbsp;&nbsp;|&nbsp;&nbsp; 2024-01-16 &nbsp; Supplier payment &nbsp; -1200.00</p>
            <p className="text-xs text-gray-500 mb-3">Or upload CSV with columns: date, description, amount</p>
            <textarea
              className="form-input font-mono text-xs"
              rows={7}
              placeholder={`2024-01-15  Sales receipt  5000.00\n2024-01-16  Supplier payment  -1200.00\n2024-01-17  Office rent  -4500.00`}
              value={bankStatement}
              onChange={e => handleStatementChange(e.target.value)}
            />
            {parsedLines.length > 0 && (
              <div className="mb-3 text-xs text-gray-500">{parsedLines.length} line{parsedLines.length !== 1 ? 's' : ''} parsed — totalling <span className="font-semibold text-gray-700">GH₵ {parsedLines.reduce((s,l)=>s+l.amount,0).toFixed(2)}</span></div>
            )}
            {reconError && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{reconError}</div>}
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="btn-primary w-full sm:w-auto" onClick={runReconciliation} disabled={reconLoading || !parsedLines.length}>
                {reconLoading ? 'Reconciling…' : 'Run Reconciliation'}
              </button>
              <button className="btn-secondary w-full sm:w-auto" onClick={importReconcileCsv} disabled={reconLoading || !bankStatement.trim()}>
                Import CSV & Reconcile
              </button>
              {reconResult && <button className="btn-secondary w-full sm:w-auto" onClick={saveReconciliation}>Save session</button>}
              {reconResult && <button className="btn-secondary w-full sm:w-auto" onClick={() => { setReconResult(null); setBankStatement(''); setParsedLines([]); }}>Clear</button>}
            </div>
          </div>

          {/* Results */}
          {reconResult && (
            <div className="space-y-4 md:space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="card bg-blue-50 border-blue-100">
                  <div className="text-xs text-blue-600 font-medium mb-1">Bank Statement Total</div>
                  <div className="text-xl font-bold text-blue-800">GH₵ {reconResult.bankTotal.toFixed(2)}</div>
                  <div className="text-xs text-blue-500 mt-1">{parsedLines.length} lines</div>
                </div>
                <div className="card bg-green-50 border-green-100">
                  <div className="text-xs text-green-600 font-medium mb-1">System GL Total (Cash)</div>
                  <div className="text-xl font-bold text-green-800">GH₵ {reconResult.glTotal.toFixed(2)}</div>
                  <div className="text-xs text-green-500 mt-1">Cash & Bank account</div>
                </div>
                <div className={`card ${reconResult.isBalanced ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className={`text-xs font-medium mb-1 ${reconResult.isBalanced ? 'text-green-600' : 'text-red-600'}`}>Difference</div>
                  <div className={`text-xl font-bold ${reconResult.isBalanced ? 'text-green-800' : 'text-red-800'}`}>GH₵ {reconResult.difference.toFixed(2)}</div>
                  <div className={`text-xs mt-1 ${reconResult.isBalanced ? 'text-green-500' : 'text-red-500'}`}>{reconResult.isBalanced ? '✓ Balanced' : 'Discrepancy'}</div>
                </div>
                <div className="card bg-gray-50">
                  <div className="text-xs text-gray-500 font-medium mb-1">Matched</div>
                  <div className="text-xl font-bold text-gray-800">{reconResult.matched.length} <span className="text-sm font-normal text-gray-400">/ {parsedLines.length}</span></div>
                  <div className="text-xs text-gray-400 mt-1">{reconResult.unmatchedBank.length} unmatched bank · {reconResult.unmatchedGl.length} unmatched GL</div>
                </div>
              </div>

              {/* Matched transactions */}
              {reconResult.matched.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-3 md:px-4 py-3 border-b bg-green-50 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    <span className="font-semibold text-xs md:text-sm text-green-800">Matched Transactions ({reconResult.matched.length})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="table-header">
                        <tr>
                          <th className="px-3 md:px-4 py-2 text-left">Bank Date</th>
                          <th className="px-3 md:px-4 py-2 text-left">Bank Description</th>
                          <th className="px-3 md:px-4 py-2 text-left hidden md:table-cell">GL Reference</th>
                          <th className="px-3 md:px-4 py-2 text-left hidden lg:table-cell">GL Description</th>
                          <th className="px-3 md:px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {reconResult.matched.map((m: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 md:px-4 py-2 text-xs text-gray-500">{m.bank.date || '—'}</td>
                            <td className="px-3 md:px-4 py-2 text-gray-700 max-w-xs truncate">{m.bank.description}</td>
                            <td className="px-3 md:px-4 py-2 font-mono text-xs text-blue-600 hidden md:table-cell">{m.gl.reference}</td>
                            <td className="px-3 md:px-4 py-2 text-gray-500 max-w-xs truncate hidden lg:table-cell">{m.gl.description}</td>
                            <td className={`px-3 md:px-4 py-2 text-right font-semibold ${m.bank.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>GH₵ {parseFloat(m.bank.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unmatched bank lines */}
              {reconResult.unmatchedBank.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-3 md:px-4 py-3 border-b bg-yellow-50 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                    <span className="font-semibold text-xs md:text-sm text-yellow-800">In Bank — Not in System ({reconResult.unmatchedBank.length})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="table-header"><tr><th className="px-3 md:px-4 py-2 text-left">Date</th><th className="px-3 md:px-4 py-2 text-left">Description</th><th className="px-3 md:px-4 py-2 text-right">Amount</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {reconResult.unmatchedBank.map((l: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 md:px-4 py-2 text-xs text-gray-500">{l.date || '—'}</td>
                            <td className="px-3 md:px-4 py-2 text-gray-700">{l.description}</td>
                            <td className={`px-3 md:px-4 py-2 text-right font-semibold ${l.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>GH₵ {parseFloat(l.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unmatched GL lines */}
              {reconResult.unmatchedGl.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-3 md:px-4 py-3 border-b bg-red-50 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    <span className="font-semibold text-xs md:text-sm text-red-800">In System — Not in Bank ({reconResult.unmatchedGl.length})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="table-header"><tr><th className="px-3 md:px-4 py-2 text-left">Date</th><th className="px-3 md:px-4 py-2 text-left">Reference</th><th className="px-3 md:px-4 py-2 text-left hidden md:table-cell">Description</th><th className="px-3 md:px-4 py-2 text-right">Amount</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {reconResult.unmatchedGl.map((l: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 md:px-4 py-2 text-xs text-gray-500">{new Date(l.date).toLocaleDateString()}</td>
                            <td className="px-3 md:px-4 py-2 font-mono text-xs text-blue-600">{l.reference}</td>
                            <td className="px-3 md:px-4 py-2 text-gray-700 hidden md:table-cell">{l.description}</td>
                            <td className={`px-3 md:px-4 py-2 text-right font-semibold ${l.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>GH₵ {l.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {section==='journal' && (
        <AccountingJournalPanel onDataChange={load} />
      )}

      {/* Balance Sheet Tab */}
      {section==='bs' && (
        <div className="space-y-4">
          {bsLoading && <Spinner />}
          {bs && (() => {
            // Use GL-derived fields from the new API
            const a = bs.assets;
            const l = bs.liabilities;
            const e = bs.equity;
            const fmt = (v: any) => parseFloat(v||0).toLocaleString('en-GH', { minimumFractionDigits:2, maximumFractionDigits:2 });
            const isBalanced = bs.is_balanced;

            const Line = ({ label, value }: { label: string; value: number }) => (
              <div className="flex items-baseline py-[5px] border-b border-dotted border-gray-100 last:border-0">
                <span className="text-sm text-gray-600 flex-1 pl-6">{label}</span>
                <span className="text-sm text-gray-800 tabular-nums w-44 text-right">{fmt(value)}</span>
              </div>
            );
            const Subtotal = ({ label, value }: { label: string; value: number }) => (
              <div className="flex items-baseline py-[6px] mt-1">
                <span className="text-sm font-semibold text-gray-700 flex-1 pl-2">{label}</span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums w-44 text-right border-t border-gray-400 pt-0.5">{fmt(value)}</span>
              </div>
            );
            const Total = ({ label, value }: { label: string; value: number }) => (
              <div className="flex items-baseline py-2 mt-1">
                <span className="text-sm font-bold uppercase tracking-wide text-gray-900 flex-1 pl-2">{label}</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums w-44 text-right" style={{borderTop:'2px solid #111',borderBottom:'2px solid #111',paddingTop:'2px',paddingBottom:'2px'}}>{fmt(value)}</span>
              </div>
            );
            const Section = ({ title }: { title: string }) => (
              <div className="mt-7 mb-2 pb-1 border-b border-gray-300">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</span>
              </div>
            );

            return (
              <div id="bs-print" className="w-full">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="text-center py-7 px-8 border-b border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">GEMS</p>
                    <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
                    <p className="text-sm text-gray-500 mt-1">As at {new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
                    <p className="text-xs text-gray-400 mt-0.5">All amounts in Ghana Cedis (GH₵)</p>
                  </div>
                  <div className="px-8 py-6">
                    <Section title="Assets" />
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-1 mt-3">Current Assets</div>
                    <Line label="Cash & Bank"          value={a.cash} />
                    <Line label="Accounts Receivable"  value={a.accounts_receivable} />
                    <Line label="Inventory"            value={a.inventory} />
                    {a.prepaid > 0 && <Line label="Prepaid Expenses" value={a.prepaid} />}
                    <Subtotal label="Total Current Assets" value={a.total_current} />
                    {(a.ppe !== 0 || a.accum_depreciation !== 0) && (
                      <>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-1 mt-4">Non-Current Assets</div>
                        {a.ppe !== 0 && <Line label="Property & Equipment" value={a.ppe} />}
                        {a.accum_depreciation !== 0 && <Line label="Accumulated Depreciation" value={a.accum_depreciation} />}
                        <Subtotal label="Total Non-Current Assets" value={a.total_non_current} />
                      </>
                    )}
                    <div className="mt-4" />
                    <Total label="Total Assets" value={a.total} />

                    <Section title="Liabilities" />
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-1 mt-3">Current Liabilities</div>
                    <Line label="Accounts Payable"   value={l.accounts_payable} />
                    {l.vat_payable > 0    && <Line label="VAT Payable"        value={l.vat_payable} />}
                    {l.accrued > 0        && <Line label="Accrued Liabilities" value={l.accrued} />}
                    {l.salaries_payable > 0 && <Line label="Salaries Payable"  value={l.salaries_payable} />}
                    <Subtotal label="Total Current Liabilities" value={l.total_current} />
                    {l.long_term_loans !== 0 && (
                      <>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-1 mt-4">Non-Current Liabilities</div>
                        <Line label="Long-Term Loans" value={l.long_term_loans} />
                        <Subtotal label="Total Non-Current Liabilities" value={l.total_non_current} />
                      </>
                    )}
                    <div className="mt-4" />
                    <Total label="Total Liabilities" value={l.total} />

                    <Section title="Shareholders' Equity" />
                    <div className="mt-3" />
                    {e.owner_equity !== 0      && <Line label="Owner's Equity"      value={e.owner_equity} />}
                    {e.retained_earnings !== 0 && <Line label="Retained Earnings"   value={e.retained_earnings} />}
                    {e.current_net_income !== 0 && <Line label="Current Period Net Income" value={e.current_net_income} />}
                    <Subtotal label="Total Equity" value={e.total} />
                    <div className="mt-4" />
                    <Total label="Total Liabilities & Equity" value={l.total + e.total} />

                    <div className={`mt-6 rounded-lg px-4 py-3 flex items-center justify-between text-sm ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <span className={`font-mono text-xs ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                        Assets {fmt(a.total)} = Liabilities {fmt(l.total)} + Equity {fmt(e.total)}
                      </span>
                      <span className={`font-bold text-sm ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                        {isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
                      </span>
                    </div>
                  </div>
                  <div className="px-8 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                    Prepared by GEMS &middot; {new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })} &middot; Unaudited
                  </div>
                </div>
              </div>
            );
          })()}
          {!bs && !bsLoading && <EmptyState message="Click Load Balance Sheet to view the snapshot" icon={<DollarSign className="w-8 h-8 text-gray-300"/>} />}
        </div>
      )}

      {/* Cash Flow Tab */}
      {section==='cashflow' && (
        <div className="space-y-4 md:space-y-5">
          <div className="card">
            <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3">
              <div><label className="form-label">From</label><input type="date" className="form-input" value={cfFrom} onChange={e => setCfFrom(e.target.value)} /></div>
              <div><label className="form-label">To</label><input type="date" className="form-input" value={cfTo} onChange={e => setCfTo(e.target.value)} /></div>
              <button className="btn-primary w-full sm:w-auto" onClick={loadCf} disabled={cfLoading}>{cfLoading ? 'Loading…' : 'Generate Report'}</button>
              {cf && <button className="btn-secondary w-full sm:w-auto" onClick={() => { setCfFrom(''); setCfTo(''); setCf(null); }}>Clear</button>}
            </div>
          </div>
          {cfLoading && <Spinner />}
          {cf && (() => {
            const fmt = (v: any) => `GH₵ ${parseFloat(v||0).toLocaleString('en-GH', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
            const isPos = (v: any) => parseFloat(v||0) >= 0;
            const Row = ({ label, value, indent = false, bold = false }: { label: string; value: any; indent?: boolean; bold?: boolean }) => (
              <div className={`flex justify-between py-2 border-b border-gray-50 last:border-0 ${bold ? 'font-semibold' : ''}`}>
                <span className={`text-sm text-gray-700 ${indent ? 'pl-6' : ''}`}>{label}</span>
                <span className={`text-sm tabular-nums ${bold ? (isPos(value) ? 'text-green-700' : 'text-red-600') : 'text-gray-800'}`}>{fmt(value)}</span>
              </div>
            );
            const SectionTotal = ({ label, value }: { label: string; value: any }) => (
              <div className={`flex justify-between py-2.5 mt-1 border-t-2 ${isPos(value) ? 'border-green-400' : 'border-red-400'}`}>
                <span className="text-sm font-bold text-gray-900">{label}</span>
                <span className={`text-sm font-bold tabular-nums ${isPos(value) ? 'text-green-700' : 'text-red-600'}`}>{fmt(value)}</span>
              </div>
            );
            return (
              <div id="cf-print">
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
                  <div className="card bg-blue-50 border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">Operating Cash Flow</div>
                    <div className={`text-xl font-bold ${isPos(cf.operating.net) ? 'text-blue-800' : 'text-red-700'}`}>{fmt(cf.operating.net)}</div>
                  </div>
                  <div className="card bg-purple-50 border-purple-100">
                    <div className="text-xs text-purple-600 font-medium mb-1">Investing Cash Flow</div>
                    <div className={`text-xl font-bold ${isPos(cf.investing.net) ? 'text-purple-800' : 'text-red-700'}`}>{fmt(cf.investing.net)}</div>
                  </div>
                  <div className="card bg-orange-50 border-orange-100">
                    <div className="text-xs text-orange-600 font-medium mb-1">Financing Cash Flow</div>
                    <div className={`text-xl font-bold ${isPos(cf.financing.net) ? 'text-orange-800' : 'text-red-700'}`}>{fmt(cf.financing.net)}</div>
                  </div>
                  <div className={`card ${isPos(cf.net_change) ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <div className={`text-xs font-medium mb-1 ${isPos(cf.net_change) ? 'text-green-600' : 'text-red-600'}`}>Net Change in Cash</div>
                    <div className={`text-xl font-bold ${isPos(cf.net_change) ? 'text-green-800' : 'text-red-700'}`}>{fmt(cf.net_change)}</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Report header */}
                  <div className="text-center py-6 px-8 border-b border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">GEMS</p>
                    <h2 className="text-2xl font-bold text-gray-900">Cash Flow Statement</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {cfFrom && cfTo ? `${new Date(cfFrom).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} — ${new Date(cfTo).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}` : 'All time'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">All amounts in Ghana Cedis (GH₵)</p>
                  </div>

                  <div className="px-8 py-6 space-y-6">
                    {/* Operating */}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2 mb-3">Operating Activities</div>
                      {(cf.operating.items?.length ? cf.operating.items : [
                        { label: 'Cash received from customers', amount: cf.operating.cash_from_sales },
                        { label: 'Cash paid for expenses', amount: cf.operating.cash_paid_expenses },
                        { label: 'Cash paid to suppliers', amount: cf.operating.cash_paid_suppliers },
                        { label: 'Cash paid for payroll', amount: cf.operating.cash_paid_payroll },
                      ].filter((r) => r.amount != null && Math.abs(parseFloat(String(r.amount))) > 0.001))
                        .map((item: any, i: number) => <Row key={i} label={item.label} value={item.amount} indent />)}
                      {cf.source === 'gl' && <p className="text-xs text-gray-400 pl-6">GL-based cash movement from journal entries</p>}
                      <SectionTotal label="Net Cash from Operating Activities" value={cf.operating.net} />
                    </div>

                    {/* Investing */}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2 mb-3">Investing Activities</div>
                      {cf.investing.items?.length > 0
                        ? cf.investing.items.map((item: any, i: number) => <Row key={i} label={item.label} value={item.amount} indent />)
                        : <p className="text-sm text-gray-400 pl-6 py-2">No investing activities recorded</p>
                      }
                      <SectionTotal label="Net Cash from Investing Activities" value={cf.investing.net} />
                    </div>

                    {/* Financing */}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2 mb-3">Financing Activities</div>
                      {cf.financing.items?.length > 0
                        ? cf.financing.items.map((item: any, i: number) => <Row key={i} label={item.label} value={item.amount} indent />)
                        : <p className="text-sm text-gray-400 pl-6 py-2">No financing activities recorded</p>
                      }
                      <SectionTotal label="Net Cash from Financing Activities" value={cf.financing.net} />
                    </div>

                    {/* Net change */}
                    <div className="border-t-2 border-gray-800 pt-4">
                      <Row label="Opening Cash Balance" value={cf.opening_balance} bold />
                      <Row label="Net Change in Cash" value={cf.net_change} bold />
                      <div className={`flex justify-between py-3 mt-1 rounded-xl px-4 ${isPos(cf.closing_balance) ? 'bg-green-50' : 'bg-red-50'}`}>
                        <span className="text-base font-black text-gray-900">Closing Cash Balance</span>
                        <span className={`text-base font-black tabular-nums ${isPos(cf.closing_balance) ? 'text-green-700' : 'text-red-700'}`}>{fmt(cf.closing_balance)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-8 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                    Prepared by GEMS &middot; {new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })} &middot; Unaudited
                  </div>
                </div>
              </div>
            );
          })()}
          {!cf && !cfLoading && <EmptyState message="Select a date range and click Generate Report" icon={<Activity className="w-8 h-8 text-gray-300"/>} />}
        </div>
      )}

            {/* P&L Report Tab */}
      {section==='pl' && (
        <div className="space-y-4 md:space-y-5">
          <div className="card">
            <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3">
              <div><label className="form-label">From</label><input type="date" className="form-input" value={plFrom} onChange={e => setPlFrom(e.target.value)} /></div>
              <div><label className="form-label">To</label><input type="date" className="form-input" value={plTo} onChange={e => setPlTo(e.target.value)} /></div>
              <div>
                <label className="form-label">Source</label>
                <select className="form-input" value={plSource} onChange={e => setPlSource(e.target.value as 'orders'|'gl')}>
                  <option value="orders">Paid orders</option>
                  <option value="gl">General ledger</option>
                </select>
              </div>
              <button className="btn-primary w-full sm:w-auto" onClick={loadPl} disabled={plLoading}>{plLoading ? 'Loading...' : 'Generate Report'}</button>
                {pl && <button className="btn-secondary w-full sm:w-auto" onClick={() => { setPlFrom(''); setPlTo(''); setPl(null); }}>Clear</button>}
            </div>
          </div>
          {plLoading && <Spinner />}
          {pl && (
            <div id="pl-print" className="space-y-5">
              <p className="text-xs text-gray-500">
                Source: <strong>{pl.source === 'gl' ? 'General ledger' : 'Paid orders'}</strong>
                {pl.source === 'gl' ? ' — revenue and expenses from journal entries.' : ' — revenue from paid orders and expenses from expense records.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard label="Revenue" value={`GH₵ ${parseFloat(pl.revenue||0).toFixed(2)}`} icon={<TrendingUp className="w-6 h-6 text-green-600"/>} color="bg-green-50" />
                <StatCard label="Gross Profit" value={`GH₵ ${parseFloat(pl.gross_profit||0).toFixed(2)}`} icon={<DollarSign className="w-6 h-6 text-blue-600"/>} color="bg-blue-50" />
                <StatCard label="Total Expenses" value={`GH₵ ${parseFloat(pl.total_expenses||0).toFixed(2)}`} icon={<TrendingDown className="w-6 h-6 text-red-600"/>} color="bg-red-50" />
                <StatCard label="Net Profit" value={`GH₵ ${parseFloat(pl.net_profit||0).toFixed(2)}`} icon={<DollarSign className="w-6 h-6 text-purple-600"/>} color={pl.net_profit >= 0 ? 'bg-green-50' : 'bg-red-50'} />
              </div>
              {pl.expenses_by_category?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-3">Expenses by Category</h3>
                  <table className="w-full text-sm">
                    <thead className="table-header"><tr><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-right">% of Total</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {pl.expenses_by_category.map((c:any) => (
                        <tr key={c.category} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{c.category}</td>
                          <td className="px-4 py-2 text-right font-semibold text-red-600">GH₵ {parseFloat(c.total).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{pl.total_expenses > 0 ? ((c.total/pl.total_expenses)*100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {pl.monthly?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-3">Monthly Revenue</h3>
                  <div className="space-y-2">
                    {pl.monthly.map((m:any) => {
                      const max = Math.max(...pl.monthly.map((x:any) => x.revenue));
                      const pct = max > 0 ? (m.revenue/max)*100 : 0;
                      return (
                        <div key={`${m.year}-${m.month}`} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-16">{m.month} {m.year}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{width:`${pct}%`}} />
                          </div>
                          <span className="text-xs font-semibold w-28 text-right">GH₵ {parseFloat(m.revenue).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {!pl && !plLoading && <EmptyState message="Select a date range and click Generate Report" icon={<FileText className="w-8 h-8 text-gray-300"/>} />}
        </div>
      )}

      {/* Budget vs Actual Tab */}
      {section==='budget' && (
        <div className="space-y-4 md:space-y-5">
          {/* Controls */}
          <div className="card">
            <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3">
              <div>
                <label className="form-label">Period Type</label>
                <select className="form-input" value={budgetPeriodType} onChange={e => setBudgetPeriodType(e.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="form-label">{budgetPeriodType === 'annual' ? 'Year' : 'Month'}</label>
                {budgetPeriodType === 'annual'
                  ? <input type="number" className="form-input w-full sm:w-28" placeholder="2024" value={budgetPeriod} onChange={e => setBudgetPeriod(e.target.value)} />
                  : <input type="month" className="form-input" value={budgetPeriod} onChange={e => setBudgetPeriod(e.target.value)} />
                }
              </div>
              <button className="btn-primary w-full sm:w-auto" onClick={loadBudget} disabled={budgetLoading}>{budgetLoading ? 'Loading…' : 'Load Report'}</button>
            </div>
          </div>

          {budgetLoading && <Spinner />}

          {budgetData && (() => {
            const fmt = (v: any) => `GH₵ ${parseFloat(v||0).toLocaleString('en-GH', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
            const { rows, totals } = budgetData;
            const totalPct = totals.budgeted > 0 ? (totals.actual / totals.budgeted) * 100 : null;
            return (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                  <div className="card bg-blue-50 border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">Total Budgeted</div>
                    <div className="text-xl font-bold text-blue-800">{fmt(totals.budgeted)}</div>
                  </div>
                  <div className="card bg-red-50 border-red-100">
                    <div className="text-xs text-red-600 font-medium mb-1">Total Actual Spend</div>
                    <div className="text-xl font-bold text-red-700">{fmt(totals.actual)}</div>
                  </div>
                  <div className={`card ${totals.variance >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <div className={`text-xs font-medium mb-1 ${totals.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>Total Variance</div>
                    <div className={`text-xl font-bold ${totals.variance >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(totals.variance)}</div>
                    {totalPct !== null && <div className="text-xs mt-1 text-gray-500">{totalPct.toFixed(1)}% of budget used</div>}
                  </div>
                </div>

                {/* Table */}
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="table-header">
                      <tr>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-left">Category</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-right">Budget</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-right">Actual</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-right hidden md:table-cell">Variance</th>
                        <th className="px-3 md:px-4 py-2 md:py-3 text-left w-32 md:w-40">% Used</th>
                        <th className="px-3 md:px-4 py-2 md:py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.map((r: any) => {
                        const pct = r.pct ?? 0;
                        const barColor = pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-yellow-400' : 'bg-green-500';
                        const varColor = r.variance >= 0 ? 'text-green-600' : 'text-red-600';
                        return (
                          <tr key={r.category} className="hover:bg-gray-50">
                            <td className="px-3 md:px-4 py-2 md:py-3 font-medium">{r.category}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-right text-gray-700">{fmt(r.budgeted)}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-right font-semibold text-red-600">{fmt(r.actual)}</td>
                            <td className={`px-3 md:px-4 py-2 md:py-3 text-right font-semibold ${varColor} hidden md:table-cell`}>{fmt(r.variance)}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3">
                              {r.pct !== null ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                  </div>
                                  <span className={`text-xs font-semibold w-8 md:w-10 text-right ${pct > 100 ? 'text-red-600' : 'text-gray-600'}`}>{pct.toFixed(0)}%</span>
                                </div>
                              ) : <span className="text-xs text-gray-400">No budget set</span>}
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => { setEditingBudget(r); setBudgetForm({ category: r.category, amount: String(r.budgeted || ''), period: budgetPeriod, period_type: budgetPeriodType }); setBudgetModal(true); }}
                                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                                ><Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                                {r.budget_id && <button onClick={() => deleteBudget(r.budget_id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                      <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                        <td className="px-3 md:px-4 py-2 md:py-3">Total</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-right">{fmt(totals.budgeted)}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-right text-red-600">{fmt(totals.actual)}</td>
                        <td className={`px-3 md:px-4 py-2 md:py-3 text-right ${totals.variance >= 0 ? 'text-green-600' : 'text-red-600'} hidden md:table-cell`}>{fmt(totals.variance)}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3">{totalPct !== null ? `${totalPct.toFixed(1)}%` : '—'}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}
          {!budgetData && !budgetLoading && <EmptyState message="Select a period and click Load Report" icon={<TrendingUp className="w-8 h-8 text-gray-300"/>} />}
        </div>
      )}

      {/* Tax / VAT Tab */}
      {section==='tax' && (
        <div className="space-y-4 md:space-y-6">
          {/* VAT Return */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">VAT Return</h3>
            <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3 mb-4">
              <div><label className="form-label">From</label><input type="date" className="form-input" value={vatFrom} onChange={e => setVatFrom(e.target.value)} /></div>
              <div><label className="form-label">To</label><input type="date" className="form-input" value={vatTo} onChange={e => setVatTo(e.target.value)} /></div>
              <button className="btn-primary w-full sm:w-auto" onClick={loadVatReturn} disabled={vatLoading}>{vatLoading ? 'Loading…' : 'Generate'}</button>
              {vatReturn && <button className="btn-secondary w-full sm:w-auto" onClick={() => { setVatReturn(null); setVatFrom(''); setVatTo(''); }}>Clear</button>}
            </div>
            {vatReturn && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                  <div className="text-xs text-blue-600 font-medium mb-1">Output VAT (Collected)</div>
                  <div className="text-xl font-bold text-blue-800">GH₵ {parseFloat(vatReturn.output_vat||0).toFixed(2)}</div>
                  <div className="text-xs text-blue-500 mt-1">VAT charged to customers</div>
                </div>
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
                  <div className="text-xs text-orange-600 font-medium mb-1">Input VAT (Paid)</div>
                  <div className="text-xl font-bold text-orange-800">GH₵ {parseFloat(vatReturn.input_vat||0).toFixed(2)}</div>
                  <div className="text-xs text-orange-500 mt-1">VAT paid to suppliers</div>
                </div>
                <div className={`rounded-xl border p-4 ${vatReturn.status === 'payable' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                  <div className={`text-xs font-medium mb-1 ${vatReturn.status === 'payable' ? 'text-red-600' : 'text-green-600'}`}>Net VAT {vatReturn.status === 'payable' ? 'Payable' : 'Reclaimable'}</div>
                  <div className={`text-xl font-bold ${vatReturn.status === 'payable' ? 'text-red-800' : 'text-green-800'}`}>GH₵ {Math.abs(parseFloat(vatReturn.net_vat_payable||0)).toFixed(2)}</div>
                  <div className={`text-xs mt-1 ${vatReturn.status === 'payable' ? 'text-red-500' : 'text-green-500'}`}>{vatReturn.status === 'payable' ? 'Owed to tax authority' : 'Claimable from tax authority'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Tax Rates */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Tax Rates</h3>
            </div>
            {loading ? <Spinner /> : taxRates.length===0 ? <EmptyState message="No tax rates configured" icon={<Receipt className="w-8 h-8 text-gray-300"/>} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="table-header"><tr>{['Name','Rate (%)','Applies To','Status',''].map(h=><th key={h} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {taxRates.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-4 py-2 md:py-3 font-medium">{t.name}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-blue-700">{parseFloat(t.rate).toFixed(2)}%</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 hidden md:table-cell"><span className="badge badge-blue text-xs">{t.applies_to}</span></td>
                        <td className="px-3 md:px-4 py-2 md:py-3">{t.is_active ? <span className="badge bg-green-100 text-green-700 text-xs">Active</span> : <span className="badge bg-gray-100 text-gray-500 text-xs">Inactive</span>}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 flex gap-1">
                          <button onClick={() => openEditTax(t)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                          <button onClick={() => deleteTax(t.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Budget Modal */}
      <Modal open={budgetModal} onClose={() => { setBudgetModal(false); setEditingBudget(null); }} title={editingBudget ? 'Edit Budget' : 'Set Budget'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="form-label">Category *</label>
            {editingBudget
              ? <input className="form-input bg-gray-50" value={budgetForm.category} disabled />
              : <input className="form-input" value={budgetForm.category} onChange={e => setBudgetForm({...budgetForm, category: e.target.value})} placeholder="e.g. Rent, Salaries, Marketing" />
            }
          </div>
          <div>
            <label className="form-label">Budget Amount (GH₵) *</label>
            <input type="number" className="form-input" value={budgetForm.amount} onChange={e => setBudgetForm({...budgetForm, amount: e.target.value})} placeholder="0.00" />
          </div>
          <div className="text-xs text-gray-400">Period: <strong>{budgetPeriod}</strong> ({budgetPeriodType})</div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button className="btn-secondary w-full sm:w-auto" onClick={() => { setBudgetModal(false); setEditingBudget(null); }}>Cancel</button>
          <button className="btn-primary w-full sm:w-auto" onClick={saveBudget} disabled={saving}>{saving ? 'Saving…' : 'Save Budget'}</button>
        </div>
      </Modal>

      {/* Tax Rate Modal */}
      <Modal open={!!taxModal} onClose={() => setTaxModal(null)} title={taxModal==='edit' ? 'Edit Tax Rate' : 'Add Tax Rate'} size="sm">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Name *</label><input className="form-input" value={taxForm.name} onChange={e => setTaxForm({...taxForm,name:e.target.value})} placeholder="e.g. VAT" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="form-label">Rate (%) *</label><input type="number" className="form-input" value={taxForm.rate} onChange={e => setTaxForm({...taxForm,rate:e.target.value})} placeholder="e.g. 15" /></div>
            <div><label className="form-label">Applies To</label>
              <select className="form-input" value={taxForm.applies_to} onChange={e => setTaxForm({...taxForm,applies_to:e.target.value})}>
                <option value="both">Both</option>
                <option value="sales">Sales</option>
                <option value="purchases">Purchases</option>
              </select>
            </div>
          </div>
          {taxModal==='edit' && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="tax-active" checked={taxForm.is_active} onChange={e => setTaxForm({...taxForm,is_active:e.target.checked})} />
              <label htmlFor="tax-active" className="text-sm text-gray-700">Active</label>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button className="btn-secondary w-full sm:w-auto" onClick={() => setTaxModal(null)}>Cancel</button>
          <button className="btn-primary w-full sm:w-auto" onClick={saveTax} disabled={saving}>{saving?'Saving…':taxModal==='edit'?'Update':'Add Tax Rate'}</button>
        </div>
      </Modal>

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
