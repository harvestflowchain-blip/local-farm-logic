import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) { navigate('/auth'); return null; }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">Profile</h1>
        </div>
      </header>
      <main className="px-4 pt-6 space-y-6">
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
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Location</p>
          <p className="font-medium">{profile?.suburb || '—'}</p>
        </div>
        <Button variant="outline" className="w-full" onClick={async () => { await signOut(); navigate('/'); }}>
          Sign Out
        </Button>
      </main>
    </div>
  );
};

export default Profile;
