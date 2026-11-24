'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { portalResponseHeaders } = require('../lib/portal-response-headers');

test('Portal HTML: impede iframe e preserva respostas anteriores', () => {
  const h = portalResponseHeaders(123, true);
  assert.equal(h['content-type'], 'text/html; charset=utf-8');
  assert.equal(h['content-length'], 123);
  assert.equal(h['cache-control'], 'no-store');
  assert.equal(h['x-content-type-options'], 'nosniff');
  assert.equal(h['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(h['x-frame-options'], 'DENY');
  assert.match(h['content-security-policy'], /frame-ancestors 'none'/);
  assert.match(h['content-security-policy'], /object-src 'none'/);
  assert.match(h['content-security-policy'], /base-uri 'self'/);
  assert.equal(h['strict-transport-security'], 'max-age=31536000; includeSubDomains');
});

test('Portal HTML: nao anuncia HSTS quando HTTPS nao e exigido', () => {
  const h = portalResponseHeaders(0, false);
  assert.ok(!Object.hasOwn(h, 'strict-transport-security'));
});

test('Portal HTML: CSP de iframe nao bloqueia scripts inline existentes', () => {
  const csp = portalResponseHeaders(1, true)['content-security-policy'];
  assert.doesNotMatch(csp, /(?:^|;)\s*(?:default-src|script-src|style-src)\b/);
});

test('Rota existente do Portal usa cabecalhos sem modificar seus caminhos', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(code, /const \{ portalResponseHeaders \} = require\('\.\/lib\/portal-response-headers'\)/);
  assert.match(code, /res\.writeHead\(200,portalResponseHeaders\(file\.length, REQUIRE_HTTPS\)\);/);
  assert.match(code, /url\.pathname==='\/portal'/);
  assert.match(code, /url\.pathname==='\/portal\/index\.html'/);
  assert.match(code, /portal\.exekuta\.com\.br/);
});
