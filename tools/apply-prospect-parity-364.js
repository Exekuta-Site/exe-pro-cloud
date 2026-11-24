'use strict';
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'prospect364');
const indexPath=path.join(root,'web','index.html');
const serverPath=path.join(root,'server.js');

function unpack(name){
  const f=path.join(dir,name+'.b64');
  if(!fs.existsSync(f))throw new Error('Payload 3.6.4 ausente: '+f);
  return zlib.gunzipSync(Buffer.from(fs.readFileSync(f,'utf8').trim(),'base64')).toString('utf8');
}

if(!fs.existsSync(indexPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.6.4 nao encontradas.');
let html=fs.readFileSync(indexPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
const prospectJs=unpack('browser-js');
const prospectCss=unpack('browser-css');

const masterJsPath=path.join(root,'web','master-panel-363.js');
const masterCssPath=path.join(root,'web','master-panel-363.css');
if(fs.existsSync(masterCssPath)){
  const masterCss=fs.readFileSync(masterCssPath,'utf8');
  html=html.replace('<link rel="stylesheet" href="/master-panel-363.css">','<style id="masterPanel363Inline">'+masterCss+'</style>');
}
if(fs.existsSync(masterJsPath)){
  const masterJs=fs.readFileSync(masterJsPath,'utf8');
  html=html.replace('<script src="/master-panel-363.js"></script>','<script id="masterPanel363InlineScript">'+masterJs+'</script>');
}
if(!html.includes('prospectParity364')) html=html.replace('</head>','<style id="prospectParity364">'+prospectCss+'</style></head>');
if(!html.includes('prospectParity364Script')) html=html.replace('</body>','<script id="prospectParity364Script">'+prospectJs+'</script></body>');
html=html.replaceAll('3.6.3','3.6.4');
fs.writeFileSync(indexPath,html);

server=server.replace("const VERSION = '3.6.3';","const VERSION = '3.6.4';");
server=server.replaceAll('EXE PRO 3.6.3','EXE PRO 3.6.4');

const oldMask="places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri";
const newMask="places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryTypeDisplayName,places.currentOpeningHours,places.photos";
if(server.includes(oldMask))server=server.replace(oldMask,newMask);

const oldMap="results.maps=(j.places||[]).slice(0,limit).map(p=>({placeId:p.id||'',name:p.displayName?.text||'',address:p.formattedAddress||'',phone:p.internationalPhoneNumber||p.nationalPhoneNumber||'',website:p.websiteUri||'',rating:p.rating||0,reviews:p.userRatingCount||0,mapsUrl:p.googleMapsUri||'',source:'Google Maps',segment,city,state,region}))";
const newMap="results.maps=(j.places||[]).slice(0,limit).map(p=>({placeId:p.id||'',name:p.displayName?.text||'',address:p.formattedAddress||'',phone:p.internationalPhoneNumber||p.nationalPhoneNumber||'',website:p.websiteUri||'',rating:p.rating||0,reviews:p.userRatingCount||0,mapsUrl:p.googleMapsUri||'',category:p.primaryTypeDisplayName?.text||'',openNow:p.currentOpeningHours?.openNow,photoName:p.photos?.[0]?.name||'',photoAttribution:p.photos?.[0]?.authorAttributions?.[0]?.displayName||'',source:'Google Maps',segment,city,state,region}))";
if(server.includes(oldMap))server=server.replace(oldMap,newMap);

const prospectRoute="if(req.method==='POST'&&url.pathname==='/api/web/prospect'){const ss=await webAuth(req,res,true);if(!ss)return;if(roleRank(ss.role)<=1)return json(res,403,{ok:false,error:'Perfil somente leitura.'});const out=await webProspect(await readBody(req));return json(res,out.status,out.body)}";
if(!server.includes("url.pathname==='/api/web/place-photo'")){
  const photoRoute="if(req.method==='GET'&&url.pathname==='/api/web/place-photo'){const ss=await webAuth(req,res,false);if(!ss)return;const name=String(url.searchParams.get('name')||'').trim();if(!/^places\\/[^/]+\\/photos\\/[^/]+$/.test(name))return json(res,400,{ok:false,error:'Foto do Google Places invalida.'});const key=await getSecret('googlePlaces');if(!key)return json(res,503,{ok:false,error:'Google Places nao configurado na Cloud.'});const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const endpoint='https://places.googleapis.com/v1/'+name+'/media?maxWidthPx=1200&skipHttpRedirect=false&key='+encodeURIComponent(key),pr=await fetch(endpoint,{signal:controller.signal,redirect:'follow'});if(!pr.ok)return json(res,pr.status,{ok:false,error:'Nao foi possivel carregar a foto do Google Places.'});const buf=Buffer.from(await pr.arrayBuffer());res.writeHead(200,{'content-type':pr.headers.get('content-type')||'image/jpeg','content-length':buf.length,'cache-control':'private, max-age=86400','x-content-type-options':'nosniff'});return res.end(buf)}catch(e){return json(res,502,{ok:false,error:'Falha ao carregar foto do Google Places.'})}finally{clearTimeout(timer)}}";
  if(!server.includes(prospectRoute))throw new Error('Rota de prospeccao nao encontrada para inserir proxy de foto.');
  server=server.replace(prospectRoute,photoRoute+'\n    '+prospectRoute);
}

for(const needle of ["const VERSION = '3.6.4';",'places.photos','photoName:p.photos','/api/web/place-photo']){
  if(!server.includes(needle))throw new Error('Patch 3.6.4 incompleto no servidor: '+needle);
}
for(const needle of ['masterPanel363InlineScript','prospectParity364Script','3.6.4']){
  if(!html.includes(needle))throw new Error('Patch 3.6.4 incompleto no HTML: '+needle);
}
fs.writeFileSync(serverPath,server);

fs.writeFileSync(path.join(root,'web','prospect-parity-364.js'),prospectJs);
fs.writeFileSync(path.join(root,'web','prospect-parity-364.css'),prospectCss);
cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','prospect-parity-364.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.6.4: resultados de prospeccao e Painel Mestre corrigidos.');
