'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const indexPath=path.join(root,'web','index.html');
const serverPath=path.join(root,'server.js');
const dir=path.join(__dirname,'notif367');

if(!fs.existsSync(indexPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.6.7 nao encontradas.');
const browserJs=fs.readFileSync(path.join(dir,'browser.js'),'utf8');
const browserCss=fs.readFileSync(path.join(dir,'browser.css'),'utf8');
const serverSnippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('notifications367Style'))html=html.replace('</head>','<style id="notifications367Style">'+browserCss+'</style></head>');
if(!html.includes('notifications367Script'))html=html.replace('</body>','<script id="notifications367Script">'+browserJs+'</script></body>');
html=html.replaceAll('3.6.6','3.6.7');

server=server.replaceAll('3.6.6','3.6.7');

let whitelistPatched=false;
server=server.replace(/lead:\s*new Set\(\[([^\]]*)\]\)/,(all,inner)=>{
  let out=inner;
  for(const field of ['billingNotificationsEnabled','notifyWhatsApp','notifyTelegram','notificationConsentAt','notificationConsentSource','notificationPreferenceUpdatedAt','telegramChatId','telegramLinkedAt']){
    const token="'"+field+"'";
    if(!out.includes(token))out+=(out.trim()?',' :'')+token;
  }
  whitelistPatched=true;
  return 'lead: new Set(['+out+'])';
});
if(!whitelistPatched)throw new Error('Whitelist de lead nao encontrada para 3.6.7.');

if(!server.includes('const NOTIFY_DEFAULT=')){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor guardKey nao encontrado para 3.6.7.');
  server=server.replace(anchor,'\n'+serverSnippet+'\nfunction guardKey(');
}

if(!server.includes("url.pathname==='/api/web/notifications'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas Cloud nao encontrado para 3.6.7.');
  server=server.replace(anchor,routes+'\n'+anchor);
}

if(!server.includes('notificationTick().catch')){
  const anchor="start().catch(err=>{console.error('Falha ao iniciar EXE PRO Cloud:',err);process.exit(1)});";
  if(!server.includes(anchor))throw new Error('Anchor start() nao encontrado para scheduler 3.6.7.');
  server=server.replace(anchor,anchor+"\nsetTimeout(()=>notificationTick().catch(()=>{}),30000).unref();\nsetInterval(()=>notificationTick().catch(()=>{}),15*60*1000).unref();");
}

fs.writeFileSync(indexPath,html);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','notifications-367.js'),browserJs);
fs.writeFileSync(path.join(root,'web','notifications-367.css'),browserCss);

for(const needle of ["const VERSION = '3.6.7';","url.pathname==='/api/web/notifications'","notification_outbox","billingNotificationsEnabled","telegramChatId","whatsappAccessToken"]){
  if(!server.includes(needle))throw new Error('Patch servidor 3.6.7 incompleto: '+needle);
}
for(const needle of ['notifications367Script','Central de Notificações','3.6.7']){
  if(!html.includes(needle))throw new Error('Patch Web 3.6.7 incompleto: '+needle);
}

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','notifications-367.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.6.7: WhatsApp/Telegram e cobrancas aplicados.');
