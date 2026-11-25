'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyVisualPremium, STYLE_ID, STYLE_FILENAME, MODULES_FILENAME, INTERACTIONS_FILENAME, STYLE_REGEX } = require('../tools/apply-premium-visual-450');

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
  fs.writeFileSync(path.join(root, 'web', MODULES_FILENAME),
    '/* CSS de módulos teste */\n#content .t391-card{border-radius:13px}\n#content .btn.danger{color:red}\n');
  fs.writeFileSync(path.join(root, 'web', INTERACTIONS_FILENAME),
    '/* CSS de interações teste */\n#modalBack .modal{border-radius:22px}\n#content .table th{color:white}\n#toast{border-radius:14px}\n');
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

test('segunda camada de modulos integra mesmo bloco e preserva handlers originais', t => {
  const x = fixture(t);
  applyVisualPremium(x.root);
  const html = fs.readFileSync(x.indexPath, 'utf8');
  assert.equal((html.match(new RegExp('<style id="' + STYLE_ID + '">', 'g')) || []).length, 1);
  assert.ok(html.includes('#content .kpi{border-radius:18px}'));
  assert.ok(html.includes('#content .t391-card{border-radius:13px}'));
  assert.ok(html.indexOf('#content .kpi{border-radius:18px}') < html.indexOf('#content .t391-card{border-radius:13px}'));
  assert.equal(html.replace(STYLE_REGEX, ''), x.original);
});

test('troca exclusiva do CSS modular reaplica com idempotencia', t => {
  const x = fixture(t);
  applyVisualPremium(x.root);
  const first = fs.readFileSync(x.indexPath, 'utf8');
  fs.appendFileSync(path.join(x.root, 'web', MODULES_FILENAME), '#content .t391-col{min-width:0}\n');
  const changed = applyVisualPremium(x.root);
  assert.equal(changed.changed, true);
  const second = fs.readFileSync(x.indexPath, 'utf8');
  assert.notEqual(second, first);
  assert.ok(second.includes('#content .t391-col{min-width:0}'));
  assert.equal(second.replace(STYLE_REGEX, ''), x.original);
  assert.equal(applyVisualPremium(x.root).changed, false);
});

test('arquivo modular ausente falha antes de escrever HTML', t => {
  const x = fixture(t);
  fs.rmSync(path.join(x.root, 'web', MODULES_FILENAME));
  assert.throws(() => applyVisualPremium(x.root), /ENOENT/);
  assert.equal(fs.readFileSync(x.indexPath, 'utf8'), x.original);
});

test('CSS modular protege indicadores personalizados, SLA e botoes perigosos', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'web', MODULES_FILENAME), 'utf8');
  for (const selector of [
    '#content .t391-kpis', '#content .b384-kpis', '#content .seo382-kpis',
    '#content .commercial366-card.overdue', '#content .t391-card.sla-over',
    '#content .prospect365-grid', '#content .prospect365-address',
    '#content .btn.danger', '#content .status.bad'
  ]) {
    assert.ok(css.includes(selector), 'seletor de seguranca visual ausente: ' + selector);
  }
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /var\(--accent\)/);
  assert.doesNotMatch(css, /<script|<\/style/i);
});

test('tres camadas seguem ordem base, modulos e interacoes em unico estilo', t => {
  const x = fixture(t);
  applyVisualPremium(x.root);
  const html = fs.readFileSync(x.indexPath, 'utf8');
  assert.equal((html.match(new RegExp('<style id="' + STYLE_ID + '">', 'g')) || []).length, 1);
  const baseIndex = html.indexOf('#content .kpi{border-radius:18px}');
  const modulesIndex = html.indexOf('#content .t391-card{border-radius:13px}');
  const interactionsIndex = html.indexOf('#modalBack .modal{border-radius:22px}');
  assert.ok(baseIndex > -1 && modulesIndex > baseIndex && interactionsIndex > modulesIndex);
  assert.equal(html.replace(STYLE_REGEX, ''), x.original);
  assert.equal(applyVisualPremium(x.root).changed, false);
});

test('mudanca apenas no CSS de interacoes atualiza estilo sem tocar em JS ou markup', t => {
  const x = fixture(t);
  applyVisualPremium(x.root);
  fs.appendFileSync(path.join(x.root, 'web', INTERACTIONS_FILENAME),
    '#modalBack .field .input:focus{outline:2px solid var(--accent)}\n');
  assert.equal(applyVisualPremium(x.root).changed, true);
  const html = fs.readFileSync(x.indexPath, 'utf8');
  assert.ok(html.includes('#modalBack .field .input:focus'));
  assert.equal(html.replace(STYLE_REGEX, ''), x.original);
  assert.equal(applyVisualPremium(x.root).changed, false);
});

test('arquivo de interacoes ausente nao permite escrita parcial no HTML', t => {
  const x = fixture(t);
  fs.rmSync(path.join(x.root, 'web', INTERACTIONS_FILENAME));
  assert.throws(() => applyVisualPremium(x.root), /ENOENT/);
  assert.equal(fs.readFileSync(x.indexPath, 'utf8'), x.original);
});

test('interacoes CSS com markup potencialmente perigoso sao bloqueadas', t => {
  const x = fixture(t);
  fs.writeFileSync(path.join(x.root, 'web', INTERACTIONS_FILENAME), '</style><script>alert(1)</script>');
  assert.throws(() => applyVisualPremium(x.root), /stylesheet invalido/);
  assert.equal(fs.readFileSync(x.indexPath, 'utf8'), x.original);
});

test('CSS fase 3 cobre formularios, tabelas, modal, toast e estados acessiveis', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'web', INTERACTIONS_FILENAME), 'utf8');
  for(const selector of [
    '#content .field label', '#content .table-wrap', '#content .table th',
    '#content .table td', '#content .table tbody tr:focus-within td',
    '#modalBack .modal', '#modalBack .modal-head', '#modalBack #modalBody',
    '#modalBack .field label', '#toast', '#content .btn.danger'
  ]) {
    assert.ok(css.includes(selector), 'seletor esperado ausente: ' + selector);
  }
  assert.match(css, /\[aria-invalid="true"\]/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /:disabled/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media\(max-width:430px\)/);
  assert.match(css, /var\(--accent\)/);
  assert.doesNotMatch(css, /<script|<\/style/i);
  assert.doesNotMatch(css, /(?:^|[\s,])\.hidden\s*\{/m);
});

test('HTML original inclui modal e toast fora do content, e patch CSS nao altera estado', t => {
  const original = '<!doctype html><html><head></head><body>' +
    '<div id="content"><button onclick="newClient()">Cliente</button>' +
    '<table class="table"><thead><tr><th>Leads</th></tr></thead></table></div>' +
    '<div id="modalBack" class="modal-back hidden">' +
    '<div class="modal"><div class="modal-head"><h2 id="modalTitle">Cliente</h2>' +
    '<button class="btn" onclick="closeModal()">×</button></div>' +
    '<div id="modalBody"><form onsubmit="saveClient()">' +
    '<input class="input" id="clientName"></form></div></div></div>' +
    '<div id="toast" class="toast hidden"></div>' +
    '<script>function closeModal(){ return true; }</script></body></html>';
  const x = fixture(t, original);
  applyVisualPremium(x.root);
  const updated = fs.readFileSync(x.indexPath, 'utf8');
  assert.equal(updated.replace(STYLE_REGEX, ''), original);
  assert.ok(updated.includes('class="modal-back hidden"'));
  assert.ok(updated.includes('class="toast hidden"'));
  assert.ok(updated.includes('onsubmit="saveClient()"'));
  assert.ok(updated.includes('onclick="closeModal()"'));
});

test('no CI, HTML final do build possui uma única camada visual no fim do head', () => {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  const marks = html.match(new RegExp('<style id="' + STYLE_ID + '">', 'g')) || [];
  assert.equal(marks.length, 1);
  assert.ok(html.indexOf('id="' + STYLE_ID + '"') < html.indexOf('</head>'));
  assert.ok(html.includes('function renderDashboard()'));
  assert.ok(html.includes('#content .commercial366-card.overdue'));
  assert.ok(html.includes('#content .t391-card.sla-over'));
  assert.ok(html.includes('#content .btn.danger'));
  assert.ok(html.includes('#modalBack .modal{') || html.includes('#modalBack .modal {'));
  assert.ok(html.includes('#content .table tbody tr:focus-within td'));
  assert.ok(html.includes('#toast {') || html.includes('#toast{'));
  assert.ok(html.includes('id="modalBack"'));
  assert.ok(html.includes('id="toast"'));
  assert.equal((html.match(new RegExp('<style id="' + STYLE_ID + '">', 'g')) || []).length, 1);
  assert.ok(html.includes("openSec('pipeline')"));
  assert.ok(html.includes('onclick="newClient()"'));
});
