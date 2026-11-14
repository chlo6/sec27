import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEMO_EVENTS, DEMO_USERS } from '../dist/data.js';
import { EXTRA_EVENTS } from '../dist/community-data.js';
import {
  PUBLIC_CALENDAR_URL, GOOGLE_CALENDAR_URL, escapeCalendarText, foldCalendarLine,
  pacificDateTimeUTC, publishedOpportunityCalendar, renderOpportunityCalendar,
} from '../dist/opportunity-feed.js';

const unfold = text => text.replace(/\r\n[ \t]/g, '');
const entries = text => unfold(text).match(/BEGIN:VEVENT\r\n[\s\S]*?END:VEVENT/g) || [];
const value = (entry, key) => entry.match(new RegExp(`^${key}:(.*)$`, 'm'))?.[1].replace(/\r$/, '');
const seeds = [...DEMO_EVENTS, ...EXTRA_EVENTS];

test('published feed contains every committed shift once on its original date', () => {
  const feed = publishedOpportunityCalendar();
  const records = entries(feed);
  assert.equal(records.length, seeds.reduce((count, event) => count + event.shifts.length, 0));
  assert.equal(records.length, 14);
  assert.equal(new Set(records.map(entry => value(entry, 'UID'))).size, records.length);
  for (const event of seeds) for (const shift of event.shifts) {
    const uid = `${event.id}/${shift.id}@civicshift.chlo6.github.io`;
    const entry = records.find(record => value(record, 'UID') === uid);
    assert.ok(entry, uid);
    assert.equal(value(entry, 'DTSTART'), pacificDateTimeUTC(event.date, shift.start));
    assert.equal(value(entry, 'DTEND'), pacificDateTimeUTC(event.date, shift.end));
    assert.equal(value(entry, 'URL'), `https://chlo6.github.io/sec27/portal.html#/event/${event.id}`);
    assert.equal(value(entry, 'TRANSP'), 'TRANSPARENT');
    assert.match(value(entry, 'SUMMARY'), /^\[Demo\]/);
    assert.match(value(entry, 'DESCRIPTION'), /Adding this calendar does not sign you up/);
  }
  assert.equal(PUBLIC_CALENDAR_URL, 'https://chlo6.github.io/sec27/opportunities.ics');
  assert.equal(GOOGLE_CALENDAR_URL, 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl');
});

test('California times convert to UTC across DST without using the host timezone', () => {
  assert.equal(pacificDateTimeUTC('2026-10-17', '08:00'), '20261017T150000Z');
  assert.equal(pacificDateTimeUTC('2026-11-01', '11:00'), '20261101T190000Z');
  assert.equal(pacificDateTimeUTC('2026-11-12', '17:00'), '20261113T010000Z');
  assert.equal(pacificDateTimeUTC('2026-03-08', '01:30'), '20260308T093000Z');
  assert.equal(pacificDateTimeUTC('2026-03-08', '03:30'), '20260308T103000Z');
  assert.equal(pacificDateTimeUTC('2026-11-01', '01:30'), '20261101T083000Z');
  assert.equal(pacificDateTimeUTC('2026-11-01', '02:30'), '20261101T103000Z');
  assert.throws(() => pacificDateTimeUTC('2026-03-08', '02:30'), /Nonexistent/);
  assert.throws(() => pacificDateTimeUTC('2026-02-30', '09:00'), /Invalid/);
  assert.throws(() => pacificDateTimeUTC('2026-10-17', '25:00'), /Invalid/);
});

test('text escaping prevents property injection and UTF-8 folds stay within 75 octets', () => {
  assert.equal(escapeCalendarText('a\\b,c;d\r\nATTENDEE:secret\re'), 'a\\\\b\\,c\\;d\\nATTENDEE:secret\\ne');
  const line = `DESCRIPTION:${'🌱 Café; 社区, '.repeat(30)}`;
  const folded = foldCalendarLine(line);
  assert.equal(unfold(folded), line);
  for (const physicalLine of folded.split('\r\n')) {
    assert.ok(Buffer.byteLength(physicalLine, 'utf8') <= 75);
    assert.doesNotMatch(physicalLine, /\uFFFD/);
  }
  const fixture = structuredClone(DEMO_EVENTS[0]);
  fixture.title = 'Garden\r\nATTENDEE:injected';
  fixture.description = '🌱 Café; 社区, '.repeat(30);
  const feed = renderOpportunityCalendar([fixture]);
  assert.doesNotMatch(feed, /(?<!\r)\n|\r(?!\n)/);
  assert.doesNotMatch(unfold(feed), /^ATTENDEE:/m);
  assert.ok(feed.endsWith('END:VCALENDAR\r\n'));
  for (const physicalLine of feed.split('\r\n')) assert.ok(Buffer.byteLength(physicalLine, 'utf8') <= 75);
});

test('UIDs survive edits and cancellation; unpublished records never enter the feed', () => {
  const original = structuredClone(DEMO_EVENTS[0]);
  const revised = structuredClone(original);
  revised.title = 'Updated public title';
  revised.date = '2026-10-18';
  revised.status = 'canceled';
  revised.updatedAt = '2026-10-11T12:15:00-07:00';
  const before = entries(renderOpportunityCalendar([original]));
  const after = entries(renderOpportunityCalendar([revised]));
  assert.deepEqual(before.map(entry => value(entry, 'UID')), after.map(entry => value(entry, 'UID')));
  for (const entry of after) {
    assert.equal(value(entry, 'STATUS'), 'CANCELLED');
    assert.equal(value(entry, 'LAST-MODIFIED'), '20261011T191500Z');
  }
  for (const status of ['draft', 'hidden', 'pending', 'deleted']) {
    assert.equal(entries(renderOpportunityCalendar([{ ...original, status }])).length, 0);
  }
  assert.throws(() => renderOpportunityCalendar([original, original]), /Duplicate/);
});

test('public generation ignores personal browser records and serializes only public event fields', () => {
  const fakeBrowserState = { events: [{ title: 'Private opportunity' }], signups: [{ studentId: 'Private person' }] };
  const feed = publishedOpportunityCalendar(fakeBrowserState);
  assert.equal(feed, publishedOpportunityCalendar());
  assert.doesNotMatch(feed, /Private opportunity|Private person|ATTENDEE:|BEGIN:VALARM|ORGANIZER:/);
  for (const user of DEMO_USERS.filter(user => user.role === 'student')) {
    for (const field of ['name', 'email', 'birthDate', 'emergencyContact']) assert.ok(!feed.includes(user[field]));
  }
  const fixture = {
    ...structuredClone(DEMO_EVENTS[0]),
    contactPerson: 'PRIVATE_CONTACT', signups: ['PRIVATE_SIGNUP'], attendees: ['PRIVATE_ATTENDEE'],
    messages: ['PRIVATE_MESSAGE'], hours: ['PRIVATE_HOURS'], note: 'PRIVATE_NOTE',
  };
  assert.doesNotMatch(renderOpportunityCalendar([fixture]), /PRIVATE_/);
});

test('overnight shifts end the following local day and zero-duration shifts are rejected', () => {
  const event = structuredClone(DEMO_EVENTS[0]);
  event.date = '2026-10-31';
  event.shifts = [{ id: 'overnight', name: 'Overnight', start: '23:00', end: '03:00' }];
  const entry = entries(renderOpportunityCalendar([event]))[0];
  assert.equal(value(entry, 'DTSTART'), '20261101T060000Z');
  assert.equal(value(entry, 'DTEND'), '20261101T110000Z');
  event.shifts[0].end = '23:00';
  assert.throws(() => renderOpportunityCalendar([event]), /positive duration/);
});

test('committed calendar exactly matches deterministic source generation', async () => {
  const committed = await readFile(new URL('../dist/opportunities.ics', import.meta.url), 'utf8');
  assert.equal(committed, publishedOpportunityCalendar());
  assert.equal(publishedOpportunityCalendar(), publishedOpportunityCalendar());
});
