'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'tasks391');
const indexPath=path.join(root,'web','index.html');
const portalPath=path.join(root,'web','portal.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(portalPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.9.1 nao encontradas.');

const adminJs=fs.readFileSync(path.join(dir,'admin.js'),'utf8');
const adminCss=fs.readFileSync(path.join(dir,'admin.css'),'utf8');
const portalJs=fs.readFileSync(path.join(dir,'portal.js'),'utf8');
const portalCss=fs.readFileSync(path.join(dir,'portal.css'),'utf8');
const serverSnippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');

let html=fs.readFileSync(indexPath,'utf8');
let portal=fs.readFileSync(portalPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('tasks391Style'))html=html.replace('</head>','<style id="tasks391Style">'+adminCss+'</style></head>');
if(!html.includes('tasks391Script'))html=html.replace('</body>','<script id="tasks391Script">'+adminJs+'</script></body>');
if(!portal.includes('portalTasks391Style'))portal=portal.replace('</head>','<style id="portalTasks391Style">'+portalCss+'</style></head>');
if(!portal.includes('portalTasks391Script'))portal=portal.replace('</body>','<script id="portalTasks391Script">'+portalJs+'</script></body>');

html=html.replaceAll('3.9.0','3.9.1');
portal=portal.replaceAll('3.9.0','3.9.1');
server=server.replaceAll('3.9.0','3.9.1');

if(!server.includes('const TASK391_STATUS=')){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor guardKey nao encontrado para Tarefas 3.9.1.');
  server=server.replace(anchor,()=>'\n'+serverSnippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/web/tasks'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas nao encontrado para Tarefas 3.9.1.');
  server=server.replace(anchor,()=>routes+'\n'+anchor);
}

fs.writeFileSync(indexPath,html);
fs.writeFileSync(portalPath,portal);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','tasks-391.js'),adminJs);
fs.writeFileSync(path.join(root,'web','tasks-391.css'),adminCss);
fs.writeFileSync(path.join(root,'web','portal-tasks-391.js'),portalJs);
fs.writeFileSync(path.join(root,'web','portal-tasks-391.css'),portalCss);

const requiredServer=[
  "const VERSION = '3.9.1';",
  "const CORE_VERSION='3.9.1'",
  'TASK391_STATUS',
  'task_items',
  "url.pathname==='/api/web/tasks'",
  "url.pathname==='/api/portal/tasks'",
  'Tarefas, Equipe e SLA'
];
for(const needle of requiredServer){
  if(!server.includes(needle))throw new Error('Patch servidor 3.9.1 incompleto: '+needle);
}
for(const needle of ['tasks391Script','Tarefas & SLA','3.9.1']){
  if(!html.includes(needle))throw new Error('Patch Admin Tarefas 3.9.1 incompleto: '+needle);
}
for(const needle of ['portalTasks391Script','Tarefas e entregas','Acompanhamento']){
  if(!portal.includes(needle))throw new Error('Portal Tarefas 3.9.1 incompleto: '+needle);
}

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','tasks-391.js')],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','portal-tasks-391.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.9.1: Tarefas, Equipe e SLA aplicados e validados.');
