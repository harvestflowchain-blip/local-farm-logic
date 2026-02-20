import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { HELDERBERG_SUBURBS } from '@/lib/constants';
import { Loader2, Sprout } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const FarmerOnboarding = () => {
  const { user, role, loading: authLoading, onboardingCompleted, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [farmName, setFarmName] = useState('');
  const [suburb, setSuburb] = useState('');
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [operatingDays, setOperatingDays] = useState<string[]>([]);
  const [deliveryRadius, setDeliveryRadius] = useState('15');
  const [saving, setSaving] = useState(false);

  if (authLoading) return null;
  if (!user || role !== 'farmer') { navigate('/'); return null; }
  if (onboardingCompleted) { navigate('/dashboard', { replace: true }); return null; }

  const toggleDay = (day: string) => {
    setOperatingDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = async () => {
    if (!farmName || !suburb) {
      toast({ title: 'Required', description: 'Please fill in farm name and location.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      farm_name: farmName,
      suburb,
      delivery_enabled: deliveryEnabled,
      pickup_enabled: pickupEnabled,
      operating_days: operatingDays,
      delivery_radius_km: Math.min(parseFloat(deliveryRadius) || 15, 15),
      onboarding_completed: true,
    }).eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await refreshProfile();
      toast({ title: 'Farm setup complete!' });
      navigate('/dashboard');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 bg-primary text-primary-foreground flex items-center justify-center mx-auto">
            <Sprout className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set Up Your Farm</h1>
          <p className="text-sm text-muted-foreground">Tell us about your farm so customers can find you</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Farm Name *</Label>
            <Input value={farmName} onChange={e => setFarmName(e.target.value)} placeholder="e.g. Sunny Valley Farm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Location *</Label>
            <Select value={suburb} onValueChange={setSuburb}>
              <SelectTrigger><SelectValue placeholder="Select suburb" /></SelectTrigger>
              <SelectContent>
                {HELDERBERG_SUBURBS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm">Fulfillment Options</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm">Delivery</span>
              <Switch checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pickup</span>
              <Switch checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
            </div>
          </div>

          {deliveryEnabled && (
            <div className="space-y-1.5">
              <Label className="text-sm">Delivery Radius (max 15km)</Label>
              <Input type="number" value={deliveryRadius} onChange={e => setDeliveryRadius(e.target.value)} max={15} min={1} />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Operating Days</Label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.map(day => (
                <label key={day} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={operatingDays.includes(day)} onCheckedChange={() => toggleDay(day)} />
                  {day}
                </label>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Complete Setup & Add Products
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FarmerOnboarding;
