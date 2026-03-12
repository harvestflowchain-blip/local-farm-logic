import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';
import { Pencil, Trash2 } from 'lucide-react';

interface ProductCardProps {
  product: Tables<'products'>;
  isOwner?: boolean;
  onDelete?: (id: string) => void;
}

const ProductCard = ({ product, isOwner, onDelete }: ProductCardProps) => {
  return (
    <div className="relative">
      {isOwner && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Link
            to={`/product/${product.id}`}
            className="h-7 w-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          <button
            className="h-7 w-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(product.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
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
    </div>
  );
};

export default ProductCard;
