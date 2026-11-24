'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const VERSION = '4.4.0';
const PREVIOUS = '4.3.0';
const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'web', 'index.html');
const portalPath = path.join(root, 'web', 'portal.html');
const serverPath = path.join(root, 'server.js');
const serviceWorkerPath = path.join(root, 'web', 'service-worker.js');
const manifestPath = path.join(__dirname, 'core390', 'module-manifest.json');
const dir = path.join(__dirname, 'site440');

for (const file of [indexPath, portalPath, serverPath, serviceWorkerPath, manifestPath]) {
  if (!fs.existsSync(file)) throw new Error('Arquivo necessario ausente para Integracao do Site 4.4.0: ' + file);
}
const snippet = fs.readFileSync(path.join(dir, 'server-snippet.js'), 'utf8');
const routes = fs.readFileSync(path.join(dir, 'routes.txt'), 'utf8');
let html = fs.readFileSync(indexPath, 'utf8');
let portal = fs.readFileSync(portalPath, 'utf8');
let server = fs.readFileSync(serverPath, 'utf8');
let serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (!server.includes("const VERSION = '" + PREVIOUS + "';") && !server.includes("const VERSION = '" + VERSION + "';")) {
  throw new Error('Versao base nao encontrada para Integracao do Site 4.4.0.');
}
server = server.replaceAll(PREVIOUS, VERSION);
html = html.replaceAll(PREVIOUS, VERSION);
portal = portal.replaceAll(PREVIOUS, VERSION);
serviceWorker = serviceWorker.replaceAll(PREVIOUS, VERSION);

if (!server.includes('EXE_PRO_SITE_LEADS_440')) {
  const anchor = '\nfunction guardKey(';
  if (!server.includes(anchor)) throw new Error('Anchor de servidor ausente para Integracao do Site 4.4.0.');
  server = server.replace(anchor, '\n' + snippet + '\nfunction guardKey(');
}
if (!server.includes("url.pathname==='/api/integrations/site-lead'")) {
  const anchor = '    // API de sincronizacao Windows <-> Cloudways.';
  if (!server.includes(anchor)) throw new Error('Anchor de rotas ausente para Integracao do Site 4.4.0.');
  server = server.replace(anchor, routes + '\n' + anchor);
}

manifest.version = VERSION;
if (!manifest.modules.some(x => x.key === 'site-leads')) {
  manifest.modules.push({
    key: 'site-leads',
    name: 'Leads do site EXEKUTA',
    version: VERSION,
    marker: 'EXE_PRO_SITE_LEADS_440',
    critical: false
  });
}

fs.writeFileSync(indexPath, html);
fs.writeFileSync(portalPath, portal);
fs.writeFileSync(serverPath, server);
fs.writeFileSync(serviceWorkerPath, serviceWorker);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

for (const needle of [
  "const VERSION = '" + VERSION + "';",
  'EXE_PRO_SITE_LEADS_440',
  "url.pathname==='/api/integrations/site-lead'",
  'SITE440_SECRET',
  'siteLead440Handle',
  'integrationKey'
]) {
  if (!server.includes(needle)) throw new Error('Patch de Integracao do Site 4.4.0 incompleto: ' + needle);
}
if (!portal.includes(VERSION)) throw new Error('Portal nao foi atualizado para ' + VERSION + '.');
if (!serviceWorker.includes('exe-pro-cloud-web-v' + VERSION)) throw new Error('Cache PWA nao foi invalidado para ' + VERSION + '.');
if (!manifest.modules.some(x => x.marker === 'EXE_PRO_SITE_LEADS_440')) throw new Error('Manifesto da integracao do site ausente.');
cp.execFileSync(process.execPath, ['--check', serverPath], { stdio: 'inherit' });
console.log('EXE PRO Cloud ' + VERSION + ': integracao de leads do site aplicada e validada.');
