'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const VERSION='4.3.0';
const PREVIOUS='4.2.0';
const root=path.resolve(__dirname,'..');
const indexPath=path.join(root,'web','index.html');
const portalPath=path.join(root,'web','portal.html');
const serverPath=path.join(root,'server.js');
const schemaPath=path.join(root,'lib','schema.js');
const serviceWorkerPath=path.join(root,'web','service-worker.js');
const manifestPath=path.join(__dirname,'core390','module-manifest.json');
const dir=path.join(__dirname,'whatsapp430');

for(const file of [indexPath,portalPath,serverPath,schemaPath,serviceWorkerPath,manifestPath]){
  if(!fs.existsSync(file))throw new Error('Arquivo necessário ausente para WhatsApp QR 4.3.0: '+file);
}
const browser=fs.readFileSync(path.join(dir,'browser.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'browser.css'),'utf8');
const snippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let portal=fs.readFileSync(portalPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
let schema=fs.readFileSync(schemaPath,'utf8');
let serviceWorker=fs.readFileSync(serviceWorkerPath,'utf8');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));

if(!server.includes("const VERSION = '"+PREVIOUS+"';")&&!server.includes("const VERSION = '"+VERSION+"';"))throw new Error('Versão base não encontrada para WhatsApp QR 4.3.0.');
server=server.replaceAll(PREVIOUS,VERSION);
html=html.replaceAll(PREVIOUS,VERSION);
portal=portal.replaceAll(PREVIOUS,VERSION);
serviceWorker=serviceWorker.replaceAll(PREVIOUS,VERSION);
// Meta Embedded Signup oficial: a política precisa permitir somente os domínios usados pelo SDK/fluxo OAuth.
const cspScriptNeedle="script-src 'self' 'unsafe-inline'; connect-src 'self';";
const cspScriptReplacement="script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.facebook.com; connect-src 'self' https://connect.facebook.net https://graph.facebook.com https://www.facebook.com https://web.facebook.com;";
if(server.includes(cspScriptNeedle))server=server.replaceAll(cspScriptNeedle,cspScriptReplacement);
else if(!server.includes("https://connect.facebook.net"))throw new Error('CSP sem permissão para o SDK oficial da Meta.');
const cspFrameNeedle="base-uri 'self'; frame-ancestors 'none'";
const cspFrameReplacement="base-uri 'self'; frame-src 'self' https://www.facebook.com https://web.facebook.com; child-src 'self' https://www.facebook.com https://web.facebook.com; frame-ancestors 'none'";
const cspFrameObjectNeedle="object-src 'none'; frame-ancestors 'none'";
const cspFrameObjectReplacement="object-src 'none'; frame-src 'self' https://www.facebook.com https://web.facebook.com; child-src 'self' https://www.facebook.com https://web.facebook.com; frame-ancestors 'none'";
if(server.includes(cspFrameNeedle))server=server.replaceAll(cspFrameNeedle,cspFrameReplacement);
else if(server.includes(cspFrameObjectNeedle))server=server.replaceAll(cspFrameObjectNeedle,cspFrameObjectReplacement);
else if(!server.includes("frame-src 'self' https://www.facebook.com"))throw new Error('CSP sem frame-src para o Embedded Signup da Meta.');

if(!schema.includes('whatsapp_onboarding_states')){
  const schemaAnchor='\n'+String.fromCharCode(96)+';\n\nasync function initSchema';
  const onboardingSql='\nCREATE TABLE IF NOT EXISTS whatsapp_onboarding_states (\n  state_hash TEXT PRIMARY KEY,\n  username TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  expires_at TEXT NOT NULL,\n  consumed_at TEXT\n);\nCREATE INDEX IF NOT EXISTS idx_whatsapp_onboarding_states_expires\n  ON whatsapp_onboarding_states(expires_at);\n\n';
  if(!schema.includes(schemaAnchor))throw new Error('Anchor do schema ausente para WhatsApp QR 4.3.0.');
  schema=schema.replace(schemaAnchor,onboardingSql+schemaAnchor);
}
schema=schema.replace("['4.2.0','WhatsApp Business Central de Conversas',now]","['4.3.0','WhatsApp Business Central de Conversas + QR Code oficial',now]");

if(!server.includes('WHATSAPP_COEXISTENCE_430')){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor de servidor ausente para WhatsApp QR 4.3.0.');
  server=server.replace(anchor,'\n'+snippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/web/whatsapp/coexistence/config'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas ausente para WhatsApp QR 4.3.0.');
  server=server.replace(anchor,routes+'\n'+anchor);
}
if(!html.includes('whatsappCoexistence430Style'))html=html.replace('</head>','<style id="whatsappCoexistence430Style">'+css+'</style></head>');
if(!html.includes('whatsappCoexistence430Script'))html=html.replace('</body>','<script id="whatsappCoexistence430Script">'+browser+'</script></body>');

manifest.version=VERSION;
const business=manifest.modules.find(x=>x.key==='whatsapp-business');
if(business)business.version=VERSION;
if(!manifest.modules.some(x=>x.key==='whatsapp-coexistence')){
  manifest.modules.push({
    key:'whatsapp-coexistence',
    name:'WhatsApp Business Coexistência Oficial por QR Code',
    version:VERSION,
    marker:'WHATSAPP_COEXISTENCE_430',
    critical:false
  });
}
if(!manifest.requiredTables.includes('whatsapp_onboarding_states'))manifest.requiredTables.push('whatsapp_onboarding_states');

fs.writeFileSync(indexPath,html);
fs.writeFileSync(portalPath,portal);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(schemaPath,schema);
fs.writeFileSync(serviceWorkerPath,serviceWorker);
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'web','whatsapp-coexistence-430.js'),browser);
fs.writeFileSync(path.join(root,'web','whatsapp-coexistence-430.css'),css);

for(const needle of ["const VERSION = '"+VERSION+"';",'WHATSAPP_COEXISTENCE_430',"/api/web/whatsapp/coexistence/config",'whatsapp_onboarding_states','whatsapp_business_app_onboarding',"script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.facebook.com;","connect-src 'self' https://connect.facebook.net https://graph.facebook.com https://www.facebook.com https://web.facebook.com;","frame-src 'self' https://www.facebook.com https://web.facebook.com;"]){
  if(!server.includes(needle)&&!html.includes(needle))throw new Error('Patch de servidor/interface incompleto: '+needle);
}
if(!schema.includes('CREATE TABLE IF NOT EXISTS whatsapp_onboarding_states '))throw new Error('Tabela de onboarding ausente.');
if(!manifest.modules.some(x=>x.marker==='WHATSAPP_COEXISTENCE_430'))throw new Error('Manifesto do onboarding ausente.');
if(!portal.includes(VERSION))throw new Error('Portal não foi atualizado para '+VERSION+'.');
if(!serviceWorker.includes('exe-pro-cloud-web-v'+VERSION))throw new Error('Cache PWA não foi invalidado para '+VERSION+'.');
cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','whatsapp-coexistence-430.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud '+VERSION+': onboarding oficial por QR Code aplicado e validado.');