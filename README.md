# CivicShift

An original, buildless volunteer coordination prototype for the team's FBLA website project. Students discover local needs, register for shifts, and track organizer-verified service. All stories, organizations, people, and activity are fictional demo content.

## Run locally

```bash
npm run preview
```

Open **http://127.0.0.1:4173**. Requires Python 3; no installation or build step is needed. Alternatively run `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist`.

The homepage opens the community feed. `portal.html` still opens the dashboard, and existing hash routes remain available, such as `portal.html#/event/evt-garden`. Serve over HTTP; ES modules do not work reliably with `file://`.

## What's included

- A community needs feed with search, causes, **For You / Latest / Saved**, recommendation explanations, six fictional stories, ten events, and fourteen shifts.
- The existing Manrope typography, CivicShift palette, four roles, onboarding, dashboards, calendars, notifications, portfolios, reports, and CSV/ICS exports.
- Role and persona selectors for all seeded students and organizers. Admins manage all events and publish/hide stories; organizers manage their own events. Counselors have a school-scoped view.
- A keyboard-accessible **Demo assistant**. Try “Find Saturday shifts,” “Explain matches,” “Check conflicts,” “Hours remaining,” or “Cancel a signup.” It proposes registration changes for explicit confirmation and rechecks current state at confirmation.
- Shared rules for registration, conflicts, eligibility, capacity, waitlist offers, attendance, hour verification, and activity history.
- A saved demo clock for attendance walkthroughs. Check in during a shift, advance time, then check out. Each registration creates one pending time card. Verified records alone count toward progress and reports.

## A complete walkthrough

1. As **Student Volunteer / Maya Chen**, open the reading story in Community. Choose **A little reading goes a long way**, request its shift, and confirm. Or ask the assistant to find shifts and review that signup.
2. Switch to **Nonprofit Organizer / Marcus Lee**. Open **Approvals** and approve Maya's reading request.
3. Open **Check-in & roster**, select the reading event, and advance the demo clock to **2026-10-28 15:30**. Check Maya in.
4. Advance to **2026-10-28 17:30**, then check her out. A **2.00-hour pending** time card appears.
5. Verify that time card in Approvals. Maya's verified total rises from **10.50 to 12.50**.
6. Switch to **School Counselor** to see and export the same verified total. Switch to **Administrator** to review activity or hide/publish stories.
7. **Reset clock** in the roster returns to October 10 while preserving records. **Reset all demo data** in About restores the entire seed dataset.

For waitlists, use the full shelter shift, or fill the last garden setup spot with Eli. A withdrawal offers the next eligible waiting volunteer a spot. The volunteer must accept it; manual-approval events still require organizer review. Offers reserve capacity until accepted or withdrawn; this demo has no unattended expiry job.

## Persistence and migration

State is stored under `civicshift-demo-v5` on the current browser origin. The first load automatically migrates `civicshift-demo-v4`, retaining saved records, custom users/events, preferences, and changes while adding missing fields and new community content. The original v4 key remains as a backup. Reloads and both entry pages share the same state when served from the same origin; `localhost` and `127.0.0.1` are different origins.

Totals now come from actual verified hour records. Legacy hard-coded dashboard offsets and cached user totals are intentionally not counted or converted into invented time cards. Legacy filled counts are retained as explicit background occupancy for fictional volunteers without full profiles. Unattributed outside-hour submissions are reviewed by an admin.

Unreadable or unsupported future-version storage is not silently replaced. Export browser storage before clearing it. Reset replaces only this demo's v5 state.

## Test

```bash
npm test
```

Uses Node's built-in test runner (Node 20+), with no packages to install. See [verification results](docs/VERIFICATION.md) and [implementation plan](docs/IMPLEMENTATION_PLAN.md).

## Source map

| File | Purpose |
| --- | --- |
| `dist/index.html`, `dist/portal.html` | Shared application shell and preserved entry URLs |
| `dist/portal.js`, `dist/portal.css` | Portal routes, forms, dashboards, existing visual system |
| `dist/state.js` | Seed, v4 → v5 migration, local persistence |
| `dist/domain.js` | Shared validation, transactional actions, recommendations, verified totals/exports |
| `dist/community.js`, `dist/community.css` | Feed, story controls, navigation, assistant and responsive styling |
| `dist/assistant.js` | Deterministic intent matching and confirmation drawer |
| `dist/data.js`, `dist/community-data.js` | Fictional original and additional records |
| `tests/demo.test.js` | Migration, workflows, permissions, recommendations, feed and assistant tests |
| `.openai/hosting.json` | Existing static hosting configuration; unchanged |

The previous marketing-only `app.js` and `styles.css` remain in the repository for reference; the shared application entry pages do not load them.

## Demo boundaries

This is a **browser-local interactive demo**, with simulated roles and consent. Local permission checks demonstrate the workflow; users can edit browser storage. There is no real authentication, backend, live news, hosted model, background agent, email/SMS delivery, signed waiver, geolocation verification, or QR scanner. The assistant uses deterministic rules, not live AI inference. Local storage synchronizes ordinary changes across tabs, but is not a server transaction or a concurrency guarantee.

The existing Sites project was inaccessible from this chat. Delivery is the local preview and a separate GitHub feature branch; hosting configuration is preserved.

## Originality and credits

Original project-specific interface, code, copy, and CSS/SVG artwork. No website template or UI framework. See [SOURCES.md](SOURCES.md) for design references and font credits. The team should review, adapt, and disclose development assistance according to its applicable competition rules.
