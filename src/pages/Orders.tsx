import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Package, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';
import Seo from '@/components/Seo';

interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  products: { name: string };
}

interface OrderWithItems extends Tables<'orders'> {
  order_items: OrderItem[];
  farmer_profile?: { full_name: string; suburb: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  harvested: 'Harvested',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  'out-for-delivery': 'Out for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  placed: 'secondary',
  confirmed: 'secondary',
  harvested: 'outline',
  preparing: 'outline',
  ready: 'default',
  'out-for-delivery': 'default',
  completed: 'default',
  cancelled: 'destructive',
};

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }

    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name))')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (!data) { setLoading(false); return; }

      // Fetch farmer profiles
      const farmerIds = [...new Set(data.map((o) => o.farmer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, suburb')
        .in('user_id', farmerIds);

      const profileMap: Record<string, { full_name: string; suburb: string | null }> = {};
      (profiles || []).forEach((p) => { profileMap[p.user_id] = p; });

      const mapped: OrderWithItems[] = data.map((o) => ({
        ...o,
        order_items: (o.order_items || []) as OrderItem[],
        farmer_profile: profileMap[o.farmer_id] || null,
      }));

      setOrders(mapped);
      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20">
      <Seo
        title="Your orders — HarvestFlow"
        description="Track your past and current HarvestFlow orders from Helderberg farms."
        path="/orders"
      />
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Order History</h1>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="flex justify-between"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-16" /></div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Package className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-lg font-medium">No orders yet</p>
            <p className="text-sm text-muted-foreground">Your order history will appear here after your first purchase.</p>
            <Button variant="outline" onClick={() => navigate('/')}>Browse Products</Button>
          </div>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{order.farmer_profile?.full_name || 'Farm'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[order.status] || 'secondary'} className="text-xs">
                  {STATUS_LABELS[order.status] || order.status}
                </Badge>
              </div>

              <div className="space-y-1">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.products.name} × {item.quantity}</span>
                    <span>R{(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {Number(order.delivery_fee) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground pt-1 border-t">
                    <span>Delivery</span>
                    <span>R{Number(order.delivery_fee).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                  <span>Total</span>
                  <span>R{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default Orders;
