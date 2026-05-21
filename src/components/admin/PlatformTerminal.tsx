import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

type Order = { id: string; total: number; status: string; created_at: string; updated_at: string; farmer_id: string; customer_id: string; delivery_suburb: string | null };
type Product = { id: string; name: string; price: number; category: string | null; farmer_id: string; is_active: boolean; updated_at: string; stock_quantity: number };
type Harvest = { crop_name: string; farmer_id: string; estimated_ready_date: string; projected_yield_kg: number };
type FarmerRole = { user_id: string };

interface Props {
  active: boolean;
  profileMap: Record<string, string>;
  onNavigateUsers: () => void;
}

const GOLD = 'hsl(37 53% 51%)';
const GREEN = 'hsl(142 71% 45%)';
const RED = 'hsl(0 84% 60%)';
const ORANGE = 'hsl(25 95% 53%)';
const BLUE = 'hsl(213 52% 45%)';

const fmtR = (n: number) => `R${Math.round(n).toLocaleString()}`;
const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const relDays = (iso: string) => {
  const d = daysAgo(iso);
  if (d === 0) return 'today';
  return `${d}d ago`;
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: GOLD }}>{children}</div>
);


export default function PlatformTerminal({ active, profileMap, onNavigateUsers }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [farmerRoles, setFarmerRoles] = useState<FarmerRole[]>([]);
  const [farmerProfiles, setFarmerProfiles] = useState<{ user_id: string; suburb: string | null }[]>([]);
  const [harvest, setHarvest] = useState<Harvest[]>([]);
  const [farmerSort, setFarmerSort] = useState<'gmv' | 'fulfilment' | 'last'>('gmv');
  const [expandAnomalies, setExpandAnomalies] = useState(false);
  const [weeklyGmv, setWeeklyGmv] = useState<{ week: number; gmv: number; order_count: number; ts: number }[]>([]);
  const [cohorts, setCohorts] = useState({ newB: 0, returning: 0, atRisk: 0, rate: 0 });

  useEffect(() => {
    if (!active || loaded || loading) return;
    (async () => {
      setLoading(true);
      const [ordersRes, productsRes, rolesRes, profilesRes, harvestRes, gmvRes, cohortsRes] = await Promise.all([
        supabase.from('orders').select('id, total, status, created_at, updated_at, farmer_id, customer_id, delivery_suburb'),
        supabase.from('products').select('id, name, price, category, farmer_id, is_active, updated_at, stock_quantity'),
        supabase.from('user_roles').select('user_id').eq('role', 'farmer'),
        supabase.from('profiles').select('user_id, suburb'),
        supabase.from('harvest_entries').select('crop_name, farmer_id, estimated_ready_date, projected_yield_kg').gte('estimated_ready_date', new Date().toISOString().slice(0, 10)),
        (supabase as any).rpc('admin_weekly_gmv'),
        (supabase as any).rpc('admin_buyer_cohorts'),
      ]);
      setOrders((ordersRes.data as any) || []);
      setProducts((productsRes.data as any) || []);
      setFarmerRoles((rolesRes.data as any) || []);
      setFarmerProfiles((profilesRes.data as any) || []);
      setHarvest((harvestRes.data as any) || []);
      const gmvRows = (gmvRes.data as any[]) || [];
      // RPC returns DESC; reverse to oldest-first for the chart
      setWeeklyGmv(
        gmvRows
          .slice()
          .reverse()
          .map((r: any) => ({
            week: Number(r.week_index),
            gmv: Number(r.gmv) || 0,
            order_count: Number(r.order_count) || 0,
            ts: new Date(r.week_start).getTime(),
          }))
      );
      const c = (cohortsRes.data as any[])?.[0];
      if (c) {
        setCohorts({
          newB: Number(c.new_this_week) || 0,
          returning: Number(c.returning_this_week) || 0,
          atRisk: Number(c.at_risk) || 0,
          rate: Number(c.retention_rate) || 0,
        });
      }
      setLoaded(true);
      setLoading(false);
    })();
  }, [active, loaded, loading]);

  const now = Date.now();
  const wkAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;

  // Anomalies
  const anomalies = useMemo(() => {
    const out: { type: string; color: string; text: string; ctx: string }[] = [];
    // Stale orders
    for (const o of orders) {
      if (o.status === 'placed' && now - new Date(o.created_at).getTime() > 48 * 3600000) {
        out.push({ type: 'stale', color: GOLD, text: `Stale order ${fmtR(Number(o.total))} · ${o.delivery_suburb || 'unknown'} · ${daysAgo(o.created_at)}d unconfirmed`, ctx: relDays(o.created_at) });
      }
    }
    // Inactive farmers
    const productByFarmer = new Map<string, Product[]>();
    products.forEach(p => {
      const arr = productByFarmer.get(p.farmer_id) || [];
      arr.push(p);
      productByFarmer.set(p.farmer_id, arr);
    });
    for (const fr of farmerRoles) {
      const ps = productByFarmer.get(fr.user_id) || [];
      const active = ps.filter(p => p.is_active);
      const lastUpd = ps.reduce((m, p) => Math.max(m, new Date(p.updated_at).getTime()), 0);
      const inactiveDays = lastUpd ? Math.floor((now - lastUpd) / 86400000) : 999;
      if (active.length === 0 && inactiveDays > 14) {
        out.push({ type: 'ghost', color: RED, text: `Farmer ${profileMap[fr.user_id] || fr.user_id.slice(0, 8)} has 0 active listings · ${inactiveDays === 999 ? 'never' : inactiveDays + 'd'} inactive`, ctx: '' });
      }
    }
    // Price outliers
    const catAvg = new Map<string, number>();
    const catGroups = new Map<string, number[]>();
    products.filter(p => p.is_active && p.category).forEach(p => {
      const a = catGroups.get(p.category!) || [];
      a.push(Number(p.price));
      catGroups.set(p.category!, a);
    });
    catGroups.forEach((arr, c) => catAvg.set(c, arr.reduce((s, x) => s + x, 0) / arr.length));
    products.filter(p => p.is_active && p.category).forEach(p => {
      const avg = catAvg.get(p.category!) || 0;
      if (avg > 0 && Number(p.price) > avg * 3) {
        out.push({ type: 'outlier', color: ORANGE, text: `${p.name} priced at ${fmtR(Number(p.price))} vs ${fmtR(avg)} ${p.category} avg`, ctx: '' });
      }
    });
    // Cancellation spike
    const wkOrders = orders.filter(o => new Date(o.created_at).getTime() >= wkAgo);
    const wkCancelled = wkOrders.filter(o => o.status === 'cancelled');
    if (wkOrders.length > 0) {
      const rate = wkCancelled.length / wkOrders.length;
      if (rate > 0.15) {
        out.push({ type: 'cancel', color: RED, text: `Cancellation rate ${(rate * 100).toFixed(0)}% this week · above 15% threshold`, ctx: `${wkCancelled.length}/${wkOrders.length}` });
      }
    }
    return out;
  }, [orders, products, farmerRoles, profileMap]);

  // Health Score
  const healthScore = useMemo(() => {
    let score = 0;
    score += Math.min(6, anomalies.filter(a => a.type === 'stale').length * 2);
    score += Math.min(4, anomalies.filter(a => a.type === 'ghost').length);
    // supply gaps
    const sellerByCat = new Map<string, Set<string>>();
    products.filter(p => p.is_active && p.category).forEach(p => {
      const s = sellerByCat.get(p.category!) || new Set();
      s.add(p.farmer_id);
      sellerByCat.set(p.category!, s);
    });
    const monopolies = Array.from(sellerByCat.values()).filter(s => s.size === 1).length;
    score += Math.min(4, monopolies * 2);
    score += Math.min(3, anomalies.filter(a => a.type === 'outlier').length);
    if (anomalies.some(a => a.type === 'cancel')) score += 3;
    return score;
  }, [anomalies, products]);

  const healthBadge =
    healthScore <= 2 ? { color: GREEN, label: 'HEALTHY' } : healthScore <= 6 ? { color: GOLD, label: 'MONITOR' } : { color: RED, label: 'CRITICAL' };

  // GMV
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayGmv = orders.filter(o => new Date(o.created_at) >= todayStart && o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const weekGmv = orders.filter(o => new Date(o.created_at).getTime() >= wkAgo && o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const activeFarmerCount = new Set(products.filter(p => p.is_active).map(p => p.farmer_id)).size;
  const activeProductCount = products.filter(p => p.is_active).length;
  const tickerText = `TODAY ${fmtR(todayGmv)} · 7-DAY ${fmtR(weekGmv)} · ${orders.length} ORDERS · ${activeFarmerCount} ACTIVE FARMERS · ${activeProductCount} LIVE LISTINGS`;

  // Weekly GMV chart + cohorts now come from server-side RPCs (see useEffect above)
  const total8wk = weeklyGmv.reduce((s, w) => s + w.gmv, 0);
  const wow = weeklyGmv.length >= 2 && weeklyGmv[weeklyGmv.length - 2].gmv > 0
    ? ((weeklyGmv[weeklyGmv.length - 1].gmv - weeklyGmv[weeklyGmv.length - 2].gmv) / weeklyGmv[weeklyGmv.length - 2].gmv) * 100
    : 0;

  // Farmer health
  const farmerHealth = useMemo(() => {
    const rows = farmerRoles.map(fr => {
      const ps = products.filter(p => p.farmer_id === fr.user_id);
      const activeListings = ps.filter(p => p.is_active).length;
      const fOrders = orders.filter(o => o.farmer_id === fr.user_id && new Date(o.created_at).getTime() >= monthAgo);
      const fulfilled = fOrders.filter(o => ['completed', 'ready', 'out-for-delivery'].includes(o.status)).length;
      const fulfilment = fOrders.length > 0 ? (fulfilled / fOrders.length) * 100 : null;
      const lastP = ps.reduce((m, p) => Math.max(m, new Date(p.updated_at).getTime()), 0);
      const lastO = orders.filter(o => o.farmer_id === fr.user_id).reduce((m, o) => Math.max(m, new Date(o.updated_at).getTime()), 0);
      const lastActive = Math.max(lastP, lastO);
      const lastActiveDays = lastActive ? Math.floor((now - lastActive) / 86400000) : 999;
      const gmv = fOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
      return {
        id: fr.user_id,
        name: (profileMap[fr.user_id] || fr.user_id.slice(0, 8)).slice(0, 14),
        listings: activeListings,
        orders: fOrders.length,
        fulfilment,
        gmv,
        lastActive,
        lastActiveDays,
      };
    });
    rows.sort((a, b) => {
      if (farmerSort === 'gmv') return b.gmv - a.gmv;
      if (farmerSort === 'fulfilment') return (b.fulfilment ?? -1) - (a.fulfilment ?? -1);
      return (b.lastActive || 0) - (a.lastActive || 0);
    });
    return rows;
  }, [farmerRoles, products, orders, profileMap, farmerSort]);

  // Supply Concentration
  const concentration = useMemo(() => {
    const map = new Map<string, { sellers: Set<string>; count: number }>();
    products.filter(p => p.is_active && p.category).forEach(p => {
      const cur = map.get(p.category!) || { sellers: new Set(), count: 0 };
      cur.sellers.add(p.farmer_id);
      cur.count += 1;
      map.set(p.category!, cur);
    });
    return Array.from(map.entries())
      .map(([category, v]) => ({ category, seller_count: v.sellers.size, listing_count: v.count }))
      .sort((a, b) => a.seller_count - b.seller_count);
  }, [products]);

  // Suburb gap
  const suburbGap = useMemo(() => {
    const demand = new Map<string, number>();
    orders.filter(o => new Date(o.created_at).getTime() >= monthAgo && o.delivery_suburb).forEach(o => {
      demand.set(o.delivery_suburb!, (demand.get(o.delivery_suburb!) || 0) + 1);
    });
    const farmerById = new Set(farmerRoles.map(f => f.user_id));
    const supply = new Map<string, number>();
    farmerProfiles.filter(p => p.suburb && farmerById.has(p.user_id)).forEach(p => {
      supply.set(p.suburb!, (supply.get(p.suburb!) || 0) + 1);
    });
    return Array.from(demand.entries())
      .map(([suburb, order_count]) => {
        const farmer_count = supply.get(suburb) || 0;
        return { suburb, order_count, farmer_count, gap: order_count / Math.max(farmer_count, 1) };
      })
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 8);
  }, [orders, farmerRoles, farmerProfiles]);

  // Harvest pipeline
  const pipeline = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weeks: { label: string; entries: Harvest[]; totalKg: number }[] = [
      { label: 'This Week', entries: [], totalKg: 0 },
      { label: 'Next Week', entries: [], totalKg: 0 },
      { label: 'Week 3', entries: [], totalKg: 0 },
      { label: 'Week 4', entries: [], totalKg: 0 },
    ];
    harvest.forEach(h => {
      const d = new Date(h.estimated_ready_date);
      const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
      if (diff < 0 || diff > 30) return;
      const wk = Math.min(3, Math.floor(diff / 7));
      weeks[wk].entries.push(h);
      weeks[wk].totalKg += Number(h.projected_yield_kg);
    });
    const totalKg = weeks.reduce((s, w) => s + w.totalKg, 0);
    const totalCrops = weeks.reduce((s, w) => s + w.entries.length, 0);
    return { weeks, totalKg, totalCrops };
  }, [harvest]);

  return (
    <div className="rounded-lg bg-background p-4 space-y-4 text-foreground">
      {/* Header */}
      <Card className="p-4 space-y-3 bg-card border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>Platform Status</span>
          {loading && !loaded ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: healthBadge.color.replace(')', ' / 0.15)'), color: healthBadge.color }}
            >
              {healthBadge.label} · {healthScore}
            </span>
          )}
        </div>
        <div className="overflow-hidden">
          <div className="whitespace-nowrap text-xs font-mono text-muted-foreground animate-marquee">
            {loaded ? `${tickerText}  ·  ${tickerText}` : 'Loading market signals…'}
          </div>
        </div>
      </Card>

      {/* Anomaly Feed */}
      <Card className="p-4 bg-card border-border">
        <SectionLabel>Anomaly Feed · Live</SectionLabel>
        {loading && !loaded ? (
          <Skeleton className="h-24 w-full" />
        ) : anomalies.length === 0 ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: GREEN }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GREEN }} />
            No anomalies detected — platform operating normally
          </div>
        ) : (
          <div>
            {(expandAnomalies ? anomalies : anomalies.slice(0, 10)).map((a, i) => (
              <div key={i} className="py-2 border-b border-border flex items-start gap-2">
                <span className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-sm flex-1">{a.text}</span>
                {a.ctx && <span className="text-xs text-muted-foreground">{a.ctx}</span>}
              </div>
            ))}
            {!expandAnomalies && anomalies.length > 10 && (
              <button onClick={() => setExpandAnomalies(true)} className="mt-2 text-xs" style={{ color: GOLD }}>
                + {anomalies.length - 10} more anomalies
              </button>
            )}
          </div>
        )}
      </Card>

      {/* GMV + Cohorts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>GMV · 8 Weeks</SectionLabel>
            <span className="text-sm font-bold">{fmtR(total8wk)}</span>
          </div>
          {loading && !loaded ? (
            <Skeleton className="h-[120px] w-full" />
          ) : (
            <>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyGmv}>
                    <Tooltip
                      contentStyle={{ fontSize: 11, padding: 4, background: 'hsl(0 0% 10%)', border: '1px solid hsl(0 0% 20%)' }}
                      formatter={(v: any, name: any) => name === 'gmv' ? [fmtR(Number(v)), 'GMV'] : [v, 'Orders']}
                    />
                    <Bar dataKey="gmv" fill={GOLD} fillOpacity={0.6} />
                    <Line dataKey="order_count" stroke={GREEN} dot={false} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs mt-1" style={{ color: wow >= 0 ? GREEN : RED }}>
                {wow >= 0 ? '↑' : '↓'} {Math.abs(wow).toFixed(0)}% vs last week
              </div>
            </>
          )}
        </Card>

        <Card className="p-4 bg-card border-border">
          <SectionLabel>Buyer Cohorts · Platform</SectionLabel>
          {loading && !loaded ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div>
              {[
                { label: 'NEW THIS WEEK', value: cohorts.newB, color: BLUE },
                { label: 'RETURNING', value: cohorts.returning, color: GREEN },
                { label: 'AT RISK (21d gap)', value: cohorts.atRisk, color: GOLD },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm py-1.5 border-b border-border">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.label}
                  </span>
                  <span className="font-bold">{r.value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-muted-foreground">RETENTION RATE</span>
                <span className="font-bold" style={{ color: cohorts.rate > 60 ? GREEN : cohorts.rate >= 40 ? GOLD : RED }}>
                  {cohorts.rate.toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Farmer Health */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between">
          <SectionLabel>Farmer Health · This Month</SectionLabel>
          <button
            onClick={() => setFarmerSort(s => s === 'gmv' ? 'fulfilment' : s === 'fulfilment' ? 'last' : 'gmv')}
            className="text-xs text-muted-foreground"
          >
            Sort: {farmerSort === 'gmv' ? 'GMV' : farmerSort === 'fulfilment' ? 'Fulfilment' : 'Last Active'} ↓
          </button>
        </div>
        {loading && !loaded ? (
          <Skeleton className="h-32 w-full" />
        ) : farmerHealth.length === 0 ? (
          <p className="text-xs text-muted-foreground">No farmers.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground text-left">
                  <tr>
                    <th className="py-1.5 pr-2">FARMER</th>
                    <th className="py-1.5 pr-2">LIST</th>
                    <th className="py-1.5 pr-2">ORD</th>
                    <th className="py-1.5 pr-2">FULFIL</th>
                    <th className="py-1.5 pr-2">GMV</th>
                    <th className="py-1.5 pr-2">LAST</th>
                    <th className="py-1.5">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {farmerHealth.slice(0, 10).map(f => {
                    const fulfilBadge = f.fulfilment === null ? { color: 'text-muted-foreground', label: '—' }
                      : f.fulfilment >= 80 ? { color: GREEN, label: 'STRONG' }
                      : f.fulfilment >= 50 ? { color: GOLD, label: 'FAIR' }
                      : { color: RED, label: 'WEAK' };
                    const status = f.listings === 0 || f.lastActiveDays > 14
                      ? { color: RED, label: 'Ghost' }
                      : f.lastActiveDays > 7
                      ? { color: GOLD, label: 'Slow' }
                      : { color: GREEN, label: 'Active' };
                    return (
                      <tr key={f.id} className="border-b border-border">
                        <td className="py-1.5 pr-2 font-medium">{f.name}</td>
                        <td className="py-1.5 pr-2" style={f.listings === 0 ? { color: RED } : undefined}>{f.listings}</td>
                        <td className="py-1.5 pr-2">{f.orders}</td>
                        <td className="py-1.5 pr-2">
                          <span style={{ color: fulfilBadge.color }} className="font-medium">{fulfilBadge.label}</span>
                        </td>
                        <td className="py-1.5 pr-2 font-mono">{fmtR(f.gmv)}</td>
                        <td className="py-1.5 pr-2" style={f.lastActiveDays > 14 ? { color: RED } : undefined}>
                          {f.lastActive ? `${f.lastActiveDays}d ago` : '—'}
                        </td>
                        <td className="py-1.5">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
                            <span style={{ color: status.color }}>{status.label}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {farmerHealth.length > 10 && (
              <button onClick={onNavigateUsers} className="mt-3 text-xs" style={{ color: GOLD }}>
                View all {farmerHealth.length} farmers →
              </button>
            )}
          </>
        )}
      </Card>

      {/* Concentration + Suburb gap */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 bg-card border-border">
          <SectionLabel>Supply Concentration · By Category</SectionLabel>
          {loading && !loaded ? (
            <Skeleton className="h-32 w-full" />
          ) : concentration.length === 0 ? (
            <p className="text-xs text-muted-foreground">No categories.</p>
          ) : (
            concentration.map(c => {
              const b = c.seller_count === 1 ? { color: RED, label: 'MONOPOLY RISK' }
                : c.seller_count === 2 ? { color: GOLD, label: 'CONCENTRATED' }
                : { color: GREEN, label: 'COMPETITIVE' };
              return (
                <div key={c.category} className="flex items-center justify-between py-1.5 border-b border-border text-sm">
                  <span className="font-medium">{c.category}</span>
                  <span className="text-xs text-muted-foreground">{c.listing_count} listings · {c.seller_count} sellers</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: b.color.replace(')', ' / 0.15)'), color: b.color }}>
                    {b.label}
                  </span>
                </div>
              );
            })
          )}
        </Card>

        <Card className="p-4 bg-card border-border">
          <SectionLabel>Suburb Demand Gap · 30 Days</SectionLabel>
          {loading && !loaded ? (
            <Skeleton className="h-32 w-full" />
          ) : suburbGap.length === 0 ? (
            <p className="text-xs text-muted-foreground">No suburb activity in last 30 days.</p>
          ) : (
            suburbGap.map(s => {
              const b = s.gap > 10 ? { color: RED, label: 'UNDERSERVED' }
                : s.gap >= 5 ? { color: GOLD, label: 'TIGHT' }
                : { color: GREEN, label: 'BALANCED' };
              return (
                <div key={s.suburb} className="flex items-center justify-between py-1.5 border-b border-border text-sm">
                  <span className="font-medium">{s.suburb}</span>
                  <span className="text-xs text-muted-foreground">{s.order_count} orders · {s.farmer_count} farmers</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: b.color.replace(')', ' / 0.15)'), color: b.color }}>
                    {b.label}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {/* Harvest Pipeline */}
      <Card className="p-4 bg-card border-border">
        <SectionLabel>Harvest Pipeline · Next 30 Days</SectionLabel>
        {loading && !loaded ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="overflow-x-auto flex gap-3 pb-2">
              {pipeline.weeks.map(w => (
                <div key={w.label} className="min-w-[140px] flex-1">
                  <div className="text-xs font-semibold uppercase mb-1">{w.label}</div>
                  <div className="text-sm font-bold mb-2" style={{ color: GOLD }}>{w.totalKg}kg</div>
                  {w.entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nothing scheduled</p>
                  ) : (
                    w.entries.map((e, i) => (
                      <div key={i} className="p-2 rounded border border-border bg-muted mb-1">
                        <div className="text-xs font-medium">{e.crop_name}</div>
                        <div className="text-xs text-muted-foreground">{Number(e.projected_yield_kg)}kg</div>
                        <div className="text-xs text-muted-foreground truncate">{profileMap[e.farmer_id] || e.farmer_id.slice(0, 8)}</div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground text-center mt-2">
              {pipeline.totalKg}kg across {pipeline.totalCrops} crops entering market in next 30 days
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
