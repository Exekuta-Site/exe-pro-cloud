'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'prospect365');
const indexPath=path.join(root,'web','index.html');
const serverPath=path.join(root,'server.js');

function unpack(name){
  const f=path.join(dir,name+'.b64');
  if(!fs.existsSync(f))throw new Error('Payload 3.6.5 ausente: '+f);
  return zlib.gunzipSync(Buffer.from(fs.readFileSync(f,'utf8').trim(),'base64')).toString('utf8');
}

if(!fs.existsSync(indexPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.6.5 nao encontradas.');
let html=fs.readFileSync(indexPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
const js=unpack('browser-js');
const css=unpack('browser-css');

if(!html.includes('prospectIntelligence365'))html=html.replace('</head>','<style id="prospectIntelligence365">'+css+'</style></head>');
if(!html.includes('prospectIntelligence365Script'))html=html.replace('</body>','<script id="prospectIntelligence365Script">'+js+'</script></body>');
html=html.replaceAll('3.6.4','3.6.5');
fs.writeFileSync(indexPath,html);

server=server.replaceAll('3.6.4','3.6.5');

const extraLeadFields=['instagram','facebook','mapsUrl','placeId','rating','reviews','photoName','photoAttribution','category','openNow','leadScore','leadScoreBand','prospectedAt','searchLabel','searchQuery','digitalPresence','whatsappProbable','googleResult'];
let patched=false;
server=server.replace(/lead:\s*new Set\(\[([^\]]*)\]\)/,(all,inner)=>{
  let out=inner;
  for(const field of extraLeadFields){
    const token="'"+field+"'";
    if(!out.includes(token))out+=(out.trim()?',' :'')+token;
  }
  patched=true;
  return 'lead: new Set(['+out+'])';
});
if(!patched)throw new Error('Whitelist de leads nao encontrada para o patch 3.6.5.');
for(const field of extraLeadFields)if(!server.includes("'"+field+"'"))throw new Error('Campo 3.6.5 ausente da whitelist: '+field);

fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','prospect-intelligence-365.js'),js);
fs.writeFileSync(path.join(root,'web','prospect-intelligence-365.css'),css);

for(const needle of ["const VERSION = '3.6.5';",'prospectIntelligence365Script','Lead Score']){
  const source=needle.startsWith('const VERSION')?server:html;
  if(!source.includes(needle))throw new Error('Patch 3.6.5 incompleto: '+needle);
}

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','prospect-intelligence-365.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.6.5: paridade final da prospeccao e Lead Score aplicados.');
