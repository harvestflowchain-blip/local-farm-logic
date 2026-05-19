import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { ChevronDown, ArrowDown, ArrowUp, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';

type ProductRow = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  farmer_id: string;
  created_at: string;
  stock_quantity: number;
  is_active: boolean;
};

type PriceIdx = {
  category: string;
  this_week_avg: number;
  pct_change: number | null;
  avg30: number;
};

type Scarcity = { category: string; seller_count: number };

type FreshItem = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  created_at: string;
  farmer_name: string;
  suburb: string | null;
};

type BasketRow = {
  category: string;
  spent: number;
  created_at: string;
};

type Banner = { category: string; pct: number; current: number; avg30: number };

const fmtR = (n: number) => `R${n.toFixed(0)}`;

const relTime = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 60) return `${Math.max(1, Math.round(diff))}m ago`;
  return `${Math.round(diff / 60)}h ago`;
};

const Label = ({ children, live }: { children: React.ReactNode; live?: boolean }) => (
  <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
    {children}
    {live && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
  </div>
);

export default function MarketPulse() {
  const { user, role } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [priceIdx, setPriceIdx] = useState<PriceIdx[]>([]);
  const [scarcity, setScarcity] = useState<Scarcity[]>([]);
  const [fresh, setFresh] = useState<FreshItem[]>([]);
  const [basket, setBasket] = useState<BasketRow[]>([]);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [tickerData, setTickerData] = useState<{ category: string; avg: number }[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Load lightweight ticker on mount for the collapsed view
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('category, price')
        .eq('is_active', true);
      if (!data) return;
      const map = new Map<string, { sum: number; n: number }>();
      for (const r of data as { category: string | null; price: number }[]) {
        if (!r.category) continue;
        const cur = map.get(r.category) || { sum: 0, n: 0 };
        cur.sum += Number(r.price);
        cur.n += 1;
        map.set(r.category, cur);
      }
      setTickerData(Array.from(map.entries()).map(([c, v]) => ({ category: c, avg: v.sum / v.n })));
    })();
  }, []);

  const loadAll = async () => {
    if (loaded || loading) return;
    setLoading(true);

    const now = Date.now();
    const d7 = new Date(now - 7 * 86400000).toISOString();
    const d14 = new Date(now - 14 * 86400000).toISOString();
    const d24h = new Date(now - 86400000).toISOString();
    const d30 = new Date(now - 30 * 86400000).toISOString();
    const d56 = new Date(now - 56 * 86400000).toISOString();

    const [profileRes, productsRes, freshRes, basketRes] = await Promise.all([
      user ? supabase.from('profiles').select('produce_preferences').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('products').select('id, name, price, category, farmer_id, created_at, stock_quantity, is_active').eq('is_active', true),
      supabase.from('products').select('id, name, price, category, farmer_id, created_at').eq('is_active', true).gte('created_at', d24h).order('created_at', { ascending: false }).limit(6),
      user
        ? supabase.from('order_items').select('price_at_purchase, quantity, products!inner(category), orders!inner(customer_id, created_at)').eq('orders.customer_id', user.id).gte('orders.created_at', d56)
        : Promise.resolve({ data: [] }),
    ]);

    const userPrefs: string[] = (profileRes.data as any)?.produce_preferences || [];
    setPrefs(userPrefs);

    // Panel 1 — Price Index
    const products = (productsRes.data || []) as ProductRow[];
    const catMap = new Map<string, { thisWk: number[]; lastWk: number[]; last30: number[] }>();
    for (const p of products) {
      if (!p.category) continue;
      const cur = catMap.get(p.category) || { thisWk: [], lastWk: [], last30: [] };
      if (p.created_at >= d7) cur.thisWk.push(Number(p.price));
      else if (p.created_at >= d14) cur.lastWk.push(Number(p.price));
      if (p.created_at >= d30) cur.last30.push(Number(p.price));
      catMap.set(p.category, cur);
    }
    const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    const idx: PriceIdx[] = [];
    for (const [cat, v] of catMap.entries()) {
      const tw = avg(v.thisWk);
      const lw = avg(v.lastWk);
      if (tw === 0) continue;
      idx.push({
        category: cat,
        this_week_avg: tw,
        pct_change: lw > 0 ? ((tw - lw) / lw) * 100 : null,
        avg30: avg(v.last30),
      });
    }
    setPriceIdx(idx);

    // Panel 2 — Scarcity
    const sMap = new Map<string, Set<string>>();
    for (const p of products) {
      if (!p.category) continue;
      const s = sMap.get(p.category) || new Set();
      s.add(p.farmer_id);
      sMap.set(p.category, s);
    }
    let scList: Scarcity[] = Array.from(sMap.entries()).map(([c, s]) => ({ category: c, seller_count: s.size }));
    if (userPrefs.length) scList = scList.filter(s => userPrefs.includes(s.category));
    else scList = scList.sort((a, b) => b.seller_count - a.seller_count).slice(0, 4);
    setScarcity(scList);

    // Panel 3 — Freshness Feed with farmer profiles
    const freshRaw = (freshRes.data || []) as Omit<FreshItem, 'farmer_name' | 'suburb'>[] & { farmer_id: string }[];
    const farmerIds = Array.from(new Set((freshRes.data || []).map((r: any) => r.farmer_id)));
    let profilesMap = new Map<string, { full_name: string; suburb: string | null }>();
    if (farmerIds.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name, suburb').in('user_id', farmerIds);
      for (const p of (profs || []) as any[]) profilesMap.set(p.user_id, { full_name: p.full_name, suburb: p.suburb });
    }
    setFresh(
      (freshRes.data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        category: r.category,
        created_at: r.created_at,
        farmer_name: profilesMap.get(r.farmer_id)?.full_name || 'Local farm',
        suburb: profilesMap.get(r.farmer_id)?.suburb || null,
      })),
    );

    // Panel 4 — Basket
    const basketRows: BasketRow[] = ((basketRes as any).data || []).map((r: any) => ({
      category: r.products?.category || 'Other',
      spent: Number(r.price_at_purchase) * Number(r.quantity),
      created_at: r.orders?.created_at,
    }));
    setBasket(basketRows);

    setLoaded(true);
    setLoading(false);
  };

  const toggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next) loadAll();
  };

  const banners = useMemo<Banner[]>(() => {
    if (!prefs.length) return [];
    const out: Banner[] = [];
    for (const p of priceIdx) {
      if (!prefs.includes(p.category)) continue;
      if (p.avg30 > 0 && p.this_week_avg < p.avg30 * 0.85) {
        const pct = ((p.avg30 - p.this_week_avg) / p.avg30) * 100;
        out.push({ category: p.category, pct, current: p.this_week_avg, avg30: p.avg30 });
      }
    }
    return out.slice(0, 3);
  }, [priceIdx, prefs]);

  // Only show for customer or admin
  if (role !== 'customer' && role !== 'admin') return null;

  const tickerText = tickerData.length
    ? tickerData.map(t => `${t.category} ${fmtR(t.avg)}`).join('  ·  ')
    : 'Live Helderberg pricing · refreshed daily';

  return (
    <div className="bg-card border-b">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-2 text-left"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest">Market Pulse</span>
        </span>
        <span className="flex-1 overflow-hidden">
          <span className="block whitespace-nowrap text-xs text-muted-foreground animate-marquee">
            {tickerText}  ·  {tickerText}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="pb-4 pt-2 px-4 space-y-4">
          {/* Price watch banners */}
          {banners.filter(b => !dismissed.includes(b.category)).map(b => (
            <div
              key={b.category}
              className="flex items-start justify-between gap-2 p-3 text-xs"
              style={{
                backgroundColor: 'hsl(142 71% 45% / 0.1)',
                borderLeft: '3px solid hsl(142 71% 45%)',
              }}
            >
              <span>
                💚 <strong>{b.category}</strong> is {b.pct.toFixed(0)}% cheaper than usual this week — {fmtR(b.current)} vs {fmtR(b.avg30)} avg
              </span>
              <button onClick={() => setDismissed(d => [...d, b.category])} aria-label="Dismiss">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Panel 1 */}
          <section>
            <Label>Produce Prices · This Week</Label>
            {loading && !priceIdx.length ? (
              <Skeleton className="h-8 w-full" />
            ) : priceIdx.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pricing data this week.</p>
            ) : (
              <div className="overflow-x-auto flex gap-2 pb-1">
                {priceIdx.map(p => {
                  const isWatched = prefs.includes(p.category);
                  return (
                    <div
                      key={p.category}
                      className="shrink-0 px-3 py-1.5 rounded-full border bg-card flex items-center gap-1.5"
                      style={isWatched ? { borderColor: 'hsl(37 53% 51%)' } : undefined}
                    >
                      <span className="text-xs font-medium">{p.category}</span>
                      <span className="text-xs font-bold">{fmtR(p.this_week_avg)}</span>
                      {p.pct_change === null ? (
                        <span className="text-xs font-medium" style={{ color: 'hsl(37 53% 51%)' }}>NEW</span>
                      ) : p.pct_change < -5 ? (
                        <span className="text-xs font-medium text-green-600 flex items-center">
                          <ArrowDown className="h-3 w-3" />{Math.abs(p.pct_change).toFixed(0)}% cheaper
                        </span>
                      ) : p.pct_change > 5 ? (
                        <span className="text-xs font-medium text-red-500 flex items-center">
                          <ArrowUp className="h-3 w-3" />{p.pct_change.toFixed(0)}% pricier
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">stable</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Panel 2 */}
          <section>
            <Label>Supply Signals · Your Preferences</Label>
            {loading && !scarcity.length ? (
              <Skeleton className="h-16 w-full" />
            ) : !prefs.length && scarcity.length === 0 ? (
              <p className="text-xs text-muted-foreground">Set your preferences in Profile to see personalised signals</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {scarcity.map(s => {
                  const tone =
                    s.seller_count >= 3
                      ? { color: 'bg-green-500', label: `${s.seller_count} sellers · abundant` }
                      : s.seller_count === 2
                      ? { color: 'bg-amber-500', label: '2 sellers · limited' }
                      : { color: 'bg-red-500', label: '1 seller · scarce · buy soon' };
                  return (
                    <div key={s.category} className="p-2 rounded border bg-card">
                      <div className="text-xs font-medium">{s.category}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className={`h-2 w-2 rounded-full inline-block mr-1 ${tone.color}`} />
                        {tone.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Panel 3 */}
          <section>
            <Label live>Just Listed · Last 24h</Label>
            {loading && !fresh.length ? (
              <Skeleton className="h-24 w-full" />
            ) : fresh.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">All quiet — check back later for fresh listings</p>
            ) : (
              <Card className="divide-y">
                {fresh.map(f => (
                  <Link to={`/product/${f.id}`} key={f.id} className="flex items-center justify-between py-2 px-3">
                    <div>
                      <div className="text-sm font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.farmer_name}{f.suburb ? ` · ${f.suburb}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{fmtR(f.price)}</div>
                      <div className="text-xs text-muted-foreground">{relTime(f.created_at)}</div>
                    </div>
                  </Link>
                ))}
              </Card>
            )}
          </section>

          {/* Panel 4 */}
          <BasketPanel rows={basket} loggedIn={!!user} loading={loading && !loaded} />
        </div>
      )}
    </div>
  );
}

function BasketPanel({ rows, loggedIn, loading }: { rows: BasketRow[]; loggedIn: boolean; loading: boolean }) {
  if (!loggedIn || (!loading && rows.length === 0)) {
    return (
      <section>
        <Label>My Basket · 8 Weeks</Label>
        <p className="text-xs text-muted-foreground">Your spending analytics appear here after your first order.</p>
      </section>
    );
  }
  if (loading) {
    return (
      <section>
        <Label>My Basket · 8 Weeks</Label>
        <Skeleton className="h-20 w-full" />
      </section>
    );
  }

  // Aggregate top 3 categories by total spend
  const totalByCat = new Map<string, number>();
  for (const r of rows) totalByCat.set(r.category, (totalByCat.get(r.category) || 0) + r.spent);
  const top3 = Array.from(totalByCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);

  const now = Date.now();
  const weeks: Record<string, number>[] = Array.from({ length: 8 }, () => ({}));
  for (const r of rows) {
    const ageDays = (now - new Date(r.created_at).getTime()) / 86400000;
    const wkIdx = 7 - Math.min(7, Math.floor(ageDays / 7));
    if (wkIdx < 0) continue;
    if (!top3.includes(r.category)) continue;
    weeks[wkIdx][r.category] = (weeks[wkIdx][r.category] || 0) + r.spent;
  }
  const chartData = weeks.map((w, i) => {
    const o: any = { week: i };
    for (const c of top3) o[c] = w[c] || 0;
    return o;
  });

  const colors = ['hsl(142 71% 45%)', 'hsl(37 53% 51%)', 'hsl(213 52% 45%)'];

  const topCat = top3[0];
  const topTotal = totalByCat.get(topCat) || 0;
  const monthMs = 30 * 86400000;
  const thisMonthTotal = rows.filter(r => now - new Date(r.created_at).getTime() <= monthMs).reduce((s, r) => s + r.spent, 0);
  const first4 = rows.filter(r => {
    const age = now - new Date(r.created_at).getTime();
    return age > 28 * 86400000 && age <= 56 * 86400000;
  }).reduce((s, r) => s + r.spent, 0);
  const last4 = rows.filter(r => now - new Date(r.created_at).getTime() <= 28 * 86400000).reduce((s, r) => s + r.spent, 0);
  const trendingUp = last4 > first4;

  return (
    <section>
      <Label>My Basket · 8 Weeks</Label>
      <div className="h-20 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <Tooltip
              contentStyle={{ fontSize: 11, padding: 4 }}
              formatter={(value: any, name: any) => [fmtR(Number(value)), name]}
            />
            {top3.map((c, i) => (
              <Area key={c} type="monotone" dataKey={c} stackId="1" stroke={colors[i]} fill={colors[i]} fillOpacity={0.5} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        <span className="px-2 py-1 rounded-full border text-xs">Most: {topCat} · {fmtR(topTotal)}</span>
        <span className="px-2 py-1 rounded-full border text-xs">This month: {fmtR(thisMonthTotal)}</span>
        <span
          className="px-2 py-1 rounded-full border text-xs font-medium"
          style={{ color: trendingUp ? 'hsl(37 53% 51%)' : 'hsl(142 71% 45%)' }}
        >
          {trendingUp ? '↑ spending up' : '↓ spending down'}
        </span>
      </div>
    </section>
  );
}
