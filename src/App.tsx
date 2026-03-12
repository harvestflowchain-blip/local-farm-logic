import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import ChatBot from "@/components/ChatBot";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import Pricing from "./pages/Pricing";
import FarmerDashboard from "./pages/FarmerDashboard";
import FarmerOnboarding from "./pages/FarmerOnboarding";
import ConsumerOnboarding from "./pages/ConsumerOnboarding";
import Calendar from "./pages/Calendar";
import AdminDashboard from "./pages/AdminDashboard";
import HarvestPlannerPage from "./pages/HarvestPlannerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ONBOARDING_ALLOWED_ROUTES = [
  '/onboarding/farmer',
  '/onboarding/consumer',
  '/auth',
  '/pricing',
];

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading, onboardingCompleted } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user || !role || role === 'admin') return <>{children}</>;
  if (ONBOARDING_ALLOWED_ROUTES.some(r => location.pathname.startsWith(r))) return <>{children}</>;

  if (!onboardingCompleted) {
    const target = role === 'farmer' ? '/onboarding/farmer' : '/onboarding/consumer';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <OnboardingGuard>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/dashboard" element={<FarmerDashboard />} />
      <Route path="/onboarding/farmer" element={<FarmerOnboarding />} />
      <Route path="/onboarding/consumer" element={<ConsumerOnboarding />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/harvest-planner" element={<HarvestPlannerPage />} />
      <Route path="/settings" element={<Navigate to="/profile" replace />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/requests" element={<AdminDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </OnboardingGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <BottomNav />
          <ChatBot />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
