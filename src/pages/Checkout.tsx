import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { calculateDeliveryFee } from '@/lib/delivery';
import DeliveryCalculator from '@/components/checkout/DeliveryCalculator';
import OrderSummary, { type FarmerGroup } from '@/components/checkout/OrderSummary';
import PaymentSelector from '@/components/checkout/PaymentSelector';
import LogisticsSelector from '@/components/checkout/LogisticsSelector';
import AIFeeSuggestion from '@/components/checkout/AIFeeSuggestion';
import type { Tables } from '@/integrations/supabase/types';

type CartItemWithProduct = Tables<'cart_items'> & { products: Tables<'products'> };

const Checkout = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [farmerProfiles, setFarmerProfiles] = useState<Record<string, Tables<'profiles'>>>({});
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const [suburb, setSuburb] = useState(profile?.suburb || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [paymentMethod, setPaymentMethod] = useState('payfast');
  const [logisticsProvider, setLogisticsProvider] = useState('standard');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
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

  const farmerGroups: FarmerGroup[] = (() => {
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
  const canPlace = suburb && items.length > 0 && !hasUnavailable;
  const totalDistance = farmerGroups.reduce((s, g) => s + g.delivery.distanceKm, 0) / Math.max(farmerGroups.length, 1);
  const avgFee = farmerGroups.length > 0 ? farmerGroups.reduce((s, g) => s + (g.delivery.fee ?? 0), 0) / farmerGroups.length : 0;
  const orderTotal = farmerGroups.reduce((s, g) => s + g.subtotal, 0);

  const placeOrder = async () => {
    if (!user || !canPlace) return;
    setPlacing(true);
    try {
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

  if (placed) {
    return (
      <div className="min-h-screen pb-20 flex flex-col items-center justify-center px-4 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h1 className="text-xl font-bold tracking-tight">Order Placed!</h1>
        <p className="text-sm text-muted-foreground">Your order has been sent to the farmer(s). You'll be notified when it's ready.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Back to Shop</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Checkout</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-muted-foreground">Your cart is empty</p>
            <Button variant="outline" onClick={() => navigate('/')}>Browse Products</Button>
          </div>
        ) : (
          <>
            <DeliveryCalculator suburb={suburb} address={address} onSuburbChange={setSuburb} onAddressChange={setAddress} />

            {hasUnavailable && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                <p className="text-sm font-medium text-destructive">Delivery unavailable beyond 15km</p>
                <p className="text-xs text-muted-foreground">Some farms are too far for delivery. Consider pickup or choose a closer suburb.</p>
              </div>
            )}

            <OrderSummary farmerGroups={farmerGroups} />

            {suburb && totalDistance > 0 && (
              <AIFeeSuggestion distanceKm={totalDistance} currentFee={avgFee} orderTotal={orderTotal} />
            )}

            <LogisticsSelector selected={logisticsProvider} onSelect={setLogisticsProvider} />

            <PaymentSelector method={paymentMethod} onChange={setPaymentMethod} />

            <Button className="w-full" onClick={placeOrder} disabled={!canPlace || placing}>
              {placing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Place Order
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default Checkout;
