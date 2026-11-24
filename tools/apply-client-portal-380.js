'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'portal380');
const indexPath=path.join(root,'web','index.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.8.0 nao encontradas.');
const adminJs=fs.readFileSync(path.join(dir,'admin.js'),'utf8');
const adminCss=fs.readFileSync(path.join(dir,'admin.css'),'utf8');
const portalHtml=fs.readFileSync(path.join(dir,'portal.html'),'utf8');
const serverSnippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('clientPortal380Style'))html=html.replace('</head>','<style id="clientPortal380Style">'+adminCss+'</style></head>');
if(!html.includes('clientPortal380Script'))html=html.replace('</body>','<script id="clientPortal380Script">'+adminJs+'</script></body>');
html=html.replaceAll('3.7.1','3.8.0');
server=server.replaceAll('3.7.1','3.8.0');

if(!server.includes("const PORTAL_COOKIE='exe_portal_session'")){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor guardKey nao encontrado para Portal 3.8.0.');
  server=server.replace(anchor,()=> '\n'+serverSnippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/portal/login'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas nao encontrado para Portal 3.8.0.');
  server=server.replace(anchor,()=>routes+'\n'+anchor);
}

// Portal 3.8.0: na raiz, quando o host for portal.exekuta.com.br, nao servir o app principal
// (a rota do portal em routes.txt assume via condicao de host).
{
  const rootRouteOld="if(req.method==='GET'&&url.pathname==='/')return serveWebFile(res,'index.html');";
  const rootRouteNew="if(req.method==='GET'&&url.pathname==='/'&&String(req.headers.host||'').split(':')[0].toLowerCase()!=='portal.exekuta.com.br')return serveWebFile(res,'index.html');";
  if(server.includes(rootRouteOld))server=server.replace(rootRouteOld,rootRouteNew);
}

fs.writeFileSync(indexPath,html);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','portal.html'),portalHtml);
fs.writeFileSync(path.join(root,'web','client-portal-380.js'),adminJs);
fs.writeFileSync(path.join(root,'web','client-portal-380.css'),adminCss);

for(const needle of ["const VERSION = '3.8.0';","PORTAL_COOKIE","portal_users","url.pathname==='/api/portal/login'","url.pathname==='/api/web/client-portal/users'"]){
  if(!server.includes(needle))throw new Error('Patch servidor 3.8.0 incompleto: '+needle);
}
for(const needle of ['clientPortal380Script','Portal do Cliente','3.8.0']){
  if(!html.includes(needle))throw new Error('Patch Admin 3.8.0 incompleto: '+needle);
}
for(const needle of ['Portal do Cliente','Serviços e sites','Financeiro','Projetos','/api/portal/login']){
  if(!portalHtml.includes(needle))throw new Error('Portal HTML 3.8.0 incompleto: '+needle);
}

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','client-portal-380.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.8.0: Portal do Cliente materializado e validado.');
