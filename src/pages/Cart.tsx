import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type CartItemWithProduct = Tables<'cart_items'> & { products: Tables<'products'> };

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', user.id);
    setItems((data as CartItemWithProduct[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCart(); }, [user]);

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) {
      await supabase.from('cart_items').delete().eq('id', id);
    } else {
      await supabase.from('cart_items').update({ quantity: qty }).eq('id', id);
    }
    fetchCart();
  };

  const total = items.reduce((sum, i) => sum + Number(i.products.price) * i.quantity, 0);

  if (!user) { navigate('/auth'); return null; }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">Cart</h1>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {loading ? (
          <p className="text-center text-muted-foreground py-10">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Your cart is empty</p>
        ) : (
          <>
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 border-b pb-4">
                <div className="h-20 w-16 bg-secondary shrink-0 overflow-hidden">
                  {item.products.image_url && (
                    <img src={item.products.image_url} alt={item.products.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate">{item.products.name}</p>
                  <p className="text-sm font-semibold">R{Number(item.products.price).toFixed(2)}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} className="p-1">
                      {item.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    </button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)} className="p-1">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">R{total.toFixed(2)}</span>
              </div>
              <Button className="w-full" onClick={() => navigate('/checkout')}>
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Cart;
