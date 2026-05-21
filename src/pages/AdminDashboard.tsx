import Seo from '@/components/Seo';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Users, Megaphone, BarChart3, Shield, Trash2, ArrowLeft, ListTodo, ShoppingBasket, Sprout } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import PlatformTerminal from '@/components/admin/PlatformTerminal';

interface UserRow {
  user_id: string;
  full_name: string;
  suburb: string | null;
  created_at: string;
  role: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_role: string;
  is_active: boolean;
  created_at: string;
}

interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const AdminDashboard = () => {
  const { role, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTarget, setNewTarget] = useState('all');
  const [publishing, setPublishing] = useState(false);
  const [stats, setStats] = useState({ users: 0, farmers: 0, customers: 0, products: 0, orders: 0, harvestEntries: 0 });
  const [tab, setTab] = useState('users');
  const [monitoringActivated, setMonitoringActivated] = useState(false);

  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  const [allProducts, setAllProducts] = useState<Tables<'products'>[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [allHarvest, setAllHarvest] = useState<Tables<'harvest_entries'>[]>([]);
  const [harvestLoading, setHarvestLoading] = useState(true);

  // Map farmer_id → profile name for display
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && role !== 'admin') navigate('/');
  }, [role, authLoading]);

  useEffect(() => {
    if (role !== 'admin') return;
    Promise.all([fetchUsers(), fetchAnnouncements(), fetchStats(), fetchRequests(), fetchAllProducts(), fetchAllHarvest()]);
  }, [role]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    const [{ data: roles }, { data: profiles }] = await Promise.all([
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('profiles').select('user_id, full_name, suburb, created_at'),
    ]);
    if (roles && profiles) {
      const pMap: Record<string, any> = {};
      profiles.forEach((p) => { pMap[p.user_id] = p; });
      setProfileMap(Object.fromEntries(profiles.map(p => [p.user_id, p.full_name || '—'])));
      setUsers(roles.map((r) => ({
        user_id: r.user_id,
        role: r.role,
        full_name: pMap[r.user_id]?.full_name || '—',
        suburb: pMap[r.user_id]?.suburb || null,
        created_at: pMap[r.user_id]?.created_at || '',
      })));
    }
    setUsersLoading(false);
  };

  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements((data as Announcement[]) || []);
    setAnnouncementsLoading(false);
  };

  const fetchStats = async () => {
    const [{ count: userCount }, { count: productCount }, { count: orderCount }, { data: roleCounts }, { count: harvestCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('user_roles').select('role'),
      supabase.from('harvest_entries').select('*', { count: 'exact', head: true }),
    ]);
    const farmers = roleCounts?.filter((r) => r.role === 'farmer').length || 0;
    const customers = roleCounts?.filter((r) => r.role === 'customer').length || 0;
    setStats({ users: userCount || 0, farmers, customers, products: productCount || 0, orders: orderCount || 0, harvestEntries: harvestCount || 0 });
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    const { data } = await supabase.from('feature_requests').select('*').order('created_at', { ascending: false });
    setRequests((data as FeatureRequest[]) || []);
    setRequestsLoading(false);
  };

  const fetchAllProducts = async () => {
    setProductsLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setAllProducts(data || []);
    setProductsLoading(false);
  };

  const fetchAllHarvest = async () => {
    setHarvestLoading(true);
    const { data } = await supabase.from('harvest_entries').select('*').order('estimated_ready_date', { ascending: true });
    setAllHarvest(data || []);
    setHarvestLoading(false);
  };

  const publishAnnouncement = async () => {
    if (!newTitle || !newContent || !user) return;
    setPublishing(true);
    const { error } = await supabase.from('announcements').insert({
      title: newTitle, content: newContent, target_role: newTarget, created_by: user.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Announcement published' });
      setNewTitle('');
      setNewContent('');
      fetchAnnouncements();
    }
    setPublishing(false);
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    fetchAnnouncements();
  };

  const toggleAnnouncement = async (id: string, active: boolean) => {
    await supabase.from('announcements').update({ is_active: !active }).eq('id', id);
    fetchAnnouncements();
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('feature_requests').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  const updateRequestPriority = async (id: string, priority: string) => {
    const { error } = await supabase.from('feature_requests').update({ priority }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, priority } : r));
    }
  };

  const toggleProductActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from('products').update({ is_active: !currentActive }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setAllProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentActive } : p));
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setAllProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const deleteHarvestEntry = async (id: string) => {
    const { error } = await supabase.from('harvest_entries').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setAllHarvest(prev => prev.filter(h => h.id !== id));
    }
  };

  if (authLoading || role !== 'admin') return null;

  return (
    <div className="min-h-screen pb-20">
      <Seo
        title="Admin Console | Local Farm Logic"
        description="Internal admin tools for managing users, roles, announcements, and feature requests across the Local Farm Logic marketplace."
        path="/admin"
        noindex
      />
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Admin Console</h1>
          <Badge variant="outline" className="ml-auto text-xs"><Shield className="h-3 w-3 mr-1" />Admin</Badge>
        </div>
      </header>

      <main className="px-4 pt-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-6">
            <TabsTrigger value="monitoring" className="text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1" />Stats</TabsTrigger>
            <TabsTrigger value="users" className="text-xs"><Users className="h-3.5 w-3.5 mr-1" />Users</TabsTrigger>
            <TabsTrigger value="products" className="text-xs"><ShoppingBasket className="h-3.5 w-3.5 mr-1" />Products</TabsTrigger>
            <TabsTrigger value="harvest" className="text-xs"><Sprout className="h-3.5 w-3.5 mr-1" />Harvest</TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs"><Megaphone className="h-3.5 w-3.5 mr-1" />Broadcast</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs"><ListTodo className="h-3.5 w-3.5 mr-1" />Requests</TabsTrigger>
          </TabsList>

          {/* Stats — Platform Intelligence Terminal */}
          <TabsContent value="monitoring" className="pt-4">
            <PlatformTerminal
              active={tab === 'monitoring'}
              profileMap={profileMap}
              onNavigateUsers={() => setTab('users')}
            />
          </TabsContent>


          {/* Users */}
          <TabsContent value="users" className="pt-4 space-y-3">
            {usersLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : users.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">No users found.</p>
            ) : (
              users.map((u) => (
                <Card key={u.user_id} className="p-3 flex items-center justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.suburb || 'No location'} · {u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs shrink-0">{u.role}</Badge>
                </Card>
              ))
            )}
          </TabsContent>

          {/* All Products */}
          <TabsContent value="products" className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">All Products</h3>
              <Button variant="ghost" size="sm" onClick={fetchAllProducts} className="text-xs h-7">Refresh</Button>
            </div>
            {productsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : allProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No products.</p>
            ) : (
              allProducts.map((p) => (
                <Card key={p.id} className="p-3 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Farmer: {profileMap[p.farmer_id] || p.farmer_id.slice(0, 8)} · R{Number(p.price).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{p.is_active ? 'Active' : 'Hidden'}</span>
                        <Switch checked={p.is_active} onCheckedChange={() => toggleProductActive(p.id, p.is_active)} />
                      </div>
                      <button onClick={() => deleteProduct(p.id)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* All Harvest Entries */}
          <TabsContent value="harvest" className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">All Harvest Entries</h3>
              <Button variant="ghost" size="sm" onClick={fetchAllHarvest} className="text-xs h-7">Refresh</Button>
            </div>
            {harvestLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : allHarvest.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No harvest entries.</p>
            ) : (
              allHarvest.map((h) => (
                <Card key={h.id} className="p-3 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium">{h.crop_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Farmer: {profileMap[h.farmer_id] || h.farmer_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.planting_date || '—'} → {h.harvest_date || h.estimated_ready_date} · {Number(h.projected_yield_kg)}kg
                      </p>
                    </div>
                    <button onClick={() => deleteHarvestEntry(h.id)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Announcements */}
          <TabsContent value="announcements" className="pt-4 space-y-6">
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">New Broadcast</h3>
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Announcement title" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message</Label>
                <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Write your announcement..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Audience</Label>
                <Select value={newTarget} onValueChange={setNewTarget}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="customer">Consumers Only</SelectItem>
                    <SelectItem value="farmer">Farmers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={publishAnnouncement} disabled={publishing || !newTitle || !newContent} className="w-full">
                {publishing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Publish Announcement
              </Button>
            </Card>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Past Broadcasts</h3>
              {announcementsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No announcements yet.</p>
              ) : (
                announcements.map((a) => (
                  <Card key={a.id} className="p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant={a.is_active ? 'default' : 'secondary'} className="text-xs cursor-pointer" onClick={() => toggleAnnouncement(a.id, a.is_active)}>
                          {a.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <button onClick={() => deleteAnnouncement(a.id)} className="p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{a.target_role}</span>
                      <span>•</span>
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Feature Requests */}
          <TabsContent value="requests" className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Feature Requests Queue</h3>
              <Button variant="ghost" size="sm" onClick={fetchRequests} className="text-xs h-7">Refresh</Button>
            </div>
            {requestsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No feature requests yet.</p>
            ) : (
              requests.map((r) => (
                <Card key={r.id} className="p-3 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium">{r.title}</p>
                      {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={r.status} onValueChange={(v) => updateRequestStatus(r.id, v)}>
                      <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewing">Reviewing</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={r.priority} onValueChange={(v) => updateRequestPriority(r.id, v)}>
                      <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
