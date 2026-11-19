# Oskar's Own Bed 🦕

A tiny, one-button PWA to help a 5-year-old build the habit of staying in
his own bed all night — no accounts, no backend, just a big green button
and a growing collection of dino friends.

## How it's used

1. Open the app on the parent's phone (best: add it to the home screen —
   Safari share sheet → "Add to Home Screen" — so it opens full-screen
   like a real app).
2. Each morning, hand the phone to your kid for a few seconds. If he
   stayed in his own bed, he taps the big green button himself.
3. The streak, footprint row, and "best ever" record update instantly
   with a confetti + roar celebration. Milestones (1, 3, 5, 10, 20
   nights) unlock new dino friends.
4. Everything else — sound toggle, logging an earlier night, manual add/undo,
   backup export/import, reset — lives behind the small gear icon (⚙️) in
   the top-right corner, for parents only.

Forgot a morning? In Parent Settings, ‹ steps back through earlier nights
(› stops at today — a future night can't be logged). Mark that he stayed,
or undo a night that was tapped by mistake. The streak, footprint row, and
dino friends update from the saved nights. There is no limit on how far
back you can go.

The design rationale and full build plan (including the audit pass) is in
[`docs/plan.md`](docs/plan.md).

## Tech

Vanilla HTML/CSS/JS, zero build step, zero dependencies. Data lives in
`localStorage` on whichever device/browser is used — installed as a PWA
via `manifest.webmanifest` + `sw.js` for offline use and a home-screen
icon.

- `logic.js` — pure functions: day-boundary date math, streak
  calculation, milestone logic, backup validation.
- `storage.js` — localStorage read/write helpers.
- `app.js` — rendering and event wiring for the three views (Today,
  Dino Friends, Parent Settings).

## Running locally

No build step — just serve the folder statically, e.g.:

```bash
npx serve .
```

or open `index.html` directly in a browser (some PWA features like the
service worker require serving over http(s), not `file://`).

Date and streak rules are covered by `node --test`.
