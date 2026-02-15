import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

interface ProductCardProps {
  product: Tables<'products'>;
}

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Link to={`/product/${product.id}`} className="block">
      <Card className="overflow-hidden border-0 shadow-none group">
        <div className="aspect-[3/4] bg-secondary overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
        </div>
        <div className="py-3 space-y-1">
          <h3 className="font-medium text-sm tracking-tight leading-tight">{product.name}</h3>
          <p className="text-sm font-semibold">R{Number(product.price).toFixed(2)}</p>
          {product.category && (
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{product.category}</p>
          )}
        </div>
      </Card>
    </Link>
  );
};

export default ProductCard;
