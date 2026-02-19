import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck } from 'lucide-react';

interface LogisticsSelectorProps {
  selected: string;
  onSelect: (provider: string) => void;
}

const PROVIDERS = [
  { id: 'standard', name: 'Standard Delivery', description: 'Farm-managed delivery', available: true },
  { id: 'bolt', name: 'Bolt', description: 'On-demand delivery', available: false },
  { id: 'uber', name: 'Uber', description: 'On-demand delivery', available: false },
];

const LogisticsSelector = ({ selected, onSelect }: LogisticsSelectorProps) => {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Delivery Provider</h2>
      <div className="space-y-2">
        {PROVIDERS.map(p => (
          <label
            key={p.id}
            className={`flex items-center justify-between border p-3 cursor-pointer transition-colors ${
              selected === p.id ? 'border-primary bg-secondary' : 'border-border'
            } ${!p.available ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => p.available && onSelect(p.id)}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="logistics"
                value={p.id}
                checked={selected === p.id}
                onChange={() => {}}
                disabled={!p.available}
                className="accent-primary"
              />
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </div>
            </div>
            {!p.available && (
              <Badge variant="secondary" className="text-xs shrink-0">Coming Soon</Badge>
            )}
          </label>
        ))}
      </div>
    </div>
  );
};

export default LogisticsSelector;
