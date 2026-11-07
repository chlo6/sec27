import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState,loadState,migrateState,persistState,STORAGE_KEY,INITIAL_CLOCK} from '../dist/state.js';
import {act,verifiedHours,recommendations,studentCSV} from '../dist/domain.js';
import {reputationPoints,quests,schoolTeam,leaderboard,evaluateGame,completedShifts} from '../dist/game.js';
const role=(s,r,id)=>{s.role=r;if(id)s.activeUser[r]=id;};
const must=(s,request)=>{const result=act(s,request);assert.equal(result.ok,true,result.message);return result;};
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}};
const garden=s=>s.events.find(e=>e.id==='evt-garden');
function finish(s,{ready=true,completed=true}={}) {
 if(ready)must(s,{type:'ready',signupId:'sg-1'});
 role(s,'organizer','org-1');must(s,{type:'clock',value:'2026-10-17T08:00'});must(s,{type:'check-in',signupId:'sg-1'});
 must(s,{type:'clock',value:'2026-10-17T10:00'});must(s,{type:'check-out',signupId:'sg-1'});
 const id=s.hours.find(h=>h.signupId==='sg-1').id;must(s,{type:'verify-hour',hourId:id,completed});return id;
}
test('v5 migration preserves data, old key, opt-in, and per-user settings without invented reputation',()=>{
 const legacy=seedState();legacy.version=5;legacy.settings.email=false;legacy.settings.sms=true;delete legacy.reputation;delete legacy.assessments;
 for(const u of legacy.users)delete u.notificationSettings;
 legacy.users[0].leaderboardOptIn=true;legacy.users[0].location='Saved town';
 const storage=memory();storage.setItem('civicshift-demo-v5',JSON.stringify(legacy));const s=loadState(storage);
 assert.equal(s.version,6);assert.equal(s.users[0].location,'Saved town');assert.equal(s.users[0].leaderboardOptIn,true);assert.equal(s.users[0].notificationSettings.email,false);
 assert.equal(reputationPoints(s,'stu-1'),0);assert.equal(verifiedHours(s,'stu-1'),10.5);
 s.users[0].notificationSettings.email=true;assert.equal(s.users[1].notificationSettings.email,false);
 persistState(s,storage);assert.deepEqual(loadState(storage),s);assert.deepEqual(migrateState(s),s);assert.ok(storage.getItem('civicshift-demo-v5'));assert.ok(storage.getItem(STORAGE_KEY));
});
test('reputation earns 10+2+3 independently from hours and awards cannot duplicate',()=>{
 const s=seedState();const h=finish(s);assert.equal(verifiedHours(s,'stu-1'),12.5);assert.equal(reputationPoints(s,'stu-1'),12);
 must(s,{type:'assess-shift',signupId:'sg-1',completed:true,tasksCompleted:true});assert.equal(reputationPoints(s,'stu-1'),15);assert.equal(s.reputation.length,3);
 must(s,{type:'assess-shift',signupId:'sg-1',completed:true,tasksCompleted:true});evaluateGame(s);assert.equal(s.reputation.length,3);
 assert.equal(act(s,{type:'verify-hour',hourId:h,completed:true}).ok,false);
 role(s,'student');assert.equal(act(s,{type:'ready',signupId:'sg-1'}).ok,false);assert.equal(act(s,{type:'assess-shift',signupId:'sg-1',completed:true,tasksCompleted:true}).ok,false);
 assert.equal(reputationPoints(s,'stu-1'),15);
});
test('completion requires explicit assessment; verified time alone and outside hours do not generate points',()=>{
 const s=seedState();finish(s,{completed:false,ready:false});assert.equal(reputationPoints(s,'stu-1'),0);assert.equal(completedShifts(s,'stu-1').length,0);
 must(s,{type:'assess-shift',signupId:'sg-1',completed:true,tasksCompleted:false});assert.equal(reputationPoints(s,'stu-1'),10);
 role(s,'admin');must(s,{type:'verify-hour',hourId:'hr-3'});assert.equal(reputationPoints(s,'stu-1'),10);
});
test('correcting assessments and hours appends reversals and recalculates badges',()=>{
 const s=seedState(),id=finish(s);must(s,{type:'assess-shift',signupId:'sg-1',completed:true,tasksCompleted:true});
 must(s,{type:'assess-shift',signupId:'sg-1',completed:false,tasksCompleted:false});assert.equal(reputationPoints(s,'stu-1'),0);assert.equal(verifiedHours(s,'stu-1'),12.5);assert.equal(quests(s,'stu-1')[0].complete,false);
 assert.equal(s.reputation.filter(p=>p.points<0).length,3);assert.ok(s.reputation.at(-1).reversalOf);
 must(s,{type:'assess-shift',signupId:'sg-1',completed:true,tasksCompleted:true});assert.equal(reputationPoints(s,'stu-1'),15);
 must(s,{type:'correct-hour',hourId:id,status:'rejected',reason:'Incorrect attendance evidence'});assert.equal(reputationPoints(s,'stu-1'),0);assert.equal(verifiedHours(s,'stu-1'),10.5);
 assert.equal(quests(s,'stu-1')[0].complete,false);
 must(s,{type:'correct-hour',hourId:id,status:'verified',reason:'Attendance evidence confirmed'});assert.equal(reputationPoints(s,'stu-1'),15);
 role(s,'organizer','org-2');assert.equal(act(s,{type:'correct-hour',hourId:id,status:'rejected',reason:'Not my record'}).ok,false);
});
test('readiness eligibility and task verification are checked at action time',()=>{
 const s=seedState();role(s,'student','stu-3');assert.equal(act(s,{type:'ready',signupId:'sg-1'}).ok,false);role(s,'student','stu-1');
 must(s,{type:'ready',signupId:'sg-1'});assert.equal(act(s,{type:'ready',signupId:'sg-1'}).ok,false);
 role(s,'organizer','org-1');assert.equal(act(s,{type:'assess-shift',signupId:'sg-1',completed:true,tasksCompleted:true}).ok,false);
 must(s,{type:'clock',value:'2026-10-17T08:00'});must(s,{type:'check-in',signupId:'sg-1'});must(s,{type:'clock',value:'2026-10-17T10:00'});must(s,{type:'check-out',signupId:'sg-1'});
 assert.equal(act(s,{type:'assess-shift',signupId:'sg-1',completed:true,tasksCompleted:true}).ok,false);assert.equal(reputationPoints(s,'stu-1'),0);
});
test('unexcused absence is pending until admin review; appeal and excusal reverse the deduction',()=>{
 const s=seedState();role(s,'organizer','org-1');must(s,{type:'clock',value:'2026-10-17T10:00'});must(s,{type:'no-show',signupId:'sg-1'});
 assert.equal(s.absences.length,1);const id=s.absences[0].id;assert.equal(s.reputation.length,0);
 assert.equal(act(s,{type:'resolve-absence',absenceId:id,outcome:'unexcused',reason:'Reviewed'}).ok,false);
 role(s,'student','stu-3');assert.equal(act(s,{type:'absence-appeal',absenceId:id,explanation:'This is not mine'}).ok,false);
 role(s,'admin');must(s,{type:'resolve-absence',absenceId:id,outcome:'unexcused',reason:'Organizer confirmed no attendance'});assert.equal(reputationPoints(s,'stu-1'),0);assert.equal(s.reputation.at(-1).points,-5);
 must(s,{type:'resolve-absence',absenceId:id,outcome:'unexcused',reason:'Review remains unchanged'});assert.equal(s.reputation.length,1);
 role(s,'student','stu-1');must(s,{type:'absence-appeal',absenceId:id,explanation:'My family had an emergency'});assert.equal(s.absences[0].status,'pending');assert.equal(s.reputation.at(-1).points,5);
 role(s,'admin');must(s,{type:'resolve-absence',absenceId:id,outcome:'excused',reason:'Emergency explanation accepted'});assert.equal(s.reputation.reduce((n,p)=>n+p.points,0),0);
});
test('ordinary cancellation and canceled events do not create reputation penalties',()=>{
 const s=seedState();must(s,{type:'cancel-registration',signupId:'sg-1'});assert.equal(s.absences.length,0);assert.equal(s.reputation.length,0);
 role(s,'organizer','org-2');must(s,{type:'cancel-event',eventId:'evt-math'});assert.equal(s.reputation.length,0);
});
test('code check-in enforces approved registration, ownership, window, and no replay',()=>{
 const s=seedState();role(s,'organizer','org-1');assert.equal(act(s,{type:'issue-code',eventId:'evt-garden',shiftId:'sh-garden-setup'}).ok,false);
 must(s,{type:'clock',value:'2026-10-17T08:00'});role(s,'organizer','org-2');assert.equal(act(s,{type:'issue-code',eventId:'evt-garden',shiftId:'sh-garden-setup'}).ok,false);
 role(s,'organizer','org-1');must(s,{type:'issue-code',eventId:'evt-garden',shiftId:'sh-garden-setup'});const c=s.codeSessions.at(-1);assert.match(c.code,/^\d{6}$/);assert.equal(c.expiresAt,'2026-10-17T08:10');
 role(s,'student','stu-3');assert.equal(act(s,{type:'submit-code',signupId:'sg-1',code:c.code}).ok,false);
 role(s,'student','stu-1');assert.equal(act(s,{type:'submit-code',signupId:'sg-2',code:c.code}).ok,false);
 must(s,{type:'submit-code',signupId:'sg-1',code:c.code});assert.equal(act(s,{type:'submit-code',signupId:'sg-1',code:c.code}).ok,false);
 assert.equal(s.signups.find(r=>r.id==='sg-1').checkIn,'08:00');assert.equal(verifiedHours(s,'stu-1'),10.5);assert.equal(reputationPoints(s,'stu-1'),0);
});
test('wrong-code attempts persist on rejection and reload; rotation provides a new session',()=>{
 let s=seedState();role(s,'organizer','org-1');must(s,{type:'clock',value:'2026-10-17T08:00'});must(s,{type:'issue-code',eventId:'evt-garden',shiftId:'sh-garden-setup'});
 role(s,'student');const code=s.codeSessions.at(-1).code,wrong=code==='000000'?'111111':'000000';const storage=memory();
 for(let i=1;i<=5;i++){assert.equal(act(s,{type:'submit-code',signupId:'sg-1',code:wrong}).ok,false);assert.equal(s.codeSessions.at(-1).attempts['stu-1'],i);persistState(s,storage);s=loadState(storage);}
 assert.match(act(s,{type:'submit-code',signupId:'sg-1',code}).message,/Five attempts/);
 role(s,'organizer','org-1');must(s,{type:'issue-code',eventId:'evt-garden',shiftId:'sh-garden-setup'});assert.equal(s.codeSessions[0].revoked,true);
 const fresh=s.codeSessions.at(-1).code;role(s,'student');must(s,{type:'submit-code',signupId:'sg-1',code:fresh});
});
test('codes expire at ten minutes or shift end and clock reset invalidates sessions',()=>{
 const s=seedState();role(s,'organizer','org-1');must(s,{type:'clock',value:'2026-10-17T08:00'});must(s,{type:'issue-code',eventId:'evt-garden',shiftId:'sh-garden-setup'});const code=s.codeSessions.at(-1).code;
 must(s,{type:'clock',value:'2026-10-17T08:10'});role(s,'student');assert.equal(act(s,{type:'submit-code',signupId:'sg-1',code}).ok,false);
 role(s,'organizer');must(s,{type:'clock',value:'2026-10-17T09:55'});must(s,{type:'issue-code',eventId:'evt-garden',shiftId:'sh-garden-setup'});assert.equal(s.codeSessions.at(-1).expiresAt,'2026-10-17T10:00');
 must(s,{type:'clock',value:INITIAL_CLOCK,reset:true});assert.ok(s.codeSessions.every(c=>c.revoked));
 must(s,{type:'clock',value:'2026-10-17T09:56'});role(s,'student');assert.equal(act(s,{type:'submit-code',signupId:'sg-1',code:s.codeSessions.at(-1).code}).ok,false);
});
test('reminders occur once in the future 24-hour window and respect per-user opt-out',()=>{
 const s=seedState();s.users[0].notificationSettings.inApp=false;role(s,'organizer');must(s,{type:'clock',value:'2026-10-16T08:00'});assert.equal(s.reminderKeys.includes('sg-1'),false);
 role(s,'student');must(s,{type:'update-game-profile',notificationSettings:{inApp:true}});assert.equal(s.reminderKeys.filter(k=>k==='sg-1').length,1);const count=s.notifications.length;
 evaluateGame(s);assert.equal(s.notifications.length,count);const st=memory();persistState(s,st);assert.equal(loadState(st).notifications.length,count);
 role(s,'organizer');must(s,{type:'clock',value:INITIAL_CLOCK,reset:true});must(s,{type:'clock',value:'2026-10-16T09:00'});assert.equal(s.notifications.length,count);
 const late=seedState();late.clock='2026-10-17T08:01';evaluateGame(late);assert.equal(late.reminderKeys.includes('sg-1'),false);
});
test('school teams use opt-in members and Monday-Sunday verified hours; leaderboard protects identities',()=>{
 const s=seedState();finish(s);role(s,'student');must(s,{type:'update-game-profile',teamOptIn:true,leaderboardOptIn:true,leaderboardAlias:'Garden Fox'});
 const team=schoolTeam(s,'stu-1');assert.equal(team.start,'2026-10-12');assert.equal(team.end,'2026-10-18');assert.equal(team.hours,2);assert.equal(team.members,1);assert.equal(team.goal,20);
 let rows=leaderboard(s,'stu-1');assert.equal(rows.length,1);assert.equal(rows[0].alias,'Garden Fox');assert.equal(rows[0].points,12);assert.equal(rows[0].rank,1);assert.equal(rows[0].hours,undefined);assert.equal(rows[0].name,undefined);assert.ok(rows[0].badges.includes('First Step'));
 must(s,{type:'update-game-profile',teamOptIn:false,leaderboardOptIn:false});assert.equal(schoolTeam(s,'stu-1').hours,0);assert.equal(leaderboard(s,'stu-1').length,0);
 role(s,'counselor');assert.doesNotMatch(studentCSV(s),/reputation/i);
});
test('quests and points share readiness evidence and reject mismatched time cards',()=>{
 const s=seedState();finish(s);assert.equal(quests(s,'stu-1').find(q=>q.id==='ready-to-help').current,1);
 garden(s).date='2026-10-01';evaluateGame(s);assert.equal(reputationPoints(s,'stu-1'),10);assert.equal(quests(s,'stu-1').find(q=>q.id==='ready-to-help').current,0);
 s.hours.find(h=>h.signupId==='sg-1').shiftId='wrong-shift';evaluateGame(s);assert.equal(reputationPoints(s,'stu-1'),0);assert.equal(completedShifts(s,'stu-1').length,0);
});
test('language preferences inform matching while profile changes remain student-specific',()=>{
 const s=seedState();must(s,{type:'update-game-profile',languages:['English'],notificationSettings:{email:false,sms:true},leaderboardAlias:'Bay Helper'});
 assert.ok(recommendations(s,s.users[0]).some(m=>m.reasons.some(r=>r.includes('English'))));assert.deepEqual(s.users[1].languages,[]);assert.equal(s.users[1].notificationSettings.sms,false);
 assert.equal(act(s,{type:'update-game-profile',notificationSettings:{inApp:'yes'}}).ok,false);role(s,'admin');assert.equal(act(s,{type:'update-game-profile',teamOptIn:true}).ok,false);
});
test('forged registration event IDs cannot bypass organizer ownership',()=>{
 const s=seedState();role(s,'organizer','org-1');
 for(const type of ['approve-signup','check-in','no-show','assess-shift']) {
  const result=act(s,{type,signupId:'sg-2',eventId:'evt-garden',shiftId:'sh-garden-setup',completed:true,tasksCompleted:false});
  assert.equal(result.ok,false);assert.match(result.message,/do not match/);
 }
 role(s,'student');assert.equal(act(s,{type:'cancel-registration',signupId:'sg-1',eventId:'evt-math'}).ok,false);assert.equal(s.signups[0].status,'approved');
});
test('organizer can change own notification preferences without changing student progression fields',()=>{
 const s=seedState();role(s,'organizer','org-1');must(s,{type:'update-game-profile',notificationSettings:{inApp:false,email:false}});
 assert.equal(s.users.find(u=>u.id==='org-1').notificationSettings.inApp,false);assert.equal(s.users.find(u=>u.id==='stu-1').notificationSettings.inApp,true);
 assert.equal(act(s,{type:'update-game-profile',teamOptIn:true,notificationSettings:{email:true}}).ok,false);assert.equal(s.users.find(u=>u.id==='org-1').notificationSettings.email,false);
});
test('multiple shifts award independently, quests derive evidence, and equal reputation ties share a rank',()=>{
 const s=seedState();finish(s);const original=s.signups.find(r=>r.id==='sg-1'),hour=s.hours.find(h=>h.signupId===original.id);
 // Three distinct, organizer-assessed shift records are the evidence for the cross-cause quest.
 for(const [index,category] of ['Education & Tutoring','Animal Welfare'].entries()) {
  const event=structuredClone(garden(s));event.id=`quest-event-${index}`;event.category=category;s.events.push(event);
  const registration={...original,id:`quest-signup-${index}`,eventId:event.id};s.signups.push(registration);
  s.hours.push({...hour,id:`quest-hour-${index}`,signupId:registration.id,eventId:event.id});
  s.assessments.push({signupId:registration.id,completed:true,tasksCompleted:false});s.readiness.push({signupId:registration.id,studentId:'stu-1',confirmedAt:INITIAL_CLOCK});
 }
 evaluateGame(s);assert.equal(reputationPoints(s,'stu-1'),36);assert.ok(quests(s,'stu-1').every(q=>q.complete));
 const length=s.reputation.length;evaluateGame(s);assert.equal(s.reputation.length,length);
 // Clone that verified evidence for a second school volunteer to exercise equal-rank ordering.
 s.users.find(u=>u.id==='stu-1').leaderboardOptIn=true;
 const other=s.users.find(u=>u.id==='stu-2');other.leaderboardOptIn=true;other.school=s.users[0].school;
 for(const original of [...s.signups.filter(r=>completedShifts(s,'stu-1').some(c=>c.id===r.id))]) {
  const registration={...original,id:`tie-${original.id}`,studentId:'stu-2'};s.signups.push(registration);
  const card=s.hours.find(h=>h.signupId===original.id);s.hours.push({...card,id:`tie-${card.id}`,signupId:registration.id,studentId:'stu-2'});
  s.assessments.push({signupId:registration.id,completed:true,tasksCompleted:false});s.readiness.push({signupId:registration.id,studentId:'stu-2',confirmedAt:INITIAL_CLOCK});
 }
 evaluateGame(s);const rows=leaderboard(s,'stu-1');assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.rank),[1,1]);assert.deepEqual(rows.map(r=>r.points),[36,36]);
 s.hours.find(h=>h.id==='quest-hour-0').status='rejected';evaluateGame(s);assert.equal(quests(s,'stu-1').find(q=>q.id==='cause-explorer').complete,false);assert.equal(quests(s,'stu-1').find(q=>q.id==='ready-to-help').complete,false);
});
