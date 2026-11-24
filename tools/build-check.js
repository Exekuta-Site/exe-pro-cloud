'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');

const root=path.resolve(__dirname,'..');
const webDir=path.join(root,'web');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'core390','module-manifest.json'),'utf8'));

for(const rel of ['server.js','web/index.html','web/portal.html','web/manifest.webmanifest','web/service-worker.js','lib/schema.js']){
  if(!fs.existsSync(path.join(root,rel)))throw new Error('Arquivo obrigatorio ausente: '+rel);
}

const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const html=fs.readFileSync(path.join(root,'web','index.html'),'utf8');
const portal=fs.readFileSync(path.join(root,'web','portal.html'),'utf8');
const schema=fs.readFileSync(path.join(root,'lib','schema.js'),'utf8');
const serviceWorker=fs.readFileSync(path.join(root,'web','service-worker.js'),'utf8');

if(!server.includes("const VERSION = '"+pkg.version+"';"))throw new Error('Versao do server.js diverge do package.json: '+pkg.version);
if(!html.includes(pkg.version))throw new Error('Versao '+pkg.version+' ausente no Admin Cloud.');
if(!portal.includes(pkg.version))throw new Error('Versao '+pkg.version+' ausente no Portal.');

for(const mod of manifest.modules){
  if(!server.includes(mod.marker))throw new Error('Modulo ausente no server materializado: '+mod.key+' / '+mod.marker);
}
for(const table of manifest.requiredTables){
  if(!schema.includes('CREATE TABLE IF NOT EXISTS '+table+' '))throw new Error('Tabela essencial ausente do schema: '+table);
}

if(/^3\.9\./.test(pkg.version)){
  const coreMarkers=[
    "const CORE_VERSION='"+pkg.version+"'",
    "url.pathname==='/api/web/core-status'",
    "url.pathname==='/api/web/core-jobs/run'",
    "coreRunScheduled('notifications'",
    "coreRunScheduled('wordpress'",
    "coreRunScheduled('billing'",
    'coreStartupRecord().catch'
  ];
  for(const marker of coreMarkers)if(!server.includes(marker))throw new Error('Core 3.9.0 incompleto: '+marker);

  const unsafeSchedulers=[
    "setInterval(()=>wpCtrlTick().catch(()=>{}),15*60*1000).unref();",
    "setInterval(()=>notificationTick().catch(()=>{}),15*60*1000).unref();",
    "setInterval(()=>billingRecurringTick().catch(()=>{}),6*60*60*1000).unref();"
  ];
  for(const marker of unsafeSchedulers)if(server.includes(marker))throw new Error('Scheduler legado sem lock ainda presente: '+marker);
  if(pkg.version==='3.9.1'){
    for(const marker of ['TASK391_STATUS',"url.pathname==='/api/web/tasks'","url.pathname==='/api/portal/tasks"]){
      if(!server.includes(marker))throw new Error('Tarefas 3.9.1 incompletas: '+marker);
    }
  }
}
if(['4.1.4','4.1.5','4.2.0','4.3.0','4.4.0'].includes(pkg.version)){
  const routingMarkers=[
    'EXE_PRO_414_ROUTES',
    '/clientes',
    '/sites-wordpress',
    '/financeiro',
    '/projetos',
    '/seo',
    '/configuracoes'
  ];
  for(const marker of routingMarkers)if(!server.includes(marker))throw new Error('Routing '+pkg.version+' incompleto no servidor: '+marker);
  for(const marker of ['routing414Script','/dashboard','/clientes','/sites-wordpress','/financeiro','/projetos','/seo','/configuracoes']){
    if(!html.includes(marker))throw new Error('Routing '+pkg.version+' incompleto no Admin: '+marker);
  }
  if(!serviceWorker.includes('exe-pro-cloud-web-v'+pkg.version))throw new Error('Cache PWA nao foi invalidado para '+pkg.version+'.');
}
if(['4.1.5','4.2.0','4.3.0','4.4.0'].includes(pkg.version)){
  const whatsappMarkers=[
    'EXE_PRO_415_WHATSAPP_WEB',
    'whatsappWeb415Style',
    'whatsappWeb415Script',
    'web.whatsapp.com',
    'Seu WhatsApp atual'
  ];
  for(const marker of whatsappMarkers)if(!html.includes(marker)&&!server.includes(marker))throw new Error('WhatsApp Web 4.1.5 incompleto: '+marker);
  if(!fs.existsSync(path.join(webDir,'whatsapp-web-415.js')))throw new Error('Arquivo do WhatsApp Web 4.1.5 ausente.');
  if(!fs.existsSync(path.join(webDir,'whatsapp-web-415.css')))throw new Error('CSS do WhatsApp Web 4.1.5 ausente.');
}

if(pkg.version==='4.2.0'){
  const whatsappBusinessMarkers=[
    'WHATSAPP_BUSINESS_420',
    'whatsappBusiness420Style',
    'whatsappBusiness420Script',
    '/api/whatsapp/webhook',
    '/whatsapp',
    'Central de Conversas',
    'whatsapp_conversations',
    'whatsapp_messages',
    '/api/web/whatsapp/clear-failed',
    'whatsapp420ClearFailed',
    'Limpar falhas'
  ];
  for(const marker of whatsappBusinessMarkers)if(!html.includes(marker)&&!server.includes(marker))throw new Error('WhatsApp Business 4.2.0 incompleto: '+marker);
  for(const table of ['whatsapp_conversations','whatsapp_messages']){
    if(!schema.includes('CREATE TABLE IF NOT EXISTS '+table+' '))throw new Error('Tabela WhatsApp Business ausente: '+table);
  }
  if(!fs.existsSync(path.join(webDir,'whatsapp-business-420.js')))throw new Error('Arquivo JS do WhatsApp Business 4.2.0 ausente.');
  if(!fs.existsSync(path.join(webDir,'whatsapp-business-420.css')))throw new Error('CSS do WhatsApp Business 4.2.0 ausente.');
}

if(['4.3.0','4.4.0'].includes(pkg.version)){
  const coexistenceMarkers=[
    'WHATSAPP_BUSINESS_420',
    'WHATSAPP_COEXISTENCE_430',
    'whatsappCoexistence430Style',
    'whatsappCoexistence430Script',
    'whatsapp_business_app_onboarding',
    '/api/web/whatsapp/coexistence/config',
    'whatsapp_onboarding_states',
    'Central de Conversas',
    '/api/web/whatsapp/clear-failed',
    'whatsapp420ClearFailed',
    'Limpar falhas'
  ];
  for(const marker of coexistenceMarkers)if(!html.includes(marker)&&!server.includes(marker))throw new Error('WhatsApp QR oficial 4.3.0 incompleto: '+marker);
  const coexistenceRegexMarkers=[
    String.raw`enabled:/^\d+$/.test(appId)&&/^\d+$/.test(configId)`,
    String.raw`if(appId&&!/^\d+$/.test(appId))`,
    String.raw`if(configId&&!/^\d+$/.test(configId))`,
    String.raw`graphVersion:/^v\d+\.\d+$/.test(graphVersion)`,
    String.raw`if(!/^\d+$/.test(wabaId)||!/^\d+$/.test(phoneNumberId))`
  ];
  for(const marker of coexistenceRegexMarkers)if(!server.includes(marker))throw new Error('Validação numérica do WhatsApp QR 4.3.0 ausente: '+marker);
  if(server.includes(String.raw`/^\\d+$/.test`)||server.includes(String.raw`/^v\\d+\\.\\d+$/.test`))throw new Error('Regex do WhatsApp QR 4.3.0 contém escape duplicado.');
  const coexistenceSecurityMarkers=[
    String.raw`script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.facebook.com;`,
    String.raw`connect-src 'self' https://connect.facebook.net https://graph.facebook.com https://www.facebook.com https://web.facebook.com;`,
    String.raw`frame-src 'self' https://www.facebook.com https://web.facebook.com;`
  ];
  for(const marker of coexistenceSecurityMarkers)if(!server.includes(marker))throw new Error('CSP do WhatsApp QR 4.3.0 incompleto: '+marker);

  for(const table of ['whatsapp_conversations','whatsapp_messages','whatsapp_onboarding_states']){
    if(!schema.includes('CREATE TABLE IF NOT EXISTS '+table+' '))throw new Error('Tabela WhatsApp 4.3.0 ausente: '+table);
  }
  for(const file of ['whatsapp-business-420.js','whatsapp-business-420.css','whatsapp-coexistence-430.js','whatsapp-coexistence-430.css']){
    if(!fs.existsSync(path.join(webDir,file)))throw new Error('Arquivo WhatsApp ausente: '+file);
  }
}

if(pkg.version==='4.4.0'){
  const siteLeadMarkers=[
    'EXE_PRO_SITE_LEADS_440',
    "url.pathname==='/api/integrations/site-lead'",
    'SITE440_SECRET',
    'siteLead440Handle',
    'integrationKey'
  ];
  for(const marker of siteLeadMarkers)if(!server.includes(marker))throw new Error('Integracao de leads do site 4.4.0 incompleta: '+marker);
}
cp.execFileSync(process.execPath,['--check',path.join(root,'server.js')],{stdio:'inherit'});
for(const name of fs.readdirSync(webDir).filter(x=>x.endsWith('.js'))){
  cp.execFileSync(process.execPath,['--check',path.join(webDir,name)],{stdio:'inherit'});
}
JSON.parse(fs.readFileSync(path.join(root,'web','manifest.webmanifest'),'utf8'));

function sha(rel){
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');
}
console.log('EXE PRO Cloudways '+pkg.version+': build-check OK.');
console.log('server.js sha256: '+sha('server.js'));
console.log('web/index.html sha256: '+sha('web/index.html'));
console.log('web/portal.html sha256: '+sha('web/portal.html'));
