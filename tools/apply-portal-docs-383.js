'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'portal383');
const indexPath=path.join(root,'web','index.html');
const portalPath=path.join(root,'web','portal.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(portalPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.8.3 nao encontradas.');
const adminJs=fs.readFileSync(path.join(dir,'admin.js'),'utf8');
const adminCss=fs.readFileSync(path.join(dir,'admin.css'),'utf8');
const portalJs=fs.readFileSync(path.join(dir,'portal.js'),'utf8');
const portalCss=fs.readFileSync(path.join(dir,'portal.css'),'utf8');
const serverSnippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let portal=fs.readFileSync(portalPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('portalDocs383Style'))html=html.replace('</head>','<style id="portalDocs383Style">'+adminCss+'</style></head>');
if(!html.includes('portalDocs383Script'))html=html.replace('</body>','<script id="portalDocs383Script">'+adminJs+'</script></body>');
if(!portal.includes('portalClientDocs383Style'))portal=portal.replace('</head>','<style id="portalClientDocs383Style">'+portalCss+'</style></head>');
if(!portal.includes('portalClientDocs383Script'))portal=portal.replace('</body>','<script id="portalClientDocs383Script">'+portalJs+'</script></body>');

html=html.replaceAll('3.8.2','3.8.3');
portal=portal.replaceAll('3.8.2','3.8.3');
server=server.replaceAll('3.8.2','3.8.3');

if(!server.includes('const PORTAL_DOC_TYPES=')){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor guardKey nao encontrado para 3.8.3.');
  server=server.replace(anchor,()=> '\n'+serverSnippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/portal/documents'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas nao encontrado para 3.8.3.');
  server=server.replace(anchor,()=>routes+'\n'+anchor);
}

fs.writeFileSync(indexPath,html);
fs.writeFileSync(portalPath,portal);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','portal-docs-383.js'),portalJs);
fs.writeFileSync(path.join(root,'web','portal-docs-383.css'),portalCss);
fs.writeFileSync(path.join(root,'web','portal-docs-admin-383.js'),adminJs);
fs.writeFileSync(path.join(root,'web','portal-docs-admin-383.css'),adminCss);

for(const needle of ["const VERSION = '3.8.3';","PORTAL_DOC_TYPES","portal_documents","portal_document_decisions","url.pathname==='/api/portal/documents'","url.pathname==='/api/web/client-portal/documents'"]){
  if(!server.includes(needle))throw new Error('Patch servidor 3.8.3 incompleto: '+needle);
}
for(const needle of ['portalDocs383Script','Aprovações Portal','3.8.3']){
  if(!html.includes(needle))throw new Error('Patch Admin 3.8.3 incompleto: '+needle);
}
for(const needle of ['portalClientDocs383Script','Propostas e contratos','Aceite eletrônico']){
  if(!portal.includes(needle))throw new Error('Portal 3.8.3 incompleto: '+needle);
}

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','portal-docs-admin-383.js')],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','portal-docs-383.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.8.3: Propostas, Contratos e aceite no Portal aplicados.');
