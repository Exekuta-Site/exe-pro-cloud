'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { REQUIRED_ARTIFACTS, PROTECTED_DIRECTORIES, MANIFEST_NAME, seal } = require('../tools/prebuilt-artifact');
const { bundlePrebuilt, verifyBundle, sortedFiles } = require('../tools/bundle-prebuilt');

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exe-pro-bundle-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source');
  fs.mkdirSync(source);
  for (const { name } of PROTECTED_DIRECTORIES) fs.mkdirSync(path.join(source, name));
  for (const rel of REQUIRED_ARTIFACTS) {
    const filename = path.join(source, rel);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, rel === 'package.json' ? '{"version":"4.4.0"}' : 'v1::' + rel);
  }
  for (const rel of ['lib/portal-response-headers.js', 'core/automation/work.js', 'integrations/wp/plugin.php',
    'web/dashboard.css', 'web/downloads/connector.zip']) {
    const filename = path.join(source, rel);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, 'v1::' + rel);
  }
  fs.writeFileSync(path.join(source, '.env'), 'fake-secret=must-not-ship');
  fs.writeFileSync(path.join(source, 'private.sqlite'), 'must-not-ship');
  fs.mkdirSync(path.join(source, 'tools', 'apply')); // build tools nao entram no pacote
  fs.writeFileSync(path.join(source, 'tools', 'apply', 'dangerous.js'), 'must-not-ship');
  seal(source);
  return { dir, source, dest: path.join(dir, 'transport', 'payload') };
}

test('package somente os arquivos protegidos e manifesto; nenhum segredo/dado/build tool', t => {
  const { source, dest } = setup(t);
  const res = bundlePrebuilt(source, dest);
  assert.equal(res.version, '4.4.0');
  const files = sortedFiles(dest);
  assert.equal(files.length, res.files + 1);
  assert.ok(files.includes(MANIFEST_NAME));
  assert.ok(files.includes('lib/portal-response-headers.js'));
  assert.ok(files.includes('web/downloads/connector.zip'));
  assert.ok(!files.includes('.env'));
  assert.ok(!files.includes('private.sqlite'));
  assert.ok(!files.includes('tools/apply/dangerous.js'));
  assert.equal(verifyBundle(dest).files, res.files);
});

test('transporte para outra pasta mantem integridade, sem iniciar servidor', t => {
  const { dir, source, dest } = setup(t);
  bundlePrebuilt(source, dest);
  const transported = path.join(dir, 'second-host', 'exe-pro');
  fs.cpSync(dest, transported, { recursive: true });
  assert.deepEqual(verifyBundle(transported), verifyBundle(dest));
  assert.deepEqual(sortedFiles(transported), sortedFiles(dest));
});

test('bundles repetidos tem manifesto e conteudo identicos', t => {
  const { dir, source, dest } = setup(t);
  bundlePrebuilt(source, dest);
  const b = path.join(dir, 'second-bundle');
  bundlePrebuilt(source, b);
  for (const rel of sortedFiles(dest)) {
    assert.deepEqual(fs.readFileSync(path.join(dest, rel)), fs.readFileSync(path.join(b, rel)), rel);
  }
});

test('nao empacotar origem com hash divergente', t => {
  const { source, dest } = setup(t);
  fs.appendFileSync(path.join(source, 'lib/portal-response-headers.js'), 'tamper');
  assert.throws(() => bundlePrebuilt(source, dest), /Hash diverge/);
  assert.ok(!fs.existsSync(dest));
});

test('nao empacotar origem sem manifesto', t => {
  const { source, dest } = setup(t);
  fs.rmSync(path.join(source, MANIFEST_NAME));
  assert.throws(() => bundlePrebuilt(source, dest), /ENOENT/);
  assert.ok(!fs.existsSync(dest));
});

test('arquivo do runtime alterado na transferencia e bloqueado', t => {
  const { source, dest } = setup(t);
  bundlePrebuilt(source, dest);
  fs.appendFileSync(path.join(dest, 'lib/portal-response-headers.js'), 'tamper');
  assert.throws(() => verifyBundle(dest), /Hash diverge/);
});

test('arquivo do runtime ausente na transferencia e bloqueado', t => {
  const { source, dest } = setup(t);
  bundlePrebuilt(source, dest);
  fs.rmSync(path.join(dest, 'core/automation/work.js'));
  assert.throws(() => verifyBundle(dest), /Lista de arquivos/);
});

test('manifesto excluido na transferencia e bloqueado', t => {
  const { source, dest } = setup(t);
  bundlePrebuilt(source, dest);
  fs.rmSync(path.join(dest, MANIFEST_NAME));
  assert.throws(() => verifyBundle(dest), /ENOENT/);
});

test('arquivo extra nao listado na transferencia e bloqueado', t => {
  const { source, dest } = setup(t);
  bundlePrebuilt(source, dest);
  fs.writeFileSync(path.join(dest, 'unexpected-secret.txt'), 'wrong package');
  assert.throws(() => verifyBundle(dest), /arquivo extra ou ausente/);
});

test('nao sobrescrever pacote existente', t => {
  const { source, dest } = setup(t);
  bundlePrebuilt(source, dest);
  assert.throws(() => bundlePrebuilt(source, dest), /Destino ja existe/);
  assert.equal(verifyBundle(dest).version, '4.4.0');
});

test('nao permitir gerar pacote dentro dos diretorios protegidos da origem', t => {
  const { source } = setup(t);
  assert.throws(() => bundlePrebuilt(source, path.join(source, 'web', 'prebuilt')), /Destino nao pode/);
});

test('links simbolicos injetados no pacote sao bloqueados', t => {
  const { source, dest } = setup(t);
  bundlePrebuilt(source, dest);
  fs.symlinkSync(path.join(dest, 'server.js'), path.join(dest, 'untrusted'));
  assert.throws(() => verifyBundle(dest), /Link simbolico/);
});
