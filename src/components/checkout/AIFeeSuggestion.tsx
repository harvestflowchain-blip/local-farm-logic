import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AIFeeSuggestionProps {
  distanceKm: number;
  currentFee: number | null;
  orderTotal: number;
}

const MIN_FEE = 25;
const MAX_FEE = 75;
const BASE_FEE = 20;
const PER_KM = 3;

function ruleBasedFee(distanceKm: number): number {
  const fee = BASE_FEE + PER_KM * distanceKm;
  return Math.max(MIN_FEE, Math.min(MAX_FEE, Math.round(fee)));
}

const AIFeeSuggestion = ({ distanceKm, currentFee, orderTotal }: AIFeeSuggestionProps) => {
  const [suggestion, setSuggestion] = useState<{ fee: number; reason: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (distanceKm <= 0 || currentFee === null) return;
    
    const fetchSuggestion = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('suggest-delivery-fee', {
          body: { distanceKm, currentFee, orderTotal, minFee: MIN_FEE, maxFee: MAX_FEE },
        });
        if (!error && data?.fee) {
          const bounded = Math.max(MIN_FEE, Math.min(MAX_FEE, Math.round(data.fee)));
          setSuggestion({ fee: bounded, reason: data.reason || 'Based on distance and typical rates' });
        } else {
          const fallback = ruleBasedFee(distanceKm);
          setSuggestion({ fee: fallback, reason: `Rule-based: R${BASE_FEE} base + R${PER_KM}/km` });
        }
      } catch {
        const fallback = ruleBasedFee(distanceKm);
        setSuggestion({ fee: fallback, reason: `Rule-based: R${BASE_FEE} base + R${PER_KM}/km` });
      }
      setLoading(false);
    };

    fetchSuggestion();
  }, [distanceKm, currentFee, orderTotal]);

  if (currentFee === null || distanceKm <= 0) return null;

  return (
    <Card className="p-3 space-y-1.5 bg-secondary/50 border-dashed">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI Suggestion</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />}
      </div>
      {suggestion && !loading && (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold">R{suggestion.fee}</span>
            <span className="text-xs text-muted-foreground">suggested fee</span>
          </div>
          <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
          <p className="text-xs text-muted-foreground italic">Fee bounded: R{MIN_FEE}–R{MAX_FEE}</p>
        </>
      )}
    </Card>
  );
};

export default AIFeeSuggestion;
