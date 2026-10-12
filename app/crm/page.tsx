'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, ConfirmDialog, toast } from '@/components/ui';
import { Plus, Search, User, TrendingUp, MessageSquare, ArrowRight, Target, Users, Phone, Mail, MessageCircle, Video, Upload, Download, Edit2, Trash2, Send } from 'lucide-react';
import api, { apiCache } from '@/lib/api';
import ResponsiveTable from '@/components/ui/ResponsiveTable';

const CSV_FIELDS = ['name','email','phone','company','address','segment','notes'] as const;
const CSV_TEMPLATE = 'name,email,phone,company,address,segment,notes\nAma Mensah,ama@example.com,0244000000,Mensah Ltd,Accra,general,Prefers WhatsApp\n';

// Minimal RFC-4180 parser: quoted fields, escaped quotes, commas/newlines inside quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

const STAGES = ['new','contacted','qualified','proposal','negotiation','won','lost'];
const STAGE_COLORS: Record<string,string> = {
  new:'bg-purple-100 text-purple-800', contacted:'bg-[#0D3B6E]/8 text-[#0D3B6E]', qualified:'bg-teal-100 text-teal-800',
  proposal:'bg-yellow-100 text-yellow-800', negotiation:'bg-orange-100 text-orange-800', won:'bg-green-100 text-green-800', lost:'bg-red-100 text-red-800'
};

export default function CRMPage() {
  const [tab, setTab] = useState<'customers'|'leads'|'contacts'>('customers');
  const [customers, setCustomers] = useState<any[]>(() => apiCache.get('/customers') || []);
  const [leads, setLeads] = useState<any[]>(() => apiCache.get('/leads') || []);
  const [users, setUsers] = useState<any[]>(() => apiCache.get('/users') || []);
  const [contacts, setContacts] = useState<any[]>(() => apiCache.get('/contact-history') || []);
  const [loading, setLoading] = useState(() => !apiCache.get('/customers'));
  const [modal, setModal] = useState<'add_customer'|'edit_customer'|'import_customers'|'sms_customers'|'add_lead'|'add_contact'|'convert_lead'|null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [products, setProducts] = useState<any[]>(() => apiCache.get('/products?is_active=true') || []);

  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[]|null>(null);
  const [importRows, setImportRows] = useState<Record<string,string>[]>([]);
  const [importResult, setImportResult] = useState<{imported:number;skipped:number;errors:{row:number;message:string}[]}|null>(null);
  const [smsBody, setSmsBody] = useState('');
  const [smsTargets, setSmsTargets] = useState<any[]>([]);

  const [custForm, setCustForm] = useState({ name:'', email:'', phone:'', company:'', address:'', segment:'general', notes:'' });
  const [leadForm, setLeadForm] = useState({ customer_id:'', title:'', stage:'new', value:'', assigned_to:'', notes:'', next_followup:'' });
  const [contactForm, setContactForm] = useState<any>({ customer_id:'', type:'call', notes:'', contact_date: new Date().toISOString().split('T')[0], subject:'' });
  const [convertForm, setConvertForm] = useState({ customer_name:'', customer_email:'', customer_phone:'', delivery_address:'', items:[{product_id:'',quantity:1}] });

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [c, l, u, p] = await Promise.all([
        api.get('/customers').catch(()=>({data:{data:[]}})),
        api.get('/leads').catch(()=>({data:{data:[]}})),
        api.get('/users').catch(()=>({data:{data:[]}})),
        api.get('/products?is_active=true').catch(()=>({data:{data:[]}})),
      ]);
      apiCache.set('/customers', c.data.data);
      apiCache.set('/leads', l.data.data);
      apiCache.set('/users', u.data.data);
      apiCache.set('/products?is_active=true', p.data.data);
      setCustomers(c.data.data); setLeads(l.data.data); setUsers(u.data.data); setProducts(p.data.data);
    } finally { setLoading(false); }
  };

  const loadContacts = async (silent = false) => {
    if (!silent) setLoading(true);
    const r = await api.get('/contact-history').catch(()=>({data:{data:[]}}));
    apiCache.set('/contact-history', r.data.data || []);
    setContacts(r.data.data || []);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    const hasCache = !!apiCache.get('/customers');
    if (!hasCache || apiCache.isStale('/customers')) load(!hasCache);
  }, []);

  useEffect(() => {
    if (tab === 'contacts') {
      if (!apiCache.get('/contact-history') || apiCache.isStale('/contact-history')) loadContacts();
    }
  }, [tab]);

  const filteredCustomers = customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()));
  const filteredLeads = leads.filter(l => (!search || l.title.toLowerCase().includes(search.toLowerCase())) && (!filterStage || l.stage===filterStage));

  const saveCustomer = async () => {
    setSaving(true); setError('');
    try {
      if (modal === 'edit_customer' && editingId) await api.put(`/customers/${editingId}`, custForm);
      else await api.post('/customers', custForm);
      apiCache.invalidate('/customers'); setModal(null); load();
      toast.success(modal === 'edit_customer' ? 'Customer updated' : 'Customer added');
    }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const openEditCustomer = (c: any) => {
    setEditingId(c.id);
    setCustForm({ name:c.name||'', email:c.email||'', phone:c.phone||'', company:c.company||'', address:c.address||'', segment:c.segment||'general', notes:c.notes||'' });
    setError(''); setModal('edit_customer');
  };

  const deleteCustomers = async (ids: string[]) => {
    try {
      if (ids.length === 1) await api.delete(`/customers/${ids[0]}`);
      else await api.post('/customers/bulk-delete', { ids });
      toast.success(`${ids.length} customer${ids.length>1?'s':''} deleted`);
      setSelected(sel => sel.filter(id => !ids.includes(id)));
      apiCache.invalidate('/customers'); load(true);
    } catch(e:any) { toast.error(e.response?.data?.message || 'Could not delete'); }
  };

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }));
    a.download = 'customers-template.csv'; a.click();
  };

  const onCsvFile = async (file?: File) => {
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (rows.length < 2) { toast.error('The file has no data rows'); return; }
    const header = rows[0].map(h => h.trim().toLowerCase());
    if (!header.includes('name')) { toast.error('The first row must be a header containing a "name" column'); return; }
    setImportRows(rows.slice(1).map(r => Object.fromEntries(CSV_FIELDS.map(f => [f, (r[header.indexOf(f)] ?? '').trim()]))));
    setImportResult(null);
  };

  const submitImport = async () => {
    setSaving(true);
    try {
      const r = await api.post('/customers/bulk', { customers: importRows });
      setImportResult(r.data.data);
      if (r.data.data.imported) { apiCache.invalidate('/customers'); load(true); }
      setImportRows([]);
    } catch(e:any) { toast.error(e.response?.data?.message || 'Import failed'); }
    finally { setSaving(false); }
  };

  const openSms = (targets: any[]) => {
    const withPhone = targets.filter(c => c.phone);
    if (!withPhone.length) { toast.error('None of the selected customers has a phone number'); return; }
    setSmsTargets(withPhone); setSmsBody(''); setModal('sms_customers');
  };

  const sendSms = async () => {
    setSaving(true);
    try {
      const r = await api.post('/sms/campaign', { recipients: smsTargets.map(c => c.phone), body: smsBody, name: 'CRM' });
      const { sent, failed } = r.data.data;
      if (sent) toast.success(`SMS sent to ${sent}${failed ? `, ${failed} failed` : ''}`); else toast.error('No messages were sent — check your SMS credits');
      setModal(null); setSelected([]);
    } catch(e:any) { toast.error(e.response?.data?.message || 'Could not send SMS'); }
    finally { setSaving(false); }
  };

  const saveLead = async () => {
    setSaving(true); setError('');
    try { await api.post('/leads', leadForm); apiCache.invalidate('/leads'); setModal(null); load(); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const saveContact = async () => {
    setSaving(true); setError('');
    try { await api.post('/contact-history', contactForm); apiCache.invalidate('/contact-history'); setModal(null); loadContacts(); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const convertLead = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/orders', { ...convertForm, items: convertForm.items.filter(i=>i.product_id) });
      await api.patch(`/leads/${selectedLead.id}`, { stage: 'won' });
      apiCache.invalidate('/leads');
      setModal(null); load();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const openConvert = (lead: any) => {
    setSelectedLead(lead);
    const cust = customers.find(c => c.id === lead.customer_id);
    setConvertForm({ customer_name: cust?.name||lead.title, customer_email: cust?.email||'', customer_phone: cust?.phone||'', delivery_address: cust?.address||'', items:[{product_id:'',quantity:1}] });
    setError(''); setModal('convert_lead');
  };

  const updateLeadStage = async (id: number, stage: string) => {
    await api.patch(`/leads/${id}`, { stage }).catch(()=>{});
    apiCache.invalidate('/leads');
    toast.success('Updated successfully');
    load();
  };

  const totalPipelineValue = leads.filter(l=>!['won','lost'].includes(l.stage)).reduce((s,l)=>s+parseFloat(l.value||0),0);

  return (
    <AppLayout title="CRM" subtitle="Customers, leads and sales pipeline" allowedRoles={['business_owner','branch_manager','sales_staff']}>
      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="card py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D3B6E]/8 flex items-center justify-center"><User className="w-5 h-5 text-[#0D3B6E]"/></div>
          <div><div className="text-xl font-bold">{customers.length}</div><div className="text-xs text-gray-500">Total Customers</div></div>
        </div>
        <div className="card py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D3B6E]/8 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-[#0D3B6E]"/></div>
          <div><div className="text-xl font-bold">{leads.filter(l=>!['won','lost'].includes(l.stage)).length}</div><div className="text-xs text-gray-500">Active Leads</div></div>
        </div>
        <div className="card py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D3B6E]/8 flex items-center justify-center"><span className="text-[#0D3B6E] font-bold text-sm">₵</span></div>
          <div><div className="text-xl font-bold">GH₵ {totalPipelineValue.toFixed(0)}</div><div className="text-xs text-gray-500">Pipeline Value</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-5">
        {([{t:'customers',l:'Customers',icon:<Users className="w-4 h-4"/>},{t:'leads',l:'Leads & Pipeline',icon:<Target className="w-4 h-4"/>},{t:'contacts',l:'Contact History',icon:<MessageSquare className="w-4 h-4"/>}]).map(({t,l,icon}) => (
          <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 w-full sm:w-auto ${tab===t?'bg-[#0D3B6E] text-white':'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{icon}{l}</button>
        ))}
        <div className="sm:ml-auto flex gap-2 w-full sm:w-auto">
          {tab==='customers' && <button className="btn-secondary w-full sm:w-auto" onClick={() => { setImportRows([]); setImportResult(null); setModal('import_customers'); }}><Upload className="w-4 h-4"/>Import CSV</button>}
          {tab==='customers' && <button className="btn-primary w-full sm:w-auto" onClick={() => { setCustForm({name:'',email:'',phone:'',company:'',address:'',segment:'general',notes:''}); setError(''); setModal('add_customer'); }}><Plus className="w-4 h-4"/>Add Customer</button>}
          {tab==='leads' && <button className="btn-primary w-full sm:w-auto" onClick={() => { setLeadForm({customer_id:'',title:'',stage:'new',value:'',assigned_to:'',notes:'',next_followup:''}); setError(''); setModal('add_lead'); }}><Plus className="w-4 h-4"/>Add Lead</button>}
          {tab==='contacts' && <button className="btn-primary w-full sm:w-auto" onClick={() => { setContactForm({customer_id:'',type:'call',notes:'',contact_date:new Date().toISOString().split('T')[0],subject:''}); setError(''); setModal('add_contact'); }}><MessageSquare className="w-4 h-4"/>Log Contact</button>}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder={tab==='customers'?'Search customers…':'Search leads…'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {tab==='leads' && (
          <select className="form-input w-full sm:w-auto" value={filterStage} onChange={e => setFilterStage(e.target.value)}>
            <option value="">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Contact History Tab */}
      {tab==='contacts' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : contacts.length===0 ? <EmptyState message="No contact history yet" icon={<MessageSquare className="w-8 h-8 text-gray-300"/>} /> : (
            <ResponsiveTable
              headers={['Customer','Type','Notes','Date']}
              data={contacts}
              renderRow={(c) => [
                <span className="font-medium">{c.customer_name||'—'}</span>,
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0D3B6E]/8 text-[#0D3B6E] capitalize">{c.type}</span>,
                <span className="text-gray-500 max-w-xs truncate">{c.notes||'—'}</span>,
                <span className="text-gray-400 text-xs">{new Date(c.contact_date).toLocaleDateString()}</span>
              ]}
            />
          )}
        </div>
      )}

      {/* Customers Table */}
      {tab==='customers' && selected.length>0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 bg-[#0D3B6E]/5 border border-[#0D3B6E]/20 rounded-lg px-3 py-2 text-sm">
          <span className="font-medium text-[#0D3B6E]">{selected.length} selected</span>
          <button className="btn-secondary ml-auto" onClick={() => setSelected(filteredCustomers.length===selected.length ? [] : filteredCustomers.map(c => c.id))}>{filteredCustomers.length===selected.length?'Clear':'Select all'}</button>
          <button className="btn-secondary" onClick={() => openSms(customers.filter(c => selected.includes(c.id)))}><Send className="w-4 h-4"/>Send SMS</button>
          <button className="btn-danger" onClick={() => setConfirmDelete(selected)}><Trash2 className="w-4 h-4"/>Delete</button>
        </div>
      )}
      {tab==='customers' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : filteredCustomers.length===0 ? <EmptyState message="No customers yet" icon={<Users className="w-8 h-8 text-gray-300"/>} /> : (
            <ResponsiveTable
              headers={[' ','Name','Company','Email','Phone','Segment','Since','Actions']}
              data={filteredCustomers}
              renderRow={(c) => [
                <input type="checkbox" className="w-4 h-4" checked={selected.includes(c.id)} onChange={() => setSelected(sel => sel.includes(c.id) ? sel.filter(i => i!==c.id) : [...sel, c.id])} aria-label={`Select ${c.name}`} />,
                <span className="font-medium">{c.name}</span>,
                <span className="text-gray-500">{c.company||'—'}</span>,
                <span className="text-gray-500">{c.email||'—'}</span>,
                <span className="text-gray-500">{c.phone||'—'}</span>,
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0D3B6E]/8 text-[#0D3B6E] capitalize">{c.segment}</span>,
                <span className="text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString()}</span>,
                <div className="flex gap-1 justify-end">
                  <button title="Send SMS" onClick={() => openSms([c])} className="p-1.5 hover:bg-green-50 rounded text-green-600"><MessageCircle className="w-4 h-4"/></button>
                  <button title="Edit" onClick={() => openEditCustomer(c)} className="p-1.5 hover:bg-gray-100 rounded text-[#0D3B6E]"><Edit2 className="w-4 h-4"/></button>
                  <button title="Delete" onClick={() => setConfirmDelete([c.id])} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button>
                </div>
              ]}
            />
          )}
        </div>
      )}

      {/* Leads Kanban */}
      {tab==='leads' && (
        loading ? <Spinner /> : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {STAGES.map(stage => {
                const stageLeads = filteredLeads.filter(l => l.stage===stage);
                return (
                  <div key={stage} className="w-60 flex-shrink-0">
                    <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${STAGE_COLORS[stage]}`}>
                      <span className="text-xs font-bold uppercase tracking-wide capitalize">{stage}</span>
                      <span className="text-xs font-semibold">{stageLeads.length}</span>
                    </div>
                    <div className="bg-gray-100 rounded-b-lg p-2 space-y-2 min-h-48">
                      {stageLeads.length===0 && <div className="text-xs text-gray-400 text-center py-6">No leads</div>}
                      {stageLeads.map(lead => (
                        <div key={lead.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                          <div className="font-medium text-sm text-gray-900 mb-1 truncate">{lead.title}</div>
                          <div className="text-xs text-gray-500 mb-2">{lead.customer_name||'—'}</div>
                          {lead.value && <div className="text-xs font-semibold text-green-700 mb-2">GH₵ {parseFloat(lead.value).toFixed(0)}</div>}
                          <div className="flex gap-1 mb-2">
                            <select className="flex-1 text-xs border border-gray-200 rounded px-1 py-1 bg-gray-50" value={lead.stage} onChange={e => updateLeadStage(lead.id, e.target.value)}>
                              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {!['won','lost'].includes(lead.stage) && (
                              <button onClick={() => openConvert(lead)} title="Convert to Order" className="p-1 hover:bg-green-50 rounded text-green-600 border border-gray-200">
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
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

      {/* Log Contact Modal */}
      <Modal open={modal==='add_contact'} onClose={() => setModal(null)} title="Log Contact" size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="form-label">Customer</label>
            <select className="form-input" value={contactForm.customer_id} onChange={e => setContactForm({...contactForm, customer_id: e.target.value})}>
              <option value="">Select customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Contact Type</label>
            <div className="grid grid-cols-5 gap-2">
              {([
                { type: 'call',     icon: Phone,         label: 'Call',     color: 'text-[#0D3B6E] bg-[#0D3B6E]/8 border-[#0D3B6E]/30' },
                { type: 'sms',      icon: MessageCircle, label: 'SMS',      color: 'text-green-600 bg-green-50 border-green-200' },
                { type: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                { type: 'email',    icon: Mail,          label: 'Email',    color: 'text-purple-600 bg-purple-50 border-purple-200' },
                { type: 'meeting',  icon: Video,         label: 'Meeting',  color: 'text-orange-600 bg-orange-50 border-orange-200' },
              ] as const).map(({ type, icon: Icon, label, color }) => (
                <button key={type} type="button" onClick={() => setContactForm({ ...contactForm, type })}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    contactForm.type === type ? color + ' border-current' : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={3} value={contactForm.notes} onChange={e => setContactForm({ ...contactForm, notes: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={contactForm.contact_date} onChange={e => setContactForm({ ...contactForm, contact_date: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveContact} disabled={saving}>{saving ? 'Saving…' : 'Log Contact'}</button>
        </div>
      </Modal>

      {/* Convert Lead to Order Modal */}
      <Modal open={modal==='convert_lead'} onClose={() => setModal(null)} title={`Convert Lead to Order — ${selectedLead?.title}`} size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="sm:col-span-2"><label className="form-label">Customer Name *</label><input className="form-input" value={convertForm.customer_name} onChange={e => setConvertForm({...convertForm,customer_name:e.target.value})} /></div>
          <div><label className="form-label">Email</label><input type="email" className="form-input" value={convertForm.customer_email} onChange={e => setConvertForm({...convertForm,customer_email:e.target.value})} /></div>
          <div><label className="form-label">Phone</label><input className="form-input" value={convertForm.customer_phone} onChange={e => setConvertForm({...convertForm,customer_phone:e.target.value})} /></div>
          <div className="sm:col-span-2"><label className="form-label">Delivery Address</label><input className="form-input" value={convertForm.delivery_address} onChange={e => setConvertForm({...convertForm,delivery_address:e.target.value})} /></div>
        </div>
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Order Items</h4>
            <button className="btn-secondary py-1 text-xs" onClick={() => setConvertForm({...convertForm,items:[...convertForm.items,{product_id:'',quantity:1}]})}><Plus className="w-3 h-3"/>Add</button>
          </div>
          <div className="space-y-2">
            {convertForm.items.map((item,i) => (
              <div key={i} className="flex gap-2">
                <select className="form-input flex-1" value={item.product_id} onChange={e => { const it=[...convertForm.items]; it[i]={...it[i],product_id:e.target.value}; setConvertForm({...convertForm,items:it}); }}>
                  <option value="">Select product</option>
                  {products.map((p:any) => <option key={p.id} value={p.id}>{p.name} — GH₵ {p.price}</option>)}
                </select>
                <input type="number" className="form-input w-20" min={1} value={item.quantity} onChange={e => { const it=[...convertForm.items]; it[i]={...it[i],quantity:parseInt(e.target.value)}; setConvertForm({...convertForm,items:it}); }} />
                {convertForm.items.length>1 && <button onClick={() => setConvertForm({...convertForm,items:convertForm.items.filter((_,idx)=>idx!==i)})} className="text-red-400 px-1">✕</button>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={convertLead} disabled={saving}>{saving?'Converting…':'Convert to Order'}</button>
        </div>
      </Modal>

      {/* Add Customer Modal */}
      {/* Import CSV Modal */}
      <Modal open={modal==='import_customers'} onClose={() => setModal(null)} title="Import Customers from CSV" size="md">
        <div className="space-y-4 text-sm">
          <p className="text-gray-600">Upload a CSV with a header row. Columns: <code>name</code> (required), email, phone, company, address, segment, notes.</p>
          <button className="btn-secondary" onClick={downloadTemplate}><Download className="w-4 h-4"/>Download template</button>
          <input type="file" accept=".csv,text/csv" className="form-input" onChange={e => onCsvFile(e.target.files?.[0])} />
          {importRows.length>0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="font-medium mb-1">{importRows.length} row{importRows.length>1?'s':''} ready to import</div>
              <ul className="text-xs text-gray-500 space-y-0.5">
                {importRows.slice(0,5).map((r,i) => <li key={i}>{r.name||'(no name)'} · {r.phone||r.email||'—'}</li>)}
                {importRows.length>5 && <li>…and {importRows.length-5} more</li>}
              </ul>
            </div>
          )}
          {importResult && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="font-medium text-green-700">{importResult.imported} imported{importResult.skipped ? `, ${importResult.skipped} skipped` : ''}</div>
              {importResult.errors.length>0 && (
                <ul className="text-xs text-red-600 mt-2 max-h-40 overflow-y-auto space-y-0.5">
                  {importResult.errors.slice(0,50).map(e => <li key={e.row}>Row {e.row}: {e.message}</li>)}
                  {importResult.errors.length>50 && <li>…and {importResult.errors.length-50} more</li>}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>{importResult?'Close':'Cancel'}</button>
          <button className="btn-primary" onClick={submitImport} disabled={saving||importRows.length===0}>{saving?'Importing…':'Import'}</button>
        </div>
      </Modal>

      {/* SMS Modal */}
      <Modal open={modal==='sms_customers'} onClose={() => setModal(null)} title={`Send SMS to ${smsTargets.length} customer${smsTargets.length>1?'s':''}`} size="md">
        <div className="space-y-3">
          <p className="text-xs text-gray-500 truncate">{smsTargets.slice(0,5).map(c => c.name).join(', ')}{smsTargets.length>5?` +${smsTargets.length-5} more`:''}</p>
          <textarea className="form-input" rows={5} maxLength={612} placeholder="Type your message…" value={smsBody} onChange={e => setSmsBody(e.target.value)} />
          <p className="form-hint">{smsBody.length} characters · uses your SMS credits (one per message part, per recipient). Customers without a phone number are left out.</p>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={sendSms} disabled={saving||!smsBody.trim()}>{saving?'Sending…':'Send'}</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteCustomers(confirmDelete)}
        title="Delete customers"
        message={`Delete ${confirmDelete?.length||0} customer${(confirmDelete?.length||0)>1?'s':''}? This cannot be undone.`}
        danger
      />

      <Modal open={modal==='add_customer'||modal==='edit_customer'} onClose={() => setModal(null)} title={modal==='edit_customer'?'Edit Customer':'Add Customer'} size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Name *</label><input className="form-input" value={custForm.name} onChange={e => setCustForm({...custForm,name:e.target.value})} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="form-label">Email</label><input type="email" className="form-input" value={custForm.email} onChange={e => setCustForm({...custForm,email:e.target.value})} /></div>
            <div><label className="form-label">Phone</label><input className="form-input" value={custForm.phone} onChange={e => setCustForm({...custForm,phone:e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="form-label">Company</label><input className="form-input" value={custForm.company} onChange={e => setCustForm({...custForm,company:e.target.value})} /></div>
            <div><label className="form-label">Segment</label>
              <select className="form-input" value={custForm.segment} onChange={e => setCustForm({...custForm,segment:e.target.value})}>
                {['general','vip','wholesale','retail','corporate'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className="form-label">Address</label><textarea className="form-input" rows={2} value={custForm.address} onChange={e => setCustForm({...custForm,address:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveCustomer} disabled={saving}>{saving?'Saving…':'Add Customer'}</button>
        </div>
      </Modal>

      {/* Add Lead Modal */}
      <Modal open={modal==='add_lead'} onClose={() => setModal(null)} title="Add Lead" size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Lead Title *</label><input className="form-input" value={leadForm.title} onChange={e => setLeadForm({...leadForm,title:e.target.value})} placeholder="e.g. Office furniture supply deal" /></div>
          <div><label className="form-label">Customer</label>
            <select className="form-input" value={leadForm.customer_id} onChange={e => setLeadForm({...leadForm,customer_id:e.target.value})}>
              <option value="">Select customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company?` — ${c.company}`:''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="form-label">Stage</label>
              <select className="form-input" value={leadForm.stage} onChange={e => setLeadForm({...leadForm,stage:e.target.value})}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="form-label">Value (GH₵)</label><input type="number" className="form-input" value={leadForm.value} onChange={e => setLeadForm({...leadForm,value:e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="form-label">Assigned To</label>
              <select className="form-input" value={leadForm.assigned_to} onChange={e => setLeadForm({...leadForm,assigned_to:e.target.value})}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">Follow-up Date</label><input type="datetime-local" className="form-input" value={leadForm.next_followup} onChange={e => setLeadForm({...leadForm,next_followup:e.target.value})} /></div>
          </div>
          <div><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={leadForm.notes} onChange={e => setLeadForm({...leadForm,notes:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveLead} disabled={saving}>{saving?'Saving…':'Add Lead'}</button>
        </div>
      </Modal>
    </AppLayout>
  );
}
