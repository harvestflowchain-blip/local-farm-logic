import type { DeliveryResult } from '@/lib/delivery';

interface FarmerGroup {
  farmerId: string;
  farmerName: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  delivery: DeliveryResult;
}

interface OrderSummaryProps {
  farmerGroups: FarmerGroup[];
}

const OrderSummary = ({ farmerGroups }: OrderSummaryProps) => {
  const grandTotal = farmerGroups.reduce((sum, g) => sum + g.subtotal + (g.delivery.fee ?? 0), 0);
  const hasUnavailable = farmerGroups.some((g) => g.delivery.fee === null);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Order Summary</h2>

      {farmerGroups.map((group) => (
        <div key={group.farmerId} className="border-b pb-3 space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{group.farmerName}</p>
          {group.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.name} × {item.quantity}</span>
              <span>R{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery</span>
            <span className={group.delivery.fee === null ? 'text-destructive font-medium' : ''}>
              {group.delivery.label}
            </span>
          </div>
        </div>
      ))}

      <div className="flex justify-between font-semibold text-base pt-2">
        <span>Total</span>
        <span>{hasUnavailable ? '—' : `R${grandTotal.toFixed(2)}`}</span>
      </div>

      {hasUnavailable && (
        <p className="text-xs text-destructive">
          Some items cannot be delivered to your suburb. Remove them or choose a closer suburb.
        </p>
      )}
    </div>
  );
};

export default OrderSummary;
export type { FarmerGroup };
