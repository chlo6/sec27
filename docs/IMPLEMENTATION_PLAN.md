# CivicShift interactive prototype implementation

## Baseline and delivery

- Fetch and fast-forward `main` before editing; actual starting commit: `81d3443`, “Build complete CivicShift demo portal.”
- Implement on `codex/civicshift-interactive-prototype`; commit and push that branch only.
- Preserve `.openai/hosting.json`, the buildless architecture, Manrope, the palette, and existing portal entry/hash routes.
- Deliver local preview and GitHub branch. No merge, force-push, or replacement Sites project.

## Implemented sequence

### 1. Shared records and rules

Extract persistence into `state.js`, with additive v4 → v5 migration. Preserve old state as a backup and retain custom records and saved changes. Track legacy background occupancy separately from registrations. Centralize eligibility, capacity, approvals, waitlist offers, attendance, verification, recommendations, and report data in `domain.js`.

Mutations run on a copied state and commit only on success. Rejected actions are logged without partially changing registrations. At UI confirmation, reload persisted state, validate the actor and current rules, then save and render. Browser storage events update other open tabs.

### 2. Feed and public/portal connection

Use the same application shell and data at both entry pages. Make `index.html` default to Community; retain `portal.html`'s dashboard default. Add common primary navigation, six fictional Cupertino/Bay Area stories, four additional events (fourteen combined shifts), search/cause filters, For You/Latest/Saved, and explanations using interests, location, and parsed weekly availability. Retain existing events and routes.

Show verified goal progress and commitments alongside the desktop feed; stack on mobile. Admins can publish/hide stories, including hiding them from Saved. Organizers retain ownership restrictions; admins get all event screens and approval queues.

### 3. Demo assistant

Use deterministic intents and local records. Supported requests find/explain shifts, inspect conflicts (including commitments changed after registration), compute remaining hours, and propose signup/cancellation. Proposals do not mutate data. Confirmation checks actor, consent/age, grade, skills, blocked dates, overlap, event state, time, and capacity again. Changed signup outcomes require a fresh proposal. Results enter activity history. Native modal behavior, Escape, focus restoration, labels, suggested prompts, and explicit demo disclosures keep the interaction understandable.

### 4. Complete service journey

Approvals use the same eligibility rules as signups. Freed capacity produces an offer for the next eligible waiting volunteer; acceptance is explicit. An accepted offer on a manual event still needs approval. Offers reserve capacity, with withdrawal available and no background expiry.

Attendance requires the event date and a saved demo clock. Check-in must occur within the shift, checkout must follow check-in, and elapsed time produces a pending card linked to its registration and shift. Repeated actions cannot duplicate cards or verification; multiple shifts at one event remain distinct. Daily hour limits apply. Only verified records count toward goals and exports. Historical cached counters are not treated as evidence of service.

The roster offers explicit advance/reset controls. Resetting only the clock preserves attendance; resetting all data restores fresh seed state. Consent and check-in codes are labeled demonstrations. CSV and calendar-file exports remain available; the calendar can navigate between months.

### 5. Verification and handoff

Run the dependency-free Node tests, inspect desktop/tablet/mobile layouts, exercise keyboard/dialog focus, validate browser persistence/history/deep links, and walk through all four roles. Document concrete results and limits in `VERIFICATION.md`. Update README and credits, commit all prototype changes, and push with upstream tracking.

## Deferred implementation

Real authentication; server-enforced roles; database transactions and migrations; private document/waiver storage; actual QR tokens/scanning; live news; model hosting and evaluations; unattended agents; notifications via email/SMS; and production analytics remain outside this phase. A production implementation must move domain validation and authoritative state to a server and define idempotency/concurrency semantics.
