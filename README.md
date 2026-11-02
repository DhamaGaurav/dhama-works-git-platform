# Dhama Works Git Platform

A self-contained, single-file HTML tool that pulls a GitHub or Azure DevOps repo's branches
and commit history live (via the GitHub REST API, using a personal access
token you supply) and renders it as a branch map: lane graph of commits,
per-branch staleness/merge status, and a history panel you can filter and
drill into.

## Running it

Open `index.html` directly in a browser — no build step, no server. Your
GitHub token and tracked repos are stored only in that browser's
`localStorage`; nothing is sent anywhere except directly to the GitHub API
(or, for Azure DevOps repos, to your Azure DevOps server).

Your fine-grained GitHub PAT needs, at minimum:
- **Repository access**: the repos you want to view
- **Repository permissions → Contents**: Read-only
- Optional: **Pull requests**: Read-only, only if you want pull request titles in Person details (it works without)

## Features

- Live branch/commit graph (condensed "branches only" or "all commits" view)
- Per-branch tier (active/recent/aging/stale) and cleanup recommendations
- "Committed by" filter for the history panel
- Expandable commit descriptions (one open at a time), in both the history
  panel and the branch-focus popup
- Person details: pick someone in "Committed by", then open a full-screen view of their branches, collaborators, activity, and (on request) pull requests and files changed
- "Browse my repos" picker so you don't have to type owner/repo by hand
- Works fully offline once a repo's data has been fetched, until you refresh

## Azure DevOps

The same map works for Azure DevOps Services (`dev.azure.com`) and Azure DevOps Server (on-premises).

- **Add a repo:** in Settings, paste the repo's web address, e.g. `https://dev.azure.com/org/project/_git/repo` (or `https://server/tfs/Collection/project/_git/repo`). GitHub repos are still added as `owner/repo`; you can track both side by side.
- **Token:** a personal access token with **Code: Read**. One box appears in Settings per Azure DevOps server among your tracked repos, so cloud and on-premises each keep their own. Stored only in this browser and sent only to that server.
- **Person details:** pull requests come from Azure's own pull requests (matched to branches by name). Files changed are listed per commit, but Azure doesn't report line counts, so added/removed show a dash.
- **Needs:** Azure DevOps Services, or Azure DevOps Server 2020 or newer (the app calls API version 6.0).
- **Limits:** "Browse my repos" is GitHub only. Up to 1000 branches per repo. If the browser blocks the request (CORS), you'll see a message saying so; on-premises servers may need your admin to allow this page's origin.

## Known limitation

Because it relies on the browser's own `fetch()`, this doesn't work as a
downloaded file on iOS (Safari/Chrome there won't run local HTML with
network access). Desktop browsers work fine.
