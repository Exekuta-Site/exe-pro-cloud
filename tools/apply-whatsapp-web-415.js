'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const VERSION='4.1.5';
const PREVIOUS='4.1.4';
const indexPath=path.join(root,'web','index.html');
const portalPath=path.join(root,'web','portal.html');
const serverPath=path.join(root,'server.js');
const serviceWorkerPath=path.join(root,'web','service-worker.js');
const browserPath=path.join(__dirname,'whatsapp415','browser.js');
const cssPath=path.join(__dirname,'whatsapp415','browser.css');

for(const file of [indexPath,portalPath,serverPath,serviceWorkerPath,browserPath,cssPath]){
  if(!fs.existsSync(file))throw new Error('Arquivo necessario ausente para WhatsApp Web 4.1.5: '+file);
}

let html=fs.readFileSync(indexPath,'utf8');
let portal=fs.readFileSync(portalPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
let serviceWorker=fs.readFileSync(serviceWorkerPath,'utf8');
const browser=fs.readFileSync(browserPath,'utf8');
const css=fs.readFileSync(cssPath,'utf8');

if(!server.includes("const VERSION = '"+PREVIOUS+"';")&&!server.includes("const VERSION = '"+VERSION+"';"))throw new Error('Versao do servidor nao encontrada.');
if(!html.includes('</head>')||!html.includes('</body>'))throw new Error('Estrutura HTML incompleta para WhatsApp Web 4.1.5.');

server=server.replace("const VERSION = '"+PREVIOUS+"';","const VERSION = '"+VERSION+"';");
if(!server.includes('EXE_PRO_415_WHATSAPP_WEB')){
  server=server.replace(
    "const VERSION = '"+VERSION+"';",
    "const VERSION = '"+VERSION+"';\n// EXE_PRO_415_WHATSAPP_WEB: WhatsApp Web usa a sessao do navegador do usuario."
  );
}

html=html.replaceAll(PREVIOUS,VERSION);
portal=portal.replaceAll(PREVIOUS,VERSION);
serviceWorker=serviceWorker.replace(/exe-pro-cloud-web-v[\d.]+/,'exe-pro-cloud-web-v'+VERSION);

if(!html.includes('whatsappWeb415Style')){
  html=html.replace('</head>','<style id="whatsappWeb415Style">'+css+'</style></head>');
}
if(!html.includes('whatsappWeb415Script')){
  html=html.replace('</body>','<script id="whatsappWeb415Script">'+browser+'</script></body>');
}

fs.writeFileSync(indexPath,html);
fs.writeFileSync(portalPath,portal);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(serviceWorkerPath,serviceWorker);
fs.writeFileSync(path.join(root,'web','whatsapp-web-415.js'),browser);
fs.writeFileSync(path.join(root,'web','whatsapp-web-415.css'),css);

for(const needle of [
  "const VERSION = '"+VERSION+"';",
  'EXE_PRO_415_WHATSAPP_WEB'
]){
  if(!server.includes(needle))throw new Error('Patch servidor incompleto: '+needle);
}
for(const needle of [
  'whatsappWeb415Style',
  'whatsappWeb415Script',
  'web.whatsapp.com',
  'Seu WhatsApp atual'
]){
  if(!html.includes(needle))throw new Error('Patch Admin incompleto: '+needle);
}
if(!portal.includes(VERSION))throw new Error('Portal nao foi atualizado para '+VERSION+'.');
if(!serviceWorker.includes('exe-pro-cloud-web-v'+VERSION))throw new Error('Cache PWA nao foi invalidado para '+VERSION+'.');

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','whatsapp-web-415.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud '+VERSION+': WhatsApp Web com o numero atual aplicado e validado.');
