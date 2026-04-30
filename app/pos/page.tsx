'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Package,
  Banknote, CreditCard, Smartphone, X, PrinterIcon, CheckCircle2, Barcode,
} from 'lucide-react';

interface Product { id: string; name: string; sku: string; barcode: string | null; price: number; stock_qty: number; category_name: string; images: string[]; }
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
  const [fetchError, setFetchError]   = useState('');
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showPayModal, setShowPayModal]   = useState(false);
  const [processing, setProcessing]       = useState(false);
  const [receipt, setReceipt]             = useState<Receipt | null>(null);
  const [error, setError]                 = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput]   = useState('');
  const [barcodeFlash, setBarcodeFlash]   = useState<'success'|'error'|null>(null);

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
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

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
    <AppLayout title="Point of Sale" subtitle="Walk-in sales terminal" allowedRoles={['business_owner','branch_manager','sales_staff']}>
      <div className="-m-4 sm:-m-6 flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 72px)' }}>

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
                        <div className="text-lg font-extrabold text-gray-900 mb-1">GHS {parseFloat(String(p.price)).toFixed(2)}</div>
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
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear all
              </button>
            )}
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
                        <p className="text-xs text-gray-400 mt-0.5">GHS {parseFloat(String(i.product.price)).toFixed(2)} each</p>
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
                          GHS {(i.product.price * i.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + Charge */}
          <div className="border-t border-gray-200 bg-white">
            {/* Summary rows */}
            <div className="px-5 py-3 space-y-1.5 border-b border-gray-100">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Items ({cartCount})</span>
                <span className="tabular-nums">GHS {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-gray-900 pt-1">
                <span>Total</span>
                <span className="tabular-nums text-[#0D3B6E]">GHS {cartTotal.toFixed(2)}</span>
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
                {cart.length === 0 ? 'Add items to charge' : `Charge  GHS ${cartTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Payment Modal ══ */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="bg-[#0D3B6E] px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Amount Due</p>
                <p className="text-white font-extrabold text-3xl tabular-nums">GHS {cartTotal.toFixed(2)}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-xl">{error}</div>}

              {/* Payment method */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
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
              </div>

              {/* Cash numpad */}
              {paymentMethod === 'cash' && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Amount Tendered</p>
                  {/* Display */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-right mb-3">
                    <p className="text-2xl font-extrabold text-gray-900 tabular-nums">
                      GHS {amountTendered || '0.00'}
                    </p>
                    {parseFloat(amountTendered) >= cartTotal && (
                      <p className="text-sm font-semibold text-green-600 mt-0.5">
                        Change: GHS {(parseFloat(amountTendered) - cartTotal).toFixed(2)}
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
                onClick={completeSale}
                disabled={processing || (paymentMethod === 'cash' && (!amountTendered || parseFloat(amountTendered) < cartTotal))}
                className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2.5 shadow-md"
              >
                <CheckCircle2 className="w-5 h-5" />
                {processing ? 'Processing…' : 'Complete Sale'}
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
            <div className="bg-green-600 px-6 py-6 text-center">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="font-extrabold text-white text-xl">Sale Complete!</h2>
              <p className="text-green-100 text-sm mt-1 font-mono">{receipt.order_number}</p>
            </div>

            {/* Receipt */}
            <div className="p-5 max-h-[50vh] overflow-y-auto">
              {/* Store info */}
              <div className="text-center mb-4 pb-4 border-b border-dashed border-gray-200">
                <p className="font-extrabold text-gray-900">GEMS Store</p>
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
                      <p className="text-xs text-gray-400">{i.quantity} &times; GHS {parseFloat(String(i.product.price)).toFixed(2)}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 tabular-nums flex-shrink-0">
                      GHS {(i.product.price * i.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
                <div className="flex justify-between font-extrabold text-gray-900 text-base">
                  <span>Total Paid</span>
                  <span className="tabular-nums">GHS {receipt.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Payment Method</span>
                  <span className="capitalize font-medium">{receipt.payment_method === 'momo' ? 'Mobile Money' : receipt.payment_method}</span>
                </div>
                {receipt.payment_method === 'cash' && (
                  <>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Cash Tendered</span>
                      <span className="tabular-nums">GHS {receipt.amount_tendered.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-green-600">
                      <span>Change</span>
                      <span className="tabular-nums">GHS {receipt.change.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">Thank you for your purchase!</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-5 pb-5 pt-2 border-t border-gray-100">
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
    </AppLayout>
  );
}
