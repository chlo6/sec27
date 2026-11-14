import { DEMO_EVENTS } from './data.js';
import { EXTRA_EVENTS } from './community-data.js';

export const PUBLIC_CALENDAR_URL = 'https://chlo6.github.io/sec27/opportunities.ics';
export const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl';
export const OPPORTUNITY_TIME_ZONE = 'America/Los_Angeles';

const encoder = new TextEncoder();
const pacific = new Intl.DateTimeFormat('en-CA', {
  timeZone: OPPORTUNITY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const utcStamp = milliseconds => new Date(milliseconds).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

function wallTime(milliseconds) {
  const parts = Object.fromEntries(pacific.formatToParts(milliseconds).map(part => [part.type, part.value]));
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
}

// Explicitly interpret seed times in California, independent of the build machine's zone.
// At fall-back, RFC 5545 selects the first occurrence. Reject nonexistent spring times
// so a future seed typo cannot quietly move an opportunity to another local time.
export function pacificDateTimeUTC(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) {
    throw new Error(`Invalid opportunity date/time: ${date} ${time}`);
  }
  const local = `${date}T${time.length === 5 ? `${time}:00` : time}`;
  const nominal = Date.parse(`${local}Z`);
  if (!Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0, 19) !== local) {
    throw new Error(`Invalid opportunity date/time: ${date} ${time}`);
  }
  const offsets = new Set([-86400000, 0, 86400000].map(delta => wallTime(nominal + delta) - (nominal + delta)));
  const candidates = [...offsets].map(offset => nominal - offset).filter(value => wallTime(value) === nominal);
  if (!candidates.length) throw new Error(`Nonexistent ${OPPORTUNITY_TIME_ZONE} time: ${local}`);
  return utcStamp(Math.min(...candidates));
}

export function escapeCalendarText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

// RFC 5545 folds at 75 octets, including the continuation space; never split UTF-8.
export function foldCalendarLine(line) {
  let result = '', current = '', length = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) {
      result += `${current}\r\n`;
      current = ' ';
      length = 1;
    }
    current += character;
    length += bytes;
  }
  return result + current;
}

function sourceTimestamp(event) {
  // Keep updatedAt/updatedDate current when editing published seed opportunities.
  // Rebuilding unchanged sources must not create a fresh revision on every deploy.
  const value = event.updatedAt || event.updatedDate || event.createdDate || event.date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return pacificDateTimeUTC(value, '00:00');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    const [date, time] = value.split('T');
    return pacificDateTimeUTC(date, time);
  }
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid published source timestamp: ${value}`);
  }
  return utcStamp(Date.parse(value));
}

// Pure serializer for trusted, published source records and test fixtures. Never pass
// browser state here: the deployed generator below uses only committed seed records.
export function renderOpportunityCalendar(events) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CivicShift//Fictional opportunities//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:CivicShift fictional demo opportunities',
    `X-WR-TIMEZONE:${OPPORTUNITY_TIME_ZONE}`,
    'X-WR-CALDESC:Fictional demo opportunities. Adding this calendar does not sign you up.',
  ];
  const seen = new Set();
  const published = events.filter(event => ['active', 'canceled', 'cancelled'].includes(event.status));
  for (const event of [...published].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    for (const shift of [...event.shifts].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id))) {
      if (!event.id || !shift.id) throw new Error('Published opportunities and shifts need stable IDs');
      const uid = `${encodeURIComponent(event.id)}/${encodeURIComponent(shift.id)}@civicshift.chlo6.github.io`;
      if (seen.has(uid)) throw new Error(`Duplicate opportunity shift UID: ${uid}`);
      seen.add(uid);
      const start = pacificDateTimeUTC(event.date, shift.start);
      // A shift whose end is earlier than its start continues into the next day.
      const endDate = shift.end < shift.start
        ? new Date(Date.parse(`${event.date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)
        : event.date;
      const end = pacificDateTimeUTC(endDate, shift.end);
      if (end <= start) throw new Error(`Opportunity shift must have a positive duration: ${uid}`);
      const modified = sourceTimestamp(event);
      const url = `https://chlo6.github.io/sec27/portal.html#/event/${encodeURIComponent(event.id)}`;
      const description = [
        'Fictional CivicShift demo opportunity. Adding this calendar does not sign you up.',
        event.description, `Organization: ${event.organization}`, `Shift: ${shift.name}`,
        `Times use ${OPPORTUNITY_TIME_ZONE}.`, `Review details and register in CivicShift: ${url}`,
      ].filter(Boolean).join('\n\n');
      lines.push(
        'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${modified}`, `LAST-MODIFIED:${modified}`,
        `DTSTART:${start}`, `DTEND:${end}`,
        `SUMMARY:${escapeCalendarText(`[Demo] ${event.title} — ${shift.name}`)}`,
        `DESCRIPTION:${escapeCalendarText(description)}`,
        `LOCATION:${escapeCalendarText([event.location, event.address].filter(Boolean).join(', '))}`,
        `URL:${url}`, `STATUS:${event.status === 'active' ? 'CONFIRMED' : 'CANCELLED'}`,
        'TRANSP:TRANSPARENT', 'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldCalendarLine).join('\r\n')}\r\n`;
}

// Deliberately accepts no state or user argument. The public artifact never reads
// localStorage, users, signups, attendance, messages, or other personal records.
export function publishedOpportunityCalendar() {
  return renderOpportunityCalendar([...DEMO_EVENTS, ...EXTRA_EVENTS]);
}
