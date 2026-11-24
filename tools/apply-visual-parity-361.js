'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');

const root=path.resolve(__dirname,'..');
let b64='';
for(let i=0;i<2;i++){
  const f=path.join(__dirname,'visual361',`part${String(i).padStart(2,'0')}`);
  if(!fs.existsSync(f))throw new Error(`Visual parity 3.6.1 payload ausente: ${f}`);
  b64+=fs.readFileSync(f,'utf8').trim();
}
const code=zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8');
const generated=path.join(__dirname,'.visual-parity-361.generated.js');
fs.writeFileSync(generated,code);
try{require(generated)}finally{try{fs.unlinkSync(generated)}catch{}}
console.log('EXE PRO Cloud 3.6.1: paridade visual Windows/Cloud aplicada.');
