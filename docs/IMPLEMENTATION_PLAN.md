# CivicShift gamified volunteer demo

## Product and scope

Discover a community need → choose a suitable shift → prepare → attend → receive verified hours and earned reputation → advance personal and school goals.

Verified hours measure approved service time. Reputation is an accumulated record of reliability and contribution, and therefore also grows with participation; it is not an objective rating of personal quality. Badges are a separate, non-currency achievement system.

This phase extends the original buildless HTML/CSS/ES-module prototype. It preserves community stories, four demo roles, event management, waitlist offers, attendance, counselor reporting, existing entry URLs, Manrope, and `.openai/hosting.json`. Real login, backend permissions, delivered messages, live AI, continuous calendar sync and fraud-resistant attendance remain deferred.

## Agreed behavior

- Final visual direction: black and white with blue accents, per the team’s follow-up instruction. Use neutral surfaces, dark text, blue actions and blue achievement treatments across feed artwork, cards and dashboards.

- Feed first: community stories plus distinct hour/reputation cards, personal quests, school-team progress, commitments, and a seven-day opportunity view.
- Discovery: preserve search, categories, location, availability and sorting; add a seven-day date filter and keep capacity/eligibility visible.
- Demo login: choose a persona or create a local profile without passwords. Onboarding/profile cover birth date, school, interests, skills, availability, location, languages, optional emergency contact, alias, team and notification preferences.
- Waitlists: cancellation offers the freed place to the next eligible volunteer; acceptance rechecks the current rules. There is no surprise auto-registration.
- Calendar: Google add-event links and Apple/Outlook-compatible ICS exports; these are not live synchronization.
- Progress: personal quests and optional school cooperation; the school leaderboard is opt-in and uses aliases, equal ranks for ties, and reputation rather than hours.
- Organizer/admin: owning organizers manage assessments, attendance and code sessions; admins finalize absence cases and corrections. Counselor reports continue to count only verified hours.

## Scoring and progression

| Evidence | Points |
| --- | ---: |
| Organizer-confirmed completion with verified, registration-linked hours | +10 |
| Readiness acknowledged before shift start, followed by verified completion | +2 |
| Explicit organizer/admin confirmation that agreed tasks were fulfilled | +3 |
| Admin-finalized unexcused absence | −5 |

Each positive reason is awarded once per registration, with a maximum of 15 points. Email opens, hourly duration, reviews, logins and badges do not generate points. All awards and reversals retain evidence and audit history; the visible balance is at least zero. Correcting evidence recalculates awards. Pending absence cases have no score effect, students can explain/appeal, and excused absences, ordinary withdrawals and organizer cancellations have no deduction. Reputation is not an eligibility gate.

Four record-derived quests award badges: First Step (one verified completed shift), Ready to Help (three verified completed shifts with advance readiness), Cause Explorer (three categories), and Service Milestone (ten verified hours). School teams are opt-in and target 20 verified hours dated within the current Monday–Sunday demo week. Only opted-in school members contribute. Rankings require at least one scored verified shift.

## Shared implementation

- v6 storage migrates v4/v5 additively, preserving old keys and user changes. New state holds reputation entries, completion assessments, readiness records, absence cases, code sessions and per-user preferences. No historical quality awards are fabricated.
- `game.js` owns record-derived progress and idempotent reward/reminder reconciliation; `domain.js` owns permission-checked mutations. Ordinary controls and the assistant share those rules.
- New hash routes: `#/login`, `#/progress`, `#/leaderboard`. The feed and existing portal use the same records and shell. New game views remain responsive and keyboard accessible.
- A six-digit organizer code is scoped to one shift and lasts ten demo minutes or until shift end. Rotation/reset invalidates it; five failed submissions block that student for the session. Manual organizer check-in remains available. Checkout makes pending hours; verification and completion assessment remain separate from code entry.
- Evaluate optional 24-hour in-app reminders on load and clock changes, once per registration. No closed-browser jobs or real email/SMS delivery. Readiness is independent of notification settings.
- Assistant explains matching, hours, points, quests, school progress and attendance. Registration changes still require confirmation; no live inference or automatic attendance claims.

## Verification and delivery

Retain the original registration/attendance/report tests and add migration, scoring/reversal, reminders, code validation/lockout, per-user preferences, privacy, team and assistant tests. Exercise the end-to-end flow across four roles and inspect desktop/tablet/mobile layouts, labels, focus, history/deep links and reduced-motion rules. Record actual results in VERIFICATION.md.

Before editing, fetched remote changes, fast-forwarded local main, created `codex/civicshift-game-demo` from main, and incorporated the original prototype branch. The inspected remote main was `81d3443`; prototype baseline was `93d8846`. Deliver a local preview and commit/push the feature branch only. Do not force-push, merge into main, or modify hosting.


## Minimal quest-board UI — November 14, 2026

Implemented on `codex/civicshift-minimal-quests`, based on game-demo commit `6586743`. Fetched remote main (`ecacbf3`) before editing. Main has independent portal changes, so this branch retains the working prototype and carries forward its simpler header intent, notification preview, theme control, and login shortcut without replacing shared domain modules. Main remains unchanged.

- Use one community quest board with wide paper cards, restrained folded corners, original blue SVG stamps, dark text, and warm-white surfaces.
- Pair system Georgia display headings with Manrope controls. Remove decorative feed banners and the permanent dashboard sidebar; use an accessible native Menu for all role tools.
- Keep hours, reputation, and approved commitments separate in a compact service strip. Put personal quest details and calendars in expandable sections; retain dedicated progress and dashboard routes.
- Preserve search, cause filtering, For You/Latest/Saved views, recommendation explanations, event links, confirmed signup actions, all four roles, and saved state.
- Scope notification previews to the active user and hide student-only personal summaries in staff views.
- Refresh changed script/style URLs so an existing preview loads the redesign without clearing local records.
- Verify existing tests and representative responsive, keyboard, navigation and theme flows; commit and push the feature branch. Hosting remains unchanged.


## Main integration

The team subsequently authorized merging and pushing the completed quest-board design to `main`. Preserve both branch histories in a merge commit, retain the prototype’s domain and game modules, reconcile main’s portal copy/header improvements, run the existing regression suite, and push normally without force. Future work uses `main`.
