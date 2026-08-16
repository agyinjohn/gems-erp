'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCart, Search, X, Plus, Minus, Package, Truck, Lock, BadgeCheck, ChevronRight, ShieldCheck, MapPin, SlidersHorizontal, Tag, Heart, Check, Wrench } from 'lucide-react';
import StoreAuthModal from '@/components/store/StoreAuthModal';
import { publicApi } from '@/lib/api';
import ProductCard from '@/components/store/ProductCard';
import StoreNavbar from '@/components/store/StoreNavbar';
import StoreFilters from '@/components/store/StoreFilters';
import StoreFooter from '@/components/store/StoreFooter';
import MobileBottomBar from '@/components/store/MobileBottomBar';
import ProductDetail from '@/components/store/ProductDetail';
import ProductCardSkeleton from '@/components/store/ProductCardSkeleton';
import ProductFacts from '@/components/store/ProductFacts';
import StoreHero from '@/components/store/StoreHero';
import CategoryTiles from '@/components/store/CategoryTiles';
import TrustStrip from '@/components/store/TrustStrip';
import PromoBanner from '@/components/store/PromoBanner';
import SectionHeading from '@/components/store/SectionHeading';
import ServicesSection from '@/components/store/ServicesSection';
import ServiceRequestDrawer from '@/components/store/ServiceRequestDrawer';
import MyReviews from '@/components/store/MyReviews';
import { fetchServiceOffers, type ServiceOffer } from '@/lib/serviceOffers';
import { brandVars, hueOf, GEMS_NAVY } from '@/components/store/brand';
import OrderTrackingPanel from '@/components/store/OrderTrackingPanel';
import LocationPickerModal from '@/components/store/LocationPickerModal';
import InstallPrompt from '@/components/store/InstallPrompt';
import { categoryGradient, categoryIconColor, formatGhs } from '@/components/store/theme';
import {
  DEFAULT_STOREFRONT_SETTINGS,
  calcDeliveryFee,
  calcTaxAmount,
  amountUntilFreeDelivery,
  fetchPublicStoreSettings,
  trackStoreOrder,
  isAvailable,
  tracksStock,
  type StorefrontSettings,
  type StoreProduct,
  type ProductVariant,
  type StoreTenant,
  type StoreBranch,
  type StoreCustomer,
  type StoreOrder,
} from '@/lib/storefrontSettings';
import { useStoreProductFeed } from '@/hooks/useStoreProductFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface CartItem {
  product: StoreProduct;
  quantity: number;
  branch_id: string;
  branch_name: string;
  /** Which one of it, when the product is sold in options. */
  variant_key?: string;
  variant_label?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_RE = /^[+\d][\d\s\-().]{6,19}$/;

function validateCheckoutForm(form: { customer_name: string; customer_email: string; customer_phone: string; delivery_address: string }) {
  if (!form.customer_name.trim()) return 'Full name is required.';
  if (!form.customer_email.trim()) return 'Email address is required.';
  if (!EMAIL_RE.test(form.customer_email.trim())) return 'Please enter a valid email address.';
  if (form.customer_phone.trim() && !PHONE_RE.test(form.customer_phone.trim())) return 'Please enter a valid phone number.';
  return null;
}

const cartIdKey = (slug: string) => `gems_cart_id_${slug}`;
const customerTokenKey = (slug: string) => `gems_store_customer_${slug}`;
const marketplaceFlagKey = (slug: string) => `gems_via_marketplace_${slug}`;

const customerApi = (token: string) => {
  const client = publicApi;
  return {
    get: (url: string) => client.get(url, { headers: { Authorization: `Bearer ${token}` } }),
    post: (url: string, data?: any) => client.post(url, data, { headers: { Authorization: `Bearer ${token}` } }),
  };
};

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
    is_active: item.is_active ?? true,
    item_type: item.item_type,
    unit_type: item.unit_type,
    duration: item.duration,
  },
  quantity: item.quantity,
  branch_id: item.branch_id || '',
  branch_name: item.branch_name || 'Main Branch',
  variant_key: item.variant_key || '',
  variant_label: item.variant_label || '',
});

interface Props {
  /**
   * The product a customer arrived on, when they came to its own address
   * rather than to the shop front.
   *
   * Handed down already fetched rather than looked up here. The route has to
   * fetch it on the server anyway to put a title and a picture in the page for
   * WhatsApp and Google, so fetching it again in the browser would be a second
   * request for something already in hand — and it would show the shop front
   * first and swap to the product a moment later, which is exactly the flicker
   * a shared link should not have.
   */
  initialProduct?: StoreProduct | null;
}

export default function StorefrontApp({ initialProduct = null }: Props) {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [tenant, setTenant]   = useState<StoreTenant | null>(null);
  const [branches, setBranches] = useState<StoreBranch[]>([]);
  const [activeBranch, setActiveBranch] = useState<StoreBranch | null>(null); // null = all branches
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string>('');
  const [cartLoadingIds, setCartLoadingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showCart, setShowCart] = useState(false);
  // The other half of the catalogue: work the shop will take on, which is asked
  // for rather than bought. Fetched separately because it comes from a
  // different endpoint with a different shape and a different flow behind it.
  const [serviceOffers, setServiceOffers] = useState<ServiceOffer[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestPick, setRequestPick] = useState<string | undefined>();
  const [accountTab, setAccountTab] = useState<'orders' | 'reviews'>('orders');
  // Opened on the product when the customer came to its address, so the first
  // paint is already the right page.
  const [step, setStep] = useState<'shop'|'detail'|'checkout'|'success'|'track'|'orders'>(
    initialProduct ? 'detail' : 'shop',
  );
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(initialProduct);
  const [paying, setPaying] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [form, setForm] = useState({ customer_name:'', customer_email:'', customer_phone:'', delivery_address:'' });
  const [error, setError] = useState('');
  const [detailQty, setDetailQty] = useState(1);
  const [completedCart, setCompletedCart] = useState<CartItem[]>([]);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [priceMin, setPriceMin] = useState<number>(0);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [customerToken, setCustomerToken] = useState('');
  const [storeCustomer, setStoreCustomer] = useState<StoreCustomer | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [myOrders, setMyOrders] = useState<StoreOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [priceMax, setPriceMax] = useState<number|''>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'default'|'price_asc'|'price_desc'|'name'>('default');
  const [openSections, setOpenSections] = useState<Record<string,boolean>>({ categories: true, price: true, availability: true, sort: true });
  const [showFilters, setShowFilters] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StorefrontSettings>({ ...DEFAULT_STOREFRONT_SETTINGS });
  // Carries the split params too, so a retry pays through the same subaccount —
  // otherwise the retry would land wholly in the platform account while the
  // order is already marked as split-settled.
  const [pendingPayment, setPendingPayment] = useState<{
    orderIds: string[]; reference: string; email: string; grandTotal: number; paystackKey: string;
    subaccount?: string; transactionCharge?: number;
  } | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [viaMarketplace, setViaMarketplace] = useState(false);
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

  const maxProductPrice = Math.ceil(Math.max(0, ...products.map(p => p.price || 0)) / 100) * 100 || 5000;
  const activeFilterCount = [filterCat, inStockOnly, priceMax !== '' || priceMin > 0].filter(Boolean).length;

  /** Somebody who has not asked for anything yet, and can still be introduced. */
  const isBrowsing = !search && !filterCat && !inStockOnly && priceMax === '' && priceMin === 0;
  /** The shop's hue, so a drawn product tile belongs to this shop. */
  const brandHue = hueOf(storeSettings.brand_color || GEMS_NAVY);
  /** Where "Start shopping" goes. */
  const productGridRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);

  /**
   * Opening a product changes the address as well as the view.
   *
   * Pushed onto history directly rather than routed, because both addresses
   * render this same component: routing would tear the whole storefront down
   * and rebuild it — refetching the catalogue over a mobile connection — to
   * show a panel that is already in memory. The address is what makes the
   * product shareable and gives the browser's Back button something to do;
   * the popstate listener below keeps the view honest when it is used.
   *
   * A product created before slugs existed has no address. It still opens —
   * it simply cannot be linked to until the backfill has run.
   */
  const openProduct = (p: StoreProduct) => {
    setSelectedProduct(p);
    setStep('detail');
    if (p.slug) window.history.pushState({ productSlug: p.slug }, '', `/store/${tenantSlug}/${p.slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Back to the shop front, address and all.
   *
   * Every way out of a product has to come through here. Thirteen places called
   * setStep('shop') and exactly one of them put the address back, so a customer
   * who arrived on a shared product link and tapped the logo was left looking at
   * the shop front while the browser still said /store/x/laptop-pro-15 — and the
   * next refresh took them somewhere they had already left.
   *
   * Replaced rather than pushed: returning to where you were is not a new place
   * to go, and pushing made Back walk through every visit to the shop front.
   */
  const goToShop = useCallback(() => {
    setStep('shop');
    setDetailQty(1);
    const home = `/store/${tenantSlug}`;
    if (typeof window !== 'undefined' && window.location.pathname !== home) {
      window.history.replaceState({}, '', home);
    }
  }, [tenantSlug]);

  const closeProduct = goToShop;

  /**
   * Show whatever lives at a product address.
   *
   * Fetched by that address rather than searched for in the loaded feed: the
   * product may be on page nine of it, or excluded by whatever filter the page
   * happens to open with.
   */
  const showProductBySlug = useCallback(async (slug: string) => {
    if (!tenantSlug || !slug) return;
    try {
      const r = await publicApi.get(`/storefront/${tenantSlug}/products/${encodeURIComponent(slug)}`);
      if (!r.data?.data) throw new Error('gone');
      setSelectedProduct(r.data.data);
      setStep('detail');
    } catch {
      // A dead link lands on the shop front rather than an error — the address
      // may be stale, or the product withdrawn from sale — and the address is
      // corrected too, so a refresh does not fetch the missing thing again.
      goToShop();
    }
  }, [tenantSlug, goToShop]);

  // Read by the popstate listener, which must not be rebuilt every time the
  // selection changes or it would detach and reattach on every click.
  const openSlugRef = useRef<string | undefined>(undefined);
  useEffect(() => { openSlugRef.current = selectedProduct?.slug; }, [selectedProduct]);

  // Back and forward move between the shop front and a product, or the address
  // says one thing while the page shows another.
  useEffect(() => {
    const onPop = () => {
      const parts = window.location.pathname.split('/').filter(Boolean);
      // /store/{tenant} or /store/{tenant}/{product}
      const slug = parts.length > 2 ? parts[2] : '';
      if (!slug) { setStep('shop'); setDetailQty(1); return; }
      // Going back from one product to another has to actually change the
      // product. Comparing against what is open is the whole point — without
      // it the address moves and the panel does not.
      if (openSlugRef.current === slug) { setStep('detail'); return; }
      showProductBySlug(slug);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [showProductBySlug]);


  /** Where "Browse categories" goes. */
  const categoryRef = useRef<HTMLElement>(null);
  /**
   * The shop's own photographs for the hero, best first.
   *
   * In stock and worth featuring — there is no sense opening with a picture of
   * something nobody can buy — and one per product, so a shop that uploaded six
   * angles of one item does not get a hero of the same item six times.
   */
  const featured = products.filter(isAvailable);
  /**
   * What stands on the hero's stage: one entry per product, carrying its best
   * picture, its name and its price, so the frame can caption whatever it is
   * currently showing. One photograph per product — a shop that uploaded six
   * angles of one thing should not get six turns of the same thing.
   */
  const heroStageItems = featured
    .map(p => ({
      image: (Array.isArray(p.images) ? p.images.find(Boolean) : p.images) || undefined,
      name: p.name,
      price: Number(p.price) || 0,
    }))
    .slice(0, 6);

  // Load tenant + branches on mount
  useEffect(() => {
    publicApi.get(`/storefront/${tenantSlug}/branches`).then(r => {
      setTenant(r.data.data.tenant);
      setBranches(r.data.data.branches);
    }).catch(() => {});
    fetchPublicStoreSettings(tenantSlug).then(setStoreSettings);
    // Silently, because a shop that sells only goods has none of these and
    // that is not an error — the band simply does not render.
    fetchServiceOffers(tenantSlug).then(r => setServiceOffers(r.offers)).catch(() => {});
  }, [tenantSlug]);

  // Handle manifest shortcut: ?track=1
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('track') === '1') {
      setStep('track');
    }
  }, []);

  // Came in from the platform-wide marketplace directory? Tag every order
  // from this session so the platform commission applies. Persisted per
  // tenant slug so it survives a page refresh mid-shop, not just the query
  // param on first load.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromQuery = new URLSearchParams(window.location.search).get('ref') === 'marketplace';
    if (fromQuery) {
      localStorage.setItem(marketplaceFlagKey(tenantSlug), '1');
      setViaMarketplace(true);
    } else if (localStorage.getItem(marketplaceFlagKey(tenantSlug)) === '1') {
      setViaMarketplace(true);
    }
  }, [tenantSlug]);

  // Scroll to top on every step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  useEffect(() => {
    publicApi.get('/categories', { params: { tenant_slug: tenantSlug } }).then(c => setCategories(c.data.data)).catch(() => {});
    const savedId = localStorage.getItem(cartIdKey(tenantSlug)) || '';
    setCartId(savedId);
    if (savedId) {
      publicApi.get(`/storefront/cart/${savedId}`).then(r => {
        setCart(r.data.data.items.map(toCartItem));
      }).catch(() => {});
    }
  }, [tenantSlug]);

  useEffect(() => {
    const token = localStorage.getItem(customerTokenKey(tenantSlug));
    if (!token) return;
    setCustomerToken(token);
    customerApi(token).get('/storefront/customer/me').then(r => {
      setStoreCustomer(r.data.data);
      setForm(f => ({ ...f, customer_name: r.data.data.name, customer_email: r.data.data.email, customer_phone: r.data.data.phone || f.customer_phone }));
    }).catch(() => {
      localStorage.removeItem(customerTokenKey(tenantSlug));
      setCustomerToken('');
    });
  }, [tenantSlug]);

  // Preload Paystack script eagerly so it's ready when user clicks Pay
  useEffect(() => {
    if ((window as any).PaystackPop) return;
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  // Load wishlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`gems_wishlist_${tenantSlug}`);
    if (saved) { try { setWishlist(new Set(JSON.parse(saved))); } catch {} }
  }, [tenantSlug]);

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      localStorage.setItem(`gems_wishlist_${tenantSlug}`, JSON.stringify([...next]));
      return next;
    });
  };

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
      localStorage.setItem(cartIdKey(tenantSlug), data.cart_id);
    }
    setCart(data.items.map(toCartItem));
  };

  const setProductLoading = (id: string, loading: boolean) =>
    setCartLoadingIds(prev => { const s = new Set(prev); loading ? s.add(id) : s.delete(id); return s; });

  /**
   * A cart line is a product *and* a choice.
   *
   * Two navy mediums is one line of two; a navy medium and a white large are
   * two lines. Keyed on the product alone, changing the quantity of one would
   * find whichever polo shirt line came first and change that instead.
   */
  const lineKey = (productId: string, variantKey?: string) => `${productId}::${variantKey || ''}`;

  const addToCart = async (product: StoreProduct, quantity = 1, variant?: ProductVariant | null) => {
    setProductLoading(product.id, true);
    try {
      const r = await publicApi.post('/storefront/cart/add', {
        cart_id: cartId || localStorage.getItem(cartIdKey(tenantSlug)) || '',
        product_id: product.id,
        quantity,
        // Which one of it. The key the catalogue handed out, never one built
        // here — the server owns what a combination is called.
        variant_key: variant?.key || '',
        tenant_id: tenant?.id,
      });
      syncCart(r.data.data);
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message || 'We could not add that to your cart.');
    } finally { setProductLoading(product.id, false); }
  };

  const updateQty = async (productId: string, delta: number, variantKey = '') => {
    const item = cart.find(i =>
      String(i.product.id) === String(productId) && (i.variant_key || '') === variantKey);
    if (!item) return;
    const newQty = item.quantity + delta;
    setProductLoading(productId, true);
    try {
      const r = await publicApi.patch('/storefront/cart/update', {
        cart_id: cartId,
        product_id: productId,
        variant_key: variantKey,
        quantity: newQty,
      });
      syncCart(r.data.data);
    } finally { setProductLoading(productId, false); }
  };

  const removeFromCart = async (productId: string, variantKey = '') => {
    setProductLoading(productId, true);
    try {
      const r = await publicApi.patch('/storefront/cart/update', {
        cart_id: cartId,
        product_id: productId,
        variant_key: variantKey,
        quantity: 0,
      });
      syncCart(r.data.data);
    } finally { setProductLoading(productId, false); }
  };

  const clearCart = async () => {
    if (cartId) await publicApi.delete(`/storefront/cart/${cartId}`);
    setCart([]);
    setCartId('');
    localStorage.removeItem(cartIdKey(tenantSlug));
  };


  const filtered = products.filter(p =>
    (!filterCat || p.category_name === filterCat) &&
    (!inStockOnly || isAvailable(p)) &&
    (priceMin === 0 || p.price >= priceMin) &&
    (priceMax === '' || p.price <= priceMax)
  ).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
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
  const subtotalAfterDiscount = Math.max(0, cartTotal - appliedDiscount);
  const deliveryFee = calcDeliveryFee(subtotalAfterDiscount, storeSettings);
  const taxAmount = calcTaxAmount(subtotalAfterDiscount, storeSettings.tax_rate || 0);
  const freeDeliveryGap = amountUntilFreeDelivery(subtotalAfterDiscount, storeSettings);
  const orderTotal = subtotalAfterDiscount + deliveryFee + taxAmount;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponMessage('');
    try {
      const r = await publicApi.post('/storefront/coupons/validate', { code: couponCode.trim(), subtotal: cartTotal, tenant_slug: tenantSlug });
      setAppliedDiscount(r.data.data.discount);
      setCouponMessage(`Saved ${formatGhs(r.data.data.discount)}`);
    } catch (e: any) {
      setAppliedDiscount(0);
      setCouponMessage(e.response?.data?.message || 'Invalid coupon');
    }
  };

  const handleAuthSuccess = (customer: StoreCustomer, token: string) => {
    localStorage.setItem(customerTokenKey(tenantSlug), token);
    setCustomerToken(token);
    setStoreCustomer(customer);
    setForm(f => ({ ...f, customer_name: customer.name, customer_email: customer.email, customer_phone: customer.phone || f.customer_phone }));
    setShowAccountModal(false);
  };

  const logoutCustomer = () => {
    localStorage.removeItem(customerTokenKey(tenantSlug));
    setCustomerToken('');
    setStoreCustomer(null);
    setMyOrders([]);
  };

  const loadMyOrders = async () => {
    if (!customerToken) { setShowAccountModal(true); return; }
    setOrdersLoading(true);
    setStep('orders');
    try {
      const r = await customerApi(customerToken).get('/storefront/customer/orders');
      setMyOrders(r.data.data || []);
    } catch {
      setMyOrders([]);
    } finally { setOrdersLoading(false); }
  };

  const openAccount = () => {
    if (storeCustomer) {
      loadMyOrders();
    } else {
      setShowAccountModal(true);
    }
  };

  const openPaystackPopup = (payload: {
    orderIds: string[]; reference: string; email: string; grandTotal: number; paystackKey: string;
    subaccount?: string; transactionCharge?: number;
  }) => {
    const { orderIds, reference, email, grandTotal, paystackKey, subaccount, transactionCharge } = payload;
    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) {
      setError('Paystack failed to load. Please refresh and try again.');
      setPaying(false);
      return;
    }
    PaystackPop.setup({
      key: paystackKey,
      email,
      amount: Math.round(grandTotal * 100),
      currency: 'GHS',
      ref: reference,
      // Split-enabled shops only: the shop's share settles directly to their
      // subaccount and transaction_charge (pesewas) is the platform's cut.
      ...(subaccount && { subaccount, transaction_charge: transactionCharge ?? 0, bearer: 'account' }),
      onClose: () => {
        setPaying(false);
        setVerifyError('Payment window closed. You can retry below without creating a new order.');
      },
      callback: (transaction: any) => {
        publicApi.post('/storefront/verify-payment', { reference, order_ids: orderIds })
          .then(() => {
            setPendingPayment(null);
            setVerifyError('');
            setCompletedCart([...cart]);
            setCompletedTotal(orderTotal);
            clearCart().then(() => setStep('success'));
          })
          .catch((e: any) => {
            setVerifyError(e.response?.data?.message || 'Payment verification failed. Your payment may still have gone through — use Retry Verify.');
          })
          .finally(() => setPaying(false));
      },
    }).openIframe();
  };

  const retryPayment = () => {
    if (!pendingPayment) return;
    setPaying(true);
    setVerifyError('');
    openPaystackPopup(pendingPayment);
  };

  const retryPaymentVerification = async () => {
    if (!pendingPayment) return;
    setPaying(true);
    setVerifyError('');
    try {
      await publicApi.post('/storefront/verify-payment', {
        reference: pendingPayment.reference,
        order_ids: pendingPayment.orderIds,
      });
      setPendingPayment(null);
      setCompletedCart([...cart]);
      setCompletedTotal(orderTotal);
      await clearCart();
      setStep('success');
    } catch (e: any) {
      setVerifyError(e.response?.data?.message || 'Verification still failed. Contact support with your payment reference.');
    } finally {
      setPaying(false);
    }
  };

  const initiateCheckout = async () => {
    if (!storeSettings.store_enabled) { setError('This store is not accepting orders right now.'); return; }
    if (storeSettings.min_order_amount && cartTotal < storeSettings.min_order_amount) {
      setError(`Minimum order amount is ${formatGhs(storeSettings.min_order_amount)}.`);
      return;
    }
    const validationError = validateCheckoutForm(form);
    if (validationError) { setError(validationError); return; }
    if (cart.length === 0) { setError('Your cart is empty.'); return; }
    setPaying(true); setError(''); setVerifyError('');
    try {
      const r = await publicApi.post('/storefront/checkout', {
        ...form,
        delivery_fee: deliveryFee,
        tenant_id: tenant?.id,
        via_marketplace: viaMarketplace,
        coupon_code: appliedDiscount > 0 ? couponCode.trim() : undefined,
        items: cart.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity,
          // Which one of it. Re-checked server-side, because what comes off the
          // shelf and what the shop is owed both depend on this answer.
          variant_key: i.variant_key || '',
          branch_id: i.branch_id,
          branch_name: i.branch_name,
        })),
      });
      const { orders, grand_total, email, paystack_public_key, reference, subaccount, transaction_charge } = r.data.data;
      const orderIds = orders.map((o: any) => o.order_id);
      const orderNums = orders.map((o: any) => o.order_number);
      setOrderNumber(orderNums.join(', '));
      const payload = {
        orderIds, reference, email, grandTotal: grand_total, paystackKey: paystack_public_key,
        // Present only when this shop is split-enabled — Paystack then settles
        // their share straight to their own account.
        subaccount, transactionCharge: transaction_charge,
      };
      setPendingPayment(payload);
      openPaystackPopup(payload);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Checkout error. Please try again.');
      setPaying(false);
    }
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
      setTrackResult(await trackStoreOrder(tenantSlug, trackInput.trim()));
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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--store-brand) 12%, white)' }}>
            <Package className="w-4 h-4 [color:var(--store-brand-on-paper)]" />
          </div>
          <span className="font-extrabold text-gray-900">
            {tenant?.business_name || 'GEMS'}
            <span className="[color:var(--store-brand-on-paper)]"> Store</span>
          </span>
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
                          <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
                <div className="text-xs text-blue-600 mt-0.5">{storeSettings.delivery_estimate || '3 – 5 business days'} after payment confirmation</div>
                {form.delivery_address && <div className="text-xs text-blue-500 mt-1">To: {form.delivery_address}</div>}
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">Confirmation sent to <strong className="text-gray-600">{form.customer_email}</strong></p>

            <button
              className="store-btn store-btn-primary w-full py-3"
              onClick={() => { goToShop(); setForm({ customer_name:'', customer_email:'', customer_phone:'', delivery_address:'' }); }}
            >
              Continue Shopping
            </button>
            {orderNumber && (
              <button
                type="button"
                className="w-full text-sm text-[#0D3B6E] font-medium hover:underline mt-2"
                onClick={() => { setTrackInput(orderNumber.split(',')[0].trim()); setTrackResult(null); setTrackError(''); setStep('track'); }}
              >
                Track this order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="store-shell min-h-screen pb-20 lg:pb-0" style={brandVars(storeSettings.brand_color)}>

      <StoreNavbar
        businessName={tenant?.business_name}
        logo={storeSettings.logo || tenant?.logo}
        cartCount={cartCount}
        cartTotal={cartTotal}
        search={search}
        deliveryLocation={deliveryLocation}
        branches={branches}
        activeBranch={activeBranch}
        showBranchMenu={showBranchMenu}
        onSearchChange={setSearch}
        onResetPage={resetPage}
        onGoHome={goToShop}
        onOpenCart={() => setShowCart(true)}
        onOpenLocation={() => setShowLocationModal(true)}
        onToggleBranchMenu={() => setShowBranchMenu(b => !b)}
        onSelectBranch={b => { setActiveBranch(b); setShowBranchMenu(false); }}
        onOpenFilters={() => setShowFilters(true)}
        onOpenAccount={openAccount}
        customerName={storeCustomer?.name}
      />

      {/* Once somebody is searching or filtering, the hero and its promo banner
          stand aside — so the announcement comes back as a strip rather than
          disappearing with them. */}
      {storeSettings.announcement && step === 'shop' && !isBrowsing && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 text-center text-sm text-amber-900">
          {storeSettings.announcement}
        </div>
      )}

      {!storeSettings.store_enabled && step === 'shop' && (
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 text-center text-sm text-gray-600">
          This store is temporarily closed for new orders. Please check back later.
        </div>
      )}

      {step === 'shop' && (
        <>

        {/* ── The shop introducing itself ──
            Full width, above the filter sidebar rather than beside it: the hero
            and the promo banner are the shop talking, and squeezing them into
            the column left over after a 288px sidebar made them look like a
            widget. Once somebody is searching or filtering they are past being
            sold to, so the whole block steps aside. */}
        {isBrowsing && (
          <>
            <StoreHero
              businessName={tenant?.business_name || 'Our store'}
              heroHeadline={storeSettings.hero_headline}
              tagline={storeSettings.tagline}
              bannerImage={storeSettings.banner_image}
              stageItems={heroStageItems}
              logo={tenant?.logo}
              productCount={products.length}
              categoryCount={categories.length}
              deliveryEstimate={storeSettings.delivery_estimate}
              onShop={() => productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              onSecondary={categories.length > 1 ? () => categoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : undefined}
              secondaryLabel={categories.length > 1 ? 'Browse categories' : undefined}
            />

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-8 space-y-8">
            <TrustStrip
              freeDeliveryOver={storeSettings.free_delivery_threshold}
              deliveryFee={storeSettings.delivery_fee}
              onTrack={() => { setTrackResult(null); setTrackError(''); setStep('track'); }}
            />

            {categories.length > 1 && (
              <section ref={categoryRef} className="scroll-mt-24">
                <SectionHeading
                  eyebrow="Shop by category"
                  title="Browse what we sell"
                  actionLabel={categories.length > 6 ? 'See everything' : undefined}
                  onAction={categories.length > 6
                    ? () => { setFilterCat(''); resetPage(); productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
                    : undefined}
                />
                <CategoryTiles
                  categories={categories}
                  products={products}
                  active={filterCat}
                  seedHue={brandHue}
                  onSelect={c => { setFilterCat(c); resetPage(); productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                />
              </section>
            )}

            <PromoBanner
              announcement={storeSettings.announcement}
              freeDeliveryOver={storeSettings.free_delivery_threshold}
              deliveryFee={storeSettings.delivery_fee}
              stageItems={heroStageItems}
              seedHue={brandHue}
              onShop={() => productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
            </div>
          </>
        )}

        {/* The filter sidebar is gone. It took 288px of every desktop screen to
            show controls most customers never touched, pushed the goods into a
            narrower column than the hero above them, and gave the page two
            competing left edges. The same filters are one tap away in the
            drawer, which now opens at every width rather than only on a
            phone. */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">

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
              {/* Categories, next to the things they filter.
                  These used to be a strip under the search bar — a third place
                  to pick a category, after the tiles above and the filter
                  drawer, and the only one where the result of tapping was off
                  the bottom of the screen. Here the grid changes directly
                  underneath, and the heading beside them already says which
                  category is showing. */}
              {categories.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3 mb-1 -mx-1 px-1">
                  {[{ id: '', name: 'All' }, ...categories.map(c => ({ id: c.name, name: c.name }))].map(c => (
                    <button
                      key={c.id || 'all'}
                      type="button"
                      onClick={() => { setFilterCat(c.id); resetPage(); }}
                      className={`store-pill shrink-0 ${filterCat === c.id ? 'store-pill-active' : ''}`}
                    >
                      {c.name}
                    </button>
                  ))}
                  {serviceOffers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => servicesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="store-pill shrink-0 inline-flex items-center gap-1.5 ml-1"
                    >
                      <Wrench className="w-3.5 h-3.5" /> Services
                    </button>
                  )}
                </div>
              )}

              <div ref={productGridRef} className={`flex items-center justify-between gap-3 mb-4 scroll-mt-24 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
                <div className="min-w-0">
                  <span className="store-eyebrow">{filterCat ? 'Category' : 'All products'}</span>
                  <h2 className="store-section-title flex items-baseline gap-2 min-w-0">
                    <span className="truncate">{filterCat ? filterCat : 'Everything in the shop'}</span>
                    <span className="text-sm font-normal text-gray-400 flex-shrink-0">{filtered.length} item{filtered.length === 1 ? '' : 's'}</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  className="store-section-action"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span
                      className="ml-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1"
                      style={{ background: 'var(--store-brand)', color: 'var(--store-on-brand)' }}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <select
                  className="text-xs border border-gray-200 rounded-xl px-2.5 py-2 text-gray-600 bg-white focus:outline-none"
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value as typeof sortBy); resetPage(); }}
                >
                  <option value="default">Sort: Default</option>
                  <option value="price_asc">Price: Low–High</option>
                  <option value="price_desc">Price: High–Low</option>
                  <option value="name">Name A–Z</option>
                </select>
                </div>
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
                  {filtered.map((p, i) => {
                    const inCart = cart.find(x => x.product.id === p.id);
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        tenantSlug={tenantSlug}
                        seedHue={brandHue}
                        index={i}
                        inCartQty={inCart?.quantity}
                        showBranch={!activeBranch}
                        onOpen={() => openProduct(p)}
                        cartLoading={cartLoadingIds.has(p.id)}
                        onAdd={() => addToCart(p)}
                        onUpdateQty={delta => updateQty(p.id, delta)}
                        wishlisted={wishlist.has(p.id)}
                        onToggleWishlist={() => toggleWishlist(p.id)}
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

          {/* The work half of the catalogue, after the goods rather than mixed
              into them. A customer scrolls the shop, reaches the end of what
              can be bought, and finds what can be asked for. */}
          {serviceOffers.length > 0 && (
            <div ref={servicesRef} className="pt-10 mt-8 border-t border-gray-200/70">
              <ServicesSection
                offers={serviceOffers}
                onRequest={offer => { setRequestPick(offer?.id); setRequestOpen(true); }}
              />
            </div>
          )}

        </div>
        </>
      )}


      {step === 'detail' && selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          inCartQty={cart.find(i => i.product.id === selectedProduct.id)?.quantity || 0}
          qty={detailQty}
          onQty={setDetailQty}
          onAdd={variant => { addToCart(selectedProduct, detailQty, variant); setDetailQty(1); }}
          onUpdateCartQty={delta => updateQty(selectedProduct.id, delta)}
          onBuyNow={variant => {
            if (!cart.find(i => i.product.id === selectedProduct.id)) addToCart(selectedProduct, detailQty, variant);
            setStep('checkout');
            if (deliveryLocation) setForm(f => ({ ...f, delivery_address: f.delivery_address || deliveryLocation }));
          }}
          onOpenCart={() => setShowCart(true)}
          onClose={closeProduct}
          onCategory={name => { setFilterCat(name); closeProduct(); }}
          related={products.filter(p => p.category_name === selectedProduct.category_name && p.id !== selectedProduct.id).slice(0, 4)}
          // Through openProduct, so the address follows. Setting the product
          // directly left the browser pointing at the one you came from.
          onOpenRelated={openProduct}
          wishlisted={wishlist.has(selectedProduct.id)}
          onToggleWishlist={() => toggleWishlist(selectedProduct.id)}
          freeDeliveryOver={storeSettings.free_delivery_threshold}
          deliveryEstimate={storeSettings.delivery_estimate}
          tenantSlug={tenantSlug}
          customerToken={customerToken}
          customerName={storeCustomer?.name}
        />
      )}

      {step === 'checkout' && (
        <div className="max-w-6xl mx-auto px-4 py-8 pb-12">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 flex-wrap">
            <button type="button" onClick={goToShop} className="hover:text-[#0D3B6E] hover:underline">Store</button>
            <ChevronRight className="w-3 h-3" />
            <button type="button" onClick={() => setShowCart(true)} className="hover:text-[#0D3B6E] hover:underline">Cart</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-800 font-medium">Checkout</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="store-filter-panel p-6">
                <h2 className="font-bold text-gray-900 text-base mb-1 flex items-center gap-2">
                  <span className="w-7 h-7 bg-[#0D3B6E] text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
                  Delivery Information
                </h2>
                <p className="text-xs text-gray-400 mb-5">No account needed — just fill in your details below.</p>
                {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-sm mb-4 ring-1 ring-red-100">{error}</div>}
                {verifyError && (
                  <div className="bg-amber-50 text-amber-900 px-3 py-3 rounded-xl text-sm mb-4 ring-1 ring-amber-100 space-y-2">
                    <p>{verifyError}</p>
                    {pendingPayment && (
                      <div className="flex gap-3">
                        <button type="button" onClick={retryPayment} disabled={paying} className="text-sm font-semibold text-[#0D3B6E] hover:underline">
                          {paying ? 'Opening…' : 'Complete payment'}
                        </button>
                        <span className="text-amber-300">·</span>
                        <button type="button" onClick={retryPaymentVerification} disabled={paying} className="text-sm text-gray-600 hover:underline">
                          Already paid? Verify
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
                    <input className="form-input" placeholder={storeSettings.phone_placeholder || 'Phone number'} value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} />
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
                  onClick={pendingPayment ? retryPayment : initiateCheckout}
                  disabled={paying}
                  className="store-btn w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-gray-900 py-3.5 flex items-center justify-center gap-2 shadow-md shadow-amber-900/10"
                >
                  <Lock className="w-4 h-4" />
                  {paying ? 'Processing…' : pendingPayment ? `Complete Payment — ${formatGhs(pendingPayment.grandTotal)}` : `Pay ${formatGhs(orderTotal)} with Paystack`}
                </button>
                {pendingPayment && !paying && (
                  <button type="button" onClick={retryPaymentVerification} className="w-full mt-2 text-sm font-semibold text-[#0D3B6E] hover:underline">
                    Already paid? Click to verify
                  </button>
                )}
                <p className="text-[10px] text-gray-400 text-center mt-2">You will be redirected to Paystack to complete payment securely</p>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="store-filter-panel p-5 sticky top-24">
                <h2 className="font-bold text-gray-900 text-base mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4">
                  {cart.map(i => (
                    <div key={lineKey(i.product.id, i.variant_key)} className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 ring-1 ring-gray-100">
                          {i.product.images?.[0] ? (
                            <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : <Package className="w-5 h-5 text-gray-300 m-auto mt-3" />}
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#0D3B6E] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{i.quantity}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">{i.product.name}</div>
                        {i.variant_label && <div className="text-xs text-gray-600 truncate">{i.variant_label}</div>}
                        <div className="text-xs text-gray-400">{formatGhs(i.product.price)} each</div>
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
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Coupon</span>
                      <span>-{formatGhs(appliedDiscount)}</span>
                    </div>
                  )}
                  <div className="flex gap-2 mb-2">
                    <input className="form-input text-xs flex-1" placeholder="Coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} />
                    <button type="button" className="btn-secondary text-xs px-3" onClick={applyCoupon}><Tag className="w-3.5 h-3.5" /></button>
                  </div>
                  {couponMessage && <p className={`text-xs ${appliedDiscount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{couponMessage}</p>}
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-emerald-600 font-medium' : ''}>
                      {deliveryFee === 0 ? 'Free' : formatGhs(deliveryFee)}
                    </span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{storeSettings.tax_name || 'Tax'} ({storeSettings.tax_rate}%)</span>
                      <span>{formatGhs(taxAmount)}</span>
                    </div>
                  )}
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
              <button type="button" onClick={goToShop} className="w-full text-sm text-gray-500 hover:text-[#0D3B6E]">
                ← Back to shop
              </button>
            </div>
            {trackResult && (
              <OrderTrackingPanel order={trackResult} reference={trackInput.trim()} />
            )}
          </div>
        </div>
      )}

      {step !== 'track' && step !== 'checkout' && (
        <StoreFooter
          businessName={tenant?.business_name}
          categories={categories}
          freeDeliveryThreshold={storeSettings.free_delivery_threshold}
          onCategorySelect={name => { setFilterCat(name); goToShop(); resetPage(); }}
          onTrackOrder={() => { setTrackInput(''); setTrackResult(null); setTrackError(''); setStep('track'); }}
          onShipping={() => { setTrackInput(''); setTrackResult(null); setTrackError(''); setStep('track'); }}
          onReturns={() => { setTrackInput(''); setTrackResult(null); setTrackError(''); setStep('track'); }}
        />
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <LocationPickerModal
          initial={deliveryLocation}
          onConfirm={(addr) => {
            setDeliveryLocation(addr);
            if (addr) setForm(f => ({ ...f, delivery_address: addr }));
            setShowLocationModal(false);
          }}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      {/* Mobile filter sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#0D3B6E]" />
                <h2 className="font-bold text-gray-900">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="text-xs bg-[#0D3B6E] text-white px-2 py-0.5 rounded-full">{activeFilterCount}</span>
                )}
              </div>
              <button type="button" onClick={() => setShowFilters(false)} className="p-2 text-gray-400 hover:text-gray-700">
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
                onClearAll={() => { clearAllFilters(); setShowFilters(false); }}
              />
            </div>
            <div className="p-4 border-t border-gray-100 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setShowFilters(false)} className="store-btn store-btn-primary w-full py-3">
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

            <div className="store-panel-head flex items-center justify-between px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-white">
                <ShoppingCart className="w-5 h-5" />
                <h2 className="font-bold text-base">Your Cart <span className="text-amber-300">({cartCount})</span></h2>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button type="button" onClick={clearCart} className="text-white/60 hover:text-red-300 text-xs font-medium transition-colors">
                    Clear all
                  </button>
                )}
                <button type="button" onClick={() => setShowCart(false)} className="text-white/70 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5"/>
                </button>
              </div>
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
                      <div key={lineKey(i.product.id, i.variant_key)} className="flex items-start gap-3 bg-white rounded-2xl p-3 border border-gray-100 mb-2 shadow-sm">
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50 ring-1 ring-gray-100">
                          {i.product.images?.[0] ? (
                            <img src={i.product.images[0]} alt={i.product.name} className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300"/></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 line-clamp-2">{i.product.name}</div>
                          {/* Which one of it. Without this a cart holding a navy
                              medium and a white large shows the same line twice. */}
                          {i.variant_label && (
                            <div className="text-xs text-gray-600 mt-0.5 font-medium">{i.variant_label}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-0.5">{formatGhs(i.product.price)} each</div>
                          <div className="text-sm font-bold text-gray-900 mt-1">{formatGhs(i.product.price * i.quantity)}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1 ring-1 ring-slate-100">
                              <button type="button" onClick={() => updateQty(i.product.id, -1, i.variant_key)} className="store-qty-btn w-7 h-7"><Minus className="w-3 h-3"/></button>
                              <span className="text-sm font-bold text-gray-900 w-5 text-center">{i.quantity}</span>
                              <button type="button" onClick={() => updateQty(i.product.id, 1, i.variant_key)} className="store-qty-btn store-qty-btn-primary w-7 h-7"><Plus className="w-3 h-3"/></button>
                            </div>
                            <button type="button" onClick={() => removeFromCart(i.product.id, i.variant_key)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
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
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{storeSettings.tax_name || 'Tax'} ({storeSettings.tax_rate}%)</span>
                    <span>{formatGhs(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatGhs(orderTotal)}</span>
                </div>
                {freeDeliveryGap > 0 && (
                  <div className="text-xs text-center text-amber-800 bg-amber-50 rounded-xl py-2 px-3 ring-1 ring-amber-100">
                    Add <strong>{formatGhs(freeDeliveryGap)}</strong> more for free delivery
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

      {/* ── Account Panel (slide-in drawer) ── */}
      {step === 'orders' && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={goToShop} />
          <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="store-panel-head flex items-center justify-between px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-3 text-white">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  {storeCustomer?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{storeCustomer?.name}</p>
                  <p className="text-white/60 text-xs">{storeCustomer?.email}</p>
                </div>
              </div>
              <button type="button" onClick={goToShop} className="text-white/70 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Two things a customer comes here for: what they bought, and
                what they said about it. Tabs rather than one long scroll,
                because the reviews half is a prompt to act and would never be
                seen underneath fifty orders. */}
            <div className="flex border-b border-gray-200 flex-shrink-0">
              {(['orders', 'reviews'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAccountTab(t)}
                  className={`flex-1 text-sm font-semibold py-3 border-b-2 transition-colors ${
                    accountTab === t ? 'text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                  style={accountTab === t ? { borderColor: 'var(--store-brand-on-paper)' } : undefined}
                >
                  {t === 'orders' ? 'My orders' : 'My reviews'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {accountTab === 'reviews' ? (
                <MyReviews
                  token={customerToken}
                  tenantSlug={tenantSlug}
                  onOpenProduct={slug => { goToShop(); showProductBySlug(slug); }}
                />
              ) : (
              <>
              {ordersLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-12">
                  <svg className="animate-spin w-4 h-4 text-[#0D3B6E]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading orders…
                </div>
              ) : myOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No orders yet</p>
                  <p className="text-xs mt-1">Your orders will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myOrders.map(o => (
                    <div key={o._id || o.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-mono font-semibold text-[#0D3B6E] text-sm">{o.order_number}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(o.createdAt || o.created_at || '').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatGhs(o.total)}</p>
                          <p className="text-xs capitalize text-gray-400 mt-0.5">{o.status} · {o.payment_status}</p>
                        </div>
                      </div>
                      {o.items && o.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
                          {o.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-500">
                              <span className="truncate flex-1 mr-2">{item.product_name} × {item.quantity}</span>
                              <span className="font-medium text-gray-700 shrink-0">{formatGhs(item.unit_price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => { goToShop(); setShowCart(false); }}
                className="store-btn store-btn-primary w-full py-3"
              >
                Continue Shopping
              </button>
              <button
                type="button"
                onClick={() => { logoutCustomer(); goToShop(); }}
                className="w-full text-sm text-red-500 hover:text-red-700 font-medium py-2 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccountModal && (
        <StoreAuthModal
          tenantSlug={tenantSlug}
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAccountModal(false)}
        />
      )}

      {requestOpen && (
        <ServiceRequestDrawer
          tenantSlug={tenantSlug}
          offers={serviceOffers}
          initialId={requestPick}
          onClose={() => { setRequestOpen(false); setRequestPick(undefined); }}
        />
      )}

      <InstallPrompt businessName={tenant?.business_name} tenantSlug={tenantSlug} />

      {(step === 'shop' || step === 'detail' || step === 'track' || step === 'orders') && (
        <MobileBottomBar
          cartCount={cartCount}
          filterCount={activeFilterCount}
          active={showFilters ? 'filters' : step === 'track' ? 'track' : step === 'orders' ? 'account' : showCart ? 'cart' : 'shop'}
          onHome={() => { goToShop(); setShowFilters(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onFilters={() => setShowFilters(true)}
          onCart={() => setShowCart(true)}
          onTrack={() => { setTrackInput(''); setTrackResult(null); setTrackError(''); setStep('track'); setShowFilters(false); }}
          onAccount={openAccount}
          customerName={storeCustomer?.name}
        />
      )}
    </div>
  );
}
