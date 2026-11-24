'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'portal381');
const indexPath=path.join(root,'web','index.html');
const portalPath=path.join(root,'web','portal.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(portalPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.8.1 nao encontradas.');
const adminJs=fs.readFileSync(path.join(dir,'admin.js'),'utf8');
const adminCss=fs.readFileSync(path.join(dir,'admin.css'),'utf8');
const portalJs=fs.readFileSync(path.join(dir,'portal.js'),'utf8');
const portalCss=fs.readFileSync(path.join(dir,'portal.css'),'utf8');
const serverSnippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let portal=fs.readFileSync(portalPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('portalOps381Style'))html=html.replace('</head>','<style id="portalOps381Style">'+adminCss+'</style></head>');
if(!html.includes('portalOps381Script'))html=html.replace('</body>','<script id="portalOps381Script">'+adminJs+'</script></body>');
if(!portal.includes('portalClientOps381Style'))portal=portal.replace('</head>','<style id="portalClientOps381Style">'+portalCss+'</style></head>');
if(!portal.includes('portalClientOps381Script'))portal=portal.replace('</body>','<script id="portalClientOps381Script">'+portalJs+'</script></body>');

html=html.replaceAll('3.8.0','3.8.1');
portal=portal.replaceAll('3.8.0','3.8.1');
server=server.replaceAll('3.8.0','3.8.1');

if(!server.includes('const PORTAL_FILE_MAX_BYTES=')){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor guardKey nao encontrado para 3.8.1.');
  server=server.replace(anchor,()=> '\n'+serverSnippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/portal/operations'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas nao encontrado para 3.8.1.');
  server=server.replace(anchor,()=>routes+'\n'+anchor);
}

fs.writeFileSync(indexPath,html);
fs.writeFileSync(portalPath,portal);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','portal-operations-381.js'),portalJs);
fs.writeFileSync(path.join(root,'web','portal-operations-381.css'),portalCss);
fs.writeFileSync(path.join(root,'web','portal-admin-381.js'),adminJs);
fs.writeFileSync(path.join(root,'web','portal-admin-381.css'),adminCss);

for(const needle of ["const VERSION = '3.8.1';","PORTAL_FILE_MAX_BYTES","portal_tickets","portal_files","portal_payment_proofs","url.pathname==='/api/portal/operations'","url.pathname==='/api/web/client-portal/operations'"]){
  if(!server.includes(needle))throw new Error('Patch servidor 3.8.1 incompleto: '+needle);
}
for(const needle of ['portalOps381Script','Atendimento Portal','3.8.1']){
  if(!html.includes(needle))throw new Error('Patch Admin 3.8.1 incompleto: '+needle);
}
for(const needle of ['portalClientOps381Script','Chamados','Arquivos','Linha do tempo']){
  if(!portal.includes(needle))throw new Error('Portal 3.8.1 incompleto: '+needle);
}

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','portal-admin-381.js')],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','portal-operations-381.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.8.1: Chamados, Arquivos, Comprovantes e Timeline aplicados.');
