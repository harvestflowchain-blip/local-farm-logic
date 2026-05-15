import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Droplets, Sprout, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

const SUBURB_COORDS: Record<string, { lat: number; lon: number }> = {
  'Somerset West': { lat: -34.0833, lon: 18.8333 },
  'Strand': { lat: -34.1167, lon: 18.8333 },
  "Gordon's Bay": { lat: -34.1667, lon: 18.8667 },
  'Stellenbosch': { lat: -33.9333, lon: 18.8667 },
  'Paarl': { lat: -33.7167, lon: 18.9667 },
};

interface Daily {
  precipitation_sum: number[];
  windspeed_10m_max: number[];
  temperature_2m_max: number[];
}

interface HarvestAlert {
  id: string;
  crop_name: string;
  days: number;
}

const TodayOnFarm = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const suburb = profile?.suburb && SUBURB_COORDS[profile.suburb] ? profile.suburb : 'Somerset West';
  const coords = SUBURB_COORDS[suburb];

  const [daily, setDaily] = useState<Daily | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [alerts, setAlerts] = useState<HarvestAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=precipitation_sum,windspeed_10m_max,temperature_2m_max&current_weather=true&timezone=Africa%2FJohannesburg&forecast_days=2`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d?.daily) setDaily(d.daily);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [coords.lat, coords.lon]);

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    const in7 = new Date();
    in7.setDate(today.getDate() + 7);
    supabase
      .from('harvest_entries')
      .select('id, crop_name, estimated_ready_date')
      .eq('farmer_id', user.id)
      .gte('estimated_ready_date', today.toISOString().slice(0, 10))
      .lte('estimated_ready_date', in7.toISOString().slice(0, 10))
      .then(({ data }) => {
        if (!data) return;
        const out = data.map((d) => {
          const days = Math.max(
            0,
            Math.ceil(
              (new Date(d.estimated_ready_date).getTime() - today.getTime()) / 86400000
            )
          );
          return { id: d.id, crop_name: d.crop_name, days };
        });
        setAlerts(out);
      });
  }, [user]);

  const decisions = (() => {
    if (!daily) return null;
    const rainToday = daily.precipitation_sum[0] ?? 0;
    const rainTomorrow = daily.precipitation_sum[1] ?? 0;
    const wind = daily.windspeed_10m_max[0] ?? 0;
    const temp = daily.temperature_2m_max[0] ?? 0;

    const spray =
      rainToday < 2 && wind < 15
        ? { ok: 'good' as const, label: 'Good to spray', reason: 'Low wind, no rain' }
        : {
            ok: 'bad' as const,
            label: 'Hold off',
            reason: rainToday >= 2 ? `${rainToday.toFixed(0)}mm rain` : `${wind.toFixed(0)}km/h wind`,
          };

    const irrigate =
      rainToday < 5 && rainTomorrow < 5
        ? { ok: 'good' as const, label: 'Irrigate today', reason: 'Dry 48h ahead' }
        : { ok: 'bad' as const, label: 'Rain coming', reason: `${Math.max(rainToday, rainTomorrow).toFixed(0)}mm forecast` };

    const harvest =
      temp > 28 || rainToday > 10
        ? {
            ok: 'warn' as const,
            label: 'Check crops',
            reason: temp > 28 ? `Heat ${temp.toFixed(0)}°C` : `Heavy rain`,
          }
        : { ok: 'good' as const, label: 'Good conditions', reason: `${temp.toFixed(0)}°C` };

    return { spray, irrigate, harvest };
  })();

  const colorFor = (ok: 'good' | 'bad' | 'warn') =>
    ok === 'good' ? 'hsl(142 71% 45%)' : ok === 'bad' ? 'hsl(0 84% 60%)' : 'hsl(37 53% 51%)';
  const iconFor = (ok: 'good' | 'bad' | 'warn') => (ok === 'good' ? '✅' : ok === 'bad' ? '❌' : '🟡');

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (failed && !loading) return null;

  return (
    <section className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-widest">
        Today · {suburb}
      </p>

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : decisions ? (
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'spray', icon: <Cloud className="h-4 w-4" />, title: 'Spray', d: decisions.spray },
            { key: 'irrigate', icon: <Droplets className="h-4 w-4" />, title: 'Irrigate', d: decisions.irrigate },
            { key: 'harvest', icon: <Sprout className="h-4 w-4" />, title: 'Harvest', d: decisions.harvest },
          ].map((c) => (
            <div
              key={c.key}
              className="rounded-md border p-2 flex flex-col gap-1"
              style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.icon}
                {c.title}
              </div>
              <div className="text-sm font-semibold leading-tight" style={{ color: colorFor(c.d.ok) }}>
                {iconFor(c.d.ok)} {c.d.label}
              </div>
              <div className="text-[11px] text-muted-foreground leading-tight">{c.d.reason}</div>
            </div>
          ))}
        </div>
      ) : null}

      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md p-3 text-sm text-foreground"
              style={{
                background: 'hsl(37 53% 51% / 0.15)',
                borderLeft: '3px solid hsl(37 53% 51%)',
              }}
            >
              <div>
                🌾 <span className="font-medium">{a.crop_name}</span> is ready to harvest in {a.days}{' '}
                day{a.days === 1 ? '' : 's'} —{' '}
                <button onClick={() => navigate('/')} className="underline font-medium">
                  list it now →
                </button>
              </div>
              <button
                aria-label="Dismiss"
                onClick={() => setDismissed((s) => new Set(s).add(a.id))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default TodayOnFarm;
