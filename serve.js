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
// Safety: listens on 127.0.0.1 only; forwards only GET requests, only to hosts
// you allow, only when asked by the page it serves (same origin); never adds or
// stores credentials (the page sends the token itself); logs method and path
// only, never the token. Delete this file to remove the helper.
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if(args.includes('--help') || args.includes('-h')){
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 22).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
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

function proxy(req, res, url){
  if(req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'The helper only forwards read-only (GET) requests.');
  // only the page this helper serves may use it: refuse requests from other sites
  const site = req.headers['sec-fetch-site'];
  if(site && site !== 'same-origin') return fail(res, 403, 'Refused: the request did not come from the helper\'s own page.');
  if(req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) return fail(res, 403, 'Refused: unexpected origin.');
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
  const up = lib.request({
    protocol: target.protocol, hostname: target.hostname, port: target.port || undefined,
    path: target.pathname + target.search, method: req.method, headers,
    rejectUnauthorized: !insecure, timeout: 60000,
  }, ures => {
    // A rejected token often redirects to a sign-in page; the browser would follow it cross-origin. Report it plainly instead.
    if(ures.statusCode >= 300 && ures.statusCode < 400){ ures.resume(); return fail(res, 401, 'The server redirected to a sign-in page, so it did not accept the token.'); }
    const out = { 'Cache-Control': 'no-store' };
    ['content-type', 'x-ms-continuationtoken'].forEach(h => { if(ures.headers[h]) out[h] = ures.headers[h]; });
    res.writeHead(ures.statusCode, out);
    ures.pipe(res);
  });
  up.on('timeout', () => up.destroy(new Error('timed out')));
  up.on('error', e => { if(!res.headersSent) fail(res, 502, explain(e, host)); else res.destroy(); });
  up.end();
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
