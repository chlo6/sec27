# CivicShift

CivicShift is an original, from-scratch website for the 2026-2027 FBLA Website Coding & Development topic. It addresses a real organizational need: coordinating high school volunteers, nonprofit events, shifts, approvals, and verified service hours.

## Current build

The project includes a responsive public homepage and a role-aware demonstration portal featuring:

- Student, organizer, and administrator dashboard previews
- Searchable and filterable sample volunteer opportunities
- Conflict-aware scheduling and shift capacity concepts
- Verified-hours status flow
- Save buttons, dialogs, role switching, and mobile navigation
- Keyboard navigation, visible focus states, semantic landmarks, ARIA labels, reduced-motion support, and high-contrast styling
- Browser-local demo accounts for students, nonprofit organizers, administrators, and school counselors
- Personalized onboarding, role-specific dashboards, event and shift management, approvals, calendars, notifications, youth-safety controls, check-in, reports, and exports
- Capacity, duplicate-booking, conflict, guardian-consent, grade, skill, past-date, and form validation

## Run locally

The site is buildless and has no third-party dependencies.

```bash
python3 -m http.server 4173 --directory dist
```

Then open `http://localhost:4173`.

## Project structure

- `dist/index.html` — semantic page content
- `dist/styles.css` — responsive visual system and layout
- `dist/app.js` — interactions and UI state
- `dist/portal.html` — role-aware application shell
- `dist/portal.css` — dashboard, forms, tables, calendars, and responsive layouts
- `dist/portal.js` — browser-local workflows, validation, permissions, and exports
- `dist/data.js` — fictional seeded organizations, users, events, shifts, hours, and alerts
- `dist/favicon.svg` — original browser icon
- `.openai/hosting.json` — hosting configuration
- `SOURCES.md` — source and asset documentation

## Originality

No website template was used. The interface, copy, CSS illustrations, inline SVG marks, and JavaScript interactions were created specifically for this project.
