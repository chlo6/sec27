import { PUBLIC_CALENDAR_URL, GOOGLE_CALENDAR_URL } from './opportunity-feed.js';

const escape = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const dateLabel = date => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', timeZone:'UTC'});
const timeLabel = time => new Date(`2000-01-01T${time}:00Z`).toLocaleTimeString('en-US', {hour:'numeric',minute:'2-digit',timeZone:'UTC'});
export function validMonth(value, fallback) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '') ? value : fallback.slice(0,7);
}
export function moveMonth(month, delta) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth()+delta);
  return date.toISOString().slice(0,7);
}
export function isNewOpportunity(event, clock) {
  const days = (Date.parse(`${clock.slice(0,10)}T12:00:00Z`)-Date.parse(`${event.createdDate}T12:00:00Z`))/86400000;
  return days >= 0 && days < 7;
}
export function calendarEntries(events, clock, month, {openOnly=false, allowedShiftIds}={}) {
  return events.filter(event => event.status === 'active' && event.date.startsWith(`${month}-`))
    .flatMap(event => event.shifts.filter(shift => `${event.date}T${shift.start}` >= clock)
      .map(shift => ({event, shift, spots: Math.max(0,shift.capacity-shift.filled)})))
    .filter(({event,shift,spots}) => (!openOnly || spots>0) && (!allowedShiftIds || allowedShiftIds.has(`${event.id}/${shift.id}`)))
    .sort((a,b) => `${a.event.date}T${a.shift.start}`.localeCompare(`${b.event.date}T${b.shift.start}`) || a.event.title.localeCompare(b.event.title));
}
function shiftLink({event,shift,spots}, clock) {
  const label = `${event.title}, ${shift.name}, ${dateLabel(event.date)}, ${timeLabel(shift.start)} to ${timeLabel(shift.end)} Pacific, ${spots ? `${spots} ${spots===1?'place':'places'} available` : 'waitlist available'}`;
  return `<a class="opportunity-slot" href="#/event/${encodeURIComponent(event.id)}" aria-label="${escape(label)}"><span class="slot-time">${escape(timeLabel(shift.start))} – ${escape(timeLabel(shift.end))}</span><strong>${escape(event.title)}</strong><span>${escape(shift.name)}</span><small>${spots ? `${spots} ${spots===1?'spot':'spots'} left` : 'Waitlist'}${isNewOpportunity(event,clock)?' <span class="new-opportunity">New</span>':''}</small></a>`;
}
export function subscriptionPanel() {
  return `<details class="calendar-subscription"><summary>Add opportunities to your calendar</summary><div class="subscription-content"><p>Copy the public calendar link, then add it in Google Calendar on a computer.</p><div class="subscription-url"><div class="field"><label for="opportunity-calendar-url">Public calendar link</label><input id="opportunity-calendar-url" type="url" value="${escape(PUBLIC_CALENDAR_URL)}" readonly spellcheck="false"></div><button class="button button-primary" type="button" data-action="copy-opportunity-calendar">Copy link</button></div><div class="subscription-actions"><a class="button button-light" href="${escape(GOOGLE_CALENDAR_URL)}" target="_blank" rel="noopener noreferrer">Open Google Calendar ↗</a><a class="button button-link" href="opportunities.ics" download="civicshift-opportunities.ics">Download .ics</a></div><ol><li>Open <strong>Other calendars → + → From URL</strong>.</li><li>Paste the link and select <strong>Add calendar</strong>.</li></ol><p class="calendar-note">The link includes all published demo opportunities, regardless of your filters. It uses the original October–November 2026 demo dates. Browser-only event edits and personal signups are not shared. Published updates appear when your calendar provider refreshes the feed; downloading a file is a one-time import.</p><a class="calendar-help" href="https://support.google.com/calendar/answer/37100?hl=en" target="_blank" rel="noopener noreferrer">Google Calendar instructions ↗</a></div></details>`;
}
export function opportunityCalendarView(events, clock, requestedMonth, options={}) {
  const month = validMonth(requestedMonth,clock);
  const first = new Date(`${month}-01T12:00:00Z`);
  const count = new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  const title = first.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
  const entries = calendarEntries(events,clock,month,options), byDate = new Map();
  for (const entry of entries) {
    const group = byDate.get(entry.event.date) || [];
    group.push(entry);byDate.set(entry.event.date,group);
  }
  const cells = Array.from({length:Math.ceil((first.getUTCDay()+count)/7)*7}, (_,index) => {
    const day = index-first.getUTCDay()+1;
    if(day<1 || day>count)return '<td class="calendar-padding"></td>';
    const date = `${month}-${String(day).padStart(2,'0')}`, today = date===clock.slice(0,10);
    return `<td${today?' class="demo-today"':''}><time datetime="${date}" aria-label="${escape(dateLabel(date))}${today?', demo today':''}">${day}</time>${(byDate.get(date)||[]).map(entry=>shiftLink(entry,clock)).join('')}</td>`;
  });
  const rows = Array.from({length:cells.length/7},(_,i)=>`<tr>${cells.slice(i*7,i*7+7).join('')}</tr>`).join('');
  const agenda = [...byDate.entries()].map(([date,items])=>`<section class="agenda-day"><h3><time datetime="${date}">${escape(dateLabel(date))}</time></h3>${items.map(entry=>shiftLink(entry,clock)).join('')}</section>`).join('');
  return `<section class="opportunity-calendar" aria-labelledby="opportunity-month-title"><header class="opportunity-calendar-head"><div><h2 id="opportunity-month-title">${escape(title)}</h2><p>${entries.length} upcoming ${entries.length===1?'shift':'shifts'} · Pacific time</p></div><nav class="opportunity-month-nav" aria-label="Opportunity calendar month"><a class="button button-light" href="#/explore/calendar/${moveMonth(month,-1)}" aria-label="Previous opportunities month">←</a><a class="button button-light" href="#/explore/calendar/${clock.slice(0,7)}">Demo today</a><a class="button button-light" href="#/explore/calendar/${moveMonth(month,1)}" aria-label="Next opportunities month">→</a></nav></header><p class="calendar-note calendar-context">Available opportunities, not registrations. Demo date: ${escape(dateLabel(clock.slice(0,10)))}. <span class="new-opportunity">New</span> means posted in the last seven demo days.</p><div class="opportunity-month"><table aria-labelledby="opportunity-month-title"><thead><tr>${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day=>`<th scope="col"><abbr title="${day}">${day.slice(0,3)}</abbr></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><div class="opportunity-agenda">${agenda}</div>${entries.length?'':`<div class="calendar-empty"><h3>No matching shifts this month</h3><p>Try another month or adjust the filters above.</p></div>`}</section>${subscriptionPanel()}`;
}
