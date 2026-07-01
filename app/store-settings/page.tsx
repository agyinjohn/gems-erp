'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner, toast } from '@/components/ui';
import { ExternalLink, Save, Store, Truck, Megaphone, Tag, Plus, Trash2, Wallet, Star } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import {
  DEFAULT_STOREFRONT_SETTINGS,
  fetchMerchantStoreSettings,
  saveMerchantStoreSettings,
  type StorefrontSettings,
} from '@/lib/storefrontSettings';
import { formatGhs } from '@/components/store/theme';

const MOMO_NETWORKS = [
  { label: 'MTN Mobile Money', code: 'MTN' },
  { label: 'Vodafone Cash', code: 'VOD' },
  { label: 'AirtelTigo Money', code: 'ATL' },
];

interface PayoutMethod {
  id: string;
  type: 'mobile_money' | 'bank';
  label: string;
  account_number: string;
  account_name: string;
  bank_code: string;
  is_default: boolean;
}

export default function StoreSettingsPage() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StorefrontSettings>({ ...DEFAULT_STOREFRONT_SETTINGS });
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponForm, setCouponForm] = useState({ code: '', discount_type: 'percent', discount_value: '10', min_order_amount: '0', max_uses: '0' });
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [payoutForm, setPayoutForm] = useState({ type: 'mobile_money', account_number: '', account_name: '', bank_code: 'MTN' });
  const [payoutSaving, setPayoutSaving] = useState(false);

  useEffect(() => {
    fetchMerchantStoreSettings()
      .then(setForm)
      .finally(() => setLoading(false));
    api.get('/coupons').then(r => setCoupons(r.data.data || [])).catch(() => {});
    api.get('/payout-methods').then(r => setPayoutMethods(r.data.data || [])).catch(() => {});
  }, []);

  const set = <K extends keyof StorefrontSettings>(key: K, value: StorefrontSettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveMerchantStoreSettings(form);
      setForm(saved);
      toast.success('Store settings saved');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const createCoupon = async () => {
    if (!couponForm.code.trim()) { toast.error('Coupon code required'); return; }
    try {
      const r = await api.post('/coupons', {
        ...couponForm,
        discount_value: parseFloat(couponForm.discount_value),
        min_order_amount: parseFloat(couponForm.min_order_amount) || 0,
        max_uses: parseInt(couponForm.max_uses, 10) || 0,
      });
      setCoupons(prev => [r.data.data, ...prev]);
      setCouponForm({ code: '', discount_type: 'percent', discount_value: '10', min_order_amount: '0', max_uses: '0' });
      toast.success('Coupon created');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not create coupon');
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await api.delete(`/coupons/${id}`);
      setCoupons(prev => prev.filter(c => (c.id || c._id) !== id));
      toast.success('Coupon deleted');
    } catch {
      toast.error('Could not delete coupon');
    }
  };

  const addPayoutMethod = async () => {
    if (!payoutForm.account_number.trim() || !payoutForm.account_name.trim()) {
      toast.error('Account number and name are required');
      return;
    }
    setPayoutSaving(true);
    try {
      const r = await api.post('/payout-methods', payoutForm);
      setPayoutMethods(prev => [...prev, r.data.data]);
      setPayoutForm({ type: 'mobile_money', account_number: '', account_name: '', bank_code: 'MTN' });
      toast.success('Payout method added');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not add payout method');
    } finally {
      setPayoutSaving(false);
    }
  };

  const setDefaultPayout = async (id: string) => {
    try {
      await api.patch(`/payout-methods/${id}/default`);
      setPayoutMethods(prev => prev.map(m => ({ ...m, is_default: m.id === id })));
    } catch {
      toast.error('Could not update default');
    }
  };

  const deletePayoutMethod = async (id: string) => {
    try {
      await api.delete(`/payout-methods/${id}`);
      setPayoutMethods(prev => prev.filter(m => m.id !== id));
      toast.success('Payout method removed');
    } catch {
      toast.error('Could not remove payout method');
    }
  };

  const storeUrl = tenant?.slug ? `/store/${tenant.slug}` : null;
  const previewSubtotal = 450;

  return (
    <AppLayout
      title="Online Store"
      subtitle="Configure your public storefront — delivery, announcements, and store link"
      allowedRoles={['business_owner', 'branch_manager']}
    >
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Store link */}
            <div className="card">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#0D3B6E]/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-[#0D3B6E]" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Storefront URL</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Share this link with customers</p>
                </div>
              </div>
              {storeUrl ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 truncate">
                    {typeof window !== 'undefined' ? `${window.location.origin}${storeUrl}` : storeUrl}
                  </code>
                  <a href={storeUrl} target="_blank" rel="noreferrer" className="btn-secondary justify-center">
                    <ExternalLink className="w-4 h-4" /> Preview
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Store link unavailable — check tenant configuration.</p>
              )}
            </div>

            {/* Delivery */}
            <div className="card">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Delivery</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Shown at checkout and on product pages</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Standard delivery fee (GH₵)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="form-input"
                    value={form.delivery_fee}
                    onChange={e => set('delivery_fee', Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className="form-label">Free delivery over (GH₵)</label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    className="form-input"
                    value={form.free_delivery_threshold}
                    onChange={e => set('free_delivery_threshold', Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Minimum order amount (GH₵)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="form-input"
                    value={form.min_order_amount ?? 0}
                    onChange={e => set('min_order_amount', Math.max(0, Number(e.target.value) || 0))}
                  />
                  <p className="form-hint">Set to 0 for no minimum</p>
                </div>
                <div>
                  <label className="form-label">Tax rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className="form-input"
                    value={form.tax_rate ?? 0}
                    onChange={e => set('tax_rate', Math.max(0, Number(e.target.value) || 0))}
                  />
                  <p className="form-hint">Applied to POS and storefront orders. Set to 0 to disable.</p>
                </div>
                <div>
                  <label className="form-label">Tax label</label>
                  <input
                    className="form-input"
                    placeholder="e.g. VAT, NHIL, Tax"
                    value={form.tax_name ?? ''}
                    onChange={e => set('tax_name', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Custom domain */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-2">Custom domain</h2>
              <p className="text-sm text-gray-500 mb-3">Point your domain (e.g. shop.yourbrand.com) to this app. Visitors at that domain see your storefront.</p>
              <input
                className="form-input font-mono text-sm"
                placeholder="shop.yourbrand.com"
                value={form.custom_domain || ''}
                onChange={e => set('custom_domain', e.target.value.toLowerCase().trim())}
              />
              <p className="text-xs text-gray-400 mt-2">
                DNS: CNAME to your GEMS host. API resolve: <code className="bg-gray-100 px-1 rounded">/api/storefront/resolve-domain?host=…</code>
              </p>
            </div>

            {/* Announcement */}
            <div className="card">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Store announcement</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Optional banner message on your storefront</p>
                </div>
              </div>
              <textarea
                className="form-input"
                rows={3}
                placeholder="e.g. Free delivery this weekend only!"
                value={form.announcement || ''}
                onChange={e => set('announcement', e.target.value)}
              />
            </div>

            <div className="card">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Promotions & coupons</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Customers enter codes at checkout</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input className="form-input font-mono uppercase" placeholder="CODE" value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} />
                <select className="form-input" value={couponForm.discount_type} onChange={e => setCouponForm({ ...couponForm, discount_type: e.target.value })}>
                  <option value="percent">Percent off</option>
                  <option value="fixed">Fixed amount (GH₵)</option>
                </select>
                <input type="number" className="form-input" placeholder="Discount value" value={couponForm.discount_value} onChange={e => setCouponForm({ ...couponForm, discount_value: e.target.value })} />
                <input type="number" className="form-input" placeholder="Min order (GH₵)" value={couponForm.min_order_amount} onChange={e => setCouponForm({ ...couponForm, min_order_amount: e.target.value })} />
              </div>
              <button type="button" className="btn-secondary mb-4" onClick={createCoupon}><Plus className="w-4 h-4" /> Add coupon</button>
              {coupons.length > 0 && (
                <div className="space-y-2">
                  {coupons.map(c => (
                    <div key={c.id || c._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="font-mono font-bold">{c.code}</span>
                        <span className="text-gray-500 ml-2">{c.discount_type === 'percent' ? `${c.discount_value}%` : formatGhs(c.discount_value)} off</span>
                        {c.used_count > 0 && <span className="text-xs text-gray-400 ml-2">used {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}</span>}
                      </div>
                      <button type="button" className="text-red-500 hover:text-red-700" onClick={() => deleteCoupon(c.id || c._id)}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.store_enabled}
                  onChange={e => set('store_enabled', e.target.checked)}
                  className="rounded border-gray-300 text-[#0D3B6E] focus:ring-[#0D3B6E]"
                />
                <span className="text-sm font-medium text-gray-700">Store is open for orders</span>
              </label>
            </div>

            {/* Payout Methods */}
            <div className="card">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Payout methods</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Where storefront payments are sent after each order</p>
                </div>
              </div>

              {/* Existing methods */}
              {payoutMethods.length > 0 && (
                <div className="space-y-2 mb-5">
                  {payoutMethods.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <p className="font-semibold text-gray-800">{m.account_name}</p>
                          <p className="text-gray-500 text-xs">{m.label} · {m.type === 'mobile_money' ? 'Mobile Money' : 'Bank'}</p>
                        </div>
                        {m.is_default && (
                          <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!m.is_default && (
                          <button type="button" onClick={() => setDefaultPayout(m.id)} className="text-gray-400 hover:text-[#0D3B6E]" title="Set as default">
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button type="button" onClick={() => deletePayoutMethod(m.id)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new method form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-input" value={payoutForm.type} onChange={e => setPayoutForm(p => ({ ...p, type: e.target.value, bank_code: e.target.value === 'mobile_money' ? 'MTN' : '' }))}>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="bank">Bank Account</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">{payoutForm.type === 'mobile_money' ? 'Network' : 'Bank code'}</label>
                  {payoutForm.type === 'mobile_money' ? (
                    <select className="form-input" value={payoutForm.bank_code} onChange={e => setPayoutForm(p => ({ ...p, bank_code: e.target.value }))}>
                      {MOMO_NETWORKS.map(n => <option key={n.code} value={n.code}>{n.label}</option>)}
                    </select>
                  ) : (
                    <input className="form-input" placeholder="e.g. 030100" value={payoutForm.bank_code} onChange={e => setPayoutForm(p => ({ ...p, bank_code: e.target.value }))} />
                  )}
                </div>
                <div>
                  <label className="form-label">{payoutForm.type === 'mobile_money' ? 'Phone number' : 'Account number'}</label>
                  <input className="form-input" placeholder={payoutForm.type === 'mobile_money' ? '024XXXXXXX' : 'Account number'} value={payoutForm.account_number} onChange={e => setPayoutForm(p => ({ ...p, account_number: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Account name</label>
                  <input className="form-input" placeholder="Name on account" value={payoutForm.account_name} onChange={e => setPayoutForm(p => ({ ...p, account_name: e.target.value }))} />
                </div>
              </div>
              <button type="button" className="btn-secondary mt-3" onClick={addPayoutMethod} disabled={payoutSaving}>
                <Plus className="w-4 h-4" /> {payoutSaving ? 'Adding…' : 'Add payout method'}
              </button>
              <p className="text-xs text-gray-400 mt-2">Paystack transfer fees are deducted from each payout. The default method receives payment immediately after each order.</p>
            </div>

            <button type="button" onClick={save} disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Checkout preview</h3>
              <p className="text-xs text-gray-500 mb-4">Example cart subtotal: {formatGhs(previewSubtotal)}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatGhs(previewSubtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>
                    {previewSubtotal >= form.free_delivery_threshold
                      ? 'Free'
                      : formatGhs(form.delivery_fee)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>
                    {formatGhs(
                      previewSubtotal + (previewSubtotal >= form.free_delivery_threshold ? 0 : form.delivery_fee),
                    )}
                  </span>
                </div>
              </div>
              {previewSubtotal < form.free_delivery_threshold && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-4 ring-1 ring-amber-100">
                  Add {formatGhs(form.free_delivery_threshold - previewSubtotal)} more for free delivery
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
