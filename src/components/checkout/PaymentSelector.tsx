import { Label } from '@/components/ui/label';

interface PaymentSelectorProps {
  method: string;
  onChange: (method: string) => void;
}

const PaymentSelector = ({ method, onChange }: PaymentSelectorProps) => {
  const options = [
    { value: 'payfast', label: 'PayFast' },
    { value: 'yoco', label: 'Yoco' },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Payment Method</h2>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors ${
              method === opt.value ? 'border-primary bg-secondary' : 'border-border'
            }`}
          >
            <input
              type="radio"
              name="payment"
              value={opt.value}
              checked={method === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-primary"
            />
            <Label className="cursor-pointer text-sm">{opt.label}</Label>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Payment processing coming soon — your order will be placed with status "pending payment".
      </p>
    </div>
  );
};

export default PaymentSelector;
