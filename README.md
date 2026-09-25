# Dhama Works Git Platform

A self-contained, single-file HTML tool that pulls a GitHub repo's branches
and commit history live (via the GitHub REST API, using a personal access
token you supply) and renders it as a branch map: lane graph of commits,
per-branch staleness/merge status, and a history panel you can filter and
drill into.

## Running it

Open `index.html` directly in a browser — no build step, no server. Your
GitHub token and tracked repos are stored only in that browser's
`localStorage`; nothing is sent anywhere except directly to the GitHub API.

Your fine-grained GitHub PAT needs, at minimum:
- **Repository access**: the repos you want to view
- **Repository permissions → Contents**: Read-only

## Features

- Live branch/commit graph (condensed "branches only" or "all commits" view)
- Per-branch tier (active/recent/aging/stale) and cleanup recommendations
- "Committed by" filter for the history panel
- Expandable commit descriptions (one open at a time), in both the history
  panel and the branch-focus popup
- "Browse my repos" picker so you don't have to type owner/repo by hand
- Works fully offline once a repo's data has been fetched, until you refresh

## Known limitation

Because it relies on the browser's own `fetch()`, this doesn't work as a
downloaded file on iOS (Safari/Chrome there won't run local HTML with
network access). Desktop browsers work fine.
