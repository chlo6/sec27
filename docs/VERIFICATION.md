# Prototype verification

Verified locally on October 10, 2026, against the implementation based on `main` commit `81d3443`.

## Automated checks

`npm test`: **20 tests passed, 0 failed**, using Node's built-in runner and the same modules imported by the application.

| Area | Covered cases |
| --- | --- |
| State | Fresh seed (6 stories, 10 events, 14 shifts), additive v4 migration, custom changes preserved, repeated migration, v4 backup, save/reload, independent reset seed, unreadable storage preserved |
| Registration | Duplicates, adjacent shifts, overlaps, grade, all required skills, minor consent, adult consent exemption, blocked dates, canceled events, past start time, full capacity |
| Approval | Ownership, admin access, rechecking consent/skills/conflicts/time/capacity, repeated approval rejected |
| Waitlist | Full shift queues, cancellation offers next eligible volunteer, ineligible volunteer skipped, offer reserves capacity, explicit acceptance, stale acceptance rejection, duplicate acceptance |
| Attendance | Check-out before check-in rejected, simulated date/time, repeated check-in/check-out rejected, two shifts at one event produce distinct time cards, pending totals excluded, verification counted once |
| Reports | Organizer scope, admin review, school-scoped counselor export, actual verified totals, CSV values, calendar file includes approved active registrations and correct times |
| Community | Search, cause filter, chronological Latest, Saved, hidden stories absent from Saved, republishing restores visibility |
| Assistant | Nonmutating suggestions, explained interest/location/weekly availability, Saturday matching, remaining hours, unsupported requests, stale capacity outcome rejected and logged, conflicts caused by later schedule edits |

Additional checks: JavaScript syntax checks and `git diff --check`. Existing `.openai/hosting.json` remains unchanged.

## Browser walkthroughs

Tested in the Codex in-app browser with the local HTTP server:

- Feed search for “reading,” save a story, Saved view, and reload persistence.
- Assistant proposes the reading shift; explicit confirmation creates a pending signup.
- Organizer Marcus approves that signup, sets the saved clock to October 28 at 15:30, checks in, advances to 17:30, and checks out.
- Time card remains pending until verification. Maya's total in the counselor view rises from **10.50 to 12.50**, reflecting exactly the verified 2-hour card.
- Admin hides the saved reading story; Saved becomes empty. Admin access and story publication behavior were exercised in browser and automated checks.
- A proposal was left open while a second tab removed Maya's demo consent. Confirmation rejected the action using the latest state and explained why.
- Unsupported assistant request (“email my counselor”) explains supported requests and demo limitations.
- Reset all demo data restores the seeded roles, records, and clock. Browser preview left in fresh student state.
- `portal.html#/event/evt-books` opens directly. Back/Forward moves correctly between Community and Opportunities. Existing portal entry remains functional.
- Calendar month navigation reaches November; the calendar download control is retained. CSV/ICS content is validated in automated tests. The browser automation download-event capture timed out, so OS file-save completion was not verified through that API.
- No JavaScript console errors observed during the final browser checks.

## Responsive and keyboard checks

- **Desktop:** 1280×720 and 1440×1000. Feed and service sidebar fit; no horizontal page overflow at 1440px.
- **Tablet:** 768×1024. Feed and sidebar remain readable; document width equals viewport width.
- **Mobile:** 390×844. Single-column feed, fitting navigation/role controls, full-width assistant drawer; document width equals viewport width.
- Keyboard Enter opens registration confirmation. Escape closes it and returns focus to the request control.
- Assistant Tab and Shift+Tab wrap between its first/last controls; Escape returns focus to its launcher, including after a mutation rerenders the page.
- Mobile navigation moves focus inside when opened and supports Escape. Collapsed navigation is hidden from focus through CSS visibility.
- Native labels and accessible names inspected for search, filters, roles, personas, clock, signup, and assistant controls.
- Reduced-motion rules verified in the loaded stylesheets; no OS motion preference was changed. This is not a full screen-reader or WCAG conformance audit.

## Practical limits

The tests validate a browser-local demonstration. They do not establish production authentication, server permissions, database concurrency, real consent, background expiry, or delivery of messages. Browser engines beyond the in-app browser and actual calendar-provider imports were not exercised. The Sites hosting target was not accessible; no hosted deployment was changed.
