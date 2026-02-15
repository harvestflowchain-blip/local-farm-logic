import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) { navigate('/auth'); return null; }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">Checkout</h1>
        </div>
      </header>
      <main className="px-4 pt-8 text-center text-muted-foreground">
        <p>Checkout with delivery calculator — coming in Phase 2</p>
      </main>
    </div>
  );
};

export default Checkout;
