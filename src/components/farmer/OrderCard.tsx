import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  products: { name: string };
}

interface OrderData {
  id: string;
  status: string;
  total: number;
  delivery_fee: number;
  delivery_suburb: string | null;
  created_at: string;
  payment_method: string | null;
  customer: { full_name: string; suburb: string | null } | null;
  order_items: OrderItem[];
}

interface OrderCardProps {
  order: OrderData;
  onStatusUpdated: () => void;
}

const STATUS_FLOW: Record<string, { next: string; label: string }> = {
  placed: { next: 'harvested', label: 'Mark Harvested' },
  harvested: { next: 'ready', label: 'Mark Ready for Pickup' },
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  placed: 'secondary',
  harvested: 'outline',
  ready: 'default',
};

const OrderCard = ({ order, onStatusUpdated }: OrderCardProps) => {
  const [updating, setUpdating] = useState(false);

  const advanceStatus = async () => {
    const flow = STATUS_FLOW[order.status];
    if (!flow) return;
    setUpdating(true);
    const { error } = await supabase.from('orders').update({ status: flow.next }).eq('id', order.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else onStatusUpdated();
    setUpdating(false);
  };

  const flow = STATUS_FLOW[order.status];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{order.customer?.full_name || 'Customer'}</p>
          <p className="text-xs text-muted-foreground">
            {order.delivery_suburb || 'No suburb'} • {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status] || 'secondary'} className="capitalize text-xs">
          {order.status}
        </Badge>
      </div>

      <div className="space-y-1">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.products.name} × {item.quantity}</span>
            <span>R{(item.price_at_purchase * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm text-muted-foreground pt-1 border-t">
          <span>Delivery</span>
          <span>R{Number(order.delivery_fee).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span>R{Number(order.total).toFixed(2)}</span>
        </div>
      </div>

      {flow && (
        <Button size="sm" onClick={advanceStatus} disabled={updating} className="w-full">
          {updating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          {flow.label}
        </Button>
      )}
    </Card>
  );
};

export default OrderCard;
export type { OrderData };
