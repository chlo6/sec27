// Entirely fictional local service scenarios, not live news or real partners.
const event = (id, title, category, date, location, shifts, orgId = "org-1") => ({
  id, title, category, date, location, orgId,
  organization: orgId === "org-1" ? "Greenway Collective" : "Bridge Learning Center",
  description: "A fictional Bay Area service opportunity for the CivicShift demonstration. Work alongside a coordinator and a small volunteer team.",
  responsibilities: ["Meet the demo coordinator for a safety briefing", "Work with your team on the community task", "Check out and submit your time card"],
  locationType: "In person", address: `${location}, California (fictional meeting point)`,
  lat: 45, lng: 55, createdDate: "2026-10-10", minGrade: 9, requiredSkills: [],
  tags: ["Fictional demo", "First-timer friendly"], verifiedOrganizer: true, approvalMode: "manual",
  recurring: "One time", status: "active", whatToBring: "Water, comfortable shoes, and a curious mind.",
  parking: "Meet the coordinator at the demo welcome table.", contactPerson: "Demo coordinator",
  shifts: shifts.map(([name, start, end], i) => ({id: `${id}-shift-${i + 1}`, name, role: "Team volunteer", start, end, capacity: 8, filled: 0})),
});
export const EXTRA_EVENTS = [
  event("evt-creek", "Give the creek a fresh start", "Environment & Sustainability", "2026-10-24", "Cupertino", [["Creek care team", "09:00", "11:00"], ["Trail stewardship", "11:00", "13:00"]]),
  event("evt-books", "A little reading goes a long way", "Education & Tutoring", "2026-10-28", "Cupertino", [["Reading buddies", "15:30", "17:30"]], "org-2"),
  event("evt-market", "Pack a brighter weekend", "Food Banks & Homelessness", "2026-10-31", "Sunnyvale", [["Morning packing", "09:00", "11:00"], ["Community pickup", "11:00", "13:00"]]),
  event("evt-repair", "Help neighbors get connected", "STEM & Technology", "2026-11-07", "Cupertino", [["Device help desk", "10:00", "12:00"]], "org-2"),
];
export const STORIES = [
  {id: "story-creek", publisher: "Greenway Collective", date: "2026-10-10", locality: "Cupertino", cause: "Environment & Sustainability", title: "A cleaner creek starts with a Saturday morning.", summary: "In this demo story, autumn litter is collecting along a neighborhood creek. A few hours with a cleanup team can help keep the waterway welcoming for everyone.", eventIds: ["evt-creek", "evt-garden"], status: "published", art: "creek", label: "CARE FOR OUR COMMON GROUND"},
  {id: "story-books", publisher: "Bridge Learning Center", date: "2026-10-09", locality: "Cupertino", cause: "Education & Tutoring", title: "Be the person who makes reading click.", summary: "Our fictional after-school reading circle is welcoming new learners. Patient reading buddies can make the next chapter feel a little less daunting.", eventIds: ["evt-books", "evt-math"], status: "published", art: "books", label: "SMALL MOMENTS, LASTING CHANGE"},
  {id: "story-food", publisher: "Neighborhood Food Network", date: "2026-10-08", locality: "Sunnyvale", cause: "Food Banks & Homelessness", title: "Full bags. One less thing to worry about.", summary: "A fictional neighborhood pantry is preparing weekend grocery bags. Join a packing or pickup team and help neighbors make the most of their week.", eventIds: ["evt-market", "evt-pantry"], status: "published", art: "food", label: "SHOW UP FOR YOUR NEIGHBORS"},
  {id: "story-tech", publisher: "Bridge Learning Center", date: "2026-10-07", locality: "Cupertino", cause: "STEM & Technology", title: "Your everyday tech skills can open doors.", summary: "In this demo, neighbors want help with basic device settings and online forms. Bring patience to a friendly community help desk.", eventIds: ["evt-repair", "evt-tech"], status: "published", art: "tech", label: "MAKE CONNECTION POSSIBLE"},
  {id: "story-paws", publisher: "Paws & Paths", date: "2026-10-06", locality: "Bay Area", cause: "Animal Welfare", title: "Make a shelter animal’s day a little better.", summary: "Our fictional animal care team is preparing enrichment activities and tidying shared spaces. This popular shift has a waitlist; offers need your acceptance.", eventIds: ["evt-shelter"], status: "published", art: "paws", label: "A LITTLE CARE GOES A LONG WAY"},
  {id: "story-wellness", publisher: "Community Wellness", date: "2026-10-05", locality: "Bay Area", cause: "Healthcare & Community Wellness", title: "Make helpful information easier to find.", summary: "A fictional virtual wellness team needs Spanish-speaking volunteers to help organize educational resources. Review the skills and grade requirements before joining.", eventIds: ["evt-wellness"], status: "published", art: "wellness", label: "HELP FROM WHERE YOU ARE"},
];
