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

### If your browser blocks Azure DevOps (CORS): the local helper

Some Azure DevOps servers (often on-premises ones) don't send the headers a browser needs before it lets a web page call them, so you see "the browser may have blocked the request (CORS)". You don't need your admin to change anything: run the optional helper in this folder.

```bash
node serve.js --allow your-server.corp.local
```

Then open **http://localhost:8765** (not the file) and use the app as normal. The helper serves `index.html` from your computer and passes the page's Azure DevOps requests on to your server, so the browser has nothing to block. Needs Node 18 or newer; nothing to install.

- `--allow host` lists the servers it may talk to (repeat it, or comma-separate; `*.corp.local` works). `dev.azure.com` and `*.visualstudio.com` are allowed by default. If a host isn't allowed, the app tells you the exact flag to add.
- `--port 8765` changes the port. If your server uses an internal certificate authority, start it with `NODE_EXTRA_CA_CERTS=/path/to/ca.pem node serve.js ...` (or `--insecure` to skip certificate checks, which is less safe).
- **Your settings don't carry over:** browser storage is per address, so tokens and repos saved when you opened the file directly won't appear at `localhost:8765`. Add them again once there; they stay in that address's storage.
- **Safe by design:** it listens on `127.0.0.1` only; forwards only read-only GET requests, only to hosts you allow, only for the page it serves itself (other sites and odd Host headers are refused); never adds or stores your token (the page sends it); and logs method and path only. If your network needs a corporate web proxy to reach the server, Node won't use it automatically.
- GitHub repos keep working as before; they never go through the helper.

### Removing Azure DevOps support

If Azure DevOps doesn't work for you, there are two ways out.

1. **Switch it off (one line).** In `index.html`, near the top of the first `<script>`, change `const FEATURES = { azure: true };` to `{ azure: false }`. Azure repos and the Azure token boxes disappear and the paste-a-URL option is refused. Nothing saved is deleted, so setting it back to `true` restores everything.
2. **Remove the code.** It all went in as one commit, so it reverts cleanly: find it with `git log --grep "Azure DevOps support"` and run `git revert <that commit>`. To find the pieces by hand instead, search for `AZURE-SUPPORT` in `index.html`.

The local helper (`serve.js`) can be deleted on its own; the app works without it. Either way, saved Azure tokens stay in your browser until you clear them. To wipe them, run `localStorage.removeItem('ghp_azure_tokens')` in the browser console on this page.

## Known limitation

Because it relies on the browser's own `fetch()`, this doesn't work as a
downloaded file on iOS (Safari/Chrome there won't run local HTML with
network access). Desktop browsers work fine.
