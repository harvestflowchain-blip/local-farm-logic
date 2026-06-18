import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Seo from '@/components/Seo';

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen pb-20">
      <Seo
        title="Privacy Policy — HarvestFlow"
        description="How HarvestFlow collects, uses, and protects your personal information."
        path="/privacy"
      />
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Privacy Policy</h1>
        </div>
      </header>
      <main className="px-4 pt-6 max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
        <p className="text-muted-foreground">Last updated: 18 June 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">1. Who we are</h2>
          <p>HarvestFlow ("we", "us") connects Helderberg consumers with local farmers. We are the controller of the personal data described below.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. Information we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account: name, email, phone, suburb, role (customer/farmer/admin).</li>
            <li>Orders &amp; payments: cart items, delivery address, PayPal transaction reference. Card numbers are never stored on our servers.</li>
            <li>Farmer profiles: farm name, location, product listings and images.</li>
            <li>Technical: IP, device/browser metadata, session cookies, and basic usage analytics.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. How we use it</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To create your account, process orders, and deliver produce within the Helderberg region.</li>
            <li>To calculate delivery distance (15&nbsp;km limit) and suggest fair rates.</li>
            <li>To send transactional emails (order updates, password reset).</li>
            <li>To improve the platform, prevent fraud, and comply with South African POPIA obligations.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. Sharing</h2>
          <p>We share order details with the farmer fulfilling your order and with PayPal for payment processing. We do not sell your personal information.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. Retention</h2>
          <p>Account and order data is retained for as long as your account is active and for up to 5 years afterwards for tax and dispute purposes.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">6. Your rights</h2>
          <p>Under POPIA you may access, correct, or request deletion of your personal information. Contact us at privacy@harvestflow.co.za.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">7. Cookies</h2>
          <p>We use only essential cookies for authentication and session management. No third-party advertising or tracking cookies are set.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">8. Contact</h2>
          <p>Questions? Email privacy@harvestflow.co.za.</p>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
