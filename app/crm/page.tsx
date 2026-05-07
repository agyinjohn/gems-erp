'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, toast } from '@/components/ui';
import { Plus, Search, User, TrendingUp, MessageSquare, ArrowRight, Target, Users } from 'lucide-react';
import api from '@/lib/api';
import ResponsiveTable from '@/components/ui/ResponsiveTable';

const STAGES = ['new','contacted','qualified','proposal','negotiation','won','lost'];
const STAGE_COLORS: Record<string,string> = {
  new:'bg-purple-100 text-purple-800', contacted:'bg-blue-100 text-blue-800', qualified:'bg-teal-100 text-teal-800',
  proposal:'bg-yellow-100 text-yellow-800', negotiation:'bg-orange-100 text-orange-800', won:'bg-green-100 text-green-800', lost:'bg-red-100 text-red-800'
};

export default function CRMPage() {
  const [tab, setTab] = useState<'customers'|'leads'|'contacts'>('customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add_customer'|'add_lead'|'add_contact'|'convert_lead'|null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  const [custForm, setCustForm] = useState({ name:'', email:'', phone:'', company:'', address:'', segment:'general', notes:'' });
  const [leadForm, setLeadForm] = useState({ customer_id:'', title:'', stage:'new', value:'', assigned_to:'', notes:'', next_followup:'' });
  const [contactForm, setContactForm] = useState({ customer_id:'', type:'call', notes:'', contact_date: new Date().toISOString().split('T')[0] });
  const [convertForm, setConvertForm] = useState({ customer_name:'', customer_email:'', customer_phone:'', delivery_address:'', items:[{product_id:'',quantity:1}] });

  const load = async () => {
    setLoading(true);
    try {
      const [c, l, u, p] = await Promise.all([
        api.get('/customers').catch(()=>({data:{data:[]}})),
        api.get('/leads').catch(()=>({data:{data:[]}})),
        api.get('/users').catch(()=>({data:{data:[]}})),
        api.get('/products?is_active=true').catch(()=>({data:{data:[]}})),
      ]);
      setCustomers(c.data.data); setLeads(l.data.data); setUsers(u.data.data); setProducts(p.data.data);
    } finally { setLoading(false); }
  };

  const loadContacts = async () => {
    const r = await api.get('/contact-history').catch(()=>({data:{data:[]}}));
    setContacts(r.data.data||[]);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab==='contacts') loadContacts(); }, [tab]);

  const filteredCustomers = customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()));
  const filteredLeads = leads.filter(l => (!search || l.title.toLowerCase().includes(search.toLowerCase())) && (!filterStage || l.stage===filterStage));

  const saveCustomer = async () => {
    setSaving(true); setError('');
    try { await api.post('/customers', custForm); setModal(null); load(); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const saveLead = async () => {
    setSaving(true); setError('');
    try { await api.post('/leads', leadForm); setModal(null); load(); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const saveContact = async () => {
    setSaving(true); setError('');
    try { await api.post('/contact-history', contactForm); setModal(null); loadContacts(); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const convertLead = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/orders', { ...convertForm, items: convertForm.items.filter(i=>i.product_id) });
      await api.patch(`/leads/${selectedLead.id}`, { stage: 'won' });
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
    toast.success('Updated successfully');
    load();
  };

  const totalPipelineValue = leads.filter(l=>!['won','lost'].includes(l.stage)).reduce((s,l)=>s+parseFloat(l.value||0),0);

  return (
    <AppLayout title="CRM" subtitle="Customers, leads and sales pipeline" allowedRoles={['business_owner','branch_manager','sales_staff']}>
      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="card py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><User className="w-5 h-5 text-blue-600"/></div>
          <div><div className="text-xl font-bold">{customers.length}</div><div className="text-xs text-gray-500">Total Customers</div></div>
        </div>
        <div className="card py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-purple-600"/></div>
          <div><div className="text-xl font-bold">{leads.filter(l=>!['won','lost'].includes(l.stage)).length}</div><div className="text-xs text-gray-500">Active Leads</div></div>
        </div>
        <div className="card py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><span className="text-green-600 font-bold text-sm">₵</span></div>
          <div><div className="text-xl font-bold">GHS {totalPipelineValue.toFixed(0)}</div><div className="text-xs text-gray-500">Pipeline Value</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-5">
        {([{t:'customers',l:'Customers',icon:<Users className="w-4 h-4"/>},{t:'leads',l:'Leads & Pipeline',icon:<Target className="w-4 h-4"/>},{t:'contacts',l:'Contact History',icon:<MessageSquare className="w-4 h-4"/>}]).map(({t,l,icon}) => (
          <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 w-full sm:w-auto ${tab===t?'bg-blue-700 text-white':'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{icon}{l}</button>
        ))}
        <div className="sm:ml-auto flex gap-2 w-full sm:w-auto">
          {tab==='customers' && <button className="btn-primary w-full sm:w-auto" onClick={() => { setCustForm({name:'',email:'',phone:'',company:'',address:'',segment:'general',notes:''}); setError(''); setModal('add_customer'); }}><Plus className="w-4 h-4"/>Add Customer</button>}
          {tab==='leads' && <button className="btn-primary w-full sm:w-auto" onClick={() => { setLeadForm({customer_id:'',title:'',stage:'new',value:'',assigned_to:'',notes:'',next_followup:''}); setError(''); setModal('add_lead'); }}><Plus className="w-4 h-4"/>Add Lead</button>}
          {tab==='contacts' && <button className="btn-primary w-full sm:w-auto" onClick={() => { setContactForm({customer_id:'',type:'call',notes:'',contact_date:new Date().toISOString().split('T')[0]}); setError(''); setModal('add_contact'); }}><MessageSquare className="w-4 h-4"/>Log Contact</button>}
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
                <span className="badge badge-blue capitalize">{c.type}</span>,
                <span className="text-gray-500 max-w-xs truncate">{c.notes||'—'}</span>,
                <span className="text-gray-400 text-xs">{new Date(c.contact_date).toLocaleDateString()}</span>
              ]}
            />
          )}
        </div>
      )}

      {/* Customers Table */}
      {tab==='customers' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : filteredCustomers.length===0 ? <EmptyState message="No customers yet" icon={<Users className="w-8 h-8 text-gray-300"/>} /> : (
            <ResponsiveTable
              headers={['Name','Company','Email','Phone','Segment','Since']}
              data={filteredCustomers}
              renderRow={(c) => [
                <span className="font-medium">{c.name}</span>,
                <span className="text-gray-500">{c.company||'—'}</span>,
                <span className="text-gray-500">{c.email||'—'}</span>,
                <span className="text-gray-500">{c.phone||'—'}</span>,
                <span className="badge badge-blue capitalize">{c.segment}</span>,
                <span className="text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString()}</span>
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
                          {lead.value && <div className="text-xs font-semibold text-green-700 mb-2">GHS {parseFloat(lead.value).toFixed(0)}</div>}
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
        <div className="space-y-3">
          <div><label className="form-label">Customer</label>
            <select className="form-input" value={contactForm.customer_id} onChange={e => setContactForm({...contactForm,customer_id:e.target.value})}>
              <option value="">Select customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company?` — ${c.company}`:''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="form-label">Type</label>
              <select className="form-input" value={contactForm.type} onChange={e => setContactForm({...contactForm,type:e.target.value})}>
                {['call','email','meeting','whatsapp','other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="form-label">Date</label><input type="date" className="form-input" value={contactForm.contact_date} onChange={e => setContactForm({...contactForm,contact_date:e.target.value})} /></div>
          </div>
          <div><label className="form-label">Notes</label><textarea className="form-input" rows={3} value={contactForm.notes} onChange={e => setContactForm({...contactForm,notes:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveContact} disabled={saving}>{saving?'Saving…':'Log Contact'}</button>
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
                  {products.map((p:any) => <option key={p.id} value={p.id}>{p.name} — GHS {p.price}</option>)}
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
      <Modal open={modal==='add_customer'} onClose={() => setModal(null)} title="Add Customer" size="md">
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
            <div><label className="form-label">Value (GHS)</label><input type="number" className="form-input" value={leadForm.value} onChange={e => setLeadForm({...leadForm,value:e.target.value})} /></div>
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
