import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useTenant } from "@/hooks/use-tenant";
import { useShopProducts, useCreateShopOrder, useCompleteShopOrderPayment, useShopOrderByToken, type ShopOrderItem } from "@/hooks/use-shop";
import { useSiteSetting } from "@/hooks/use-site-settings";
import { useTenantPaymentSettings } from "@/hooks/use-tenant-payment-settings";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ShoppingBag, X, Plus, Minus, Menu, Loader2, CreditCard, Check, ArrowUpRight, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useFeedback } from "@/hooks/use-feedback";
import type { StockItem } from "@/hooks/use-inventory";
import iskaOSLogo from "/iska systems logos.png";

const STRIPE_SHOP_PENDING_KEY = "stripe_shop_order_pending";

type CartLine = { item: StockItem; quantity: number; unit_price: number; total: number; download_url: string | null };

function StripeShopPaymentForm({ returnUrl, onCancel }: { returnUrl: string; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (error) setLoading(false);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-2">
        <button type="submit" disabled={!stripe || loading} className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {loading ? "Processing…" : "Pay now"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
      </div>
    </form>
  );
}

const TenantShop = () => {
  const { showSuccess, showError } = useFeedback();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { tenant, loading: tenantLoading } = useTenant();
  const effectiveTenantId = slug && tenant?.slug === slug ? tenant.id : undefined;
  const { data: products, isLoading: loadingProducts } = useShopProducts(effectiveTenantId);
  const { data: desktopBg } = useSiteSetting("shop_bg_desktop", effectiveTenantId ?? null);
  const { data: mobileBg } = useSiteSetting("shop_bg_mobile", effectiveTenantId ?? null);
  const tenantPayment = useTenantPaymentSettings(effectiveTenantId);
  const createOrder = useCreateShopOrder();
  const completePayment = useCompleteShopOrderPayment();

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [productQty, setProductQty] = useState(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "details" | "payment" | "done">("cart");
  const [checkoutForm, setCheckoutForm] = useState({ name: "", email: "", phone: "" });
  const [lastOrderToken, setLastOrderToken] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<{ total: number; items: ShopOrderItem[] } | null>(null);
  const [stripePaymentLoading, setStripePaymentLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: orderByToken } = useShopOrderByToken(lastOrderToken);

  const bgImage = desktopBg?.value || "/images/hero-1.jpg";
  const bgMobileImage = mobileBg?.value || bgImage;
  const loading = tenantLoading || (!!slug && tenant?.slug !== slug) || loadingProducts;
  const shopPath = tenant?.slug ? `/t/${tenant.slug}/shop` : "";
  const isShopActive = location.pathname === shopPath;
  const cartTotal = useMemo(() => cart.reduce((s, l) => s + l.total, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  const openProduct = (p: StockItem) => {
    setSelectedProduct(p);
    setProductQty(1);
    setProductDialogOpen(true);
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    const unit_price = Number(selectedProduct.sell_price) || 0;
    const qty = Math.max(1, Math.min(productQty, selectedProduct.is_downloadable ? 999 : Math.floor(Number(selectedProduct.quantity) || 0)));
    const total = unit_price * qty;
    setCart((prev) => {
      const i = prev.findIndex((l) => l.item.id === selectedProduct.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + qty, total: (next[i].quantity + qty) * next[i].unit_price };
        return next;
      }
      return [...prev, { item: selectedProduct, quantity: qty, unit_price, total, download_url: selectedProduct.download_url ?? null }];
    });
    setProductDialogOpen(false);
    setSelectedProduct(null);
    showSuccess("Added to cart", `${selectedProduct.name} × ${qty}`);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const line = next[index];
      const newQty = Math.max(0, line.quantity + delta);
      if (newQty === 0) return next.filter((_, i) => i !== index);
      next[index] = { ...line, quantity: newQty, total: newQty * line.unit_price };
      return next;
    });
  };

  const startCheckout = () => {
    setCheckoutStep("details");
  };

  const createOrderAndPay = async (paymentMethod: "stripe" | "pay_at_venue") => {
    if (!effectiveTenantId || cart.length === 0) return;
    const name = checkoutForm.name.trim();
    const email = checkoutForm.email.trim();
    if (!name || !email) {
      showError("Required", "Name and email are required.");
      return;
    }
    const orderItems = cart.map((l) => ({
      stock_item_id: l.item.id,
      item_name: l.item.name,
      quantity: l.quantity,
      unit_price: l.unit_price,
      total: l.total,
      download_url: l.download_url,
    }));
    const total = cartTotal;
    if (total <= 0) {
      showError("Cart", "Cart total must be greater than 0.");
      return;
    }
    try {
      const created = await createOrder.mutateAsync({
        tenant_id: effectiveTenantId,
        customer_name: name,
        customer_email: email,
        customer_phone: checkoutForm.phone.trim() || null,
        items: orderItems,
      });
      if (paymentMethod === "pay_at_venue") {
        await completePayment.mutateAsync({ order_token: created.order_token });
        setLastOrderToken(created.order_token);
        setLastOrder({ total: created.total, items: orderItems.map((i) => ({ ...i, id: "", download_url: i.download_url ?? null })) });
        setCart([]);
        setCheckoutStep("done");
        setCartOpen(true);
        showSuccess("Order placed", "Pay when you pick up. We'll email you confirmation.");
        return;
      }
      if (paymentMethod === "stripe" && tenantPayment.stripePublishableKey) {
        setStripePaymentLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(`${supabaseUrl}/functions/v1/create-stripe-payment-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({ amount: total, currency: "usd", tenant_id: effectiveTenantId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showError("Payment", (data as { error?: string }).error ?? "Could not start payment");
          setStripePaymentLoading(false);
          return;
        }
        const clientSecret = (data as { clientSecret?: string }).clientSecret;
        if (!clientSecret) {
          setStripePaymentLoading(false);
          return;
        }
        sessionStorage.setItem(STRIPE_SHOP_PENDING_KEY, JSON.stringify({ order_token: created.order_token, total, customer_email: email, tenant_slug: tenant?.slug }));
        const returnUrl = `${window.location.origin}${tenant?.slug ? `/t/${tenant.slug}/shop` : "/shop"}?payment=stripe&redirect_status=succeeded`;
        (window as unknown as { Stripe?: { confirmPayment: (o: unknown) => Promise<unknown> } }).Stripe = undefined;
        const stripeUrl = `https://checkout.stripe.com/c/pay/${clientSecret.split("_secret_")[0]}?redirect_url=${encodeURIComponent(returnUrl)}`;
        window.location.href = stripeUrl;
      }
    } catch (e) {
      showError("Error", e instanceof Error ? e.message : "Could not create order");
    }
  };

  const stripePromise = useMemo(
    () => (tenantPayment.stripePublishableKey ? loadStripe(tenantPayment.stripePublishableKey) : null),
    [tenantPayment.stripePublishableKey]
  );
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const stripeReturnHandled = useRef(false);
  const locationSearch = location.search || "";

  useEffect(() => {
    const params = new URLSearchParams(locationSearch);
    if (params.get("payment") !== "stripe" || params.get("redirect_status") !== "succeeded" || stripeReturnHandled.current) return;
    const raw = sessionStorage.getItem(STRIPE_SHOP_PENDING_KEY);
    if (!raw) return;
    stripeReturnHandled.current = true;
    try {
      const { order_token } = JSON.parse(raw);
      completePayment.mutateAsync({ order_token }).then(() => {
        sessionStorage.removeItem(STRIPE_SHOP_PENDING_KEY);
        setLastOrderToken(order_token);
        setCart([]);
        setCheckoutStep("done");
        setCartOpen(true);
        showSuccess("Payment complete", "Thank you for your order.");
        params.delete("payment");
        params.delete("redirect_status");
        params.delete("payment_intent");
        params.delete("payment_intent_client_secret");
        const clean = params.toString() ? `?${params.toString()}` : (tenant?.slug ? `/t/${tenant.slug}/shop` : "/shop");
        window.history.replaceState(null, "", clean);
      }).catch(() => { stripeReturnHandled.current = false; });
    } catch {
      sessionStorage.removeItem(STRIPE_SHOP_PENDING_KEY);
      stripeReturnHandled.current = false;
    }
  }, [locationSearch, completePayment, showSuccess, tenant?.slug]);

  const handlePayWithCard = async () => {
    if (!effectiveTenantId || cart.length === 0) return;
    const name = checkoutForm.name.trim();
    const email = checkoutForm.email.trim();
    if (!name || !email) { showError("Required", "Name and email are required."); return; }
    const orderItems = cart.map((l) => ({
      stock_item_id: l.item.id, item_name: l.item.name, quantity: l.quantity, unit_price: l.unit_price, total: l.total, download_url: l.download_url,
    }));
    const total = cartTotal;
    if (total <= 0) return;
    try {
      const created = await createOrder.mutateAsync({
        tenant_id: effectiveTenantId, customer_name: name, customer_email: email, customer_phone: checkoutForm.phone.trim() || null, items: orderItems,
      });
      setStripePaymentLoading(true);
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ amount: total, currency: "usd", tenant_id: effectiveTenantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showError("Payment", (data as { error?: string }).error ?? "Could not start payment"); setStripePaymentLoading(false); return; }
      const clientSecret = (data as { clientSecret?: string }).clientSecret;
      if (clientSecret) {
        sessionStorage.setItem(STRIPE_SHOP_PENDING_KEY, JSON.stringify({ order_token: created.order_token, total, customer_email: email, tenant_slug: tenant?.slug }));
        setStripeClientSecret(clientSecret);
      }
    } finally {
      setStripePaymentLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero font-body">
      <div className="absolute inset-0">
        <picture>
          <source media="(max-width: 767px)" srcSet={bgMobileImage} />
          <img src={bgImage} alt="Shop" className="h-full w-full object-cover grayscale-hero" />
        </picture>
        <div className="hero-overlay absolute inset-0" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6 lg:px-12">
        <Link to={tenant?.slug ? `/t/${tenant.slug}` : "/"} className="flex items-center gap-2">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant?.name} className="h-8 sm:h-10" />
          ) : (
            <img src={iskaOSLogo} alt={tenant?.name || "Iska Service OS"} className="h-8 sm:h-10" />
          )}
        </Link>
        <nav className="hidden gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-2 font-body text-xs font-medium uppercase tracking-widest text-white md:flex">
          <Link to={tenant?.slug ? `/t/${tenant.slug}` : "/"} className="rounded-full px-4 py-2 text-white">Services</Link>
          {tenant?.slug && (
            <Link to={tenant.slug ? `/t/${tenant.slug}/reviews` : "/"} className="rounded-full px-4 py-2 text-white">Reviews</Link>
          )}
          {tenant?.slug && (
            <Link to={shopPath} className={`rounded-full px-4 py-2 ${isShopActive ? "bg-primary text-primary-foreground" : "text-white"}`}>Shop</Link>
          )}
          <a href="/account" className={`rounded-full px-4 py-2 ${location.pathname === "/account" ? "bg-primary text-primary-foreground" : "text-white"}`}>Account</a>
        </nav>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white backdrop-blur-md"
        >
          <ShoppingBag className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          )}
        </button>
        <button type="button" className="md:hidden rounded-full bg-white/10 p-2.5 text-white backdrop-blur-md" onClick={() => setMobileMenuOpen(true)} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="right" className="border-border bg-card">
            <div className="mt-6 grid grid-cols-2 gap-3 px-1">
              <Link to={tenant?.slug ? `/t/${tenant.slug}` : "/"} onClick={() => setMobileMenuOpen(false)} className="flex min-h-[100px] flex-col rounded-xl bg-primary/10 p-4 text-left transition-all hover:bg-primary/15">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold uppercase tracking-wider text-card-foreground">Services</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-card-foreground/70" />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Book now</p>
              </Link>
              {tenant?.slug && (
                <Link to={`/t/${tenant.slug}/reviews`} onClick={() => setMobileMenuOpen(false)} className="flex min-h-[100px] flex-col rounded-xl p-4 text-left transition-all bg-primary/10 hover:bg-primary/15">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold uppercase tracking-wider text-card-foreground">Reviews</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-card-foreground/70" />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Testimonials</p>
                </Link>
              )}
              {tenant?.slug && (
                <Link to={shopPath} onClick={() => setMobileMenuOpen(false)} className="flex min-h-[100px] flex-col rounded-xl p-4 text-left transition-all bg-primary text-primary-foreground">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold uppercase tracking-wider">Shop</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 opacity-80" />
                  </div>
                  <p className="mt-1 text-[11px] opacity-80">Buy & pick up</p>
                </Link>
              )}
              <div className="col-span-2 border-t border-dotted border-primary/30 py-3" aria-hidden />
              <a href="/account" onClick={() => setMobileMenuOpen(false)} className="col-span-2 flex min-h-[52px] items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-wider bg-primary/10 text-card-foreground hover:bg-primary/15">
                <span>Account</span>
                <ArrowUpRight className="h-4 w-4 shrink-0" />
              </a>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col px-4 pb-24 pt-6 sm:px-6 sm:pb-28 sm:pt-8 lg:px-8 lg:pb-32 lg:pt-10">
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="font-display text-4xl font-bold leading-tight text-hero-foreground sm:text-5xl lg:text-6xl">Shop</h1>
          <p className="mt-2 text-sm text-hero-foreground/80">Pick up in store or download</p>
        </div>

        {loading ? (
          <div className="flex flex-wrap justify-center gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 w-44 animate-pulse rounded-xl bg-white/10 backdrop-blur-md" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openProduct(p)}
                className="group flex flex-col rounded-xl bg-white/10 backdrop-blur-md p-4 text-left shadow-lg transition-all hover:scale-[1.02] hover:bg-white/15"
              >
                <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg bg-white/5">
                  {p.metadata && typeof (p.metadata as { image_url?: string }).image_url === "string" ? (
                    <img src={(p.metadata as { image_url: string }).image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingBag className="h-12 w-12 text-white/40" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-hero-foreground line-clamp-2">{p.name}</h3>
                <p className="mt-1 text-sm font-bold text-white">${Number(p.sell_price).toFixed(2)}</p>
                {(p.is_downloadable || p.download_url) && (
                  <span className="mt-1 text-[10px] uppercase text-white/70">Download</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-md rounded-xl bg-white/10 p-8 text-center backdrop-blur-md">
            <ShoppingBag className="mx-auto h-12 w-12 text-white/50" />
            <p className="mt-3 text-sm text-hero-foreground/80">No products yet. Check back soon.</p>
          </div>
        )}
      </main>

      {/* Product detail dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-md border-border bg-card p-0 overflow-hidden rounded-2xl" hideOverlay>
          {selectedProduct && (
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-card-foreground">{selectedProduct.name}</h3>
                <button type="button" onClick={() => setProductDialogOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {selectedProduct.description && (
                <p className="text-sm text-muted-foreground mb-4">{selectedProduct.description}</p>
              )}
              <p className="text-2xl font-bold text-card-foreground">${Number(selectedProduct.sell_price).toFixed(2)}</p>
              {(selectedProduct.is_downloadable || selectedProduct.download_url) && (
                <p className="text-xs text-muted-foreground mt-1">Digital download — link after payment</p>
              )}
              {!selectedProduct.is_downloadable && (
                <p className="text-xs text-muted-foreground mt-1">Pick up in store</p>
              )}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-border bg-background">
                  <button type="button" onClick={() => setProductQty((q) => Math.max(1, q - 1))} className="p-2 text-muted-foreground hover:text-foreground">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2rem] text-center text-sm font-medium">{productQty}</span>
                  <button type="button" onClick={() => setProductQty((q) => q + 1)} className="p-2 text-muted-foreground hover:text-foreground">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={addToCart}
                  className="flex-1 rounded-xl bg-primary py-2.5 px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Add to cart
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart & checkout sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full max-w-md flex flex-col border-border bg-card overflow-hidden" hideCloseButton>
          <div className="flex items-center justify-between border-b border-border pb-4 pt-1">
            <h2 className="font-display text-lg font-bold text-card-foreground">Cart</h2>
            <button type="button" onClick={() => setCartOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="h-1 w-full shrink-0 bg-muted overflow-hidden rounded-full" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{
                width: checkoutStep === "cart" ? "25%" : checkoutStep === "details" ? "50%" : checkoutStep === "payment" ? "75%" : "100%",
              }}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {checkoutStep === "done" && lastOrderToken ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-4">
                  <Check className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold text-card-foreground">Order confirmed</p>
                    <p className="text-xs text-muted-foreground">Thank you for your order.</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Order ref: {lastOrderToken.slice(0, 8)}…</p>
                {orderByToken?.items?.some((i) => i.download_url) ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-card-foreground">Downloads</p>
                    <ul className="space-y-1.5">
                      {orderByToken.items.filter((i) => i.download_url).map((i, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                          <span className="text-sm text-card-foreground truncate">{i.item_name}</span>
                          <a href={i.download_url!} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                            <Download className="h-3.5 w-3.5" /> Download
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-sm text-card-foreground">Pick up in store for physical items. {orderByToken?.items?.some((i) => i.download_url) ? "Download links above." : "We'll email you confirmation."}</p>
                <button type="button" onClick={() => { setCheckoutStep("cart"); setLastOrderToken(null); setCartOpen(false); }} className="w-full rounded-xl border border-border py-2 text-sm font-medium hover:bg-secondary">
                  Continue shopping
                </button>
              </div>
            ) : checkoutStep === "payment" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Review your order and choose payment.</p>
                <div className="rounded-xl border border-border p-4 space-y-2">
                  {cart.map((l, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-card-foreground">{l.item.name} × {l.quantity}</span>
                      <span className="font-medium">${l.total.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-2 font-bold text-card-foreground">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {tenantPayment.stripePublishableKey && (
                    stripeClientSecret && stripePromise ? (
                      <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme: "stripe" } }}>
                        <StripeShopPaymentForm
                          returnUrl={`${window.location.origin}${tenant?.slug ? `/t/${tenant.slug}/shop` : "/shop"}?payment=stripe&redirect_status=succeeded`}
                          onCancel={() => setStripeClientSecret(null)}
                        />
                      </Elements>
                    ) : (
                      <button
                        type="button"
                        disabled={stripePaymentLoading}
                        onClick={handlePayWithCard}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#635BFF] py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-70"
                      >
                        {stripePaymentLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                        {stripePaymentLoading ? "Loading…" : "Pay with Card"}
                      </button>
                    )
                  )}
                  {tenantPayment.payAtVenueEnabled && (
                    <button
                      type="button"
                      onClick={() => createOrderAndPay("pay_at_venue")}
                      className="w-full rounded-xl border border-border py-3 text-sm font-semibold hover:bg-secondary"
                    >
                      Pay at store (pick up)
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => setCheckoutStep("details")} className="text-xs text-muted-foreground underline">Back</button>
              </div>
            ) : checkoutStep === "details" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Your details</p>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Name *</label>
                  <input value={checkoutForm.name} onChange={(e) => setCheckoutForm((f) => ({ ...f, name: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Your name" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Email *</label>
                  <input type="email" value={checkoutForm.email} onChange={(e) => setCheckoutForm((f) => ({ ...f, email: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Phone (optional)</label>
                  <input type="tel" value={checkoutForm.phone} onChange={(e) => setCheckoutForm((f) => ({ ...f, phone: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="+1 234 567 8900" />
                </div>
                <button type="button" onClick={() => setCheckoutStep("payment")} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Continue to payment
                </button>
                <button type="button" onClick={() => setCheckoutStep("cart")} className="text-xs text-muted-foreground underline">Back to cart</button>
              </div>
            ) : (
              <>
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                ) : (
                  <ul className="space-y-3">
                    {cart.map((line, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-card-foreground truncate">{line.item.name}</p>
                          <p className="text-xs text-muted-foreground">${line.unit_price.toFixed(2)} × {line.quantity}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => updateCartQty(i, -1)} className="rounded p-1 text-muted-foreground hover:bg-secondary"> <Minus className="h-3.5 w-3.5" /> </button>
                          <span className="text-sm font-medium">{line.quantity}</span>
                          <button type="button" onClick={() => updateCartQty(i, 1)} className="rounded p-1 text-muted-foreground hover:bg-secondary"> <Plus className="h-3.5 w-3.5" /> </button>
                          <button type="button" onClick={() => removeFromCart(i)} className="ml-1 rounded p-1 text-destructive hover:bg-destructive/10"> <X className="h-3.5 w-3.5" /> </button>
                        </div>
                        <span className="font-semibold text-card-foreground">${line.total.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex justify-between border-t border-border pt-4 font-bold text-card-foreground">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button type="button" onClick={startCheckout} disabled={cart.length === 0} className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  Checkout
                </button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TenantShop;
