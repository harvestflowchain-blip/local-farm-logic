import { Home, ShoppingCart, User, BarChart3, Sprout, Package, Calendar } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const BottomNav = () => {
  const { pathname } = useLocation();
  const { user, role } = useAuth();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    ...(role === 'customer' ? [{ to: '/orders', icon: Package, label: 'Orders', auth: true }] : []),
    { to: '/cart', icon: ShoppingCart, label: 'Cart', auth: true },
    ...(role === 'farmer' ? [{ to: '/dashboard', icon: Sprout, label: 'Farm', auth: true }] : []),
    ...(role === 'admin' ? [{ to: '/admin', icon: BarChart3, label: 'Admin', auth: true }] : []),
    ...(user ? [{ to: '/calendar', icon: Calendar, label: 'Schedule', auth: true }] : []),
    { to: user ? '/profile' : '/auth', icon: User, label: user ? 'Profile' : 'Sign In' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors',
                isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
