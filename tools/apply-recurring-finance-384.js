'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'billing384');
const indexPath=path.join(root,'web','index.html');
const portalPath=path.join(root,'web','portal.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(portalPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.8.4 nao encontradas.');

const adminJs=fs.readFileSync(path.join(dir,'admin.js'),'utf8');
const adminCss=fs.readFileSync(path.join(dir,'admin.css'),'utf8');
const portalJs=fs.readFileSync(path.join(dir,'portal.js'),'utf8');
const portalCss=fs.readFileSync(path.join(dir,'portal.css'),'utf8');
const serverSnippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');

let html=fs.readFileSync(indexPath,'utf8');
let portal=fs.readFileSync(portalPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('billing384Style'))html=html.replace('</head>','<style id="billing384Style">'+adminCss+'</style></head>');
if(!html.includes('billing384Script'))html=html.replace('</body>','<script id="billing384Script">'+adminJs+'</script></body>');
if(!portal.includes('portalBilling384Style'))portal=portal.replace('</head>','<style id="portalBilling384Style">'+portalCss+'</style></head>');
if(!portal.includes('portalBilling384Script'))portal=portal.replace('</body>','<script id="portalBilling384Script">'+portalJs+'</script></body>');

html=html.replaceAll('3.8.3','3.8.4');
portal=portal.replaceAll('3.8.3','3.8.4');
server=server.replaceAll('3.8.3','3.8.4');

if(!server.includes('const BILLING_PROFILE_DEFAULT=')){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor guardKey nao encontrado para Financeiro 3.8.4.');
  server=server.replace(anchor,()=>'\n'+serverSnippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/web/billing-recurring'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas nao encontrado para Financeiro 3.8.4.');
  server=server.replace(anchor,()=>routes+'\n'+anchor);
}
if(!server.includes('billingRecurringTick().catch')){
  const anchor="setInterval(()=>notificationTick().catch(()=>{}),15*60*1000).unref();";
  if(!server.includes(anchor))throw new Error('Anchor scheduler de notificacoes nao encontrado para Financeiro 3.8.4.');
  server=server.replace(anchor,anchor+"\nsetTimeout(()=>billingRecurringTick().catch(()=>{}),45000).unref();\nsetInterval(()=>billingRecurringTick().catch(()=>{}),6*60*60*1000).unref();");
}

fs.writeFileSync(indexPath,html);
fs.writeFileSync(portalPath,portal);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','billing-recurring-384.js'),adminJs);
fs.writeFileSync(path.join(root,'web','billing-recurring-384.css'),adminCss);
fs.writeFileSync(path.join(root,'web','portal-billing-384.js'),portalJs);
fs.writeFileSync(path.join(root,'web','portal-billing-384.css'),portalCss);

for(const needle of [
  "const VERSION = '3.8.4';",
  'BILLING_PROFILE_DEFAULT',
  'billing_profiles',
  'billing_invoices',
  'billing_payments',
  "url.pathname==='/api/web/billing-recurring'",
  "url.pathname==='/api/portal/billing'",
  'billingRecurringTick().catch'
]){
  if(!server.includes(needle))throw new Error('Patch servidor 3.8.4 incompleto: '+needle);
}
for(const needle of ['billing384Script','Financeiro Recorrente','3.8.4']){
  if(!html.includes(needle))throw new Error('Patch Admin 3.8.4 incompleto: '+needle);
}
for(const needle of ['portalBilling384Script','Mensalidades e composição','Saldo atualizado']){
  if(!portal.includes(needle))throw new Error('Portal Financeiro 3.8.4 incompleto: '+needle);
}

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','billing-recurring-384.js')],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','portal-billing-384.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.8.4: Financeiro Recorrente Avancado aplicado e validado.');
