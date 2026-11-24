'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');

function materialize(prefix, destination, count) {
  let b64 = '';
  for (let i = 0; i < count; i++) {
    const part = path.join(root, 'payload', `${prefix}.part${String(i).padStart(2, '0')}`);
    if (!fs.existsSync(part)) throw new Error(`Payload ausente: ${part}`);
    b64 += fs.readFileSync(part, 'utf8').trim();
  }
  const compressed = Buffer.from(b64, 'base64');
  const output = zlib.gunzipSync(compressed);
  const target = path.join(root, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output);
  console.log(`Materializado: ${destination} (${output.length} bytes)`);
}

materialize('server', 'server.js', 3);
materialize('index', 'web/index.html', 4);
console.log('EXE PRO Cloudways 3.5.0: fontes materializadas com sucesso.');
