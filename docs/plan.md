# "Oskar's Own Bed" — Build Plan (Final, post-audit)

## Goal
A tiny, one-purpose, browser-based PWA that helps Max's 5-year-old son Oskar
build the habit of staying in his own bed all night, using a streak
mechanic he can operate himself: one giant green button. Reward is a
retrospective morning tap on Dad's iPhone 13 mini, not a live overnight
sensor — this is a deliberate, explicit design constraint (see "Morning
ritual" below).

Public repo on GitHub, hosted on GitHub Pages so it's testable immediately
from a phone URL. No backend, no accounts — localStorage only, same
pattern as the sibling "Workout Tracking App". Theme: dinosaurs. Repo:
`oskar-own-bed`. On-screen name: "Oskar's Own Bed".

Known limitation, stated up front: kids this age often come into a
parent's bed from fear/anxiety, not just habit. This app rewards and makes
visible the *outcome* (a night in his own bed); it is a habit-support and
motivation tool, not a fix for what makes a given night hard. It pairs
with, not replaces, bedtime reassurance from Max.

## Core interaction (the whole app, from a 5-year-old's POV)
1. Open the app (icon on the home screen: a dino).
2. See ONE huge round green button, filling most of the screen, with a
   simple label/icon ("I stayed in MY bed! 🦕").
3. Tap it → big, fast, satisfying celebration (dino roar animation,
   confetti, the streak number flips up) — reward happens in under a
   second, no waiting, no menus.
4. See the current streak as a friendly row of dino footprints across the
   top, one per night, filling in as he goes. Alongside it, always
   visible: "Best ever: N 🏆" — his all-time record, shown to him
   directly, not just to Max.
5. Button becomes a celebratory disabled state once pressed for the day
   ("See you tomorrow, dino! 🌙") — can't double-press to game it. The
   ONLY way to correct a mistaken tap is through parent settings (small
   gear icon) — no tap-and-hold or secondary gesture on the main button
   itself, so Oskar can't accidentally discover a way to undo his own
   night.
6. Milestones unlock a badge with a bigger celebration and a new dino
   character added to a small "dino friends" collection screen.
   Front-loaded spacing tuned for a 5-year-old's patience: **1 (first
   night ever, celebrated big — it's the hardest one), 3, 5, 10, 20**.
   Each unlock is a surprise/different dino friend, not a predictable
   fixed badge, since novelty sustains interest better at this age.

Everything else (parent settings, undo, backup) exists for Max, tucked
behind a small, low-visual-weight gear icon — Oskar never needs to see it.

## Morning ritual (closing the timing gap)
The behavior (staying in bed) happens hours before the reward (the tap),
and a 5-year-old has weak delayed gratification — so the plan makes the
morning moment itself feel deliberate and causally clear rather than
incidental:
- Copy explicitly references *last night*, spelling out the causal story
  in words a 5-year-old can hold: "You stayed in your own bed all night!
  🦕" — not just "nice job," which doesn't name the achievement.
- Recommend (in the README / a short note to Max, not enforced by code)
  that the tap happen at one consistent moment — e.g. right when Oskar
  first sees Dad in the morning — so it becomes a small ritual/routine
  rather than "whenever the app happens to get opened."
- The Today screen opens straight to the button, full-screen, with no
  intermediate navigation — the handoff is "unlock phone, hand it over,
  Oskar taps, hand it back," under 10 seconds, so it works as a quick
  ritual rather than an errand.

## Streak & date logic
- Effective-date boundary (mirrors the Workout Tracking App pattern):
  a fixed rollover time (hardcoded 6am, not configurable in v1 — a
  5-year-old's whole night, unlike the workout app's late-session use
  case, doesn't need a tunable boundary) so a tap anytime in the morning
  before 6am-to-6am rollover counts for the right night.
- One tap = one night logged. A second tap the same effective-day is a
  no-op (already-celebrated state), not a duplicate.
- Missing a night breaks the live streak but never empties the footprint
  row to nothing — missed nights render as a small greyed "paused"
  footprint, so the visual reads as "paused," not "erased." Messaging on
  a break is warm, never punitive ("New streak time! Let's go again 🦕").
- All-time longest streak is tracked and always shown to Oskar (see
  "Best ever" above), so a reset never erases his past success from view.
- On the streak-broken / "not yet tonight" state, one small optional
  reassurance line under the button: "Dino is watching over your room
  tonight 🦕🌙" — reassurance framing, not a nag.

## Visual & motivation design (5-year-old-appropriate)
- One primary action, one screen, huge tap target (button ≥ 260px,
  thumb-friendly, dead centered).
- Bright, saturated, high-contrast palette; big rounded shapes; no small
  text Oskar needs to read — icons and color communicate state.
- Immediate, juicy feedback on tap: scale/bounce animation, confetti,
  a short dino "roar" or cheer sound (with a mute toggle for parents),
  haptic tap (navigator.vibrate) if supported.
- No red/failure colors, no sad-face imagery, no countdowns/timers, no
  loss-framed language or visuals anywhere.
- Positive-only tone throughout; copy at a 5-year-old reading level
  (short words, exclamation marks, dino voice), and always speaks
  directly to Oskar in the main loop.

## Screens
1. **Today (home)** — the button screen described above. Default view,
   opens directly here, full-screen.
2. **Dino Friends (collection)** — grid of unlocked/locked dino
   milestone badges (1/3/5/10/20 nights), tap a locked one for a peek
   ("Sleep 2 more nights to unlock!").
3. **Parent settings** (small gear icon, top-right, low visual weight) —
   sound on/off, manual add/undo a night (for a missed or mistaken tap),
   reset streak, JSON backup export/import.

These parent-facing extras (manual undo, JSON backup) are carried over
from the sibling Workout app's pattern rather than explicitly requested
by Max — flagged here as sensible, low-cost additions (mistaken taps
will happen) rather than silently-bundled scope. A configurable
day-boundary and a formal test-runner suite were dropped as
lower-value for a 1-screen kid app; the handful of pure date/streak
functions are simple enough to hand-verify directly instead.

## Tech stack
- Vanilla HTML/CSS/JS, no build step — mirrors the Workout Tracking App,
  keeps GitHub Pages hosting trivial and the codebase auditable.
- `localStorage` for streak data + settings (single device: Max's
  phone). JSON export/import for backup/transfer.
- PWA: `manifest.webmanifest` + service worker for offline + "Add to
  Home Screen" with a dino icon, full-screen standalone display so the
  handoff moment feels like a real app, not a browser tab.
- Confetti/animation via lightweight hand-rolled CSS/canvas (no heavy
  external deps) to keep it fast on an iPhone 13 mini.
- Web Audio API for a short built-in synthesized "roar"/cheer sound,
  muted by default toggle in parent settings.

## File layout
```
index.html
style.css
app.js            (UI rendering, event wiring)
logic.js          (streak/date logic, pure functions)
storage.js        (localStorage read/write + export/import)
manifest.webmanifest
sw.js
icon.svg / apple-touch-icon.png
docs/ (this plan + design notes)
```

## Build steps
1. Scaffold project files + PWA plumbing.
2. Implement `logic.js`: 6am effective-date boundary, streak calc,
   longest-streak record, 1/3/5/10/20 milestone thresholds.
3. Implement `storage.js`: localStorage schema + export/import.
4. Build Today screen: big green button, footprint streak row + "Best
   ever" record, tap → celebration + state update, already-done state,
   paused-not-erased break state with reassurance line.
5. Build celebration: confetti/bounce animation, optional sound, haptic.
6. Build Dino Friends collection screen + milestone unlock logic.
7. Build Parent settings screen: sound toggle, manual add/undo, reset,
   backup export/import — gear icon only, no exposure on the main
   button/screen.
8. PWA manifest + service worker + icons; verify "Add to Home Screen"
   works standalone and offline.
9. Responsive/visual pass specifically at 390×844 (iPhone 13 mini) —
   button and footprint row never require scrolling, safe-area insets
   respected (notch/home-indicator).
10. Create public GitHub repo `oskar-own-bed` under MaxVDP-IRL, push,
    enable GitHub Pages (root of main), verify the live URL loads and
    is installable on a phone.
11. Smoke-test the deployed URL in a mobile-emulated browser (390×844)
    and report the live link back to Max, including a one-line privacy
    note (real name + repo/URL are public — see note below).

## Explicit non-goals for v1
- No multi-child support, no accounts/login, no cloud sync.
- No negative/loss-framed mechanics (no streak countdown timers, no red
  "you failed" states, no emptied footprint row on a miss).
- No ads, no analytics, no third-party trackers (public repo, kid-facing).
- Doesn't attempt to address anxiety/fear that may drive night-waking —
  paired with, not a replacement for, Max's own bedtime reassurance.

## Note to flag for Max (not blocking build)
Repo name, app name, and commit history will contain Oskar's real first
name, publicly and permanently, tied to Max's GitHub identity, with an
unauthenticated Pages URL reachable by anyone who finds it. Max already
chose "Oskar's Own Bed" / `oskar-own-bed` explicitly when asked, so
proceeding with that — flagging it here so it's a conscious choice, not
an assumption, and easy to rename later if he changes his mind.
