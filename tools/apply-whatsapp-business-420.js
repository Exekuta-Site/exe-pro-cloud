'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const VERSION='4.2.0';
const PREVIOUS='4.1.5';
const root=path.resolve(__dirname,'..');
const indexPath=path.join(root,'web','index.html');
const portalPath=path.join(root,'web','portal.html');
const serverPath=path.join(root,'server.js');
const serviceWorkerPath=path.join(root,'web','service-worker.js');
const dir=path.join(__dirname,'whatsapp420');

for(const file of [indexPath,portalPath,serverPath,serviceWorkerPath]){
  if(!fs.existsSync(file))throw new Error('Arquivo necessário ausente para WhatsApp Business 4.2.0: '+file);
}
const browser=fs.readFileSync(path.join(dir,'browser.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'browser.css'),'utf8');
const snippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let portal=fs.readFileSync(portalPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
let serviceWorker=fs.readFileSync(serviceWorkerPath,'utf8');

if(!server.includes("const VERSION = '"+PREVIOUS+"';")&&!server.includes("const VERSION = '"+VERSION+"';"))throw new Error('Versão base não encontrada para WhatsApp Business 4.2.0.');
server=server.replace("const VERSION = '"+PREVIOUS+"';","const VERSION = '"+VERSION+"';");
if(!server.includes('WHATSAPP_BUSINESS_420')){
  const anchor="const VERSION = '"+VERSION+"';";
  server=server.replace(anchor,anchor+"\n// WHATSAPP_BUSINESS_420: Central de Conversas oficial.");
}
html=html.replaceAll(PREVIOUS,VERSION);
portal=portal.replaceAll(PREVIOUS,VERSION);
serviceWorker=serviceWorker.replaceAll(PREVIOUS,VERSION);
if(!html.includes("path:'/whatsapp'")){
  const oldRoute="{path:'/notificacoes',sections:['notifications','notificacoes'],labels:['notificacoes']},";
  const newRoute=oldRoute+"{path:'/whatsapp',sections:['whatsappBusiness','whatsapp-business','whatsapp'],labels:['whatsapp','business']},";
  if(html.includes(oldRoute))html=html.replace(oldRoute,newRoute);
}
server=server.replace("'/notificacoes','/saude-core'","'/notificacoes','/whatsapp','/saude-core'");
if(!html.includes('whatsappBusiness420Style'))html=html.replace('</head>','<style id="whatsappBusiness420Style">'+css+'</style></head>');
if(!html.includes('whatsappBusiness420Script'))html=html.replace('</body>','<script id="whatsappBusiness420Script">'+browser+'</script></body>');
if(!server.includes('const WHATSAPP_BUSINESS_420=')){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor de servidor ausente para WhatsApp Business 4.2.0.');
  server=server.replace(anchor,'\n'+snippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/whatsapp/webhook'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas ausente para WhatsApp Business 4.2.0.');
  server=server.replace(anchor,routes+'\n'+anchor);
}
fs.writeFileSync(indexPath,html);
fs.writeFileSync(portalPath,portal);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(serviceWorkerPath,serviceWorker);
fs.writeFileSync(path.join(root,'web','whatsapp-business-420.js'),browser);
fs.writeFileSync(path.join(root,'web','whatsapp-business-420.css'),css);
for(const needle of ["const VERSION = '"+VERSION+"';",'WHATSAPP_BUSINESS_420',"/api/whatsapp/webhook",'whatsapp_conversations','whatsapp_messages']){
  if(!server.includes(needle))throw new Error('Patch de servidor incompleto: '+needle);
}
for(const needle of ['whatsappBusiness420Style','whatsappBusiness420Script','Central de Conversas','WhatsApp Business']){
  if(!html.includes(needle))throw new Error('Patch de interface incompleto: '+needle);
}
if(!portal.includes(VERSION))throw new Error('Portal não foi atualizado para '+VERSION+'.');
if(!serviceWorker.includes('exe-pro-cloud-web-v'+VERSION))throw new Error('Cache PWA não foi invalidado para '+VERSION+'.');
cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','whatsapp-business-420.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud '+VERSION+': WhatsApp Business Central de Conversas aplicada e validada.');