'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { REQUIRED_ARTIFACTS, PROTECTED_DIRECTORIES, MANIFEST_NAME, collectArtifacts, seal, verify } = require('../tools/prebuilt-artifact');

function temporaryFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exe-pro-prebuilt-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const { name } of PROTECTED_DIRECTORIES) fs.mkdirSync(path.join(root, name), {recursive:true});
  for (const file of REQUIRED_ARTIFACTS) {
    const out = path.join(root, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, file === 'package.json' ? JSON.stringify({version:'4.4.0'}) : 'fixture::'+file+'\n');
  }
  for (const rel of [
    'lib/portal-response-headers.js',
    'lib/migrations/400_automation_core.sql',
    'core/automation/worker.js',
    'integrations/exekuta-site-bridge/bridge.php',
    'web/client-portal-380.js',
    'web/client-portal-380.css',
    'web/app-icon.svg',
    'web/downloads/connector.zip'
  ]) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, 'fixture::'+rel+'\n');
  }
  fs.writeFileSync(path.join(root, 'core', 'README.md'), 'nota nao executavel\n');
  return root;
}

function tamperFixture(t, rel) {
  const root = temporaryFixture(t);
  seal(root);
  fs.appendFileSync(path.join(root, rel), '\n// alterado');
  assert.throws(() => verify(root), error => error.message.includes('Hash diverge') && error.message.includes(rel));
}

test('seal gera manifesto deterministico de todos os arquivos protegidos', (t) => {
  const root=temporaryFixture(t);
  const m=seal(root);
  assert.equal(m.schema, 2);
  for (const name of ['lib/portal-response-headers.js', 'core/automation/worker.js',
    'integrations/exekuta-site-bridge/bridge.php', 'web/client-portal-380.css',
    'web/downloads/connector.zip', 'package-lock.json', 'tools/prebuilt-artifact.js']) {
    assert.ok(m.files[name], name + ' deve estar protegido');
  }
  assert.ok(!Object.hasOwn(m.files, 'core/README.md'));
  const first=fs.readFileSync(path.join(root, MANIFEST_NAME),'utf8');
  assert.equal(verify(root), true);
  seal(root);
  assert.equal(fs.readFileSync(path.join(root, MANIFEST_NAME),'utf8'), first);
});

test('alteracao no server.js bloqueia verificacao', t => tamperFixture(t, 'server.js'));
test('alteracao de modulo lib bloqueia verificacao', t => tamperFixture(t, 'lib/portal-response-headers.js'));
test('alteracao de modulo core aninhado bloqueia verificacao', t => tamperFixture(t, 'core/automation/worker.js'));
test('alteracao em migracao SQL bloqueia verificacao', t => tamperFixture(t, 'lib/migrations/400_automation_core.sql'));
test('alteracao em integracao PHP bloqueia verificacao', t => tamperFixture(t, 'integrations/exekuta-site-bridge/bridge.php'));
test('alteracao de asset web JS bloqueia verificacao', t => tamperFixture(t, 'web/client-portal-380.js'));
test('alteracao de asset web CSS bloqueia verificacao', t => tamperFixture(t, 'web/client-portal-380.css'));
test('alteracao de asset web SVG bloqueia verificacao', t => tamperFixture(t, 'web/app-icon.svg'));
test('alteracao de download ZIP bloqueia verificacao', t => tamperFixture(t, 'web/downloads/connector.zip'));
test('alteracao do lockfile bloqueia verificacao', t => tamperFixture(t, 'package-lock.json'));
test('alteracao do verificador bloqueia verificacao', t => tamperFixture(t, 'tools/prebuilt-artifact.js'));

test('mudanca da versao bloqueia verificacao', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'4.5.0'}));
  assert.throws(()=>verify(root),/Versao/);
});

test('arquivo obrigatorio ausente bloqueia verificacao', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  fs.rmSync(path.join(root,'web','portal.html'));
  assert.throws(()=>verify(root),/ENOENT/);
});

test('modulo faltando no inventario bloqueia verificacao', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  fs.rmSync(path.join(root,'lib/portal-response-headers.js'));
  assert.throws(()=>verify(root),/Lista de arquivos/);
});

test('novo modulo criado apos seal bloqueia verificacao', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  fs.writeFileSync(path.join(root,'core/automation/novo.js'),'module.exports = true;');
  assert.throws(()=>verify(root),/Lista de arquivos/);
});

test('novo asset criado apos seal bloqueia verificacao', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  fs.writeFileSync(path.join(root,'web/extra.css'),'body {}');
  assert.throws(()=>verify(root),/Lista de arquivos/);
});

test('manifesto ausente bloqueia verificacao', (t) => {
  const root=temporaryFixture(t);
  assert.throws(()=>verify(root),/ENOENT/);
});

test('manifesto adulterado bloqueia verificacao', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  const dest=path.join(root, MANIFEST_NAME);
  const data=JSON.parse(fs.readFileSync(dest,'utf8'));
  data.files['not-existing.js']='ff';
  fs.writeFileSync(dest,JSON.stringify(data));
  assert.throws(()=>verify(root),/Lista de arquivos/);
});

test('manifesto do schema anterior deve ser regenerado', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  const dest=path.join(root, MANIFEST_NAME);
  const data=JSON.parse(fs.readFileSync(dest,'utf8'));
  data.schema=1;
  fs.writeFileSync(dest,JSON.stringify(data));
  assert.throws(()=>verify(root),/versao antiga/);
});

test('link simbolico em diretorio protegido nao e seguido', (t) => {
  const root=temporaryFixture(t);
  const link=path.join(root, 'web', 'link.js');
  fs.symlinkSync(path.join(root, 'server.js'), link);
  assert.throws(()=>collectArtifacts(root),/Link simbolico/);
});

test('diretorio protegido simbolico nao e seguido', (t) => {
  const root=temporaryFixture(t);
  fs.renameSync(path.join(root, 'integrations'), path.join(root, 'integrations-original'));
  fs.symlinkSync(path.join(root, 'integrations-original'), path.join(root, 'integrations'), 'dir');
  assert.throws(()=>collectArtifacts(root),/Diretorio protegido invalido ou simbolico/);
});
