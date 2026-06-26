'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import PendingPaymentChip, { PendingPayment } from '@/components/pos/PendingPaymentChip';
import { toast } from '@/components/ui';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Package,
  Banknote, CreditCard, Smartphone, X, PrinterIcon, CheckCircle2, Barcode, RotateCcw,
  Clock, FileText, Loader2, Nfc, Monitor,
} from 'lucide-react';

interface Product { id: string; name: string; sku: string; barcode: string | null; price: number; stock_qty: number; category_name: string; images: string[]; }
interface CartItem { product: Product; quantity: number; }
interface Receipt { order_number: string; items: CartItem[]; total: number; payment_method: string; payment_ref?: string; amount_tendered: number; change: number; customer_name: string; customer_phone: string; createdAt: string; }

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash',           icon: Banknote },
  { value: 'momo',          label: 'Mobile Money',   icon: Smartphone },
  { value: 'card',          label: 'Card (QR)',       icon: CreditCard },
  { value: 'card_terminal', label: 'Paystack Terminal', icon: Nfc },
];
 
function paymentMethodLabel(method: string) {
  if (method === 'momo') return 'Mobile Money';
  if (method === 'card') return 'Card (QR)';
  if (method === 'card_terminal') return 'Paystack Terminal';
  return method.charAt(0).toUpperCase() + method.slice(1);
}

function PosModal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>,
    document.body,
  );
}

export default function POSPage() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [categories, setCategories]   = useState<string[]>([]);
  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState('');
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [vtConfigured, setVtConfigured] = useState<boolean | null>(null);
  const [vtName, setVtName] = useState('');
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showPayModal, setShowPayModal]   = useState(false);
  const [processing, setProcessing]       = useState(false);
  const [receipt, setReceipt]             = useState<Receipt | null>(null);
  const [error, setError]                 = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput]   = useState('');
  const [barcodeFlash, setBarcodeFlash]   = useState<'success'|'error'|null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrderNumber, setRefundOrderNumber] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [refundMessage, setRefundMessage] = useState('');
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('0');
  const [actualCash, setActualCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [zReport, setZReport] = useState<any>(null);
  const [shiftProcessing, setShiftProcessing] = useState(false);
  const [shiftMessage, setShiftMessage] = useState('');
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [displayingId, setDisplayingId] = useState<string | null>(null);
  const notifiedCompleteRef = useRef<Set<string>>(new Set());
  const [openingPaystack, setOpeningPaystack] = useState(false);

  const loadShift = useCallback(async () => {
    try {
      const r = await api.get('/pos/shifts/current');
      setCurrentShift(r.data.data);
    } catch { setCurrentShift(null); }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterCat) params.category = filterCat;
      const r = await api.get('/pos/products', { params });
      const data: Product[] = r.data.data;
      setProducts(data);
    } catch (e: any) {
      setFetchError(e.response?.data?.message || 'Failed to load products. Check your connection.');
    } finally { setLoading(false); }
  }, [search, filterCat]);

  // Load categories once on mount
  useEffect(() => {
    api.get('/pos/products').then(r => {
      const cats = [...new Set((r.data.data as Product[]).map(p => p.category_name).filter(Boolean))].sort();
      setCategories(cats as string[]);
    }).catch(() => {});
    setTimeout(() => barcodeRef.current?.focus(), 300);
    loadShift();
  }, [loadShift]);

  useEffect(() => {
    api.get('/pos/paystack/terminal').then(r => {
      setVtConfigured(!!r.data.data?.configured);
      setVtName(r.data.data?.name || '');
    }).catch(() => setVtConfigured(null));
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const loadPendingPayments = useCallback(async () => {
    try {
      const r = await api.get('/pos/paystack/pending');
      const list: PendingPayment[] = r.data.data || [];
      const events: Array<{
        type: string;
        order_id: string;
        order_number?: string;
        customer_name: string;
        total: number;
        message?: string;
        reason?: string;
      }> = r.data.events || [];

      for (const ev of events) {
        if (ev.type === 'completed') {
          if (!notifiedCompleteRef.current.has(ev.order_id)) {
            notifiedCompleteRef.current.add(ev.order_id);
            toast.success(`Payment received — ${ev.customer_name} · GH₵ ${Number(ev.total).toFixed(2)}${ev.order_number ? ` (${ev.order_number})` : ''}`);
          }
        } else if (ev.type === 'expired') {
          const key = `expired-${ev.order_id}`;
          if (!notifiedCompleteRef.current.has(key)) {
            notifiedCompleteRef.current.add(key);
            toast.error(`${ev.customer_name}: Payment expired — stock released.`);
          }
        } else if (ev.type === 'failed') {
          const key = `failed-${ev.order_id}`;
          if (!notifiedCompleteRef.current.has(key)) {
            notifiedCompleteRef.current.add(key);
            const msg = ev.reason === 'insufficient_stock'
              ? 'Payment received but items sold out — refund customer on Paystack.'
              : (ev.message || 'Payment failed.');
            toast.error(`${ev.customer_name}: ${msg}`);
          }
        }
      }

      setPendingPayments(list);
      if (events.some((e) => e.type === 'completed')) {
        loadProducts();
        loadShift();
      }
    } catch { /* ignore */ }
  }, [loadProducts, loadShift]);

  useEffect(() => {
    loadPendingPayments();
    const id = setInterval(() => { void loadPendingPayments(); }, 3000);
    return () => clearInterval(id);
  }, [loadPendingPayments]);

  // Barcode scan handler
  const handleBarcodeScan = useCallback((sku: string) => {
    const trimmed = sku.trim();
    if (!trimmed) return;
    // Match barcode first, then SKU (case-insensitive for SKU)
    const match = products.find(p =>
      (p.barcode && p.barcode === trimmed) ||
      p.sku.toUpperCase() === trimmed.toUpperCase()
    );
    if (match) {
      addToCart(match);
      setBarcodeFlash('success');
    } else {
      // Not in current filtered view — fetch from API
      api.get('/pos/products', { params: { search: trimmed } }).then(r => {
        const found = (r.data.data as Product[]).find(p =>
          (p.barcode && p.barcode === trimmed) ||
          p.sku.toUpperCase() === trimmed.toUpperCase()
        );
        if (found) { addToCart(found); setBarcodeFlash('success'); }
        else setBarcodeFlash('error');
      }).catch(() => setBarcodeFlash('error'));
    }
    setBarcodeInput('');
    setTimeout(() => setBarcodeFlash(null), 1200);
  }, [products]);

  // Cart helpers
  const addToCart = (product: Product) => {
    if (product.stock_qty <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_qty) return prev;
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== id) return i;
      const q = i.quantity + delta;
      if (q <= 0) return i; // handled by remove
      if (q > i.product.stock_qty) return i;
      return { ...i, quantity: q };
    }));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));
  const clearCart = () => {
    setCart([]); setCustomerName(''); setCustomerPhone(''); setAmountTendered('');
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const change = paymentMethod === 'cash' && amountTendered ? parseFloat(amountTendered) - cartTotal : 0;

  const openPayModal = () => {
    setError('');
    setAmountTendered(cartTotal.toFixed(2));
    setShowPayModal(true);
  };

  const closePayModal = () => {
    if (processing || openingPaystack) return;
    setShowPayModal(false);
  };

  const finalizePaystackOrder = useCallback(async (
    order_id: string,
    reference: string,
    method: string,
    opts?: { fromCart?: boolean; saleItems?: CartItem[]; saleTotal?: number; saleCustomerName?: string; saleCustomerPhone?: string },
  ) => {
    const r = await api.post('/pos/paystack/verify', { reference, order_id });
    const data = r.data.data;

    if (r.data.already_fulfilled) {
      return;
    }

    if (opts?.fromCart && opts.saleItems?.length) {
      setReceipt({
        order_number: data.order_number,
        items: opts.saleItems,
        total: opts.saleTotal ?? data.total,
        payment_method: method,
        payment_ref: data.payment_ref || reference,
        amount_tendered: opts.saleTotal ?? data.total,
        change: 0,
        customer_name: opts.saleCustomerName || 'Walk-in Customer',
        customer_phone: opts.saleCustomerPhone || '',
        createdAt: new Date().toISOString(),
      });
      clearCart();
    } else if (!notifiedCompleteRef.current.has(order_id)) {
      notifiedCompleteRef.current.add(order_id);
      toast.success(`Payment received — ${data.customer_name || 'Customer'} · GH₵ ${Number(data.total).toFixed(2)} (${data.order_number})`);
    }

    setShowPayModal(false);
    loadProducts();
    loadShift();
    loadPendingPayments();
  }, [loadProducts, loadShift, loadPendingPayments]);

  const verifyOnePending = async (p: PendingPayment) => {
    setVerifyingId(p.order_id);
    try {
      await finalizePaystackOrder(p.order_id, p.reference, p.payment_method);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Payment not received yet.');
    } finally {
      setVerifyingId(null);
    }
  };

  const showPendingOnDisplay = async (p: PendingPayment) => {
    setDisplayingId(p.order_id);
    try {
      await api.post('/pos/display/show', { order_id: p.order_id });
      toast.info(`Showing ${p.customer_name} on customer screen`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update customer screen.');
    } finally {
      setDisplayingId(null);
    }
  };

  const cancelOnePending = async (p: PendingPayment) => {
    if (!confirm(`Cancel pending payment for ${p.customer_name}?`)) return;
    try {
      await api.post('/pos/paystack/cancel', { order_id: p.order_id });
      toast.info(`Cancelled ${p.order_number}`);
      loadPendingPayments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not cancel.');
    }
  };

  const openCustomerDisplay = () => {
    window.open('/pos/customer-display', 'gems-customer-display', 'noopener,noreferrer');
  };

  const openShift = async () => {
    setShiftProcessing(true); setShiftMessage('');
    try {
      const r = await api.post('/pos/shifts/open', { opening_float: parseFloat(openingFloat) || 0 });
      setCurrentShift(r.data.data);
      setShowOpenShift(false);
      setOpeningFloat('0');
    } catch (e: any) {
      setShiftMessage(e.response?.data?.message || 'Could not open shift.');
    } finally { setShiftProcessing(false); }
  };

  const closeShift = async () => {
    if (!actualCash) { setShiftMessage('Enter actual cash in drawer.'); return; }
    setShiftProcessing(true); setShiftMessage('');
    try {
      const r = await api.post('/pos/shifts/close', { actual_cash: parseFloat(actualCash), notes: closeNotes });
      setZReport(r.data.data.z_report);
      setCurrentShift(null);
      setShowCloseShift(false);
      setActualCash('');
      setCloseNotes('');
    } catch (e: any) {
      setShiftMessage(e.response?.data?.message || 'Could not close shift.');
    } finally { setShiftProcessing(false); }
  };

  const completeMomoSale = async (initData: any) => {
    const { order_id, reference, amount, email, paystack_public_key } = initData;
    if (!paystack_public_key) {
      throw new Error('Paystack is not configured. Set PAYSTACK_PUBLIC_KEY on the server.');
    }
    if (!email) {
      throw new Error('No valid email for Paystack checkout. Use a staff account with a valid email.');
    }

    const amountKobo = Math.round((Number(amount) || cartTotal) * 100);
    if (!amountKobo || amountKobo < 100) {
      throw new Error('Transaction amount must be at least GH₵ 1.00.');
    }

    setShowPayModal(false);
    setOpeningPaystack(true);

    return new Promise<void>((resolve, reject) => {
      const saleItems = [...cart];
      const saleTotal = cartTotal;
      const saleCustomerName = customerName || 'Walk-in Customer';
      const saleCustomerPhone = customerPhone;

      const verifyAndComplete = async (paymentReference: string) => {
        try {
          await finalizePaystackOrder(order_id, paymentReference, 'momo', {
            fromCart: true,
            saleItems,
            saleTotal,
            saleCustomerName,
            saleCustomerPhone,
          });
          resolve();
        } catch (e: any) {
          toast.info(`MoMo pending — ${saleCustomerName} · GH₵ ${Number(amount).toFixed(2)}`);
          loadPendingPayments();
          reject(new Error(e.response?.data?.message || 'Payment verification failed.'));
        }
      };

      const run = () => {
        setOpeningPaystack(false);

        const onClose = function () {
          toast.info(`MoMo pending — ${saleCustomerName} · GH₵ ${Number(amount).toFixed(2)}`);
          loadPendingPayments();
          resolve();
        };
        const callback = function (response: { reference: string }) {
          void verifyAndComplete(response.reference);
        };

        const handler = (window as any).PaystackPop.setup({
          key: paystack_public_key,
          email,
          amount: amountKobo,
          currency: 'GHS',
          ref: reference,
          channels: ['mobile_money'],
          onClose,
          callback,
        });
        handler.openIframe();
      };
      if ((window as any).PaystackPop) run();
      else {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.onload = run;
        script.onerror = () => {
          setOpeningPaystack(false);
          reject(new Error('Could not load Paystack checkout.'));
        };
        document.body.appendChild(script);
      }
    });
  };

  const completeSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'cash' && parseFloat(amountTendered) < cartTotal) {
      setError('Amount tendered is less than total.'); return;
    }
    setProcessing(true); setError('');
    try {
      if (paymentMethod === 'momo') {
        const initRes = await api.post('/pos/paystack/init', {
          items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
          payment_method: paymentMethod,
          customer_name: customerName || 'Walk-in Customer',
          customer_phone: customerPhone,
        });
        setProcessing(false);
        await completeMomoSale(initRes.data.data);
        return;
      }
      if (paymentMethod === 'card' || paymentMethod === 'card_terminal') {
        const saleCustomerName = customerName || 'Walk-in Customer';
        const initRes = await api.post('/pos/paystack/init', {
          items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
          payment_method: paymentMethod,
          customer_name: saleCustomerName,
          customer_phone: customerPhone,
        });
        const data = initRes.data.data;
        if (!data.authorization_url) {
          throw new Error('Could not generate payment link.');
        }
        toast.info(`GH₵ ${Number(data.amount).toFixed(2)} on customer screen — ${saleCustomerName}`);
        clearCart();
        setShowPayModal(false);
        loadPendingPayments();
        return;
      }
      const r = await api.post('/pos/sale', {
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        payment_method: paymentMethod,
        amount_tendered: parseFloat(amountTendered) || cartTotal,
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone,
      });
      const data = r.data.data;
      setReceipt({
        order_number: data.order_number,
        items: [...cart],
        total: cartTotal,
        payment_method: paymentMethod,
        payment_ref: data.payment_ref || undefined,
        amount_tendered: paymentMethod === 'cash' ? (parseFloat(amountTendered) || cartTotal) : cartTotal,
        change: data.change || 0,
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone,
        createdAt: new Date().toISOString(),
      });
      setShowPayModal(false);
      clearCart();
      loadProducts();
      loadShift();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Sale failed. Please try again.');
    } finally { setProcessing(false); }
  };

  const printReceipt = () => window.print();

  const processRefund = async () => {
    if (!refundOrderNumber.trim()) { setRefundMessage('Enter the sale receipt number (e.g. POS-...).'); return; }
    setRefundProcessing(true); setRefundMessage('');
    try {
      const r = await api.post('/pos/refund', { order_number: refundOrderNumber.trim(), reason: refundReason || undefined });
      setRefundMessage(r.data.message || 'Refund processed.');
      setRefundOrderNumber('');
      setRefundReason('');
      loadProducts();
    } catch (e: any) {
      setRefundMessage(e.response?.data?.message || 'Refund failed.');
    } finally { setRefundProcessing(false); }
  };

  return (
    <AppLayout title="Point of Sale" subtitle="Walk-in sales terminal" allowedRoles={['business_owner','branch_manager','sales_staff']}>
      <div className="flex flex-col h-[calc(100dvh-8.5rem)] min-h-[28rem] -mx-4 sm:-mx-6 -mb-4 sm:-mb-6">
      <div className="relative z-20 shrink-0 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-white/80">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          {currentShift ? (
            <span className="text-gray-700">
              Shift <span className="font-mono font-semibold">{currentShift.shift_number}</span>
              <span className="text-gray-400 ml-2">· {currentShift.sales_count || 0} sales · GH₵ {parseFloat(currentShift.sales_total || 0).toFixed(2)}</span>
            </span>
          ) : (
            <span className="text-amber-700 font-medium">No open shift — open one to track cash drawer</span>
          )}
        </div>
        <div className="flex gap-2">
          {!currentShift ? (
            <button className="btn-secondary text-xs py-1.5" onClick={() => { setShiftMessage(''); setShowOpenShift(true); }}>Open Shift</button>
          ) : (
            <button className="btn-secondary text-xs py-1.5" onClick={() => { setShiftMessage(''); setActualCash(String(currentShift.expected_cash ?? currentShift.opening_float ?? '')); setShowCloseShift(true); }}>Close Shift / Z-Report</button>
          )}
          <button className="btn-secondary text-xs py-1.5" onClick={openCustomerDisplay}>
            <Monitor className="w-3.5 h-3.5 inline mr-1" />Customer screen
          </button>
          <button className="btn-secondary text-xs py-1.5" onClick={() => { setRefundMessage(''); setShowRefundModal(true); }}><RotateCcw className="w-3.5 h-3.5 inline mr-1" />Refund</button>
        </div>
      </div>

      {pendingPayments.length > 0 && (
        <div className="relative z-20 shrink-0 border-b border-amber-200 bg-amber-50 px-4 sm:px-6 py-2">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              {pendingPayments.length} payment{pendingPayments.length !== 1 ? 's' : ''} waiting — you can keep serving
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {pendingPayments.map(p => (
              <PendingPaymentChip
                key={p.order_id}
                payment={p}
                verifying={verifyingId === p.order_id}
                displaying={displayingId === p.order_id}
                onShowDisplay={() => showPendingOnDisplay(p)}
                onVerify={() => verifyOnePending(p)}
                onCancel={() => cancelOnePending(p)}
              />
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #pos-receipt-print, #pos-receipt-print * { visibility: visible !important; }
          #pos-receipt-print {
            position: fixed; left: 0; top: 0; width: 72mm; padding: 4mm;
            font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background: #fff;
          }
          #pos-receipt-print .no-print { display: none !important; }
        }
      `}</style>
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">

        {/* ══ LEFT: Product Panel ══ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 border-r border-gray-200">

          {/* Top bar: barcode + search + category tabs */}
          <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-0">

            {/* Barcode scanner input */}
            <div className={`relative mb-2 rounded-xl border-2 transition-all ${
              barcodeFlash === 'success' ? 'border-green-400 bg-green-50' :
              barcodeFlash === 'error'   ? 'border-red-400 bg-red-50' :
              'border-[#0D3B6E] bg-blue-50'
            }`}>
              <Barcode className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                barcodeFlash === 'success' ? 'text-green-500' :
                barcodeFlash === 'error'   ? 'text-red-500' :
                'text-[#0D3B6E]'
              }`} />
              <input
                ref={barcodeRef}
                className="w-full pl-9 pr-24 py-2.5 text-sm bg-transparent focus:outline-none font-mono"
                placeholder="Scan barcode or type SKU + Enter…"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleBarcodeScan(barcodeInput); }}
                autoComplete="off"
                spellCheck={false}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {barcodeFlash === 'success' && <span className="text-xs font-bold text-green-600">✓ Added!</span>}
                {barcodeFlash === 'error'   && <span className="text-xs font-bold text-red-500">Not found</span>}
                {!barcodeFlash && <kbd className="text-[10px] bg-white border border-gray-200 text-gray-400 px-1.5 py-0.5 rounded font-mono">Enter</kbd>}
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                placeholder="Search product name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Category tabs */}
            <div className="flex gap-0 overflow-x-auto">
              {['', ...categories].map(c => (
                <button
                  key={c}
                  onClick={() => setFilterCat(c)}
                  className={`flex-shrink-0 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    filterCat === c
                      ? 'border-[#0D3B6E] text-[#0D3B6E]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {c === '' ? 'All Products' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Product count bar */}
          {!loading && !fetchError && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-gray-400">
                {products.length} product{products.length !== 1 ? 's' : ''}
                {filterCat && <span> in <strong className="text-gray-600">{filterCat}</strong></span>}
                {search && <span> matching <strong className="text-gray-600">&ldquo;{search}&rdquo;</strong></span>}
              </p>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100 animate-pulse">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-2.5 bg-gray-200 rounded w-1/3" />
                    <div className="h-3.5 bg-gray-200 rounded w-4/5" />
                    <div className="h-3.5 bg-gray-200 rounded w-3/5" />
                    <div className="h-5 bg-gray-200 rounded w-2/5 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center text-center p-8 h-full">
              <Package className="w-14 h-14 mb-3 text-red-200" />
              <p className="font-semibold text-red-500 mb-1">Failed to load products</p>
              <p className="text-xs text-gray-400 mb-4">{fetchError}</p>
              <button onClick={loadProducts} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">Retry</button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 h-full">
              <Package className="w-14 h-14 mb-3 text-gray-200" />
              <p className="font-semibold text-gray-500">No products found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4">
              {products.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const outOfStock = p.stock_qty <= 0;
                const lowStock = !outOfStock && p.stock_qty <= 5;
                const catGradients: Record<string, string> = {
                  'Electronics':       'from-blue-100 to-blue-50',
                  'Furniture':         'from-amber-100 to-amber-50',
                  'Office Supplies':   'from-green-100 to-green-50',
                  'Tools & Equipment': 'from-orange-100 to-orange-50',
                  'Clothing':          'from-pink-100 to-pink-50',
                  'Food & Beverage':   'from-lime-100 to-lime-50',
                };
                const catIconColors: Record<string, string> = {
                  'Electronics':       'text-blue-300',
                  'Furniture':         'text-amber-300',
                  'Office Supplies':   'text-green-300',
                  'Tools & Equipment': 'text-orange-300',
                  'Clothing':          'text-pink-300',
                  'Food & Beverage':   'text-lime-300',
                };
                const bg = catGradients[p.category_name] || 'from-gray-100 to-gray-50';
                const iconColor = catIconColors[p.category_name] || 'text-gray-300';
                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`bg-white rounded-xl border overflow-hidden flex flex-col transition-all duration-200 ${
                      outOfStock
                        ? 'opacity-50 cursor-not-allowed border-gray-100'
                        : inCart
                        ? 'border-[#0D3B6E] ring-2 ring-[#0D3B6E] shadow-md cursor-pointer'
                        : 'border-gray-100 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
                    }`}
                  >
                    {/* Image — same structure as storefront */}
                    <div className={`relative h-44 shrink-0 bg-gradient-to-br ${bg} flex items-center justify-center overflow-hidden`}>
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className={`w-16 h-16 ${iconColor}`} />
                      )}

                      {outOfStock && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="text-xs font-bold text-red-500 bg-white px-3 py-1 rounded-full border border-red-200">Out of Stock</span>
                        </div>
                      )}

                      {lowStock && (
                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Only {p.stock_qty} left
                        </div>
                      )}

                      {inCart && (
                        <div className="absolute top-2 right-2 min-w-[22px] h-[22px] bg-[#0D3B6E] rounded-full flex items-center justify-center px-1 shadow">
                          <span className="text-white text-[11px] font-extrabold">{inCart.quantity}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide mb-1">{p.category_name || 'General'}</div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug">{p.name}</h3>
                      <div className="mt-auto">
                        <div className="text-lg font-extrabold text-gray-900 mb-1">GH₵ {parseFloat(String(p.price)).toFixed(2)}</div>
                        {!outOfStock && (
                          <div className="text-[10px] text-green-600 font-semibold">
                            {inCart ? `${inCart.quantity} in cart` : 'In Stock'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        {/* ══ RIGHT: Cart Panel ══ */}
        <div className="w-full lg:w-[340px] xl:w-[380px] flex flex-col bg-white border-l border-gray-200 flex-shrink-0">

          {/* Cart header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-[#0D3B6E]">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5 text-white" />
              <span className="font-bold text-white text-base">Current Sale</span>
              {cartCount > 0 && (
                <span className="bg-yellow-400 text-gray-900 text-xs font-extrabold px-2 py-0.5 rounded-full">{cartCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowRefundModal(true); setRefundMessage(''); }}
                className="flex items-center gap-1 text-white/70 hover:text-white text-xs font-medium transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                title="Refund a previous sale"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Refund
              </button>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all
                </button>
              )}
            </div>
          </div>

          {/* Customer info */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Customer (optional)</p>
            <div className="space-y-2">
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-gray-400"
                placeholder="Customer name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-gray-400"
                placeholder="Phone number"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-semibold text-gray-400 text-sm">No items yet</p>
                <p className="text-xs text-gray-300 mt-1">Click a product to add it to the sale</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cart.map((i, idx) => (
                  <div key={i.product.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Index number */}
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-snug truncate">{i.product.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">GH₵ {parseFloat(String(i.product.price)).toFixed(2)} each</p>
                        {/* Qty controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQty(i.product.id, -1)}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <span className="text-sm font-bold text-gray-900 w-7 text-center tabular-nums">{i.quantity}</span>
                          <button
                            onClick={() => updateQty(i.product.id, 1)}
                            className="w-7 h-7 rounded-lg bg-[#0D3B6E] hover:bg-[#1A5294] flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </div>
                      {/* Subtotal + remove */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <button
                          onClick={() => removeFromCart(i.product.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-extrabold text-gray-900 tabular-nums">
                          GH₵ {(i.product.price * i.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && !showPayModal && (
            <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          {/* Totals + Charge */}
          <div className="border-t border-gray-200 bg-white">
            {/* Summary rows */}
            <div className="px-5 py-3 space-y-1.5 border-b border-gray-100">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Items ({cartCount})</span>
                <span className="tabular-nums">GH₵ {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-gray-900 pt-1">
                <span>Total</span>
                <span className="tabular-nums text-[#0D3B6E]">GH₵ {cartTotal.toFixed(2)}</span>
              </div>
            </div>
            {/* Charge button */}
            <div className="px-4 py-4">
              <button
                onClick={openPayModal}
                disabled={cart.length === 0}
                className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2.5 shadow-md"
              >
                <Banknote className="w-5 h-5" />
                {cart.length === 0 ? 'Add items to charge' : `Charge  GH₵ ${cartTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ══ Payment Modal ══ */}
      {showPayModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePayModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="bg-[#0D3B6E] px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Amount Due</p>
                <p className="text-white font-extrabold text-3xl tabular-nums">GH₵ {cartTotal.toFixed(2)}</p>
              </div>
              <button
                type="button"
                onClick={closePayModal}
                className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-xl">{error}</div>}

              {/* Payment method */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setPaymentMethod(m.value)}
                        className={`flex flex-col items-center gap-2 py-3.5 rounded-xl border-2 text-xs font-bold transition-all ${
                          paymentMethod === m.value
                            ? 'border-[#0D3B6E] bg-blue-50 text-[#0D3B6E]'
                            : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                {paymentMethod === 'card' && (
                  <p className="text-[11px] text-gray-500 mt-2 leading-snug">
                    QR appears on the customer screen. Open it via <strong>Customer screen</strong> in the toolbar.
                  </p>
                )}
                {paymentMethod === 'card_terminal' && (
                  <p className="text-[11px] text-gray-500 mt-2 leading-snug">
                    Paystack Virtual Terminal — QR on customer screen. You can serve the next customer while payment completes.
                    {vtConfigured === false && (
                      <span className="block text-amber-700 mt-1">Terminal not configured. Ask admin to set VT code in Platform Settings.</span>
                    )}
                  </p>
                )}
                {paymentMethod === 'momo' && (
                  <p className="text-[11px] text-gray-500 mt-2 leading-snug">Customer completes Mobile Money on the Paystack screen.</p>
                )}
              </div>

              {/* Cash numpad */}
              {paymentMethod === 'cash' && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Amount Tendered</p>
                  {/* Display */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-right mb-3">
                    <p className="text-2xl font-extrabold text-gray-900 tabular-nums">
                      GH₵ {amountTendered || '0.00'}
                    </p>
                    {parseFloat(amountTendered) >= cartTotal && (
                      <p className="text-sm font-semibold text-green-600 mt-0.5">
                        Change: GH₵ {(parseFloat(amountTendered) - cartTotal).toFixed(2)}
                      </p>
                    )}
                  </div>
                  {/* Quick amounts */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {[cartTotal, Math.ceil(cartTotal / 10) * 10, Math.ceil(cartTotal / 50) * 50, Math.ceil(cartTotal / 100) * 100]
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map(amt => (
                        <button
                          key={amt}
                          onClick={() => setAmountTendered(amt.toFixed(2))}
                          className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                            parseFloat(amountTendered) === amt
                              ? 'border-[#0D3B6E] bg-blue-50 text-[#0D3B6E]'
                              : 'border-gray-200 text-gray-600 hover:border-blue-300'
                          }`}
                        >
                          {amt % 1 === 0 ? amt.toFixed(0) : amt.toFixed(2)}
                        </button>
                      ))}
                  </div>
                  {/* Numpad */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
                      <button
                        key={k}
                        onClick={() => {
                          if (k === '⌫') {
                            setAmountTendered(p => p.slice(0, -1) || '');
                          } else if (k === '.' && amountTendered.includes('.')) {
                            return;
                          } else {
                            const next = amountTendered + k;
                            const parts = next.split('.');
                            if (parts[1]?.length > 2) return;
                            setAmountTendered(next);
                          }
                        }}
                        className={`py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                          k === '⌫'
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete button */}
              <button
                type="button"
                onClick={completeSale}
                disabled={processing || (paymentMethod === 'cash' && (!amountTendered || parseFloat(amountTendered) < cartTotal))}
                className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2.5 shadow-md"
              >
                <CheckCircle2 className="w-5 h-5" />
                {processing
                  ? 'Processing…'
                  : paymentMethod === 'card'
                    ? 'Send to customer screen'
                    : paymentMethod === 'momo'
                      ? 'Pay with Mobile Money'
                      : paymentMethod === 'card_terminal'
                        ? 'Send to customer screen'
                        : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Receipt Modal ══ */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Success header */}
            <div className="bg-green-600 px-6 py-6 text-center no-print">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="font-extrabold text-white text-xl">Sale Complete!</h2>
              <p className="text-green-100 text-sm mt-1 font-mono">{receipt.order_number}</p>
            </div>

            {/* Receipt — thermal print target */}
            <div id="pos-receipt-print" className="p-5 max-h-[50vh] overflow-y-auto">
              {/* Store info */}
              <div className="text-center mb-4 pb-4 border-b border-dashed border-gray-200">
                <p className="font-extrabold text-gray-900 text-sm">GEMS Store</p>
                <p className="text-xs text-gray-500 mt-1 font-mono">{receipt.order_number}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(receipt.createdAt).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                {receipt.customer_name !== 'Walk-in Customer' && (
                  <p className="text-xs text-gray-500 mt-1">Customer: <strong>{receipt.customer_name}</strong></p>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2 mb-4">
                {receipt.items.map(i => (
                  <div key={i.product.id} className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{i.product.name}</p>
                      <p className="text-xs text-gray-400">{i.quantity} &times; GH₵ {parseFloat(String(i.product.price)).toFixed(2)}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 tabular-nums flex-shrink-0">
                      GH₵ {(i.product.price * i.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
                <div className="flex justify-between font-extrabold text-gray-900 text-base">
                  <span>Total Paid</span>
                  <span className="tabular-nums">GH₵ {receipt.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Payment Method</span>
                  <span className="font-medium">{paymentMethodLabel(receipt.payment_method)}</span>
                </div>
                {receipt.payment_method === 'cash' && (
                  <>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Cash Tendered</span>
                      <span className="tabular-nums">GH₵ {receipt.amount_tendered.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-green-600">
                      <span>Change</span>
                      <span className="tabular-nums">GH₵ {receipt.change.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">Thank you for your purchase!</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-5 pb-5 pt-2 border-t border-gray-100 no-print">
              <button
                onClick={printReceipt}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                <PrinterIcon className="w-4 h-4" /> Print Receipt
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-extrabold py-3 rounded-xl text-sm transition-colors"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {showOpenShift && (
        <PosModal onClose={() => setShowOpenShift(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="w-5 h-5" /> Open Shift</h2>
            <label className="form-label">Opening float (cash in drawer)</label>
            <input className="form-input mb-4" type="number" min="0" step="0.01" value={openingFloat} onChange={e => setOpeningFloat(e.target.value)} />
            {shiftMessage && <p className="text-sm text-red-600 mb-3">{shiftMessage}</p>}
            <button className="btn-primary w-full" onClick={openShift} disabled={shiftProcessing}>{shiftProcessing ? 'Opening…' : 'Start Shift'}</button>
          </div>
        </PosModal>
      )}

      {showCloseShift && (
        <PosModal onClose={() => setShowCloseShift(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Close Shift</h2>
            <p className="text-sm text-gray-500 mb-3">Expected cash: GH₵ {parseFloat(currentShift?.expected_cash ?? currentShift?.opening_float ?? 0).toFixed(2)}</p>
            <label className="form-label">Actual cash counted</label>
            <input className="form-input mb-3" type="number" min="0" step="0.01" value={actualCash} onChange={e => setActualCash(e.target.value)} />
            <label className="form-label">Notes (optional)</label>
            <input className="form-input mb-4" value={closeNotes} onChange={e => setCloseNotes(e.target.value)} />
            {shiftMessage && <p className="text-sm text-red-600 mb-3">{shiftMessage}</p>}
            <button className="btn-primary w-full" onClick={closeShift} disabled={shiftProcessing}>{shiftProcessing ? 'Closing…' : 'Close & Print Z-Report'}</button>
          </div>
        </PosModal>
      )}

      {zReport && (
        <PosModal onClose={() => setZReport(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">Z-Report — {zReport.shift_number}</h2>
            <div className="space-y-2 text-sm font-mono">
              {[
                ['Sales count', zReport.sales_count],
                ['Sales total', `GH₵ ${parseFloat(zReport.sales_total || 0).toFixed(2)}`],
                ['Refunds', `GH₵ ${parseFloat(zReport.refunds_total || 0).toFixed(2)}`],
                ['Cash sales', `GH₵ ${parseFloat(zReport.cash_sales || 0).toFixed(2)}`],
                ['Card', `GH₵ ${parseFloat(zReport.card_total || 0).toFixed(2)}`],
                ['Mobile money', `GH₵ ${parseFloat(zReport.momo_total || 0).toFixed(2)}`],
                ['Opening float', `GH₵ ${parseFloat(zReport.opening_float || 0).toFixed(2)}`],
                ['Expected cash', `GH₵ ${parseFloat(zReport.expected_cash || 0).toFixed(2)}`],
                ['Actual cash', `GH₵ ${parseFloat(zReport.actual_cash || 0).toFixed(2)}`],
                ['Variance', `GH₵ ${parseFloat(zReport.cash_variance || 0).toFixed(2)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-50 py-1"><span className="text-gray-500">{k}</span><span className="font-semibold">{v}</span></div>
              ))}
            </div>
            <button className="btn-secondary w-full mt-4" onClick={() => window.print()}>Print</button>
            <button className="btn-primary w-full mt-2" onClick={() => setZReport(null)}>Done</button>
          </div>
        </PosModal>
      )}

      {/* Refund modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRefundModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-gray-900 text-lg flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Refund Sale</h2>
              <button onClick={() => setShowRefundModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Enter the receipt number from a completed POS sale. Stock and ledger entries will be reversed.</p>
            <div className="space-y-3">
              <div>
                <label className="form-label">Receipt / Order Number</label>
                <input className="form-input font-mono" placeholder="POS-1739..." value={refundOrderNumber} onChange={e => setRefundOrderNumber(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Reason (optional)</label>
                <input className="form-input" placeholder="Wrong item, customer return…" value={refundReason} onChange={e => setRefundReason(e.target.value)} />
              </div>
              {refundMessage && (
                <p className={`text-sm px-3 py-2 rounded-lg ${refundMessage.includes('failed') || refundMessage.includes('Enter') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {refundMessage}
                </p>
              )}
              <button onClick={processRefund} disabled={refundProcessing} className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] disabled:opacity-50 text-white font-bold py-3 rounded-xl">
                {refundProcessing ? 'Processing…' : 'Process Full Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
