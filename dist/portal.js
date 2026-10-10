import {
  CATEGORIES,
  DEMO_ACTIVITY,
  DEMO_EVENTS,
  DEMO_HOURS,
  DEMO_MESSAGES,
  DEMO_NOTIFICATIONS,
  DEMO_SIGNUPS,
  DEMO_TODAY,
  DEMO_USERS,
  ROLE_LABELS,
} from "./data.js";

const STORAGE_KEY = "civicshift-demo-v4";
const app = document.querySelector("#app");
const dialog = document.querySelector("#app-dialog");
const dialogContent = document.querySelector("#dialog-content");
const toastRegion = document.querySelector(".toast-region");

const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
const esc = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const formatDate = (date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
const formatShortDate = (date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));
const formatTime = (time) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(`2026-01-01T${time}:00`));
const durationHours = (start, end) => (toMinutes(end) - toMinutes(start)) / 60;
const toMinutes = (time) => Number(time.split(":")[0]) * 60 + Number(time.split(":")[1]);
const monthName = (date) => new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(`${date}T12:00:00`)).toUpperCase();
const dayNumber = (date) => new Date(`${date}T12:00:00`).getDate();

function seedState() {
  return {
    version: 4,
    role: "student",
    activeUser: { student: "stu-1", organizer: "org-1", admin: "admin-1", counselor: "counselor-1" },
    users: clone(DEMO_USERS),
    events: clone(DEMO_EVENTS),
    signups: clone(DEMO_SIGNUPS),
    hours: clone(DEMO_HOURS),
    notifications: clone(DEMO_NOTIFICATIONS),
    messages: clone(DEMO_MESSAGES),
    activity: clone(DEMO_ACTIVITY),
    saved: ["evt-tech", "evt-pantry"],
    unavailableDates: ["2026-10-24", "2026-10-31"],
    concerns: [{ id: "co-1", eventId: "evt-shelter", reporter: "Anonymous student", reason: "Event details unclear", status: "open", createdAt: "2026-10-09" }],
    organizationApplications: [
      { id: "oa-1", name: "Bright Futures Pantry", contact: "Kayla Reed", submitted: "2026-10-09", status: "pending" },
      { id: "oa-2", name: "Northside Arts Project", contact: "Theo Young", submitted: "2026-10-07", status: "pending" },
    ],
    reflections: [{ id: "rf-1", studentId: "stu-1", event: "River Cleanup", prompt: "What changed because of your service?", body: "Our team cleared litter from two public access points and made the river path safer for visitors.", date: "2026-09-14" }],
    feedback: [],
    settings: { dark: false, digest: "weekly", email: true, sms: false, tourComplete: false },
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed?.version === 4 ? parsed : seedState();
  } catch {
    return seedState();
  }
}

let state = loadState();
let ui = { search: "", category: "all", location: "all", availability: "all", sort: "relevance", view: "grid", studentGrade: "all", notificationFilter: "all" };
let pendingConfirm = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  document.body.classList.toggle("dark", Boolean(state.settings.dark));
}

function currentUser() {
  return state.users.find((user) => user.id === state.activeUser[state.role]) || state.users.find((user) => user.role === state.role);
}
function studentUser() { return state.users.find((user) => user.id === state.activeUser.student); }
function getUser(id) { return state.users.find((user) => user.id === id); }
function getEvent(id) { return state.events.find((event) => event.id === id); }
function getShift(event, shiftId) { return event?.shifts.find((shift) => shift.id === shiftId); }
function ownEvents() { const user = currentUser(); return state.events.filter((event) => state.role === "admin" || event.orgId === user.id); }
function verifiedHoursFor(studentId) { return state.hours.filter((entry) => entry.studentId === studentId && entry.status === "verified").reduce((sum, entry) => sum + Number(entry.hours), 0); }
function openSpots(event) { return event.shifts.reduce((sum, shift) => sum + Math.max(shift.capacity - shift.filled, 0), 0); }
function totalCapacity(event) { return event.shifts.reduce((sum, shift) => sum + shift.capacity, 0); }
function totalFilled(event) { return event.shifts.reduce((sum, shift) => sum + shift.filled, 0); }
function unreadCount(role = state.role) { return state.notifications.filter((item) => item.role === role && !item.read).length; }

const NAV = {
  student: [
    ["MAIN", "dashboard", "⌂", "Dashboard"], ["MAIN", "explore", "⌕", "Find opportunities"], ["MAIN", "calendar", "□", "Calendar"],
    ["MY SERVICE", "hours", "◷", "Hours & time cards"], ["MY SERVICE", "portfolio", "◇", "Portfolio & badges"], ["MY SERVICE", "notifications", "♢", "Notifications"],
    ["ACCOUNT", "profile", "○", "Profile & availability"], ["ACCOUNT", "help", "?", "Help center"],
  ],
  organizer: [
    ["MAIN", "dashboard", "⌂", "Dashboard"], ["MAIN", "events", "□", "Events & shifts"], ["MAIN", "approvals", "✓", "Approvals"],
    ["VOLUNTEERS", "roster", "≡", "Check-in & roster"], ["VOLUNTEERS", "communications", "✦", "Announcements"], ["VOLUNTEERS", "reports", "↗", "Impact reports"],
    ["ACCOUNT", "notifications", "♢", "Notifications"], ["ACCOUNT", "profile", "○", "Organization profile"], ["ACCOUNT", "help", "?", "Help center"],
  ],
  admin: [
    ["MAIN", "dashboard", "⌂", "Dashboard"], ["MAIN", "approvals", "✓", "Organization review"], ["MAIN", "people", "○", "People & access"],
    ["OVERSIGHT", "safety", "!", "Safety & concerns"], ["OVERSIGHT", "reports", "↗", "Platform analytics"], ["OVERSIGHT", "activity", "≡", "Audit history"],
    ["ACCOUNT", "notifications", "♢", "Notifications"], ["ACCOUNT", "help", "?", "Help center"],
  ],
  counselor: [
    ["MAIN", "dashboard", "⌂", "Dashboard"], ["MAIN", "students", "○", "Student hours"], ["MAIN", "reports", "↗", "School reports"],
    ["ACCOUNT", "notifications", "♢", "Notifications"], ["ACCOUNT", "help", "?", "Help center"],
  ],
};

function routeInfo() {
  const clean = (location.hash || "#/dashboard").replace(/^#\/?/, "");
  const parts = clean.split("/").filter(Boolean);
  return { route: parts[0] || "dashboard", id: parts[1], subId: parts[2] };
}

function navMarkup(route) {
  let lastSection = "";
  return NAV[state.role].map(([section, key, icon, label]) => {
    const heading = section !== lastSection ? `<span class="nav-section-label">${section}</span>` : "";
    lastSection = section;
    const badge = key === "notifications" && unreadCount() ? `<span class="nav-badge">${unreadCount()}</span>` : "";
    return `${heading}<a href="#/${key}" class="${route === key ? "active" : ""}"><span class="nav-icon" aria-hidden="true">${icon}</span>${label}${badge}</a>`;
  }).join("");
}

function shell(content, route, title) {
  const user = currentUser();
  return `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Portal navigation">
        <a class="brand" href="index.html" aria-label="CivicShift homepage">
          <svg viewBox="0 0 42 42" aria-hidden="true"><path d="M10 22.5 20.5 7 31 22.5 20.5 35 10 22.5Z" fill="currentColor"/><path d="m15.3 22.4 5.2-7.8 5.2 7.8-5.2 6.2-5.2-6.2Z" fill="#101d42"/></svg><span>CivicShift</span>
        </a>
        <div class="role-pill"><span class="role-avatar">${esc(user.avatar || user.name.slice(0,2))}</span><div><strong>${esc(user.name)}</strong><span>${esc(ROLE_LABELS[state.role])}</span></div></div>
        <nav class="side-nav">${navMarkup(route)}</nav>
        <div class="sidebar-footer">
          <a href="#/about"><span>◎</span> About this project</a>
          <button type="button" data-action="toggle-dark"><span>◐</span> ${state.settings.dark ? "Light mode" : "Dark mode"}</button>
          <a href="#/account"><span>⇄</span> Demo accounts</a>
        </div>
      </aside>
      <div class="app-main">
        <header class="topbar">
          <div class="topbar-left"><button class="icon-button mobile-menu" type="button" data-action="toggle-sidebar" aria-label="Open navigation">☰</button><span class="breadcrumb">CivicShift / <strong>${esc(title)}</strong></span></div>
          <div class="topbar-actions">
            <label class="sr-only" for="role-switch">Preview role</label>
            <select class="role-switch" id="role-switch" data-role-switch>
              ${Object.entries(ROLE_LABELS).map(([value,label]) => `<option value="${value}" ${value === state.role ? "selected" : ""}>${esc(label)}</option>`).join("")}
            </select>
            <a class="icon-button notification-button" href="#/notifications" aria-label="Notifications">♢${unreadCount() ? "<i></i>" : ""}</a>
          </div>
        </header>
        <main class="workspace" id="workspace" tabindex="-1">${content}</main>
      </div>
    </div>`;
}

function pageHead(eyebrow, title, copy = "", actions = "") {
  return `<div class="page-head"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${title}</h1>${copy ? `<p>${copy}</p>` : ""}</div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</div>`;
}
function metric(label, value, foot, accent = "var(--blue-soft)") {
  return `<article class="card metric-card" style="--accent:${accent}"><span class="metric-label">${label}</span><strong class="metric-value">${value}</strong><span class="metric-foot">${foot}</span></article>`;
}
function statusPill(status) { return `<span class="status status-${esc(status.toLowerCase().replaceAll(" ", "-"))}">${esc(status)}</span>`; }
function emptyState(title, copy, icon = "⌕") { return `<div class="empty"><div><span aria-hidden="true">${icon}</span><h3>${esc(title)}</h3><p>${esc(copy)}</p></div></div>`; }
function dateBox(date) { return `<span class="date-box"><strong>${dayNumber(date)}</strong><small>${monthName(date)}</small></span>`; }
function tagsMarkup(tags = []) { return `<div class="tag-row">${tags.map((tag) => `<span class="tag ${tag.includes("Ending") ? "tag-coral" : ""}">${esc(tag)}</span>`).join("")}</div>`; }

function eventCard(event) {
  const saved = state.saved.includes(event.id);
  const spots = openSpots(event);
  return `<article class="card event-card">
    <div class="event-art">${dateBox(event.date)}<button class="save ${saved ? "saved" : ""}" type="button" data-action="save-event" data-event="${event.id}" aria-label="${saved ? "Remove" : "Save"} ${esc(event.title)}" aria-pressed="${saved}">${saved ? "♥" : "♡"}</button></div>
    <div class="event-body">${tagsMarkup(event.tags.slice(0,2))}<h2>${esc(event.title)}</h2><p>${esc(event.description)}</p>
      <div class="event-meta"><span>⌖ ${esc(event.location)} · ${esc(event.locationType)}</span><span>◷ ${formatDate(event.date)} · ${formatTime(event.shifts[0].start)}</span><span>◎ Grade ${event.minGrade}+${event.requiredSkills.length ? ` · ${esc(event.requiredSkills.join(", "))}` : ""}</span></div>
      <div class="event-footer"><span class="spots"><strong>${spots}</strong> ${spots === 1 ? "spot" : "spots"} open</span><a class="button button-dark button-small" href="#/event/${event.id}">View details</a></div>
    </div></article>`;
}

function recommendedEvents(student, limit = 3) {
  return state.events.filter((event) => event.status === "active" && event.date >= DEMO_TODAY).map((event) => {
    let score = 50;
    if (student.interests.includes(event.category)) score += 25;
    if (!event.requiredSkills.length || event.requiredSkills.some((skill) => student.skills.includes(skill))) score += 12;
    if (event.minGrade <= student.grade) score += 8;
    if (event.locationType === "Virtual" || event.location.includes(student.location)) score += 5;
    return { event, score: Math.min(score, 98) };
  }).sort((a,b) => b.score - a.score).slice(0, limit);
}

function dashboardView() {
  if (state.role === "organizer") return organizerDashboard();
  if (state.role === "admin") return adminDashboard();
  if (state.role === "counselor") return counselorDashboard();
  return studentDashboard();
}

function studentDashboard() {
  const student = currentUser();
  const matches = recommendedEvents(student);
  const upcoming = state.signups.filter((signup) => signup.studentId === student.id && ["approved","pending"].includes(signup.status)).map((signup) => ({ ...signup, event: getEvent(signup.eventId) })).filter((item) => item.event);
  const verified = verifiedHoursFor(student.id) + 32;
  const progress = Math.min((verified / student.requirementGoal) * 100, 100);
  return `${pageHead("Student dashboard", `Good afternoon, ${esc(student.name.split(" ")[0])}.`, "Your schedule, service progress, and next best opportunities are all in one place.", `<a class="button button-primary" href="#/explore">Find a shift</a><a class="button button-light" href="#/hours">Log hours</a>`)}
    <section class="grid grid-4" aria-label="Service summary">
      ${metric("Verified service", `${verified.toFixed(1)}h`, `${student.requirementGoal - verified > 0 ? (student.requirementGoal - verified).toFixed(1) : 0} hours to goal`, "var(--mint-soft)")}
      ${metric("Upcoming shifts", upcoming.filter((item) => item.status === "approved").length, "No schedule conflicts", "var(--blue-soft)")}
      ${metric("Pending applications", upcoming.filter((item) => item.status === "pending").length, "Organizer review", "var(--yellow-soft)")}
      ${metric("Saved opportunities", state.saved.length, "Ready when you are", "var(--coral-soft)")}
    </section>
    <section class="grid grid-3" style="margin-top:17px">
      <article class="card hero-card span-2"><span class="eyebrow">Best match · ${matches[0].score}%</span><h2>${esc(matches[0].event.title)}</h2><p>${esc(matches[0].event.description)}</p><a class="button" href="#/event/${matches[0].event.id}">See why it matches →</a></article>
      <article class="card"><div class="card-head"><div><h2>${esc(student.requirementName)}</h2><p>Verified hours only</p></div><span class="tag">${Math.round(progress)}%</span></div><div class="summary-price">${verified.toFixed(1)} <small>/ ${student.requirementGoal} hours</small></div><div class="progress" aria-label="${Math.round(progress)} percent complete"><span style="width:${progress}%"></span></div><div class="goal-row"><span>Started Aug 2026</span><strong>${student.requirementGoal - verified > 0 ? `${(student.requirementGoal - verified).toFixed(1)} to go` : "Goal reached"}</strong></div></article>
      <article class="card span-2"><div class="card-head"><div><h2>Your next commitments</h2><p>Approved and pending shifts</p></div><a class="button button-link" href="#/calendar">Open calendar →</a></div><div class="list">${upcoming.length ? upcoming.slice(0,4).map((item) => { const shift = getShift(item.event,item.shiftId); return `<div class="list-row"><span class="list-icon">${dayNumber(item.event.date)}</span><div class="list-copy"><strong>${esc(item.event.title)}</strong><span>${formatDate(item.event.date)} · ${formatTime(shift.start)}-${formatTime(shift.end)} · ${esc(item.event.location)}</span></div><div class="list-side">${statusPill(item.status)}</div></div>`; }).join("") : emptyState("No upcoming shifts","Explore opportunities to build your schedule.")}</div></article>
      <article class="card"><div class="card-head"><div><h2>Milestones</h2><p>Recognition stays opt-in</p></div><a class="button button-link" href="#/portfolio">View all</a></div><div class="badge-grid"><div class="achievement"><span class="medal">10</span><strong>10 hours</strong><small>Earned</small></div><div class="achievement"><span class="medal">25</span><strong>25 hours</strong><small>Earned</small></div><div class="achievement locked"><span class="medal">50</span><strong>50 hours</strong><small>${(50-verified).toFixed(1)} to go</small></div><div class="achievement"><span class="medal">✦</span><strong>3 causes</strong><small>Explorer</small></div></div></article>
      <article class="card span-3"><div class="card-head"><div><h2>Recommended for you</h2><p>Based on interests, availability, location, and experience</p></div><a class="button button-link" href="#/explore">See all opportunities →</a></div><div class="event-grid">${matches.map(({event}) => eventCard(event)).join("")}</div></article>
    </section>`;
}

function organizerDashboard() {
  const user = currentUser();
  const events = ownEvents().filter((event) => event.status === "active");
  const eventIds = new Set(events.map((event) => event.id));
  const pending = state.signups.filter((signup) => eventIds.has(signup.eventId) && signup.status === "pending");
  const pendingHours = state.hours.filter((entry) => entry.status === "pending").length;
  const volunteers = new Set(state.signups.filter((signup) => eventIds.has(signup.eventId)).map((signup) => signup.studentId)).size;
  return `${pageHead("Organizer dashboard", `${esc(user.nonprofitName)} at a glance.`, "Keep shifts staffed, approvals moving, and volunteer records accurate.", `<a class="button button-primary" href="#/events/new">Create event</a><a class="button button-light" href="#/communications">Send update</a>`)}
    <section class="grid grid-4">${metric("Upcoming events", events.length, "Across all recurring series","var(--blue-soft)")}${metric("Registered volunteers", volunteers, "Unique students","var(--mint-soft)")}${metric("Unfilled shift spots", events.reduce((sum,event)=>sum+openSpots(event),0), "Matching suggestions available","var(--coral-soft)")}${metric("Hours awaiting review", pendingHours, "Keep records current","var(--yellow-soft)")}</section>
    <section class="grid grid-3" style="margin-top:17px">
      <article class="card span-2"><div class="card-head"><div><h2>Staffing health</h2><p>Open capacity by upcoming event</p></div><a class="button button-link" href="#/events">Manage events →</a></div><div class="list">${events.map((event)=>{const filled=totalFilled(event),capacity=totalCapacity(event),percent=Math.round(filled/capacity*100);return `<div class="list-row"><span class="list-icon">${dayNumber(event.date)}</span><div class="list-copy"><strong>${esc(event.title)}</strong><span>${filled} of ${capacity} spots filled · ${formatDate(event.date)}</span><div class="progress" style="margin-top:7px"><span style="width:${percent}%"></span></div></div><div class="list-side"><strong>${openSpots(event)} open</strong><span>${percent}% staffed</span></div></div>`}).join("")}</div></article>
      <article class="card"><div class="card-head"><div><h2>Needs attention</h2><p>Approvals and records</p></div></div><div class="quick-actions"><a class="qa" href="#/approvals"><span>✓</span><strong>${pending.length} signup requests</strong><small>Review student eligibility</small></a><a class="qa" href="#/approvals"><span>◷</span><strong>${pendingHours} hour entries</strong><small>Verify or adjust time</small></a><a class="qa" href="#/roster"><span>≡</span><strong>Event-day roster</strong><small>Check in volunteers</small></a></div></article>
      <article class="card span-2"><div class="card-head"><div><h2>Volunteer participation</h2><p>Verified hours by month</p></div><a class="button button-link" href="#/reports">Full impact report</a></div>${barChart([22,31,28,46,39,54],["May","Jun","Jul","Aug","Sep","Oct"])}</article>
      <article class="card"><div class="card-head"><div><h2>Recent activity</h2><p>Accountable change history</p></div></div><div class="timeline">${state.activity.slice(0,4).map((item)=>`<div class="timeline-item"><span class="timeline-dot">✓</span><div class="timeline-copy"><strong>${esc(item.action)}</strong><span>${esc(item.subject)}<br>${esc(item.actor)} · ${esc(item.time)}</span></div></div>`).join("")}</div></article>
    </section>`;
}

function adminDashboard() {
  const students = state.users.filter((user)=>user.role==="student");
  return `${pageHead("Administration", "Keep the network safe and trustworthy.", "Review organizations, monitor access, and resolve concerns without exposing student information.", `<a class="button button-primary" href="#/approvals">Review organizations</a><a class="button button-light" href="#/safety">Open safety queue</a>`)}
    <section class="grid grid-4">${metric("Active students",students.length,"Demo community","var(--blue-soft)")}${metric("Verified organizations",state.users.filter((u)=>u.role==="organizer"&&u.verified).length,"Background checks tracked","var(--mint-soft)")}${metric("Open concerns",state.concerns.filter((c)=>c.status==="open").length,"Private review queue","var(--coral-soft)")}${metric("Hours this month",126,"Verified across organizations","var(--yellow-soft)")}</section>
    <section class="grid grid-3" style="margin-top:17px"><article class="card span-2"><div class="card-head"><div><h2>Platform participation</h2><p>Verified volunteer hours by organization</p></div><a class="button button-link" href="#/reports">Compare organizations →</a></div>${barChart([42,35,28,21],["Greenway","Bridge","Food Net.","Paws"])}</article><article class="card"><div class="card-head"><div><h2>Review queue</h2><p>Time-sensitive items</p></div></div><div class="quick-actions"><a class="qa" href="#/approvals"><span>◎</span><strong>${state.organizationApplications.filter((item)=>item.status==="pending").length} nonprofit applications</strong><small>Identity and policy review</small></a><a class="qa" href="#/safety"><span>!</span><strong>${state.concerns.filter((item)=>item.status==="open").length} reported concern</strong><small>Restricted details</small></a><a class="qa" href="#/people"><span>○</span><strong>Permissions audit</strong><small>Role-scoped access</small></a></div></article><article class="card span-3"><div class="card-head"><div><h2>Latest audit entries</h2><p>Who changed what and when</p></div><a class="button button-link" href="#/activity">Full history →</a></div>${activityTable(state.activity.slice(0,4))}</article></section>`;
}

function counselorDashboard() {
  const students = state.users.filter((user)=>user.role==="student" && user.school===currentUser().school);
  const total = students.reduce((sum,student)=>sum+student.verifiedHours,0);
  const onTrack = students.filter((student)=>student.verifiedHours/student.requirementGoal>=.7).length;
  return `${pageHead("Counselor dashboard", `${esc(currentUser().school)} service progress.`, "Read-only access to verified records helps schools support students without changing nonprofit data.", `<button class="button button-primary" data-action="export-students">Export verified hours</button>`)}
    <div class="alert"><span>🔒</span><div><strong>Read-only school view</strong><p>You can view and export verified hours for students at your school. You cannot edit student, event, or organizer records.</p></div></div>
    <section class="grid grid-4">${metric("Students tracked",students.length,"At your school","var(--blue-soft)")}${metric("Verified hours",total.toFixed(1),"Across all students","var(--mint-soft)")}${metric("On track",onTrack,`of ${students.length} students`,"var(--yellow-soft)")}${metric("Needs follow-up",students.length-onTrack,"Based on current goals","var(--coral-soft)")}</section>
    <section class="grid grid-3" style="margin-top:17px"><article class="card span-2"><div class="card-head"><div><h2>Student progress</h2><p>Filterable verified-hour overview</p></div><a class="button button-link" href="#/students">Open full roster →</a></div>${studentTable(students)}</article><article class="card"><div class="card-head"><div><h2>Hours by grade</h2><p>Verified records only</p></div></div>${barChart([28,42,67],["Grade 10","Grade 11","Grade 12"])}</article></section>`;
}

function barChart(values, labels) {
  const max = Math.max(...values);
  return `<div class="chart" aria-label="Bar chart">${values.map((value,index)=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(value/max*100,4)}%" title="${value}"></div><span>${esc(labels[index])}</span></div>`).join("")}</div>`;
}

function exploreView() {
  const student = studentUser();
  let events = state.events.filter((event)=>event.status==="active" && event.date>=DEMO_TODAY);
  if (ui.search) { const needle=ui.search.toLowerCase(); events=events.filter((event)=>`${event.title} ${event.organization} ${event.description} ${event.category} ${event.location} ${event.requiredSkills.join(" ")} ${event.tags.join(" ")}`.toLowerCase().includes(needle)); }
  if (ui.category!=="all") events=events.filter((event)=>event.category===ui.category);
  if (ui.location!=="all") events=events.filter((event)=>event.locationType.toLowerCase().includes(ui.location));
  if (ui.availability==="open") events=events.filter((event)=>openSpots(event)>0);
  if (ui.availability==="match") events=events.filter((event)=>event.minGrade<=student.grade && (!event.requiredSkills.length || event.requiredSkills.some((skill)=>student.skills.includes(skill))));
  if (ui.sort==="date") events.sort((a,b)=>a.date.localeCompare(b.date));
  if (ui.sort==="spots") events.sort((a,b)=>openSpots(b)-openSpots(a));
  if (ui.sort==="relevance") { const scoreMap=new Map(recommendedEvents(student,99).map((item)=>[item.event.id,item.score])); events.sort((a,b)=>(scoreMap.get(b.id)||0)-(scoreMap.get(a.id)||0)); }
  return `${pageHead("Opportunity discovery", "Find work that fits your life.", "Search trusted nonprofits, compare shifts, and filter by schedule, eligibility, skills, and remaining space.", `<div class="view-toggle"><button class="${ui.view==="grid"?"active":""}" data-action="set-view" data-view="grid">Grid</button><button class="${ui.view==="map"?"active":""}" data-action="set-view" data-view="map">Map</button></div>`)}
    <form class="filter-bar" data-form="filters"><div class="field"><label for="search">Keyword</label><input id="search" name="search" value="${esc(ui.search)}" placeholder="Cause, skill, role, or location"></div><div class="field"><label for="category">Category</label><select id="category" name="category"><option value="all">All categories</option>${CATEGORIES.map((category)=>`<option ${ui.category===category?"selected":""}>${esc(category)}</option>`).join("")}</select></div><div class="field"><label for="location">Location</label><select id="location" name="location"><option value="all">Any location</option><option value="in person" ${ui.location==="in person"?"selected":""}>In person</option><option value="virtual" ${ui.location==="virtual"?"selected":""}>Virtual / hybrid</option></select></div><div class="field"><label for="availability">Eligibility</label><select id="availability" name="availability"><option value="all">Any availability</option><option value="open" ${ui.availability==="open"?"selected":""}>Open shifts only</option><option value="match" ${ui.availability==="match"?"selected":""}>Matches my profile</option></select></div><div class="field"><label for="sort">Sort</label><select id="sort" name="sort"><option value="relevance" ${ui.sort==="relevance"?"selected":""}>Relevance</option><option value="date" ${ui.sort==="date"?"selected":""}>Date</option><option value="spots" ${ui.sort==="spots"?"selected":""}>Most open spots</option></select></div><button class="button button-primary" type="submit">Apply</button></form>
    <div class="card-head"><div><h2>${events.length} opportunities</h2><p>${ui.search||ui.category!=="all"?"Filtered results":"New this week, ending soon, and recommended matches"}</p></div></div>
    ${ui.view==="map" ? mapView(events) : events.length ? `<div class="event-grid">${events.map(eventCard).join("")}</div>` : emptyState("No matches found","Try a different category or remove a filter.")}`;
}

function mapView(events) {
  const selected=events[0];
  return `<div class="map" aria-label="Map view of opportunity locations">${selected?`<div class="map-card"><span class="tag">${esc(selected.category)}</span><h3>${esc(selected.title)}</h3><p>${formatDate(selected.date)} · ${esc(selected.location)}</p><a class="button button-primary button-small" style="margin-top:10px" href="#/event/${selected.id}">View shift</a></div>`:""}${events.map((event,index)=>`<div class="map-pin" style="left:${event.lat}%;top:${event.lng}%"><button type="button" data-action="map-event" data-event="${event.id}" aria-label="Show ${esc(event.title)}"><span>${index+1}</span></button></div>`).join("")}</div>`;
}

function eventDetailView(eventId) {
  const event=getEvent(eventId);
  if (!event) return `${pageHead("Not found","Opportunity unavailable.","This event may have been removed or canceled.")}<a class="button button-primary" href="#/explore">Back to opportunities</a>`;
  const student=studentUser();
  const match=recommendedEvents(student,99).find((item)=>item.event.id===event.id)?.score || 55;
  const messages=state.messages.filter((message)=>message.eventId===event.id);
  const saved=state.saved.includes(event.id);
  const canManage=(state.role==="organizer"&&event.orgId===currentUser().id)||state.role==="admin";
  return `${pageHead("Opportunity details", event.title, `${event.organization} · ${event.verifiedOrganizer?"Verified nonprofit":"Verification pending"}`, `<button class="button button-light" data-action="save-event" data-event="${event.id}">${saved?"♥ Saved":"♡ Save"}</button>${canManage?`<a class="button button-primary" href="#/events/edit/${event.id}">Edit event</a>`:""}`)}
    <div class="detail-layout"><div class="grid">
      <article class="card detail-hero">${tagsMarkup(event.tags)}<h1>${esc(event.title)}</h1><p class="detail-lede">${esc(event.description)}</p><div class="verified-line"><span>✓</span>${esc(event.organization)} · organizer verified by CivicShift</div><div class="info-strip"><div class="info-item"><span>WHEN</span><strong>${formatDate(event.date)}</strong></div><div class="info-item"><span>WHERE</span><strong>${esc(event.location)} · ${esc(event.locationType)}</strong></div><div class="info-item"><span>ELIGIBILITY</span><strong>Grade ${event.minGrade}+${event.requiredSkills.length?` · ${esc(event.requiredSkills.join(", "))}`:""}</strong></div></div></article>
      <article class="card"><div class="card-head"><div><h2>Choose a shift</h2><p>Capacity is rechecked when you register</p></div><span class="tag">${match}% match</span></div>${event.shifts.map((shift)=>shiftMarkup(event,shift)).join("")}</article>
      <article class="card"><div class="card-head"><div><h2>What you’ll do</h2><p>Event-day expectations</p></div></div><ul class="feature-list">${event.responsibilities.map((item)=>`<li>${esc(item)}</li>`).join("")}</ul><div class="grid grid-2" style="margin-top:18px"><div><span class="field-label">WHAT TO BRING</span><p style="font-size:.68rem;margin-top:6px">${esc(event.whatToBring)}</p></div><div><span class="field-label">PARKING / ACCESS</span><p style="font-size:.68rem;margin-top:6px">${esc(event.parking)}</p></div></div></article>
      <article class="card"><div class="card-head"><div><h2>Public event Q&A</h2><p>Messages involving minors stay in this shared event channel</p></div></div><div class="list">${messages.map((message)=>`<div class="list-row"><span class="mini-avatar">${esc(message.author.split(" ").map((part)=>part[0]).join("").slice(0,2))}</span><div class="list-copy"><strong>${esc(message.author)} · ${esc(message.authorRole)}</strong><span>${esc(message.body)}</span></div><div class="list-side">${esc(message.time)}</div></div>`).join("")}</div>${state.role!=="counselor"?`<form class="form-grid" style="margin-top:15px" data-form="message"><input type="hidden" name="eventId" value="${event.id}"><div class="field"><label for="message-body">Ask a public question</label><input id="message-body" name="body" required maxlength="240" placeholder="Ask about supplies, access, or event-day details"></div><div style="align-self:end"><button class="button button-primary" type="submit">Post to event channel</button></div></form>`:""}</article>
    </div><aside class="card sticky-card"><span class="eyebrow">Registration summary</span><h2>${openSpots(event)} total spots open</h2><p class="fine-print">Students under 18 need guardian consent on file before approval. Emergency contacts are only visible to the shift organizer.</p><ul class="rule-list"><li>No duplicate or overlapping bookings</li><li>Grade and skill requirements checked</li><li>Waitlist offered automatically when full</li><li>Withdrawal updates organizer capacity</li></ul>${state.role==="student"?`<div class="alert ${student.guardianConsent?"alert-success":"alert-warning"}"><span>${student.guardianConsent?"✓":"!"}</span><div><strong>Guardian consent ${student.guardianConsent?"on file":"needed"}</strong><p>${student.guardianConsent?"Your current waiver can be used for this event.":"Complete consent before requesting a shift."}</p></div></div>`:""}<button class="button button-danger" type="button" data-action="report-concern" data-event="${event.id}" style="width:100%">Report a concern</button></aside></div>`;
}

function shiftMarkup(event,shift) {
  const student=studentUser();
  const signup=state.signups.find((item)=>item.eventId===event.id&&item.shiftId===shift.id&&item.studentId===student.id&&item.status!=="withdrawn");
  const spots=Math.max(shift.capacity-shift.filled,0);
  const hours=durationHours(shift.start,shift.end);
  let action="";
  if (state.role==="student") {
    if (signup) action=`${statusPill(signup.status)}<button class="button button-danger button-small" data-action="withdraw" data-signup="${signup.id}">Withdraw</button>`;
    else action=`<button class="button ${spots?"button-primary":"button-light"} button-small" data-action="signup-shift" data-event="${event.id}" data-shift="${shift.id}">${spots?"Request shift":"Join waitlist"}</button>`;
  } else action=`<span class="tag">${shift.filled}/${shift.capacity} filled</span>`;
  return `<div class="shift-card"><div><h3>${esc(shift.name)} · ${esc(shift.role)}</h3><p>${formatTime(shift.start)}-${formatTime(shift.end)} · ${hours} hours · <strong>${spots} spots remaining</strong></p></div><div class="shift-actions">${action}</div></div>`;
}

function calendarView() {
  const student=studentUser();
  const signups=state.signups.filter((signup)=>signup.studentId===student.id&&["approved","pending"].includes(signup.status));
  const eventsByDate={}; signups.forEach((signup)=>{const event=getEvent(signup.eventId); if(event)(eventsByDate[event.date]??=[]).push({event,signup});});
  const first=new Date("2026-10-01T12:00:00"); const startPad=first.getDay(); const days=[];
  for(let i=0;i<startPad;i++)days.push(`<div aria-hidden="true"></div>`);
  for(let day=1;day<=31;day++){const date=`2026-10-${String(day).padStart(2,"0")}`;const unavailable=state.unavailableDates.includes(date);const items=eventsByDate[date]||[];days.push(`<div class="${unavailable?"calendar-unavailable":""}"><button class="button-link day-number" data-action="toggle-availability" data-date="${date}" aria-label="${unavailable?"Mark available":"Mark unavailable"} October ${day}">${day}</button>${items.map(({event,signup})=>`<a class="calendar-event ${signup.status==="pending"?"conflict":""}" href="#/event/${event.id}">${esc(event.title)}</a>`).join("")}</div>`);}
  return `${pageHead("Calendar & availability","Protect your time.","Approved shifts appear automatically. Select a date to mark yourself unavailable.",`<button class="button button-light" data-action="download-ics">Download calendar</button><button class="button button-primary" data-action="google-calendar">Add next shift to Google Calendar</button>`)}
    <div class="calendar-layout"><article class="card calendar"><div class="calendar-head"><h2>October 2026</h2><div class="tag-row"><span class="tag">Approved</span><span class="tag tag-coral">Pending</span></div></div><div class="calendar-grid">${["SUN","MON","TUE","WED","THU","FRI","SAT"].map((day)=>`<div class="weekday">${day}</div>`).join("")}${days.join("")}</div></article><aside class="grid"><article class="card"><div class="card-head"><div><h2>Weekly availability</h2><p>Used for smart matching</p></div><a class="button button-link" href="#/profile">Edit</a></div><div class="list">${student.availability.map((item)=>`<div class="list-row"><span class="list-icon">✓</span><div class="list-copy"><strong>${esc(item.split(" ")[0])}</strong><span>${esc(item.substring(item.indexOf(" ")+1))}</span></div></div>`).join("")}</div></article><article class="card"><div class="card-head"><div><h2>Conflict guard</h2><p>Automatic checks</p></div></div><div class="alert alert-success"><span>✓</span><div><strong>No current conflicts</strong><p>New signup requests are checked against approved and pending commitments.</p></div></div><p class="fine-print">Unavailable dates: ${state.unavailableDates.map(formatShortDate).join(", ")||"None"}</p></article></aside></div>`;
}

function hoursView() {
  const student=studentUser(); const entries=state.hours.filter((entry)=>entry.studentId===student.id); const verified=verifiedHoursFor(student.id)+32; const pending=entries.filter((entry)=>entry.status==="pending").reduce((sum,entry)=>sum+Number(entry.hours),0);
  return `${pageHead("Hours & time cards","Every hour, accounted for.","Automatic time cards and manual entries stay separate until an organizer verifies them.",`<button class="button button-light" data-action="export-hours">Download CSV</button><button class="button button-primary" data-action="certificate">Print certificate</button>`)}
    <section class="grid grid-3">${metric("Verified hours",verified.toFixed(1),"Accepted toward goals","var(--mint-soft)")}${metric("Pending review",pending.toFixed(1),"Awaiting organizer action","var(--yellow-soft)")}${metric("School goal",`${Math.round(verified/student.requirementGoal*100)}%`,`${student.requirementGoal} required hours`,`var(--blue-soft)`)}</section>
    <section class="grid grid-3" style="margin-top:17px"><article class="card span-2"><div class="card-head"><div><h2>Service-hour history</h2><p>Rounding rule: nearest quarter hour · daily maximum: 12 hours</p></div></div>${hoursTable(entries)}</article><article class="card"><div class="card-head"><div><h2>Submit outside hours</h2><p>Organizer verification required</p></div></div><form data-form="hours"><div class="field"><label for="hours-title">Activity</label><input id="hours-title" name="title" required maxlength="80"></div><div class="field" style="margin-top:10px"><label for="hours-org">Organization</label><input id="hours-org" name="organization" required maxlength="80"></div><div class="form-grid" style="margin-top:10px"><div class="field"><label for="hours-date">Date</label><input id="hours-date" name="date" type="date" max="${DEMO_TODAY}" required></div><div class="field"><label for="hours-value">Hours</label><input id="hours-value" name="hours" type="number" min="0.25" max="12" step="0.25" required></div></div><div class="field" style="margin-top:10px"><label for="hours-note">Evidence or note</label><textarea id="hours-note" name="note" required maxlength="300"></textarea></div><button class="button button-primary" type="submit" style="margin-top:12px;width:100%">Submit for verification</button></form></article></section>`;
}

function hoursTable(entries) {
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Activity</th><th>Date</th><th>Hours</th><th>Status</th><th>Reviewed by</th><th>Action</th></tr></thead><tbody>${entries.map((entry)=>`<tr><td><strong>${esc(entry.title)}</strong><br><small>${esc(entry.organization)}</small></td><td>${formatShortDate(entry.date)}</td><td>${Number(entry.hours).toFixed(2)}</td><td>${statusPill(entry.status)}</td><td>${esc(entry.approver)}</td><td>${entry.status==="rejected"||entry.status==="adjusted"?`<button class="button button-light button-small" data-action="dispute-hour" data-hour="${entry.id}">Dispute</button>`:"—"}</td></tr>`).join("")}</tbody></table></div>`;
}

function portfolioView() {
  const student=studentUser(); const verified=verifiedHoursFor(student.id)+32;
  return `${pageHead("Service portfolio","Your impact has a story.","Combine verified hours, causes, skills, and reflections for school, scholarships, and applications.",`<button class="button button-light" data-action="export-portfolio">Export portfolio</button><button class="button button-primary" data-action="recommendation">Request recommendation</button>`)}
    <section class="grid grid-3"><article class="card hero-card span-2"><span class="eyebrow">Service profile</span><h2>${esc(student.name)} · ${verified.toFixed(1)} verified hours</h2><p>Focused on environmental action, peer learning, and accessible technology.</p><div class="tag-row">${student.skills.map((skill)=>`<span class="tag">${esc(skill)}</span>`).join("")}</div></article><article class="card"><div class="card-head"><div><h2>Cause mix</h2><p>Verified service</p></div></div><div class="donut" role="img" aria-label="${verified.toFixed(1)} total verified hours across four causes"><span>${verified.toFixed(1)}<small>total hours</small></span></div></article></section>
    <section class="grid grid-2" style="margin-top:17px"><article class="card"><div class="card-head"><div><h2>Milestone badges</h2><p>Private unless you opt in to sharing</p></div></div><div class="badge-grid"><div class="achievement"><span class="medal">10</span><strong>10 hours</strong><small>Earned Aug 2026</small></div><div class="achievement"><span class="medal">25</span><strong>25 hours</strong><small>Earned Sep 2026</small></div><div class="achievement locked"><span class="medal">50</span><strong>50 hours</strong><small>${(50-verified).toFixed(1)} to go</small></div><div class="achievement"><span class="medal">✦</span><strong>Cause explorer</strong><small>3 categories</small></div></div></article><article class="card"><div class="card-head"><div><h2>Reflection journal</h2><p>Useful for school and college applications</p></div></div>${state.reflections.filter((item)=>item.studentId===student.id).map((item)=>`<blockquote style="margin:0 0 15px;padding:15px;border-left:3px solid var(--blue);background:var(--blue-soft);font-size:.68rem"><strong>${esc(item.event)}</strong><p style="margin:7px 0 0">${esc(item.body)}</p></blockquote>`).join("")}<form data-form="reflection"><div class="field"><label for="reflection-event">Event</label><input id="reflection-event" name="event" required></div><div class="field" style="margin-top:9px"><label for="reflection-body">What changed because of your service?</label><textarea id="reflection-body" name="body" required maxlength="500"></textarea></div><button class="button button-primary" type="submit" style="margin-top:10px">Save reflection</button></form></article></section>`;
}

function profileView() {
  const user=currentUser();
  if(state.role==="organizer") return organizerProfileView(user);
  if(state.role!=="student") return `${pageHead("Profile & security","Account settings.","Review role details and privacy controls.")}<article class="card"><div class="alert alert-success"><span>✓</span><div><strong>${state.role==="admin"?"Two-factor authentication enabled":"Read-only school access"}</strong><p>${state.role==="admin"?"A production deployment would require a second factor on every admin sign-in.":"Counselors can view verified hours only for students at their school."}</p></div></div><div class="field"><label>Name</label><input value="${esc(user.name)}" disabled></div><div class="field" style="margin-top:12px"><label>Email</label><input value="${esc(user.email)}" disabled></div></article>`;
  return `${pageHead("Student profile","Make matching more useful.","Update interests, skills, availability, school goals, safety information, and privacy preferences.")}
    <form class="card" data-form="profile"><div class="form-section"><h3>School and service goal</h3><div class="form-grid"><div class="field"><label for="profile-school">School</label><input id="profile-school" name="school" value="${esc(user.school)}" required></div><div class="field"><label for="profile-grade">Grade</label><select id="profile-grade" name="grade">${[9,10,11,12].map((grade)=>`<option ${user.grade===grade?"selected":""}>${grade}</option>`).join("")}</select></div><div class="field"><label for="goal-name">Requirement</label><input id="goal-name" name="requirementName" value="${esc(user.requirementName)}"></div><div class="field"><label for="goal-hours">Goal hours</label><input id="goal-hours" name="requirementGoal" type="number" min="1" max="500" value="${user.requirementGoal}"></div></div></div>
      <div class="form-section"><h3>Interests for recommendations</h3><div class="checkbox-grid">${CATEGORIES.map((category)=>`<label class="check-card"><input type="checkbox" name="interests" value="${esc(category)}" ${user.interests.includes(category)?"checked":""}><span>${esc(category)}<small>Use for matching and discovery</small></span></label>`).join("")}</div></div>
      <div class="form-section"><h3>Skills and availability</h3><div class="form-grid"><div class="field"><label for="profile-skills">Skills, separated by commas</label><input id="profile-skills" name="skills" value="${esc(user.skills.join(", "))}"></div><div class="field"><label for="profile-availability">Weekly availability, separated by semicolons</label><input id="profile-availability" name="availability" value="${esc(user.availability.join("; "))}"></div></div></div>
      <div class="form-section"><h3>Youth safety and privacy</h3><div class="form-grid"><div class="field"><label for="emergency">Emergency contact</label><input id="emergency" name="emergencyContact" value="${esc(user.emergencyContact)}" required><small class="field-help">Visible only to the approved shift organizer.</small></div><div class="field"><label for="privacy">Profile visibility</label><select id="privacy" name="privacy"><option value="organizers-only" ${user.privacy==="organizers-only"?"selected":""}>Approved organizers only</option><option value="private" ${user.privacy==="private"?"selected":""}>Private</option></select></div></div><label class="check-card" style="margin-top:12px"><input type="checkbox" name="guardianConsent" ${user.guardianConsent?"checked":""}><span>Guardian consent and liability waiver on file<small>Demo status only; production requires a signed, auditable document.</small></span></label><label class="check-card" style="margin-top:8px"><input type="checkbox" name="leaderboardOptIn" ${user.leaderboardOptIn?"checked":""}><span>Opt in to school leaderboard<small>Only first name and last initial would be shown.</small></span></label></div>
      <div class="page-actions"><button class="button button-primary" type="submit">Save profile</button><button class="button button-light" type="button" data-action="download-data">Download my data</button><button class="button button-danger" type="button" data-action="request-deletion">Request account deletion</button></div></form>`;
}

function organizerProfileView(user) {
  return `${pageHead("Organization profile",esc(user.nonprofitName),"Public organization information and verified contact details.")}<form class="card" data-form="organizer-profile"><div class="alert alert-success"><span>✓</span><div><strong>Verified organizer · background check recorded</strong><p>Verification details are visible to admins; students see only the verification badge.</p></div></div><div class="form-grid"><div class="field"><label for="org-name">Nonprofit name</label><input id="org-name" name="nonprofitName" value="${esc(user.nonprofitName)}" required></div><div class="field"><label for="org-contact">Public contact</label><input id="org-contact" name="contact" value="${esc(user.contact)}" required></div><div class="field span-2"><label for="org-description">Description</label><textarea id="org-description" name="description" required>${esc(user.description)}</textarea></div></div><button class="button button-primary" type="submit" style="margin-top:15px">Save organization profile</button></form>`;
}

function eventsView(id,subId) {
  if(id==="new") return eventFormView();
  if(id==="edit") return eventFormView(getEvent(subId));
  const events=ownEvents();
  return `${pageHead("Events & shift management","Build a schedule volunteers can trust.","Create, edit, duplicate, cancel, and staff one-time or recurring events.",`<a class="button button-primary" href="#/events/new">Create event</a>`)}<div class="event-grid">${events.map((event)=>`<article class="card event-card"><div class="event-art">${dateBox(event.date)}${event.status!=="active"?`<span class="status status-canceled" style="position:absolute;right:13px;top:13px">${esc(event.status)}</span>`:""}</div><div class="event-body">${tagsMarkup([event.recurring,event.category])}<h2>${esc(event.title)}</h2><p>${event.shifts.length} shifts · ${totalFilled(event)}/${totalCapacity(event)} volunteers · ${openSpots(event)} open spots</p><div class="event-footer"><a class="button button-light button-small" href="#/event/${event.id}">Preview</a><div class="table-actions"><a class="button button-light button-small" href="#/events/edit/${event.id}">Edit</a><button class="button button-light button-small" data-action="duplicate-event" data-event="${event.id}">Duplicate</button><button class="button button-danger button-small" data-action="cancel-event" data-event="${event.id}">${event.status==="canceled"?"Canceled":"Cancel"}</button></div></div></div></article>`).join("")}</div>`;
}

function eventFormView(event=null) {
  const editing=Boolean(event); const firstShift=event?.shifts[0];
  return `${pageHead("Event editor",editing?`Edit ${esc(event.title)}`:"Create a volunteer event",editing?"Changes are logged and confirmed volunteers will receive a notification.":"Start with event details, then add shift roles and capacity.",`<a class="button button-light" href="#/events">Cancel</a>`)}
    <form class="card" data-form="event"><input type="hidden" name="eventId" value="${event?.id||""}"><div class="form-section"><h3>Event details</h3><div class="form-grid"><div class="field"><label for="event-title">Title</label><input id="event-title" name="title" value="${esc(event?.title||"")}" required maxlength="90"></div><div class="field"><label for="event-category">Category</label><select id="event-category" name="category">${CATEGORIES.map((category)=>`<option ${event?.category===category?"selected":""}>${esc(category)}</option>`).join("")}</select></div><div class="field span-2"><label for="event-description">Description</label><textarea id="event-description" name="description" required maxlength="600">${esc(event?.description||"")}</textarea></div><div class="field"><label for="event-date">Date</label><input id="event-date" name="date" type="date" min="${DEMO_TODAY}" value="${event?.date||""}" required></div><div class="field"><label for="event-location-type">Location type</label><select id="event-location-type" name="locationType"><option ${event?.locationType==="In person"?"selected":""}>In person</option><option ${event?.locationType==="Virtual"?"selected":""}>Virtual</option><option ${event?.locationType==="Hybrid"?"selected":""}>Hybrid</option></select></div><div class="field"><label for="event-location">Venue / platform</label><input id="event-location" name="location" value="${esc(event?.location||"")}" required></div><div class="field"><label for="event-address">Address or access note</label><input id="event-address" name="address" value="${esc(event?.address||"")}" required></div></div></div>
      <div class="form-section"><h3>First shift</h3><div class="form-grid"><div class="field"><label for="shift-name">Shift name</label><input id="shift-name" name="shiftName" value="${esc(firstShift?.name||"Volunteer shift")}" required></div><div class="field"><label for="shift-role">Volunteer role</label><input id="shift-role" name="shiftRole" value="${esc(firstShift?.role||"General volunteer")}" required></div><div class="field"><label for="shift-start">Start</label><input id="shift-start" name="start" type="time" value="${firstShift?.start||"09:00"}" required></div><div class="field"><label for="shift-end">End</label><input id="shift-end" name="end" type="time" value="${firstShift?.end||"12:00"}" required></div><div class="field"><label for="shift-capacity">Capacity</label><input id="shift-capacity" name="capacity" type="number" min="1" max="250" value="${firstShift?.capacity||10}" required></div><div class="field"><label for="approval-mode">Signup approval</label><select id="approval-mode" name="approvalMode"><option value="automatic" ${event?.approvalMode==="automatic"?"selected":""}>Automatic if eligible</option><option value="manual" ${event?.approvalMode==="manual"?"selected":""}>Manual organizer approval</option></select></div></div></div>
      <div class="form-section"><h3>Requirements and recurrence</h3><div class="form-grid"><div class="field"><label for="min-grade">Minimum grade</label><select id="min-grade" name="minGrade">${[9,10,11,12].map((grade)=>`<option ${event?.minGrade===grade?"selected":""}>${grade}</option>`).join("")}</select></div><div class="field"><label for="required-skills">Required skills, separated by commas</label><input id="required-skills" name="requiredSkills" value="${esc(event?.requiredSkills.join(", ")||"")}"></div><div class="field"><label for="recurring">Repeat</label><select id="recurring" name="recurring">${["One time","Weekly","Monthly"].map((value)=>`<option ${event?.recurring===value?"selected":""}>${value}</option>`).join("")}</select></div><div class="field"><label for="tags">Tags, separated by commas</label><input id="tags" name="tags" value="${esc(event?.tags.join(", ")||"First-timer friendly")}"></div></div></div>
      <div class="form-section"><h3>Event-day details</h3><div class="form-grid"><div class="field"><label for="bring">What to bring</label><textarea id="bring" name="whatToBring">${esc(event?.whatToBring||"")}</textarea></div><div class="field"><label for="parking">Parking / access</label><textarea id="parking" name="parking">${esc(event?.parking||"")}</textarea></div></div></div><button class="button button-primary" type="submit">${editing?"Save event changes":"Create event"}</button></form>`;
}

function approvalsView() {
  if(state.role==="admin") return organizationApprovalsView();
  const eventIds=new Set(ownEvents().map((event)=>event.id));
  const pending=state.signups.filter((signup)=>eventIds.has(signup.eventId)&&signup.status==="pending");
  const pendingHours=state.hours.filter((entry)=>entry.status==="pending");
  return `${pageHead("Approvals","Keep signups and hours moving.","Eligibility, guardian consent, conflicts, and capacity are shown before action.")}
    <section class="grid grid-2"><article class="card"><div class="card-head"><div><h2>Signup requests</h2><p>${pending.length} awaiting review</p></div></div>${pending.length?`<div class="list">${pending.map((signup)=>{const user=getUser(signup.studentId),event=getEvent(signup.eventId),shift=getShift(event,signup.shiftId);return `<div class="list-row"><span class="mini-avatar">${esc(user.avatar)}</span><div class="list-copy"><strong>${esc(user.name)} · Grade ${user.grade}</strong><span>${esc(event.title)} · ${esc(shift.name)}<br>Consent: ${user.guardianConsent?"on file":"missing"} · Conflicts: none</span></div><div class="table-actions"><button class="button button-success button-small" data-action="approve-signup" data-signup="${signup.id}">Approve</button><button class="button button-danger button-small" data-action="reject-signup" data-signup="${signup.id}">Deny</button></div></div>`}).join("")}</div>`:emptyState("Queue clear","No signup requests need review.","✓")}</article>
      <article class="card"><div class="card-head"><div><h2>Hours awaiting verification</h2><p>Compare attendance before approval</p></div></div>${pendingHours.length?`<div class="list">${pendingHours.map((entry)=>{const user=getUser(entry.studentId);return `<div class="list-row"><span class="mini-avatar">${esc(user.avatar)}</span><div class="list-copy"><strong>${esc(user.name)} · ${Number(entry.hours).toFixed(2)} hours</strong><span>${esc(entry.title)} · ${formatShortDate(entry.date)}<br>${esc(entry.note)}</span></div><div class="table-actions"><button class="button button-success button-small" data-action="verify-hour" data-hour="${entry.id}">Verify</button><button class="button button-danger button-small" data-action="reject-hour" data-hour="${entry.id}">Reject</button></div></div>`}).join("")}</div>`:emptyState("All caught up","No hour entries need review.","✓")}</article></section>`;
}

function organizationApprovalsView() {
  return `${pageHead("Organization review","Approve trusted community partners.","Review organization identity, contact information, safety policies, and account ownership before approval.")}
    <article class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Organization</th><th>Contact</th><th>Submitted</th><th>Status</th><th>Review</th></tr></thead><tbody>${state.organizationApplications.map((item)=>`<tr><td><strong>${esc(item.name)}</strong></td><td>${esc(item.contact)}</td><td>${formatShortDate(item.submitted)}</td><td>${statusPill(item.status)}</td><td><div class="table-actions">${item.status==="pending"?`<button class="button button-success button-small" data-action="approve-organization" data-application="${item.id}">Approve</button><button class="button button-danger button-small" data-action="reject-organization" data-application="${item.id}">Reject</button>`:"Reviewed"}</div></td></tr>`).join("")}</tbody></table></div></article>`;
}

function rosterView() {
  const event=ownEvents().find((item)=>item.status==="active") || state.events[0];
  const signups=state.signups.filter((signup)=>signup.eventId===event.id&&["approved","attended"].includes(signup.status));
  return `${pageHead("Check-in & attendance",esc(event.title),"Event codes create time cards; organizers can also mark the roster manually.",`<button class="button button-light" data-action="export-roster" data-event="${event.id}">Export roster</button><button class="button button-primary" data-action="show-checkin" data-event="${event.id}">Show check-in code</button>`)}
    <div class="alert"><span>▦</span><div><strong>Check-in code: GARDEN-17</strong><p>Students enter this event-specific code on arrival. Location confirmation is shown as an optional future integration.</p></div></div><article class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Volunteer</th><th>Shift</th><th>Consent</th><th>Attendance</th><th>Action</th></tr></thead><tbody>${signups.length?signups.map((signup)=>{const user=getUser(signup.studentId),shift=getShift(event,signup.shiftId);return `<tr><td><div class="table-person"><span class="mini-avatar">${esc(user.avatar)}</span><div><strong>${esc(user.name)}</strong><br><small>Grade ${user.grade}</small></div></div></td><td>${esc(shift.name)}<br><small>${formatTime(shift.start)}-${formatTime(shift.end)}</small></td><td>${user.guardianConsent?statusPill("verified"):statusPill("pending")}</td><td>${statusPill(signup.status)}</td><td><div class="table-actions"><button class="button button-success button-small" data-action="check-in" data-signup="${signup.id}">Check in</button><button class="button button-light button-small" data-action="check-out" data-signup="${signup.id}">Check out</button><button class="button button-danger button-small" data-action="no-show" data-signup="${signup.id}">No-show</button></div></td></tr>`}).join(""):`<tr><td colspan="5">No approved volunteers yet.</td></tr>`}</tbody></table></div></article>`;
}

function communicationsView() {
  const events=ownEvents().filter((event)=>event.status==="active");
  return `${pageHead("Announcements & Q&A","Keep event communication public and useful.","Organizers broadcast to entire events or shifts. Private one-to-one messages with minors are not available.")}
    <section class="grid grid-2"><article class="card"><div class="card-head"><div><h2>Send an announcement</h2><p>Delivered in-app; email/SMS follows user preferences</p></div></div><form data-form="broadcast"><div class="field"><label for="broadcast-event">Event</label><select id="broadcast-event" name="eventId">${events.map((event)=>`<option value="${event.id}">${esc(event.title)}</option>`).join("")}</select></div><div class="field" style="margin-top:10px"><label for="broadcast-type">Alert type</label><select id="broadcast-type" name="type"><option>General update</option><option>Schedule change</option><option>Weather alert</option><option>Cancellation</option></select></div><div class="field" style="margin-top:10px"><label for="broadcast-body">Message</label><textarea id="broadcast-body" name="body" maxlength="500" required placeholder="Include what changed and what volunteers should do."></textarea></div><button class="button button-primary" type="submit" style="margin-top:12px">Send to event channel</button></form></article><article class="card"><div class="card-head"><div><h2>Recent event messages</h2><p>Shared channels only</p></div></div><div class="list">${state.messages.slice().reverse().map((message)=>`<div class="list-row"><span class="mini-avatar">${esc(message.author.split(" ").map((p)=>p[0]).join("").slice(0,2))}</span><div class="list-copy"><strong>${esc(message.author)} · ${esc(getEvent(message.eventId)?.title||"Event")}</strong><span>${esc(message.body)}</span></div><div class="list-side">${esc(message.time)}</div></div>`).join("")}</div></article></section>`;
}

function notificationsView() {
  const items=state.notifications.filter((item)=>item.role===state.role && (ui.notificationFilter==="all" || (ui.notificationFilter==="unread"&&!item.read)));
  return `${pageHead("Notifications","Stay informed without overload.","Choose individual alerts or a digest, and keep read/unread status organized.",`<button class="button button-light" data-action="mark-all-read">Mark all read</button>`)}
    <section class="grid grid-3"><article class="card span-2"><div class="tabs"><button class="${ui.notificationFilter==="all"?"active":""}" data-action="notification-filter" data-filter="all">All</button><button class="${ui.notificationFilter==="unread"?"active":""}" data-action="notification-filter" data-filter="unread">Unread</button></div><div class="notification-list">${items.length?items.map((item)=>`<article class="notification ${item.read?"":"unread"}"><span class="notification-icon">${item.type==="success"?"✓":item.type==="warning"?"!":"i"}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p><button class="button button-link" data-action="mark-notification" data-notification="${item.id}">${item.read?"Mark unread":"Mark read"}</button></div><time>${esc(item.time)}</time></article>`).join(""):emptyState("Nothing here","You have no notifications in this view.","✓")}</div></article><article class="card"><div class="card-head"><div><h2>Delivery preferences</h2><p>Control notification frequency</p></div></div><form data-form="notification-settings"><div class="field"><label for="digest">Digest frequency</label><select id="digest" name="digest"><option value="individual" ${state.settings.digest==="individual"?"selected":""}>Individual alerts</option><option value="daily" ${state.settings.digest==="daily"?"selected":""}>Daily digest</option><option value="weekly" ${state.settings.digest==="weekly"?"selected":""}>Weekly digest</option></select></div><label class="check-card" style="margin-top:10px"><input type="checkbox" name="email" ${state.settings.email?"checked":""}><span>Email reminders<small>Demo preference only</small></span></label><label class="check-card" style="margin-top:8px"><input type="checkbox" name="sms" ${state.settings.sms?"checked":""}><span>SMS reminders<small>Requires verified phone provider</small></span></label><button class="button button-primary" type="submit" style="margin-top:12px">Save preferences</button></form></article></section>`;
}

function reportsView() {
  if(state.role==="counselor") return studentsView(true);
  const organizer=state.role==="organizer";
  return `${pageHead(organizer ? "Impact reports" : "Platform analytics", organizer ? "Show what your volunteers made possible." : "See participation without exposing student details.", organizer ? "Export grant- and board-ready summaries from verified attendance and hours." : "Compare organizations, participation, and verified hours using aggregate data.", `<button class="button button-light" data-action="export-report">Download CSV</button><button class="button button-primary" data-action="print-report">Print report</button>`)}
    <section class="grid grid-4">${metric(organizer?"Total volunteers":"Active organizations",organizer?"34":"12","Current reporting period","var(--blue-soft)")}${metric("Verified hours","126","October 2026","var(--mint-soft)")}${metric("Events supported",organizer?"8":"24","Completed and upcoming","var(--yellow-soft)")}${metric("Attendance rate","92%","Approved volunteers","var(--coral-soft)")}</section><section class="grid grid-3" style="margin-top:17px"><article class="card span-2"><div class="card-head"><div><h2>Monthly participation</h2><p>Verified hours over six months</p></div></div>${barChart([22,31,28,46,39,54],["May","Jun","Jul","Aug","Sep","Oct"])}</article><article class="card"><div class="card-head"><div><h2>Cause distribution</h2><p>All verified hours</p></div></div><div class="donut"></div><div class="tag-row"><span class="tag">Environment 42%</span><span class="tag tag-coral">Education 25%</span><span class="tag">Other 33%</span></div></article><article class="card span-3"><div class="card-head"><div><h2>${organizer?"Event performance":"Organization comparison"}</h2><p>Aggregate participation and hours</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>${organizer?"Event":"Organization"}</th><th>Volunteers</th><th>Verified hours</th><th>Attendance</th><th>Open spots</th></tr></thead><tbody>${(organizer?ownEvents():state.users.filter((user)=>user.role==="organizer")).map((item,index)=>`<tr><td><strong>${esc(organizer?item.title:item.nonprofitName)}</strong></td><td>${[14,11,9,7][index%4]}</td><td>${[48,36,28,19][index%4]}</td><td>${[94,91,88,96][index%4]}%</td><td>${organizer?openSpots(item):[3,5,2,1][index%4]}</td></tr>`).join("")}</tbody></table></div></article></section>`;
}

function peopleView() {
  return `${pageHead("People & access","Role-scoped permissions.","Admins manage accounts and organizations while protecting student privacy.")}
    <article class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>User</th><th>Role</th><th>Organization / school</th><th>Public visibility</th><th>Access</th></tr></thead><tbody>${state.users.map((user)=>`<tr><td><div class="table-person"><span class="mini-avatar">${esc(user.avatar)}</span><div><strong>${esc(user.name)}</strong><br><small>${esc(user.email)}</small></div></div></td><td>${esc(ROLE_LABELS[user.role])}</td><td>${esc(user.school||user.nonprofitName||user.title||"CivicShift")}</td><td>${user.role==="student"?"No full name shown publicly":"Professional profile"}</td><td><button class="button button-light button-small" data-action="inspect-user" data-user="${user.id}">Review</button></td></tr>`).join("")}</tbody></table></div></article>`;
}

function safetyView() {
  return `${pageHead("Safety & concerns","Youth safety by default.","Consent, emergency access, organizer verification, and concern reports stay auditable and role-restricted.")}
    <section class="grid grid-3">${metric("Consent on file",state.users.filter((u)=>u.role==="student"&&u.guardianConsent).length,`of ${state.users.filter((u)=>u.role==="student").length} demo students`,`var(--mint-soft)`) }${metric("Verified organizers",state.users.filter((u)=>u.role==="organizer"&&u.backgroundChecked).length,"Admin-confirmed status","var(--blue-soft)")}${metric("Open concerns",state.concerns.filter((item)=>item.status==="open").length,"Restricted review queue","var(--coral-soft)")}</section>
    <section class="grid grid-2" style="margin-top:17px"><article class="card"><div class="card-head"><div><h2>Reported concerns</h2><p>Reporter details stay restricted</p></div></div>${state.concerns.length?`<div class="list">${state.concerns.map((item)=>`<div class="list-row"><span class="list-icon">!</span><div class="list-copy"><strong>${esc(getEvent(item.eventId)?.title||"Profile concern")}</strong><span>${esc(item.reason)} · ${esc(item.createdAt)}<br>Reporter: ${esc(item.reporter)}</span></div><div class="table-actions">${statusPill(item.status)}${item.status==="open"?`<button class="button button-success button-small" data-action="resolve-concern" data-concern="${item.id}">Resolve</button>`:""}</div></div>`).join("")}</div>`:emptyState("No concerns","The review queue is clear.","✓")}</article><article class="card"><div class="card-head"><div><h2>Safety controls</h2><p>Current demo coverage</p></div></div><ul class="feature-list"><li>Digital guardian consent status</li><li>Emergency contact restricted to shift organizer</li><li>Event-only group communication for minors</li><li>Organizer verification badges</li><li>Concern reporting on every event</li><li>Audit trail for sensitive actions</li><li>Public pages hide minors’ full names</li><li>Admin two-factor requirement represented</li></ul></article></section>`;
}

function activityView() {
  return `${pageHead("Audit history","Every important change leaves a trail.","Review hour edits, approvals, event changes, cancellations, and account actions.",`<button class="button button-light" data-action="export-activity">Export audit CSV</button>`)}<article class="card">${activityTable(state.activity)}</article>`;
}
function activityTable(items) { return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Action</th><th>Actor</th><th>Record</th><th>Time</th></tr></thead><tbody>${items.map((item)=>`<tr><td><strong>${esc(item.action)}</strong></td><td>${esc(item.actor)}</td><td>${esc(item.subject)}</td><td>${esc(item.time)}</td></tr>`).join("")}</tbody></table></div>`; }

function studentsView(embed=false) {
  const counselor=currentUser(); let students=state.users.filter((user)=>user.role==="student"&&(!counselor.school||user.school===counselor.school)); if(ui.studentGrade!=="all")students=students.filter((student)=>String(student.grade)===ui.studentGrade);
  const content=`<div class="filter-bar" style="grid-template-columns:1fr auto"><div class="field"><label for="student-grade">Filter by grade</label><select id="student-grade" data-student-grade><option value="all">All grades</option>${[9,10,11,12].map((grade)=>`<option value="${grade}" ${ui.studentGrade==String(grade)?"selected":""}>Grade ${grade}</option>`).join("")}</select></div><button class="button button-primary" data-action="export-students">Export CSV</button></div><article class="card">${studentTable(students)}</article>`;
  return embed?`${pageHead("School reports","Verified service by student.","Read-only records can be filtered by grade and exported for school reporting.")}${content}`:`${pageHead("Student hours","Verified progress at your school.","Counselor access is read-only and limited to students at your school.")}${content}`;
}
function studentTable(students) { return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Grade</th><th>Verified</th><th>Goal</th><th>Progress</th><th>Status</th></tr></thead><tbody>${students.map((student)=>{const progress=Math.min(student.verifiedHours/student.requirementGoal*100,100);return `<tr><td><div class="table-person"><span class="mini-avatar">${esc(student.avatar)}</span><div><strong>${esc(student.name)}</strong><br><small>${esc(student.school)}</small></div></div></td><td>${student.grade}</td><td>${student.verifiedHours.toFixed(1)}h</td><td>${student.requirementGoal}h</td><td><div class="progress" style="min-width:100px"><span style="width:${progress}%"></span></div></td><td>${statusPill(progress>=70?"approved":"pending")}</td></tr>`}).join("")}</tbody></table></div>`; }

function helpView() {
  return `${pageHead("Help center","Answers for every role.","Start a guided tour or find clear instructions for common CivicShift tasks.",`<button class="button button-primary" data-action="start-tour">Start guided tour</button>`)}
    <section class="grid grid-3"><article class="card span-2 faq"><div class="card-head"><div><h2>Frequently asked questions</h2><p>Instructions change with your current role</p></div></div><details open><summary>How do I log volunteer hours?</summary><p>Open Hours & time cards, submit the organization, activity, date, hours, and evidence, then wait for organizer verification. Completed CivicShift shifts create entries automatically after checkout.</p></details><details><summary>Why can’t I sign up for a shift?</summary><p>CivicShift blocks past dates, duplicate registrations, overlapping commitments, full shifts, missing guardian consent, and unmet grade or skill requirements. The message explains the specific reason.</p></details><details><summary>How do organizations verify hours?</summary><p>Organizers open Approvals, compare the submitted entry with attendance, and verify or reject it. Every action is added to the audit history.</p></details><details><summary>Can counselors change student hours?</summary><p>No. Counselor accounts are read-only and limited to verified records for students at their school.</p></details><details><summary>Does the demo send email or SMS?</summary><p>No. Notification preferences demonstrate the interface; production delivery requires verified providers, secure credentials, and server-side jobs.</p></details></article><article class="card"><div class="card-head"><div><h2>Quick help</h2><p>Common destinations</p></div></div><div class="quick-actions"><a class="qa" href="#/explore"><span>⌕</span><strong>Find a shift</strong><small>Search and filter</small></a><a class="qa" href="#/hours"><span>◷</span><strong>Log hours</strong><small>Submit a time card</small></a><a class="qa" href="#/profile"><span>○</span><strong>Update profile</strong><small>Interests and availability</small></a><a class="qa" href="#/notifications"><span>♢</span><strong>Alert settings</strong><small>Digest and reminders</small></a></div></article></section>`;
}

function aboutView() {
  return `${pageHead("About CivicShift","Volunteer coordination built around students.","This competition project solves fragmented nonprofit scheduling and school service-hour verification with one role-aware workflow.")}
    <section class="grid grid-2"><article class="card"><div class="card-head"><div><h2>The problem</h2><p>Manual coordination creates missed shifts and unverifiable records</p></div></div><p style="color:var(--soft);font-size:.75rem">Students often discover service through scattered posts, then track hours in separate spreadsheets or paper forms. Nonprofits repeat the same scheduling work, while schools struggle to verify records consistently.</p><h3 style="font-size:.9rem;margin-top:22px">The CivicShift approach</h3><ul class="feature-list"><li>Role-based dashboards and permissions</li><li>Interest and availability matching</li><li>Conflict-aware shift registration</li><li>Organizer-verified service records</li><li>Youth safety and consent controls</li><li>School-ready reports and portfolios</li></ul></article><article class="card"><div class="card-head"><div><h2>Technology & demo boundaries</h2><p>Clear ownership and honest limitations</p></div></div><ul class="feature-list"><li>Original HTML, CSS, and JavaScript</li><li>Responsive, keyboard-accessible interface</li><li>Browser-local seeded demo data</li><li>CSV and calendar-file exports</li><li>No website template or UI framework</li><li>No real personal data in sample content</li></ul><div class="alert alert-warning" style="margin-top:20px"><span>!</span><div><strong>Production backend required</strong><p>Real authentication, database concurrency, email/SMS, signed waivers, geolocation, background checks, private documents, and permission enforcement must run on a secure server. This prototype demonstrates the complete experience without claiming those integrations are live.</p></div></div><button class="button button-danger" data-action="reset-demo">Reset all demo data</button></article></section>`;
}

function accountView() {
  return `<div class="account-wrap"><section class="account-art"><a class="brand" href="index.html"><svg viewBox="0 0 42 42" aria-hidden="true"><path d="M10 22.5 20.5 7 31 22.5 20.5 35 10 22.5Z" fill="currentColor"/><path d="m15.3 22.4 5.2-7.8 5.2 7.8-5.2 6.2-5.2-6.2Z" fill="#315ae8"/></svg>CivicShift</a><div><span class="eyebrow" style="color:var(--yellow)">Demo access</span><h1>See every side of community service.</h1><p>Use a seeded role or create a browser-local demo profile. No real password is stored or transmitted.</p></div><small>Student privacy comes first. Demo data resets anytime.</small></section><section class="account-panel"><div class="account-card"><div class="tabs"><button class="active" type="button">Quick role access</button></div><h2>Choose a dashboard</h2><p style="color:var(--soft);font-size:.72rem">Each role has different navigation, data, and permissions.</p><div class="demo-role-grid">${Object.entries(ROLE_LABELS).map(([role,label])=>`<button class="demo-role" data-action="demo-role" data-role="${role}"><strong>${esc(label)}</strong><small>${role==="student"?"Discover, schedule, and track hours":role==="organizer"?"Create events and manage volunteers":role==="admin"?"Review safety and platform access":"View school-verified student hours"}</small></button>`).join("")}</div><div class="form-section" style="margin-top:22px"><h3>Create a browser-local demo account</h3><form data-form="account"><div class="form-grid"><div class="field"><label for="account-name">Name</label><input id="account-name" name="name" required maxlength="60"></div><div class="field"><label for="account-email">Email</label><input id="account-email" name="email" type="email" required></div><div class="field span-2"><label for="account-role">Role</label><select id="account-role" name="role"><option value="student">Student Volunteer</option><option value="organizer">Nonprofit Organizer</option><option value="counselor">School Counselor / Teacher</option></select></div></div><button class="button button-primary" type="submit" style="margin-top:12px;width:100%">Create demo profile</button></form></div></div></section></div>`;
}

function render() {
  const { route, id, subId }=routeInfo();
  document.body.classList.toggle("dark",Boolean(state.settings.dark));
  if(route==="account") { app.innerHTML=accountView(); document.title="Demo Accounts | CivicShift"; return; }
  const allowed=new Set(NAV[state.role].map((item)=>item[1]).concat(["event","about","account"]));
  const safeRoute=allowed.has(route)?route:"dashboard";
  let content="",title="Dashboard";
  const views={ dashboard:()=>dashboardView(), explore:()=>exploreView(), event:()=>eventDetailView(id), calendar:()=>calendarView(), hours:()=>hoursView(), portfolio:()=>portfolioView(), profile:()=>profileView(), events:()=>eventsView(id,subId), approvals:()=>approvalsView(), roster:()=>rosterView(), communications:()=>communicationsView(), notifications:()=>notificationsView(), reports:()=>reportsView(), people:()=>peopleView(), safety:()=>safetyView(), activity:()=>activityView(), students:()=>studentsView(), help:()=>helpView(), about:()=>aboutView() };
  const names={dashboard:"Dashboard",explore:"Opportunities",event:"Event details",calendar:"Calendar",hours:"Hours",portfolio:"Portfolio",profile:"Profile",events:"Events",approvals:"Approvals",roster:"Roster",communications:"Announcements",notifications:"Notifications",reports:"Reports",people:"People",safety:"Safety",activity:"Audit history",students:"Student hours",help:"Help",about:"About"};
  try { content=(views[safeRoute]||views.dashboard)(); title=names[safeRoute]||"Dashboard"; }
  catch(error) { console.error(error); content=`${pageHead("Something went wrong","This view could not load.","Your demo data is still safe in this browser.")}<div class="alert alert-danger"><span>!</span><div><strong>Rendering error</strong><p>Return to the dashboard or reset demo data from the About page.</p></div></div>`; title="Error"; }
  app.innerHTML=shell(content,safeRoute,title); document.title=`${title} | CivicShift`;
}

function showToast(message) {
  const node=document.createElement("div"); node.className="toast"; node.textContent=message; toastRegion.append(node); setTimeout(()=>node.remove(),3200);
}
function addActivity(action,subject,actor=currentUser().name) { state.activity.unshift({id:uid("ac"),action,actor,subject,time:"2026-10-10 14:30"}); }
function addNotification(role,title,body,type="info",link="#/notifications") { state.notifications.unshift({id:uid("nt"),role,type,title,body,time:"Just now",read:false,link}); }
function openConfirm(title,copy,confirmLabel,onConfirm,danger=false) { pendingConfirm=onConfirm; dialogContent.innerHTML=`<span class="dialog-icon">${danger?"!":"✓"}</span><h2 id="dialog-title">${esc(title)}</h2><p>${esc(copy)}</p><div class="dialog-actions"><button class="button button-light" value="cancel">Cancel</button><button class="button ${danger?"button-danger":"button-primary"}" type="button" data-action="confirm-dialog">${esc(confirmLabel)}</button></div>`; dialog.showModal(); }
function downloadFile(filename,content,type="text/csv") { const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=filename; link.click(); setTimeout(()=>URL.revokeObjectURL(url),0); }
function csvCell(value) { return `"${String(value??"").replaceAll('"','""')}"`; }

function validateSignup(event,shift,student) {
  if(event.date<DEMO_TODAY) return "This event is in the past.";
  if(!student.guardianConsent) return "Guardian consent is required before registration.";
  if(student.grade<event.minGrade) return `This shift requires grade ${event.minGrade} or higher.`;
  const missing=event.requiredSkills.filter((skill)=>!student.skills.includes(skill)); if(missing.length) return `Your profile is missing: ${missing.join(", ")}.`;
  const duplicate=state.signups.some((signup)=>signup.studentId===student.id&&signup.eventId===event.id&&signup.shiftId===shift.id&&!['withdrawn','rejected'].includes(signup.status)); if(duplicate) return "You already registered for this shift.";
  const conflict=state.signups.filter((signup)=>signup.studentId===student.id&&["approved","pending"].includes(signup.status)).some((signup)=>{const otherEvent=getEvent(signup.eventId),otherShift=getShift(otherEvent,signup.shiftId);return otherEvent?.date===event.date&&toMinutes(shift.start)<toMinutes(otherShift.end)&&toMinutes(shift.end)>toMinutes(otherShift.start);}); if(conflict) return "This shift overlaps with another pending or approved commitment.";
  return "";
}

document.addEventListener("click",(event)=>{
  const target=event.target.closest("[data-action]"); if(!target)return;
  const action=target.dataset.action;
  if(action==="toggle-sidebar") document.querySelector(".sidebar")?.classList.toggle("open");
  if(action==="toggle-dark") { state.settings.dark=!state.settings.dark; saveState(); render(); }
  if(action==="set-view") { ui.view=target.dataset.view; render(); }
  if(action==="notification-filter") { ui.notificationFilter=target.dataset.filter; render(); }
  if(action==="save-event") { const id=target.dataset.event; state.saved=state.saved.includes(id)?state.saved.filter((item)=>item!==id):[...state.saved,id]; saveState(); showToast(state.saved.includes(id)?"Opportunity saved.":"Removed from saved opportunities."); render(); }
  if(action==="signup-shift") { const eventItem=getEvent(target.dataset.event),shift=getShift(eventItem,target.dataset.shift),student=studentUser(); const error=validateSignup(eventItem,shift,student); if(error){showToast(error);return;} const full=shift.filled>=shift.capacity; const status=full?"waitlist":eventItem.approvalMode==="automatic"?"approved":"pending"; state.signups.push({id:uid("sg"),eventId:eventItem.id,shiftId:shift.id,studentId:student.id,status,createdAt:new Date().toISOString()}); if(status==="approved")shift.filled+=1; addNotification("student",status==="approved"?"Shift approved":status==="waitlist"?"Added to waitlist":"Request submitted",`${eventItem.title} · ${shift.name}`,status==="approved"?"success":"info",`#/event/${eventItem.id}`); addNotification("organizer","New signup request",`${student.name} requested ${eventItem.title}.`,"info","#/approvals"); addActivity("Signup created",`${student.name} · ${eventItem.title} · ${status}`,status==="approved"?"Automatic rule":student.name); saveState(); showToast(status==="approved"?"You’re registered.":status==="waitlist"?"You joined the waitlist.":"Request sent for approval."); render(); }
  if(action==="withdraw") { const signup=state.signups.find((item)=>item.id===target.dataset.signup); if(!signup)return; openConfirm("Withdraw from this shift?","Your spot will be offered to the next eligible student on the waitlist.","Withdraw",()=>{const eventItem=getEvent(signup.eventId),shift=getShift(eventItem,signup.shiftId); if(signup.status==="approved")shift.filled=Math.max(0,shift.filled-1); signup.status="withdrawn"; addActivity("Signup withdrawn",`${studentUser().name} · ${eventItem.title}`); addNotification("organizer","Volunteer withdrew",`${studentUser().name} left ${eventItem.title}.`,"warning","#/events"); promoteWaitlist(eventItem.id,shift.id); saveState(); render(); showToast("You withdrew from the shift.");},true); }
  if(action==="approve-signup"||action==="reject-signup") { const signup=state.signups.find((item)=>item.id===target.dataset.signup); if(!signup)return; const eventItem=getEvent(signup.eventId),shift=getShift(eventItem,signup.shiftId),student=getUser(signup.studentId); const approve=action==="approve-signup"; if(approve&&shift.filled>=shift.capacity){showToast("Shift is already full. Capacity was rechecked.");return;} signup.status=approve?"approved":"rejected"; if(approve)shift.filled+=1; addNotification("student",approve?"Signup approved":"Signup denied",`${eventItem.title} · ${shift.name}`,approve?"success":"warning",`#/event/${eventItem.id}`); addActivity(approve?"Signup approved":"Signup denied",`${student.name} · ${eventItem.title}`); saveState(); render(); showToast(approve?"Signup approved.":"Signup denied."); }
  if(action==="verify-hour"||action==="reject-hour") { const entry=state.hours.find((item)=>item.id===target.dataset.hour); if(!entry)return; const verify=action==="verify-hour"; entry.status=verify?"verified":"rejected"; entry.approver=currentUser().name; entry.updatedAt=new Date().toISOString(); addActivity(verify?"Hours verified":"Hours rejected",`${getUser(entry.studentId)?.name} · ${entry.title} · ${entry.hours} hours`); addNotification("student",verify?"Hours verified":"Hours rejected",`${entry.title} · ${entry.hours} hours`,verify?"success":"warning","#/hours"); saveState(); render(); showToast(verify?"Hours verified.":"Hours rejected with dispute option."); }
  if(action==="dispute-hour") { const entry=state.hours.find((item)=>item.id===target.dataset.hour); if(entry){entry.status="disputed";addActivity("Hour dispute opened",`${entry.title} · ${entry.hours} hours`,studentUser().name);saveState();render();showToast("Dispute submitted for admin review.");} }
  if(action==="cancel-event") { const item=getEvent(target.dataset.event); if(!item||item.status==="canceled")return; if(state.role==="organizer"&&item.orgId!==currentUser().id){showToast("You can only manage your organization’s events.");return;} openConfirm("Cancel this event?","Registered volunteers will be notified and future signup will be disabled.","Cancel event",()=>{item.status="canceled";addActivity("Event canceled",item.title);addNotification("student","Event canceled",`${item.title} has been canceled.`,"warning",`#/event/${item.id}`);saveState();render();showToast("Event canceled and volunteers notified.");},true); }
  if(action==="duplicate-event") { const source=getEvent(target.dataset.event); if(!source)return; const copy=clone(source); copy.id=uid("evt"); copy.title=`Copy of ${source.title}`; copy.date="2026-11-21"; copy.createdDate=DEMO_TODAY; copy.shifts=copy.shifts.map((shift)=>({...shift,id:uid("sh"),filled:0})); state.events.unshift(copy); addActivity("Event duplicated",`${source.title} → ${copy.title}`); saveState(); location.hash=`#/events/edit/${copy.id}`; showToast("Event duplicated. Review details before publishing."); }
  if(["check-in","check-out","no-show"].includes(action)) { const signup=state.signups.find((item)=>item.id===target.dataset.signup); if(!signup)return; const eventItem=getEvent(signup.eventId),shift=getShift(eventItem,signup.shiftId),student=getUser(signup.studentId); if(action==="check-in"){signup.status="attended";signup.checkIn="09:02";showToast("Volunteer checked in.");} if(action==="check-out"){signup.status="attended";signup.checkOut=shift.end; const existing=state.hours.some((entry)=>entry.studentId===student.id&&entry.eventId===eventItem.id); if(!existing)state.hours.push({id:uid("hr"),studentId:student.id,eventId:eventItem.id,organization:eventItem.organization,title:eventItem.title,category:eventItem.category,date:eventItem.date,hours:durationHours(shift.start,shift.end),status:"pending",approver:"—",updatedAt:new Date().toISOString(),note:"Generated from event check-in and checkout"});showToast("Checked out; time card created.");} if(action==="no-show"){signup.status="no-show";showToast("No-show recorded. A gentle reminder will be sent.");} addActivity(action.replace("-"," "),`${student.name} · ${eventItem.title}`);saveState();render(); }
  if(action==="mark-all-read") { state.notifications.filter((item)=>item.role===state.role).forEach((item)=>item.read=true);saveState();render();showToast("All notifications marked read."); }
  if(action==="mark-notification") { const item=state.notifications.find((notification)=>notification.id===target.dataset.notification);if(item){item.read=!item.read;saveState();render();} }
  if(action==="toggle-availability") { const date=target.dataset.date;state.unavailableDates=state.unavailableDates.includes(date)?state.unavailableDates.filter((item)=>item!==date):[...state.unavailableDates,date];saveState();render();showToast(state.unavailableDates.includes(date)?"Date marked unavailable.":"Date marked available."); }
  if(action==="report-concern") openConcernDialog(target.dataset.event);
  if(action==="resolve-concern") { const item=state.concerns.find((concern)=>concern.id===target.dataset.concern);if(item){item.status="resolved";addActivity("Concern resolved",getEvent(item.eventId)?.title||"Profile concern");saveState();render();showToast("Concern resolved and logged.");} }
  if(action==="approve-organization"||action==="reject-organization") { const item=state.organizationApplications.find((application)=>application.id===target.dataset.application);if(item){item.status=action==="approve-organization"?"approved":"rejected";addActivity(`Organization ${item.status}`,item.name);saveState();render();showToast(`Organization ${item.status}.`);} }
  if(action==="confirm-dialog"&&pendingConfirm){const callback=pendingConfirm;pendingConfirm=null;dialog.close();callback();}
  if(action==="reset-demo") openConfirm("Reset all demo data?","This removes every browser-local change and restores the seeded accounts, events, signups, and hours.","Reset demo",()=>{localStorage.removeItem(STORAGE_KEY);state=seedState();saveState();location.hash="#/dashboard";render();showToast("Demo data restored.");},true);
  if(action==="demo-role") { state.role=target.dataset.role;saveState();location.hash="#/dashboard";render();showToast(`Switched to ${ROLE_LABELS[state.role]}.`); }
  if(action==="export-hours") exportHours(); if(action==="export-students") exportStudents(); if(action==="export-roster") exportRoster(target.dataset.event); if(action==="export-activity") exportActivity(); if(action==="export-report") exportReport();
  if(action==="download-ics") downloadCalendar(); if(action==="google-calendar") openGoogleCalendar();
  if(action==="certificate"||action==="print-report"||action==="export-portfolio") { window.print(); showToast("Print view opened. Choose Save as PDF to export."); }
  if(action==="recommendation") showToast("Recommendation request sent to your most recent organizer.");
  if(action==="download-data") downloadFile("civicshift-my-data.json",JSON.stringify(studentUser(),null,2),"application/json");
  if(action==="request-deletion") openConfirm("Request account deletion?","A production system would verify identity, preserve required audit records, and then remove eligible personal data.","Create request",()=>showToast("Deletion request recorded for admin review."),true);
  if(action==="start-tour") { state.settings.tourComplete=true;saveState();showToast("Tour started: use the left navigation to explore each workflow."); }
  if(action==="show-checkin") openInfo("Event check-in","GARDEN-17","Students enter this code on arrival. A production QR would contain a short-lived signed token.");
  if(action==="inspect-user") { const user=getUser(target.dataset.user);openInfo("Access review",user.name,`${ROLE_LABELS[user.role]} · ${user.email}. Permissions are limited to this role’s records.`); }
  if(action==="map-event") location.hash=`#/event/${target.dataset.event}`;
});

document.addEventListener("change",(event)=>{
  if(event.target.matches("[data-role-switch]")){state.role=event.target.value;saveState();location.hash="#/dashboard";render();showToast(`Previewing ${ROLE_LABELS[state.role]}.`);}
  if(event.target.matches("[data-student-grade]")){ui.studentGrade=event.target.value;render();}
});

document.addEventListener("submit",(event)=>{
  const form=event.target.closest("[data-form]"); if(!form)return; event.preventDefault(); const data=new FormData(form); const kind=form.dataset.form;
  if(kind==="filters"){ui.search=String(data.get("search")||"").trim();ui.category=String(data.get("category"));ui.location=String(data.get("location"));ui.availability=String(data.get("availability"));ui.sort=String(data.get("sort"));render();return;}
  if(kind==="profile"){const user=currentUser();user.school=String(data.get("school")).trim();user.grade=Number(data.get("grade"));user.requirementName=String(data.get("requirementName")).trim();user.requirementGoal=Number(data.get("requirementGoal"));user.interests=data.getAll("interests").map(String);user.skills=String(data.get("skills")).split(",").map((item)=>item.trim()).filter(Boolean);user.availability=String(data.get("availability")).split(";").map((item)=>item.trim()).filter(Boolean);user.emergencyContact=String(data.get("emergencyContact")).trim();user.privacy=String(data.get("privacy"));user.guardianConsent=data.has("guardianConsent");user.leaderboardOptIn=data.has("leaderboardOptIn");saveState();showToast("Profile and matching preferences saved.");render();}
  if(kind==="organizer-profile"){const user=currentUser();user.nonprofitName=String(data.get("nonprofitName")).trim();user.contact=String(data.get("contact")).trim();user.description=String(data.get("description")).trim();saveState();showToast("Organization profile saved.");render();}
  if(kind==="event") handleEventForm(data);
  if(kind==="hours") handleHoursForm(data);
  if(kind==="reflection"){state.reflections.unshift({id:uid("rf"),studentId:studentUser().id,event:String(data.get("event")).trim(),prompt:"What changed because of your service?",body:String(data.get("body")).trim(),date:DEMO_TODAY});saveState();render();showToast("Reflection saved to your portfolio.");}
  if(kind==="broadcast"){const eventItem=getEvent(String(data.get("eventId"))),body=String(data.get("body")).trim(),type=String(data.get("type"));state.messages.push({id:uid("msg"),eventId:eventItem.id,authorRole:"organizer",author:currentUser().name,body:`${type}: ${body}`,time:"Just now"});addNotification("student",type,`${eventItem.title}: ${body}`,type.includes("Cancel")?"warning":"info",`#/event/${eventItem.id}`);addActivity("Announcement sent",`${eventItem.title} · ${type}`);saveState();form.reset();render();showToast("Announcement sent to the event channel.");}
  if(kind==="message"){const eventItem=getEvent(String(data.get("eventId"))),user=currentUser();state.messages.push({id:uid("msg"),eventId:eventItem.id,authorRole:user.role,author:user.role==="student"?`${user.name.split(" ")[0]} ${user.name.split(" ")[1][0]}.`:user.name,body:String(data.get("body")).trim(),time:"Just now"});saveState();render();showToast("Question posted publicly to the event channel.");}
  if(kind==="notification-settings"){state.settings.digest=String(data.get("digest"));state.settings.email=data.has("email");state.settings.sms=data.has("sms");saveState();showToast("Notification preferences saved.");}
  if(kind==="account"){const role=String(data.get("role")),name=String(data.get("name")).trim(),email=String(data.get("email")).trim();const id=uid(role);const user={id,role,name,email,avatar:name.split(" ").map((p)=>p[0]).join("").slice(0,2).toUpperCase()};if(role==="student")Object.assign(user,{school:"Not selected",grade:9,birthDate:"2011-01-01",interests:[],skills:[],availability:[],location:"",verifiedHours:0,pendingHours:0,requirementGoal:40,requirementName:"School service goal",guardianConsent:false,emergencyContact:"",privacy:"private",leaderboardOptIn:false});if(role==="organizer")Object.assign(user,{nonprofitName:"New nonprofit",description:"",contact:email,verified:false,backgroundChecked:false});if(role==="counselor")Object.assign(user,{school:"Not selected",title:"Counselor / Teacher",readOnly:true});state.users.push(user);state.activeUser[role]=id;state.role=role;saveState();location.hash="#/profile";render();showToast("Browser-local demo profile created.");}
});

function handleEventForm(data) {
  const start=String(data.get("start")),end=String(data.get("end")),date=String(data.get("date"));
  if(date<DEMO_TODAY){showToast("Event date cannot be in the past.");return;} if(toMinutes(end)<=toMinutes(start)){showToast("Shift end time must be after the start time.");return;}
  const id=String(data.get("eventId")||""); let item=id?getEvent(id):null; if(item&&state.role==="organizer"&&item.orgId!==currentUser().id){showToast("You can only edit your organization’s events.");return;}
  const values={orgId:currentUser().id,organization:currentUser().nonprofitName||"CivicShift Partner",title:String(data.get("title")).trim(),description:String(data.get("description")).trim(),responsibilities:item?.responsibilities||["Support the event team","Follow organizer instructions","Complete check-out"],category:String(data.get("category")),locationType:String(data.get("locationType")),location:String(data.get("location")).trim(),address:String(data.get("address")).trim(),date,createdDate:item?.createdDate||DEMO_TODAY,minGrade:Number(data.get("minGrade")),requiredSkills:String(data.get("requiredSkills")).split(",").map((v)=>v.trim()).filter(Boolean),tags:String(data.get("tags")).split(",").map((v)=>v.trim()).filter(Boolean),verifiedOrganizer:Boolean(currentUser().verified),approvalMode:String(data.get("approvalMode")),recurring:String(data.get("recurring")),status:"active",whatToBring:String(data.get("whatToBring")).trim(),parking:String(data.get("parking")).trim(),contactPerson:currentUser().name,lat:50,lng:50};
  if(item){Object.assign(item,values);const shift=item.shifts[0];Object.assign(shift,{name:String(data.get("shiftName")).trim(),role:String(data.get("shiftRole")).trim(),start,end,capacity:Number(data.get("capacity"))});addActivity("Event updated",item.title);addNotification("student","Event updated",`${item.title} details changed. Review your schedule.`,"warning",`#/event/${item.id}`);}
  else {item={id:uid("evt"),...values,shifts:[{id:uid("sh"),name:String(data.get("shiftName")).trim(),role:String(data.get("shiftRole")).trim(),start,end,capacity:Number(data.get("capacity")),filled:0}]};state.events.unshift(item);addActivity("Event created",item.title);}
  saveState();location.hash="#/events";render();showToast(id?"Event updated and volunteers notified.":"Event created.");
}

function handleHoursForm(data) {
  const date=String(data.get("date")),hours=Math.round(Number(data.get("hours"))*4)/4;if(date>DEMO_TODAY){showToast("Hours cannot be submitted for a future date.");return;}if(hours<=0||hours>12){showToast("Hours must be between 0.25 and 12 per day.");return;}
  const entry={id:uid("hr"),studentId:studentUser().id,eventId:"manual",organization:String(data.get("organization")).trim(),title:String(data.get("title")).trim(),category:"Community Events",date,hours,status:"pending",approver:"—",updatedAt:new Date().toISOString(),note:String(data.get("note")).trim()};state.hours.unshift(entry);addActivity("Hours submitted",`${studentUser().name} · ${entry.title} · ${hours} hours`,studentUser().name);addNotification("organizer","Hours awaiting review",`${studentUser().name} submitted ${hours} hours.`,"info","#/approvals");saveState();render();showToast("Hours submitted and rounded to the nearest quarter hour.");
}

function promoteWaitlist(eventId,shiftId) { const next=state.signups.find((item)=>item.eventId===eventId&&item.shiftId===shiftId&&item.status==="waitlist");if(next){next.status="approved";const shift=getShift(getEvent(eventId),shiftId);shift.filled+=1;addNotification("student","Waitlist spot available","You were automatically moved into an approved spot.","success",`#/event/${eventId}`);} }
function openConcernDialog(eventId) { pendingConfirm=()=>{const input=dialog.querySelector("textarea");const reason=input?.value.trim();if(!reason){showToast("Describe the concern before submitting.");return;}state.concerns.unshift({id:uid("co"),eventId,reporter:state.role==="student"?"Confidential student report":currentUser().name,reason,status:"open",createdAt:DEMO_TODAY});addNotification("admin","New safety concern",`${getEvent(eventId)?.title||"Profile"} requires review.`,"warning","#/safety");addActivity("Concern reported",getEvent(eventId)?.title||"Profile","Confidential reporter");saveState();dialog.close();showToast("Concern sent privately to administrators.");};dialogContent.innerHTML=`<span class="dialog-icon">!</span><h2 id="dialog-title">Report a concern</h2><p>Administrators will review this privately. Do not include medical or other unnecessary sensitive details.</p><div class="field"><label for="concern-reason">What should the safety team review?</label><textarea id="concern-reason" maxlength="500" required></textarea></div><div class="dialog-actions"><button class="button button-light" value="cancel">Cancel</button><button class="button button-danger" type="button" data-action="confirm-dialog">Submit concern</button></div>`;dialog.showModal(); }
function openInfo(title,heading,copy){pendingConfirm=null;dialogContent.innerHTML=`<span class="dialog-icon">i</span><h2 id="dialog-title">${esc(title)}</h2><h3>${esc(heading)}</h3><p>${esc(copy)}</p><div class="dialog-actions"><button class="button button-primary" value="cancel">Done</button></div>`;dialog.showModal();}

function exportHours(){const rows=state.hours.filter((item)=>item.studentId===studentUser().id);downloadFile("civicshift-hours.csv",["Activity,Organization,Date,Hours,Status,Approver",...rows.map((r)=>[r.title,r.organization,r.date,r.hours,r.status,r.approver].map(csvCell).join(","))].join("\n"));showToast("Hour report downloaded.");}
function exportStudents(){const rows=state.users.filter((u)=>u.role==="student");downloadFile("civicshift-school-hours.csv",["Student,School,Grade,Verified Hours,Goal",...rows.map((u)=>[u.name,u.school,u.grade,u.verifiedHours,u.requirementGoal].map(csvCell).join(","))].join("\n"));showToast("School report downloaded.");}
function exportRoster(eventId){const item=getEvent(eventId),rows=state.signups.filter((s)=>s.eventId===eventId).map((s)=>({user:getUser(s.studentId),shift:getShift(item,s.shiftId),status:s.status}));downloadFile("civicshift-roster.csv",["Volunteer,Grade,Shift,Status",...rows.map((r)=>[r.user.name,r.user.grade,r.shift.name,r.status].map(csvCell).join(","))].join("\n"));showToast("Roster downloaded.");}
function exportActivity(){downloadFile("civicshift-audit.csv",["Action,Actor,Record,Time",...state.activity.map((r)=>[r.action,r.actor,r.subject,r.time].map(csvCell).join(","))].join("\n"));showToast("Audit history downloaded.");}
function exportReport(){downloadFile("civicshift-impact.csv","Metric,Value\nVerified hours,126\nActive volunteers,34\nEvents supported,8\nAttendance rate,92%\n");showToast("Impact report downloaded.");}
function downloadCalendar(){const student=studentUser();const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//CivicShift//Volunteer Calendar//EN"];state.signups.filter((s)=>s.studentId===student.id&&s.status==="approved").forEach((s)=>{const e=getEvent(s.eventId),sh=getShift(e,s.shiftId);lines.push("BEGIN:VEVENT",`UID:${s.id}@civicshift.demo`,`DTSTART:${e.date.replaceAll("-","")}T${sh.start.replace(":","")}00`,`DTEND:${e.date.replaceAll("-","")}T${sh.end.replace(":","")}00`,`SUMMARY:${e.title}`,`LOCATION:${e.address}`,"END:VEVENT")});lines.push("END:VCALENDAR");downloadFile("civicshift-calendar.ics",lines.join("\r\n"),"text/calendar");showToast("Calendar file downloaded.");}
function openGoogleCalendar(){const next=state.signups.find((s)=>s.studentId===studentUser().id&&s.status==="approved");if(!next){showToast("No approved shift to add.");return;}const e=getEvent(next.eventId),sh=getShift(e,next.shiftId),dates=`${e.date.replaceAll("-","")}T${sh.start.replace(":","")}00/${e.date.replaceAll("-","")}T${sh.end.replace(":","")}00`;window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${dates}&location=${encodeURIComponent(e.address)}&details=${encodeURIComponent(e.description)}`,"_blank","noopener");}

window.addEventListener("hashchange",render);
if(!location.hash)location.hash="#/dashboard";
saveState();render();
