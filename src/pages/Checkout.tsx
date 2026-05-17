import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, CheckCircle2, CreditCard, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { calculateDeliveryFee } from '@/lib/delivery';
import DeliveryCalculator from '@/components/checkout/DeliveryCalculator';
import Seo from '@/components/Seo';
import OrderSummary, { type FarmerGroup } from '@/components/checkout/OrderSummary';
import PaymentSelector from '@/components/checkout/PaymentSelector';
import LogisticsSelector from '@/components/checkout/LogisticsSelector';
import AIFeeSuggestion from '@/components/checkout/AIFeeSuggestion';
import type { Tables } from '@/integrations/supabase/types';

type CartItemWithProduct = Tables<'cart_items'> & { products: Tables<'products'> };

const PLAN_LABELS: Record<string, string> = {
  plus: 'Plus', family: 'Family', growth: 'Growth', pro: 'Pro',
};

const PLAN_MONTHLY_PRICES_USD: Record<string, number> = {
  plus: 2.99, family: 5.99, growth: 8.99, pro: 20.99,
};

const PLAN_MONTHLY_PRICES_ZAR: Record<string, number> = {
  plus: 49, family: 99, growth: 149, pro: 349,
};

const PERIOD_MULTIPLIER: Record<string, number> = { monthly: 1, quarterly: 2.7, yearly: 9.6 };
const PERIOD_LABELS: Record<string, string> = { monthly: '/month', quarterly: '/quarter', yearly: '/year' };

function getUpgradeZar(plan: string, period: string): number {
  const monthly = PLAN_MONTHLY_PRICES_ZAR[plan] || 0;
  return Math.round(monthly * (PERIOD_MULTIPLIER[period] || 1));
}

function getUpgradeUsd(plan: string, period: string): number {
  const monthly = PLAN_MONTHLY_PRICES_USD[plan] || 0;
  return Math.round(monthly * (PERIOD_MULTIPLIER[period] || 1) * 100) / 100;
}

const Checkout = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const upgradePlan = searchParams.get('plan');
  const upgradePeriod = searchParams.get('period') || 'monthly';
  const returnTo = searchParams.get('return_to');
  const isUpgradeFlow = !!upgradePlan && upgradePlan !== 'free';

  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [farmerProfiles, setFarmerProfiles] = useState<Record<string, Tables<'profiles'>>>({});
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const [suburb, setSuburb] = useState(profile?.suburb || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [logisticsProvider, setLogisticsProvider] = useState('standard');

  // Server-side distance validation
  const [validatingDelivery, setValidatingDelivery] = useState(false);
  const [deliveryBlocked, setDeliveryBlocked] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // PayPal upgrade state
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [upgradeComplete, setUpgradeComplete] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isUpgradeFlow) { setLoading(false); return; }
    const load = async () => {
      const { data: cartData } = await supabase
        .from('cart_items')
        .select('*, products(*)')
        .eq('user_id', user.id);
      const cartItems = (cartData as CartItemWithProduct[]) || [];
      setItems(cartItems);

      const farmerIds = [...new Set(cartItems.map((i) => i.products.farmer_id))];
      if (farmerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', farmerIds);
        const map: Record<string, Tables<'profiles'>> = {};
        (profiles || []).forEach((p) => { map[p.user_id] = p; });
        setFarmerProfiles(map);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (profile?.suburb && !suburb) setSuburb(profile.suburb);
    if (profile?.address && !address) setAddress(profile.address);
  }, [profile]);

  // Server-side delivery validation when suburb changes
  useEffect(() => {
    if (!suburb || isUpgradeFlow || items.length === 0) {
      setDeliveryBlocked(false);
      setDeliveryError(null);
      return;
    }

    const validate = async () => {
      setValidatingDelivery(true);
      try {
        const { data, error } = await supabase.functions.invoke('validate-delivery', {
          body: { suburb },
        });
        if (error || !data) {
          setDeliveryBlocked(true);
          setDeliveryError('Unable to validate delivery distance');
        } else if (!data.valid) {
          setDeliveryBlocked(true);
          setDeliveryError(data.error || 'Delivery unavailable beyond 15km');
        } else {
          setDeliveryBlocked(false);
          setDeliveryError(null);
        }
      } catch {
        setDeliveryBlocked(true);
        setDeliveryError('Unable to validate delivery');
      }
      setValidatingDelivery(false);
    };
    validate();
  }, [suburb, items.length]);

  // PayPal upgrade handler
  const handlePayPalUpgrade = async () => {
    if (!user || !upgradePlan) return;
    setPaypalLoading(true);
    try {
      const { data: orderData, error: createErr } = await supabase.functions.invoke('paypal-create-order', {
        body: { plan: upgradePlan, period: upgradePeriod },
      });
      if (createErr || !orderData?.id) throw new Error(createErr?.message || 'Failed to create order');

      const approvalUrl = `https://www.paypal.com/checkoutnow?token=${orderData.id}`;
      window.open(approvalUrl, 'paypal', 'width=500,height=700');

      toast({ title: 'PayPal', description: 'Complete payment in the PayPal window. Once done, click "Confirm Payment" below.' });
      setPaypalOrderId(orderData.id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setPaypalLoading(false);
  };

  const capturePayPalOrder = async () => {
    if (!paypalOrderId || !upgradePlan) return;
    setPaypalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('paypal-capture-order', {
        body: { orderId: paypalOrderId, plan: upgradePlan, period: upgradePeriod },
      });
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Capture failed');
      setUpgradeComplete(true);
      toast({ title: 'Upgrade successful!', description: `You are now on the ${PLAN_LABELS[upgradePlan] || upgradePlan} plan.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setPaypalLoading(false);
  };

  // Cart checkout groups
  const farmerGroups: FarmerGroup[] = (() => {
    if (isUpgradeFlow) return [];
    const grouped: Record<string, { items: CartItemWithProduct[]; farmerSuburb: string; farmerName: string }> = {};
    items.forEach((item) => {
      const fid = item.products.farmer_id;
      if (!grouped[fid]) {
        const fp = farmerProfiles[fid];
        grouped[fid] = { items: [], farmerSuburb: fp?.suburb || '', farmerName: fp?.full_name || 'Farmer' };
      }
      grouped[fid].items.push(item);
    });
    return Object.entries(grouped).map(([farmerId, g]) => {
      const subtotal = g.items.reduce((s, i) => s + Number(i.products.price) * i.quantity, 0);
      const delivery = suburb ? calculateDeliveryFee(suburb, g.farmerSuburb) : { distanceKm: 0, fee: null, label: 'Select suburb' };
      return {
        farmerId, farmerName: g.farmerName,
        items: g.items.map((i) => ({ name: i.products.name, quantity: i.quantity, price: Number(i.products.price) })),
        subtotal, delivery,
      };
    });
  })();

  const hasUnavailable = farmerGroups.some((g) => g.delivery.fee === null && suburb);
  const canPlace = suburb && items.length > 0 && !hasUnavailable && !deliveryBlocked && !validatingDelivery;
  const totalDistance = farmerGroups.reduce((s, g) => s + g.delivery.distanceKm, 0) / Math.max(farmerGroups.length, 1);
  const avgFee = farmerGroups.length > 0 ? farmerGroups.reduce((s, g) => s + (g.delivery.fee ?? 0), 0) / farmerGroups.length : 0;
  const orderTotal = farmerGroups.reduce((s, g) => s + g.subtotal, 0);

  const placeOrder = async () => {
    if (!user || !canPlace) return;
    setPlacing(true);
    try {
      // Final server-side distance check before order
      const { data: validation } = await supabase.functions.invoke('validate-delivery', {
        body: { suburb },
      });
      if (!validation?.valid) {
        toast({ title: 'Delivery blocked', description: validation?.error || 'Delivery unavailable beyond 15km', variant: 'destructive' });
        setDeliveryBlocked(true);
        setPlacing(false);
        return;
      }

      for (const group of farmerGroups) {
        const total = group.subtotal + (group.delivery.fee ?? 0);
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({
            customer_id: user.id, farmer_id: group.farmerId,
            delivery_suburb: suburb, delivery_address: address || null,
            delivery_fee: group.delivery.fee ?? 0, total,
            payment_method: paymentMethod, status: 'placed',
          })
          .select('id').single();
        if (orderErr) throw orderErr;
        const orderItems = group.items.map((item) => {
          const cartItem = items.find((ci) => ci.products.name === item.name && ci.products.farmer_id === group.farmerId)!;
          return { order_id: order.id, product_id: cartItem.product_id, quantity: item.quantity, price_at_purchase: item.price };
        });
        const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
        if (itemsErr) throw itemsErr;
      }
      await supabase.from('cart_items').delete().eq('user_id', user.id);
      setPlaced(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setPlacing(false);
    }
  };

  if (!user) return null;

  if (upgradeComplete) {
    return (
      <div className="min-h-screen pb-20 flex flex-col items-center justify-center px-4 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Upgrade Complete!</h1>
        <p className="text-sm text-muted-foreground">You're now on the {PLAN_LABELS[upgradePlan!] || upgradePlan} plan.</p>
        <Button variant="outline" onClick={() => navigate(returnTo || '/')}>Continue</Button>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="min-h-screen pb-20 flex flex-col items-center justify-center px-4 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Order Placed!</h1>
        <p className="text-sm text-muted-foreground">Your order has been sent to the farmer(s).</p>
        <Button variant="outline" onClick={() => navigate('/')}>Back to Shop</Button>
      </div>
    );
  }

  // Upgrade flow UI
  if (isUpgradeFlow) {
    return (
      <div className="min-h-screen pb-24 overflow-x-hidden">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center gap-3 px-4 py-4">
            <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="text-xl font-bold tracking-tight">Checkout</h1>
          </div>
        </header>
        <main className="px-4 pt-6 space-y-6 max-w-lg mx-auto w-full">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold tracking-tight">Plan Upgrade</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{PLAN_LABELS[upgradePlan!] || upgradePlan}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Billing</span>
                <span className="font-medium capitalize">{upgradePeriod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount (ZAR)</span>
                <span className="font-bold text-base">R{getUpgradeZar(upgradePlan!, upgradePeriod)}{PERIOD_LABELS[upgradePeriod] || ''}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Charged as ~${getUpgradeUsd(upgradePlan!, upgradePeriod).toFixed(2)} USD via PayPal · final amount subject to PayPal's daily conversion rate
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <span className="font-medium">PayPal</span>
              </div>
            </div>
          </Card>

          <PaymentSelector method={paymentMethod} onChange={setPaymentMethod} />

          {!paypalOrderId ? (
            <Button className="w-full" onClick={handlePayPalUpgrade} disabled={paypalLoading}>
              {paypalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pay with PayPal
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Complete payment in the PayPal window, then click below.
              </p>
              <Button className="w-full" onClick={capturePayPalOrder} disabled={paypalLoading}>
                {paypalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Payment
              </Button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Standard cart checkout
  return (
    <div className="min-h-screen pb-24 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Checkout</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-8 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-muted-foreground">Your cart is empty</p>
            <Button variant="outline" onClick={() => navigate('/')}>Browse Products</Button>
          </div>
        ) : (
          <>
            <DeliveryCalculator suburb={suburb} address={address} onSuburbChange={setSuburb} onAddressChange={setAddress} />

            {validatingDelivery && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Validating delivery distance...</span>
              </div>
            )}

            {(deliveryBlocked || hasUnavailable) && !validatingDelivery && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 space-y-1 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    {deliveryError || 'Delivery unavailable beyond 15km'}
                  </p>
                  <p className="text-xs text-muted-foreground">Choose a closer suburb or consider pickup.</p>
                </div>
              </div>
            )}

            <OrderSummary farmerGroups={farmerGroups} />

            {suburb && totalDistance > 0 && !deliveryBlocked && (
              <AIFeeSuggestion distanceKm={totalDistance} currentFee={avgFee} orderTotal={orderTotal} />
            )}

            <LogisticsSelector selected={logisticsProvider} onSelect={setLogisticsProvider} />
            <PaymentSelector method={paymentMethod} onChange={setPaymentMethod} />

            <Button className="w-full" onClick={placeOrder} disabled={!canPlace || placing}>
              {placing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {deliveryBlocked ? 'Delivery Blocked' : 'Place Order'}
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default Checkout;
