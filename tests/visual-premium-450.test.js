'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyVisualPremium, STYLE_ID, STYLE_FILENAME, STYLE_REGEX } = require('../tools/apply-premium-visual-450');

function fixture(t, html) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exe-pro-premium-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'web'), { recursive: true });
  const original = html || '<!doctype html><html><head><style>.old{color:white}</style></head>' +
    '<body><div id="content"><div class="grid kpis"><div class="kpi">18</div></div>' +
    '<button id="openLead" onclick="openLead(42)">Abrir</button>' +
    '<button onclick="openSec(\'pipeline\')">Funil</button></div>' +
    '<script>function renderDashboard(){return "ok"}</script></body></html>';
  fs.writeFileSync(path.join(root, 'web', 'index.html'), original);
  fs.writeFileSync(path.join(root, 'web', STYLE_FILENAME),
    '/* CSS de teste */\n#content .kpi{border-radius:18px}\n#content .card{padding:20px}\n');
  return { root, original, indexPath: path.join(root, 'web', 'index.html') };
}

test('injeta apenas o stylesheet no head e preserva JS, cliques, IDs e estrutura', t => {
  const x = fixture(t);
  const a = applyVisualPremium(x.root);
  assert.equal(a.changed, true);
  const updated = fs.readFileSync(x.indexPath, 'utf8');
  assert.equal(updated.match(new RegExp('<style id="' + STYLE_ID + '">', 'g')).length, 1);
  assert.ok(updated.indexOf('id="' + STYLE_ID + '"') < updated.indexOf('</head>'));
  assert.ok(updated.indexOf('<style>.old') < updated.indexOf('id="' + STYLE_ID + '"'));
  assert.equal(updated.replace(STYLE_REGEX, ''), x.original);
  assert.ok(updated.includes('onclick="openLead(42)"'));
  assert.ok(updated.includes('onclick="openSec(\'pipeline\')"'));
  assert.ok(updated.includes('function renderDashboard()'));
});

test('aplicacao repetida e identica em bytes e nao duplica estilos', t => {
  const x = fixture(t);
  applyVisualPremium(x.root);
  const first = fs.readFileSync(x.indexPath, 'utf8');
  const second = applyVisualPremium(x.root);
  assert.equal(second.changed, false);
  assert.equal(fs.readFileSync(x.indexPath, 'utf8'), first);
});

test('alteracao futura no CSS muda apenas o bloco visual gerado', t => {
  const x = fixture(t);
  applyVisualPremium(x.root);
  fs.appendFileSync(path.join(x.root, 'web', STYLE_FILENAME), '#content .table{border-radius:12px}\n');
  const second = applyVisualPremium(x.root);
  const html = fs.readFileSync(x.indexPath, 'utf8');
  assert.equal(second.changed, true);
  assert.ok(html.includes('#content .table{border-radius:12px}'));
  assert.equal(html.replace(STYLE_REGEX, ''), x.original);
});

test('sem head ou content, aborta sem tocar no arquivo', t => {
  const x = fixture(t, '<html><body><div id="content"></div></body></html>');
  assert.throws(() => applyVisualPremium(x.root), /estrutura esperada/);
  assert.equal(fs.readFileSync(x.indexPath, 'utf8'), x.original);
});

test('marcador CSS duplicado falha com segurança e não altera HTML', t => {
  const x = fixture(t);
  const html = fs.readFileSync(x.indexPath, 'utf8').replace('</head>',
    '<style id="' + STYLE_ID + '">one</style><style id="' + STYLE_ID + '">two</style></head>');
  fs.writeFileSync(x.indexPath, html);
  assert.throws(() => applyVisualPremium(x.root), /marcadores duplicados/);
  assert.equal(fs.readFileSync(x.indexPath, 'utf8'), html);
});

test('CSS contendo fechamento de style não é incorporado', t => {
  const x = fixture(t);
  fs.writeFileSync(path.join(x.root, 'web', STYLE_FILENAME), '</style><script>alert(1)</script>');
  assert.throws(() => applyVisualPremium(x.root), /stylesheet invalido/);
  assert.equal(fs.readFileSync(x.indexPath, 'utf8'), x.original);
});

test('stylesheet oficial cobre dashboard, cards, modulos e mobile sem JS', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'web', STYLE_FILENAME), 'utf8');
  for (const selector of ['#content .kpis', '#content .kpi', '#content .card',
    '#content .chartbar', '#content .alert', '#content .lead-card',
    '#content .commercial366-card', '#content .prospect365-card', '#content .table-wrap']) {
    assert.ok(css.includes(selector), 'seletor ausente: ' + selector);
  }
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /var\(--accent\)/);
  assert.doesNotMatch(css, /<\/script|<script|<\/style/i);
});

test('no CI, HTML final do build possui uma única camada visual no fim do head', () => {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  const marks = html.match(new RegExp('<style id="' + STYLE_ID + '">', 'g')) || [];
  assert.equal(marks.length, 1);
  assert.ok(html.indexOf('id="' + STYLE_ID + '"') < html.indexOf('</head>'));
  assert.ok(html.includes('function renderDashboard()'));
  assert.ok(html.includes("openSec('pipeline')"));
  assert.ok(html.includes('onclick="newClient()"'));
});
