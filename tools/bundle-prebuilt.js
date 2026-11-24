'use strict';

// Empacotamento opt-in em diretorio local. Nao abre conexao, nao executa build,
// nao inicia servidor e nao inclui dados, dumps ou segredos do ambiente.
const fs = require('node:fs');
const path = require('node:path');
const { MANIFEST_NAME, verify } = require('./prebuilt-artifact');

function sortedFiles(root) {
  const paths = [];
  function walk(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relative = prefix ? prefix + '/' + entry.name : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Link simbolico proibido no pacote: ' + relative);
      if (entry.isDirectory()) walk(full, relative);
      else if (entry.isFile()) paths.push(relative);
      else throw new Error('Tipo de arquivo invalido no pacote: ' + relative);
    }
  }
  walk(root, '');
  return paths.sort();
}

function verifyBundle(root) {
  const target = path.resolve(root);
  if (!fs.lstatSync(target).isDirectory()) throw new Error('Pacote precisa ser diretorio real.');
  verify(target);
  const manifest = JSON.parse(fs.readFileSync(path.join(target, MANIFEST_NAME), 'utf8'));
  const expected = [MANIFEST_NAME, ...Object.keys(manifest.files)].sort();
  const actual = sortedFiles(target);
  if (expected.length !== actual.length || expected.some((file, i) => file !== actual[i])) {
    throw new Error('Pacote contem arquivo extra ou ausente; apenas artefatos protegidos sao permitidos.');
  }
  return { version: manifest.version, files: Object.keys(manifest.files).length };
}

function bundlePrebuilt(sourceRoot, outputDir) {
  const root = path.resolve(sourceRoot);
  const metadata = verify(root); // verificacao antes de qualquer copia
  if (metadata !== true) throw new Error('Artefato nao verificado.');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, MANIFEST_NAME), 'utf8'));
  const dest = path.resolve(outputDir);
  if (dest === root) throw new Error('Destino nao pode sobrescrever a origem.');
  for (const protectedDir of ['lib', 'core', 'integrations', 'web']) {
    const inside = path.join(root, protectedDir);
    if (dest === inside || dest.startsWith(inside + path.sep)) {
      throw new Error('Destino nao pode estar dentro do runtime protegido: ' + protectedDir);
    }
  }
  if (fs.existsSync(dest)) throw new Error('Destino ja existe: recuse sobrescrita.');
  const parent = path.dirname(dest);
  fs.mkdirSync(parent, { recursive: true });
  const temp = fs.mkdtempSync(path.join(parent, '.exe-pro-bundle-stage-'));
  try {
    for (const rel of Object.keys(manifest.files).sort()) {
      const source = path.join(root, rel);
      const output = path.join(temp, rel);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.copyFileSync(source, output);
    }
    fs.copyFileSync(path.join(root, MANIFEST_NAME), path.join(temp, MANIFEST_NAME));
    const result = verifyBundle(temp); // verifica novamente DEPOIS da copia
    if (fs.existsSync(dest)) throw new Error('Destino passou a existir: recuse sobrescrita.');
    fs.renameSync(temp, dest);
    return { ...result, path: dest };
  } finally {
    if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true, force: true });
  }
}

function defaultDestination(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return path.join(root, '.prebuilt-dist', 'exe-pro-prebuilt-' + pkg.version);
}

if (require.main === module) {
  try {
    const command = process.argv[2];
    const root = path.resolve(__dirname, '..');
    const dest = process.argv[3] ? path.resolve(process.argv[3]) : defaultDestination(root);
    if (command === 'bundle') {
      const result = bundlePrebuilt(root, dest);
      console.log('EXE PRO pacote verificado: ' + result.files + ' arquivos + manifesto, em ' + result.path);
    } else if (command === 'verify') {
      const result = verifyBundle(dest);
      console.log('EXE PRO pacote integro: ' + result.files + ' arquivos + manifesto.');
    } else throw new Error('Uso: node tools/bundle-prebuilt.js bundle|verify [diretorio]');
  } catch (err) {
    console.error('EXE PRO bundle:', err.message);
    process.exitCode = 1;
  }
}

module.exports = { sortedFiles, verifyBundle, bundlePrebuilt, defaultDestination };
