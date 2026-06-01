import Seo from '@/components/Seo';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Sprout, Pencil, CheckCircle, X } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';

interface HarvestEntry {
  id: string;
  crop_name: string;
  planting_date: string | null;
  harvest_date: string | null;
  estimated_ready_date: string;
  projected_yield_kg: number;
  notes: string | null;
}

const HarvestPlannerPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<HarvestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Add form state
  const [cropName, setCropName] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [yieldProjection, setYieldProjection] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<HarvestEntry>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setFetchError(null);
    setLoading(true);
    const { data, error } = await supabase
      .from('harvest_entries' as any)
      .select('*')
      .eq('farmer_id', user.id)
      .order('harvest_date', { ascending: true });
    if (error) {
      setFetchError(error.message);
    } else {
      setEntries((data as any) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Escape key handler for edit mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingId) {
        setEditingId(null);
        setEditValues({});
        setEditError(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingId]);

  const resetForm = () => {
    setCropName('');
    setPlantingDate('');
    setHarvestDate('');
    setYieldProjection('');
    setNotes('');
    setSubmitError(null);
  };

  const handleAdd = async () => {
    if (!user) return;
    if (!cropName.trim() || !plantingDate || !harvestDate) {
      setSubmitError('Crop name, planting date, and harvest date are required.');
      return;
    }
    if (!isAfter(parseISO(harvestDate), parseISO(plantingDate))) {
      setSubmitError('Harvest date must be after planting date.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const { data, error } = await supabase
      .from('harvest_entries' as any)
      .insert([{
        farmer_id: user.id,
        crop_name: cropName.trim(),
        planting_date: plantingDate,
        harvest_date: harvestDate,
        estimated_ready_date: harvestDate,
        projected_yield_kg: parseFloat(yieldProjection) || 0,
        notes: notes.trim() || null,
      }] as any)
      .select()
      .single();

    if (error) {
      setSubmitError(error.message);
    } else {
      const newEntry = data as any as HarvestEntry;
      setEntries(prev => [newEntry, ...prev]);
      resetForm();
      toast.success('Crop entry logged.');

      // Persistence verification
      const { data: verify } = await supabase
        .from('harvest_entries' as any)
        .select('id')
        .eq('id', newEntry.id)
        .single();
      if (!verify) {
        toast.warning('Entry may not have saved — please check your connection.');
        console.error('Persistence verification failed for entry:', newEntry.id);
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (entry: HarvestEntry) => {
    // Optimistic removal
    setEntries(prev => prev.filter(e => e.id !== entry.id));
    const { error } = await supabase
      .from('harvest_entries' as any)
      .delete()
      .eq('id', entry.id);
    if (error) {
      setEntries(prev => [...prev, entry]);
      toast.error('Failed to delete entry: ' + error.message);
    } else {
      toast.success('Entry deleted.');
    }
  };

  // Edit handlers
  const startEdit = (entry: HarvestEntry) => {
    // Auto-save previous if editing another
    if (editingId && editingId !== entry.id) {
      setEditingId(null);
      setEditValues({});
    }
    setEditingId(entry.id);
    setEditValues({
      crop_name: entry.crop_name,
      planting_date: entry.planting_date,
      harvest_date: entry.harvest_date,
      projected_yield_kg: entry.projected_yield_kg,
      notes: entry.notes,
    });
    setEditError(null);
  };

  const handleSave = async () => {
    if (!editingId) return;
    // Validation
    if (!editValues.crop_name?.trim()) {
      setEditError('Crop name is required.');
      return;
    }
    if (editValues.planting_date && editValues.harvest_date &&
        !isAfter(parseISO(editValues.harvest_date), parseISO(editValues.planting_date))) {
      setEditError('Harvest date must be after planting date.');
      return;
    }
    setIsSaving(true);
    setEditError(null);

    const { data: updated, error } = await supabase
      .from('harvest_entries' as any)
      .update({
        crop_name: editValues.crop_name?.trim(),
        planting_date: editValues.planting_date,
        harvest_date: editValues.harvest_date,
        estimated_ready_date: editValues.harvest_date,
        projected_yield_kg: editValues.projected_yield_kg,
        notes: editValues.notes,
      } as any)
      .eq('id', editingId)
      .select()
      .single();

    if (error) {
      setEditError(error.message);
    } else {
      setEntries(prev => prev.map(e => e.id === editingId ? (updated as any as HarvestEntry) : e));
      setEditingId(null);
      setEditValues({});
      toast.success('Entry updated.');
    }
    setIsSaving(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
    setEditError(null);
  };

  return (
    <div className="min-h-screen pb-20">
      <Seo
        title="Harvest Planner | Local Farm Logic"
        description="Plan upcoming crops, projected yields, and harvest-ready dates to keep your farm's pipeline visible at a glance."
        path="/harvest-planner"
        noindex
      />
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            Harvest Planner
          </h1>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Add Crop Entry Form */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Log Crop Entry
            </p>
            <div className="space-y-1">
              <Label htmlFor="add-crop-name" className="text-xs">Crop Name *</Label>
              <Input id="add-crop-name" placeholder="e.g. Butternut Squash" value={cropName} onChange={e => setCropName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="add-planting-date" className="text-xs">Planting Date *</Label>
                <Input id="add-planting-date" type="date" value={plantingDate} onChange={e => setPlantingDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-harvest-date" className="text-xs">Harvest Date *</Label>
                <Input id="add-harvest-date" type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-yield" className="text-xs">Yield Projection (kg)</Label>
              <Input id="add-yield" type="number" min="0" step="0.1" placeholder="0" value={yieldProjection} onChange={e => setYieldProjection(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-notes" className="text-xs">Notes</Label>
              <Textarea id="add-notes" placeholder="Optional notes…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
            {submitError && <p className="text-xs text-destructive">{submitError}</p>}
            <Button size="sm" onClick={handleAdd} disabled={submitting}>
              {submitting ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving…</> : 'Log Crop Entry'}
            </Button>
          </CardContent>
        </Card>

        {/* Entries List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent></Card>
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-destructive">{fetchError}</p>
            <Button variant="outline" size="sm" onClick={fetchEntries}>Retry</Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Sprout className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">No harvest entries yet</p>
            <p className="text-xs text-muted-foreground">Use the form above to log your first crop.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => {
              const isEditing = editingId === entry.id;

              if (isEditing) {
                return (
                  <Card key={entry.id} className="border-l-2 border-l-primary">
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor={`edit-crop-${entry.id}`} className="sr-only">Crop Name</Label>
                        <Input
                          id={`edit-crop-${entry.id}`}
                          value={editValues.crop_name || ''}
                          onChange={e => setEditValues(v => ({ ...v, crop_name: e.target.value }))}
                          placeholder="Crop name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`edit-plant-${entry.id}`} className="text-xs">Planting Date</Label>
                          <Input
                            id={`edit-plant-${entry.id}`}
                            type="date"
                            value={editValues.planting_date || ''}
                            onChange={e => setEditValues(v => ({ ...v, planting_date: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`edit-harvest-${entry.id}`} className="text-xs">Harvest Date</Label>
                          <Input
                            id={`edit-harvest-${entry.id}`}
                            type="date"
                            value={editValues.harvest_date || ''}
                            onChange={e => setEditValues(v => ({ ...v, harvest_date: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-yield-${entry.id}`} className="text-xs">Yield (kg)</Label>
                        <Input
                          id={`edit-yield-${entry.id}`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={editValues.projected_yield_kg ?? 0}
                          onChange={e => setEditValues(v => ({ ...v, projected_yield_kg: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-notes-${entry.id}`} className="sr-only">Notes</Label>
                        <Textarea
                          id={`edit-notes-${entry.id}`}
                          value={editValues.notes || ''}
                          onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))}
                          rows={2}
                          placeholder="Notes…"
                        />
                      </div>
                      {editError && <p className="text-xs text-destructive">{editError}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-semibold truncate">{entry.crop_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.planting_date ? format(parseISO(entry.planting_date), 'dd MMM yyyy') : '—'}
                          {' → '}
                          {entry.harvest_date ? format(parseISO(entry.harvest_date), 'dd MMM yyyy') : entry.estimated_ready_date ? format(parseISO(entry.estimated_ready_date), 'dd MMM yyyy') : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.projected_yield_kg} kg projected</p>
                        {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(entry)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(entry)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default HarvestPlannerPage;
