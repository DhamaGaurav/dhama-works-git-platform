# Dhama Works Git Platform: DESIGN.md

App guideline under the Dhama Works Design Bible (Core). Chosen direction: **Option A, Lanes and History** (canvas: https://claude.ai/artifact/4nXKekga8Na3PRELW2VwSP).

## Philosophy
Calm, clear, alive. Never a cluttered dev terminal, never a corporate dashboard.
Creature: the spider on its web. Personality: patient, connected, watchful. Used as motif only (the logo mark, a faint web behind the graph, the breathing main-tip node). No mascot on any screen.

## Colour
Brand layer: ground `#FBF5EC` (dark `#17120F`), ink `#231E1A` (dark `#F3EADF`), accent indigo `#5B4FD6` (dark `#9C93F2`).
Functional layer:
- Lanes (data series, fixed order, a new branch takes the next free slot): `#5B4FD6`, `#B3389F`, `#E0532F`, `#1E8FA8`, `#C38611`. Dark: `#9C93F2`, `#DB78C9`, `#F07F5E`, `#5CC0D8`, `#E4B04A`.
- Status (never a lane): good `#287954`, recent `#1B7489`, warn `#975B0D`, crit `#B83729` (dark: `#5BC18F`, `#5CC0D8`, `#E8A94A`, `#F0806F`).
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
- **Cursor web**: a small, sparse web (8 spokes, 3 rings out to about 104px, about 24 anchors; strands about 30% opacity) spun from the pointer to the backdrop's own Kolam dots (the two staggered lattices the CSS paints), with ring threads sagging between neighbouring anchors and dew on each anchored dot. It reaches out toward where the pointer is heading (up to 1.45x ahead) and the strands behind pull in and retract into their dots (down to 0.55x, or dropped when moving fast). A strand keeps its dot until the pointer drags it more than 36px from its ideal spot. It fully collapses about 1.2 s after the pointer rests, draws no frames once collapsed, and is off under Reduce Motion.
- **Layers**: layer 0 is the Kolam backdrop and the web; layer 1 is the cards (90% opaque, so the web shows only as a faint trace through them); layer 2 is popups, the branch drawer and Person details. While any layer-2 surface is open the web canvas fades to 25%, on top of the dim the popup already puts over the page.
- **Rope rail**: two twisted strands under the header (a sine pair, never eye-shaped loops). Faint at rest; drawn in the accent while loading.
- **Rest**: the default branch's tip node breathes (5 s cycle). The spider blinks about every 6 s and tilts its head about every 9 s.
- **Wake**: hovering, scrolling or touching the graph quickens the breathing (3.6 s) for about 1.4 s. Hovering the controls makes the spider wiggle its legs and tilt faster.
- **Work**: while loading, the rope draws itself and the spider paces back and forth across the refresh button. The refresh icon holds still (no spinner).
- **Settle**: one ring leaves the tip node when new data lands, then back to Rest.
- Reduce Motion turns all of it off.

## Character: the spider
- Ink body, an accent hourglass mark, eight legs, two paper eyes; about 34px.
- Lives permanently in the top bar, perched on the top edge of the refresh button (its Work state is the refresh), as the crow lives in Gloss's top bar. The logo is separate and is never replaced by the mascot.
- It is the screen's one character moment, so it does not appear in cards, the Person details screen, or empty states. The first-run welcome gets a small rope-and-pulli Kolam divider, not a second spider.

## Person details (drill-down)
A "Person details" button appears in the empty gap of the History header (between the title and the Branches only / All commits toggle) once someone is picked in "Committed by" (it reads "Details for N people" for several). It opens a full-screen view with a Back button and a tab per selected person.
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
- 2026-11-02: Spider under the header subtitle (left, on the rope) was rejected; moved to the refresh button, top right. Web must expand toward pointer movement, collapse behind it, and stick to the backdrop's Kolam dots.
- 2026-11-02: The web hid details over content, so it is masked faint over cards. The Person details button must appear in empty space without moving any existing button, filter or card: it is positioned out of flow in the header gap (checked: zero elements move).
- 2026-11-02: The web was still too prominent. Made it smaller and sparser, moved it back to the bottom layer behind the cards, and added the extra fade under layer-2 surfaces.
- 2026-11-02: Azure DevOps support added without changing the look. Provider is invisible in the UI apart from the repo label, the footer ("Live from Azure DevOps") and dashes where Azure reports no line counts.
- 2026-11-02: Settings simplified with a GitHub / Azure DevOps toggle (segmented control, counts on each tab). Only the chosen service's fields show: GitHub = token + repos + browse; Azure DevOps = add by address + repos + one token box per server + helper note. The last tab used is remembered; with nothing remembered it opens on the service of the repo on screen. Hidden entirely when FEATURES.azure is off.
- 2026-11-06: Theme switch added (header button next to Settings: System, then Light, then Dark; saved in `ghp_theme`; applied before first paint so nothing flashes). System, the default, follows the computer. Both palettes already existed; audited every pair the app uses for AA (4.5:1 text, 3:1 lane lines). Fixes: new `--on-accent` token (white on the light accent, near-black on the lighter dark accent, because white on the dark accent failed), and light status colours darkened a touch (good `#287954`, recent `#1B7489`, warn `#975B0D`, crit `#B83729`) plus lane 5 (`#C38611`). Rule: any new colour pair gets checked in both modes.
