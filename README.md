# Dhama Works Git Platform

A self-contained, single-file HTML tool that pulls a **GitHub** or **Azure DevOps** repo's branches and commit history live, using a personal access token you supply, and draws it as a branch map: a lane graph of commits, per-branch staleness and merge status, and a history panel you can filter and drill into.

## Quick start

1. Open `index.html` in a desktop browser (double-click it). No build step, no server.
2. Click the gear icon to open **Settings**, then pick **GitHub** or **Azure DevOps** at the top. Only that service's settings show.
3. Add a token and a repo:

   | | GitHub | Azure DevOps |
   | --- | --- | --- |
   | **Token** | Fine-grained token with **Contents: Read-only** on the repos you add | Personal access token with **Code: Read** |
   | **Repo** | Type `owner/repo`, or use **Browse my GitHub repos** | Paste the repo's address from your browser, e.g. `https://dev.azure.com/org/project/_git/repo` |
   | **Token box** | One box at the top | One box per server, appearing after you add a repo |

4. Close Settings. The map loads. You can track GitHub and Azure DevOps repos side by side and switch between them with the picker at the top.

Your tokens and repos are stored only in that browser's `localStorage`. Nothing is sent anywhere except directly to GitHub's API or to your Azure DevOps server.

A GitHub token with **Pull requests: Read-only** (Azure DevOps: **Code: Read**, which covers pull requests) unlocks the two features below. Without it the map still loads from branches alone.

## Not in main yet, and loading only what is new

- **Not in main yet.** The button above the graph answers "what have we merged into the team's branch that has not reached the default branch?", and its number tells you without opening it. The list is grouped by pull request (with the commits inside each, anything committed directly, and merge/sync commits kept apart). By default it is the center branch going into the repo default, or the branch pull requests go to when those are the same. It warns when the other branch has commits yours lacks (a hotfix). *Copy as release notes* puts a plain list on the clipboard. It reads only what is already loaded.
- **Loading only what is new.** Downloaded commits are kept per repo in the browser (IndexedDB). A refresh asks only about branches that moved, so a repo that has not changed costs no commit requests, and one new commit costs one. Commits no branch can reach any more (after a force-push or a deleted branch) are dropped. Shift-click Refresh to forget them and download everything again.
- **History limit.** The *History* menu loads only the last 30 days, 90 days, 6 or 12 months. It is faster on big repositories. Branches whose last commit is older still appear, but their commit counts only cover what is loaded. Choosing *all* again fetches the older history.

## When branches are deleted, or pull requests go to a non-default branch

Pull requests remember things the branch list forgets, so the map reads the 200 most recently updated ones on every load.

- **Deleted after merge.** A branch deleted after its pull request merged is rebuilt from that pull request (its name and last commit) and listed under *Deleted after merge*. Its commits appear in the graph with a dashed tag. Up to the 50 newest are shown.
- **Where pull requests land.** If people raise pull requests against a branch other than the default (`develop`, `release/x`), that branch is pinned at the top of the list with its open, merged and closed counts, and its tag is filled in the graph.
- **Center on.** The graph is drawn around one branch: its line runs down the left, and "merged" and "ahead" are counted from it. It is the default branch unless most pull requests target another live branch, in which case that one is picked for you and the header says so. Override it with the *Center on* menu above the graph (the *Highlight* menu next to it only fades commits off a branch). The choice is remembered per repo. Nothing is tied to a branch name.
- **Squash and rebase merges.** The merge commit gets its pull request's last commit as a second parent, so the line from the branch is drawn and the branch counts as merged. It stays visible in the condensed view, so a squash workflow still shows one step per pull request.
- **Azure DevOps parent links.** Azure's commit list carries no parent ids, so the first load asks for each commit's parents (six at a time, retried if a request fails, "Linking commits..." in the loading text). They are remembered in the browser, so later loads only ask about new commits. A merge's second parent the list left out becomes a placeholder named after its branch (or "incoming branch").

## Features

- Live branch and commit graph ("branches only" or "all commits")
- Per-branch tier (active, recent, aging, stale) and cleanup recommendations
- Branch list with search, filters and a collapsed Merged group, sized for teams of 20 to 30
- "Committed by" filter that dims the rows and the graph
- Person details: pick someone in "Committed by", then open a full-screen view of their branches, collaborators and activity, and (on request) pull requests and files changed
- Expandable commit descriptions in the history panel and the branch-focus popup
- Light and dark modes: the button next to the gear in the header cycles Match my computer (the default), Light and Dark, and remembers your choice
- Works offline once a repo has been fetched, until you refresh

## Azure DevOps

Works with Azure DevOps Services (`dev.azure.com`, `*.visualstudio.com`) and Azure DevOps Server 2020 or newer (the app calls API version 6.0).

- **Person details:** pull requests are Azure's own, matched to branches by name. Files changed are listed per commit, but Azure doesn't report line counts, so added and removed show a dash.
- **Limits:** "Browse my repos" is GitHub only. Up to 1000 branches per repo.

### Sign in with Microsoft (no token to paste)

For Azure DevOps cloud (`dev.azure.com`, `*.visualstudio.com`) when your organisation blocks the **Code** scope on personal access tokens. The local helper gets a Microsoft Entra ID token for you through Az PowerShell. No app registration, no client id.

1. **Install Az.Accounts once** (PowerShell 7 `pwsh`, or Windows PowerShell on Windows): `Install-Module Az.Accounts -Scope CurrentUser`
2. **Start the helper** (`node serve.js`, see below) and open http://localhost:8765. Restart it if it was already running before this feature existed.
3. **Add your repo**, then in Settings, Azure DevOps press **Sign in with Microsoft** above that server's token box. A Microsoft page may open in your browser. After it, the box fills in and shows "Signed in as ...".

**Renewal.** The token lasts about an hour. While the helper is running, the app asks it for a new one in the background when under 5 minutes are left, reusing your saved Az sign-in without a window. If that ever fails, press the button again.

**What is stored where.** The token goes in the same per-server box in this browser's `localStorage` (`ghp_azure_tokens`). A second entry, `ghp_azure_signin`, records only its expiry, to tell sign-in tokens from pasted ones. Typing in the box yourself turns renewal off for that server. Az PowerShell keeps its own sign-in in your user profile; `Disconnect-AzAccount` removes it.

On-premises servers and GitHub are not affected: paste a token as before.

### Token not accepted?

Prefer not to paste tokens? See "Sign in with Microsoft" above, which also works when your organisation blocks the Code scope.

If you see "Azure DevOps did not accept the token" (and you are not using Microsoft sign-in), open Settings, Azure DevOps and press **Test** next to that server's token. It asks the server who the token signs in as, then tells you what the server actually answered and what to check. The usual causes:

- **Token created in a different organisation** (cloud). Create it in the same organisation as the repo, with Organization set to that organisation or "All accessible organizations", and the scope **Code: Read**. Check it hasn't expired.
- **Windows sign-in only** (some on-premises servers). The server asks for Kerberos or NTLM and doesn't offer token sign-in. Ask your admin whether personal access tokens are turned on.
- **Your organisation blocks personal access tokens.** An admin can allow them.

To check a token outside the app, run this (it asks for the token without saving it in your shell history; replace `YOUR-ORG`):

```bash
read -s PAT; curl -s -o /dev/null -w "%{http_code}\n" -u ":$PAT" "https://dev.azure.com/YOUR-ORG/_apis/git/repositories?api-version=6.0"
```

`200` means the token is fine. `203` or `401` means the server is rejecting it, so the cause is on the token or server side. For an on-premises server, use `https://YOUR-SERVER/YOUR-COLLECTION/_apis/git/repositories?api-version=6.0`.

### Manual Microsoft Entra token

The button above does this for you. By hand, in PowerShell: `Connect-AzAccount`, then `(Get-AzAccessToken -ResourceUrl 499b84ac-1321-427f-aa17-267ca6975798).Token` (on newer Az versions the token is a SecureString; convert it first). Paste the result into the token box. It expires after about an hour.

### Blocked by your browser (CORS)? Use the local helper

Some Azure DevOps servers, often on-premises ones, don't send the headers a browser needs before it lets a page call them. You'll see "the browser may have blocked the request (CORS)". You don't need your admin to change anything: run the optional helper that lives next to `index.html`.

1. **Check Node is installed** (version 18 or newer): `node --version`. Nothing else to install.
2. **Start the helper** in this folder:
   ```bash
   node serve.js
   ```
   For an on-premises server, name it so the helper may talk to it:
   ```bash
   node serve.js --allow your-server.corp.local
   ```
   (The cloud addresses `dev.azure.com` and `*.visualstudio.com` are allowed by default.)
3. **Open http://localhost:8765** in your browser. Not the file.
4. **Add your repo and token again** in Settings, Azure DevOps. Browser storage is separate for each address, so what you saved when opening the file won't appear here. It's kept at this address from now on.
5. Leave the terminal open while you work. Press Ctrl+C to stop the helper.

Settings shows "Running through the local helper" when it's active. GitHub repos work as before and never go through it.

**If something goes wrong**

| You see | Do this |
| --- | --- |
| "The helper isn't set up to call …" | Restart with the flag it shows: `node serve.js --allow that-host` |
| "…certificate this computer's Node doesn't trust" | Start with your company's certificate authority file: `NODE_EXTRA_CA_CERTS=/path/to/ca.pem node serve.js`. As a last resort, `--insecure` skips certificate checks (less safe). |
| "Couldn't reach the local helper" | It stopped. Start `node serve.js` again. |
| "Az PowerShell is not installed" | Run `Install-Module Az.Accounts -Scope CurrentUser` in PowerShell, then press the button again. If it says PowerShell itself is missing, install PowerShell 7 (`pwsh`). |
| "The running helper is older and has no Microsoft sign-in" | Stop it with Ctrl+C and start `node serve.js` again. |
| "Your Microsoft sign-in has ended" | Open Settings, Azure DevOps and press **Sign in with Microsoft**. It happens when the helper was stopped for over an hour or the Az sign-in expired. |
| "Port 8765 is already in use" | `node serve.js --port 8766`, then open that port instead. |
| "…did not accept the token" | Press **Test** next to the token in Settings, or see "Token not accepted?" above. |
| Can't reach the server at all | Check the address, your network or VPN. If your network needs a corporate web proxy, Node won't use it automatically. |

**Safe by design:** it listens on `127.0.0.1` only; forwards only read-only GET requests, only to hosts you allow, and only for the page it serves itself (other websites and odd Host headers are refused); never adds or stores your token (the page sends it); and logs only the method and path. Microsoft sign-in is a POST accepted only from that same page and only for cloud hosts; the helper hands the token back to that page only and never logs or stores it.

### Removing Azure DevOps support

If Azure DevOps doesn't work for you:

1. **Switch it off (one line).** In `index.html`, near the top of the first `<script>`, change `const FEATURES = { azure: true };` to `{ azure: false }`. The Azure tab, Azure repos and token boxes disappear. Nothing saved is deleted, so setting it back to `true` restores everything.
2. **Remove the code.** Azure support went in as one commit, the helper as a second and the Settings toggle as a third. Revert newest first: find them with `git log --grep "Azure DevOps support"`, `git log --grep "Local helper"` and `git log --grep "Settings toggle"`, then `git revert <commit>` for each. If a revert conflicts, use option 1 instead, or search `index.html` for `AZURE-SUPPORT` and remove the pieces by hand.
3. **Just the helper:** delete `serve.js`. The app works without it.

Saved Azure tokens stay in your browser until you clear them. To wipe them, run `localStorage.removeItem('ghp_azure_tokens')` in the browser console on that page.

## Known limitation

Because it relies on the browser's own `fetch()`, this doesn't work as a downloaded file on iOS (Safari and Chrome there won't run local HTML with network access). Desktop browsers work fine.
