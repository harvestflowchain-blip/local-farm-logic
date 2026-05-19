import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ProductCard from '@/components/ProductCard';
import RecommendedProducts from '@/components/RecommendedProducts';
import type { Tables } from '@/integrations/supabase/types';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import Seo from '@/components/Seo';
import MarketPulse from '@/components/MarketPulse';

const Index = () => {
  const { user, role } = useAuth();
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', category: '' });

  const isFarmer = role === 'farmer';
  const isAdmin = role === 'admin';

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

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price || !user) return;
    setCreating(true);
    const { error } = await supabase.from('products').insert({
      farmer_id: user.id,
      name: newProduct.name,
      price: parseFloat(newProduct.price),
      description: newProduct.description || null,
      category: newProduct.category || null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Product listed' });
      setNewProduct({ name: '', price: '', description: '', category: '' });
      setSheetOpen(false);
      fetchProducts();
    }
    setCreating(false);
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Seo
        title="HarvestFlow — Helderberg farm-to-door produce"
        description="Browse seasonal produce from Helderberg growers in Somerset West, Strand and Stellenbosch. Order direct, always traceable, always in season."
        path="/"
      />
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">HarvestFlow</h1>
          <div className="flex items-center gap-3">
            {(isFarmer || isAdmin) && (
              <Link to="/harvest-planner" className="text-xs font-medium text-foreground hover:underline">Planner</Link>
            )}
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Helderberg</span>
          </div>
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
                <ProductCard
                  product={product}
                  isOwner={isFarmer && user?.id === product.farmer_id}
                  onDelete={handleDeleteProduct}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Farmer FAB: Add Product */}
      {isFarmer && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors">
              <Plus className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Add Product Listing</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Product Name *</Label>
                <Input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Fresh Tomatoes" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price (ZAR) *</Label>
                <Input type="number" min="0" step="0.01" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Vegetables" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" rows={3} />
              </div>
              <Button onClick={handleCreateProduct} disabled={creating || !newProduct.name || !newProduct.price} className="w-full">
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                List Product
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default Index;
