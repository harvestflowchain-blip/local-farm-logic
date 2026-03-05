import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { HELDERBERG_SUBURBS } from '@/lib/constants';
import { Loader2, ArrowLeft, Save, User, MapPin, Phone, Mail, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const Settings = () => {
  const { user, profile, role, signOut, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [suburb, setSuburb] = useState('');
  const [address, setAddress] = useState('');
  const [farmName, setFarmName] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setSuburb(profile.suburb || '');
      setAddress(profile.address || '');
      setFarmName(profile.farm_name || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const updates: Record<string, any> = { full_name: fullName, phone, suburb, address };
    if (role === 'farmer') updates.farm_name = farmName;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved', description: 'Your profile has been updated.' });
      await refreshProfile();
    }
    setSaving(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center gap-3 px-4 py-4">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-24" />
          </div>
        </header>
        <main className="px-4 pt-6 space-y-4 max-w-lg mx-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6 max-w-lg mx-auto">
        {/* Account info */}
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span className="capitalize">{role || 'User'}</span>
          </div>
        </Card>

        {/* Editable fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Display Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>

          {role === 'farmer' && (
            <div className="space-y-1.5">
              <Label className="text-sm">Farm Name</Label>
              <Input value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="Your farm name" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Phone</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Preferred Suburb</Label>
            <Select value={suburb} onValueChange={setSuburb}>
              <SelectTrigger><SelectValue placeholder="Select suburb" /></SelectTrigger>
              <SelectContent>
                {HELDERBERG_SUBURBS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Street Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Main Road" />
          </div>
        </div>

        <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>

        <div className="border-t pt-4 space-y-2">
          <Button variant="outline" className="w-full" onClick={() => navigate('/pricing')}>
            Plans & Pricing
          </Button>
          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={async () => { await signOut(); navigate('/'); }}>
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Settings;
