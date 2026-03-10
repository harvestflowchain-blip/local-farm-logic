import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Sprout, Trash2, Leaf } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';

interface HarvestEntry {
  id: string;
  crop_name: string;
  estimated_ready_date: string;
  projected_yield_kg: number;
  notes: string | null;
}

const HarvestPlanner = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<HarvestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropName, setCropName] = useState('');
  const [readyDate, setReadyDate] = useState('');
  const [yieldKg, setYieldKg] = useState('');

  const fetchEntries = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('harvest_entries' as any)
      .select('id, crop_name, estimated_ready_date, projected_yield_kg, notes')
      .eq('farmer_id', user.id)
      .order('estimated_ready_date', { ascending: true });
    if (error) {
      toast.error('Failed to load harvest schedule');
    } else {
      setEntries((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [user]);

  const handleAdd = async () => {
    if (!user || !cropName.trim() || !readyDate || !yieldKg) {
      toast.error('Please fill in all fields');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('harvest_entries' as any)
      .insert({
        farmer_id: user.id,
        crop_name: cropName.trim(),
        estimated_ready_date: readyDate,
        projected_yield_kg: parseFloat(yieldKg),
      } as any);
    if (error) {
      toast.error('Failed to add harvest entry');
    } else {
      toast.success('Harvest entry added');
      setCropName('');
      setReadyDate('');
      setYieldKg('');
      setShowForm(false);
      fetchEntries();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('harvest_entries' as any)
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to remove entry');
    } else {
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success('Entry removed');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sprout className="h-4 w-4 text-primary" />
          Harvest Planner
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" /> Add Crop
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="space-y-1">
              <Label htmlFor="crop-name" className="text-xs">Crop Name</Label>
              <Input id="crop-name" placeholder="e.g. Butternut Squash" value={cropName} onChange={e => setCropName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="ready-date" className="text-xs">Ready Date</Label>
                <Input id="ready-date" type="date" value={readyDate} onChange={e => setReadyDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="yield-kg" className="text-xs">Yield (kg)</Label>
                <Input id="yield-kg" type="number" min="0" step="0.1" placeholder="50" value={yieldKg} onChange={e => setYieldKg(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {entries.length === 0 && !showForm ? (
          <div className="text-center py-8 space-y-2">
            <Leaf className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">No harvest entries yet</p>
            <p className="text-xs text-muted-foreground">Plan your upcoming harvests to stay organised.</p>
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-3 w-3 mr-1" /> Add Your First Crop
            </Button>
          </div>
        ) : (
          entries.map(entry => {
            const isPast = isBefore(parseISO(entry.estimated_ready_date), new Date());
            return (
              <div key={entry.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{entry.crop_name}</p>
                  <p className={`text-xs ${isPast ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {isPast ? 'Overdue — ' : ''}Ready {format(parseISO(entry.estimated_ready_date), 'dd MMM yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">{entry.projected_yield_kg} kg projected</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleDelete(entry.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default HarvestPlanner;
