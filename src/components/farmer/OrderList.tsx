import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import OrderCard from './OrderCard';
import type { OrderData } from './OrderCard';

const OrderList = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    // Fetch customer profiles via restricted RPC (no phone/address exposed)
    const { data: profiles } = await supabase
      .rpc('get_farmer_customers', { _farmer_id: user.id });

    const profileMap: Record<string, { full_name: string; suburb: string | null }> = {};
    (profiles || []).forEach((p) => { profileMap[p.user_id] = p; });

    const mapped: OrderData[] = data.map((o) => ({
      ...o,
      customer: profileMap[o.customer_id] || null,
      order_items: (o.order_items || []) as OrderData['order_items'],
    }));

    setOrders(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orders.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-10">No orders yet.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} onStatusUpdated={fetchOrders} />
      ))}
    </div>
  );
};

export default OrderList;
