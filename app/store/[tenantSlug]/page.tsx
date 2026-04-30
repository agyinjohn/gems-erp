'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCart, Search, X, Plus, Minus, Package, Truck, Lock, BadgeCheck, ChevronRight, ShieldCheck, MapPin, ChevronDown } from 'lucide-react';
import api from '@/lib/api';

interface CartItem { product: any; quantity: number; branch_id: string; branch_name: string; }

const CART_ID_KEY = 'gems_cart_id';

const toCartItem = (item: any): CartItem => ({
  product: {
    id: item.product_id,
    name: item.product_name,
    price: item.price,
    images: item.images,
    category_name: item.category_name,
    stock_qty: item.stock_qty,
    low_stock_threshold: item.low_stock_threshold,
    sku: item.sku,
    branch_id: item.branch_id,
    branch_name: item.branch_name,
  },
  quantity: item.quantity,
  branch_id: item.branch_id || '',
  branch_name: item.branch_name || 'Main Branch',
});

export default function TenantStorefrontPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [tenant, setTenant]   = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [activeBranch, setActiveBranch] = useState<any>(null); // null = all branches
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string>('');
  const [cartLoading, setCartLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [step, setStep] = useState<'shop'|'detail'|'checkout'|'success'|'track'>('shop');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [orderId, setOrderId] = useState<number|null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [form, setForm] = useState({ customer_name:'', customer_email:'', customer_phone:'', delivery_address:'' });
  const [error, setError] = useState('');
  const [detailQty, setDetailQty] = useState(1);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 12;
  const [completedCart, setCompletedCart] = useState<CartItem[]>([]);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number|''>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'default'|'price_asc'|'price_desc'|'name'>('default');
  const [openSections, setOpenSections] = useState<Record<string,boolean>>({ categories: true, price: true, availability: true, sort: true });
  const toggleSection = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));
  const maxProductPrice = Math.ceil(Math.max(0, ...products.map(p => parseFloat(p.price) || 0)) / 100) * 100 || 5000;
  const activeFilterCount = [filterCat, inStockOnly, priceMax !== '' || priceMin > 0].filter(Boolean).length;

  const loadProducts = useCallback(async (pageNum: number, replace: boolean) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params: any = { page: pageNum, limit: ITEMS_PER_PAGE, tenant_slug: tenantSlug };
      if (search) params.search = search;
      if (filterCat) params.category = filterCat;
      if (activeBranch) params.branch_slug = activeBranch.slug;
      const r = await api.get('/storefront/products', { params });
      const newProds = r.data.data;
      setProducts(prev => replace ? newProds : [...prev, ...newProds]);
      setHasMore(r.data.hasMore);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, filterCat, tenantSlug, activeBranch]);

  // Load tenant + branches on mount
  useEffect(() => {
    api.get(`/storefront/${tenantSlug}/branches`).then(r => {
      setTenant(r.data.data.tenant);
      setBranches(r.data.data.branches);
    }).catch(() => {});
  }, [tenantSlug]);

  useEffect(() => {
    setPage(1);
    loadProducts(1, true);
    api.get('/categories', { params: { tenant_slug: tenantSlug } }).then(c => setCategories(c.data.data)).catch(() => {});
    const savedId = localStorage.getItem(CART_ID_KEY) || '';
    setCartId(savedId);
    if (savedId) {
      api.get(`/storefront/cart/${savedId}`).then(r => {
        setCart(r.data.data.items.map(toCartItem));
      }).catch(() => {});
    }
  }, [search, filterCat, activeBranch, tenantSlug]);

  useEffect(() => {
    if (page === 1) return;
    loadProducts(page, false);
  }, [page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        setPage(p => p + 1);
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  // Close branch menu on outside click
  useEffect(() => {
    if (!showBranchMenu) return;
    const handler = (e: MouseEvent) => setShowBranchMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showBranchMenu]);

  const syncCart = (data: any) => {
    if (data.cart_id) {
      setCartId(data.cart_id);
      localStorage.setItem(CART_ID_KEY, data.cart_id);
    }
    setCart(data.items.map(toCartItem));
  };

  const addToCart = async (product: any) => {
    setCartLoading(true);
    try {
      const r = await api.post('/storefront/cart/add', {
        cart_id: cartId || localStorage.getItem(CART_ID_KEY) || '',
        product_id: product.id || product._id,
        quantity: 1,
        tenant_id: tenant?.id,
      });
      syncCart(r.data.data);
    } finally { setCartLoading(false); }
  };

  const updateQty = async (productId: any, delta: number) => {
    const item = cart.find(i => String(i.product.id) === String(productId));
    if (!item) return;
    const newQty = item.quantity + delta;
    setCartLoading(true);
    try {
      const r = await api.patch('/storefront/cart/update', {
        cart_id: cartId,
        product_id: productId,
        quantity: newQty,
      });
      syncCart(r.data.data);
    } finally { setCartLoading(false); }
  };

  const removeFromCart = async (productId: any) => {
    setCartLoading(true);
    try {
      const r = await api.patch('/storefront/cart/update', {
        cart_id: cartId,
        product_id: productId,
        quantity: 0,
      });
      syncCart(r.data.data);
    } finally { setCartLoading(false); }
  };

  const clearCart = async () => {
    if (cartId) await api.delete(`/storefront/cart/${cartId}`);
    setCart([]);
  };


  const filtered = products.filter(p =>
    (!filterCat || p.category_name === filterCat) &&
    (!inStockOnly || p.stock_qty > 0) &&
    (priceMin === 0 || parseFloat(p.price) >= priceMin) &&
    (priceMax === '' || parseFloat(p.price) <= priceMax)
  ).sort((a, b) => {
    if (sortBy === 'price_asc') return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === 'price_desc') return parseFloat(b.price) - parseFloat(a.price);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });
  const resetPage = () => setPage(1);
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const deliveryFee = cartTotal >= 500 ? 0 : 30;
  const orderTotal = cartTotal + deliveryFee;

  const initiateCheckout = async () => {
    if (!form.customer_name || !form.customer_email) { setError('Name and email are required.'); return; }
    if (cart.length === 0) { setError('Your cart is empty.'); return; }
    setPaying(true); setError('');
    try {
      const r = await api.post('/storefront/checkout', {
        ...form,
        delivery_fee: deliveryFee,
        tenant_id: tenant?.id,
        items: cart.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity,
          branch_id: i.branch_id,
          branch_name: i.branch_name,
        }))
      });
      const { orders, grand_total, email, paystack_public_key } = r.data.data;
      const orderIds = orders.map((o: any) => o.order_id);
      const orderNums = orders.map((o: any) => o.order_number);
      setOrderNumber(orderNums.join(', '));

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => {
        const handler = (window as any).PaystackPop.setup({
          key: paystack_public_key || 'pk_test_demo',
          email,
          amount: Math.round(grand_total * 100),
          currency: 'GHS',
          ref: `GEMS-${orderNums[0]}-${Date.now()}`,
          onClose: () => { setPaying(false); },
          callback: async (response: any) => {
            try {
              await api.post('/storefront/verify-payment', { reference: response.reference, order_ids: orderIds });
              setCompletedCart([...cart]);
              setCompletedTotal(orderTotal);
              setCart([]);
              setStep('success');
            } catch { setError('Payment verification failed. Please contact support.'); }
            finally { setPaying(false); }
          }
        });
        handler.openIframe();
      };
      document.body.appendChild(script);
    } catch(e:any) { setError(e.response?.data?.message||'Checkout error'); setPaying(false); }
  };

  const detailCatColors: Record<string,string> = {
    'Electronics':      'from-blue-100 to-blue-50',
    'Furniture':        'from-amber-100 to-amber-50',
    'Office Supplies':  'from-green-100 to-green-50',
    'Tools & Equipment':'from-orange-100 to-orange-50',
    'Clothing':         'from-pink-100 to-pink-50',
    'Food & Beverage':  'from-lime-100 to-lime-50',
  };
  const detailCatIconColors: Record<string,string> = {
    'Electronics':      'text-blue-300',
    'Furniture':        'text-amber-300',
    'Office Supplies':  'text-green-300',
    'Tools & Equipment':'text-orange-300',
    'Clothing':         'text-pink-300',
    'Food & Beverage':  'text-lime-300',
  };

  if (step === 'success') return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* Navbar */}
      <nav className="bg-[#0D3B6E] h-14 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center gap-2.5">
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-gray-900" />
          </div>
          <span className="font-extrabold text-white">GEMS<span className="text-yellow-400">.store</span></span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Success Card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Green header */}
          <div className="bg-green-500 px-8 py-8 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <BadgeCheck className="w-9 h-9 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Order Confirmed!</h1>
            <p className="text-green-100 text-sm">Thank you for shopping with GEMS Store</p>
          </div>

          <div className="px-8 py-6 space-y-5">
            {/* Order reference */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Order Reference</div>
                <div className="font-mono font-bold text-[#0D3B6E] text-lg">{orderNumber}</div>
              </div>
              <BadgeCheck className="w-8 h-8 text-green-500" />
            </div>

            {/* Order items */}
            {cart.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Items Ordered</h3>
                <div className="space-y-2">
                  {cart.map(i => (
                    <div key={i.product.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {i.product.images?.[0] ? (
                          <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover" />
                        ) : <Package className="w-5 h-5 text-gray-300 m-auto" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{i.product.name}</div>
                        <div className="text-xs text-gray-400">Qty: {i.quantity}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-800">GHS {(i.product.price * i.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-3 mt-1 border-t border-gray-100">
                  <span>Total Paid</span>
                  <span>GHS {cartTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Delivery info */}
            <div className="bg-blue-50 rounded-xl px-5 py-4 flex items-start gap-3">
              <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-blue-800">Estimated Delivery</div>
                <div className="text-xs text-blue-600 mt-0.5">3 – 5 business days after payment confirmation</div>
                {form.delivery_address && <div className="text-xs text-blue-500 mt-1">To: {form.delivery_address}</div>}
              </div>
            </div>

            {/* Email note */}
            <p className="text-xs text-gray-400 text-center">A confirmation will be sent to <strong>{form.customer_email}</strong></p>

            <button
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 rounded-xl text-sm transition-colors"
              onClick={() => { setStep('shop'); setForm({ customer_name:'', customer_email:'', customer_phone:'', delivery_address:'' }); }}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6]">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 shadow-md">

        {/* Row 1 — dark blue: Logo + Location + Search + Cart */}
        <div className="bg-[#0D3B6E]">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">

            {/* Logo */}
            <button onClick={() => setStep('shop')} className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-9 h-9 bg-yellow-400 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-yellow-300 transition-colors">
                <Package className="w-5 h-5 text-gray-900" />
              </div>
              <div className="leading-tight">
                <div className="text-white font-extrabold text-base tracking-tight">{tenant?.business_name || 'GEMS'}</div>
                <div className="text-yellow-400 text-[10px] font-semibold tracking-widest uppercase -mt-0.5">Store</div>
              </div>
            </button>

            {/* Branch selector — only shown when there are multiple branches */}
            {branches.length > 1 && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowBranchMenu(b => !b)}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-white/20"
                >
                  <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{activeBranch ? activeBranch.name : 'All Branches'}</span>
                  <ChevronDown className="w-3 h-3 text-white/60" />
                </button>
                {showBranchMenu && (
                  <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <button
                      onClick={() => { setActiveBranch(null); setShowBranchMenu(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
                        !activeBranch ? 'bg-blue-50 text-[#0D3B6E] font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <MapPin className="w-4 h-4" /> All Branches
                    </button>
                    {branches.map(b => (
                      <button
                        key={b.id}
                        onClick={() => { setActiveBranch(b); setShowBranchMenu(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-sm border-t border-gray-50 transition-colors ${
                          activeBranch?.id === b.id ? 'bg-blue-50 text-[#0D3B6E] font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <MapPin className="w-4 h-4" /> {b.name}
                        {b.address && <span className="text-xs text-gray-400 truncate ml-auto">{b.address}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Location */}
            <button
              onClick={() => { setLocationInput(deliveryLocation); setShowLocationModal(true); }}
              className="hidden md:flex flex-col items-start flex-shrink-0 border-l border-white/20 pl-4 hover:opacity-80 transition-opacity"
            >
              <span className="text-[10px] text-white/50 uppercase tracking-wide leading-none mb-0.5">Deliver to</span>
              <span className="flex items-center gap-1 text-white font-semibold text-sm">
                <MapPin className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                <span className="max-w-[120px] truncate">
                  {deliveryLocation || <span className="text-yellow-400">Set location</span>}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/40" />
              </span>
            </button>
            <div className="flex-1 flex items-center bg-white rounded-lg overflow-hidden shadow-sm border-2 border-transparent focus-within:border-yellow-400 transition-all">
              <select
                className="h-10 bg-gray-100 text-gray-600 text-xs px-3 border-r border-gray-200 focus:outline-none cursor-pointer flex-shrink-0"
                value={filterCat}
                onChange={e => { setFilterCat(e.target.value); resetPage(); }}
              >
                <option value="">All Depts</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input
                className="flex-1 h-10 px-4 text-sm text-gray-800 focus:outline-none bg-white placeholder-gray-400"
                placeholder="Search products…"
                value={search}
                onChange={e => { setSearch(e.target.value); resetPage(); }}
              />
              <button className="h-10 w-12 bg-yellow-400 hover:bg-yellow-300 flex items-center justify-center transition-colors flex-shrink-0">
                <Search className="w-4 h-4 text-gray-800" />
              </button>
            </div>

            {/* Cart */}
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-3 text-white hover:text-yellow-400 transition-colors flex-shrink-0 group"
            >
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-yellow-400 text-gray-900 text-[10px] font-extrabold rounded-full flex items-center justify-center px-1">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-[10px] text-blue-300 uppercase tracking-wide">Cart</div>
                <div className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">GHS {cartTotal.toFixed(2)}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Row 2 — medium blue: Category nav */}
        <div className="bg-[#1a4f8a]">
          <div className="max-w-7xl mx-auto px-6 flex items-center gap-0 overflow-x-auto">
            {[{ id: '', name: 'All Products' }, ...categories.map(c => ({ id: c.name, name: c.name }))].map(c => (
              <button
                key={c.id}
                onClick={() => { setFilterCat(c.id); resetPage(); }}
                className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                  filterCat === c.id
                    ? 'border-yellow-400 text-yellow-400'
                    : 'border-transparent text-blue-100 hover:text-white hover:border-white/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {step === 'shop' && (
        <div className="flex min-h-screen">

          {/* ──────────────────── SIDEBAR ──────────────────── */}
          <aside className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0 bg-white border-r border-gray-200 min-h-full">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <span className="font-bold text-gray-900">Filters</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterCat(''); setInStockOnly(false); setPriceMin(0); setPriceMax(''); resetPage(); }}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
                >
                  Clear all ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Active chips */}
            {activeFilterCount > 0 && (
              <div className="px-4 py-3 flex flex-wrap gap-1.5 border-b border-gray-100 flex-shrink-0">
                {filterCat && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {filterCat}
                    <button onClick={() => { setFilterCat(''); resetPage(); }} className="hover:text-blue-900">&times;</button>
                  </span>
                )}
                {inStockOnly && (
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    In Stock
                    <button onClick={() => { setInStockOnly(false); resetPage(); }} className="hover:text-green-900">&times;</button>
                  </span>
                )}
                {(priceMax !== '' || priceMin > 0) && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    GHS {priceMin}&ndash;{priceMax !== '' ? priceMax : '∞'}
                    <button onClick={() => { setPriceMin(0); setPriceMax(''); resetPage(); }} className="hover:text-purple-900">&times;</button>
                  </span>
                )}
              </div>
            )}

            {/* ── CATEGORY ── */}
            <div className="border-b border-gray-100">
              <button onClick={() => toggleSection('categories')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <span className="text-sm font-semibold text-gray-800">Category</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.categories ? 'rotate-90' : ''}`} />
              </button>
              {openSections.categories && (
                <div className="pb-2">
                  {[{ id: '', name: 'All Products' }, ...categories.map(c => ({ id: c.name, name: c.name }))].map(c => {
                    const count = c.id === '' ? products.length : products.filter(p => p.category === c.id || p.category_name === c.id).length;
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setFilterCat(c.id); resetPage(); }}
                        className={`w-full flex items-center justify-between px-5 py-2.5 text-sm transition-colors ${
                          filterCat === c.id ? 'text-[#0D3B6E] font-semibold bg-blue-50 border-r-2 border-[#0D3B6E]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all ${
                            filterCat === c.id ? 'border-[#0D3B6E] bg-[#0D3B6E]' : 'border-gray-300'
                          }`} />
                          {c.name}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          filterCat === c.id ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-500'
                        }`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── PRICE RANGE ── */}
            <div className="border-b border-gray-100">
              <button onClick={() => toggleSection('price')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <span className="text-sm font-semibold text-gray-800">Price Range</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.price ? 'rotate-90' : ''}`} />
              </button>
              {openSections.price && (
                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-[#0D3B6E] bg-blue-50 px-2.5 py-1.5 rounded-lg">GHS {priceMin.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">&mdash;</span>
                    <span className="text-xs font-semibold text-[#0D3B6E] bg-blue-50 px-2.5 py-1.5 rounded-lg">{priceMax !== '' ? `GHS ${Number(priceMax).toLocaleString()}` : 'Any'}</span>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Min</span><span>GHS {priceMin}</span></div>
                      <input type="range" min={0} max={maxProductPrice} step={50} value={priceMin}
                        onChange={e => { setPriceMin(Number(e.target.value)); resetPage(); }}
                        className="w-full accent-[#0D3B6E] cursor-pointer" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Max</span><span>{priceMax !== '' ? `GHS ${priceMax}` : 'Any'}</span></div>
                      <input type="range" min={0} max={maxProductPrice} step={50}
                        value={priceMax !== '' ? priceMax : maxProductPrice}
                        onChange={e => { setPriceMax(Number(e.target.value) >= maxProductPrice ? '' : Number(e.target.value)); resetPage(); }}
                        className="w-full accent-[#0D3B6E] cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([[0,200],[200,500],[500,1000],[1000,'']] as [number,number|''][]).map(([mn,mx]) => {
                      const label = mx === '' ? `GHS ${mn}+` : `GHS ${mn}\u2013${mx}`;
                      const active = priceMin === mn && priceMax === mx;
                      return (
                        <button key={label} onClick={() => { setPriceMin(mn); setPriceMax(mx); resetPage(); }}
                          className={`text-xs py-1.5 rounded-lg border transition-colors ${
                            active ? 'bg-[#0D3B6E] text-white border-[#0D3B6E]' : 'border-gray-200 text-gray-600 hover:border-[#0D3B6E] hover:text-[#0D3B6E]'
                          }`}>{label}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── AVAILABILITY ── */}
            <div className="border-b border-gray-100">
              <button onClick={() => toggleSection('availability')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <span className="text-sm font-semibold text-gray-800">Availability</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.availability ? 'rotate-90' : ''}`} />
              </button>
              {openSections.availability && (
                <div className="px-5 pb-4 space-y-2">
                  {[
                    { label: 'All Items', value: false, count: products.length },
                    { label: 'In Stock Only', value: true, count: products.filter(p => p.stock_qty > 0).length },
                  ].map(opt => (
                    <button key={String(opt.value)} onClick={() => { setInStockOnly(opt.value); resetPage(); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        inStockOnly === opt.value ? 'border-[#0D3B6E] bg-blue-50 text-[#0D3B6E] font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                          inStockOnly === opt.value ? 'border-[#0D3B6E] bg-[#0D3B6E]' : 'border-gray-300'
                        }`} />
                        {opt.label}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        inStockOnly === opt.value ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{opt.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── SORT ── */}
            <div>
              <button onClick={() => toggleSection('sort')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <span className="text-sm font-semibold text-gray-800">Sort By</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSections.sort ? 'rotate-90' : ''}`} />
              </button>
              {openSections.sort && (
                <div className="pb-2">
                  {([
                    { value: 'default', label: 'Relevance' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'name', label: 'Name A–Z' },
                  ] as const).map(opt => (
                    <button key={opt.value} onClick={() => { setSortBy(opt.value); resetPage(); }}
                      className={`w-full flex items-center justify-between px-5 py-2.5 text-sm transition-colors ${
                        sortBy === opt.value ? 'text-[#0D3B6E] font-semibold bg-blue-50 border-r-2 border-[#0D3B6E]' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-[#0D3B6E]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </aside>

          {/* ──────────────────── MAIN CONTENT ──────────────────── */}
          <div className="flex-1 min-w-0 px-4 xl:px-6 py-6">

          {/* Announcement Bar */}
          <div className="flex items-center justify-center gap-8 bg-yellow-400 rounded-xl px-6 py-3 mb-6">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-800 flex-shrink-0" />
              <span className="text-gray-900 text-sm font-semibold">Free Delivery on orders over GHS 500</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-yellow-600/30" />
            <div className="hidden md:flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-800 flex-shrink-0" />
              <span className="text-gray-800 text-xs font-medium">Secure Paystack checkout</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-yellow-600/30" />
            <div className="hidden md:flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-gray-800 flex-shrink-0" />
              <span className="text-gray-800 text-xs font-medium">Quality guaranteed products</span>
            </div>
          </div>

          {/* Results count */}
          {(search || filterCat || inStockOnly || priceMax !== '') && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                {search && <span> for <strong>&ldquo;{search}&rdquo;</strong></span>}
                {filterCat && <span> in <strong>{filterCat}</strong></span>}
              </p>
              <button onClick={() => { setSearch(''); setFilterCat(''); setInStockOnly(false); setPriceMin(0); setPriceMax(''); setSortBy('default'); resetPage(); }} className="text-xs text-blue-600 hover:underline">Clear all filters</button>
            </div>
          )}

          {loading ? (
            /* Skeleton Cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(8)].map((_,i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100">
                  <div className="h-44 bg-gray-200 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2 mt-2" />
                    <div className="h-9 bg-gray-200 rounded-lg animate-pulse w-full mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Section heading + sort (mobile) */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">
                  {filterCat ? filterCat : 'All Products'}
                  <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length} items)</span>
                </h2>
                {/* Mobile sort */}
                <select
                  className="lg:hidden text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none"
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value as typeof sortBy); resetPage(); }}
                >
                  <option value="default">Sort: Default</option>
                  <option value="price_asc">Price: Low–High</option>
                  <option value="price_desc">Price: High–Low</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                  <Package className="w-16 h-16 mb-4 text-gray-200" />
                  <p className="text-base font-medium">No products found</p>
                  <p className="text-sm mt-1">Try a different search or category</p>
                  <button onClick={() => { setSearch(''); setFilterCat(''); setInStockOnly(false); setPriceMin(0); setPriceMax(''); setSortBy('default'); resetPage(); }} className="mt-4 text-sm text-blue-600 hover:underline">Clear filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map(p => {
                    const inCart = cart.find(i => i.product.id === p.id);
                    const catColors: Record<string,string> = {
                      'Electronics':      'from-blue-100 to-blue-50',
                      'Furniture':        'from-amber-100 to-amber-50',
                      'Office Supplies':  'from-green-100 to-green-50',
                      'Tools & Equipment':'from-orange-100 to-orange-50',
                      'Clothing':         'from-pink-100 to-pink-50',
                      'Food & Beverage':  'from-lime-100 to-lime-50',
                    };
                    const catIconColors: Record<string,string> = {
                      'Electronics':      'text-blue-300',
                      'Furniture':        'text-amber-300',
                      'Office Supplies':  'text-green-300',
                      'Tools & Equipment':'text-orange-300',
                      'Clothing':         'text-pink-300',
                      'Food & Beverage':  'text-lime-300',
                    };
                    const bg = catColors[p.category_name] || 'from-gray-100 to-gray-50';
                    const iconColor = catIconColors[p.category_name] || 'text-gray-300';
                    const stars = 4;

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                      >
                        {/* Image area */}
                        <div
                          className={`relative h-44 bg-gradient-to-br ${bg} flex items-center justify-center cursor-pointer overflow-hidden`}
                          onClick={() => { setSelectedProduct(p); setStep('detail'); }}
                        >
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className={`w-16 h-16 ${iconColor}`} />
                          )}
                          {p.stock_qty <= 0 && (
                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                              <span className="text-xs font-bold text-red-500 bg-white px-3 py-1 rounded-full border border-red-200">Out of Stock</span>
                            </div>
                          )}
                          {p.stock_qty > 0 && p.stock_qty <= p.low_stock_threshold && (
                            <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Only {p.stock_qty} left
                            </div>
                          )}
                          {/* Branch badge — only shown when viewing all branches */}
                          {!activeBranch && p.branch_name && (
                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />{p.branch_name}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-4 flex flex-col flex-1">
                          <div className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide mb-1">{p.category_name || 'General'}</div>
                          <h3
                            className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 leading-snug cursor-pointer hover:text-blue-700"
                            onClick={() => { setSelectedProduct(p); setStep('detail'); }}
                          >
                            {p.name}
                          </h3>

                          {/* Stars */}
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_,i) => (
                              <svg key={i} className={`w-3 h-3 ${i < stars ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-[10px] text-gray-400 ml-1">(24)</span>
                          </div>

                          <div className="mt-auto">
                            <div className="text-xl font-extrabold text-gray-900 mb-1">GHS {parseFloat(p.price).toFixed(2)}</div>
                            {p.stock_qty > 0 && (
                              <div className="text-[10px] text-green-600 font-semibold mb-3">In Stock</div>
                            )}

                            {p.stock_qty > 0 ? (
                              inCart ? (
                                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                                  <button
                                    onClick={e => { e.stopPropagation(); updateQty(p.id, -1); }}
                                    className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 shadow-sm"
                                  >
                                    <Minus className="w-3 h-3 text-gray-600" />
                                  </button>
                                  <span className="font-bold text-sm text-gray-900">{inCart.quantity}</span>
                                  <button
                                    onClick={e => { e.stopPropagation(); updateQty(p.id, 1); }}
                                    className="w-7 h-7 rounded-full bg-[#0D3B6E] text-white flex items-center justify-center hover:bg-[#1A5294] shadow-sm"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={e => { e.stopPropagation(); addToCart(p); }}
                                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-sm py-2 rounded-lg transition-colors"
                                >
                                  Add to Cart
                                </button>
                              )
                            ) : (
                              <button disabled className="w-full bg-gray-100 text-gray-400 font-medium text-sm py-2 rounded-lg cursor-not-allowed">
                                Unavailable
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-4" />
              {loadingMore && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
                  {[...Array(3)].map((_,i) => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100">
                      <div className="h-44 bg-gray-200 animate-pulse" />
                      <div className="p-4 space-y-2">
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2 mt-2" />
                        <div className="h-9 bg-gray-200 rounded-lg animate-pulse w-full mt-3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!hasMore && filtered.length > 0 && (
                <p className="text-center text-xs text-gray-400 mt-6 pb-2">You&apos;ve seen all {filtered.length} products</p>
              )}
            </>
          )}

          </div>
        </div>
      )}


      {step === 'detail' && selectedProduct && (() => {
        const detailBg = detailCatColors[selectedProduct.category_name] || 'from-gray-100 to-gray-50';
        const detailIconColor = detailCatIconColors[selectedProduct.category_name] || 'text-gray-300';
        const inCart = cart.find(i => i.product.id === selectedProduct.id);
        const stars = 4;
        return (
          <div className="max-w-7xl mx-auto px-6 py-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-5">
              <button onClick={() => { setStep('shop'); setDetailQty(1); }} className="hover:text-blue-600 hover:underline">Home</button>
              <ChevronRight className="w-3 h-3" />
              <button onClick={() => { setFilterCat(selectedProduct.category_name || ''); setStep('shop'); setDetailQty(1); }} className="hover:text-blue-600 hover:underline">{selectedProduct.category_name || 'General'}</button>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-800 font-medium truncate max-w-xs">{selectedProduct.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Image */}
              <div className="lg:col-span-1">
                <div className={`bg-gradient-to-br ${detailBg} rounded-2xl flex items-center justify-center h-80 lg:h-96 border border-gray-100 overflow-hidden`}>
                  {selectedProduct.images?.[0] ? (
                    <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Package className={`w-36 h-36 ${detailIconColor}`} />
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-gray-100">
                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-2">{selectedProduct.category_name || 'General'}</div>
                <h1 className="text-xl font-bold text-gray-900 leading-snug mb-3">{selectedProduct.name}</h1>
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_,i) => (
                      <svg key={i} className={`w-4 h-4 ${i < stars ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-blue-600 hover:underline cursor-pointer">24 ratings</span>
                </div>
                <div className="mb-4">
                  <div className="text-3xl font-extrabold text-gray-900">GHS {parseFloat(selectedProduct.price).toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Inclusive of all taxes</div>
                </div>
                <div className="mb-4">
                  {selectedProduct.stock_qty > 0 ? (
                    <span className="text-green-600 font-semibold text-sm">✓ In Stock — {selectedProduct.stock_qty} units available</span>
                  ) : (
                    <span className="text-red-500 font-semibold text-sm">✕ Out of Stock</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 leading-relaxed mb-4 pb-4 border-b border-gray-100">
                  {selectedProduct.description || 'Quality product from GEMS Store. All products are sourced from verified suppliers and come with a satisfaction guarantee.'}
                </div>
                <div className="text-xs text-gray-400">SKU: <span className="font-mono text-gray-600">{selectedProduct.sku || '—'}</span></div>
              </div>

              {/* Buy Box */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 sticky top-24">
                  <div className="text-2xl font-extrabold text-gray-900 mb-1">GHS {parseFloat(selectedProduct.price).toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mb-4">Free delivery on orders over GHS 500</div>
                  {selectedProduct.stock_qty > 0 ? (
                    <>
                      <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Truck className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span><strong>Free delivery</strong> on orders over GHS 500</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span>Secure Paystack checkout</span>
                        </div>
                      </div>
                      {!inCart ? (
                        <div className="mb-4">
                          <label className="text-xs font-semibold text-gray-600 mb-2 block">Quantity</label>
                          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2 w-fit">
                            <button onClick={() => setDetailQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 shadow-sm">
                              <Minus className="w-3 h-3 text-gray-600" />
                            </button>
                            <span className="font-bold text-gray-900 w-6 text-center">{detailQty}</span>
                            <button onClick={() => setDetailQty(q => Math.min(selectedProduct.stock_qty, q + 1))} className="w-7 h-7 rounded-full bg-[#0D3B6E] text-white flex items-center justify-center hover:bg-[#1A5294] shadow-sm">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <label className="text-xs font-semibold text-gray-600 mb-2 block">In Cart</label>
                          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2 w-fit">
                            <button onClick={() => updateQty(selectedProduct.id, -1)} className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 shadow-sm">
                              <Minus className="w-3 h-3 text-gray-600" />
                            </button>
                            <span className="font-bold text-gray-900 w-6 text-center">{inCart.quantity}</span>
                            <button onClick={() => updateQty(selectedProduct.id, 1)} className="w-7 h-7 rounded-full bg-[#0D3B6E] text-white flex items-center justify-center hover:bg-[#1A5294] shadow-sm">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      {!inCart ? (
                        <button onClick={() => { for (let i = 0; i < detailQty; i++) addToCart(selectedProduct); setDetailQty(1); }} className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 rounded-xl text-sm transition-colors mb-3">
                          Add to Cart
                        </button>
                      ) : (
                        <button onClick={() => setShowCart(true)} className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 rounded-xl text-sm transition-colors mb-3">
                          View Cart ({inCart.quantity} item{inCart.quantity !== 1 ? 's' : ''})
                        </button>
                      )}
                      <button
                        onClick={() => { if (!inCart) { for (let i = 0; i < detailQty; i++) addToCart(selectedProduct); } setStep('checkout'); if (deliveryLocation) setForm(f => ({ ...f, delivery_address: f.delivery_address || deliveryLocation })); }}
                        className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold py-3 rounded-xl text-sm transition-colors"
                      >
                        Buy Now
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-red-500 font-semibold mb-3">Currently Out of Stock</div>
                      <button onClick={() => { setStep('shop'); setDetailQty(1); }} className="w-full bg-gray-100 text-gray-600 font-medium py-3 rounded-xl text-sm hover:bg-gray-200 transition-colors">Browse Similar Products</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Related Products */}
            {(() => {
              const related = products.filter(p => p.category_name === selectedProduct.category_name && p.id !== selectedProduct.id).slice(0, 4);
              if (!related.length) return null;
              return (
                <div className="mt-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Related Products</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {related.map(p => (
                      <div key={p.id} onClick={() => { setSelectedProduct(p); setDetailQty(1); }} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                        <div className={`h-32 bg-gradient-to-br ${detailCatColors[p.category_name] || 'from-gray-100 to-gray-50'} flex items-center justify-center overflow-hidden`}>
                          {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <Package className={`w-12 h-12 ${detailCatIconColors[p.category_name] || 'text-gray-300'}`} />}
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{p.name}</p>
                          <p className="text-sm font-extrabold text-gray-900">GHS {parseFloat(p.price).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {step === 'checkout' && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
            <button onClick={() => setStep('shop')} className="hover:text-blue-600 hover:underline">Store</button>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => setShowCart(true)} className="hover:text-blue-600 hover:underline">Cart</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-800 font-medium">Checkout</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left — Form */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 text-base mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#0D3B6E] text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
                  Delivery Information
                </h2>
                {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" placeholder="e.g. Kwame Asante" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Email Address *</label>
                    <input type="email" className="form-input" placeholder="you@email.com" value={form.customer_email} onChange={e => setForm({...form, customer_email: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input className="form-input" placeholder="+233 XX XXX XXXX" value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Delivery Address</label>
                    <textarea className="form-input" rows={3} placeholder="Street, City, Region" value={form.delivery_address} onChange={e => setForm({...form, delivery_address: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#0D3B6E] text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
                  Payment
                </h2>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: <Lock className="w-4 h-4 text-green-600" />, label: 'SSL Secured', sub: '256-bit encryption' },
                    { icon: <ShieldCheck className="w-4 h-4 text-blue-600" />, label: 'Paystack', sub: 'Card & Mobile Money' },
                    { icon: <BadgeCheck className="w-4 h-4 text-purple-600" />, label: 'Guaranteed', sub: 'Satisfaction promise' },
                  ].map(b => (
                    <div key={b.label} className="flex flex-col items-center text-center bg-gray-50 rounded-xl p-3">
                      <div className="mb-1">{b.icon}</div>
                      <div className="text-xs font-semibold text-gray-700">{b.label}</div>
                      <div className="text-[10px] text-gray-400">{b.sub}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={initiateCheckout}
                  disabled={paying}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-gray-900 font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {paying ? 'Processing…' : `Pay GHS ${cartTotal.toFixed(2)} with Paystack`}
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2">You will be redirected to Paystack to complete payment securely</p>
              </div>
            </div>

            {/* Right — Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20">
                <h2 className="font-bold text-gray-900 text-base mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4">
                  {cart.map(i => (
                    <div key={i.product.id} className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                          {i.product.images?.[0] ? (
                            <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover" />
                          ) : <Package className="w-5 h-5 text-gray-300 m-auto mt-3" />}
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#0D3B6E] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{i.quantity}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">{i.product.name}</div>
                        <div className="text-xs text-gray-400">GHS {parseFloat(i.product.price).toFixed(2)} each</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 flex-shrink-0">GHS {(i.product.price * i.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal ({cartCount} items)</span>
                    <span>GHS {cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                      {deliveryFee === 0 ? 'Free' : `GHS ${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span>GHS {orderTotal.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={() => setShowCart(true)} className="w-full mt-4 text-xs text-blue-600 hover:underline text-center">
                  Edit Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────── FOOTER ─────────────────────── */}
      {step !== 'track' && (
      <footer className="bg-gray-900 text-white">

        {/* Trust bar */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Truck className="w-5 h-5" />, title: 'Free Delivery', sub: 'On orders over GHS 500' },
              { icon: <ShieldCheck className="w-5 h-5" />, title: 'Secure Checkout', sub: 'Paystack — card & mobile money' },
              { icon: <BadgeCheck className="w-5 h-5" />, title: 'Quality Guaranteed', sub: 'Verified suppliers only' },
              { icon: <Search className="w-5 h-5" />, title: 'Order Tracking', sub: 'Know where your order is' },
            ].map(b => (
              <div key={b.title} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 flex-shrink-0">
                  {b.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{b.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main columns */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

            {/* Brand */}
            <div className="md:col-span-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <div className="font-extrabold text-lg">GEMS<span className="text-yellow-400">.store</span></div>
                  <div className="text-gray-400 text-xs">Your trusted marketplace</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Ghana&apos;s go-to store for electronics, furniture, office supplies and more. Quality products, competitive prices, fast delivery.
              </p>
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">Get deals in your inbox</p>
              <div className="flex mb-6">
                <input type="email" placeholder="your@email.com"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-l-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
                />
                <button className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-xs px-4 rounded-r-lg transition-colors flex-shrink-0">
                  Subscribe
                </button>
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'Facebook', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                  { label: 'Twitter', path: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
                  { label: 'Instagram', path: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 19.5h11a3 3 0 003-3v-11a3 3 0 00-3-3h-11a3 3 0 00-3 3v11a3 3 0 003 3z' },
                  { label: 'WhatsApp', path: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' },
                ].map(s => (
                  <button key={s.label} aria-label={s.label}
                    className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-yellow-400 text-gray-400 hover:text-gray-900 border border-gray-700 hover:border-yellow-400 flex items-center justify-center transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d={s.path} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Shop */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Shop</h4>
              <ul className="space-y-3">
                {['All Products', ...categories.map(c => c.name)].map(name => (
                  <li key={name}>
                    <button
                      onClick={() => { setFilterCat(name === 'All Products' ? '' : name); setStep('shop'); resetPage(); }}
                      className="text-gray-400 hover:text-yellow-400 text-sm transition-colors"
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Help</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Track My Order', action: () => { setTrackInput(''); setTrackResult(null); setTrackError(''); setStep('track'); } },
                  { label: 'Returns & Refunds', action: () => {} },
                  { label: 'Shipping Policy', action: () => {} },
                  { label: 'FAQs', action: () => {} },
                  { label: 'Contact Support', action: () => {} },
                ].map(l => (
                  <li key={l.label}>
                    <button onClick={l.action} className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="md:col-span-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Contact Us</h4>
              <ul className="space-y-4 mb-6">
                {[
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, text: 'Accra, Ghana' },
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>, text: '+233 XX XXX XXXX' },
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, text: 'support@gems.com' },
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, text: 'Mon – Fri, 8am – 6pm' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">{item.icon}</div>
                    <span className="text-gray-400 text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-3">We accept</p>
              <div className="flex flex-wrap gap-2">
                {['Visa', 'Mastercard', 'MTN MoMo', 'Telecel Cash', 'AT Money'].map(p => (
                  <span key={p} className="bg-gray-800 border border-gray-700 text-gray-300 text-[10px] font-semibold px-2.5 py-1 rounded-md">{p}</span>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 bg-gray-950">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-xs">&copy; {new Date().getFullYear()} GEMS Store. All rights reserved.</p>
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((l, i, arr) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="hover:text-gray-300 cursor-pointer transition-colors">{l}</span>
                  {i < arr.length - 1 && <span className="text-gray-700">·</span>}
                </span>
              ))}
            </div>
          </div>
        </div>

      </footer>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLocationModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="bg-[#0D3B6E] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-yellow-400" />
                <h2 className="font-bold text-white text-base">Set Delivery Location</h2>
              </div>
              <button onClick={() => setShowLocationModal(false)} className="text-white/60 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Your location helps us show delivery availability and pre-fills your checkout address.</p>

              {/* Detect button */}
              <button
                onClick={() => {
                  if (!navigator.geolocation) return;
                  setLocationDetecting(true);
                  navigator.geolocation.getCurrentPosition(
                    async pos => {
                      try {
                        const { latitude, longitude } = pos.coords;
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                        const data = await res.json();
                        const addr = data.address;
                        const label = [addr.suburb || addr.neighbourhood, addr.city || addr.town || addr.village, addr.country].filter(Boolean).join(', ');
                        setLocationInput(label);
                      } catch { setLocationInput(''); }
                      finally { setLocationDetecting(false); }
                    },
                    () => setLocationDetecting(false)
                  );
                }}
                disabled={locationDetecting}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#0D3B6E]/30 hover:border-[#0D3B6E] text-[#0D3B6E] font-semibold text-sm py-3 rounded-xl transition-all disabled:opacity-50"
              >
                <MapPin className="w-4 h-4" />
                {locationDetecting ? 'Detecting…' : 'Use my current location'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or enter manually</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Manual input */}
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0D3B6E] transition-colors"
                placeholder="e.g. East Legon, Accra"
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && locationInput.trim()) {
                    setDeliveryLocation(locationInput.trim());
                    setShowLocationModal(false);
                  }
                }}
              />

              {/* Quick picks */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Popular areas</p>
                <div className="flex flex-wrap gap-2">
                  {['East Legon', 'Osu', 'Tema', 'Kumasi', 'Takoradi', 'Tamale'].map(area => (
                    <button
                      key={area}
                      onClick={() => setLocationInput(area + ', Ghana')}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        locationInput === area + ', Ghana'
                          ? 'bg-[#0D3B6E] text-white border-[#0D3B6E]'
                          : 'border-gray-200 text-gray-600 hover:border-[#0D3B6E] hover:text-[#0D3B6E]'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                {deliveryLocation && (
                  <button
                    onClick={() => { setDeliveryLocation(''); setLocationInput(''); setShowLocationModal(false); }}
                    className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium text-sm py-3 rounded-xl transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => {
                    if (locationInput.trim()) {
                      setDeliveryLocation(locationInput.trim());
                      setForm(f => ({ ...f, delivery_address: locationInput.trim() }));
                    }
                    setShowLocationModal(false);
                  }}
                  className="flex-1 bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold text-sm py-3 rounded-xl transition-colors"
                >
                  Confirm Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#0D3B6E]">
              <div className="flex items-center gap-2 text-white">
                <ShoppingCart className="w-5 h-5" />
                <h2 className="font-bold text-base">Cart <span className="text-yellow-400">({cartCount})</span></h2>
              </div>
              <button onClick={() => setShowCart(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* Items grouped by branch */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                  <ShoppingCart className="w-14 h-14 mb-4 text-gray-200"/>
                  <p className="font-medium text-gray-500">Your cart is empty</p>
                  <p className="text-sm mt-1">Add some products to get started</p>
                  <button onClick={() => setShowCart(false)} className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-5 py-2 rounded-lg text-sm transition-colors">
                    Browse Products
                  </button>
                </div>
              ) : (() => {
                // Group by branch
                const groups: Record<string, { branch_name: string; items: CartItem[] }> = {};
                cart.forEach(i => {
                  const key = i.branch_id || 'default';
                  if (!groups[key]) groups[key] = { branch_name: i.branch_name || 'Main Branch', items: [] };
                  groups[key].items.push(i);
                });
                const groupEntries = Object.entries(groups);
                return groupEntries.map(([key, group]) => (
                  <div key={key}>
                    {/* Branch header — only show if multiple branches in cart */}
                    {groupEntries.length > 1 && (
                      <div className="flex items-center gap-1.5 mb-2 px-1">
                        <MapPin className="w-3.5 h-3.5 text-[#0D3B6E]" />
                        <span className="text-xs font-bold text-[#0D3B6E] uppercase tracking-wide">{group.branch_name}</span>
                        <div className="flex-1 h-px bg-blue-100" />
                      </div>
                    )}
                    {group.items.map(i => (
                      <div key={i.product.id} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100 mb-2">
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-gray-100">
                          {i.product.images?.[0] ? (
                            <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300"/></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">{i.product.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">GHS {parseFloat(i.product.price).toFixed(2)} each</div>
                          <div className="text-xs font-bold text-gray-900 mt-0.5">Subtotal: GHS {(i.product.price * i.quantity).toFixed(2)}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
                              <button onClick={() => updateQty(i.product.id, -1)} className="w-5 h-5 flex items-center justify-center hover:text-red-500 transition-colors"><Minus className="w-3 h-3"/></button>
                              <span className="text-sm font-bold text-gray-900 w-5 text-center">{i.quantity}</span>
                              <button onClick={() => updateQty(i.product.id, 1)} className="w-5 h-5 flex items-center justify-center hover:text-blue-600 transition-colors"><Plus className="w-3 h-3"/></button>
                            </div>
                            <button onClick={() => removeFromCart(i.product.id)} className="text-xs text-red-400 hover:text-red-600 hover:underline transition-colors">Remove</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-white space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal ({cartCount} items)</span>
                  <span>GHS {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Delivery</span>
                  <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                    {deliveryFee === 0 ? 'Free' : `GHS ${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>GHS {orderTotal.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="text-xs text-center text-gray-400 bg-yellow-50 rounded-lg py-2 px-3">
                    Add <strong>GHS {(500 - cartTotal).toFixed(2)}</strong> more for free delivery
                  </div>
                )}
                <button
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  onClick={() => { setShowCart(false); setStep('checkout'); if (deliveryLocation) setForm(f => ({ ...f, delivery_address: f.delivery_address || deliveryLocation })); }}
                >
                  <Lock className="w-4 h-4" />
                  Proceed to Checkout
                </button>
                <button onClick={() => setShowCart(false)} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center transition-colors">
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
