'use strict';

// Ferramenta opt-in de verificacao de artefatos. Nao inicia o servidor,
// nao conecta ao PostgreSQL e nao modifica o ambiente de producao.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REQUIRED_ARTIFACTS = Object.freeze([
  'server.js',
  'web/index.html',
  'web/portal.html',
  'web/service-worker.js',
  'web/manifest.webmanifest'
]);
const MANIFEST_NAME = '.exe-pro-build-manifest.json';
const DEFAULT_ROOT = path.resolve(__dirname, '..');

function fingerprint(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function snapshot(root = DEFAULT_ROOT) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!pkg.version || typeof pkg.version !== 'string') throw new Error('Versao ausente no package.json.');
  const files = {};
  for (const rel of REQUIRED_ARTIFACTS) {
    files[rel] = fingerprint(path.join(root, rel));
  }
  return { schema: 1, version: pkg.version, files };
}

function seal(root = DEFAULT_ROOT) {
  const manifest = snapshot(root);
  const dest = path.join(root, MANIFEST_NAME);
  const temporary = `${dest}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, dest);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return manifest;
}

function verify(root = DEFAULT_ROOT) {
  const file = path.join(root, MANIFEST_NAME);
  const expected = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (expected.schema !== 1 || typeof expected.version !== 'string' ||
      !expected.files || typeof expected.files !== 'object' || Array.isArray(expected.files)) {
    throw new Error('Manifesto de build invalido.');
  }
  const current = snapshot(root);
  if (current.version !== expected.version) throw new Error('Versao do artefato diverge do manifesto.');
  const keys = Object.keys(expected.files);
  if (keys.length !== REQUIRED_ARTIFACTS.length ||
      keys.some(k => !REQUIRED_ARTIFACTS.includes(k))) throw new Error('Lista de arquivos invalida no manifesto.');
  for (const rel of REQUIRED_ARTIFACTS) {
    if (current.files[rel] !== expected.files[rel]) {
      throw new Error('Hash diverge para '+rel+'. Recrie o pacote de homologacao.');
    }
  }
  return true;
}

if (require.main === module) {
  try {
    const action = process.argv[2];
    if (action === 'seal') {
      const m = seal();
      console.log('EXE PRO prebuilt: manifesto gerado para '+m.version+'.');
    } else if (action === 'verify') {
      verify();
      console.log('EXE PRO prebuilt: hashes verificados.');
    } else throw new Error('Uso: node tools/prebuilt-artifact.js seal|verify');
  } catch (error) {
    console.error('EXE PRO prebuilt:', error.message);
    process.exitCode = 1;
  }
}

module.exports = { REQUIRED_ARTIFACTS, MANIFEST_NAME, snapshot, seal, verify };
