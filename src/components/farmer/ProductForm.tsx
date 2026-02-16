import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  product?: Tables<'products'> | null;
}

const ProductForm = ({ open, onClose, onSaved, product }: ProductFormProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [weightKg, setWeightKg] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setPrice(String(product.price));
      setCategory(product.category || '');
      setStockQuantity(String(product.stock_quantity));
      setWeightKg(product.weight_kg ? String(product.weight_kg) : '');
      setImageUrl(product.image_url);
    } else {
      setName(''); setDescription(''); setPrice(''); setCategory('');
      setStockQuantity('0'); setWeightKg(''); setImageUrl(null);
    }
  }, [product, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    setImageUrl(urlData.publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user || !name || !price) return;
    setSaving(true);

    const payload = {
      name,
      description: description || null,
      price: parseFloat(price),
      category: category || null,
      stock_quantity: parseInt(stockQuantity) || 0,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      image_url: imageUrl,
      farmer_id: user.id,
    };

    let error;
    if (product) {
      ({ error } = await supabase.from('products').update(payload).eq('id', product.id));
    } else {
      ({ error } = await supabase.from('products').insert(payload));
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: product ? 'Product updated' : 'Product created' });
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fresh Tomatoes" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Price (ZAR) *</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Stock</Label>
              <Input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Weight (kg)</Label>
              <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="0.0" min="0" step="0.1" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Photo</Label>
            {imageUrl && (
              <div className="h-32 w-full bg-secondary overflow-hidden mb-2">
                <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
              </div>
            )}
            <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
            {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
          </div>

          <Button onClick={handleSave} disabled={saving || !name || !price} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {product ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;
