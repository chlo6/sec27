// Entirely fictional local service scenarios, not live news or real partners.
const event = (id, title, category, date, location, shifts, orgId = "org-1") => ({
  id, title, category, date, location, orgId,
  organization: orgId === "org-1" ? "Greenway Collective" : "Bridge Learning Center",
  description: "A fictional Bay Area service opportunity for the CivicShift demonstration. Work alongside a coordinator and a small volunteer team.",
  responsibilities: ["Meet the demo coordinator for a safety briefing", "Work with your team on the community task", "Check out and submit your time card"],
  locationType: "In person", address: `${location}, California (fictional meeting point)`,
  lat: 45, lng: 55, createdDate: "2026-10-10", minGrade: 9, requiredSkills: [],
  tags: ["Fictional demo", "First-timer friendly"], verifiedOrganizer: true, approvalMode: "manual",
  recurring: "One time", status: "active", whatToBring: "Water and comfortable shoes.",
  parking: "Meet the coordinator at the demo welcome table.", contactPerson: "Demo coordinator",
  shifts: shifts.map(([name, start, end], i) => ({id: `${id}-shift-${i + 1}`, name, role: "Team volunteer", start, end, capacity: 8, filled: 0})),
});
export const EXTRA_EVENTS = [
  event("evt-creek", "Creek cleanup", "Environment & Sustainability", "2026-10-24", "Cupertino", [["Creek care team", "09:00", "11:00"], ["Trail stewardship", "11:00", "13:00"]]),
  event("evt-books", "Reading support", "Education & Tutoring", "2026-10-28", "Cupertino", [["Reading buddies", "15:30", "17:30"]], "org-2"),
  event("evt-market", "Food pantry packing", "Food Banks & Homelessness", "2026-10-31", "Sunnyvale", [["Morning packing", "09:00", "11:00"], ["Community pickup", "11:00", "13:00"]]),
  event("evt-repair", "Community tech help", "STEM & Technology", "2026-11-07", "Cupertino", [["Device help desk", "10:00", "12:00"]], "org-2"),
];
export const STORIES = [
  {id: "story-creek", publisher: "Greenway Collective", date: "2026-10-10", locality: "Cupertino", cause: "Environment & Sustainability", title: "Creek cleanup volunteers", summary: "Help collect litter along a neighborhood creek in Cupertino.", eventIds: ["evt-creek", "evt-garden"], status: "published", art: "creek", label: "CREEK CLEANUP"},
  {id: "story-books", publisher: "Bridge Learning Center", date: "2026-10-09", locality: "Cupertino", cause: "Education & Tutoring", title: "After-school reading volunteers", summary: "Help students practice reading in an after-school group.", eventIds: ["evt-books", "evt-math"], status: "published", art: "books", label: "READING SUPPORT"},
  {id: "story-food", publisher: "Neighborhood Food Network", date: "2026-10-08", locality: "Sunnyvale", cause: "Food Banks & Homelessness", title: "Food pantry volunteers", summary: "Pack grocery bags and help with weekend pickup at a Sunnyvale pantry.", eventIds: ["evt-market", "evt-pantry"], status: "published", art: "food", label: "FOOD PANTRY"},
  {id: "story-tech", publisher: "Bridge Learning Center", date: "2026-10-07", locality: "Cupertino", cause: "STEM & Technology", title: "Community tech volunteers", summary: "Help residents with device settings and online forms.", eventIds: ["evt-repair", "evt-tech"], status: "published", art: "tech", label: "TECH HELP"},
  {id: "story-paws", publisher: "Paws & Paths", date: "2026-10-06", locality: "Bay Area", cause: "Animal Welfare", title: "Animal shelter volunteers", summary: "Prepare animal enrichment activities and clean shared spaces. Full shifts offer a waitlist.", eventIds: ["evt-shelter"], status: "published", art: "paws", label: "ANIMAL CARE"},
  {id: "story-wellness", publisher: "Community Wellness", date: "2026-10-05", locality: "Bay Area", cause: "Healthcare & Community Wellness", title: "Wellness translation volunteers", summary: "Organize wellness resources remotely. Spanish skills and grade requirements apply.", eventIds: ["evt-wellness"], status: "published", art: "wellness", label: "TRANSLATION"},
];

// Refresh unchanged seed copy without overwriting organizer edits or saved activity.
const PREVIOUS_STORY_COPY = [
  {
    "id": "story-creek",
    "title": "A cleaner creek starts with a Saturday morning.",
    "summary": "In this demo story, autumn litter is collecting along a neighborhood creek. A few hours with a cleanup team can help keep the waterway welcoming for everyone.",
    "label": "CARE FOR OUR COMMON GROUND"
  },
  {
    "id": "story-books",
    "title": "Be the person who makes reading click.",
    "summary": "Our fictional after-school reading circle is welcoming new learners. Patient reading buddies can make the next chapter feel a little less daunting.",
    "label": "SMALL MOMENTS, LASTING CHANGE"
  },
  {
    "id": "story-food",
    "title": "Full bags. One less thing to worry about.",
    "summary": "A fictional neighborhood pantry is preparing weekend grocery bags. Join a packing or pickup team and help neighbors make the most of their week.",
    "label": "SHOW UP FOR YOUR NEIGHBORS"
  },
  {
    "id": "story-tech",
    "title": "Your everyday tech skills can open doors.",
    "summary": "In this demo, neighbors want help with basic device settings and online forms. Bring patience to a friendly community help desk.",
    "label": "MAKE CONNECTION POSSIBLE"
  },
  {
    "id": "story-paws",
    "title": "Make a shelter animal’s day a little better.",
    "summary": "Our fictional animal care team is preparing enrichment activities and tidying shared spaces. This popular shift has a waitlist; offers need your acceptance.",
    "label": "A LITTLE CARE GOES A LONG WAY"
  },
  {
    "id": "story-wellness",
    "title": "Make helpful information easier to find.",
    "summary": "A fictional virtual wellness team needs Spanish-speaking volunteers to help organize educational resources. Review the skills and grade requirements before joining.",
    "label": "HELP FROM WHERE YOU ARE"
  }
];
const PREVIOUS_EVENT_COPY = [
  {
    "id": "evt-creek",
    "title": "Give the creek a fresh start",
    "whatToBring": "Water, comfortable shoes, and a curious mind."
  },
  {
    "id": "evt-books",
    "title": "A little reading goes a long way",
    "whatToBring": "Water, comfortable shoes, and a curious mind."
  },
  {
    "id": "evt-market",
    "title": "Pack a brighter weekend",
    "whatToBring": "Water, comfortable shoes, and a curious mind."
  },
  {
    "id": "evt-repair",
    "title": "Help neighbors get connected",
    "whatToBring": "Water, comfortable shoes, and a curious mind."
  }
];
export function refreshDemoCopy(state) {
  for (const [records, previous, defaults] of [[state.stories, PREVIOUS_STORY_COPY, STORIES], [state.events, PREVIOUS_EVENT_COPY, EXTRA_EVENTS]]) {
    for (const old of previous) {
      const record = records.find(item => item.id === old.id);
      const current = defaults.find(item => item.id === old.id);
      if (!record || !current) continue;
      for (const [field, value] of Object.entries(old)) {
        if (field !== "id" && record[field] === value) record[field] = current[field];
      }
    }
  }
}
