'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const indexPath=path.join(root,'web','index.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.7.1 nao encontradas.');
let html=fs.readFileSync(indexPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

html=html.replaceAll('3.7.0','3.7.1');
server=server.replaceAll('3.7.0','3.7.1');

function patchSet(type,fields){
  const start=type+': new Set([';
  const i=server.indexOf(start);
  if(i<0)throw new Error('Whitelist '+type+' nao encontrada no patch 3.7.1.');
  const contentStart=i+start.length;
  const end=server.indexOf('])',contentStart);
  if(end<0)throw new Error('Fim da whitelist '+type+' nao encontrado no patch 3.7.1.');
  let inner=server.slice(contentStart,end);
  for(const field of fields){
    const token="'"+field+"'";
    if(!inner.includes(token))inner+=(inner.trim()?',' :'')+token;
  }
  server=server.slice(0,contentStart)+inner+server.slice(end);
}
patchSet('lead',['clientServiceItems']);

fs.writeFileSync(indexPath,html);
fs.writeFileSync(serverPath,server);

for(const needle of ["const VERSION = '3.7.1';","'clientServiceItems'","WP_CTRL_TEMPLATE_DEFAULTS","exe-pro-connector-v1.1.0.zip"]){
  const source=needle.includes('exe-pro-connector')?server:server;
  if(!source.includes(needle))throw new Error('Patch servidor 3.7.1 incompleto: '+needle);
}
for(const needle of ['Serviços por site e valor','3 modelos editáveis','3.7.1']){
  if(!html.includes(needle))throw new Error('Patch Web 3.7.1 incompleto: '+needle);
}
const pluginPath=path.join(root,'web','downloads','exe-pro-connector-v1.1.0.zip');
if(!fs.existsSync(pluginPath)||fs.statSync(pluginPath).size<3000)throw new Error('Plugin WordPress 1.1 nao materializado.');

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.7.1: serviços por site e WordPress Maintenance Designer aplicados.');
