'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'core390');
const indexPath=path.join(root,'web','index.html');
const portalPath=path.join(root,'web','portal.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(portalPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.9.0 nao encontradas.');

const adminJs=fs.readFileSync(path.join(dir,'admin.js'),'utf8');
const adminCss=fs.readFileSync(path.join(dir,'admin.css'),'utf8');
const serverSnippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');

let html=fs.readFileSync(indexPath,'utf8');
let portal=fs.readFileSync(portalPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('core390Style'))html=html.replace('</head>','<style id="core390Style">'+adminCss+'</style></head>');
if(!html.includes('core390Script'))html=html.replace('</body>','<script id="core390Script">'+adminJs+'</script></body>');

html=html.replaceAll('3.8.4','3.9.0');
portal=portal.replaceAll('3.8.4','3.9.0');
server=server.replaceAll('3.8.4','3.9.0');

if(!server.includes("const CORE_VERSION='3.9.0'")){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor guardKey nao encontrado para Core 3.9.0.');
  server=server.replace(anchor,()=>'\n'+serverSnippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/web/core-status'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas nao encontrado para Core 3.9.0.');
  server=server.replace(anchor,()=>routes+'\n'+anchor);
}

const schedulerPatches=[
  ["setTimeout(()=>wpCtrlTick().catch(()=>{}),60000).unref();","setTimeout(()=>coreRunScheduled('wordpress',14*60*1000,false,'scheduler').catch(()=>{}),60000).unref();"],
  ["setInterval(()=>wpCtrlTick().catch(()=>{}),15*60*1000).unref();","setInterval(()=>coreRunScheduled('wordpress',14*60*1000,false,'scheduler').catch(()=>{}),15*60*1000).unref();"],
  ["setTimeout(()=>notificationTick().catch(()=>{}),30000).unref();","setTimeout(()=>coreRunScheduled('notifications',14*60*1000,false,'scheduler').catch(()=>{}),30000).unref();"],
  ["setInterval(()=>notificationTick().catch(()=>{}),15*60*1000).unref();","setInterval(()=>coreRunScheduled('notifications',14*60*1000,false,'scheduler').catch(()=>{}),15*60*1000).unref();"],
  ["setTimeout(()=>billingRecurringTick().catch(()=>{}),45000).unref();","setTimeout(()=>coreRunScheduled('billing',20*60*1000,false,'scheduler').catch(()=>{}),45000).unref();"],
  ["setInterval(()=>billingRecurringTick().catch(()=>{}),6*60*60*1000).unref();","setInterval(()=>coreRunScheduled('billing',20*60*1000,false,'scheduler').catch(()=>{}),6*60*60*1000).unref();"]
];
for(const [from,to] of schedulerPatches){
  if(server.includes(from))server=server.replace(from,to);
}
if(!server.includes('coreStartupRecord().catch')){
  const anchor="start().catch(err=>{console.error('Falha ao iniciar EXE PRO Cloud:',err);process.exit(1)});";
  if(!server.includes(anchor))throw new Error('Anchor start() nao encontrado para startup check 3.9.0.');
  server=server.replace(anchor,anchor+"\nsetTimeout(()=>coreStartupRecord().catch(()=>{}),15000).unref();");
}

fs.writeFileSync(indexPath,html);
fs.writeFileSync(portalPath,portal);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','core-health-390.js'),adminJs);
fs.writeFileSync(path.join(root,'web','core-health-390.css'),adminCss);

const requiredServer=[
  "const VERSION = '3.9.0';",
  "const CORE_VERSION='3.9.0'",
  'core_job_locks',
  'core_job_runs',
  "url.pathname==='/api/web/core-status'",
  "url.pathname==='/api/web/core-jobs/run'",
  "coreRunScheduled('notifications'",
  "coreRunScheduled('wordpress'",
  "coreRunScheduled('billing'",
  'coreStartupRecord().catch'
];
for(const needle of requiredServer){
  if(!server.includes(needle))throw new Error('Patch servidor 3.9.0 incompleto: '+needle);
}
for(const needle of ['core390Script','Saúde do Core','3.9.0']){
  if(!html.includes(needle))throw new Error('Patch Admin Core 3.9.0 incompleto: '+needle);
}
if(!portal.includes('3.9.0'))throw new Error('Portal nao foi atualizado para 3.9.0.');

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','core-health-390.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.9.0: Core Stability & Consolidation aplicado e validado.');
