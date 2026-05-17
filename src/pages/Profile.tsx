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
import { Loader2, ArrowLeft, Save, User, MapPin, Phone, Mail, Shield, Package, CreditCard, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Seo from '@/components/Seo';
import { Skeleton } from '@/components/ui/skeleton';
import LockedFeature from '@/components/LockedFeature';

const SWITCHABLE_ROLES = [
  { value: 'customer', label: 'Consumer' },
  { value: 'farmer', label: 'Farmer' },
] as const;

const Profile = () => {
  const { user, profile, role, signOut, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [suburb, setSuburb] = useState('');
  const [address, setAddress] = useState('');
  const [farmName, setFarmName] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');

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
    if (role) setSelectedRole(role);
  }, [role]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Update profile fields
      const updates: Record<string, any> = { full_name: fullName, phone, suburb, address };
      if (selectedRole === 'farmer' || role === 'farmer') updates.farm_name = farmName;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Switch role if changed (non-admin only) via secure DB function
      if (role !== 'admin' && selectedRole && selectedRole !== role) {
        const { error: roleErr } = await supabase.rpc('switch_my_role', {
          _new_role: selectedRole as any,
        });
        if (roleErr) throw roleErr;
      }

      await refreshProfile();
      toast({ title: 'Profile saved', description: 'Your changes have been applied.' });

      // Redirect to correct dashboard after role switch
      if (role !== 'admin' && selectedRole && selectedRole !== role) {
        if (selectedRole === 'farmer') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </main>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Profile & Settings</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6 max-w-lg mx-auto w-full">
        {/* Account info (read-only) */}
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

          {/* Role selector — non-admin only */}
          {!isAdmin && (
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />I am a</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SWITCHABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole !== role && (
                <p className="text-xs text-amber-600 dark:text-amber-400">Switching role will redirect you to the appropriate dashboard.</p>
              )}
            </div>
          )}

          {/* Farm name — visible when farmer selected */}
          {(selectedRole === 'farmer' || role === 'farmer') && (
            <div className="space-y-1.5">
              <Label className="text-sm">Farm Name</Label>
              <Input value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="Your farm name" />
            </div>
          )}
        </div>

        <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>

        {/* Quick links */}
        <div className="border-t pt-4 space-y-2">
          {(role === 'customer' || selectedRole === 'customer') && (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/orders')}>
              <Package className="h-4 w-4" /> Order History
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/calendar')}>
            <Calendar className="h-4 w-4" /> Calendar & Schedule
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/pricing')}>
            <CreditCard className="h-4 w-4" /> Plans & Pricing
          </Button>
          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={async () => { await signOut(); navigate('/'); }}>
            Sign Out
          </Button>
        </div>

        {/* Locked premium features */}
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Premium Features</p>
          {role === 'customer' && (
            <LockedFeature
              title="Order Analytics"
              description="See spending insights, top categories, and purchase trends."
              returnTo="/profile"
            />
          )}
          {role === 'farmer' && (
            <LockedFeature
              title="Advanced Farm Analytics"
              description="Revenue trends, customer insights, and seasonal forecasts."
              returnTo="/profile"
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
