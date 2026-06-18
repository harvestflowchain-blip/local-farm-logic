import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'hf_cookie_consent_v1';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch { /* ignore */ }
  }, []);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'accepted'); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-20 left-0 right-0 z-50 px-4 sm:bottom-4"
    >
      <div className="max-w-2xl mx-auto bg-background border shadow-lg p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <p className="text-xs text-muted-foreground leading-relaxed">
          We use only essential cookies for sign-in and your shopping cart. See our{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <Button size="sm" onClick={accept} className="shrink-0">OK</Button>
      </div>
    </div>
  );
};

export default CookieConsent;
