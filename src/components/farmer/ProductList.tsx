import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ProductForm from './ProductForm';
import type { Tables } from '@/integrations/supabase/types';

const ProductList = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<'products'> | null>(null);

  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [user]);

  const toggleActive = async (product: Tables<'products'>) => {
    await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id);
    fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else fetchProducts();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No products yet. Add your first product above.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <Card key={p.id} className={`flex gap-3 p-3 ${!p.is_active ? 'opacity-50' : ''}`}>
              <div className="h-16 w-14 bg-secondary shrink-0 overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} width={96} height={96} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">—</div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-sm font-semibold">R{Number(p.price).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Stock: {p.stock_quantity}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => toggleActive(p)} className="p-1.5 hover:bg-secondary rounded">
                  {p.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => { setEditing(p); setFormOpen(true); }} className="p-1.5 hover:bg-secondary rounded">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteProduct(p.id)} className="p-1.5 hover:bg-secondary rounded text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchProducts}
        product={editing}
      />
    </div>
  );
};

export default ProductList;
