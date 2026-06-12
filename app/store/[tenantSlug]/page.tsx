'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCart, Search, X, Plus, Minus, Package, Truck, Lock, BadgeCheck, ChevronRight, ShieldCheck, MapPin, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { publicApi } from '@/lib/api';
import ProductCard from '@/components/store/ProductCard';
import StoreNavbar from '@/components/store/StoreNavbar';
import StoreFilters from '@/components/store/StoreFilters';
import StoreFooter from '@/components/store/StoreFooter';
import MobileBottomBar from '@/components/store/MobileBottomBar';
import ProductImageGallery from '@/components/store/ProductImageGallery';
import ProductCardSkeleton from '@/components/store/ProductCardSkeleton';
import { categoryGradient, categoryIconColor, formatGhs } from '@/components/store/theme';
import { useStoreProductFeed } from '@/hooks/useStoreProductFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

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
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string>('');
  const [cartLoading, setCartLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [step, setStep] = useState<'shop'|'detail'|'checkout'|'success'|'track'>('shop');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [orderId, setOrderId] = useState<number|null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [form, setForm] = useState({ customer_name:'', customer_email:'', customer_phone:'', delivery_address:'' });
  const [error, setError] = useState('');
  const [detailQty, setDetailQty] = useState(1);
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const toggleSection = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  const {
    products,
    hasMore,
    loadingInitial,
    loadingMore,
    refreshing,
    loadMore,
    itemsPerPage,
  } = useStoreProductFeed({
    tenantSlug,
    search,
    filterCat,
    branchSlug: activeBranch?.slug,
  });

  const maxProductPrice = Math.ceil(Math.max(0, ...products.map(p => parseFloat(p.price) || 0)) / 100) * 100 || 5000;
  const activeFilterCount = [filterCat, inStockOnly, priceMax !== '' || priceMin > 0].filter(Boolean).length;

  // Load tenant + branches on mount
  useEffect(() => {
    publicApi.get(`/storefront/${tenantSlug}/branches`).then(r => {
      setTenant(r.data.data.tenant);
      setBranches(r.data.data.branches);
    }).catch(() => {});
  }, [tenantSlug]);

  useEffect(() => {
    publicApi.get('/categories', { params: { tenant_slug: tenantSlug } }).then(c => setCategories(c.data.data)).catch(() => {});
    const savedId = localStorage.getItem(CART_ID_KEY) || '';
    setCartId(savedId);
    if (savedId) {
      publicApi.get(`/storefront/cart/${savedId}`).then(r => {
        setCart(r.data.data.items.map(toCartItem));
      }).catch(() => {});
    }
  }, [tenantSlug]);

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
      const r = await publicApi.post('/storefront/cart/add', {
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
      const r = await publicApi.patch('/storefront/cart/update', {
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
      const r = await publicApi.patch('/storefront/cart/update', {
        cart_id: cartId,
        product_id: productId,
        quantity: 0,
      });
      syncCart(r.data.data);
    } finally { setCartLoading(false); }
  };

  const clearCart = async () => {
    if (cartId) await publicApi.delete(`/storefront/cart/${cartId}`);
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
  const sentinelRef = useInfiniteScroll(loadMore, {
    enabled: step === 'shop' && hasMore && !loadingInitial && !loadingMore && !refreshing,
    watchKey: `${filtered.length}-${hasMore}-${loadingInitial}`,
  });
  const resetPage = () => { /* client-only filters; server feed resets via hook queryKey */ };
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const deliveryFee = cartTotal >= 500 ? 0 : 30;
  const orderTotal = cartTotal + deliveryFee;

  const initiateCheckout = async () => {
    if (!form.customer_name || !form.customer_email) { setError('Name and email are required.'); return; }
    if (cart.length === 0) { setError('Your cart is empty.'); return; }
    setPaying(true); setError('');
    try {
      const r = await publicApi.post('/storefront/checkout', {
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

      const openPaystack = () => {
        const handler = (window as any).PaystackPop.setup({
          key: paystack_public_key,
          email,
          amount: Math.round(grand_total * 100),
          currency: 'GHS',
          ref: `GEMS-${orderNums[0]}-${Date.now()}`,
          onClose: () => { setPaying(false); },
          callback: async (response: any) => {
            try {
              await publicApi.post('/storefront/verify-payment', { reference: response.reference, order_ids: orderIds });
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
      if ((window as any).PaystackPop) {
        openPaystack();
      } else {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.onload = openPaystack;
        script.onerror = () => { setError('Failed to load Paystack. Check your connection.'); setPaying(false); };
        document.body.appendChild(script);
      }
    } catch(e:any) { setError(e.response?.data?.message||'Checkout error'); setPaying(false); }
  };

  const clearAllFilters = () => {
    setFilterCat('');
    setInStockOnly(false);
    setPriceMin(0);
    setPriceMax('');
    setSortBy('default');
    resetPage();
  };

  const handleTrackOrder = async () => {
    if (!trackInput.trim()) { setTrackError('Enter your order reference'); return; }
    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const r = await publicApi.get(`/storefront/${tenantSlug}/orders/${encodeURIComponent(trackInput.trim())}`);
      setTrackResult(r.data.data);
    } catch {
      setTrackError('Order not found. Check your reference and try again.');
    } finally {
      setTrackLoading(false);
    }
  };

  if (step === 'success') return (
    <div className="store-shell min-h-screen">
      <nav className="store-nav-bar h-14 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-gray-900" />
          </div>
          <span className="font-extrabold text-white">{tenant?.business_name || 'GEMS'}<span className="text-amber-300"> Store</span></span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-8 py-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
            <div className="relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BadgeCheck className="w-9 h-9 text-emerald-500" />
            </div>
            <h1 className="relative text-2xl font-bold text-white mb-1">Order Confirmed!</h1>
            <p className="relative text-emerald-100 text-sm">Thank you for shopping with us</p>
          </div>

          <div className="px-8 py-6 space-y-5">
            <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-4 ring-1 ring-slate-100">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Order Reference</div>
                <div className="font-mono font-bold text-[#0D3B6E] text-lg">{orderNumber}</div>
              </div>
              <BadgeCheck className="w-8 h-8 text-emerald-500" />
            </div>

            {(completedCart.length > 0 ? completedCart : cart).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Items Ordered</h3>
                <div className="space-y-2">
                  {(completedCart.length > 0 ? completedCart : cart).map(i => (
                    <div key={i.product.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 ring-1 ring-gray-100">
                        {i.product.images?.[0] ? (
                          <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover" />
                        ) : <Package className="w-5 h-5 text-gray-300 m-auto mt-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{i.product.name}</div>
                        <div className="text-xs text-gray-400">Qty: {i.quantity}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-800">{formatGhs(i.product.price * i.quantity)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-3 mt-1 border-t border-gray-100">
                  <span>Total Paid</span>
                  <span>{formatGhs(completedTotal || cartTotal + deliveryFee)}</span>
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-2xl px-5 py-4 flex items-start gap-3 ring-1 ring-blue-100">
              <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-blue-800">Estimated Delivery</div>
                <div className="text-xs text-blue-600 mt-0.5">3 – 5 business days after payment confirmation</div>
                {form.delivery_address && <div className="text-xs text-blue-500 mt-1">To: {form.delivery_address}</div>}
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">Confirmation sent to <strong className="text-gray-600">{form.customer_email}</strong></p>

            <button
              className="store-btn store-btn-primary w-full py-3"
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
    <div className="store-shell min-h-screen pb-20 lg:pb-0">

      <StoreNavbar
        businessName={tenant?.business_name}
        cartCount={cartCount}
        cartTotal={cartTotal}
        search={search}
        filterCat={filterCat}
        categories={categories}
        deliveryLocation={deliveryLocation}
        branches={branches}
        activeBranch={activeBranch}
        showBranchMenu={showBranchMenu}
        onSearchChange={setSearch}
        onCategoryChange={setFilterCat}
        onResetPage={resetPage}
        onGoHome={() => setStep('shop')}
        onOpenCart={() => setShowCart(true)}
        onOpenLocation={() => { setLocationInput(deliveryLocation); setShowLocationModal(true); }}
        onToggleBranchMenu={() => setShowBranchMenu(b => !b)}
        onSelectBranch={b => { setActiveBranch(b); setShowBranchMenu(false); }}
        onOpenMobileFilters={() => setShowMobileFilters(true)}
      />

      {step === 'shop' && (
        <div className="flex min-h-[calc(100vh-7rem)]">

          {/* ── Desktop filters sidebar ── */}
          <aside className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0 bg-white/80 backdrop-blur-sm border-r border-gray-200/80 min-h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <span className="font-bold text-gray-900">Filters</span>
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">
                  Clear all ({activeFilterCount})
                </button>
              )}
            </div>
            <StoreFilters
              categories={categories}
              products={products}
              filterCat={filterCat}
              priceMin={priceMin}
              priceMax={priceMax}
              maxProductPrice={maxProductPrice}
              inStockOnly={inStockOnly}
              sortBy={sortBy}
              openSections={openSections}
              activeFilterCount={activeFilterCount}
              onFilterCat={setFilterCat}
              onPriceMin={setPriceMin}
              onPriceMax={setPriceMax}
              onInStockOnly={setInStockOnly}
              onSortBy={setSortBy}
              onToggleSection={toggleSection}
              onResetPage={resetPage}
              onClearAll={clearAllFilters}
            />
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 px-4 xl:px-6 py-6">

          {!search && !filterCat && !inStockOnly && priceMax === '' && priceMin === 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 bg-white/70 backdrop-blur-sm rounded-2xl px-5 py-3 mb-6 ring-1 ring-gray-200/60 text-xs sm:text-sm">
              <span className="flex items-center gap-2 text-gray-700 font-medium"><Truck className="w-4 h-4 text-[#0D3B6E]" /> Free delivery over GH₵ 500</span>
              <span className="hidden sm:flex items-center gap-2 text-gray-600"><Lock className="w-4 h-4 text-emerald-600" /> Secure Paystack checkout</span>
              <span className="hidden md:flex items-center gap-2 text-gray-600"><BadgeCheck className="w-4 h-4 text-amber-500" /> Verified inventory</span>
            </div>
          )}

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

          {refreshing && products.length > 0 && (
            <div className="h-0.5 bg-gray-200 rounded-full mb-4 overflow-hidden">
              <div className="h-full w-2/5 bg-[#0D3B6E] rounded-full animate-pulse" />
            </div>
          )}

          {loadingInitial && products.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {[...Array(itemsPerPage)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className={`flex items-center justify-between mb-4 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
                <h2 className="text-base font-bold text-gray-800">
                  {filterCat ? filterCat : 'All Products'}
                  <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length} items)</span>
                </h2>
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
                <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 transition-opacity ${refreshing ? 'opacity-60 pointer-events-none' : ''}`}>
                  {filtered.map(p => {
                    const inCart = cart.find(i => i.product.id === p.id);
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        inCartQty={inCart?.quantity}
                        showBranch={!activeBranch}
                        onOpen={() => { setSelectedProduct(p); setStep('detail'); }}
                        onAdd={() => addToCart(p)}
                        onUpdateQty={delta => updateQty(p.id, delta)}
                      />
                    );
                  })}
                  {loadingMore && [...Array(Math.min(8, itemsPerPage))].map((_, i) => (
                    <ProductCardSkeleton key={`more-${i}`} />
                  ))}
                </div>
              )}

              {!hasMore && filtered.length > 0 && !loadingMore && (
                <p className="text-center text-xs text-gray-400 mt-2 pb-2">You&apos;ve seen all {filtered.length} products</p>
              )}
            </>
          )}

          <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />
          {loadingMore && products.length > 0 && (
            <p className="text-center text-xs text-gray-400 py-3">Loading more products…</p>
          )}

          </div>
        </div>
      )}


      {step === 'detail' && selectedProduct && (() => {
        const detailBg = categoryGradient(selectedProduct.category_name);
        const inCart = cart.find(i => i.product.id === selectedProduct.id);
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-6">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-5 flex-wrap">
              <button type="button" onClick={() => { setStep('shop'); setDetailQty(1); }} className="hover:text-[#0D3B6E] hover:underline">Home</button>
              <ChevronRight className="w-3 h-3" />
              <button type="button" onClick={() => { setFilterCat(selectedProduct.category_name || ''); setStep('shop'); setDetailQty(1); }} className="hover:text-[#0D3B6E] hover:underline">{selectedProduct.category_name || 'General'}</button>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-800 font-medium truncate max-w-[200px] sm:max-w-xs">{selectedProduct.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <ProductImageGallery
                  key={selectedProduct.id}
                  product={selectedProduct}
                  gradientClass={detailBg}
                />
              </div>

              <div className="lg:col-span-1 store-filter-panel p-6">
                <div className="text-[10px] text-[#1A5294] font-bold uppercase tracking-widest mb-2">{selectedProduct.category_name || 'General'}</div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mb-4">{selectedProduct.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  {selectedProduct.stock_qty > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-100">
                      <BadgeCheck className="w-3.5 h-3.5" /> In stock · {selectedProduct.stock_qty} available
                    </span>
                  ) : (
                    <span className="inline-flex text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full ring-1 ring-red-100">Out of stock</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0D3B6E]" /> Secure checkout
                  </span>
                </div>
                <div className="mb-4">
                  <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{formatGhs(parseFloat(selectedProduct.price))}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Inclusive of all taxes</div>
                </div>
                <div className="text-sm text-gray-600 leading-relaxed mb-4 pb-4 border-b border-gray-100">
                  {selectedProduct.description || 'Quality product from our verified catalog. All items are sourced from trusted suppliers.'}
                </div>
                <div className="text-xs text-gray-400">SKU: <span className="font-mono text-gray-600">{selectedProduct.sku || '—'}</span></div>
              </div>

              <div className="lg:col-span-1">
                <div className="store-filter-panel p-6 sticky top-24">
                  <div className="text-2xl font-extrabold text-gray-900 mb-1">{formatGhs(parseFloat(selectedProduct.price))}</div>
                  <div className="text-xs text-gray-400 mb-4">Free delivery on orders over GH₵ 500</div>
                  {selectedProduct.stock_qty > 0 ? (
                    <>
                      <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-2 ring-1 ring-slate-100">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span><strong>Free delivery</strong> on orders over GH₵ 500</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Lock className="w-4 h-4 text-[#0D3B6E] flex-shrink-0" />
                          <span>Secure Paystack checkout</span>
                        </div>
                      </div>
                      {!inCart ? (
                        <div className="mb-4">
                          <label className="text-xs font-semibold text-gray-600 mb-2 block">Quantity</label>
                          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2 w-fit ring-1 ring-slate-100">
                            <button type="button" onClick={() => setDetailQty(q => Math.max(1, q - 1))} className="store-qty-btn">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-gray-900 w-6 text-center">{detailQty}</span>
                            <button type="button" onClick={() => setDetailQty(q => Math.min(selectedProduct.stock_qty, q + 1))} className="store-qty-btn store-qty-btn-primary">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <label className="text-xs font-semibold text-gray-600 mb-2 block">In Cart</label>
                          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2 w-fit ring-1 ring-slate-100">
                            <button type="button" onClick={() => updateQty(selectedProduct.id, -1)} className="store-qty-btn">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-gray-900 w-6 text-center">{inCart.quantity}</span>
                            <button type="button" onClick={() => updateQty(selectedProduct.id, 1)} className="store-qty-btn store-qty-btn-primary">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      {!inCart ? (
                        <button type="button" onClick={() => { for (let i = 0; i < detailQty; i++) addToCart(selectedProduct); setDetailQty(1); }} className="store-btn store-btn-primary w-full mb-3">
                          Add to Cart
                        </button>
                      ) : (
                        <button type="button" onClick={() => setShowCart(true)} className="store-btn store-btn-primary w-full mb-3">
                          View Cart ({inCart.quantity} item{inCart.quantity !== 1 ? 's' : ''})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { if (!inCart) { for (let i = 0; i < detailQty; i++) addToCart(selectedProduct); } setStep('checkout'); if (deliveryLocation) setForm(f => ({ ...f, delivery_address: f.delivery_address || deliveryLocation })); }}
                        className="store-btn w-full bg-amber-400 hover:bg-amber-300 text-gray-900 shadow-md shadow-amber-900/10"
                      >
                        Buy Now
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-red-500 font-semibold mb-3">Currently Out of Stock</div>
                      <button type="button" onClick={() => { setStep('shop'); setDetailQty(1); }} className="store-btn w-full bg-gray-100 text-gray-600 hover:bg-gray-200">Browse Similar Products</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(() => {
              const related = products.filter(p => p.category_name === selectedProduct.category_name && p.id !== selectedProduct.id).slice(0, 4);
              if (!related.length) return null;
              return (
                <div className="mt-10">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Related Products</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {related.map(p => (
                      <button key={p.id} type="button" onClick={() => { setSelectedProduct(p); setDetailQty(1); }} className="store-product-card text-left">
                        <div className={`aspect-[4/3] bg-gradient-to-br ${categoryGradient(p.category_name)} flex items-center justify-center overflow-hidden`}>
                          {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <Package className={`w-12 h-12 ${categoryIconColor(p.category_name)}`} />}
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{p.name}</p>
                          <p className="text-sm font-extrabold text-gray-900">{formatGhs(parseFloat(p.price))}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {step === 'checkout' && (
        <div className="max-w-6xl mx-auto px-4 py-8 pb-12">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 flex-wrap">
            <button type="button" onClick={() => setStep('shop')} className="hover:text-[#0D3B6E] hover:underline">Store</button>
            <ChevronRight className="w-3 h-3" />
            <button type="button" onClick={() => setShowCart(true)} className="hover:text-[#0D3B6E] hover:underline">Cart</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-800 font-medium">Checkout</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="store-filter-panel p-6">
                <h2 className="font-bold text-gray-900 text-base mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 bg-[#0D3B6E] text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
                  Delivery Information
                </h2>
                {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-sm mb-4 ring-1 ring-red-100">{error}</div>}
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

              <div className="store-filter-panel p-5">
                <h2 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-[#0D3B6E] text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
                  Payment
                </h2>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: <Lock className="w-4 h-4 text-emerald-600" />, label: 'SSL Secured', sub: '256-bit encryption' },
                    { icon: <ShieldCheck className="w-4 h-4 text-[#0D3B6E]" />, label: 'Paystack', sub: 'Card & Mobile Money' },
                    { icon: <BadgeCheck className="w-4 h-4 text-amber-600" />, label: 'Guaranteed', sub: 'Satisfaction promise' },
                  ].map(b => (
                    <div key={b.label} className="flex flex-col items-center text-center bg-slate-50 rounded-xl p-3 ring-1 ring-slate-100">
                      <div className="mb-1">{b.icon}</div>
                      <div className="text-xs font-semibold text-gray-700">{b.label}</div>
                      <div className="text-[10px] text-gray-400">{b.sub}</div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={initiateCheckout}
                  disabled={paying}
                  className="store-btn w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-gray-900 py-3.5 flex items-center justify-center gap-2 shadow-md shadow-amber-900/10"
                >
                  <Lock className="w-4 h-4" />
                  {paying ? 'Processing…' : `Pay ${formatGhs(cartTotal)} with Paystack`}
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2">You will be redirected to Paystack to complete payment securely</p>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="store-filter-panel p-5 sticky top-24">
                <h2 className="font-bold text-gray-900 text-base mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4">
                  {cart.map(i => (
                    <div key={i.product.id} className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 ring-1 ring-gray-100">
                          {i.product.images?.[0] ? (
                            <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover" />
                          ) : <Package className="w-5 h-5 text-gray-300 m-auto mt-3" />}
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#0D3B6E] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{i.quantity}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">{i.product.name}</div>
                        <div className="text-xs text-gray-400">{formatGhs(parseFloat(i.product.price))} each</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatGhs(i.product.price * i.quantity)}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal ({cartCount} items)</span>
                    <span>{formatGhs(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-emerald-600 font-medium' : ''}>
                      {deliveryFee === 0 ? 'Free' : formatGhs(deliveryFee)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span>{formatGhs(orderTotal)}</span>
                  </div>
                </div>
                <button type="button" onClick={() => setShowCart(true)} className="w-full mt-4 text-xs text-[#0D3B6E] hover:underline text-center font-medium">
                  Edit Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'track' && (
        <div className="max-w-xl mx-auto px-4 py-8 pb-24 lg:pb-8">
          <div className="store-filter-panel p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#0D3B6E]/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-[#0D3B6E]" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Track Your Order</h1>
              <p className="text-sm text-gray-500 mt-1">Enter the order reference from your confirmation email</p>
            </div>
            <div className="space-y-4">
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D3B6E]/20 focus:border-[#0D3B6E]"
                placeholder="e.g. ORD-2024-001234"
                value={trackInput}
                onChange={e => setTrackInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrackOrder()}
              />
              {trackError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{trackError}</p>}
              <button type="button" onClick={handleTrackOrder} disabled={trackLoading} className="store-btn store-btn-primary w-full py-3">
                {trackLoading ? 'Looking up…' : 'Track Order'}
              </button>
              <button type="button" onClick={() => setStep('shop')} className="w-full text-sm text-gray-500 hover:text-[#0D3B6E]">
                ← Back to shop
              </button>
            </div>
            {trackResult && (
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-400">Order</p>
                    <p className="font-mono font-bold text-[#0D3B6E]">{trackResult.order_number || trackInput}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 capitalize">
                    {trackResult.status || 'Processing'}
                  </span>
                </div>
                {trackResult.total != null && (
                  <p className="text-sm text-gray-600">Total: <strong>{formatGhs(parseFloat(trackResult.total))}</strong></p>
                )}
                {trackResult.delivery_address && (
                  <p className="text-sm text-gray-500 flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    {trackResult.delivery_address}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {step !== 'track' && step !== 'checkout' && (
        <StoreFooter
          businessName={tenant?.business_name}
          categories={categories}
          onCategorySelect={name => { setFilterCat(name); setStep('shop'); resetPage(); }}
          onTrackOrder={() => { setTrackInput(''); setTrackResult(null); setTrackError(''); setStep('track'); }}
        />
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

      {/* Mobile filter sheet */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#0D3B6E]" />
                <h2 className="font-bold text-gray-900">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="text-xs bg-[#0D3B6E] text-white px-2 py-0.5 rounded-full">{activeFilterCount}</span>
                )}
              </div>
              <button type="button" onClick={() => setShowMobileFilters(false)} className="p-2 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <StoreFilters
                compact
                categories={categories}
                products={products}
                filterCat={filterCat}
                priceMin={priceMin}
                priceMax={priceMax}
                maxProductPrice={maxProductPrice}
                inStockOnly={inStockOnly}
                sortBy={sortBy}
                openSections={openSections}
                activeFilterCount={activeFilterCount}
                onFilterCat={setFilterCat}
                onPriceMin={setPriceMin}
                onPriceMax={setPriceMax}
                onInStockOnly={setInStockOnly}
                onSortBy={setSortBy}
                onToggleSection={toggleSection}
                onResetPage={resetPage}
                onClearAll={() => { clearAllFilters(); setShowMobileFilters(false); }}
              />
            </div>
            <div className="p-4 border-t border-gray-100 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setShowMobileFilters(false)} className="store-btn store-btn-primary w-full py-3">
                Show {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl">

            <div className="store-nav-bar flex items-center justify-between px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-white">
                <ShoppingCart className="w-5 h-5" />
                <h2 className="font-bold text-base">Your Cart <span className="text-amber-300">({cartCount})</span></h2>
              </div>
              <button type="button" onClick={() => setShowCart(false)} className="text-white/70 hover:text-white transition-colors p-1">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                  <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mb-4 ring-1 ring-gray-100">
                    <ShoppingCart className="w-10 h-10 text-gray-200"/>
                  </div>
                  <p className="font-semibold text-gray-600">Your cart is empty</p>
                  <p className="text-sm mt-1 text-gray-400">Add products to get started</p>
                  <button type="button" onClick={() => setShowCart(false)} className="store-btn store-btn-primary mt-5 px-6">
                    Browse Products
                  </button>
                </div>
              ) : (() => {
                const groups: Record<string, { branch_name: string; items: CartItem[] }> = {};
                cart.forEach(i => {
                  const key = i.branch_id || 'default';
                  if (!groups[key]) groups[key] = { branch_name: i.branch_name || 'Main Branch', items: [] };
                  groups[key].items.push(i);
                });
                const groupEntries = Object.entries(groups);
                return groupEntries.map(([key, group]) => (
                  <div key={key}>
                    {groupEntries.length > 1 && (
                      <div className="flex items-center gap-1.5 mb-2 px-1">
                        <MapPin className="w-3.5 h-3.5 text-[#0D3B6E]" />
                        <span className="text-xs font-bold text-[#0D3B6E] uppercase tracking-wide">{group.branch_name}</span>
                        <div className="flex-1 h-px bg-blue-100" />
                      </div>
                    )}
                    {group.items.map(i => (
                      <div key={i.product.id} className="flex items-start gap-3 bg-white rounded-2xl p-3 border border-gray-100 mb-2 shadow-sm">
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50 ring-1 ring-gray-100">
                          {i.product.images?.[0] ? (
                            <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300"/></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 line-clamp-2">{i.product.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{formatGhs(parseFloat(i.product.price))} each</div>
                          <div className="text-sm font-bold text-gray-900 mt-1">{formatGhs(i.product.price * i.quantity)}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1 ring-1 ring-slate-100">
                              <button type="button" onClick={() => updateQty(i.product.id, -1)} className="store-qty-btn w-7 h-7"><Minus className="w-3 h-3"/></button>
                              <span className="text-sm font-bold text-gray-900 w-5 text-center">{i.quantity}</span>
                              <button type="button" onClick={() => updateQty(i.product.id, 1)} className="store-qty-btn store-qty-btn-primary w-7 h-7"><Plus className="w-3 h-3"/></button>
                            </div>
                            <button type="button" onClick={() => removeFromCart(i.product.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-white space-y-3 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal ({cartCount} items)</span>
                  <span>{formatGhs(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Delivery</span>
                  <span className={deliveryFee === 0 ? 'text-emerald-600 font-medium' : ''}>
                    {deliveryFee === 0 ? 'Free' : formatGhs(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatGhs(orderTotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="text-xs text-center text-amber-800 bg-amber-50 rounded-xl py-2 px-3 ring-1 ring-amber-100">
                    Add <strong>{formatGhs(500 - cartTotal)}</strong> more for free delivery
                  </div>
                )}
                <button
                  type="button"
                  className="store-btn store-btn-primary w-full py-3 flex items-center justify-center gap-2"
                  onClick={() => { setShowCart(false); setStep('checkout'); if (deliveryLocation) setForm(f => ({ ...f, delivery_address: f.delivery_address || deliveryLocation })); }}
                >
                  <Lock className="w-4 h-4" />
                  Proceed to Checkout
                </button>
                <button type="button" onClick={() => setShowCart(false)} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center transition-colors py-1">
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {(step === 'shop' || step === 'detail' || step === 'track') && (
        <MobileBottomBar
          cartCount={cartCount}
          filterCount={activeFilterCount}
          active={showMobileFilters ? 'filters' : step === 'track' ? 'track' : showCart ? 'cart' : 'shop'}
          onHome={() => { setStep('shop'); setShowMobileFilters(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onFilters={() => setShowMobileFilters(true)}
          onCart={() => setShowCart(true)}
          onTrack={() => { setTrackInput(''); setTrackResult(null); setTrackError(''); setStep('track'); setShowMobileFilters(false); }}
        />
      )}
    </div>
  );
}
