import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  if (role !== 'admin') { navigate('/'); return null; }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">Admin</h1>
        </div>
      </header>
      <main className="px-4 pt-8 text-center text-muted-foreground">
        <p>Analytics & logistics — coming in Phase 4-5</p>
      </main>
    </div>
  );
};

export default AdminDashboard;
