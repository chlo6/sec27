import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState, migrateState, loadState, persistState, STORAGE_KEY, INITIAL_CLOCK } from '../dist/state.js';
import { act, eligibility, recommendations, verifiedHours, syncCapacity, reportData, studentCSV, hoursCSV, reportCSV, calendarFile } from '../dist/domain.js';
import { visibleStories } from '../dist/community.js';
import { interpretRequest } from '../dist/assistant.js';
const user = s => s.users.find(u=>u.id===s.activeUser.student);
const role = (s,value,id) => {s.role=value;if(id)s.activeUser[value]=id;};
const memory = () => {const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const submit=(s,e='evt-books',sh='evt-books-shift-1')=>act(s,{type:'signup',eventId:e,shiftId:sh});
test('fresh state has six fictional stories and fourteen shifts, real record totals',()=>{
 const s=seedState();assert.equal(s.stories.length,6);assert.equal(s.events.reduce((n,e)=>n+e.shifts.length,0),14);assert.equal(verifiedHours(s,'stu-1'),10.5);
});
test('v4 migration is additive, persistent, idempotent, and preserves edited and custom records',()=>{
 const legacy=seedState();legacy.version=4;delete legacy.clock;delete legacy.stories;delete legacy.savedStories;
 legacy.events=legacy.events.filter(e=>!e.id.startsWith('evt-creek')&&!['evt-books','evt-market','evt-repair'].includes(e.id));
 legacy.events[0].title='Saved custom title';legacy.users[0].location='My town';legacy.signups.push({id:'custom',studentId:'stu-1',eventId:'evt-tech',shiftId:'sh-tech',status:'waitlist'});
 const storage=memory();storage.setItem('civicshift-demo-v4',JSON.stringify(legacy));const s=loadState(storage);
 assert.equal(s.version,5);assert.equal(s.events[0].title,'Saved custom title');assert.equal(s.users[0].location,'My town');assert.ok(s.signups.some(r=>r.id==='custom'));
 persistState(s,storage);assert.deepEqual(loadState(storage),s);assert.deepEqual(migrateState(s),s);assert.ok(storage.getItem('civicshift-demo-v4'));assert.ok(storage.getItem(STORAGE_KEY));
});
test('unreadable storage is not silently overwritten; reset seed independent',()=>{
 const storage=memory();storage.setItem(STORAGE_KEY,'broken');assert.throws(()=>loadState(storage));const a=seedState();a.events[0].title='Edited';assert.notEqual(seedState().events[0].title,'Edited');
});
test('duplicate signup and overlapping shifts rejected; adjacent shifts allowed',()=>{
 const s=seedState();assert.match(submit(s,'evt-garden','sh-garden-setup').message,/already registered/);
 assert.equal(submit(s,'evt-garden','sh-garden-main').ok,true);
 const e=s.events.find(e=>e.id==='evt-garden');e.shifts.push({id:'overlap',start:'09:00',end:'11:00',name:'Overlap',capacity:8,filled:0,backgroundFilled:0});assert.match(submit(s,e.id,'overlap').message,/overlaps/);
});
test('grade, skills, consent, age, and blocked dates enforced',()=>{
 const s=seedState();assert.match(submit(s,'evt-tech','sh-tech').message,/missing/);assert.match(submit(s,'evt-creek','evt-creek-shift-1').message,/unavailable/);
 s.activeUser.student='stu-2';assert.match(submit(s).message,/consent/);user(s).guardianConsent=true;user(s).grade=8;assert.match(submit(s).message,/grade/);
 s.activeUser.student='stu-3';user(s).guardianConsent=false;assert.equal(submit(s).ok,true);
});
test('approval rechecks consent and skills and cannot be repeated',()=>{
 const s=seedState();role(s,'organizer','org-1');assert.match(act(s,{type:'approve-signup',signupId:'sg-4'}).message,/consent/);
 role(s,'organizer','org-2');user(s).skills=[];assert.match(act(s,{type:'approve-signup',signupId:'sg-2'}).message,/missing/);
 user(s).skills=['Tutoring'];assert.equal(act(s,{type:'approve-signup',signupId:'sg-2'}).ok,true);const filled=s.events.find(e=>e.id==='evt-math').shifts[0].filled;assert.equal(act(s,{type:'approve-signup',signupId:'sg-2'}).ok,false);assert.equal(s.events.find(e=>e.id==='evt-math').shifts[0].filled,filled);
});
test('approval rechecks overlaps, canceled events, start time and capacity',()=>{
 for(const scenario of ['capacity','cancel','time','overlap']){
  const s=seedState(),e=s.events.find(e=>e.id==='evt-math');
  if(scenario==='capacity')e.shifts[0].capacity=1;
  if(scenario==='cancel')e.status='canceled';
  if(scenario==='time')s.clock='2026-10-21T16:00';
  if(scenario==='overlap') {const copy=structuredClone(e);copy.id='overlap';s.events.push(copy);s.signups.push({id:'blocking',eventId:copy.id,shiftId:copy.shifts[0].id,studentId:'stu-1',status:'approved'});}
  role(s,'organizer','org-2');assert.equal(act(s,{type:'approve-signup',signupId:'sg-2'}).ok,false,scenario);
 }
});
test('waitlist creates an offer, skips ineligible people, and requires acceptance',()=>{
 const s=seedState(),e=s.events.find(e=>e.id==='evt-garden'),sh=e.shifts[0];sh.capacity=sh.filled;
 s.signups.push({id:'invalid-first',eventId:e.id,shiftId:sh.id,studentId:'stu-2',status:'waitlist',createdAt:'2026-10-01'});
 s.signups.push({id:'eligible-next',eventId:e.id,shiftId:sh.id,studentId:'stu-3',status:'waitlist',createdAt:'2026-10-02'});
 assert.equal(act(s,{type:'cancel-registration',signupId:'sg-1'}).ok,true);
 assert.equal(s.signups.find(r=>r.id==='invalid-first').status,'waitlist');assert.equal(s.signups.find(r=>r.id==='eligible-next').status,'offered');
 s.activeUser.student='stu-3';assert.equal(act(s,{type:'accept-offer',signupId:'eligible-next'}).ok,true);assert.equal(s.signups.find(r=>r.id==='eligible-next').status,'approved');
 assert.equal(act(s,{type:'accept-offer',signupId:'eligible-next'}).ok,false);
});
test('full shift joins waitlist; stale offer acceptance revalidates',()=>{
 const s=seedState();assert.equal(submit(s,'evt-shelter','sh-shelter').ok,true);const r=s.signups.at(-1);assert.equal(r.status,'waitlist');r.status='offered';syncCapacity(s);
 user(s).guardianConsent=false;assert.equal(act(s,{type:'accept-offer',signupId:r.id}).ok,false);assert.equal(s.signups.at(-1).status,'offered');
});
test('ownership and current actor enforced at action time, admin can manage all',()=>{
 const s=seedState();role(s,'organizer','org-1');assert.equal(act(s,{type:'approve-signup',signupId:'sg-2'}).ok,false);
 role(s,'counselor');assert.equal(act(s,{type:'verify-hour',hourId:'hr-3'}).ok,false);assert.equal(submit(s).ok,false);
 role(s,'admin');assert.equal(act(s,{type:'approve-signup',signupId:'sg-2'}).ok,true);
 assert.equal(act(s,{type:'story-status',storyId:'story-creek',status:'hidden',actorId:'stu-1'}).ok,false);
});
test('complete signup, approval, two shifts, attendance, verification, counselor export journey',()=>{
 const s=seedState();assert.equal(submit(s).ok,true);const requestId=s.signups.at(-1).id;role(s,'organizer','org-2');assert.equal(act(s,{type:'approve-signup',signupId:requestId}).ok,true);
 // Two shifts at the same event must get distinct time cards.
 role(s,'student');assert.equal(submit(s,'evt-garden','sh-garden-main').ok,true);const second=s.signups.at(-1).id;
 role(s,'organizer','org-1');assert.equal(act(s,{type:'check-out',signupId:'sg-1'}).ok,false);
 assert.equal(act(s,{type:'clock',value:'2026-10-17T08:00'}).ok,true);assert.equal(act(s,{type:'check-in',signupId:'sg-1'}).ok,true);assert.equal(act(s,{type:'check-in',signupId:'sg-1'}).ok,false);
 act(s,{type:'clock',value:'2026-10-17T10:00'});assert.equal(act(s,{type:'check-out',signupId:'sg-1'}).ok,true);assert.equal(act(s,{type:'check-out',signupId:'sg-1'}).ok,false);
 assert.equal(act(s,{type:'check-in',signupId:second}).ok,true);act(s,{type:'clock',value:'2026-10-17T13:00'});assert.equal(act(s,{type:'check-out',signupId:second}).ok,true);
 const cards=s.hours.filter(h=>h.eventId==='evt-garden');assert.equal(cards.length,2);assert.equal(cards.reduce((n,h)=>n+h.hours,0),5);assert.equal(verifiedHours(s,'stu-1'),10.5);
 for(const h of cards)assert.equal(act(s,{type:'verify-hour',hourId:h.id}).ok,true);
 assert.equal(act(s,{type:'verify-hour',hourId:cards[0].id}).ok,false);assert.equal(verifiedHours(s,'stu-1'),15.5);
 assert.equal(reportData(s).total,s.hours.filter(h=>h.orgId==='org-1'&&h.status==='verified').reduce((n,h)=>n+h.hours,0));
 role(s,'counselor');assert.match(studentCSV(s),/"15.5"/);assert.match(hoursCSV(s,'stu-1'),/"verified"/);
});
test('outside-hour review remains scoped; counselors only export their school',()=>{
 const s=seedState();role(s,'organizer','org-2');assert.equal(act(s,{type:'verify-hour',hourId:'hr-3'}).ok,false);role(s,'admin');assert.equal(act(s,{type:'verify-hour',hourId:'hr-3'}).ok,true);
 s.users.find(u=>u.id==='stu-2').school='Another school';role(s,'counselor');assert.doesNotMatch(studentCSV(s),/Jordan/);
});
test('clock persists and reset does not erase attendance',()=>{
 const s=seedState();role(s,'organizer');act(s,{type:'clock',value:'2026-10-17T08:00'});act(s,{type:'check-in',signupId:'sg-1'});
 assert.equal(act(s,{type:'clock',value:INITIAL_CLOCK}).ok,false);assert.equal(act(s,{type:'clock',value:INITIAL_CLOCK,reset:true}).ok,true);assert.equal(s.signups[0].checkIn,'08:00');const st=memory();persistState(s,st);assert.equal(loadState(st).clock,INITIAL_CLOCK);
});
test('cancellation removes future registrations and blocks new signups',()=>{
 const s=seedState();role(s,'organizer');assert.equal(act(s,{type:'cancel-event',eventId:'evt-garden'}).ok,true);assert.equal(s.signups[0].status,'canceled');role(s,'student');assert.equal(submit(s,'evt-garden','sh-garden-main').ok,false);
});
test('feed search, causes, latest, saves and hidden-story behavior',()=>{
 const s=seedState(),u=user(s);s.savedStories[u.id]=['story-creek'];assert.equal(visibleStories(s,{feedTab:'saved'},u).length,1);assert.equal(visibleStories(s,{feedSearch:'reading'},u)[0].id,'story-books');assert.equal(visibleStories(s,{feedCause:'Animal Welfare'},u).length,1);assert.equal(visibleStories(s,{feedTab:'latest'},u)[0].date,'2026-10-10');
 role(s,'admin');act(s,{type:'story-status',storyId:'story-creek',status:'hidden'});assert.equal(visibleStories(s,{feedTab:'saved'},u).length,0);act(s,{type:'story-status',storyId:'story-creek',status:'published'});assert.equal(visibleStories(s,{feedTab:'saved'},u).length,1);
});
test('recommendations explain interests, location and weekly availability without percentages',()=>{
 const s=seedState(),r=recommendations(s,user(s)).find(m=>m.event.id==='evt-books');assert.equal(r.reasons.length,3);assert.ok(r.reasons.some(v=>v.includes('availability')));assert.ok(r.reasons.some(v=>v.includes('Cupertino')));
});
test('assistant reads records without changing registrations and handles unsupported requests',()=>{
 const s=seedState(),n=s.signups.length;assert.ok(interpretRequest(s,'Find shifts').matches.length);assert.match(interpretRequest(s,'Hours remaining').text,/49.5/);assert.match(interpretRequest(s,'email my counselor').text,/cannot/);assert.ok(interpretRequest(s,'cancel a signup').registrations.length);assert.equal(s.signups.length,n);assert.ok(interpretRequest(s,'find saturday shifts').matches.every(m=>new Date(m.event.date+'T12:00:00').getDay()===6));
});
test('assistant stale capacity proposal rejected and logged, fresh proposal accepted',()=>{
 const s=seedState(),e=s.events.find(e=>e.id==='evt-books');e.shifts[0].backgroundFilled=8;
 const proposal={type:'signup',eventId:e.id,shiftId:e.shifts[0].id,expectedStatus:'pending',actorId:'stu-1'};assert.equal(act(s,proposal).ok,false);assert.match(s.activity[0].action,/Rejected/);assert.equal(s.signups.some(r=>r.eventId===e.id),false);
 assert.equal(act(s,{...proposal,expectedStatus:'waitlist'}).ok,true);
});
test('assistant detects commitments that overlap after an organizer edits a schedule',()=>{
 const s=seedState();submit(s,'evt-garden','sh-garden-main');s.events.find(e=>e.id==='evt-garden').shifts[1].start='09:00';assert.match(interpretRequest(s,'Check conflicts').text,/existing commitments conflict/);
});

test('CSV totals agree with records and calendar files include only approved active shifts',()=>{
 const s=seedState();role(s,'organizer');assert.ok(reportCSV(s).includes(`"Verified hours","${reportData(s).total}"`));
 const ics=calendarFile(s,'stu-1');assert.match(ics,/BEGIN:VCALENDAR/);assert.match(ics,/DTSTART:20261017T080000/);assert.match(ics,/DTEND:20261017T100000/);assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,1);assert.doesNotMatch(ics,/Math Lab/);
 act(s,{type:'cancel-event',eventId:'evt-garden'});assert.doesNotMatch(calendarFile(s,'stu-1'),/BEGIN:VEVENT/);
});
