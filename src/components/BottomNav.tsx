import { useState } from 'react';
import { Home, ShoppingCart, User, BarChart3, Sprout, Package, Calendar, Menu, X, DollarSign, Settings } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const BottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    ...(role === 'customer' ? [{ to: '/orders', icon: Package, label: 'Orders', auth: true }] : []),
    { to: '/cart', icon: ShoppingCart, label: 'Cart', auth: true },
    ...(role === 'farmer' ? [{ to: '/dashboard', icon: Sprout, label: 'Farm', auth: true }] : []),
    ...(role === 'admin' ? [{ to: '/admin', icon: BarChart3, label: 'Admin', auth: true }] : []),
    ...(user ? [{ to: '/calendar', icon: Calendar, label: 'Schedule', auth: true }] : []),
    { to: user ? '/profile' : '/auth', icon: User, label: user ? 'Profile' : 'Sign In' },
  ];

  const drawerItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/cart', icon: ShoppingCart, label: 'Cart' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/pricing', icon: DollarSign, label: 'Pricing' },
    { to: '/calendar', icon: Calendar, label: 'Schedule' },
    ...(role === 'farmer' ? [{ to: '/dashboard', icon: Sprout, label: 'Farm Dashboard' }] : []),
    ...(role === 'admin' ? [{ to: '/admin', icon: BarChart3, label: 'Admin Console' }] : []),
    { to: '/profile', icon: Settings, label: 'Settings' },
  ];

  // Mobile: show hamburger in a compact bar
  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
        <div className="flex items-center justify-between px-2 py-2">
          {/* Core quick-access icons */}
          <Link to="/" className={cn('flex flex-col items-center gap-0.5 px-3 py-1 text-xs', pathname === '/' ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            <Home className="h-5 w-5" strokeWidth={pathname === '/' ? 2.5 : 1.5} />
            <span>Home</span>
          </Link>
          <Link to="/cart" className={cn('flex flex-col items-center gap-0.5 px-3 py-1 text-xs', pathname === '/cart' ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            <ShoppingCart className="h-5 w-5" strokeWidth={pathname === '/cart' ? 2.5 : 1.5} />
            <span>Cart</span>
          </Link>
          <Link to={user ? '/profile' : '/auth'} className={cn('flex flex-col items-center gap-0.5 px-3 py-1 text-xs', pathname === '/profile' ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            <User className="h-5 w-5" strokeWidth={pathname === '/profile' ? 2.5 : 1.5} />
            <span>{user ? 'Profile' : 'Sign In'}</span>
          </Link>

          {/* Hamburger */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-muted-foreground">
                <Menu className="h-5 w-5" />
                <span>More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70vh] pb-8">
              <div className="space-y-1 pt-2">
                {drawerItems.map((item) => {
                  const isActive = pathname === item.to;
                  return (
                    <button
                      key={item.to}
                      onClick={() => { navigate(item.to); setDrawerOpen(false); }}
                      className={cn(
                        'flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors',
                        isActive ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                {user && (
                  <button
                    onClick={() => { signOut(); setDrawerOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    );
  }

  // Desktop: standard bottom nav
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
