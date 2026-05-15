import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Check, Sparkles, Loader2, MessageSquarePlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Seo from '@/components/Seo';

type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';

const PERIOD_LABELS: Record<BillingPeriod, string> = { monthly: '/month', quarterly: '/quarter', yearly: '/year' };
const PERIOD_MULTIPLIER: Record<BillingPeriod, number> = { monthly: 1, quarterly: 2.7, yearly: 9.6 };

// ZAR prices (display currency) — monthly base prices
const ZAR_MONTHLY: Record<string, number> = {
  plus: 49, family: 99, growth: 149, pro: 349,
};

// USD prices (PayPal charge currency) — monthly base prices
const USD_MONTHLY: Record<string, number> = {
  plus: 2.99, family: 5.99, growth: 8.99, pro: 20.99,
};

function calcZarPrice(planId: string, period: BillingPeriod): number {
  const monthly = ZAR_MONTHLY[planId] || 0;
  if (monthly === 0) return 0;
  return Math.round(monthly * PERIOD_MULTIPLIER[period]);
}

function calcUsdPrice(planId: string, period: BillingPeriod): number {
  const monthly = USD_MONTHLY[planId] || 0;
  if (monthly === 0) return 0;
  return Math.round(monthly * PERIOD_MULTIPLIER[period] * 100) / 100;
}

interface PlanDef {
  name: string; monthlyPrice: number; planId: string; badge?: string; current?: boolean;
  features: string[]; cta: string;
}

const CONSUMER_PLANS: PlanDef[] = [
  { name: 'Free', monthlyPrice: 0, planId: 'free', features: ['Browse all products', 'Basic search & filters', 'Order from local farms', 'Chat support'], cta: 'Current Plan', current: true },
  { name: 'Plus', monthlyPrice: 2.99, planId: 'plus', badge: 'Popular', features: ['Everything in Free', 'AI-powered recommendations', 'Priority delivery slots', 'Order history analytics', 'Exclusive deals & early access'], cta: 'Upgrade to Plus' },
  { name: 'Family', monthlyPrice: 5.99, planId: 'family', features: ['Everything in Plus', 'Family sharing (up to 5)', 'Weekly box subscriptions', 'Free delivery on orders over R200', 'Calendar integration'], cta: 'Upgrade to Family' },
];

const FARMER_PLANS: PlanDef[] = [
  { name: 'Starter', monthlyPrice: 0, planId: 'free', features: ['List up to 10 products', 'Basic order management', 'Customer messaging', 'Standard visibility'], cta: 'Current Plan', current: true },
  { name: 'Growth', monthlyPrice: 8.99, planId: 'growth', badge: 'Popular', features: ['Unlimited product listings', 'Advanced analytics dashboard', 'Priority placement in search', 'Bulk inventory management', 'Calendar & delivery scheduling'], cta: 'Upgrade to Growth' },
  { name: 'Pro', monthlyPrice: 20.99, planId: 'pro', features: ['Everything in Growth', 'White-label storefront', 'API access', 'Dedicated account manager', 'Custom delivery zones'], cta: 'Upgrade to Pro' },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = searchParams.get('return_to');
  const defaultTab = role === 'farmer' ? 'farmer' : 'consumer';
  const periodParam = (searchParams.get('period') as BillingPeriod) || 'monthly';
  const [period, setPeriod] = useState<BillingPeriod>(['monthly', 'quarterly', 'yearly'].includes(periodParam) ? periodParam : 'monthly');

  // Feature request form
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('period', period);
    setSearchParams(newParams, { replace: true });
  }, [period]);

  const handleUpgrade = (planId: string) => {
    if (!user) { navigate('/auth'); return; }
    navigate(`/checkout?plan=${planId}&period=${period}&provider=paypal${returnTo ? `&return_to=${encodeURIComponent(returnTo)}` : ''}`);
  };

  const submitFeatureRequest = async () => {
    if (!user || !reqTitle.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('feature_requests').insert({
      user_id: user.id,
      title: reqTitle.trim(),
      description: reqDesc.trim() || null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Request submitted', description: 'Thank you for your feedback!' });
      setReqTitle('');
      setReqDesc('');
      setShowRequestForm(false);
    }
    setSubmitting(false);
  };

  const renderPlans = (plans: PlanDef[]) => (
    <div className="space-y-4">
      {plans.map((plan) => {
        const zarPrice = calcZarPrice(plan.planId, period);
        const usdPrice = calcUsdPrice(plan.planId, period);
        return (
          <Card key={plan.name} className="p-5 space-y-4 relative overflow-hidden">
            {plan.badge && (
              <Badge className="absolute -top-2.5 right-4 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />{plan.badge}
              </Badge>
            )}
            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight">{plan.name}</h3>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-bold">R{zarPrice}</span>
                <span className="text-sm text-muted-foreground">{PERIOD_LABELS[period]}</span>
              </div>
              {plan.monthlyPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Charged as ~${usdPrice.toFixed(2)} USD via PayPal
                </p>
              )}
              {period !== 'monthly' && plan.monthlyPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Save {period === 'quarterly' ? '10%' : '20%'} vs monthly
                </p>
              )}
            </div>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-foreground" /><span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant={plan.current ? 'outline' : 'default'}
              disabled={plan.current}
              onClick={() => handleUpgrade(plan.planId)}
            >
              {plan.cta}
            </Button>
            {!plan.current && (
              <p className="text-xs text-center text-muted-foreground">Pay with PayPal</p>
            )}
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <Seo
        title="Pricing — HarvestFlow plans for farmers and shoppers"
        description="Compare HarvestFlow plans: family bundles, growth tools for farmers, and pro features. Monthly, quarterly and yearly billing in ZAR."
        path="/pricing"
      />
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Pricing</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6 max-w-lg mx-auto">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Choose your plan</h2>
          <p className="text-sm text-muted-foreground">Unlock premium features for HarvestFlow</p>
        </div>

        {/* Billing period toggle */}
        <div className="flex justify-center">
          <div className="inline-flex border rounded-none overflow-hidden">
            {(['monthly', 'quarterly', 'yearly'] as BillingPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  period === p ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full">
            <TabsTrigger value="consumer" className="flex-1">For Consumers</TabsTrigger>
            <TabsTrigger value="farmer" className="flex-1">For Farmers</TabsTrigger>
          </TabsList>
          <TabsContent value="consumer" className="pt-4">{renderPlans(CONSUMER_PLANS)}</TabsContent>
          <TabsContent value="farmer" className="pt-4">{renderPlans(FARMER_PLANS)}</TabsContent>
        </Tabs>

        {/* Feature Request Form */}
        <div className="border-t pt-6 space-y-3">
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowRequestForm(!showRequestForm)}>
            <MessageSquarePlus className="h-4 w-4" />
            Request a Feature
          </Button>

          {showRequestForm && (
            <Card className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Feature Title</Label>
                <Input value={reqTitle} onChange={(e) => setReqTitle(e.target.value)} placeholder="What feature would you like?" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description (optional)</Label>
                <Textarea value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} placeholder="Tell us more..." rows={3} />
              </div>
              <Button onClick={submitFeatureRequest} disabled={submitting || !reqTitle.trim()} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit Request
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Pricing;
