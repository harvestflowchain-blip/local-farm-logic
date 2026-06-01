import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ProductCard from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

const RecommendedProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        };

        if (user) {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          if (token) headers.Authorization = `Bearer ${token}`;
        }

        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recommend-products`, {
          method: 'POST',
          headers,
        });

        if (!resp.ok) { setHidden(true); setLoading(false); return; }

        const data = await resp.json();
        const ids: string[] = data.product_ids || [];
        if (ids.length === 0) { setHidden(true); setLoading(false); return; }

        setReasons(data.reasons || []);

        const { data: prods } = await supabase
          .from('products')
          .select('*')
          .in('id', ids)
          .eq('is_active', true);

        if (!prods || prods.length === 0) { setHidden(true); setLoading(false); return; }

        const ordered = ids.map(id => prods.find(p => p.id === id)).filter(Boolean) as Tables<'products'>[];
        setProducts(ordered);
      } catch {
        setHidden(true);
      }
      setLoading(false);
    };

    fetchRecommendations();
  }, [user]);

  if (hidden && !loading) return null;

  return (
    <section className="px-2 pt-6 pb-2">
      <div className="flex items-center gap-2 px-2 pb-3">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Picked for You</h2>
      </div>

      {loading ? (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-36">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-4 w-24 mt-2" />
              <Skeleton className="h-4 w-16 mt-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {products.map((product) => (
            <div key={product.id} className="shrink-0 w-36">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RecommendedProducts;
