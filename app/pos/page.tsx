'use client';
import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Package,
  Banknote, CreditCard, Smartphone, X, PrinterIcon, CheckCircle2,
} from 'lucide-react';

interface Product { id: string; name: string; sku: string; price: number; stock_qty: number; category_name: string; images: string[]; }
interface CartItem { product: Product; quantity: number; }
interface Receipt { order_number: string; items: CartItem[]; total: number; payment_method: string; amount_tendered: number; change: number; customer_name: string; customer_phone: string; createdAt: string; }

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Cash',        icon: Banknote },
  { value: 'momo',     label: 'Mobile Money', icon: Smartphone },
  { value: 'card',     label: 'Card',         icon: CreditCard },
];

export default function POSPage() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [categories, setCategories]   = useState<string[]>([]);
  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState('');
  const [loading, setLoading]         = useState(true);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showPayModal, setShowPayModal]   = useState(false);
  const [processing, setProcessing]       = useState(false);
  const [receipt, setReceipt]             = useState<Receipt | null>(null);
  const [error, setError]                 = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterCat) params.category = filterCat;
      const r = await api.get('/pos/products', { params });
      const data: Product[] = r.data.data;
      setProducts(data);
      // build unique category list
      const cats = [...new Set(data.map((p: Product) => p.category_name).filter(Boolean))].sort();
      setCategories(cats as string[]);
    } finally { setLoading(false); }
  }, [search, filterCat]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

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
  const clearCart = () => { setCart([]); setCustomerName(''); setCustomerPhone(''); setAmountTendered(''); };

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const change = paymentMethod === 'cash' && amountTendered ? parseFloat(amountTendered) - cartTotal : 0;

  const openPayModal = () => { setError(''); setAmountTendered(cartTotal.toFixed(2)); setShowPayModal(true); };

  const completeSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'cash' && parseFloat(amountTendered) < cartTotal) {
      setError('Amount tendered is less than total.'); return;
    }
    setProcessing(true); setError('');
    try {
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
        amount_tendered: parseFloat(amountTendered) || cartTotal,
        change: data.change || 0,
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone,
        createdAt: new Date().toISOString(),
      });
      setShowPayModal(false);
      clearCart();
      loadProducts(); // refresh stock
    } catch (e: any) {
      setError(e.response?.data?.message || 'Sale failed. Please try again.');
    } finally { setProcessing(false); }
  };

  const printReceipt = () => window.print();

  return (
    <AppLayout title="Point of Sale" subtitle="Walk-in sales terminal" allowedRoles={['super_admin', 'sales_staff']}>
      <div className="flex flex-col lg:flex-row gap-4 h-full" style={{ minHeight: 'calc(100vh - 120px)' }}>

        {/* ── LEFT: Product Grid ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Search + Category filter */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Search by name or SKU…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Products */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 animate-pulse">
                  <div className="h-24 bg-gray-200 rounded-lg mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20">
              <Package className="w-14 h-14 mb-3 text-gray-200" />
              <p className="font-medium">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pb-4">
              {products.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const outOfStock = p.stock_qty <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className={`bg-white rounded-xl border text-left transition-all duration-150 overflow-hidden group ${
                      outOfStock ? 'opacity-50 cursor-not-allowed border-gray-100' :
                      inCart ? 'border-blue-400 ring-2 ring-blue-100 shadow-sm' :
                      'border-gray-100 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    {/* Image / placeholder */}
                    <div className="h-24 bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center overflow-hidden relative">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-10 h-10 text-gray-200" />
                      )}
                      {inCart && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">{inCart.quantity}</span>
                        </div>
                      )}
                      {outOfStock && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="text-xs font-bold text-red-500">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-blue-600 font-semibold mb-0.5 truncate">{p.category_name}</p>
                      <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 mb-1">{p.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-gray-900">GHS {parseFloat(String(p.price)).toFixed(2)}</span>
                        <span className="text-[10px] text-gray-400">{p.stock_qty} left</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Cart ── */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">

          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0D3B6E]">
            <div className="flex items-center gap-2 text-white">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-bold text-sm">Cart</span>
              {cartCount > 0 && (
                <span className="bg-yellow-400 text-gray-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">{cartCount}</span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-white/60 hover:text-white text-xs flex items-center gap-1 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Customer info */}
          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Phone number (optional)"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                <ShoppingCart className="w-10 h-10 mb-2" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs mt-0.5">Tap a product to add</p>
              </div>
            ) : cart.map(i => (
              <div key={i.product.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{i.product.name}</p>
                  <p className="text-xs text-gray-400">GHS {parseFloat(String(i.product.price)).toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => i.quantity === 1 ? removeFromCart(i.product.id) : updateQty(i.product.id, -1)}
                    className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors">
                    {i.quantity === 1 ? <Trash2 className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-gray-500" />}
                  </button>
                  <span className="text-sm font-bold text-gray-900 w-5 text-center">{i.quantity}</span>
                  <button onClick={() => updateQty(i.product.id, 1)}
                    className="w-6 h-6 rounded-full bg-[#0D3B6E] flex items-center justify-center hover:bg-[#1A5294] transition-colors">
                    <Plus className="w-3 h-3 text-white" />
                  </button>
                </div>
                <div className="text-xs font-bold text-gray-900 w-16 text-right flex-shrink-0">
                  GHS {(i.product.price * i.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals + Charge button */}
          <div className="px-4 py-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
              <span>GHS {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-gray-900 text-lg">
              <span>Total</span>
              <span>GHS {cartTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={openPayModal}
              disabled={cart.length === 0}
              className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 font-extrabold py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
            >
              <Banknote className="w-5 h-5" />
              Charge GHS {cartTotal.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            <div className="bg-[#0D3B6E] px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">Complete Payment</h2>
              <button onClick={() => setShowPayModal(false)} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

              {/* Amount due */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-gray-500">Amount Due</span>
                <span className="text-2xl font-extrabold text-gray-900">GHS {cartTotal.toFixed(2)}</span>
              </div>

              {/* Payment method */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setPaymentMethod(m.value)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                          paymentMethod === m.value
                            ? 'border-[#0D3B6E] bg-blue-50 text-[#0D3B6E]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount tendered (cash only) */}
              {paymentMethod === 'cash' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Amount Tendered</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    value={amountTendered}
                    onChange={e => setAmountTendered(e.target.value)}
                    min={cartTotal}
                    step="0.01"
                  />
                  {/* Quick amounts */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[cartTotal, Math.ceil(cartTotal / 10) * 10, Math.ceil(cartTotal / 50) * 50, Math.ceil(cartTotal / 100) * 100]
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map(amt => (
                        <button key={amt} onClick={() => setAmountTendered(amt.toFixed(2))}
                          className="text-xs py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors font-medium">
                          {amt.toFixed(0)}
                        </button>
                      ))}
                  </div>
                  {parseFloat(amountTendered) >= cartTotal && (
                    <div className="mt-2 flex justify-between bg-green-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-green-700 font-medium">Change</span>
                      <span className="text-sm font-extrabold text-green-700">GHS {change.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={completeSale}
                disabled={processing}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-extrabold py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {processing ? 'Processing…' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            <div className="bg-green-500 px-5 py-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-white mx-auto mb-2" />
              <h2 className="font-extrabold text-white text-lg">Sale Complete!</h2>
              <p className="text-green-100 text-sm">{receipt.order_number}</p>
            </div>

            {/* Receipt body — printable */}
            <div id="receipt-print" className="p-5 space-y-3 text-sm">
              <div className="text-center border-b border-dashed border-gray-200 pb-3">
                <p className="font-extrabold text-gray-900 text-base">GEMS Store</p>
                <p className="text-xs text-gray-400">{new Date(receipt.createdAt).toLocaleString()}</p>
                <p className="text-xs text-gray-400">Cashier receipt</p>
              </div>

              <div className="space-y-1">
                {receipt.items.map(i => (
                  <div key={i.product.id} className="flex justify-between text-xs">
                    <span className="text-gray-700 flex-1 truncate">{i.product.name} x{i.quantity}</span>
                    <span className="font-semibold text-gray-900 ml-2">GHS {(i.product.price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-200 pt-3 space-y-1">
                <div className="flex justify-between font-extrabold text-gray-900">
                  <span>Total</span>
                  <span>GHS {receipt.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Payment</span>
                  <span className="capitalize">{receipt.payment_method}</span>
                </div>
                {receipt.payment_method === 'cash' && (
                  <>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Tendered</span>
                      <span>GHS {receipt.amount_tendered.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-green-600">
                      <span>Change</span>
                      <span>GHS {receipt.change.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {receipt.customer_name !== 'Walk-in Customer' && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Customer</span>
                    <span>{receipt.customer_name}</span>
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-gray-400 pt-1">Thank you for your purchase!</p>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={printReceipt}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                <PrinterIcon className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
