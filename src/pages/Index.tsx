import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import type { Tables } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setProducts(data || []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">HarvestFlow</h1>
          <span className="text-xs text-muted-foreground uppercase tracking-widest">Helderberg</span>
        </div>
      </header>

      {/* Content */}
      <main className="px-2 pt-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-lg font-medium">No products yet</p>
            <p className="text-sm text-muted-foreground">Fresh produce will appear here soon.</p>
          </div>
        ) : (
          <div className="columns-2 gap-2 space-y-2">
            {products.map((product) => (
              <div key={product.id} className="break-inside-avoid">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
