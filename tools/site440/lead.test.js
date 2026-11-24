'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'server-snippet.js'), 'utf8');
const context = {
  Buffer,
  Date,
  URL,
  crypto,
  process: { env: { EXE_CLOUD_SITE_LEAD_SECRET: 'site440-test-secret' } },
  safeEq(a, b) {
    const aa = Buffer.from(String(a || ''));
    const bb = Buffer.from(String(b || ''));
    return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
  }
};
vm.runInNewContext(source + '\nthis.siteLead440Api = { normalize: siteLead440Normalize, fingerprint: siteLead440Fingerprint, signature: siteLead440ExpectedSignature, signatureValid: siteLead440SignatureValid };', context);
const api = context.siteLead440Api;

function validLead(overrides = {}) {
  return {
    name: 'Maria da Silva',
    email: 'maria@example.com',
    whatsapp: '+55 (11) 99999-0000',
    consent: true,
    message: 'Quero melhorar a captação de clientes.',
    source_page: '/contato/',
    ...overrides
  };
}

test('normaliza um lead válido do site', () => {
  const result = api.normalize(validLead({ eventId: 'event-123', utm: { source: 'google', campaign: 'brand' } }));
  assert.equal(result.ok, true);
  assert.equal(result.value.email, 'maria@example.com');
  assert.equal(result.value.phoneDigits, '5511999990000');
  assert.equal(result.value.externalId, 'event-123');
  assert.equal(JSON.stringify(result.value.utm), JSON.stringify({ source: 'google', campaign: 'brand' }));
});

test('rejeita consentimento, honeypot e contato ausentes', () => {
  assert.equal(api.normalize(validLead({ consent: false })).ok, false);
  assert.equal(api.normalize(validLead({ honeypot: 'bot' })).ok, false);
  assert.equal(api.normalize(validLead({ email: '', whatsapp: '' })).ok, false);
});

test('rejeita email, WhatsApp e site inválidos', () => {
  assert.equal(api.normalize(validLead({ email: 'invalido' })).ok, false);
  assert.equal(api.normalize(validLead({ whatsapp: '123' })).ok, false);
  assert.equal(api.normalize(validLead({ website: 'javascript:alert(1)' })).ok, false);
});

test('usa o mesmo fingerprint para reenvio idempotente', () => {
  const first = api.normalize(validLead({ eventId: 'same-event' }));
  const second = api.normalize(validLead({ eventId: 'same-event', message: 'texto diferente' }));
  assert.equal(api.fingerprint(first.value), api.fingerprint(second.value));
  assert.notEqual(api.fingerprint(api.normalize(validLead({ eventId: 'other-event' })).value), api.fingerprint(first.value));
});

test('valida assinatura HMAC e janela de timestamp', () => {
  const raw = JSON.stringify(validLead({ eventId: 'signed-event' }));
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = api.signature(timestamp, raw);
  const request = { headers: { 'x-exekuta-timestamp': timestamp, 'x-exekuta-signature': signature } };
  assert.equal(api.signatureValid(request, raw), true);
  assert.equal(api.signatureValid(request, raw + ' '), false);
  assert.equal(api.signatureValid({ headers: { ...request.headers, 'x-exekuta-timestamp': '1000000000' } }, raw), false);
});
