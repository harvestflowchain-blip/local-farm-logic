export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  status: string;
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d{3}/g, '');
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateICSFile(events: CalendarEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HarvestFlow//Marketplace//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@harvestflow`,
      `DTSTART:${formatICSDate(event.start)}`,
      `DTEND:${formatICSDate(event.end)}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${escapeICS(event.description)}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
