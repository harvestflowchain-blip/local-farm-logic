import { useState } from 'react';
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

const CONSUMER_PLANS = [
  {
    name: 'Free', price: 'R0', period: '/month',
    features: ['Browse all products', 'Basic search & filters', 'Order from local farms', 'Chat support'],
    cta: 'Current Plan', current: true, planId: 'free',
  },
  {
    name: 'Plus', price: 'R49', period: '/month', badge: 'Popular', planId: 'plus',
    features: ['Everything in Free', 'AI-powered recommendations', 'Priority delivery slots', 'Order history analytics', 'Exclusive deals & early access'],
    cta: 'Upgrade to Plus', current: false,
  },
  {
    name: 'Family', price: 'R99', period: '/month', planId: 'family',
    features: ['Everything in Plus', 'Family sharing (up to 5)', 'Weekly box subscriptions', 'Free delivery on orders over R200', 'Calendar integration'],
    cta: 'Upgrade to Family', current: false,
  },
];

const FARMER_PLANS = [
  {
    name: 'Starter', price: 'R0', period: '/month', planId: 'free',
    features: ['List up to 10 products', 'Basic order management', 'Customer messaging', 'Standard visibility'],
    cta: 'Current Plan', current: true,
  },
  {
    name: 'Growth', price: 'R149', period: '/month', badge: 'Popular', planId: 'growth',
    features: ['Unlimited product listings', 'Advanced analytics dashboard', 'Priority placement in search', 'Bulk inventory management', 'Calendar & delivery scheduling'],
    cta: 'Upgrade to Growth', current: false,
  },
  {
    name: 'Pro', price: 'R349', period: '/month', planId: 'pro',
    features: ['Everything in Growth', 'White-label storefront', 'API access', 'Dedicated account manager', 'Custom delivery zones'],
    cta: 'Upgrade to Pro', current: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('return_to');
  const defaultTab = role === 'farmer' ? 'farmer' : 'consumer';

  // Feature request form
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleUpgrade = async (planId: string) => {
    if (!user) { navigate('/auth'); return; }
    // For now, create a subscription row directly (PayPal scaffold - sandbox placeholder)
    const { error } = await supabase.from('subscriptions').insert({
      user_id: user.id,
      plan: planId,
      status: 'active',
      payment_provider: 'paypal_sandbox',
      payment_reference: `sandbox_${Date.now()}`,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Plan upgraded!', description: `You are now on the ${planId} plan.` });
      if (returnTo) navigate(returnTo);
    }
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

  const renderPlans = (plans: typeof CONSUMER_PLANS) => (
    <div className="space-y-4">
      {plans.map((plan) => (
        <Card key={plan.name} className="p-5 space-y-4 relative overflow-hidden">
          {plan.badge && (
            <Badge className="absolute -top-2.5 right-4 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />{plan.badge}
            </Badge>
          )}
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight">{plan.name}</h3>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-bold">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
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
            <p className="text-xs text-center text-muted-foreground">PayPal sandbox — upgrade will be recorded</p>
          )}
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Pricing</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Choose your plan</h2>
          <p className="text-sm text-muted-foreground">Unlock premium features to get the most out of HarvestFlow</p>
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
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowRequestForm(!showRequestForm)}
          >
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
                <Textarea value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} placeholder="Tell us more about what you need..." rows={3} />
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
