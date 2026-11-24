'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'client368');
const indexPath=path.join(root,'web','index.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.6.8 nao encontradas.');
const js=fs.readFileSync(path.join(dir,'browser.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'browser.css'),'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('clientParity368Style'))html=html.replace('</head>','<style id="clientParity368Style">'+css+'</style></head>');
if(!html.includes('clientParity368Script'))html=html.replace('</body>','<script id="clientParity368Script">'+js+'</script></body>');
html=html.replaceAll('3.6.7','3.6.8');

server=server.replaceAll('3.6.7','3.6.8');

let leadPatched=false;
server=server.replace(/lead:\s*new Set\(\[([^\]]*)\]\)/,(all,inner)=>{
  let out=inner;
  for(const field of ['legalName','document','clientOrigin']){
    const token="'"+field+"'";
    if(!out.includes(token))out+=(out.trim()?',' :'')+token;
  }
  leadPatched=true;
  return 'lead: new Set(['+out+'])';
});
if(!leadPatched)throw new Error('Whitelist de lead nao encontrada no patch 3.6.8.');

let recvPatched=false;
server=server.replace(/receivable:\s*new Set\(\[([^\]]*)\]\)/,(all,inner)=>{
  let out=inner;
  for(const field of ['contractId','originKey']){
    const token="'"+field+"'";
    if(!out.includes(token))out+=(out.trim()?',' :'')+token;
  }
  recvPatched=true;
  return 'receivable: new Set(['+out+'])';
});
if(!recvPatched)throw new Error('Whitelist de receivable nao encontrada no patch 3.6.8.');

fs.writeFileSync(indexPath,html);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','client-parity-368.js'),js);
fs.writeFileSync(path.join(root,'web','client-parity-368.css'),css);

for(const needle of ["const VERSION = '3.6.8';","'legalName'","'document'","'clientOrigin'","'contractId'","'originKey'"]){
  if(!server.includes(needle))throw new Error('Patch servidor 3.6.8 incompleto: '+needle);
}
for(const needle of ['clientParity368Script','NOME / NOME FANTASIA','SERVIÇOS CONTRATADOS / EM CARTEIRA','Financeiro inicial','3.6.8']){
  if(!html.includes(needle))throw new Error('Patch Web 3.6.8 incompleto: '+needle);
}

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','client-parity-368.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.6.8: cadastro completo de cliente em paridade com Windows aplicado.');
