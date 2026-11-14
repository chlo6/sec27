import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState} from '../dist/state.js';
import {recommendations} from '../dist/domain.js';
import {calendarEntries, validMonth, moveMonth, isNewOpportunity, opportunityCalendarView} from '../dist/opportunity-calendar.js';

test('opportunity calendar includes each future shift and honors supplied filters and capacity',()=>{
  const state=seedState(),month=state.clock.slice(0,7);
  const all=calendarEntries(state.events,state.clock,month);
  assert.equal(all.length,10);
  assert.equal(all.filter(row=>row.event.id==='evt-garden').length,3);
  const filtered=state.events.filter(event=>event.category==='Education & Tutoring');
  const rows=calendarEntries(filtered,state.clock,month);
  assert.equal(rows.length,2);
  assert.ok(rows.every(row=>row.event.category==='Education & Tutoring'));
  const full=calendarEntries(state.events,state.clock,'2026-11').find(row=>row.event.id==='evt-shelter');
  assert.equal(full.spots,0);
  state.events.find(event=>event.id==='evt-garden').status='canceled';
  assert.ok(!calendarEntries(state.events,state.clock,month).some(row=>row.event.id==='evt-garden'));
  assert.ok(!calendarEntries(state.events,'2026-10-28T16:00',month).some(row=>row.event.id==='evt-books'));
});

test('calendar month navigation crosses years and new labels use the saved demo clock',()=>{
  assert.equal(moveMonth('2026-12',1),'2027-01');
  assert.equal(moveMonth('2026-01',-1),'2025-12');
  assert.equal(validMonth('2026-13','2026-10-10T08:00'),'2026-10');
  assert.equal(validMonth('<invalid>','2026-10-10T08:00'),'2026-10');
  assert.equal(validMonth('2027-02','2026-10-10T08:00'),'2027-02');
  assert.equal(isNewOpportunity({createdDate:'2026-10-04'},'2026-10-10T08:00'),true);
  assert.equal(isNewOpportunity({createdDate:'2026-10-03'},'2026-10-10T08:00'),false);
  assert.equal(isNewOpportunity({createdDate:'2026-10-11'},'2026-10-10T08:00'),false);
});

test('open and profile filters apply to individual shifts within the same event',()=>{
  const state=seedState(),garden=state.events.find(event=>event.id==='evt-garden');
  garden.shifts[0].filled=garden.shifts[0].capacity;
  const open=calendarEntries([garden],state.clock,'2026-10',{openOnly:true});
  assert.equal(open.length,2);
  assert.ok(!open.some(row=>row.shift.id===garden.shifts[0].id));
  const student=state.users.find(user=>user.id===state.activeUser.student);
  const allowedShiftIds=new Set(recommendations(state,student).filter(match=>!match.blocked).map(match=>`${match.event.id}/${match.shift.id}`));
  const matching=calendarEntries(state.events,state.clock,'2026-10',{allowedShiftIds});
  assert.ok(matching.length>0);
  assert.ok(!matching.some(row=>row.shift.id==='sh-garden-setup'));
  assert.ok(matching.every(row=>allowedShiftIds.has(`${row.event.id}/${row.shift.id}`)));
});

test('calendar safely renders user event text, empty months, and public-only subscription instructions',()=>{
  const state=seedState();
  state.events[0].title='<img src=x onerror=alert(1)>';
  const html=opportunityCalendarView(state.events,state.clock,'2026-10');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('https://chlo6.github.io/sec27/opportunities.ics'));
  assert.ok(html.includes('Browser-only event edits and personal signups are not shared'));
  assert.ok(opportunityCalendarView(state.events,state.clock,'2027-02').includes('No matching shifts this month'));
});
