'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { REQUIRED_ARTIFACTS, MANIFEST_NAME, seal, verify } = require('../tools/prebuilt-artifact');

function temporaryFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exe-pro-prebuilt-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({version:'4.4.0'}));
  for (const file of REQUIRED_ARTIFACTS) {
    const out = path.join(root, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, 'fixture::'+file+'\n');
  }
  return root;
}

test('seal gera manifesto deterministico e verify aceita artefatos imutaveis', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  const first=fs.readFileSync(path.join(root, MANIFEST_NAME),'utf8');
  assert.equal(verify(root), true);
  seal(root);
  assert.equal(fs.readFileSync(path.join(root, MANIFEST_NAME),'utf8'), first);
});

test('alteracao no server.js depois do build bloqueia verificacao', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  fs.appendFileSync(path.join(root,'server.js'),'//unexpected');
  assert.throws(()=>verify(root),/server\.js/);
});

test('mudanca da versao bloqueia verificacao', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'4.5.0'}));
  assert.throws(()=>verify(root),/Versao/);
});

test('arquivo ausente bloqueia verificacao', (t) => {
  const root=temporaryFixture(t);
  seal(root);
  fs.rmSync(path.join(root,'web','portal.html'));
  assert.throws(()=>verify(root),/ENOENT/);
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
  assert.throws(()=>verify(root),/Lista de arquivos invalida/);
});
