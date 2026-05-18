import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const AccessError = () => {
  const { signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleRetry = async () => {
    await refreshProfile();
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center space-y-4">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <h1 className="text-xl font-bold">Access Issue</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        Your account role could not be determined. This may be a temporary issue.
        Try again or sign out and back in.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleRetry}>Retry</Button>
        <Button variant="destructive" onClick={() => signOut()}>Sign Out</Button>
      </div>
    </div>
  );
};

export default AccessError;
