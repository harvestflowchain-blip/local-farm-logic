import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import RecommendedProducts from '@/components/RecommendedProducts';
import type { Tables } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

const Index = () => {
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (err) { setError(err.message); } else { setProducts(data || []); }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">HarvestFlow</h1>
          <span className="text-xs text-muted-foreground uppercase tracking-widest">Helderberg</span>
        </div>
      </header>

      <RecommendedProducts />

      <main className="px-2 pt-4">
        {loading ? (
          <div className="columns-2 gap-2 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="break-inside-avoid space-y-2 p-2">
                <Skeleton className="w-full h-36 rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchProducts}>Retry</Button>
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
