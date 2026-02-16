import { HELDERBERG_SUBURBS } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeliveryCalculatorProps {
  suburb: string;
  address: string;
  onSuburbChange: (suburb: string) => void;
  onAddressChange: (address: string) => void;
}

const DeliveryCalculator = ({ suburb, address, onSuburbChange, onAddressChange }: DeliveryCalculatorProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Delivery Address</h2>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="suburb" className="text-sm">Suburb</Label>
          <Select value={suburb} onValueChange={onSuburbChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select suburb" />
            </SelectTrigger>
            <SelectContent>
              {HELDERBERG_SUBURBS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-sm">Street Address (optional)</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="e.g. 12 Main Road"
          />
        </div>
      </div>
    </div>
  );
};

export default DeliveryCalculator;
