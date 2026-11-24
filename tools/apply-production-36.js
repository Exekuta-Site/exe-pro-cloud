'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');

const root=path.resolve(__dirname,'..');
let b='';
for(let i=0;i<5;i++){
  const f=path.join(__dirname,'patch36',`part${String(i).padStart(2,'0')}`);
  if(!fs.existsSync(f)) throw new Error(`Patch 3.6.0 ausente: ${f}`);
  b+=fs.readFileSync(f,'utf8').trim();
}
const code=zlib.gunzipSync(Buffer.from(b,'base64')).toString('utf8');
const generated=path.join(__dirname,'.production-36.generated.js');
fs.writeFileSync(generated,code);
try{ require(generated); } finally { try{fs.unlinkSync(generated)}catch{} }
console.log('EXE PRO Cloudways 3.6.0: patch de produção aplicado.');
