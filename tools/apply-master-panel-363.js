'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'master363');

function unpack(name){
  const f=path.join(dir,name+'.b64');
  if(!fs.existsSync(f))throw new Error('Payload 3.6.3 ausente: '+f);
  return zlib.gunzipSync(Buffer.from(fs.readFileSync(f,'utf8').trim(),'base64'));
}

fs.writeFileSync(path.join(root,'web','master-panel-363.js'),unpack('browser-js'));
fs.writeFileSync(path.join(root,'web','master-panel-363.css'),unpack('browser-css'));

const generated=path.join(__dirname,'.master-panel-363.generated.js');
fs.writeFileSync(generated,unpack('patch'));
try{require(generated)}finally{try{fs.unlinkSync(generated)}catch{}}

cp.execFileSync(process.execPath,['--check',path.join(root,'web','master-panel-363.js')],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'server.js')],{stdio:'inherit'});

const html=fs.readFileSync(path.join(root,'web','index.html'),'utf8');
for(const needle of ['/master-panel-363.js','/master-panel-363.css','3.6.3']){
  if(!html.includes(needle))throw new Error('Painel Mestre 3.6.3 ausente do HTML: '+needle);
}
console.log('EXE PRO Cloud 3.6.3: Painel Mestre materializado e validado.');
