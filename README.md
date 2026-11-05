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

Optional: a GitHub token with **Pull requests: Read-only** adds pull request titles in Person details; everything works without it.

## Features

- Live branch and commit graph ("branches only" or "all commits")
- Per-branch tier (active, recent, aging, stale) and cleanup recommendations
- Branch list with search, filters and a collapsed Merged group, sized for teams of 20 to 30
- "Committed by" filter that dims the rows and the graph
- Person details: pick someone in "Committed by", then open a full-screen view of their branches, collaborators and activity, and (on request) pull requests and files changed
- Expandable commit descriptions in the history panel and the branch-focus popup
- Works offline once a repo has been fetched, until you refresh

## Azure DevOps

Works with Azure DevOps Services (`dev.azure.com`, `*.visualstudio.com`) and Azure DevOps Server 2020 or newer (the app calls API version 6.0).

- **Person details:** pull requests are Azure's own, matched to branches by name. Files changed are listed per commit, but Azure doesn't report line counts, so added and removed show a dash.
- **Limits:** "Browse my repos" is GitHub only. Up to 1000 branches per repo.

### Token not accepted?

If you see "Azure DevOps did not accept the token", open Settings, Azure DevOps and press **Test** next to that server's token. It asks the server who the token signs in as, then tells you what the server actually answered and what to check. The usual causes:

- **Token created in a different organisation** (cloud). Create it in the same organisation as the repo, with Organization set to that organisation or "All accessible organizations", and the scope **Code: Read**. Check it hasn't expired.
- **Windows sign-in only** (some on-premises servers). The server asks for Kerberos or NTLM and doesn't offer token sign-in. Ask your admin whether personal access tokens are turned on.
- **Your organisation blocks personal access tokens.** An admin can allow them.

To check a token outside the app, run this (it asks for the token without saving it in your shell history; replace `YOUR-ORG`):

```bash
read -s PAT; curl -s -o /dev/null -w "%{http_code}\n" -u ":$PAT" "https://dev.azure.com/YOUR-ORG/_apis/git/repositories?api-version=6.0"
```

`200` means the token is fine. `203` or `401` means the server is rejecting it, so the cause is on the token or server side. For an on-premises server, use `https://YOUR-SERVER/YOUR-COLLECTION/_apis/git/repositories?api-version=6.0`.

### No Code scope on your token? Use a Microsoft Entra ID token

Some organisations block the **Code** scope on personal access tokens (the token's Scopes list shows things like Packaging but not Code, so the app connects yet every repo read fails with 401). If an admin can't enable it, you can sign in with your **Microsoft Entra ID** identity instead and paste the resulting access token into the same box. The app sends a token that looks like an Entra token (a JWT) as a Bearer credential automatically, and a personal access token as before.

Get a token with PowerShell (no admin rights needed; it installs into your user profile):

```powershell
Install-Module Az.Accounts -Scope CurrentUser -Force -AllowClobber
Connect-AzAccount -UseDeviceAuthentication    # prints a web address and a code; see below
$t = Get-AzAccessToken -ResourceUrl "499b84ac-1321-427f-aa17-267ca6975798"    # Azure DevOps' resource id
$ADO = if ($t.Token -is [System.Security.SecureString]) { [System.Net.NetworkCredential]::new('', $t.Token).Password } else { $t.Token }
Set-Clipboard -Value $ADO    # now paste it into Settings, Azure DevOps
```

**Signing in without the account picker window.** `-UseDeviceAuthentication` opens no window at all. PowerShell prints a line like "To sign in, use a web browser to open https://microsoft.com/devicelogin and enter the code ...". Open that address in your normal browser, type the code, sign in with your work account, and the PowerShell prompt carries on by itself. Use this if the window that plain `Connect-AzAccount` opens never appears (newer versions open a Windows account picker by default).

If you would rather get an ordinary browser tab than a code, turn the picker off once and use plain `Connect-AzAccount` after it:

```powershell
Update-AzConfig -EnableLoginByWam $false
Connect-AzAccount
```

If your account belongs to several directories, add `-Tenant YOUR-TENANT` to `Connect-AzAccount` (use the directory that owns your Azure DevOps organisation).

Prefer the Azure CLI? Sign in the same way and print a token:

```powershell
az login --use-device-code
az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv
```

Check it before pasting (replace `YOUR-ORG`); `200` means it works:

```powershell
curl.exe -s -o NUL -w "%{http_code}\n" -H "Authorization: Bearer $ADO" "https://dev.azure.com/YOUR-ORG/_apis/git/repositories?api-version=6.0"
```

**These tokens expire after about an hour.** When the map stops refreshing with a token error, run the `Get-AzAccessToken` and `Set-Clipboard` lines again and paste the new one. For a long-lived credential, ask an admin to allow the Code scope on personal access tokens instead.

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
| "Port 8765 is already in use" | `node serve.js --port 8766`, then open that port instead. |
| "…did not accept the token" | Press **Test** next to the token in Settings, or see "Token not accepted?" above. |
| Can't reach the server at all | Check the address, your network or VPN. If your network needs a corporate web proxy, Node won't use it automatically. |

**Safe by design:** it listens on `127.0.0.1` only; forwards only read-only GET requests, only to hosts you allow, and only for the page it serves itself (other websites and odd Host headers are refused); never adds or stores your token (the page sends it); and logs only the method and path.

### Removing Azure DevOps support

If Azure DevOps doesn't work for you:

1. **Switch it off (one line).** In `index.html`, near the top of the first `<script>`, change `const FEATURES = { azure: true };` to `{ azure: false }`. The Azure tab, Azure repos and token boxes disappear. Nothing saved is deleted, so setting it back to `true` restores everything.
2. **Remove the code.** Azure support went in as one commit, the helper as a second and the Settings toggle as a third. Revert newest first: find them with `git log --grep "Azure DevOps support"`, `git log --grep "Local helper"` and `git log --grep "Settings toggle"`, then `git revert <commit>` for each. If a revert conflicts, use option 1 instead, or search `index.html` for `AZURE-SUPPORT` and remove the pieces by hand.
3. **Just the helper:** delete `serve.js`. The app works without it.

Saved Azure tokens stay in your browser until you clear them. To wipe them, run `localStorage.removeItem('ghp_azure_tokens')` in the browser console on that page.

## Known limitation

Because it relies on the browser's own `fetch()`, this doesn't work as a downloaded file on iOS (Safari and Chrome there won't run local HTML with network access). Desktop browsers work fine.
