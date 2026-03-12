import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface RoleGuardProps {
  allowed: AppRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

export function RoleGuard({ allowed, children, redirectTo = '/' }: RoleGuardProps) {
  const { role, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role not yet assigned — redirect to access-error to avoid infinite loops
  if (!role) {
    return <Navigate to="/access-error" replace />;
  }

  if (!allowed.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
