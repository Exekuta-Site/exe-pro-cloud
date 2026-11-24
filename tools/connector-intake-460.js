'use strict';
// EXE PRO 4.4.8 - Intake do EXE PRO Connector WordPress (fonte: Google Drive)
// Baixa o ZIP informado pelo usuario, extrai os fontes em texto para analise
// e deixa o pacote disponivel em web/downloads/. Nunca falha o build: em caso
// de problema de rede, registra aviso e segue.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const FILE_ID = '1LRu7RmwbPN6MrG1fvDWNGHZLO3X1TLwM';
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'web', 'downloads');
const workDir = path.join(__dirname, 'connector460');
const extractDir = path.join(workDir, 'extracted');
const zipTmp = path.join(workDir, 'connector-upload.zip');

function log(m) { console.log('connector-intake: ' + m); }
function warn(m) { console.warn('connector-intake: AVISO - ' + m); }

async function fetchZip() {
  const urls = [
    'https://drive.usercontent.google.com/download?id=' + FILE_ID + '&export=download&confirm=t',
    'https://drive.google.com/uc?export=download&id=' + FILE_ID
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { redirect: 'follow' });
      const buf = Buffer.from(await r.arrayBuffer());
      if (r.ok && buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) return buf;
      warn('resposta nao e um ZIP de ' + u + ' (status ' + r.status + ', ' + buf.length + ' bytes)');
    } catch (e) { warn('falha ao baixar ' + u + ': ' + e.message); }
  }
  return null;
}

// Parser ZIP minimalista (stored + deflate, com fallback para data descriptor)
function parseZip(buf) {
  const entries = [];
  let i = 0;
  while (i < buf.length - 4) {
    if (buf.readUInt32LE(i) !== 0x04034b50) { i++; continue; }
    const method = buf.readUInt16LE(i + 8);
    let compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nameLen).toString('utf8');
    const dataStart = i + 30 + nameLen + extraLen;
    let dataEnd = dataStart + compSize;
    if (compSize === 0) {
      let next = -1;
      for (let j = dataStart; j < buf.length - 4; j++) {
        const sig = buf.readUInt32LE(j);
        if (sig === 0x04034b50 || sig === 0x02014b50 || sig === 0x08064b50 || sig === 0x08074b50) { next = j; break; }
      }
      if (next < 0) break;
      dataEnd = next;
    }
    let content = null;
    try {
      const raw = buf.slice(dataStart, dataEnd);
      content = method === 0 ? raw : zlib.inflateRawSync(raw);
    } catch { content = null; }
    if (!name.endsWith('/')) entries.push({ name, content });
    i = dataEnd;
  }
  return entries;
}

function safeName(name) {
  if (name.includes('..')) return null;
  return name.replace(/[^\w.\-\/]/g, '_');
}

(async () => {
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(extractDir, { recursive: true });
    if (!fs.existsSync(zipTmp) || fs.statSync(zipTmp).size < 100) {
      const buf = await fetchZip();
      if (!buf) { warn('nao foi possivel baixar o plugin agora (o build segue); tentara de novo no proximo build'); process.exit(0); }
      fs.writeFileSync(zipTmp, buf);
      log('ZIP baixado do Google Drive (' + buf.length + ' bytes).');
    } else {
      log('ZIP em cache, baixando nao necessario (' + fs.statSync(zipTmp).size + ' bytes).');
    }
    const entries = parseZip(fs.readFileSync(zipTmp));
    const listing = [];
    let version = '';
    for (const e of entries) {
      if (!e.content) { listing.push(e.name + ' (nao extraido)'); continue; }
      const sn = safeName(e.name);
      if (!sn) continue;
      const dest = path.join(extractDir, sn);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, e.content);
      listing.push(e.name + ' (' + e.content.length + ' bytes)');
      const text = e.content.toString('utf8');
      if (!version && /Plugin\s+Name:/i.test(text)) {
        const m = text.match(/Version:\s*([0-9][0-9.]*)/i);
        if (m) version = m[1];
      }
    }
    fs.writeFileSync(path.join(workDir, 'EXTRACTED.md'), '# Plugin Connector recebido (Google Drive)\n\n- Arquivo: ' + FILE_ID + '\n- Version: ' + (version || 'desconhecida') + '\n\n' + listing.map(x => '- ' + x).join('\n') + '\n');
    if (version) {
      const finalZip = path.join(outDir, 'exe-pro-connector-v' + version + '.zip');
      fs.copyFileSync(zipTmp, finalZip);
      log('Pacote publicado em web/downloads/exe-pro-connector-v' + version + '.zip');
    } else {
      warn('versao do plugin nao detectada no cabecalho; zip mantido apenas em ' + zipTmp);
    }
    log(listing.length + ' arquivo(s) extraido(s) para tools/connector460/extracted/. Version: ' + (version || '?'));
  } catch (e) {
    warn('falha inesperada: ' + e.message + ' (o build segue)');
  }
  process.exit(0);
})();
