import Seo from '@/components/Seo';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { HELDERBERG_SUBURBS, PRODUCT_CATEGORIES } from '@/lib/constants';
import { Loader2, ShoppingBag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ConsumerOnboarding = () => {
  const { user, role, loading: authLoading, onboardingCompleted, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [suburb, setSuburb] = useState('');
  const [address, setAddress] = useState('');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [deliveryPref, setDeliveryPref] = useState('delivery');
  const [saving, setSaving] = useState(false);

  if (authLoading) return null;
  if (!user || role !== 'customer') { navigate('/'); return null; }
  if (onboardingCompleted) { navigate('/', { replace: true }); return null; }

  const togglePref = (cat: string) => {
    setPreferences(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleSubmit = async () => {
    if (!suburb) {
      toast({ title: 'Required', description: 'Please select your location.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      suburb,
      address: address || null,
      produce_preferences: preferences,
      delivery_preference: deliveryPref,
      onboarding_completed: true,
    }).eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await refreshProfile();
      toast({ title: 'Welcome to HarvestFlow!' });
      navigate('/');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 bg-primary text-primary-foreground flex items-center justify-center mx-auto">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Personalize Your Experience</h1>
          <p className="text-sm text-muted-foreground">Help us recommend the best local produce for you</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Your Location *</Label>
            <Select value={suburb} onValueChange={setSuburb}>
              <SelectTrigger><SelectValue placeholder="Select suburb" /></SelectTrigger>
              <SelectContent>
                {HELDERBERG_SUBURBS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Street Address (optional)</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 12 Main Road" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">What produce interests you?</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRODUCT_CATEGORIES.map(cat => (
                <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={preferences.includes(cat)} onCheckedChange={() => togglePref(cat)} />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Preferred Fulfillment</Label>
            <Select value={deliveryPref} onValueChange={setDeliveryPref}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Start Shopping
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsumerOnboarding;
