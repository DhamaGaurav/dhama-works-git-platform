# Dhama Works Git Platform: DESIGN.md

App guideline under the Dhama Works Design Bible (Core). Chosen direction: **Option A, Lanes and History** (canvas: https://claude.ai/artifact/4nXKekga8Na3PRELW2VwSP).

## Philosophy
Calm, clear, alive. Never a cluttered dev terminal, never a corporate dashboard.
Creature: the spider on its web. Personality: patient, connected, watchful. Used as motif only (the logo mark, a faint web behind the graph, the breathing main-tip node). No mascot on any screen.

## Colour
Brand layer: ground `#FBF5EC` (dark `#17120F`), ink `#231E1A` (dark `#F3EADF`), accent indigo `#5B4FD6` (dark `#9C93F2`).
Functional layer:
- Lanes (data series, fixed order, a new branch takes the next free slot): `#5B4FD6`, `#B3389F`, `#E0532F`, `#1E8FA8`, `#C98A12`. Dark: `#9C93F2`, `#DB78C9`, `#F07F5E`, `#5CC0D8`, `#E4B04A`.
- Status (never a lane): good `#2A7F58`, recent `#1E7F96`, warn `#A8650F`, crit `#C0392B` (dark: `#5BC18F`, `#5CC0D8`, `#E8A94A`, `#F0806F`).
- Surfaces: white cards `#FFFFFF` on cream, border `#E8DDCC`, radius 18. Dark values are hand-picked, never auto-brightened.

## Type
Manrope for text and headings, JetBrains Mono for numbers, dates and branch stats (tabular digits). Kept from the existing app.

## Layout (Option A)
Top bar: repo picker, refresh and settings (Branches only / All commits toggle sits in the History header). The Kolam thread runs under it while loading.
Main: History panel (lane graph and commit rows share rows) on the left; right column holds the Branches list (Open, then Merged; lane colour dot doubles as the legend) and clicking a branch opens the existing branch-focus popup. A Focus card in the column is not built yet.

## Scale: 20 to 30 people
The app must stay readable with many people, parallel branches and several merges at once.
- Lanes: spacing tightens as lanes grow (20px down to 10px, aiming for a lane column of about 220px), so no lane is ever hidden. Colours repeat across the 5 lane slots, so a lane is always identified by its branch name in the row, never colour alone.
- Branch list (permanent right column at 1000px and wider, slide-in drawer below that): search by branch or person, tier filter chips, open branches newest first with the first 8 shown and "Show N more", the person badge on every card, and merged branches collapsed behind one "Merged" header.
- People: "Committed by" chips filter history; the tip commit's author shows on each branch card.
- Not built yet: a lane cap with "show merged lanes", grouping open branches by person, a "Mine" filter, avatars with initials, paged history ("Load older commits").

## Kolam and life (reference: Gloss, not a copy)
- **Dot field**: a quiet staggered pulli dot field behind everything (`--dot`, 10% light / 7% dark). Cards are 90% opaque surfaces on top of it, so the field and the cursor web show faintly through.
- **Cursor web**: a spider web (11 spokes, 4 sagging rings, dew dots) spins itself around the pointer, eases after it, and fades about a second after the pointer rests. Canvas behind the cards; it draws no frames while faded out, and is off under Reduce Motion.
- **Rope rail**: two twisted strands under the header (a sine pair, never eye-shaped loops). Faint at rest; drawn in the accent while loading.
- **Rest**: the default branch's tip node breathes (5 s cycle). The spider blinks about every 6 s and tilts its head about every 9 s.
- **Wake**: hovering, scrolling or touching the graph quickens the breathing (3.6 s) for about 1.4 s. Hovering the header makes the spider wiggle its legs and tilt faster.
- **Work**: while loading, the rope draws itself and the spider scurries along it. The refresh icon holds still (no spinner).
- **Settle**: one ring leaves the tip node when new data lands, then back to Rest.
- Reduce Motion turns all of it off.

## Character: the spider
- Ink body, an accent hourglass mark, eight legs, two paper eyes; about 34px.
- Lives permanently on the rope rail in the top bar, as the crow does in Gloss. The logo is separate and is never replaced by the mascot.
- It is the screen's one character moment, so it does not appear in cards, the Person details screen, or empty states. The first-run welcome gets a small rope-and-pulli Kolam divider, not a second spider.

## Person details (drill-down)
A "Person details" button appears in the History header once someone is picked in "Committed by" (it reads "Details for N people" for several). It opens a full-screen view with a Back button and a tab per selected person.
- Free, from the loaded data: commits and merges, branches (each branch counts as one feature), open vs merged, unmerged and stale flags, collaborators, an activity chart, and per branch the full commit list with this person's commits in bold.
- On request only, each cached in memory for the session: pull requests (one paginated call; shows PR number, state and title on each branch; needs the token's "Pull requests: Read-only") and files changed (one call per commit, newest 20 per branch, shown as folders with file counts and added/removed lines).
- Anything that costs an API call states its cost on the button before it runs.

## Rules
- Evolve, don't replace: logic and data model are untouched; only tokens, layout and components change.
- Plain copy, at most 2 inline lines; longer text behind an info button.
- Exact values on tap; abbreviated figures are never the only form.

## Feedback log
- 2026-11-02: Chose Option A over B (web layout) from the canvas.
- 2026-11-02: In Option A a lane dot overflowed outside its card. Rule: nothing may overflow its card; size the lane graph to the widest lane plus dot radius and halo, and clip it.
