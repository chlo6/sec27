# CivicShift

CivicShift is an original, from-scratch website for the 2026-2027 FBLA Website Coding & Development topic. It addresses a real organizational need: coordinating high school volunteers, nonprofit events, shifts, approvals, and verified service hours.

## Current build

The first build is a responsive homepage featuring:

- Student, organizer, and administrator dashboard previews
- Searchable and filterable sample volunteer opportunities
- Conflict-aware scheduling and shift capacity concepts
- Verified-hours status flow
- Save buttons, dialogs, role switching, and mobile navigation
- Keyboard navigation, visible focus states, semantic landmarks, ARIA labels, reduced-motion support, and high-contrast styling

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
- `.openai/hosting.json` — hosting configuration
- `SOURCES.md` — source and asset documentation

## Originality

No website template was used. The interface, copy, CSS illustrations, inline SVG marks, and JavaScript interactions were created specifically for this project.
