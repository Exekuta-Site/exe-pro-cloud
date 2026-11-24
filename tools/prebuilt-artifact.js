'use strict';

// Verificacao opt-in do pacote prebuilt. Nunca inicia o servidor ou banco.
// Protege os arquivos imutaveis do runtime, nao os dados ou secrets do ambiente.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Arquivos indispensaveis para inicializacao e para verificar o proprio gate.
const REQUIRED_ARTIFACTS = Object.freeze([
  'server.js',
  'package.json',
  'package-lock.json',
  'tools/prebuilt-artifact.js',
  'web/index.html',
  'web/portal.html',
  'web/service-worker.js',
  'web/manifest.webmanifest'
]);

// Em web/ todos os arquivos sao assets publicados, incluindo downloads.
// Nos demais diretorios, so codigo, configuracao e migrations em runtime.
// Nao incluir docs, payload, tools/apply-* nem arquivos mutaveis do ambiente.
const PROTECTED_DIRECTORIES = Object.freeze([
  { name: 'lib', extensions: Object.freeze(['.js', '.cjs', '.mjs', '.json', '.sql', '.node', '.wasm']) },
  { name: 'core', extensions: Object.freeze(['.js', '.cjs', '.mjs', '.json', '.sql', '.node', '.wasm']) },
  { name: 'integrations', extensions: Object.freeze(['.js', '.cjs', '.mjs', '.json', '.sql', '.php', '.py']) },
  { name: 'web', extensions: null }
]);
const MANIFEST_NAME = '.exe-pro-build-manifest.json';
const DEFAULT_ROOT = path.resolve(__dirname, '..');

function fingerprint(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function collectArtifacts(root = DEFAULT_ROOT) {
  const files = new Set(REQUIRED_ARTIFACTS);
  for (const { name, extensions } of PROTECTED_DIRECTORIES) {
    const dir = path.join(root, name);
    // Diretorio protegido ausente significa pacote incompleto, nao lista vazia.
    if (!fs.lstatSync(dir).isDirectory()) throw new Error('Diretorio protegido invalido ou simbolico: ' + name);
    function walk(current, relative) {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const rel = relative + '/' + entry.name;
        if (entry.isSymbolicLink()) throw new Error('Link simbolico proibido no pacote: ' + rel);
        if (entry.isDirectory()) walk(path.join(current, entry.name), rel);
        else if (entry.isFile()) {
          if (extensions === null || extensions.includes(path.extname(entry.name).toLowerCase())) {
            files.add(rel);
          }
        } else throw new Error('Tipo de arquivo nao suportado: ' + rel);
      }
    }
    walk(dir, name);
  }
  const list = Array.from(files).sort();
  for (const rel of list) {
    const st = fs.lstatSync(path.join(root, rel));
    if (!st.isFile()) throw new Error('Arquivo obrigatorio invalido ou simbolico: ' + rel);
  }
  return list;
}

function snapshot(root = DEFAULT_ROOT) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!pkg.version || typeof pkg.version !== 'string') throw new Error('Versao ausente no package.json.');
  const files = {};
  for (const rel of collectArtifacts(root)) {
    files[rel] = fingerprint(path.join(root, rel));
  }
  // schema 2: inventario dinamico de runtime e assets; rejeita manifestos antigos.
  return { schema: 2, version: pkg.version, files };
}

function seal(root = DEFAULT_ROOT) {
  const manifest = snapshot(root);
  const dest = path.join(root, MANIFEST_NAME);
  const temporary = dest + '.' + process.pid + '.tmp';
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
  if (expected.schema !== 2 || typeof expected.version !== 'string' ||
      !expected.files || typeof expected.files !== 'object' || Array.isArray(expected.files)) {
    throw new Error('Manifesto de build invalido ou de versao antiga.');
  }
  const current = snapshot(root);
  if (current.version !== expected.version) throw new Error('Versao do artefato diverge do manifesto.');
  const keys = Object.keys(expected.files).sort();
  const actual = Object.keys(current.files).sort();
  if (keys.length !== actual.length || keys.some((rel, i) => rel !== actual[i])) {
    throw new Error('Lista de arquivos diverge do manifesto. Recrie o pacote de homologacao.');
  }
  for (const rel of actual) {
    if (current.files[rel] !== expected.files[rel]) {
      throw new Error('Hash diverge para ' + rel + '. Recrie o pacote de homologacao.');
    }
  }
  return true;
}

if (require.main === module) {
  try {
    const action = process.argv[2];
    if (action === 'seal') {
      const m = seal();
      console.log('EXE PRO prebuilt: manifesto gerado para ' + m.version + '.');
    } else if (action === 'verify') {
      verify();
      console.log('EXE PRO prebuilt: hashes verificados.');
    } else throw new Error('Uso: node tools/prebuilt-artifact.js seal|verify');
  } catch (error) {
    console.error('EXE PRO prebuilt:', error.message);
    process.exitCode = 1;
  }
}

module.exports = { REQUIRED_ARTIFACTS, PROTECTED_DIRECTORIES, MANIFEST_NAME, collectArtifacts, snapshot, seal, verify };
