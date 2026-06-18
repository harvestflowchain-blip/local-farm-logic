import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Seo from '@/components/Seo';

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen pb-20">
      <Seo
        title="Terms of Service — HarvestFlow"
        description="The terms that govern your use of the HarvestFlow marketplace."
        path="/terms"
      />
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Terms of Service</h1>
        </div>
      </header>
      <main className="px-4 pt-6 max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
        <p className="text-muted-foreground">Last updated: 18 June 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">1. Acceptance</h2>
          <p>By creating an account or placing an order on HarvestFlow you agree to these Terms. If you do not agree, do not use the platform.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. Service</h2>
          <p>HarvestFlow is an online marketplace connecting consumers with farmers in the Helderberg region (15&nbsp;km radius). Farmers are independent vendors responsible for product quality, harvest timing, and fulfilment.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. Accounts</h2>
          <p>You must provide accurate information and keep your password secure. You are responsible for all activity under your account.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. Orders &amp; payment</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Prices are displayed in ZAR and charged in USD via PayPal at PayPal's daily conversion rate.</li>
            <li>Delivery fees are calculated by distance and farmer.</li>
            <li>Orders may be cancelled by the farmer if produce is unavailable; refunds are processed via PayPal.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. Subscriptions</h2>
          <p>Premium plans renew automatically until cancelled. You may cancel anytime; access continues until the end of the paid period.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">6. Acceptable use</h2>
          <p>No fraudulent activity, scraping, abusive content, or attempts to compromise platform security.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">7. Liability</h2>
          <p>HarvestFlow is provided "as is". To the maximum extent permitted by law, our liability for any claim is limited to the value of the order in question.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">8. Governing law</h2>
          <p>These Terms are governed by the laws of the Republic of South Africa.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">9. Contact</h2>
          <p>support@harvestflow.co.za</p>
        </section>
      </main>
    </div>
  );
};

export default Terms;
