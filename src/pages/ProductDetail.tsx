import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Seo from '@/components/Seo';
import type { Tables } from '@/integrations/supabase/types';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Tables<'products'> | null>(null);
  const [farmer, setFarmer] = useState<Tables<'profiles'> | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data } = await supabase.from('products').select('*').eq('id', id).single();
      if (data) {
        setProduct(data);
        // Log interaction
        if (user) {
          supabase.from('interactions').insert({ user_id: user.id, product_id: data.id, interaction_type: 'view' });
        }
        // Fetch farmer profile
        const { data: farmerData } = await supabase.from('profiles').select('*').eq('user_id', data.farmer_id).single();
        setFarmer(farmerData);
      }
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const addToCart = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!product) return;
    const { error } = await supabase.from('cart_items').upsert(
      { user_id: user.id, product_id: product.id, quantity: 1 },
      { onConflict: 'user_id,product_id' }
    );
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Added to cart' });
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Loading...</span></div>;
  if (!product) return <div className="flex min-h-screen items-center justify-center"><span>Product not found</span></div>;

  const seoDesc = (product.description || `Fresh ${product.name} from a local Helderberg farm. R${Number(product.price).toFixed(2)}.`).slice(0, 160);
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: seoDesc,
    image: product.image_url || undefined,
    offers: {
      '@type': 'Offer',
      price: Number(product.price).toFixed(2),
      priceCurrency: 'ZAR',
      availability: product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="min-h-screen pb-20">
      <Seo
        title={`${product.name} — HarvestFlow`}
        description={seoDesc}
        path={`/product/${product.id}`}
        ogType="product"
        image={product.image_url || undefined}
        jsonLd={productLd}
      />
      <button onClick={() => navigate(-1)} className="fixed top-4 left-4 z-50 p-2 bg-background/80 backdrop-blur rounded-full">
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="aspect-[3/4] bg-secondary w-full">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} width={800} height={800} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
        )}
      </div>

      <div className="px-4 py-6 space-y-4">
        <div className="space-y-1">
          {product.category && <p className="text-xs text-muted-foreground uppercase tracking-widest">{product.category}</p>}
          <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-xl font-semibold">R{Number(product.price).toFixed(2)}</p>
        </div>

        {product.description && <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}</span>
          {product.weight_kg && <span>· {Number(product.weight_kg)}kg</span>}
        </div>

        {farmer && (
          <div className="border-t pt-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Grown by</p>
            <p className="font-medium text-sm">{farmer.full_name}</p>
            {farmer.suburb && <p className="text-xs text-muted-foreground">{farmer.suburb}</p>}
          </div>
        )}

        <Button onClick={addToCart} className="w-full" disabled={product.stock_quantity <= 0}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </div>
    </div>
  );
};

export default ProductDetail;
