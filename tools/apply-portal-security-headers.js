'use strict';

// O build materializa server.js do payload antes dos patches: este ajuste
// precisa rodar APOS os scripts existentes para sobreviver ao build.
// Operacao idempotente; aborta se a rota mudar, em vez de alterar outra rota.
const fs = require('node:fs');
const path = require('node:path');
const serverFile = path.join(__dirname, '..', 'server.js');
const original = fs.readFileSync(serverFile, 'utf8');
let updated = original;

const importAnchor = "const { initSchema } = require('./lib/schema');";
const importLine = "const { portalResponseHeaders } = require('./lib/portal-response-headers');";
if (!updated.includes(importLine)) {
  if (!updated.includes(importAnchor)) throw new Error('Portal headers: import anchor ausente.');
  updated = updated.replace(importAnchor, `${importAnchor}\n${importLine}`);
}

const previous = "res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':file.length,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'});";
const replacement = 'res.writeHead(200,portalResponseHeaders(file.length, REQUIRE_HTTPS));';
if (!updated.includes(replacement)) {
  if (!updated.includes(previous)) throw new Error('Portal headers: resposta HTML esperada nao encontrada.');
  updated = updated.replace(previous, replacement);
}
if (updated !== original) fs.writeFileSync(serverFile, updated);
console.log('EXE PRO: headers de seguranca do Portal validados.');
