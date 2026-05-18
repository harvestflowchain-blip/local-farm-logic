import Seo from '@/components/Seo';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar as CalendarIcon, Download, Lock, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateICSFile, type CalendarEvent } from '@/lib/calendar';

const Calendar = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchEvents();
  }, [user, role]);

  const fetchEvents = async () => {
    if (!user) return;

    if (role === 'farmer') {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name))')
        .eq('farmer_id', user.id)
        .in('status', ['placed', 'confirmed', 'harvested', 'preparing', 'ready', 'out-for-delivery'])
        .order('created_at', { ascending: false });

      const mapped: CalendarEvent[] = (data || []).map(order => {
        const items = (order.order_items || []) as any[];
        const summary = items.map((i: any) => `${i.products?.name} ×${i.quantity}`).join(', ');
        return {
          id: order.id,
          title: `Order: ${summary || 'Items'}`,
          description: `Status: ${order.status}\nDelivery to: ${order.delivery_suburb || 'Pickup'}\nTotal: R${Number(order.total).toFixed(2)}`,
          start: new Date(order.created_at),
          end: new Date(new Date(order.created_at).getTime() + 2 * 60 * 60 * 1000),
          status: order.status,
        };
      });
      setEvents(mapped);
    } else {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name))')
        .eq('customer_id', user.id)
        .in('status', ['placed', 'confirmed', 'preparing', 'ready', 'out-for-delivery'])
        .order('created_at', { ascending: false });

      const mapped: CalendarEvent[] = (data || []).map(order => {
        const items = (order.order_items || []) as any[];
        const summary = items.map((i: any) => `${i.products?.name} ×${i.quantity}`).join(', ');
        return {
          id: order.id,
          title: `Delivery: ${summary || 'Items'}`,
          description: `Status: ${order.status}\nTotal: R${Number(order.total).toFixed(2)}`,
          start: new Date(order.created_at),
          end: new Date(new Date(order.created_at).getTime() + 2 * 60 * 60 * 1000),
          status: order.status,
        };
      });
      setEvents(mapped);
    }
    setLoading(false);
  };

  const exportToGoogleCalendar = (event: CalendarEvent) => {
    const start = event.start.toISOString().replace(/-|:|\.\d{3}/g, '');
    const end = event.end.toISOString().replace(/-|:|\.\d{3}/g, '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.description)}`;
    window.open(url, '_blank');
  };

  const exportAllICS = () => {
    if (events.length === 0) return;
    const ics = generateICSFile(events);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'harvestflow-schedule.ics';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Calendar exported', description: 'Import the .ics file into any calendar app.' });
  };

  const comingSoonCalendars = [
    { name: 'Apple Calendar', icon: '🍎' },
    { name: 'Outlook', icon: '📧' },
    { name: 'Notion Calendar', icon: '📝' },
  ];

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold tracking-tight">Calendar</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6">
        {/* Google Calendar Export */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <h2 className="text-sm font-semibold">Google Calendar</h2>
            <Badge variant="default" className="text-xs ml-auto">Available</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Export your {role === 'farmer' ? 'delivery/pickup schedules' : 'delivery times'} to Google Calendar</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportAllICS} disabled={events.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export .ics
            </Button>
          </div>
        </Card>

        {/* Coming Soon */}
        {comingSoonCalendars.map(cal => (
          <Card key={cal.name} className="p-4 space-y-2 opacity-60">
            <div className="flex items-center gap-2">
              <span className="text-lg">{cal.icon}</span>
              <h2 className="text-sm font-semibold">{cal.name}</h2>
              <Badge variant="secondary" className="text-xs ml-auto">Coming Soon</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Integration coming soon. Stay tuned!</p>
          </Card>
        ))}

        {/* Events List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Upcoming {role === 'farmer' ? 'Orders' : 'Deliveries'} ({events.length})
          </h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : events.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No upcoming events to display.</p>
          ) : (
            events.map(event => (
              <Card key={event.id} className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.start.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">{event.status}</Badge>
                </div>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => exportToGoogleCalendar(event)}>
                  <CalendarIcon className="h-3 w-3 mr-1" /> Add to Google Calendar
                </Button>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Calendar;
