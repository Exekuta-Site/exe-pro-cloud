'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error('Patch 3.5.1: trecho nao encontrado: ' + label);
  return source.replace(from, to);
}

const serverPath = path.join(root, 'server.js');
let server = fs.readFileSync(serverPath, 'utf8');

server = replaceRequired(server, "const VERSION = '3.5.0';", "const VERSION = '3.5.1';", 'server version');

server = replaceRequired(
  server,
  "    if(req.method==='GET'&&url.pathname==='/')return redirect(res,'/app/');\n    if(req.method==='GET'&&url.pathname==='/health')",
  "    if(req.method==='GET'&&url.pathname==='/')return serveWebFile(res,'index.html');\n    if(req.method==='GET'&&(url.pathname==='/app'||url.pathname==='/app/'))return redirect(res,'/');\n    if(req.method==='GET'&&['/manifest.webmanifest','/service-worker.js','/app-icon.svg'].includes(url.pathname))return serveWebFile(res,url.pathname.slice(1));\n    if(req.method==='GET'&&url.pathname==='/health')",
  'root route'
);

server = replaceRequired(
  server,
  "    if(req.method==='GET'&&(url.pathname==='/app'||url.pathname==='/app/'))return serveWebFile(res,'index.html');\n",
  "",
  'legacy app index route'
);

server = replaceRequired(server, "version:VERSION,webUrl:'/app/'", "version:VERSION,webUrl:'/'", 'api webUrl');
server = replaceRequired(server, "EXE PRO 3.5.0 - CLOUDWAYS EDITION", "EXE PRO 3.5.1 - CLOUDWAYS EDITION", 'console version');
server = replaceRequired(
  server,
  "console.log(`Cloud Web: ${PUBLIC_URL?PUBLIC_URL+'/app/':'/app/'}`);",
  "console.log(`Cloud Web: ${PUBLIC_URL?PUBLIC_URL+'/':'/'}`);",
  'console web url'
);
fs.writeFileSync(serverPath, server);

const indexPath = path.join(root, 'web', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = replaceRequired(html, 'href="/app/manifest.webmanifest"', 'href="/manifest.webmanifest"', 'manifest href');
html = replaceRequired(html, 'href="/app/app-icon.svg"', 'href="/app-icon.svg"', 'favicon href');
html = replaceRequired(html, "navigator.serviceWorker.register('/app/service-worker.js')", "navigator.serviceWorker.register('/service-worker.js')", 'service worker registration');
html = html.replaceAll('Cloud Full 3.3', 'Cloud Full 3.5.1');
html = html.replaceAll('v3.5.0', 'v3.5.1');
fs.writeFileSync(indexPath, html);

console.log('EXE PRO Cloudways 3.5.1: rota principal movida para /.');
