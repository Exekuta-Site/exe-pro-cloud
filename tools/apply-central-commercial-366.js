'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'commercial366');
const indexPath=path.join(root,'web','index.html');
const serverPath=path.join(root,'server.js');

function unpack(name){
  const f=path.join(dir,name+'.b64');
  if(!fs.existsSync(f))throw new Error('Payload 3.6.6 ausente: '+f);
  return zlib.gunzipSync(Buffer.from(fs.readFileSync(f,'utf8').trim(),'base64')).toString('utf8');
}

if(!fs.existsSync(indexPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.6.6 nao encontradas.');
let html=fs.readFileSync(indexPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
const js=unpack('browser-js');
const css=unpack('browser-css');

if(!html.includes('centralCommercial366'))html=html.replace('</head>','<style id="centralCommercial366">'+css+'</style></head>');
if(!html.includes('centralCommercial366Script'))html=html.replace('</body>','<script id="centralCommercial366Script">'+js+'</script></body>');
html=html.replaceAll('3.6.5','3.6.6');
fs.writeFileSync(indexPath,html);

server=server.replaceAll('3.6.5','3.6.6');

const brandTail="brandingVersion:'v1'};";
const brandTailNew="brandingVersion:'v1',commercialAutoEnabled:true,commercialFirstContactHours:4,commercialNoResponseDays:2,commercialStaleDays:7,commercialProposalDays:3,commercialDefaultHour:9};";
if(server.includes(brandTail))server=server.replace(brandTail,brandTailNew);

const normalizeAnchor="out.proposalValidityDays=Math.max(1,Math.min(365,Number(out.proposalValidityDays||15)));out.brandingVersion";
const normalizeNew="out.proposalValidityDays=Math.max(1,Math.min(365,Number(out.proposalValidityDays||15)));out.commercialAutoEnabled=out.commercialAutoEnabled!==false;out.commercialFirstContactHours=Math.max(1,Math.min(72,Number(out.commercialFirstContactHours||4)));out.commercialNoResponseDays=Math.max(1,Math.min(30,Number(out.commercialNoResponseDays||2)));out.commercialStaleDays=Math.max(1,Math.min(180,Number(out.commercialStaleDays||7)));out.commercialProposalDays=Math.max(1,Math.min(60,Number(out.commercialProposalDays||3)));out.commercialDefaultHour=Math.max(7,Math.min(20,Number(out.commercialDefaultHour||9)));out.brandingVersion";
if(server.includes(normalizeAnchor))server=server.replace(normalizeAnchor,normalizeNew);

let whitelistPatched=false;
server=server.replace(/lead:\s*new Set\(\[([^\]]*)\]\)/,(all,inner)=>{
  let out=inner;
  for(const field of ['lastContactChannel','lastContactNote']){
    const token="'"+field+"'";
    if(!out.includes(token))out+=(out.trim()?',' :'')+token;
  }
  whitelistPatched=true;
  return 'lead: new Set(['+out+'])';
});
if(!whitelistPatched)throw new Error('Whitelist de lead nao encontrada no patch 3.6.6.');

for(const needle of ["const VERSION = '3.6.6';",'commercialFirstContactHours:4','commercialNoResponseDays:2','commercialStaleDays:7','commercialProposalDays:3','commercialDefaultHour:9',"'lastContactChannel'","'lastContactNote'"]){
  if(!server.includes(needle))throw new Error('Patch 3.6.6 incompleto no servidor: '+needle);
}
for(const needle of ['centralCommercial366Script','CENTRAL COMERCIAL INTELIGENTE','3.6.6']){
  if(!html.includes(needle))throw new Error('Patch 3.6.6 incompleto no HTML: '+needle);
}

fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','central-commercial-366.js'),js);
fs.writeFileSync(path.join(root,'web','central-commercial-366.css'),css);
cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','central-commercial-366.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.6.6: Central Comercial Inteligente aplicada.');
