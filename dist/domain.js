// Shared, synchronous demo rules. No network, model inference, or background jobs.
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const held = ["approved", "attended", "offered"];
const active = ["approved", "pending", "offered", "attended"];
const ended = ["withdrawn", "rejected", "canceled", "no-show"];
const minutes = time => Number(time.split(":")[0]) * 60 + Number(time.split(":")[1]);
const eventFor = (s, id) => s.events.find(e => e.id === id);
export const actorFor = s => s.users.find(u => u.id === s.activeUser[s.role] && u.role === s.role);
export const canManage = (s, event, actor = actorFor(s)) => !!event && !!actor && (actor.role === "admin" || (actor.role === "organizer" && event.orgId === actor.id));
export const canReviewHour = (s, hour, actor = actorFor(s)) => !!hour && !!actor && (actor.role === "admin" || (actor.role === "organizer" && hour.orgId === actor.id));
export const verifiedHours = (s, id) => Math.round(s.hours.filter(h => h.studentId === id && h.status === "verified").reduce((n, h) => n + Number(h.hours), 0)*100)/100;
export function syncCapacity(s) {
  for (const e of s.events) for (const sh of e.shifts) sh.filled = (sh.backgroundFilled || 0) + s.signups.filter(r => r.eventId === e.id && r.shiftId === sh.id && held.includes(r.status)).length;
}
export function eligibility(s, event, shift, student, ignoreId) {
  if (!event || !shift || !student || student.role !== "student") return "Choose a valid student and shift.";
  if (event.status !== "active") return "This event is canceled or unavailable.";
  if (`${event.date}T${shift.start}` < s.clock) return "This shift has already started on the demo clock.";
  const adultDate = `${Number(student.birthDate?.slice(0,4)) + 18}${student.birthDate?.slice(4)}`;
  if ((!student.birthDate || adultDate > event.date) && !student.guardianConsent) return "Demo guardian consent is required for volunteers under 18.";
  if (Number(student.grade) < Number(event.minGrade)) return `This shift requires grade ${event.minGrade} or higher.`;
  const missing = event.requiredSkills.filter(skill => !student.skills.map(v => v.toLowerCase()).includes(skill.toLowerCase()));
  if (missing.length) return `Your profile is missing: ${missing.join(", ")}.`;
  if ((s.unavailableByUser?.[student.id] || []).includes(event.date)) return "You marked this date unavailable in your calendar.";
  const other = s.signups.filter(r => r.studentId === student.id && r.id !== ignoreId);
  if (other.some(r => r.eventId === event.id && r.shiftId === shift.id && !ended.includes(r.status))) return "You already registered for this shift.";
  if (other.filter(r => active.includes(r.status)).some(r => {
    const e = eventFor(s, r.eventId), sh = e?.shifts.find(i => i.id === r.shiftId);
    return e?.status === "active" && e.date === event.date && sh && minutes(shift.start) < minutes(sh.end) && minutes(shift.end) > minutes(sh.start);
  })) return "This shift overlaps with another pending, offered, or approved commitment.";
  return "";
}
function fitsAvailability(student, event, shift) {
  const weekday = new Date(`${event.date}T12:00:00`).toLocaleDateString("en-US", {weekday: "long"});
  return student.availability.some(value => {
    const match = value.match(/(\w+)\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match || match[1].toLowerCase() !== weekday.toLowerCase()) return false;
    const toMinute = (h,m,p) => (Number(h)%12 + (p.toUpperCase()==="PM"?12:0))*60+Number(m);
    return minutes(shift.start) >= toMinute(match[2],match[3],match[4]) && minutes(shift.end) <= toMinute(match[5],match[6],match[7]);
  });
}
export function recommendations(s, student) {
  if (!student) return [];
  return s.events.filter(e => e.status === "active").flatMap(event => event.shifts.map(shift => {
    const reasons = [];
    if (student.interests.includes(event.category)) reasons.push(`Matches your interest in ${event.category.toLowerCase()}`);
    if (student.location && event.location.toLowerCase().includes(student.location.toLowerCase())) reasons.push(`Near your saved location, ${student.location}`);
    if (event.locationType.toLowerCase().includes("virtual")) reasons.push("Available remotely");
    if (fitsAvailability(student, event, shift)) reasons.push("Fits your saved weekly availability");
    return {event, shift, reasons, score: reasons.length, blocked: eligibility(s,event,shift,student), full: shift.filled >= shift.capacity};
  })).filter(i => `${i.event.date}T${i.shift.start}` >= s.clock)
    .sort((a,b) => Number(!!a.blocked)-Number(!!b.blocked) || b.score-a.score || a.event.date.localeCompare(b.event.date));
}
export function commitmentConflicts(s, studentId) {
  const commitments=s.signups.filter(r=>r.studentId===studentId&&active.includes(r.status)).map(r=>{
    const event=eventFor(s,r.eventId);
    return {registration:r,event,shift:event?.shifts.find(sh=>sh.id===r.shiftId)};
  }).filter(i=>i.event?.status==="active"&&i.shift&&`${i.event.date}T${i.shift.end}`>=s.clock);
  return commitments.flatMap((a,index)=>commitments.slice(index+1).filter(b=>a.event.date===b.event.date&&minutes(a.shift.start)<minutes(b.shift.end)&&minutes(a.shift.end)>minutes(b.shift.start)).map(b=>`${a.event.title} (${a.shift.start}–${a.shift.end}) overlaps ${b.event.title} (${b.shift.start}–${b.shift.end}) on ${a.event.date}`));
}
export function logActivity(s, action, subject, actor = actorFor(s)?.name || "Demo rules") {
  s.activity.unshift({id:uid("ac"),action,subject,actor,time:s.clock.replace("T"," ")});
}
function notify(s, studentId, title, body, eventId) {
  s.notifications.unshift({id:uid("nt"),role:"student",userId:studentId,title,body,type:"info",time:s.clock.replace("T"," "),read:false,link:`#/event/${eventId}`});
}
function offerNext(s, event, shift) {
  syncCapacity(s);
  if (shift.filled >= shift.capacity) return;
  const queue = s.signups.filter(r => r.eventId === event.id && r.shiftId === shift.id && r.status === "waitlist").sort((a,b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  for (const r of queue) {
    if (shift.filled >= shift.capacity) break;
    const student = s.users.find(u => u.id === r.studentId);
    if (eligibility(s,event,shift,student,r.id)) continue;
    r.status = "offered"; r.offeredAt = s.clock;
    notify(s,r.studentId,"A waitlist spot is ready","Accept this demo offer from the opportunity page. Eligibility and capacity will be checked again.",event.id);
    logActivity(s,"Waitlist offer created",`${student.name} · ${event.title}`,"Demo rules");
    syncCapacity(s);
  }
}
function requireRule(condition, message) { if (!condition) throw new Error(message); }
function mutate(s, request) {
  const actor = actorFor(s);
  requireRule(actor, "Choose a valid demo account.");
  requireRule(!request.actorId || request.actorId === actor.id, "The active account changed. Review the action again.");
  const r = s.signups.find(i => i.id === request.signupId);
  const e = eventFor(s, request.eventId || r?.eventId);
  const sh = e?.shifts.find(i => i.id === (request.shiftId || r?.shiftId));
  const student = s.users.find(u => u.id === r?.studentId) || actor;
  let message;
  syncCapacity(s);
  if (["signup", "accept-offer", "cancel-registration"].includes(request.type)) requireRule(actor.role === "student" && (!r || r.studentId === actor.id), "Only the registered student can change this registration.");
  if (request.type === "signup") {
    const error = eligibility(s,e,sh,actor); requireRule(!error,error);
    const status = sh.filled >= sh.capacity ? "waitlist" : e.approvalMode === "automatic" ? "approved" : "pending";
    requireRule(!request.expectedStatus || request.expectedStatus === status, "Availability or approval rules changed. Ask for a fresh proposal before confirming.");
    s.signups.push({id:uid("sg"),eventId:e.id,shiftId:sh.id,studentId:actor.id,status,createdAt:s.clock});
    message = status === "waitlist" ? "Joined the waitlist. A future offer needs your acceptance." : status === "pending" ? "Signup request sent for organizer approval." : "You’re registered for this shift.";
    notify(s,actor.id,message,`${e.title} · ${sh.name}`,e.id);
  } else if (request.type === "cancel-registration") {
    requireRule(r && ["pending","approved","waitlist","offered"].includes(r.status), "This registration can no longer be canceled.");
    r.status = "withdrawn";
    offerNext(s,e,sh); message = "Registration canceled. Any available spot is offered to the next eligible volunteer.";
  } else if (request.type === "accept-offer" || request.type === "approve-signup") {
    const offer = request.type === "accept-offer";
    requireRule(offer || canManage(s,e,actor), "You can only manage your organization’s events.");
    requireRule(r && r.status === (offer ? "offered" : "pending"), "This registration is no longer awaiting that action.");
    const error = eligibility(s,e,sh,student,r.id); requireRule(!error,error);
    requireRule(sh.filled - (offer ? 1 : 0) < sh.capacity, "The shift is full. Capacity was rechecked.");
    r.status = offer && e.approvalMode !== "automatic" ? "pending" : "approved";
    message = r.status === "pending" ? "Offer accepted. Organizer approval is still required." : "Signup approved.";
    notify(s,r.studentId,message,`${e.title} · ${sh.name}`,e.id);
  } else if (request.type === "reject-signup") {
    requireRule(canManage(s,e,actor), "You can only manage your organization’s events.");
    requireRule(r?.status === "pending", "Only pending requests can be denied.");
    r.status = "rejected"; offerNext(s,e,sh); message = "Signup denied.";
    notify(s,r.studentId,message,e.title,e.id);
  } else if (["check-in","check-out","no-show"].includes(request.type)) {
    requireRule(canManage(s,e,actor), "You can only manage your organization’s attendance.");
    requireRule(r && ["approved","attended"].includes(r.status), "Attendance requires an approved registration.");
    requireRule(e.status === "active" && s.clock.slice(0,10) === e.date, "Set the demo clock to the event date first.");
    const now = s.clock.slice(11,16);
    if (request.type === "check-in") {
      requireRule(!r.checkIn && !r.checkOut, "This volunteer is already checked in.");
      requireRule(now >= sh.start && now < sh.end, "Check in during the scheduled shift using the demo clock.");
      r.checkIn = now; r.status = "attended"; message = "Demo check-in recorded.";
    } else if (request.type === "check-out") {
      requireRule(r.checkIn && !r.checkOut, "Check in first; each registration can only be checked out once.");
      requireRule(now > r.checkIn && now <= sh.end, "Advance the demo clock after check-in, up to the scheduled shift end.");
      requireRule(!s.hours.some(h => h.signupId === r.id || (h.studentId === r.studentId && h.eventId === r.eventId && h.shiftId === r.shiftId)), "This shift already has a time card.");
      const hours = Math.round((minutes(now)-minutes(r.checkIn))/60*100)/100;
      const daily=s.hours.filter(h=>h.studentId===r.studentId&&h.date===e.date&&!["rejected","disputed"].includes(h.status)).reduce((n,h)=>n+Number(h.hours),0);
      requireRule(daily+hours<=12,"Daily hours cannot exceed 12, including pending entries.");
      r.checkOut = now;
      s.hours.push({id:uid("hr"),signupId:r.id,shiftId:sh.id,studentId:r.studentId,eventId:e.id,orgId:e.orgId,organization:e.organization,title:`${e.title} · ${sh.name}`,category:e.category,date:e.date,hours,status:"pending",approver:"—",updatedAt:s.clock,note:`Demo attendance ${r.checkIn}–${now}; awaiting organizer verification`});
      message = `${hours} hours submitted for verification. Not yet included in verified totals.`;
    } else {
      requireRule(!r.checkIn && now >= sh.end, "Record a no-show after the shift ends and before check-in.");
      r.status = "no-show"; message = "Demo no-show recorded.";
    }
  } else if (["verify-hour","reject-hour"].includes(request.type)) {
    const h = s.hours.find(i => i.id === request.hourId);
    requireRule(canReviewHour(s,h,actor), "Only the owning organizer or an admin can review these hours.");
    requireRule(h.status === "pending" || (actor.role === "admin" && h.status === "disputed"), "This time card has already been reviewed.");
    requireRule(Number.isFinite(Number(h.hours)) && Number(h.hours) > 0 && Number(h.hours) <= 12, "Check the submitted hours before verification.");
    h.status = request.type === "verify-hour" ? "verified" : "rejected"; h.approver = actor.name; h.updatedAt = s.clock;
    message = `Hours ${h.status}.`;
    notify(s,h.studentId,message,h.title,h.eventId);
  } else if (request.type === "cancel-event") {
    requireRule(canManage(s,e,actor), "You can only manage your organization’s events.");
    requireRule(e.status === "active", "This event is already canceled.");
    e.status = "canceled";
    for (const signup of s.signups.filter(i => i.eventId === e.id && ["pending","approved","waitlist","offered"].includes(i.status))) {
      signup.status = "canceled"; notify(s,signup.studentId,"Event canceled",e.title,e.id);
    }
    message = "Event canceled and demo notifications created.";
  } else if (request.type === "story-status") {
    requireRule(actor.role === "admin", "Only admins can publish or hide stories.");
    const story = s.stories.find(i => i.id === request.storyId);
    requireRule(story && ["published","hidden"].includes(request.status), "Choose a valid story status.");
    story.status = request.status; message = `Story ${story.status}.`;
  } else if (request.type === "clock") {
    requireRule(["admin","organizer"].includes(actor.role), "Only organizers and admins control the demo clock.");
    requireRule(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(request.value) && !Number.isNaN(Date.parse(request.value)), "Choose a valid demo date and time.");
    requireRule(request.reset || request.value >= s.clock, "Use Reset clock to move backward. Reset does not undo attendance.");
    s.clock = request.value; message = "Demo clock updated. Existing attendance is preserved.";
  } else throw new Error("This demo action is not supported.");
  syncCapacity(s);
  logActivity(s, request.type, e ? `${e.title} · ${message}` : message);
  return message;
}
// Transactional application prevents a failed confirmation from partially changing data.
export function act(state, request) {
  const draft = JSON.parse(JSON.stringify(state));
  try {
    const message = mutate(draft,request);
    Object.assign(state,draft);
    return {ok:true,message};
  } catch (error) {
    logActivity(state,`Rejected ${request.type}`,error.message);
    return {ok:false,message:error.message};
  }
}
export function reportData(s) {
  const actor = actorFor(s);
  const events = s.events.filter(e => canManage(s,e,actor));
  const hours = s.hours.filter(h => h.status === "verified" && canReviewHour(s,h,actor));
  const registrations = s.signups.filter(r => events.some(e => e.id === r.eventId));
  return {events, hours, volunteers:new Set(registrations.filter(r => !ended.includes(r.status)).map(r => r.studentId)).size, total:hours.reduce((n,h) => n+Number(h.hours),0)};
}
export const csvCell = v => `"${String(v ?? "").replace(/^[=+@-]/,"'$&").replaceAll('"','""')}"`;
export function studentCSV(s) {
  const actor = actorFor(s);
  if (!["admin","counselor"].includes(actor?.role)) return "";
  return [["Student","School","Grade","Verified hours","Goal"], ...s.users.filter(u => u.role === "student" && (actor.role === "admin" || u.school === actor.school)).map(u => [u.name,u.school,u.grade,verifiedHours(s,u.id),u.requirementGoal])].map(r => r.map(csvCell).join(",")).join("\n");
}
export function hoursCSV(s, studentId) {
  return [["Activity","Organization","Date","Hours","Status","Registration","Shift"],...s.hours.filter(h => h.studentId === studentId).map(h => [h.title,h.organization,h.date,h.hours,h.status,h.signupId,h.shiftId])].map(r => r.map(csvCell).join(",")).join("\n");
}
export function reportCSV(s) {
  const r=reportData(s);
  return [["Metric","Value"],["Verified hours",r.total],["Registered volunteers",r.volunteers],["Events",r.events.length]].map(row=>row.map(csvCell).join(",")).join("\n");
}
export function calendarFile(s, studentId) {
  const escape = value => String(value).replaceAll("\\","\\\\").replaceAll("\n","\\n").replaceAll(",","\\,").replaceAll(";","\\;");
  const dateTime = (date,time) => `${date.replaceAll("-","")}T${time.replace(":","")}00`;
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//CivicShift//Volunteer Calendar//EN"];
  for(const r of s.signups.filter(r=>r.studentId===studentId&&r.status==="approved")) {
    const event=eventFor(s,r.eventId),shift=event?.shifts.find(sh=>sh.id===r.shiftId);
    if(!event||!shift||event.status!=="active")continue;
    lines.push("BEGIN:VEVENT",`UID:${r.id}@civicshift.demo`,`DTSTART:${dateTime(event.date,shift.start)}`,`DTEND:${dateTime(event.date,shift.end)}`,`SUMMARY:${escape(event.title)}`,`LOCATION:${escape(event.address)}`,"END:VEVENT");
  }
  return [...lines,"END:VCALENDAR"].join("\r\n");
}
