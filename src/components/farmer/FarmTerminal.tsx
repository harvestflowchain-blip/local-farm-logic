import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

const SUBURB_COORDS: Record<string, { lat: number; lon: number }> = {
  'Somerset West': { lat: -34.0833, lon: 18.8333 },
  'Strand': { lat: -34.1167, lon: 18.8333 },
  "Gordon's Bay": { lat: -34.1667, lon: 18.8667 },
  'Stellenbosch': { lat: -33.9333, lon: 18.8667 },
  'Paarl': { lat: -33.7167, lon: 18.9667 },
};

const GOLD = 'hsl(37 53% 51%)';
const GREEN = 'hsl(142 71% 45%)';
const RED = 'hsl(0 84% 60%)';

interface CategoryRow {
  category: string;
  avg_price: number;
  listings: number;
}
interface HarvestRow {
  id: string;
  crop_name: string;
  projected_yield_kg: number;
  planting_date: string | null;
  harvest_date: string | null;
  estimated_ready_date: string;
}
interface OrderRow {
  id: string;
  total: number;
  status: string;
  created_at: string;
  delivery_suburb: string | null;
}

const SECTION_LABEL = 'text-xs text-muted-foreground uppercase tracking-widest mb-2';

const ageString = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / 3600000);
  if (h < 24) return `${Math.max(1, h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const statusDotColor = (status: string) => {
  switch (status) {
    case 'placed':
      return GOLD;
    case 'confirmed':
      return 'hsl(217 91% 60%)';
    case 'preparing':
    case 'harvested':
      return 'hsl(270 70% 60%)';
    case 'ready':
    case 'out-for-delivery':
    case 'out_for_delivery':
      return GREEN;
    default:
      return 'hsl(var(--muted-foreground))';
  }
};

export const RiskBadge = ({ score }: { score: number }) => {
  const cfg =
    score === 0
      ? { label: 'ALL CLEAR', color: GREEN }
      : score <= 2
      ? { label: 'MONITOR', color: GOLD }
      : { label: 'ACTION NEEDED', color: RED };
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded"
      style={{ background: `${cfg.color.replace(')', ' / 0.15)')}`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
};

export const useFarmRiskScore = () => {
  const { profile, user } = useAuth();
  const suburb = profile?.suburb && SUBURB_COORDS[profile.suburb] ? profile.suburb : 'Somerset West';
  const coords = SUBURB_COORDS[suburb];
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      let s = 0;
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=precipitation_sum,windspeed_10m_max,temperature_2m_max&timezone=Africa%2FJohannesburg&forecast_days=2`
        );
        const d = await r.json();
        if (d?.daily) {
          const rainToday = d.daily.precipitation_sum[0] ?? 0;
          const rainTom = d.daily.precipitation_sum[1] ?? 0;
          const wind = d.daily.windspeed_10m_max[0] ?? 0;
          if (!(rainToday < 2 && wind < 15)) s += 1; // spray bad
          if (!(rainToday < 5 && rainTom < 5)) s += 1; // irrigate bad
        }
      } catch {}
      const today = new Date().toISOString().slice(0, 10);
      const in3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      const { data: hv } = await supabase
        .from('harvest_entries')
        .select('id')
        .eq('farmer_id', user.id)
        .gte('estimated_ready_date', today)
        .lte('estimated_ready_date', in3)
        .limit(1);
      if (hv && hv.length > 0) s += 2;

      const cutoff = new Date(Date.now() - 48 * 3600000).toISOString();
      const { data: stale } = await supabase
        .from('orders')
        .select('id')
        .eq('farmer_id', user.id)
        .eq('status', 'placed')
        .lt('created_at', cutoff)
        .limit(1);
      if (stale && stale.length > 0) s += 1;

      if (active) setScore(s);
    })();
    return () => {
      active = false;
    };
  }, [user, coords.lat, coords.lon]);

  return score;
};

const FarmTerminal = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[] | null>(null);
  const [harvests, setHarvests] = useState<HarvestRow[] | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [weekly, setWeekly] = useState<{ week: string; revenue: number }[] | null>(null);

  useEffect(() => {
    if (!user) return;

    // Panel 1: categories
    supabase
      .from('products')
      .select('category, price')
      .eq('is_active', true)
      .then(({ data }) => {
        const map = new Map<string, { sum: number; count: number }>();
        (data || []).forEach((p: any) => {
          const cat = (p.category || 'Uncategorized').trim();
          const cur = map.get(cat) || { sum: 0, count: 0 };
          cur.sum += Number(p.price) || 0;
          cur.count += 1;
          map.set(cat, cur);
        });
        const rows: CategoryRow[] = Array.from(map.entries())
          .map(([category, v]) => ({ category, avg_price: v.sum / v.count, listings: v.count }))
          .sort((a, b) => a.category.localeCompare(b.category));
        setCategories(rows);
      });

    // Panel 2: harvests for farmer
    supabase
      .from('harvest_entries')
      .select('id, crop_name, projected_yield_kg, planting_date, harvest_date, estimated_ready_date')
      .eq('farmer_id', user.id)
      .order('estimated_ready_date', { ascending: true })
      .then(({ data }) => setHarvests((data as HarvestRow[]) || []));

    // Panel 3 + 4: orders
    supabase
      .from('orders')
      .select('id, total, status, created_at, delivery_suburb, farmer_id')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const all = (data || []) as OrderRow[];
        const active = all
          .filter((o) => !['completed', 'cancelled'].includes(o.status))
          .slice(0, 5);
        setOrders(active);

        // Weekly revenue (non-cancelled), last 8 weeks
        const buckets = new Map<string, number>();
        all
          .filter((o) => o.status !== 'cancelled')
          .forEach((o) => {
            const d = new Date(o.created_at);
            const day = d.getUTCDay();
            const monday = new Date(d);
            monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
            monday.setUTCHours(0, 0, 0, 0);
            const key = monday.toISOString().slice(0, 10);
            buckets.set(key, (buckets.get(key) || 0) + Number(o.total));
          });
        const sorted = Array.from(buckets.entries())
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .slice(0, 8)
          .reverse()
          .map(([week, revenue]) => ({ week, revenue }));
        setWeekly(sorted);
      });
  }, [user]);

  const watchlist = useMemo(() => {
    const set = new Set<string>();
    (harvests || []).forEach((h) => set.add(h.crop_name.toLowerCase()));
    return set;
  }, [harvests]);

  const isWatched = (category: string) => {
    const c = category.toLowerCase();
    for (const w of watchlist) {
      if (c.includes(w) || w.includes(c)) return true;
    }
    return false;
  };

  const categoryPrice = (cropName: string): number | null => {
    if (!categories) return null;
    const c = cropName.toLowerCase();
    const m = categories.find((cat) => {
      const cn = cat.category.toLowerCase();
      return cn.includes(c) || c.includes(cn);
    });
    return m ? m.avg_price : null;
  };

  const pipeline = (harvests || []).map((h) => {
    const price = categoryPrice(h.crop_name);
    const revenue = price ? Number(h.projected_yield_kg) * price : 0;
    const daysToHarvest = Math.max(
      0,
      Math.ceil((new Date(h.estimated_ready_date).getTime() - Date.now()) / 86400000)
    );
    return { ...h, price, revenue, daysToHarvest };
  });
  const totalProjected = pipeline.reduce((s, p) => s + p.revenue, 0);
  const total8wk = (weekly || []).reduce((s, w) => s + w.revenue, 0);

  return (
    <div className="space-y-4">
      {/* PANEL 1 */}
      <section>
        <p className={SECTION_LABEL}>MARKET PRICES · LIVE</p>
        {!categories ? (
          <div className="flex gap-2 overflow-hidden pb-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-32 rounded-full shrink-0" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active products listed.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 flex-nowrap">
            {categories.map((c) => {
              const watched = isWatched(c.category);
              return (
                <div
                  key={c.category}
                  className="px-3 py-2 rounded-full border shrink-0 flex flex-col"
                  style={{
                    background: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderLeft: watched ? `3px solid ${GOLD}` : undefined,
                  }}
                >
                  <span className="text-xs font-medium uppercase tracking-widest">{c.category}</span>
                  <span className="text-sm font-bold">R{c.avg_price.toFixed(0)}</span>
                  <span className="text-xs text-muted-foreground">{c.listings} listings</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* PANEL 2 */}
      <section>
        <p className={SECTION_LABEL}>CROP PIPELINE · P&amp;L ESTIMATE</p>
        <Card className="p-4">
          {!harvests || !categories ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : pipeline.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">No crops in pipeline.</p>
          ) : (
            <>
              <div className="divide-y">
                {pipeline.map((p) => (
                  <div key={p.id} className="py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{p.crop_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.planting_date || '—'} → {p.harvest_date || p.estimated_ready_date}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">
                        {Number(p.projected_yield_kg).toFixed(0)}kg
                      </div>
                      <div
                        className="text-sm font-bold"
                        style={{ color: p.revenue > 0 ? GREEN : 'hsl(var(--muted-foreground))' }}
                      >
                        Est. {p.revenue > 0 ? `R${p.revenue.toFixed(0)}` : 'R—'}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.daysToHarvest} days</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t text-sm font-semibold">
                PROJECTED SEASON REVENUE: R{totalProjected.toFixed(0)}
              </div>
            </>
          )}
        </Card>
      </section>

      {/* PANEL 3 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">REVENUE · 8 WEEKS</p>
          {weekly && weekly.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="text-sm font-bold text-foreground">R{total8wk.toFixed(0)}</span> total
            </p>
          )}
        </div>
        <Card className="p-3">
          {!weekly ? (
            <Skeleton className="h-[100px] w-full" />
          ) : weekly.length < 2 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Not enough order history yet
            </p>
          ) : (
            <div style={{ height: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`R${v.toFixed(0)}`, 'Revenue']}
                    labelFormatter={(l) => l}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={GOLD}
                    strokeWidth={2}
                    fill="url(#revFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      {/* PANEL 4 */}
      <section>
        <p className={SECTION_LABEL}>ORDER BOOK · ACTIVE</p>
        <Card className="p-3">
          {!orders ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No active orders</p>
          ) : (
            <div className="divide-y">
              {orders.map((o) => (
                <div key={o.id} className="py-2 grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{ width: 8, height: 8, background: statusDotColor(o.status) }}
                    />
                    <span className="text-xs capitalize truncate">{o.status.replace(/[-_]/g, ' ')}</span>
                  </div>
                  <div className="text-sm font-semibold">R{Number(o.total).toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground truncate text-right">
                    {o.delivery_suburb || '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">{ageString(o.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};

export default FarmTerminal;
