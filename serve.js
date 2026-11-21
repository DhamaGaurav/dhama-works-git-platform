#!/usr/bin/env node
// Optional local helper for the Dhama Works Git Platform (AZURE-SUPPORT).
//
// Why: browsers block a web page from calling a server that doesn't send
// CORS headers (many on-premises Azure DevOps servers don't). This tiny
// server runs on your own computer, serves index.html from here, and passes
// the page's Azure DevOps requests on to the server. The page and the helper
// share one origin, so the browser has nothing to block.
//
// Run it (Node 18 or newer, no installs):
//   node serve.js                         cloud (dev.azure.com, *.visualstudio.com)
//   node serve.js --allow tfs.corp.local  also allow an on-premises server
// then open http://localhost:8765 (not the file). Options:
//   --allow host[,host]   extra server hostnames it may forward to (repeatable; "*.corp.local" works)
//   --port 8765           port to listen on
//   --insecure            don't verify the server's TLS certificate (internal CA); prefer
//                         NODE_EXTRA_CA_CERTS=/path/to/ca.pem node serve.js ...
//
// Sign in with Microsoft (Azure DevOps cloud only): the page's button posts to
// /_auth/azure and this helper asks Az PowerShell for a Microsoft Entra ID token
// for Azure DevOps. Needs PowerShell (pwsh, or powershell.exe on Windows) and
//   Install-Module Az.Accounts -Scope CurrentUser
// It reuses a saved Az sign-in silently and opens a browser sign-in only when asked.
//
// Safety: listens on 127.0.0.1 only; forwards only GET requests, only to hosts
// you allow, only when asked by the page it serves (same origin); never adds or
// stores credentials (the page sends the token itself); logs method and path
// only, never the token. Sign-in accepts only POST from that same page, only for
// cloud hosts; the tenant and mode reach PowerShell as environment variables,
// never inside the script; the token goes back only to the asking page and is
// never logged. Delete this file to remove the helper.
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if(args.includes('--help') || args.includes('-h')){
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 31).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i+1] ? args[i+1] : def; };
const port = Number(opt('--port', process.env.PORT || 8765));
const insecure = args.includes('--insecure');
const allow = ['dev.azure.com', '*.visualstudio.com']
  .concat(args.flatMap((a, i) => a === '--allow' ? String(args[i+1] || '').split(',') : []))
  .map(s => s.trim().toLowerCase()).filter(Boolean);
const hostAllowed = h => allow.some(p => p.startsWith('*.') ? h.endsWith(p.slice(1)) : h === p);

function fail(res, status, message){
  res.writeHead(status, { 'Content-Type': 'application/json', 'X-Helper-Error': '1', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ error: message }));
}
function explain(e, host){
  const c = e && e.code;
  if(c === 'ENOTFOUND') return `Couldn't find the server "${host}". Check the address and your network or VPN.`;
  if(c === 'ECONNREFUSED') return `"${host}" refused the connection. Check the address, port and that the server is up.`;
  if(c === 'ECONNRESET' || c === 'ETIMEDOUT' || /timed out/i.test(e.message)) return `The connection to "${host}" timed out or was dropped. Check your network or VPN.`;
  if(/CERT|SELF_SIGNED|UNABLE_TO_VERIFY/i.test(c || '')) return `"${host}" uses a certificate this computer's Node doesn't trust (${c}). Restart the helper with NODE_EXTRA_CA_CERTS=/path/to/your-ca.pem, or with --insecure if you accept the risk.`;
  return `The helper couldn't reach "${host}": ${e.message}`;
}

// Only the page this helper serves may use it. Returns true (and answers 403) for anything else.
// needOrigin: also refuse a request that carries no Origin header (used for sign-in).
function refuseOtherSites(req, res, needOrigin){
  const site = req.headers['sec-fetch-site'];
  if(site && site !== 'same-origin'){ fail(res, 403, 'Refused: the request did not come from the helper\'s own page.'); return true; }
  const origin = req.headers.origin, own = 'http://' + req.headers.host;
  if(needOrigin ? origin !== own : (origin && origin !== own)){ fail(res, 403, 'Refused: unexpected origin.'); return true; }
  return false;
}

function proxy(req, res, url){
  if(req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'The helper only forwards read-only (GET) requests.');
  if(refuseOtherSites(req, res)) return;
  // /_az/<scheme>/<host[:port]>/<path>
  const m = url.pathname.match(/^\/_az\/(https?)\/([^/]+)(\/.*)?$/);
  if(!m) return fail(res, 400, 'Bad helper path.');
  let target;
  try{ target = new URL(`${m[1]}://${m[2]}${m[3] || '/'}${url.search}`); }catch(e){ return fail(res, 400, 'Bad server address.'); }
  if(target.username || target.password) return fail(res, 400, 'Credentials in the address are not allowed.');
  const host = target.hostname.toLowerCase();
  if(!hostAllowed(host)) return fail(res, 403, `The helper isn't set up to call "${host}". Restart it with: node serve.js --allow ${host}`);

  const headers = { 'User-Agent': 'dhama-works-git-platform-helper', 'Accept': req.headers.accept || 'application/json' };
  if(req.headers.authorization) headers.Authorization = req.headers.authorization;
  const lib = m[1] === 'https' ? https : http;
  console.log(`${req.method} ${host}${target.pathname}`);
  const tail = target.pathname.split('/').slice(-2).join('/');
  const up = lib.request({
    protocol: target.protocol, hostname: target.hostname, port: target.port || undefined,
    path: target.pathname + target.search, method: req.method, headers,
    rejectUnauthorized: !insecure, timeout: 60000,
  }, ures => {
    console.log(`  -> ${ures.statusCode} (${tail})`);
    // A rejected token often redirects to a sign-in page; the browser would follow it cross-origin. Report it plainly instead.
    if(ures.statusCode >= 300 && ures.statusCode < 400){ ures.resume(); return fail(res, 401, 'The server redirected to a sign-in page, so it did not accept the token.'); }
    const out = { 'Cache-Control': 'no-store' };
    ['content-type', 'x-ms-continuationtoken', 'www-authenticate'].forEach(h => { if(ures.headers[h]) out[h] = ures.headers[h]; });
    res.writeHead(ures.statusCode, out);
    ures.pipe(res);
  });
  up.on('timeout', () => up.destroy(new Error('timed out')));
  up.on('error', e => { console.log(`  -> failed (${tail}): ${explain(e, host)}`); if(!res.headersSent) fail(res, 502, explain(e, host)); else res.destroy(); });
  up.end();
}

// ---- Sign in with Microsoft: Az PowerShell hands back an Entra ID token for Azure DevOps ----
const MARK = '@@DWAUTH@@'; // prefix of the one JSON line the script prints, so it can be found among other output
const AUTH_SCRIPT = `
$ErrorActionPreference = 'Stop'; $WarningPreference = 'SilentlyContinue'; $ProgressPreference = 'SilentlyContinue'
function Done($o){ Write-Output ('${MARK}' + ($o | ConvertTo-Json -Compress)); exit 0 }
$tenant = $env:DW_TENANT; $interactive = ($env:DW_INTERACTIVE -eq '1')
try { Import-Module Az.Accounts } catch { Done @{ code = 'NO_MODULE' } }
function Get-Tok {
  $a = @{ ResourceUrl = '499b84ac-1321-427f-aa17-267ca6975798' }
  if($tenant){ $a.TenantId = $tenant }
  $t = Get-AzAccessToken @a
  $tok = $t.Token
  if($tok -is [System.Security.SecureString]){ $tok = [System.Net.NetworkCredential]::new('', $tok).Password }
  @{ token = $tok; expiresOn = ([DateTimeOffset]$t.ExpiresOn).UtcDateTime.ToString('o') }
}
try { Done (Get-Tok) } catch { if(-not $interactive){ Done @{ code = 'NEEDS_SIGNIN' } } }
try {
  Update-AzConfig -LoginExperienceV2 Off -Scope Process | Out-Null
  Update-AzConfig -EnableLoginByWam $false -Scope Process | Out-Null
  $c = @{}; if($tenant){ $c.TenantId = $tenant }
  Connect-AzAccount @c | Out-Null
  Done (Get-Tok)
} catch { Done @{ code = 'SIGNIN_FAILED'; message = ([string]$_.Exception.Message -split "\`n")[0] } }
`;
const AUTH_ERRORS = {
  NO_MODULE: () => 'Az PowerShell is not installed. Run: Install-Module Az.Accounts -Scope CurrentUser',
  NEEDS_SIGNIN: () => 'Not signed in to Microsoft yet. Press "Sign in with Microsoft".',
  SIGNIN_FAILED: m => 'Microsoft sign-in failed' + (m ? ': ' + m : '.'),
};
const authRuns = new Map(); // tenant + mode -> promise of the run in progress

function readJson(req, max){
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if(size > max) reject(Object.assign(new Error('too big'), { status: 413 })); else chunks.push(c); });
    req.on('end', () => { try{ resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }catch(e){ reject(Object.assign(new Error('bad json'), { status: 400 })); } });
    req.on('error', reject);
  });
}
// The server names its tenant in a header on any anonymous answer. Only a GUID is accepted.
async function findTenant(base){
  try{
    const r = await fetch(base + '/_apis/connectionData', { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } });
    const t = r.headers.get('x-vss-resourcetenant') || '';
    return /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(t) ? t : '';
  }catch(e){ return ''; }
}
function runPowerShell(tenant, interactive){
  return new Promise(resolve => {
    const exe = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
    const encoded = Buffer.from(AUTH_SCRIPT, 'utf16le').toString('base64');
    let out = '', done = false, child, timer;
    const finish = r => { if(!done){ done = true; clearTimeout(timer); resolve(r); } };
    try{
      child = require('child_process').spawn(exe, ['-NoProfile', '-NoLogo', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
        stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
        env: Object.assign({}, process.env, { DW_TENANT: tenant, DW_INTERACTIVE: interactive ? '1' : '0' }),
      });
    }catch(e){ return finish({ status: 502, error: 'Couldn\'t start PowerShell (' + exe + '). Install PowerShell, then try again.' }); }
    timer = setTimeout(() => { child.kill(); finish({ status: 502, error: interactive ? 'Microsoft sign-in took too long (5 minutes). Try again.' : 'PowerShell took too long to answer. Try again.' }); }, interactive ? 300000 : 90000);
    child.stdout.on('data', d => { out += d; });
    child.on('error', e => finish({ status: 502, error: e.code === 'ENOENT' ? 'PowerShell (' + exe + ') is not installed on this computer.' : 'Couldn\'t run PowerShell: ' + e.message }));
    child.on('close', () => {
      const line = out.split(/\r?\n/).find(l => l.startsWith(MARK));
      let j; try{ j = JSON.parse(line.slice(MARK.length)); }catch(e){ return finish({ status: 502, error: 'PowerShell gave no usable answer.' }); }
      if(j.token) return finish({ status: 200, body: { token: j.token, expiresOn: j.expiresOn } });
      finish({ status: 401, code: j.code, error: (AUTH_ERRORS[j.code] || (() => 'Sign-in failed.'))(j.message) });
    });
  });
}
async function authAzure(req, res){
  if(req.method !== 'POST'){ res.setHeader('Allow', 'POST'); return fail(res, 405, 'Use POST.'); }
  if(refuseOtherSites(req, res, true)) return;
  let body, base;
  try{ body = await readJson(req, 2048); }catch(e){
    if(e.status === 413) res.once('finish', () => req.destroy()); // stop reading an oversized body once the answer is out
    return fail(res, e.status || 400, e.status === 413 ? 'Request too large.' : 'Bad request.');
  }
  try{ const u = new URL(String(body && body.base)); if(u.protocol === 'https:' && !u.username && !u.password && (u.hostname === 'dev.azure.com' || u.hostname.endsWith('.visualstudio.com'))) base = u.origin + u.pathname.replace(/\/+$/, ''); }catch(e){}
  if(!base) return fail(res, 400, 'For an on-premises server, paste a token.');
  const interactive = !!(body && body.interactive), host = new URL(base).hostname;
  console.log(`POST /_auth/azure ${host} (${interactive ? 'may open sign-in' : 'silent'})`);
  const tenant = await findTenant(base), key = tenant + '|' + interactive;
  if(!authRuns.has(key)) authRuns.set(key, runPowerShell(tenant, interactive).finally(() => authRuns.delete(key)));
  const r = await authRuns.get(key);
  res.writeHead(r.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  if(r.status === 200){ console.log(`  -> token issued, expires ${r.body.expiresOn}`); return res.end(JSON.stringify(r.body)); }
  console.log(`  -> ${r.code || 'helper problem'}`);
  res.end(JSON.stringify({ error: r.error, code: r.code }));
}

const server = http.createServer((req, res) => {
  // refuse anything not addressed to localhost (guards against DNS rebinding)
  const hostName = String(req.headers.host || '').replace(/:\d+$/, '').toLowerCase();
  if(hostName !== 'localhost' && hostName !== '127.0.0.1') return fail(res, 403, 'Unexpected Host header.');
  const url = new URL(req.url, 'http://localhost');
  if(url.pathname === '/' || url.pathname === '/index.html'){
    if(req.method !== 'GET' && req.method !== 'HEAD'){ res.writeHead(405); return res.end(); }
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, html) => {
      if(err){ res.writeHead(500); return res.end('index.html not found next to serve.js'); }
      // tell the page it is running through the helper (the only change to the file)
      html = html.replace('<script>', () => '<script>window.__HELPER = true;</script>\n<script>');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
    });
    return;
  }
  if(url.pathname.startsWith('/_az/')) return proxy(req, res, url);
  if(url.pathname === '/_auth/azure') return authAzure(req, res);
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});
server.on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? `Port ${port} is already in use. Try: node serve.js --port ${port + 1}` : e.message);
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Dhama Works Git Platform helper running.\n  Open:    http://localhost:${port}\n  Allowed: ${allow.join(', ')}${insecure ? '\n  WARNING: TLS certificate checks are OFF (--insecure).' : ''}\n  Stop with Ctrl+C.`);
});
