import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { HELDERBERG_SUBURBS } from '@/lib/constants';
import { Loader2, ArrowLeft, Package, CreditCard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [suburb, setSuburb] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setSuburb(profile.suburb || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  if (!user) { navigate('/auth'); return null; }

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, suburb, address })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated' });
      setEditing(false);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Profile</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6">
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Phone</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Location</Label>
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
              <Label className="text-sm">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Name</p>
              <p className="font-medium">{profile?.full_name || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Role</p>
              <p className="font-medium capitalize">{role || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Phone</p>
              <p className="font-medium">{profile?.phone || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Location</p>
              <p className="font-medium">{profile?.suburb || '—'}</p>
            </div>
            {profile?.address && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Address</p>
                <p className="font-medium">{profile.address}</p>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          {role === 'customer' && (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/orders')}>
              <Package className="h-4 w-4" /> Order History
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/pricing')}>
            <CreditCard className="h-4 w-4" /> Plans & Pricing
          </Button>
          <Button variant="outline" className="w-full text-destructive" onClick={async () => { await signOut(); navigate('/'); }}>
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Profile;
