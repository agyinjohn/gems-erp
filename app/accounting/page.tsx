'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import { Plus, DollarSign, TrendingUp, TrendingDown, BookOpen, ArrowDownCircle, ArrowUpCircle, LayoutDashboard, BookMarked, Receipt, FileText, Landmark, Edit2, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function AccountingPage() {
  const [tab, setTab] = useState<'overview'|'accounts'|'expenses'|'journal'|'ar'|'ap'|'reconciliation'|'pl'|'bs'|'tax'>('overview');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [ar, setAr] = useState<any[]>([]);
  const [ap, setAp] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'expense'|'journal'|'account'|null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bankStatement, setBankStatement] = useState('');
  const [reconResult, setReconResult] = useState<any>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconError, setReconError] = useState('');
  const [pl, setPl] = useState<any>(null);
  const [plLoading, setPlLoading] = useState(false);
  const [plFrom, setPlFrom] = useState('');
  const [plTo, setPlTo] = useState('');
  const [bs, setBs] = useState<any>(null);
  const [bsLoading, setBsLoading] = useState(false);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [taxModal, setTaxModal] = useState<'add'|'edit'|null>(null);
  const [selectedTax, setSelectedTax] = useState<any>(null);
  const [taxForm, setTaxForm] = useState({ name:'', rate:'', applies_to:'both', is_active:true });
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [accForm, setAccForm] = useState({ code:'', name:'', type:'asset', description:'' });

  const [expForm, setExpForm] = useState({ title:'', category:'', amount:'', account_id:'', description:'', expense_date: new Date().toISOString().split('T')[0] });
  const [jeForm, setJeForm] = useState({ description:'', entry_date: new Date().toISOString().split('T')[0], lines:[{ account_id:'', debit:'', credit:'', description:'' }] });

  const load = async () => {
    setLoading(true);
    try {
      const [a, e, j, s, arRes, apRes, taxRes] = await Promise.all([
        api.get('/accounts').catch(()=>({data:{data:[]}})),
        api.get('/expenses').catch(()=>({data:{data:[]}})),
        api.get('/journal-entries').catch(()=>({data:{data:[]}})),
        api.get('/accounting/summary').catch(()=>({data:{data:{}}})),
        api.get('/orders?payment_status=pending').catch(()=>({data:{data:[]}})),
        api.get('/purchase-orders?status=approved,sent,partially_received').catch(()=>({data:{data:[]}})),
        api.get('/tax-rates').catch(()=>({data:{data:[]}})),
      ]);
      setAccounts(a.data.data); setExpenses(e.data.data);
      setJournal(j.data.data); setSummary(s.data.data||{});
      setAr(arRes.data.data||[]); setAp(apRes.data.data||[]);
      setTaxRates(taxRes.data.data||[]);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'bs' && !bs) loadBs(); }, [tab]);

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

  const addJeLine = () => setJeForm({ ...jeForm, lines:[...jeForm.lines, {account_id:'',debit:'',credit:'',description:''}] });
  const updateJeLine = (i:number,k:string,v:any) => { const l=[...jeForm.lines]; l[i]={...l[i],[k]:v}; setJeForm({...jeForm,lines:l}); };

  const saveExpense = async () => {
    setSaving(true); setError('');
    try {
      if (selectedExpense) await api.put(`/expenses/${selectedExpense.id}`, expForm);
      else await api.post('/expenses', expForm);
      setModal(null); load();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    toast.success('Deleted successfully');
    load();
  };

  const openEditExpense = (e: any) => {
    setSelectedExpense(e);
    setExpForm({ title:e.title, category:e.category||'', amount:String(e.amount), account_id:e.account_id||'', description:e.description||'', expense_date: e.expense_date?.split('T')[0] ?? new Date().toISOString().split('T')[0] });
    setError(''); setModal('expense');
  };

  const saveJournal = async () => {
    setSaving(true); setError('');
    try { await api.post('/journal-entries', jeForm); setModal(null); load(); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const saveAccount = async () => {
    setSaving(true); setError('');
    try {
      if (selectedAccount) await api.put(`/accounts/${selectedAccount._id || selectedAccount.id}`, accForm);
      else await api.post('/accounts', accForm);
      setModal(null); load();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const loadPl = async () => {
    setPlLoading(true);
    try {
      const params = new URLSearchParams();
      if (plFrom) params.append('from', plFrom);
      if (plTo) params.append('to', plTo);
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

  const openAddAccount = () => { setSelectedAccount(null); setAccForm({ code:'', name:'', type:'asset', description:'' }); setError(''); setModal('account'); };
  const openEditAccount = (a: any) => { setSelectedAccount(a); setAccForm({ code: a.code, name: a.name, type: a.type, description: a.description||'' }); setError(''); setModal('account'); };

  const arAging = () => {
    const now = Date.now();
    const buckets = { current:[] as any[], d30:[] as any[], d60:[] as any[], d90:[] as any[] };
    ar.forEach(o => {
      const days = Math.floor((now - new Date(o.created_at).getTime()) / 86400000);
      if (days <= 30) buckets.current.push({...o,days});
      else if (days <= 60) buckets.d30.push({...o,days});
      else if (days <= 90) buckets.d60.push({...o,days});
      else buckets.d90.push({...o,days});
    });
    return buckets;
  };

  const typeColors: Record<string,string> = { asset:'bg-green-100 text-green-800', liability:'bg-red-100 text-red-800', equity:'bg-blue-100 text-blue-800', revenue:'bg-purple-100 text-purple-800', expense:'bg-yellow-100 text-yellow-800' };

  return (
    <AppLayout title="Accounting & Finance" subtitle="General ledger, expenses and financial overview" allowedRoles={['super_admin','accountant']}>
      {/* Tabs */}
      <div className="mb-5">
        {/* Tab bar */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <div className="flex min-w-max border-b border-gray-100">
            {([
              { t:'overview',       l:'Overview',       icon:<LayoutDashboard className="w-3.5 h-3.5"/> },
              { t:'accounts',       l:'Accounts',       icon:<BookMarked className="w-3.5 h-3.5"/> },
              { t:'expenses',       l:'Expenses',       icon:<Receipt className="w-3.5 h-3.5"/> },
              { t:'journal',        l:'Journal',        icon:<BookOpen className="w-3.5 h-3.5"/> },
              null,
              { t:'ar',             l:'Receivables',    icon:<ArrowDownCircle className="w-3.5 h-3.5"/> },
              { t:'ap',             l:'Payables',       icon:<ArrowUpCircle className="w-3.5 h-3.5"/> },
              { t:'reconciliation', l:'Reconciliation', icon:<Landmark className="w-3.5 h-3.5"/> },
              null,
              { t:'pl',             l:'P&L Report',     icon:<FileText className="w-3.5 h-3.5"/> },
              { t:'bs',             l:'Balance Sheet',  icon:<DollarSign className="w-3.5 h-3.5"/> },
              { t:'tax',            l:'Tax / VAT',      icon:<Receipt className="w-3.5 h-3.5"/> },
            ] as const).map((item, i) =>
              item === null
                ? <div key={i} className="w-px bg-gray-100 my-2" />
                : (
                  <button
                    key={item.t}
                    onClick={() => setTab(item.t as any)}
                    className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      tab === item.t
                        ? 'text-blue-700 bg-blue-50/60'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {item.icon}
                    {item.l}
                    {tab === item.t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                  </button>
                )
            )}
          </div>
        </div>

        {/* Action button row — sits below the tab bar */}
        <div className="flex justify-end mt-3">
          {tab==='expenses'     && <button className="btn-primary" onClick={() => { setSelectedExpense(null); setExpForm({title:'',category:'',amount:'',account_id:'',description:'',expense_date:new Date().toISOString().split('T')[0]}); setError(''); setModal('expense'); }}><Plus className="w-4 h-4" />Add Expense</button>}
          {tab==='accounts'     && <button className="btn-primary" onClick={openAddAccount}><Plus className="w-4 h-4" />Add Account</button>}
          {tab==='tax'          && <button className="btn-primary" onClick={openAddTax}><Plus className="w-4 h-4" />Add Tax Rate</button>}
          {tab==='journal'      && <button className="btn-primary" onClick={() => { setJeForm({description:'',entry_date:new Date().toISOString().split('T')[0],lines:[{account_id:'',debit:'',credit:'',description:''}]}); setError(''); setModal('journal'); }}><Plus className="w-4 h-4" />New Entry</button>}
        </div>
      </div>
      {/* Overview */}
      {tab==='overview' && (
        loading ? <Spinner /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Revenue" value={`GHS ${parseFloat(summary.revenue||0).toFixed(0)}`} icon={<TrendingUp className="w-6 h-6 text-green-600"/>} color="bg-green-50" />
              <StatCard label="Total Expenses" value={`GHS ${parseFloat(summary.expenses||0).toFixed(0)}`} icon={<TrendingDown className="w-6 h-6 text-red-600"/>} color="bg-red-50" />
              <StatCard label="Net Profit" value={`GHS ${(parseFloat(summary.revenue||0)-parseFloat(summary.expenses||0)).toFixed(0)}`} icon={<DollarSign className="w-6 h-6 text-blue-600"/>} color="bg-blue-50" />
              <StatCard label="Journal Entries" value={journal.length} icon={<BookOpen className="w-6 h-6 text-purple-600"/>} color="bg-purple-50" />
            </div>
            {/* Account Balances by Type */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {['asset','liability','equity','revenue','expense'].map(type => {
                const typeAccs = accounts.filter(a => a.type===type);
                if (!typeAccs.length) return null;
                return (
                  <div key={type} className="card">
                    <h3 className="font-semibold text-gray-800 capitalize mb-3">{type} Accounts</h3>
                    <div className="space-y-2">
                      {typeAccs.map(a => (
                        <div key={a.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                          <div>
                            <span className="text-sm font-medium text-gray-800">{a.name}</span>
                            <span className="text-xs text-gray-400 ml-2">{a.code}</span>
                          </div>
                          <span className="text-sm font-semibold">GHS {parseFloat(a.balance||0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Accounts */}
      {tab==='accounts' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : accounts.length===0 ? <EmptyState message="No accounts configured" icon={<BookMarked className="w-8 h-8 text-gray-300"/>} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-header"><tr>{['Code','Account Name','Type','Balance',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {accounts.map(a => (
                    <tr key={a.id||a._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.code}</td>
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3"><span className={`badge ${typeColors[a.type]}`}>{a.type}</span></td>
                      <td className="px-4 py-3 font-semibold">GHS {parseFloat(a.balance||0).toFixed(2)}</td>
                      <td className="px-4 py-3"><button onClick={() => openEditAccount(a)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Expenses */}
      {tab==='expenses' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : expenses.length===0 ? <EmptyState message="No expenses recorded" icon={<Receipt className="w-8 h-8 text-gray-300"/>} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-header"><tr>{['Title','Category','Amount','Date','Recorded By',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{e.title}</td>
                      <td className="px-4 py-3 text-gray-500">{e.category||'—'}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">GHS {parseFloat(e.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.expense_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-500">{e.created_by?.name||'—'}</td>
                      <td className="px-4 py-3 flex gap-1">
                        <button onClick={() => openEditExpense(e)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteExpense(e.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* AR Tab */}
      {tab==='ar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card"><div className="text-2xl font-bold text-blue-600">{ar.length}</div><div className="text-sm text-gray-500">Unpaid Orders</div></div>
            <div className="card"><div className="text-2xl font-bold text-red-600">GHS {ar.reduce((s:number,o:any)=>s+parseFloat(o.total||0),0).toFixed(2)}</div><div className="text-sm text-gray-500">Total Outstanding</div></div>
            <div className="card"><div className="text-2xl font-bold text-green-600">GHS {parseFloat(summary.revenue||0).toFixed(2)}</div><div className="text-sm text-gray-500">Total Collected</div></div>
          </div>
          {/* Aging Buckets */}
          {!loading && ar.length > 0 && (() => {
            const { current, d30, d60, d90 } = arAging();
            const sum = (arr: any[]) => arr.reduce((s,o) => s + parseFloat(o.total||0), 0);
            return (
              <div className="grid grid-cols-4 gap-3">
                {[{label:'Current (0-30d)',arr:current,color:'bg-green-50 border-green-200 text-green-700'},{label:'31-60 days',arr:d30,color:'bg-yellow-50 border-yellow-200 text-yellow-700'},{label:'61-90 days',arr:d60,color:'bg-orange-50 border-orange-200 text-orange-700'},{label:'90+ days',arr:d90,color:'bg-red-50 border-red-200 text-red-700'}].map(({label,arr,color}) => (
                  <div key={label} className={`rounded-xl border p-4 ${color}`}>
                    <div className="text-xs font-medium mb-1">{label}</div>
                    <div className="text-xl font-bold">GHS {sum(arr).toFixed(2)}</div>
                    <div className="text-xs mt-1">{arr.length} invoice{arr.length!==1?'s':''}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : ar.length===0 ? <EmptyState message="No outstanding receivables" icon={<ArrowDownCircle className="w-8 h-8 text-gray-300"/>} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header"><tr>{['Order #','Customer','Email','Amount','Date','Age','Status'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {ar.map((o:any) => {
                      const days = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 86400000);
                      const ageColor = days > 90 ? 'text-red-600 font-bold' : days > 60 ? 'text-orange-500 font-semibold' : days > 30 ? 'text-yellow-600' : 'text-green-600';
                      return (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-blue-700">{o.order_number}</td>
                          <td className="px-4 py-3 font-medium">{o.customer_name}</td>
                          <td className="px-4 py-3 text-gray-500">{o.customer_email||'—'}</td>
                          <td className="px-4 py-3 font-semibold text-red-600">GHS {parseFloat(o.total).toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                          <td className={`px-4 py-3 text-xs ${ageColor}`}>{days}d</td>
                          <td className="px-4 py-3"><Badge status={o.payment_status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AP Tab */}
      {tab==='ap' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card"><div className="text-2xl font-bold text-orange-600">{ap.length}</div><div className="text-sm text-gray-500">Outstanding POs</div></div>
            <div className="card"><div className="text-2xl font-bold text-red-600">GHS {ap.reduce((s:number,p:any)=>s+parseFloat(p.total_cost||0),0).toFixed(2)}</div><div className="text-sm text-gray-500">Total Payable</div></div>
            <div className="card"><div className="text-2xl font-bold text-gray-600">GHS {ap.length > 0 ? (ap.reduce((s:number,p:any)=>s+parseFloat(p.total_cost||0),0)/ap.length).toFixed(2) : '0.00'}</div><div className="text-sm text-gray-500">Avg PO Value</div></div>
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : ap.length===0 ? <EmptyState message="No outstanding payables" icon={<ArrowUpCircle className="w-8 h-8 text-gray-300"/>} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header"><tr>{['PO Number','Supplier','Total Cost','Status','Expected Date'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {ap.map((p:any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-blue-700">{p.po_number}</td>
                        <td className="px-4 py-3 font-medium">{p.supplier_id?.name||'—'}</td>
                        <td className="px-4 py-3 font-semibold text-orange-600">GHS {parseFloat(p.total_cost).toFixed(2)}</td>
                        <td className="px-4 py-3"><Badge status={p.status} /></td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{p.expected_date ? new Date(p.expected_date).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reconciliation Tab */}
      {tab==='reconciliation' && (
        <div className="space-y-6">
          {/* Input */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-1">Bank Reconciliation</h3>
            <p className="text-sm text-gray-500 mb-4">Paste your bank statement below. Each line should contain a date, description, and amount. The last number on each line is used as the amount.</p>
            <p className="text-xs text-gray-400 mb-3 font-mono">e.g. &nbsp; 2024-01-15 &nbsp; Sales receipt &nbsp; 5000.00 &nbsp;&nbsp;|&nbsp;&nbsp; 2024-01-16 &nbsp; Supplier payment &nbsp; -1200.00</p>
            <textarea
              className="form-input font-mono text-xs mb-3"
              rows={7}
              placeholder={`2024-01-15  Sales receipt  5000.00\n2024-01-16  Supplier payment  -1200.00\n2024-01-17  Office rent  -4500.00`}
              value={bankStatement}
              onChange={e => handleStatementChange(e.target.value)}
            />
            {parsedLines.length > 0 && (
              <div className="mb-3 text-xs text-gray-500">{parsedLines.length} line{parsedLines.length !== 1 ? 's' : ''} parsed — totalling <span className="font-semibold text-gray-700">GHS {parsedLines.reduce((s,l)=>s+l.amount,0).toFixed(2)}</span></div>
            )}
            {reconError && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{reconError}</div>}
            <div className="flex gap-3">
              <button className="btn-primary" onClick={runReconciliation} disabled={reconLoading || !parsedLines.length}>
                {reconLoading ? 'Reconciling…' : 'Run Reconciliation'}
              </button>
              {reconResult && <button className="btn-secondary" onClick={() => { setReconResult(null); setBankStatement(''); setParsedLines([]); }}>Clear</button>}
            </div>
          </div>

          {/* Results */}
          {reconResult && (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card bg-blue-50 border-blue-100">
                  <div className="text-xs text-blue-600 font-medium mb-1">Bank Statement Total</div>
                  <div className="text-xl font-bold text-blue-800">GHS {reconResult.bankTotal.toFixed(2)}</div>
                  <div className="text-xs text-blue-500 mt-1">{parsedLines.length} lines</div>
                </div>
                <div className="card bg-green-50 border-green-100">
                  <div className="text-xs text-green-600 font-medium mb-1">System GL Total (Cash)</div>
                  <div className="text-xl font-bold text-green-800">GHS {reconResult.glTotal.toFixed(2)}</div>
                  <div className="text-xs text-green-500 mt-1">Cash & Bank account</div>
                </div>
                <div className={`card ${reconResult.isBalanced ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className={`text-xs font-medium mb-1 ${reconResult.isBalanced ? 'text-green-600' : 'text-red-600'}`}>Difference</div>
                  <div className={`text-xl font-bold ${reconResult.isBalanced ? 'text-green-800' : 'text-red-800'}`}>GHS {reconResult.difference.toFixed(2)}</div>
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
                  <div className="px-4 py-3 border-b bg-green-50 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    <span className="font-semibold text-sm text-green-800">Matched Transactions ({reconResult.matched.length})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="table-header">
                        <tr>
                          <th className="px-4 py-2 text-left">Bank Date</th>
                          <th className="px-4 py-2 text-left">Bank Description</th>
                          <th className="px-4 py-2 text-left">GL Reference</th>
                          <th className="px-4 py-2 text-left">GL Description</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {reconResult.matched.map((m: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-xs text-gray-500">{m.bank.date || '—'}</td>
                            <td className="px-4 py-2 text-gray-700 max-w-xs truncate">{m.bank.description}</td>
                            <td className="px-4 py-2 font-mono text-xs text-blue-600">{m.gl.reference}</td>
                            <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{m.gl.description}</td>
                            <td className={`px-4 py-2 text-right font-semibold ${m.bank.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>GHS {parseFloat(m.bank.amount).toFixed(2)}</td>
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
                  <div className="px-4 py-3 border-b bg-yellow-50 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                    <span className="font-semibold text-sm text-yellow-800">In Bank — Not in System ({reconResult.unmatchedBank.length})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="table-header"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Description</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {reconResult.unmatchedBank.map((l: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-xs text-gray-500">{l.date || '—'}</td>
                            <td className="px-4 py-2 text-gray-700">{l.description}</td>
                            <td className={`px-4 py-2 text-right font-semibold ${l.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>GHS {parseFloat(l.amount).toFixed(2)}</td>
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
                  <div className="px-4 py-3 border-b bg-red-50 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    <span className="font-semibold text-sm text-red-800">In System — Not in Bank ({reconResult.unmatchedGl.length})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="table-header"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Reference</th><th className="px-4 py-2 text-left">Description</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {reconResult.unmatchedGl.map((l: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-xs text-gray-500">{new Date(l.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2 font-mono text-xs text-blue-600">{l.reference}</td>
                            <td className="px-4 py-2 text-gray-700">{l.description}</td>
                            <td className={`px-4 py-2 text-right font-semibold ${l.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>GHS {l.amount.toFixed(2)}</td>
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

      {/* Journal */}
      {tab==='journal' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : journal.length===0 ? <EmptyState message="No journal entries yet" icon={<BookOpen className="w-8 h-8 text-gray-300"/>} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-header"><tr>{['Reference','Description','Debit','Credit','Date','Source'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {journal.map(j => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-blue-700">{j.reference}</td>
                      <td className="px-4 py-3 font-medium max-w-xs truncate">{j.description}</td>
                      <td className="px-4 py-3 text-green-700 font-semibold">GHS {parseFloat(j.total_debit||0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">GHS {parseFloat(j.total_credit||0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(j.entry_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><span className="badge badge-blue">{j.source}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Balance Sheet Tab */}
      {tab==='bs' && (
        <div className="space-y-4">
          {bsLoading && <Spinner />}
          {bs && (() => {
            const totalCurrentAssets = (bs.assets.cash||0) + (bs.assets.accounts_receivable||0) + (bs.assets.inventory||0);
            const totalAssets        = totalCurrentAssets;
            const totalCurrentLiab   = bs.liabilities.accounts_payable||0;
            const totalLiabilities   = totalCurrentLiab;
            const retainedEarnings   = bs.equity.retained_earnings||0;
            const ownerEquity        = bs.equity.owner_equity||0;
            const totalEquity        = bs.equity.total || retainedEarnings;
            const totalLiabEquity    = totalLiabilities + totalEquity;
            const isBalanced         = Math.abs(totalAssets - totalLiabEquity) < 1;
            const fmt = (v: any) => parseFloat(v||0).toLocaleString('en-GH', { minimumFractionDigits:2, maximumFractionDigits:2 });

            const Line = ({ label, value, note }: { label: string; value: number; note?: string }) => (
              <div className="flex items-baseline py-[5px] border-b border-dotted border-gray-100 last:border-0">
                <span className="text-sm text-gray-600 flex-1 pl-6">{label}</span>
                {note && <span className="text-xs text-gray-400 mr-4">{note}</span>}
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
              <div className="w-full">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden print-area">

                  {/* Report Header */}
                  <div className="text-center py-7 px-8 border-b border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">GThink ERP</p>
                    <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
                    <p className="text-sm text-gray-500 mt-1">As at {new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
                    <p className="text-xs text-gray-400 mt-0.5">All amounts in Ghana Cedis (GHS)</p>
                  </div>

                  <div className="px-8 py-6">

                    {/* ── ASSETS ── */}
                    <Section title="Assets" />

                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-1 mt-3">Current Assets</div>
                    <Line label="Cash & Bank"          value={bs.assets.cash} />
                    <Line label="Accounts Receivable"  value={bs.assets.accounts_receivable} />
                    <Line label="Inventory"            value={bs.assets.inventory} />
                    <Subtotal label="Total Current Assets" value={totalCurrentAssets} />

                    <div className="mt-4" />
                    <Total label="Total Assets" value={totalAssets} />

                    {/* ── LIABILITIES ── */}
                    <Section title="Liabilities" />

                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-1 mt-3">Current Liabilities</div>
                    <Line label="Accounts Payable" value={bs.liabilities.accounts_payable} />
                    <Subtotal label="Total Current Liabilities" value={totalCurrentLiab} />

                    <div className="mt-4" />
                    <Total label="Total Liabilities" value={totalLiabilities} />

                    {/* ── EQUITY ── */}
                    <Section title="Shareholders' Equity" />

                    <div className="mt-3" />
                    {ownerEquity !== 0 && <Line label="Owner's Equity"   value={ownerEquity} />}
                    <Line label="Retained Earnings" value={retainedEarnings} />
                    <Subtotal label="Total Equity" value={totalEquity} />

                    <div className="mt-4" />
                    <Total label="Total Liabilities & Equity" value={totalLiabEquity} />

                    {/* ── Equation check ── */}
                    <div className={`mt-6 rounded-lg px-4 py-3 flex items-center justify-between text-sm ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <span className={`font-mono text-xs ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                        {fmt(totalAssets)} = {fmt(totalLiabilities)} + {fmt(totalEquity)}
                      </span>
                      <span className={`font-bold text-sm ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                        {isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
                      </span>
                    </div>

                  </div>

                  {/* Footer */}
                  <div className="px-8 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                    Prepared by GThink ERP &middot; {new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })} &middot; Unaudited
                  </div>

                </div>
              </div>
            );
          })()}
          {!bs && !bsLoading && <EmptyState message="Click Load Balance Sheet to view the snapshot" icon={<DollarSign className="w-8 h-8 text-gray-300"/>} />}
        </div>
      )}

            {/* P&L Report Tab */}
      {tab==='pl' && (
        <div className="space-y-5">
          <div className="card">
            <div className="flex flex-wrap items-end gap-3">
              <div><label className="form-label">From</label><input type="date" className="form-input" value={plFrom} onChange={e => setPlFrom(e.target.value)} /></div>
              <div><label className="form-label">To</label><input type="date" className="form-input" value={plTo} onChange={e => setPlTo(e.target.value)} /></div>
              <button className="btn-primary" onClick={loadPl} disabled={plLoading}>{plLoading ? 'Loading...' : 'Generate Report'}</button>
              {pl && <button className="btn-secondary" onClick={() => { setPlFrom(''); setPlTo(''); setPl(null); }}>Clear</button>}
            </div>
          </div>
          {plLoading && <Spinner />}
          {pl && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Revenue" value={`GHS ${parseFloat(pl.revenue||0).toFixed(2)}`} icon={<TrendingUp className="w-6 h-6 text-green-600"/>} color="bg-green-50" />
                <StatCard label="Gross Profit" value={`GHS ${parseFloat(pl.gross_profit||0).toFixed(2)}`} icon={<DollarSign className="w-6 h-6 text-blue-600"/>} color="bg-blue-50" />
                <StatCard label="Total Expenses" value={`GHS ${parseFloat(pl.total_expenses||0).toFixed(2)}`} icon={<TrendingDown className="w-6 h-6 text-red-600"/>} color="bg-red-50" />
                <StatCard label="Net Profit" value={`GHS ${parseFloat(pl.net_profit||0).toFixed(2)}`} icon={<DollarSign className="w-6 h-6 text-purple-600"/>} color={pl.net_profit >= 0 ? 'bg-green-50' : 'bg-red-50'} />
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
                          <td className="px-4 py-2 text-right font-semibold text-red-600">GHS {parseFloat(c.total).toFixed(2)}</td>
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
                          <span className="text-xs font-semibold w-28 text-right">GHS {parseFloat(m.revenue).toFixed(2)}</span>
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

      {/* Tax / VAT Tab */}
      {tab==='tax' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : taxRates.length===0 ? <EmptyState message="No tax rates configured" icon={<Receipt className="w-8 h-8 text-gray-300"/>} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-header"><tr>{['Name','Rate (%)','Applies To','Status',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {taxRates.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{t.name}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700">{parseFloat(t.rate).toFixed(2)}%</td>
                      <td className="px-4 py-3"><span className="badge badge-blue">{t.applies_to}</span></td>
                      <td className="px-4 py-3">{t.is_active ? <span className="badge bg-green-100 text-green-700">Active</span> : <span className="badge bg-gray-100 text-gray-500">Inactive</span>}</td>
                      <td className="px-4 py-3 flex gap-1">
                        <button onClick={() => openEditTax(t)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteTax(t.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tax Rate Modal */}
      <Modal open={!!taxModal} onClose={() => setTaxModal(null)} title={taxModal==='edit' ? 'Edit Tax Rate' : 'Add Tax Rate'} size="sm">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Name *</label><input className="form-input" value={taxForm.name} onChange={e => setTaxForm({...taxForm,name:e.target.value})} placeholder="e.g. VAT" /></div>
          <div className="grid grid-cols-2 gap-3">
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
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setTaxModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveTax} disabled={saving}>{saving?'Saving…':taxModal==='edit'?'Update':'Add Tax Rate'}</button>
        </div>
      </Modal>

      {/* Add Expense Modal */}
      <Modal open={modal==='expense'} onClose={() => setModal(null)} title={selectedExpense ? 'Edit Expense' : 'Record Expense'} size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Title *</label><input className="form-input" value={expForm.title} onChange={e => setExpForm({...expForm,title:e.target.value})} placeholder="e.g. Office rent" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Category</label><input className="form-input" value={expForm.category} onChange={e => setExpForm({...expForm,category:e.target.value})} placeholder="e.g. Rent" /></div>
            <div><label className="form-label">Amount (GHS) *</label><input type="number" className="form-input" value={expForm.amount} onChange={e => setExpForm({...expForm,amount:e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Account</label>
              <select className="form-input" value={expForm.account_id} onChange={e => setExpForm({...expForm,account_id:e.target.value})}>
                <option value="">Select account</option>
                {accounts.filter(a=>a.type==='expense').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">Date</label><input type="date" className="form-input" value={expForm.expense_date} onChange={e => setExpForm({...expForm,expense_date:e.target.value})} /></div>
          </div>
          <div><label className="form-label">Description</label><textarea className="form-input" rows={2} value={expForm.description} onChange={e => setExpForm({...expForm,description:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveExpense} disabled={saving}>{saving?'Saving…':selectedExpense?'Update Expense':'Save Expense'}</button>
        </div>
      </Modal>

      {/* Journal Entry Modal */}
      <Modal open={modal==='journal'} onClose={() => setModal(null)} title="New Journal Entry" size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2"><label className="form-label">Description *</label><input className="form-input" value={jeForm.description} onChange={e => setJeForm({...jeForm,description:e.target.value})} /></div>
          <div><label className="form-label">Date</label><input type="date" className="form-input" value={jeForm.entry_date} onChange={e => setJeForm({...jeForm,entry_date:e.target.value})} /></div>
        </div>
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Journal Lines</h4>
            <button className="btn-secondary py-1 text-xs" onClick={addJeLine}><Plus className="w-3 h-3" />Add Line</button>
          </div>
          <div className="space-y-2">
            {jeForm.lines.map((line,i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <select className="form-input col-span-2" value={line.account_id} onChange={e => updateJeLine(i,'account_id',e.target.value)}>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
                <input type="number" className="form-input" placeholder="Debit" value={line.debit} onChange={e => updateJeLine(i,'debit',e.target.value)} />
                <input type="number" className="form-input" placeholder="Credit" value={line.credit} onChange={e => updateJeLine(i,'credit',e.target.value)} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-8 mt-3 text-sm font-semibold">
            <span>Total Debit: GHS {jeForm.lines.reduce((s,l)=>s+(parseFloat(l.debit)||0),0).toFixed(2)}</span>
            <span>Total Credit: GHS {jeForm.lines.reduce((s,l)=>s+(parseFloat(l.credit)||0),0).toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveJournal} disabled={saving}>{saving?'Saving…':'Post Entry'}</button>
        </div>
      </Modal>

      {/* Account Add/Edit Modal */}
      <Modal open={modal==='account'} onClose={() => setModal(null)} title={selectedAccount ? 'Edit Account' : 'Add Account'} size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Code *</label><input className="form-input" value={accForm.code} onChange={e => setAccForm({...accForm,code:e.target.value})} placeholder="e.g. 1001" disabled={!!selectedAccount} /></div>
            <div><label className="form-label">Type *</label>
              <select className="form-input" value={accForm.type} onChange={e => setAccForm({...accForm,type:e.target.value})}>
                {['asset','liability','equity','revenue','expense'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div><label className="form-label">Account Name *</label><input className="form-input" value={accForm.name} onChange={e => setAccForm({...accForm,name:e.target.value})} placeholder="e.g. Cash & Bank" /></div>
          <div><label className="form-label">Description</label><textarea className="form-input" rows={2} value={accForm.description} onChange={e => setAccForm({...accForm,description:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveAccount} disabled={saving}>{saving?'Saving…':selectedAccount?'Update Account':'Add Account'}</button>
        </div>
      </Modal>
    </AppLayout>
  );
}
