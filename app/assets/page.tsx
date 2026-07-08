'use client';
import { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, ConfirmDialog, toast } from '@/components/ui';
import { Plus, Search, Edit2, Trash2, MapPin, Tag, CheckCircle, Wrench, Package, Upload, Download, ChevronDown } from 'lucide-react';
import api, { apiCache } from '@/lib/api';

const PRESET_CATEGORIES = [
  { name: 'Electronics',        description: 'Computers, phones, TVs and electronic devices',   icon: '💻' },
  { name: 'Furniture',          description: 'Desks, chairs, tables and office furniture',        icon: '🪑' },
  { name: 'Vehicles',           description: 'Cars, motorcycles, trucks and transport assets',    icon: '🚗' },
  { name: 'Machinery',          description: 'Industrial machines and manufacturing equipment',   icon: '⚙️' },
  { name: 'Office Equipment',   description: 'Printers, projectors, scanners and office tools',  icon: '🖨️' },
  { name: 'Tools & Equipment',  description: 'Hand tools, power tools and workshop equipment',   icon: '🔧' },
  { name: 'IT Infrastructure',  description: 'Servers, routers, switches and network equipment', icon: '🖥️' },
  { name: 'Medical Equipment',  description: 'Medical devices and healthcare equipment',          icon: '🏥' },
  { name: 'Kitchen Equipment',  description: 'Fridges, ovens, microwaves and kitchen appliances', icon: '🍳' },
  { name: 'Security Systems',   description: 'CCTV cameras, alarms and access control systems',  icon: '🔒' },
  { name: 'Land & Buildings',   description: 'Property, land and real estate assets',            icon: '🏢' },
  { name: 'Other',              description: 'Miscellaneous assets not in other categories',      icon: '📦' },
];

function PresetModal({ open, onClose, presets, existing, onAdd, saving }: {
  open: boolean; onClose: () => void;
  presets: typeof PRESET_CATEGORIES; existing: string[];
  onAdd: (names: string[]) => void; saving: boolean;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  if (!open) return null;
  const toggle = (name: string) => setPicked(p => p.includes(name) ? p.filter(n => n !== name) : [...p, name]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Add Preset Categories</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 text-xl">&times;</button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-400 mb-4">Select the categories you want to add. Already existing ones are greyed out.</p>
          <div className="grid grid-cols-2 gap-2">
            {presets.map(p => {
              const exists = existing.includes(p.name);
              const sel = picked.includes(p.name);
              return (
                <button key={p.name} onClick={() => !exists && toggle(p.name)} disabled={exists}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    exists ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' :
                    sel    ? 'border-[#0D3B6E] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className="text-xl flex-shrink-0">{p.icon}</span>
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold ${sel ? 'text-[#0D3B6E]' : 'text-gray-800'}`}>{p.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-tight">{p.description}</div>
                  </div>
                  {exists && <span className="ml-auto text-[10px] text-gray-400 flex-shrink-0 mt-0.5">Added</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onAdd(picked); setPicked([]); }} disabled={saving || !picked.length}>
            {saving ? 'Adding…' : `Add ${picked.length || ''} Categor${picked.length === 1 ? 'y' : 'ies'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const [tab, setTab] = useState<'assets'|'categories'>('assets');
  const [assets, setAssets]         = useState<any[]>(() => apiCache.get('/assets') || []);
  const [categories, setCategories] = useState<any[]>(() => apiCache.get('/asset-categories') || []);
  const [locations, setLocations]   = useState<any[]>(() => apiCache.get('/locations') || []);
  const [employees, setEmployees]   = useState<any[]>(() => apiCache.get('/employees') || []);
  const [loading, setLoading]       = useState(() => !apiCache.get('/assets'));
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal]           = useState<'asset'|'cat'|'log'|'import-cat'|'import-asset'|'preset'|null>(null);
  const [selected, setSelected]     = useState<any>(null);
  const [confirm, setConfirm]       = useState<any>(null);
  const [saving, setSaving]         = useState(false);
  const [importing, setImporting]   = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importError, setImportError] = useState('');
  const catFileRef  = useRef<HTMLInputElement>(null);
  const assetFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name:'', category_id:'', description:'', purchase_date:'',
    purchase_value:'', condition:'good', status:'active',
    assigned_to:'', location_id:'', serial_number:'',
    warranty_expiry:'', notes:'',
  });

  const [catForm, setCatForm] = useState({ name:'', description:'' });

  const [logForm, setLogForm] = useState({
    type:'maintenance', notes:'', cost:'',
    to_location:'', to_employee:'', new_condition:'',
  });

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [a, c, l, e] = await Promise.all([
        api.get('/assets').catch(() => ({ data: { data: [] } })),
        api.get('/asset-categories').catch(() => ({ data: { data: [] } })),
        api.get('/locations').catch(() => ({ data: { data: [] } })),
        api.get('/employees').catch(() => ({ data: { data: [] } })),
      ]);
      apiCache.set('/assets', a.data.data);
      apiCache.set('/asset-categories', c.data.data);
      apiCache.set('/locations', l.data.data);
      apiCache.set('/employees', e.data.data);
      setAssets(a.data.data);
      setCategories(c.data.data);
      setLocations(l.data.data);
      setEmployees(e.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const hasCache = !!apiCache.get('/assets');
    if (!hasCache || apiCache.isStale('/assets')) load(!hasCache);
  }, []);

  const filtered = assets.filter(a =>
    (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.asset_code?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatus || a.status === filterStatus)
  );

  const openAdd = () => {
    setSelected(null);
    setForm({ name:'', category_id:'', description:'', purchase_date:'', purchase_value:'', condition:'good', status:'active', assigned_to:'', location_id:'', serial_number:'', warranty_expiry:'', notes:'' });
    setModal('asset');
  };

  const openEdit = (a: any) => {
    setSelected(a);
    setForm({
      name: a.name, category_id: a.category_id?.id || '', description: a.description || '',
      purchase_date: a.purchase_date?.split('T')[0] || '', purchase_value: String(a.purchase_value || ''),
      condition: a.condition, status: a.status, assigned_to: a.assigned_to?.id || '',
      location_id: a.location_id?.id || '', serial_number: a.serial_number || '',
      warranty_expiry: a.warranty_expiry?.split('T')[0] || '', notes: a.notes || '',
    });
    setModal('asset');
  };

  const saveAsset = async () => {
    if (!form.name.trim()) { toast.error('Asset name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, purchase_value: parseFloat(form.purchase_value) || 0 };
      if (selected) await api.put(`/assets/${selected.id}`, payload);
      else await api.post('/assets', payload);
      apiCache.invalidate('/assets');
      toast.success('Saved successfully');
      setModal(null); load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Error saving asset'); }
    finally { setSaving(false); }
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      if (selected) await api.put(`/asset-categories/${selected.id}`, catForm);
      else await api.post('/asset-categories', catForm);
      apiCache.invalidate('/asset-categories');
      toast.success('Saved'); setModal(null); load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const saveLog = async () => {
    if (!logForm.notes.trim()) { toast.error('Notes are required'); return; }
    setSaving(true);
    try {
      await api.post(`/assets/${selected.id}/log`, {
        ...logForm, cost: parseFloat(logForm.cost) || 0,
      });
      apiCache.invalidate('/assets');
      toast.success('Log added'); setModal(null); load();
    } catch(e: any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  // Summary stats
  const totalValue   = assets.reduce((s, a) => s + (a.current_value || 0), 0);
  const activeCount  = assets.filter(a => a.status === 'active').length;
  const repairCount  = assets.filter(a => a.status === 'under_repair').length;

  // CSV parser
  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
    });
  };

  const handleCatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target?.result as string);
      if (!rows.length) { setImportError('No valid rows found. Make sure the file has a header row.'); return; }
      setImportRows(rows); setImportError(''); setModal('import-cat');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAssetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target?.result as string);
      if (!rows.length) { setImportError('No valid rows found.'); return; }
      setImportRows(rows); setImportError(''); setModal('import-asset');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const runCatImport = async () => {
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of importRows) {
      if (!row.name?.trim()) { failed++; continue; }
      try { await api.post('/asset-categories', { name: row.name.trim(), description: row.description || '' }); success++; }
      catch { failed++; }
    }
    toast.success(`Imported ${success} categories${failed ? `, ${failed} skipped` : ''}`);
    setImporting(false); setModal(null); apiCache.invalidate('/asset-categories'); load();
  };

  const runAssetImport = async () => {
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of importRows) {
      if (!row.name?.trim()) { failed++; continue; }
      const cat = categories.find(c => c.name.toLowerCase() === row.category?.toLowerCase());
      const loc = locations.find(l => l.name.toLowerCase() === row.location?.toLowerCase());
      try {
        await api.post('/assets', {
          name: row.name.trim(),
          category_id: cat?.id || '',
          serial_number: row.serial_number || '',
          purchase_date: row.purchase_date || '',
          purchase_value: parseFloat(row.purchase_value) || 0,
          condition: row.condition || 'good',
          status: row.status || 'active',
          location_id: loc?.id || '',
          notes: row.notes || '',
        });
        success++;
      } catch { failed++; }
    }
    toast.success(`Imported ${success} assets${failed ? `, ${failed} skipped` : ''}`);
    setImporting(false); setModal(null); apiCache.invalidate('/assets'); load();
  };

  const downloadCatTemplate = () => {
    const csv = 'name,description\nElectronics,Computers and devices\nFurniture,Office furniture';
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'asset_categories_template.csv'; a.click();
  };

  const downloadAssetTemplate = () => {
    const csv = 'name,category,serial_number,purchase_date,purchase_value,condition,status,location,notes\nDell Laptop,Electronics,SN123,2024-01-15,3500,good,active,Shelf A1,Main office laptop';
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'assets_template.csv'; a.click();
  };

  const addPresetCategories = async (selected: string[]) => {
    setSaving(true);
    let added = 0;
    for (const name of selected) {
      const preset = PRESET_CATEGORIES.find(p => p.name === name);
      if (!preset) continue;
      try { await api.post('/asset-categories', { name: preset.name, description: preset.description }); added++; }
      catch { /* already exists */ }
    }
    toast.success(`Added ${added} categor${added === 1 ? 'y' : 'ies'}`);
    setSaving(false); setModal(null); apiCache.invalidate('/asset-categories'); load();
  };

  return (
    <AppLayout title="Assets" subtitle="Track and manage business assets" allowedRoles={['business_owner','branch_manager','warehouse_staff']}>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Assets',   value: assets.length,                          color: 'bg-blue-50',   icon: <Package className="w-5 h-5 text-blue-600" /> },
          { label: 'Active',         value: activeCount,                             color: 'bg-green-50',  icon: <CheckCircle className="w-5 h-5 text-green-600" /> },
          { label: 'Under Repair',   value: repairCount,                             color: 'bg-yellow-50', icon: <Wrench className="w-5 h-5 text-yellow-600" /> },
          { label: 'Total Value',    value: `GHS ${totalValue.toLocaleString()}`,    color: 'bg-purple-50', icon: <Tag className="w-5 h-5 text-purple-600" /> },
        ].map(s => (
          <div key={s.label} className="card py-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {([{t:'assets',l:'Assets'},{t:'categories',l:'Categories'}] as const).map(({t,l}) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t ? 'bg-[#0D3B6E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {tab === 'assets' && (
            <>
              <button className="btn-secondary" onClick={() => assetFileRef.current?.click()}><Upload className="w-4 h-4" />Import CSV</button>
              <button className="btn-secondary" onClick={downloadAssetTemplate}><Download className="w-4 h-4" />Template</button>
              <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Asset</button>
              <input ref={assetFileRef} type="file" accept=".csv" className="hidden" onChange={handleAssetFileChange} />
            </>
          )}
          {tab === 'categories' && (
            <>
              <button className="btn-secondary" onClick={() => setModal('preset')}><ChevronDown className="w-4 h-4" />Presets</button>
              <button className="btn-secondary" onClick={() => catFileRef.current?.click()}><Upload className="w-4 h-4" />Import CSV</button>
              <button className="btn-secondary" onClick={downloadCatTemplate}><Download className="w-4 h-4" />Template</button>
              <button className="btn-primary" onClick={() => { setSelected(null); setCatForm({name:'',description:''}); setModal('cat'); }}><Plus className="w-4 h-4" />Add Category</button>
              <input ref={catFileRef} type="file" accept=".csv" className="hidden" onChange={handleCatFileChange} />
            </>
          )}
        </div>
      </div>

      {/* Assets tab */}
      {tab === 'assets' && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="form-input pl-9" placeholder="Search assets or code…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {['active','under_repair','disposed','lost'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>

          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : filtered.length === 0
              ? <EmptyState message="No assets found" description="Add your first asset to start tracking." icon={<Package className="w-8 h-8 text-gray-300" />} action={{ label: '+ Add Asset', onClick: openAdd }} />
              : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>{['Code','Name','Category','Location','Assigned To','Condition','Status','Value',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{a.asset_code}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                        <td className="px-4 py-3 text-gray-500">{a.category_id?.name || '—'}</td>
                        <td className="px-4 py-3">
                          {a.location_id ? (
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3 text-gray-400" />{a.location_id.name}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{a.assigned_to?.name || '—'}</td>
                        <td className="px-4 py-3"><span className="text-xs text-gray-600 capitalize">{a.condition}</span></td>
                        <td className="px-4 py-3"><span className="text-xs text-gray-600 capitalize">{a.status.replace('_',' ')}</span></td>
                        <td className="px-4 py-3 font-semibold text-gray-700">GHS {(a.current_value||0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setSelected(a); setLogForm({type:'maintenance',notes:'',cost:'',to_location:'',to_employee:'',new_condition:''}); setModal('log'); }}
                              className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600" title="Add Log"><Wrench className="w-4 h-4" /></button>
                            <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Categories tab */}
      {tab === 'categories' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : categories.length === 0
            ? <EmptyState message="No asset categories" description="Create categories to organise your assets." icon={<Tag className="w-8 h-8 text-gray-300" />} />
            : (
            <table className="w-full text-sm">
              <thead className="table-header"><tr>{['Name','Description','Assets',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map(c => {
                  const count = assets.filter(a => a.category_id?.id === c.id).length;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-gray-400">{c.description || '—'}</td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{count} asset{count !== 1 ? 's' : ''}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setSelected(c); setCatForm({name:c.name,description:c.description||''}); setModal('cat'); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setConfirm(c)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add/Edit Asset Modal */}
      <Modal open={modal === 'asset'} onClose={() => setModal(null)} title={selected ? 'Edit Asset' : 'Add Asset'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="form-label">Asset Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Dell Laptop" /></div>
          <div><label className="form-label">Category</label>
            <select className="form-input" value={form.category_id} onChange={e => setForm({...form,category_id:e.target.value})}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="form-label">Serial Number</label><input className="form-input" value={form.serial_number} onChange={e => setForm({...form,serial_number:e.target.value})} placeholder="e.g. SN123456" /></div>
          <div><label className="form-label">Purchase Date</label><input type="date" className="form-input" value={form.purchase_date} onChange={e => setForm({...form,purchase_date:e.target.value})} /></div>
          <div><label className="form-label">Purchase Value (GHS)</label><input type="number" className="form-input" value={form.purchase_value} onChange={e => setForm({...form,purchase_value:e.target.value})} /></div>
          <div><label className="form-label">Condition</label>
            <select className="form-input" value={form.condition} onChange={e => setForm({...form,condition:e.target.value})}>
              {['excellent','good','fair','poor'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
              {['active','under_repair','disposed','lost'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <div><label className="form-label">Location / Shelf</label>
            <select className="form-input" value={form.location_id} onChange={e => setForm({...form,location_id:e.target.value})}>
              <option value="">No location</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>)}
            </select>
          </div>
          <div><label className="form-label">Assigned To</label>
            <select className="form-input" value={form.assigned_to} onChange={e => setForm({...form,assigned_to:e.target.value})}>
              <option value="">Unassigned</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div><label className="form-label">Warranty Expiry</label><input type="date" className="form-input" value={form.warranty_expiry} onChange={e => setForm({...form,warranty_expiry:e.target.value})} /></div>
          <div className="col-span-2"><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveAsset} disabled={saving}>{saving ? 'Saving…' : selected ? 'Update Asset' : 'Add Asset'}</button>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal open={modal === 'cat'} onClose={() => setModal(null)} title={selected ? 'Edit Category' : 'Add Category'} size="sm">
        <div className="space-y-3">
          <div><label className="form-label">Name *</label><input className="form-input" value={catForm.name} onChange={e => setCatForm({...catForm,name:e.target.value})} autoFocus /></div>
          <div><label className="form-label">Description</label><textarea className="form-input" rows={2} value={catForm.description} onChange={e => setCatForm({...catForm,description:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveCat} disabled={saving}>{saving ? 'Saving…' : selected ? 'Update' : 'Add Category'}</button>
        </div>
      </Modal>

      {/* Log Modal */}
      <Modal open={modal === 'log'} onClose={() => setModal(null)} title={`Log Entry — ${selected?.name}`} size="md">
        <div className="space-y-3">
          <div><label className="form-label">Type *</label>
            <select className="form-input" value={logForm.type} onChange={e => setLogForm({...logForm,type:e.target.value})}>
              {['maintenance','repair','transfer','condition_change','disposal','note'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select>
          </div>
          <div><label className="form-label">Notes *</label><textarea className="form-input" rows={3} value={logForm.notes} onChange={e => setLogForm({...logForm,notes:e.target.value})} placeholder="Describe what happened…" /></div>
          <div><label className="form-label">Cost (GHS)</label><input type="number" className="form-input" value={logForm.cost} onChange={e => setLogForm({...logForm,cost:e.target.value})} placeholder="0" /></div>
          {logForm.type === 'transfer' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="form-label">New Location</label>
                <select className="form-input" value={logForm.to_location} onChange={e => setLogForm({...logForm,to_location:e.target.value})}>
                  <option value="">Same location</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div><label className="form-label">Assign To</label>
                <select className="form-input" value={logForm.to_employee} onChange={e => setLogForm({...logForm,to_employee:e.target.value})}>
                  <option value="">Same person</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
          )}
          {logForm.type === 'condition_change' && (
            <div><label className="form-label">New Condition</label>
              <select className="form-input" value={logForm.new_condition} onChange={e => setLogForm({...logForm,new_condition:e.target.value})}>
                <option value="">Select condition</option>
                {['excellent','good','fair','poor'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveLog} disabled={saving}>{saving ? 'Saving…' : 'Add Log'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={async () => { await api.delete(`/asset-categories/${confirm.id}`).catch(() => {}); apiCache.invalidate('/asset-categories'); toast.success('Deleted'); load(); }} title="Delete Category" message={`Delete "${confirm?.name}"?`} danger />

      {/* Preset Categories Modal */}
      <PresetModal
        open={modal === 'preset'}
        onClose={() => setModal(null)}
        presets={PRESET_CATEGORIES}
        existing={categories.map(c => c.name)}
        onAdd={addPresetCategories}
        saving={saving}
      />

      {/* Import Categories Preview Modal */}
      <Modal open={modal === 'import-cat'} onClose={() => setModal(null)} title={`Import Categories — ${importRows.length} rows`} size="md">
        <div className="mb-4 max-h-60 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="table-header"><tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Description</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {importRows.map((r, i) => (
                <tr key={i} className={!r.name?.trim() ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2 font-medium">{r.name || <span className="text-red-400">missing</span>}</td>
                  <td className="px-3 py-2 text-gray-400">{r.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mb-4">Rows with missing names will be skipped. Duplicates will be ignored.</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={runCatImport} disabled={importing}>{importing ? 'Importing…' : `Import ${importRows.length} Categories`}</button>
        </div>
      </Modal>

      {/* Import Assets Preview Modal */}
      <Modal open={modal === 'import-asset'} onClose={() => setModal(null)} title={`Import Assets — ${importRows.length} rows`} size="lg">
        <div className="mb-4 max-h-60 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="table-header"><tr>{['Name','Category','Serial No.','Value','Condition','Status'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {importRows.map((r, i) => (
                <tr key={i} className={!r.name?.trim() ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2 font-medium">{r.name || <span className="text-red-400">missing</span>}</td>
                  <td className="px-3 py-2 text-gray-500">{r.category || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-400">{r.serial_number || '—'}</td>
                  <td className="px-3 py-2">{r.purchase_value ? `GHS ${r.purchase_value}` : '—'}</td>
                  <td className="px-3 py-2 capitalize">{r.condition || 'good'}</td>
                  <td className="px-3 py-2 capitalize">{r.status || 'active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mb-4">Category and Location are matched by name. Rows with missing names will be skipped.</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={runAssetImport} disabled={importing}>{importing ? 'Importing…' : `Import ${importRows.length} Assets`}</button>
        </div>
      </Modal>

    </AppLayout>
  );
}
