import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductList from '@/components/farmer/ProductList';
import OrderList from '@/components/farmer/OrderList';
import { useEffect } from 'react';

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
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">Farm Dashboard</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
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
      </main>
    </div>
  );
};

export default FarmerDashboard;
