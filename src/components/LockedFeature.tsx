import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface LockedFeatureProps {
  title: string;
  description: string;
  returnTo: string;
}

const LockedFeature = ({ title, description, returnTo }: LockedFeatureProps) => {
  const navigate = useNavigate();
  const { role } = useAuth();

  return (
    <Card className="p-6 text-center space-y-3 border-dashed">
      <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button
        size="sm"
        onClick={() => navigate(`/pricing?return_to=${encodeURIComponent(returnTo)}`)}
      >
        Upgrade to Unlock
      </Button>
    </Card>
  );
};

export default LockedFeature;
