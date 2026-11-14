# Game-demo verification

Verified November 7, 2026 on `codex/civicshift-game-demo`, based on prototype commit `93d8846`. Remote main was fetched before editing and remained at `81d3443`.

## Automated checks

`npm test`: **39 passing, 0 failing**. Uses Node's built-in runner and the actual application modules; no external packages.

| Area | Coverage |
| --- | --- |
| Existing workflows | All 20 original tests: registration, duplicates/conflicts, consent/skills/grade, capacity, ownership, approval, waitlist offers and acceptance, two shifts at one event, verified totals, counselor/organizer exports, feed behavior and assistant confirmations |
| Migration | v4/v5 → v6, preserved custom records, original storage keys, opt-in preferences, per-user notification defaults, repeated load, no fabricated reputation |
| Reputation | Explicit completion, 10+2+3 awards, repeat-action idempotency, independence from time quantity, outside-hour exclusion, assessment/time-card reversals, badge recalculation |
| Absences | Pending case has no deduction, only admin finalizes, −5 for unexcused absence, student appeal suspends deduction, excusal reverses it, ordinary cancellation remains neutral |
| Attendance codes | Ownership, approved registration, canonical event/shift consistency, time window, six-digit format, wrong-code attempt persistence across reload, five-attempt lockout, rotation, expiry, reset invalidation, duplicate check-in |
| Progress | Three-shift/three-cause quest completion, independent multiple shifts, Monday–Sunday school totals, opt-in membership, alias rankings, tied scores, privacy and per-user preferences |
| Reminders/languages | Future 24-hour window, one reminder per registration, opt-out, reload/reset idempotency, language recommendations, organizer preference updates |
| Assistant | All new explanations read records without mutations; points, quests, school goals and check-in limitations are accurate; existing action confirmations stay intact |

JavaScript syntax and `git diff --check` also pass. Hosting configuration is unchanged. Pure rendering smoke checks cover progress, leaderboard, assessment, absence, calendar and active attendance-code panels.

## Browser walkthroughs

Used a separate preview origin on port 4174 to isolate disposable QA data from the existing preview on port 4173.

- Maya confirmed readiness for the approved Garden Setup shift before start.
- Nina advanced the saved clock to October 17 at 08:00 and generated a six-digit code, visibly expiring at 08:10.
- Maya entered the code and was checked in; no service credit was issued from code entry alone.
- Nina advanced to 10:00, checked Maya out, verified the pending two-hour time card, and explicitly confirmed completion and tasks.
- Progress showed **12.50 verified hours and 15 reputation points**, with +10, +2 and +3 ledger entries, First Step and Service Milestone badges.
- Maya opted into the school team and leaderboard as **Garden Fox**. School progress showed **2.00/20 hours**, and the leaderboard used the alias, reputation and badges. Reload preserved these results.
- Counselor view showed Maya's **12.50h** and the school's **17.50h** total, with no reputation added to service credit.
- A new Cleanup registration was confirmed, then marked absent after shift end. Admin review finalized an unexcused absence, changing reputation from 15 to 10. Maya's correction request returned the case to pending and restored the suspended five points with a visible ledger reversal; hours remained 12.50.
- Assistant accurately explained Maya's current reputation. Escape closed the drawer and returned focus to its launcher.
- Next-seven-days filtering at October 17 returned the October 21 Math Lab and October 24 Creek opportunities.
- Password-free local profile creation reached onboarding. Back/Forward restored the login/profile routes.
- Full reset restored Maya to 10.50 hours and zero reputation. The test origin was isolated from existing preview data.
- No JavaScript console errors were observed. The main preview was restarted on port 4173 and its new palette verified in a fresh tab.

## Layout and accessibility

- Desktop checked at 1440×1000, tablet at 768×1024, mobile at 390×844. Document width equals viewport width in the checked progress/feed/discovery views.
- Mobile navigation opens with focus inside, and Escape closes it. A transient transition frame was inspected; settled navigation is offscreen and hidden.
- Native form labels are present for readiness/code entry, role/persona selectors, clock, profile, filters and review forms. Assessment and absence detail panels are keyboard-operable native disclosures.
- Reduced-motion CSS disables/reduces transitions. This is a targeted keyboard/layout review, not a full WCAG or assistive-technology audit.
- Final visual direction is black/white with blue accents, including feed art and progress/badge treatments. Light and dark themes were inspected. Versioned CSS URLs refresh cached styles.

## Limits

Browser-local demo only. Local storage is editable and cross-tab updates are not server transactions. Code sharing cannot prove physical presence. No real authentication, live model, background jobs, delivered email/SMS, production consent or calendar synchronization is claimed. Actual provider calendar imports and other browser engines were not tested. Tests cover CSV/ICS content. No hosted deployment was changed.


## Minimal quest-board UI — November 14, 2026

Branch: `codex/civicshift-minimal-quests`. All **39 existing tests pass** after UI changes. JavaScript syntax and `git diff --check` pass. Domain, migration, reputation, attendance, and registration rules were not changed.

Browser checks used the existing local preview on port 4173. Checked desktop, tablet, and mobile viewport presets, with effective CSS widths of 1600, 853, 433, and 355 pixels at the browser's existing zoom. No horizontal document overflow was observed on the inspected feed, progress and event-detail surfaces.

- Search for reading returned one matching quest; Animal Welfare filtering returned the shelter quest and its waitlist opportunity.
- Save/Saved/Unsave updated the card and count; the temporary saved item was removed afterward.
- Event details opened from the board. Back restored the filtered board, Forward reopened details, and route changes focused the workspace.
- Menu opens with Enter and closes with Escape, returning focus to its summary. It retains role-specific calendar, hour, profile, event-management and reporting links.
- Assistant opens from the header, accurately explains personal quest progress, and closes with Escape, restoring launcher focus.
- Student, organizer, admin, and counselor dashboards render. Staff community views omit the student's personal service strip.
- Light and dark personal quest cards were inspected. Dark-mode primary-button hover contrast was corrected.
- Header notification preview showed the active student’s alerts. No browser console errors were recorded.
- Reduced-motion CSS explicitly disables animations and transitions. No new animations were introduced.
- Saved demo records were preserved. Test role/theme changes were restored to Student / Maya / light mode.

This is targeted UI verification, not a new end-to-end audit of every portal function or a full accessibility audit. Prior domain and journey verification remains documented above.


## Main integration — November 14, 2026

Merged `codex/civicshift-minimal-quests` (`1e6adfe`) into main after fetching remote main (`ecacbf3`). Resolved portal HTML/CSS/JS conflicts using the verified game/quest implementation, carrying forward main’s concise portal headings, organizer/school context, neutral dark detail surfaces, header alerts, theme switching, and demo login access. Retained password-free persona access and shared domain records. Kept the native Alerts disclosure styling so main’s old hover-only notification rules cannot hide it. Hosting configuration is unchanged.

Integration checks: all 39 regression tests pass; JavaScript syntax, conflict-marker scan, and diff whitespace checks pass. Browser smoke checks confirmed six paper quests, a visible native Alerts preview, Student dashboard totals of 10.50 hours and zero reputation, seven password-free demo personas, and no console errors. The preview was left on the dashboard.


## GitHub Pages configuration — November 14, 2026

Started from freshly fetched main `5e852c9`. Added an official GitHub Actions workflow that tests under Node 24, packages only `dist/`, and deploys to the `github-pages` environment. YAML parsing, relative asset/import checks, all 39 local tests, and `git diff --check` pass. Existing hosting manifest and app behavior are unchanged.

The repository is public. Current GitHub credentials have push access but no admin/maintainer permission; Pages was not enabled when inspected. The browser session is signed out of GitHub. Owner/maintainer activation under Settings → Pages → Source: GitHub Actions is required before the live deployment can be verified. README includes the exact setup, run, and open-site instructions.


## Plain-language interface — November 14, 2026

Replaced decorative copy with direct page labels, activity titles, descriptions, and empty states. The feed is titled Quests; navigation, browser titles, and breadcrumbs agree. Existing saved demo records receive updated copy only where fields exactly match the previous defaults. Organizer edits, hidden/saved stories, registrations, hours, and reputation remain intact.

All 40 tests pass, including the new saved-copy refresh and reload check. Diff whitespace checks pass. Local browser checks confirmed the updated feed and Progress page, keyboard link navigation, and the shorter quest descriptions.

GitHub Pages is now enabled and the initial deployment succeeded. Both public entry pages and all seven directly referenced CSS/JavaScript assets returned HTTP 200. Main pushes automatically run tests and publish the site.


## Opportunities calendar — November 14, 2026

All 51 tests pass. New coverage includes individual-shift filtering/capacity, month/year navigation, new-post dates, HTML escaping, empty months, all 14 published shifts, stable calendar IDs, Pacific daylight-saving conversion, cancellation, UTC timestamps, text injection/UTF-8 folding, CRLF, overnight shifts, exclusion of private fields, and reproducible generation. Feed tests also pass with the host timezone set to Asia/Tokyo.

Browser checks: desktop month grid and mobile date list, no horizontal page overflow at checked sizes, category filtering, month navigation, Back/Forward and reload on a month URL, and successful copy-link with the exact public URL on the clipboard. Google setup link targets the official From URL page. Existing personal-calendar exports remain separate.

The integration publishes a standards-based public feed. No Google account was connected or modified; adding it to a user's Google Calendar and Google's refresh schedule remain provider-side steps. Events retain fictional October–November 2026 demo dates.


## Test-account sign-in and swipe navigation — November 14, 2026

All 72 tests pass. Nine account tests cover all seven fixed profiles, invalid credentials, normalized usernames, exact password matching, missing users/changed roles, tab-session reload, sign-out, malformed sessions, storage failures, isolated sessions, and absence of password persistence. Twelve gesture tests cover both directions, edge stops, movement thresholds, vertical/diagonal scrolls, cancellation, multitouch, control/scroll-area exclusions, linked-card click suppression, mouse drag, rerenders, and cleanup.

Browser verification confirmed invalid-password feedback, student/admin/organizer/counselor dashboards, sign-out, reload persistence, calendar deep-link continuation, and separate student/admin sessions across two tabs. Native horizontal drags switched Cards → Calendar → Map and back. Vertical page scrolling remained available; a mobile layout check found no horizontal overflow. Native touchscreen hardware was not separately available; touch/pen paths are covered by the gesture tests.

The site now uses public fixed test credentials instead of role/persona dropdowns. This remains a client-side prototype, not secure authentication. Shared fictional service records remain in localStorage, while each tab stores its selected identity in sessionStorage. Entered passwords are not persisted by the app.
