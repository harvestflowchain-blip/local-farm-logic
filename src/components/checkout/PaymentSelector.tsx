import { Label } from '@/components/ui/label';

interface PaymentSelectorProps {
  method: string;
  onChange: (method: string) => void;
}

const PaymentSelector = ({ method, onChange }: PaymentSelectorProps) => {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Payment Method</h2>
      <div className="space-y-2">
        <label
          className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors ${
            method === 'paypal' ? 'border-primary bg-secondary' : 'border-border'
          }`}
        >
          <input
            type="radio"
            name="payment"
            value="paypal"
            checked={method === 'paypal'}
            onChange={() => onChange('paypal')}
            className="accent-primary"
          />
          <div>
            <Label className="cursor-pointer text-sm font-medium">PayPal</Label>
            <p className="text-xs text-muted-foreground">Pay securely with PayPal</p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default PaymentSelector;
