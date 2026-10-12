# CLAUDE.md: Strength & Mobility app

Brief for Claude Code. Read this before changing anything.

## What this is

A personal training app for one person: Tania, 32, London, training at a well-equipped gym (squat racks, barbells, dumbbells and benches, plate-loaded and pin machines including leg press, lat pulldown, seated row, inner/outer thigh, multi-pulley cables, treadmills, cross trainers, rowers, stair climbers, assault bikes, a functional area and a studio with mats). She's slim, new to regular training after a long break, works long desk hours, and has stiffness, painless joint cracking (ankles, knees) and shaking under heavy load.

The plan is 12 weeks, three gym days a week (Day A lower body and glutes, Day B upper body and posture, Day C full body and core), plus a daily five-minute desk reset. It combines progressive resistance training, low-intensity steady-state cardio, and postural restoration and core work.

It runs as an installable web app (PWA) on her **iPhone 15 Pro**, added to the home screen from Safari and hosted free on **GitHub Pages**.

## Hard constraints

- **Free to run, forever.** No paid services, APIs, databases, hosting or Apple developer membership. Anything new must work on GitHub Pages' free tier.
- **Static files only.** No build step, no framework, no npm dependencies at runtime. Plain HTML, CSS and JavaScript that GitHub Pages can serve as-is. A dev-only tool is fine if the shipped files stay plain.
- **Data stays on the phone.** No accounts, no backend, no analytics, no trackers. The log lives in `localStorage`. Backup and restore is a JSON file the user saves to Files or iCloud Drive herself.
- **Never break existing data.** If the visit schema changes, keep reading old records and migrate on load. Restore must keep accepting older backups.
- **Bump `VERSION` in `sw.js` on every change** to any shipped file, or the phone keeps serving the cached old version.
- **iOS Safari first.** Test at 393×852 (iPhone 15 Pro). Respect safe areas (`env(safe-area-inset-*)`), keep inputs at 16px+ font size to stop iOS zooming, keep tap targets 44px+. Avoid APIs iOS web apps don't support (vibration, background sync). Web push needs a server, so it's out of scope.

## Files

| File | What it does |
|---|---|
| `index.html` | App shell: top bar, four screens (Plan, Log, Progress, Guide), bottom tab bar |
| `css/app.css` | All styles. Design tokens on `:root`, dark values under `prefers-color-scheme: dark` |
| `js/plan.js` | `window.PLAN`: days, exercises, steps, tips, cardio, stretches, desk reset, guide text, and the SVG illustrations. Generated from the design canvas, now safe to hand-edit |
| `js/app.js` | Everything else: logging catalogue (`EX`, `DAYS`), storage, plan rendering, log form, history, progress chart and verdict, backup/restore, navigation, service worker registration |
| `sw.js` | Cache-first offline support for app files and Google Fonts |
| `manifest.webmanifest` | Home screen name, colours and icons |
| `icons/` | `apple-touch-icon.png` (180), 192, 512 and a maskable 512 |
| `reference/canvas/` | The original design artboards (`.dc.html`) the plan came from |
| `reference/training-log-artifact.html` | The first log page, built as a Claude artifact with a server-side store. Kept for reference only |

**Keep `EX`/`DAYS` in `app.js` in sync with the exercise codes in `plan.js`** (A1–A5, B1–B5, C1–C6; C1 breathing is shown in the plan but isn't logged).

## Data model

`localStorage["sm.visits.v1"]` holds an array of visits:

```json
{
  "id": "uuid",
  "date": "2026-10-12",
  "session": "A",
  "week": 1,
  "entries": [
    { "ex": "A1", "kg": 40, "sets": 2, "reps": 12, "target": 12, "shook": false }
  ],
  "cardio": { "machine": "Incline treadmill walk", "minutes": 15 },
  "notes": "",
  "createdAt": 1791820000000,
  "updatedAt": 1791820000000
}
```

- `kg` is `null` for bodyweight moves (`unit: "reps"`) and timed holds (`unit: "sec"`, where `reps` holds the seconds).
- `reps` is the reps on the **hardest set**. If that hits `target`, every set did.
- `target` is the plan's rep target for that week, saved at log time so later plan edits don't rewrite history.
- `shook` records whether the set shook. It feeds the progression advice.
- Other keys: `sm.view` (last tab), `sm.planDay` (last day shown on Plan).
- Backup file: `{ "app": "strength-mobility", "version": 1, "exportedAt": "...", "visits": [...] }`. Restore merges by `id`.

## Rules the app encodes

- **Plan week** counts from the first logged visit: week = floor(days since first visit / 7) + 1. Weeks 1–4, 5–8 and 9–12 pick the sets and reps in `EX[code].plan`. Past week 12 uses the 9–12 targets.
- **Two-for-two progression.** Go up when the last two logs of an exercise are at the same weight, both hit `target`, and neither shook. A shaky last session always says hold steady. Increments live in `EX[code].inc`.
- **Cardio targets** are 15, 20 and 25 minutes by block.

## Design and copy

- Tokens: chalk ground `#F2F2EE`, ink `#1B211E`, burnt orange `#C2410C` (dark mode `#F0703F`), teal `#2F6F62` for cardio and posture. Fonts: Barlow Condensed for headings, Barlow for body (Google Fonts, with fallbacks).
- Illustrations: inline SVG, `viewBox="0 0 160 120"`. Dark lines are the body, orange is the part that moves, grey is the equipment, small arrows show direction. Colours are hard-coded, so figures sit on a light plate (`--plate`) in both themes. New figures should follow the same rules.
- Chart colours come from CSS classes (`.c-line`, `.c-dot` and so on), not SVG attributes, because iOS Safari doesn't reliably resolve `var()` in presentation attributes.
- Copy: British English, kg and km/h, plain and direct. **No em dashes.** No hype, no stock AI phrasing. Speak to her as "you".
- Keep the safety copy: the GP guidance about shaking at rest, with light weights, or with dizziness, numbness or pain, and joints that hurt, swell, lock or give way. Keep "not medical advice". Don't add weight-loss, calorie or body-measurement features.

## How to check a change

1. `python3 -m http.server 8000` in the project root, open `http://localhost:8000`.
2. Check it at 393×852 in light and dark mode. No sideways scrolling, nothing hidden behind the tab bar.
3. Log two Day A visits a week apart with the same leg press weight and target reps: Progress should say "Ready to go up". Tick "It shook" on the second: it should say "Hold steady".
4. Back up, clear site data, restore: the visits come back.
5. Go offline after the first load and reload: the app still opens.
6. Bump `VERSION` in `sw.js`.

## Roadmap (ideas, ask before building)

1. Rest timer between sets (60–90 s in weeks 1–4, 90 s in 5–8, up to 2 min in 9–12), with a sound when it ends. iOS needs a tap first before audio can play.
2. Log each set separately instead of only the hardest set.
3. Swap an exercise for an alternative when a machine is busy, keeping its history separate.
4. Week 13 easy week: suggest about two thirds of recent weights.
5. Log the optional Saturday Pilates or Barre class.
6. CSV export alongside the JSON backup.
7. A "this week" view on the Plan screen showing which of A, B and C are done.
