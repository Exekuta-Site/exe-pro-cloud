'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'client369');
const indexPath=path.join(root,'web','index.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.6.9 nao encontradas.');
const js=fs.readFileSync(path.join(dir,'browser.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'browser.css'),'utf8');
const serverSnippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('clientFix369Style'))html=html.replace('</head>','<style id="clientFix369Style">'+css+'</style></head>');
if(!html.includes('clientFix369Script'))html=html.replace('</body>','<script id="clientFix369Script">'+js+'</script></body>');
html=html.replaceAll('3.6.8','3.6.9');
server=server.replaceAll('3.6.8','3.6.9');

function patchSet(type,fields){
  const start=type+': new Set([';
  const i=server.indexOf(start);
  if(i<0)throw new Error('Whitelist '+type+' nao encontrada no patch 3.6.9.');
  const contentStart=i+start.length;
  const end=server.indexOf('])',contentStart);
  if(end<0)throw new Error('Fim da whitelist '+type+' nao encontrado no patch 3.6.9.');
  let inner=server.slice(contentStart,end);
  for(const field of fields){
    const token="'"+field+"'";
    if(!inner.includes(token))inner+=(inner.trim()?',' :'')+token;
  }
  server=server.slice(0,contentStart)+inner+server.slice(end);
}

patchSet('lead',['clientMonthlyAmount','clientBillingDay','clientPaymentMethod']);
patchSet('contract',['leadId']);
patchSet('receivable',['leadId','contractId','originKey']);

if(!server.includes('async function webDeleteEntity(')){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor guardKey nao encontrado para 3.6.9.');
  server=server.replace(anchor,'\n'+serverSnippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/web/entity/delete'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas nao encontrado para 3.6.9.');
  server=server.replace(anchor,routes+'\n'+anchor);
}

fs.writeFileSync(indexPath,html);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','client-fix-369.js'),js);
fs.writeFileSync(path.join(root,'web','client-fix-369.css'),css);

for(const needle of ["const VERSION = '3.6.9';","'clientMonthlyAmount'","'clientBillingDay'","'clientPaymentMethod'","contract: new Set","'leadId'","url.pathname==='/api/web/entity/delete'"]){
  if(!server.includes(needle))throw new Error('Patch servidor 3.6.9 incompleto: '+needle);
}
for(const needle of ['clientFix369Script','Mensalidade','Editar','Excluir','3.6.9']){
  if(!html.includes(needle))throw new Error('Patch Web 3.6.9 incompleto: '+needle);
}

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','client-fix-369.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.6.9: clientes, exclusao sincronizada e mensalidade corrigidos.');
