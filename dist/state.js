import { DEMO_ACTIVITY, DEMO_EVENTS, DEMO_HOURS, DEMO_MESSAGES, DEMO_NOTIFICATIONS, DEMO_SIGNUPS, DEMO_USERS } from "./data.js";
import { EXTRA_EVENTS, STORIES } from "./community-data.js";
const clone = value => JSON.parse(JSON.stringify(value));
export const STORAGE_KEY = "civicshift-demo-v5";
export const INITIAL_CLOCK = "2026-10-10T08:00";
function legacySeed() {
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


// Additive migration: saved v4 records win over defaults. The original key is retained.
export function migrateState(saved) {
  const defaults = legacySeed();
  const state = {...defaults, ...clone(saved || {})};
  state.settings = {...defaults.settings, ...state.settings};
  state.activeUser = {...defaults.activeUser, ...state.activeUser};
  for (const key of ["users", "events", "signups", "hours", "notifications", "messages", "activity", "saved", "unavailableDates", "concerns", "organizationApplications", "reflections", "feedback"]) {
    if (!Array.isArray(state[key])) state[key] = clone(defaults[key]);
  }
  if ((saved?.version || 4) < 5) {
    for (const event of EXTRA_EVENTS) if (!state.events.some(e => e.id === event.id)) state.events.push(clone(event));
  }
  state.stories ??= clone(STORIES);
  state.savedStories ??= {};
  state.unavailableByUser ??= {[state.activeUser.student]: clone(state.unavailableDates)};
  state.clock ??= INITIAL_CLOCK;
  for (const user of state.users.filter(u => u.role === "student")) {
    user.interests ??= []; user.skills ??= []; user.availability ??= []; user.location ??= "";
    user.requirementGoal ??= 40;
  }
  for (const event of state.events) {
    event.requiredSkills ??= []; event.tags ??= []; event.responsibilities ??= [];
    for (const shift of event.shifts) {
      const registered = state.signups.filter(s => s.eventId === event.id && s.shiftId === shift.id && ["approved", "attended", "offered"].includes(s.status)).length;
      // Legacy filled counts include fictional volunteers without full profiles.
      shift.backgroundFilled ??= Math.max(0, Number(shift.filled || 0) - registered);
      shift.filled = shift.backgroundFilled + registered;
    }
  }
  for (const hour of state.hours) {
    const event = state.events.find(e => e.id === hour.eventId);
    hour.orgId ??= event?.orgId || state.events.find(e => e.organization === hour.organization)?.orgId || state.users.find(u => u.nonprofitName === hour.organization)?.id || null;
    // Only attach legacy event time cards when their registration is unambiguous.
    const matches = state.signups.filter(s => s.eventId === hour.eventId && s.studentId === hour.studentId && s.checkOut);
    if (!hour.signupId && matches.length === 1) { hour.signupId = matches[0].id; hour.shiftId = matches[0].shiftId; }
  }
  state.version = 5;
  return state;
}
export function seedState() {
  const fresh = legacySeed();
  fresh.users.filter(u => u.role === "student").forEach(u => u.location = "Cupertino");
  return migrateState(fresh);
}
export function loadState(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY) ?? storage.getItem("civicshift-demo-v4");
  if (!raw) return seedState();
  // Do not replace unreadable or future-version data with an empty demo.
  const saved = JSON.parse(raw);
  if (![4, 5].includes(saved?.version)) throw new Error("Unsupported demo data version. Export browser storage before resetting.");
  return migrateState(saved);
}
export function persistState(state, storage = localStorage) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
