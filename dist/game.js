// Transparent demo progression. No network, hidden scores, or background jobs.
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userFor = (s,id) => s.users.find(u=>u.id===id);
const verified = (s,id) => s.hours.filter(h=>h.studentId===id&&h.status==='verified');
const dateOnly = date => date.toISOString().slice(0,10);
const moment = value => Date.parse(`${value}:00Z`);
export const reputationPoints = (s,id) => Math.max(0,(s.reputation||[]).filter(p=>p.studentId===id).reduce((n,p)=>n+p.points,0));
export function completedShifts(s,id) {
  return s.signups.filter(r=>r.studentId===id&&r.status==='attended'&&r.checkOut&&s.assessments.some(a=>a.signupId===r.id&&a.completed)&&verified(s,id).some(h=>h.signupId===r.id&&h.eventId===r.eventId&&h.shiftId===r.shiftId));
}
export function wasReady(s,r) {
  const event=s.events.find(e=>e.id===r.eventId),shift=event?.shifts.find(sh=>sh.id===r.shiftId);
  return !!shift&&s.readiness.some(a=>a.signupId===r.id&&a.studentId===r.studentId&&a.confirmedAt<`${event.date}T${shift.start}`);
}
export function quests(s,id) {
  const done=completedShifts(s,id);
  const ready=done.filter(r=>wasReady(s,r));
  const categories=new Set(done.map(r=>s.events.find(e=>e.id===r.eventId)?.category).filter(Boolean));
  const values=[['first-step','First Step','Complete one verified shift.',done.length,1],['ready-to-help','Ready to Help','Complete three verified shifts with advance readiness confirmation.',ready.length,3],['cause-explorer','Cause Explorer','Complete verified shifts across three causes.',categories.size,3],['service-milestone','Service Milestone','Reach ten verified service hours.',verified(s,id).reduce((n,h)=>n+Number(h.hours),0),10]];
  return values.map(([id,title,description,current,target])=>({id,title,description,current:Math.round(current*100)/100,target,complete:current>=target}));
}
export function schoolTeam(s,id) {
  const user=userFor(s,id), monday=new Date(`${s.clock.slice(0,10)}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
  const sunday=new Date(monday);sunday.setUTCDate(sunday.getUTCDate()+6);
  const start=dateOnly(monday),end=dateOnly(sunday),school=user?.school||'Not selected';
  const members=s.users.filter(u=>u.role==='student'&&u.school===school&&u.teamOptIn&&school!=='Not selected');
  const ids=new Set(members.map(u=>u.id));
  const hours=s.hours.filter(h=>h.status==='verified'&&ids.has(h.studentId)&&h.date>=start&&h.date<=end).reduce((n,h)=>n+Number(h.hours),0);
  return {school,optedIn:!!user?.teamOptIn,hours:Math.round(hours*100)/100,goal:20,start,end,members:members.length};
}
export function leaderboard(s,id) {
  const school=userFor(s,id)?.school;
  if(!school||school==='Not selected')return [];
  const rows=s.users.filter(u=>u.role==='student'&&u.school===school&&u.leaderboardOptIn&&completedShifts(s,u.id).length)
    .map(u=>({studentId:u.id,alias:u.leaderboardAlias||'Volunteer',points:reputationPoints(s,u.id),badges:quests(s,u.id).filter(q=>q.complete).map(q=>q.title)}))
    .sort((a,b)=>b.points-a.points||a.alias.localeCompare(b.alias)||a.studentId.localeCompare(b.studentId));
  let rank=0,last=null;return rows.map((row,index)=>{if(last!==row.points)rank=index+1;last=row.points;return {...row,rank};});
}
export function evaluateGame(s) {
  const desired=new Map();
  const add=(r,reason,points)=>desired.set(`${r.id}:${reason}`,{studentId:r.studentId,signupId:r.id,reason,points});
  for(const u of s.users.filter(u=>u.role==='student')) for(const r of completedShifts(s,u.id)) {
    add(r,'completion',10);
    if(wasReady(s,r))add(r,'readiness',2);
    if(s.assessments.some(a=>a.signupId===r.id&&a.tasksCompleted))add(r,'tasks',3);
  }
  for(const a of s.absences.filter(a=>a.status==='unexcused')) {
    const r=s.signups.find(r=>r.id===a.signupId);if(r&&r.status==='no-show'&&!r.checkIn)add(r,'absence',-5);
  }
  const sums=new Map();
  for(const p of s.reputation){const key=`${p.signupId}:${p.reason}`;sums.set(key,(sums.get(key)||0)+p.points);}
  for(const key of new Set([...sums.keys(),...desired.keys()])) {
    const expected=desired.get(key), previous=s.reputation.findLast(p=>`${p.signupId}:${p.reason}`===key), current=sums.get(key)||0, points=(expected?.points||0)-current;
    if(!points)continue;
    const source=expected||previous;
    s.reputation.push({id:uid('rp'),studentId:source.studentId,signupId:source.signupId,reason:source.reason,points,time:s.clock,actorId:s.activeUser[s.role],...(previous?{reversalOf:previous.id}:{})});
  }
  // Reminders are evaluated only while the app is open; the saved clock is authoritative.
  for(const r of s.signups.filter(r=>r.status==='approved')) {
    const u=userFor(s,r.studentId),e=s.events.find(e=>e.id===r.eventId),sh=e?.shifts.find(sh=>sh.id===r.shiftId);
    if(!u?.notificationSettings?.inApp||e?.status!=='active'||!sh)continue;
    const delta=moment(`${e.date}T${sh.start}`)-moment(s.clock);
    if(delta<=0||delta>24*60*60*1000||s.reminderKeys.includes(r.id))continue;
    s.reminderKeys.push(r.id);
    s.notifications.unshift({id:uid('nt'),role:'student',userId:r.studentId,type:'info',title:'Your shift is within 24 hours',body:`${e.title} · ${sh.start}. Review the details and confirm you are ready. This is an in-app demo reminder.`,time:s.clock.replace('T',' '),read:false,link:`#/event/${e.id}`,signupId:r.id});
  }
}
