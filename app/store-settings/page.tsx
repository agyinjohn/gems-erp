'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner, toast } from '@/components/ui';
import { ExternalLink, Save, Store, Truck, Megaphone } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  DEFAULT_STOREFRONT_SETTINGS,
  fetchMerchantStoreSettings,
  saveMerchantStoreSettings,
  type StorefrontSettings,
} from '@/lib/storefrontSettings';
import { formatGhs } from '@/components/store/theme';

export default function StoreSettingsPage() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StorefrontSettings>({ ...DEFAULT_STOREFRONT_SETTINGS });

  useEffect(() => {
    fetchMerchantStoreSettings()
      .then(setForm)
      .finally(() => setLoading(false));
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
              </div>
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
