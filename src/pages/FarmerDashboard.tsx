import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ProductList from '@/components/farmer/ProductList';
import OrderList from '@/components/farmer/OrderList';
import LockedFeature from '@/components/LockedFeature';
import HarvestPlanner from '@/components/farmer/HarvestPlanner';
import { useEffect } from 'react';
import { Calendar } from 'lucide-react';

const FarmerDashboard = () => {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role !== 'farmer') navigate('/');
  }, [role, loading]);

  if (loading || role !== 'farmer') return null;

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">Farm Dashboard</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/calendar')}>
            <Calendar className="h-4 w-4 mr-1" /> Schedule
          </Button>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-6">
        <Tabs defaultValue="products">
          <TabsList className="w-full">
            <TabsTrigger value="products" className="flex-1">Products</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">Orders</TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="pt-4">
            <ProductList />
          </TabsContent>
          <TabsContent value="orders" className="pt-4">
            <OrderList />
          </TabsContent>
        </Tabs>

        {/* Locked premium features */}
        <div className="space-y-3">
          <LockedFeature
            title="Boosted Listings"
            description="Get priority placement in search results and recommendations."
            returnTo="/dashboard"
          />
          <LockedFeature
            title="Bulk Inventory Management"
            description="Import/export products via CSV and manage stock in bulk."
            returnTo="/dashboard"
          />
        </div>
      </main>
    </div>
  );
};

export default FarmerDashboard;
