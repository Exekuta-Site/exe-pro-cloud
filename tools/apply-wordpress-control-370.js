'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'wp370');
const indexPath=path.join(root,'web','index.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.7.0 nao encontradas.');
const browserJs=fs.readFileSync(path.join(dir,'browser.js'),'utf8');
const browserCss=fs.readFileSync(path.join(dir,'browser.css'),'utf8');
const serverSnippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('wpControl370Style'))html=html.replace('</head>','<style id="wpControl370Style">'+browserCss+'</style></head>');
if(!html.includes('wpControl370Script'))html=html.replace('</body>','<script id="wpControl370Script">'+browserJs+'</script></body>');
html=html.replaceAll('3.6.9','3.7.0');
server=server.replaceAll('3.6.9','3.7.0');

if(!server.includes('const WP_CTRL_DEFAULT=')){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor guardKey nao encontrado para 3.7.0.');
  server=server.replace(anchor,()=> '\n'+serverSnippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/web/wordpress-control'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas nao encontrado para 3.7.0.');
  server=server.replace(anchor,()=>routes+'\n'+anchor);
}
if(!server.includes('wpCtrlTick().catch')){
  const anchor="start().catch(err=>{console.error('Falha ao iniciar EXE PRO Cloud:',err);process.exit(1)});";
  if(!server.includes(anchor))throw new Error('Anchor start() nao encontrado para WordPress Control.');
  server=server.replace(anchor,anchor+"\nsetTimeout(()=>wpCtrlTick().catch(()=>{}),60000).unref();\nsetInterval(()=>wpCtrlTick().catch(()=>{}),15*60*1000).unref();");
}

const downloads=path.join(root,'web','downloads');
fs.mkdirSync(downloads,{recursive:true});
const pluginB64=fs.readFileSync(path.join(dir,'plugin.zip.b64'),'utf8').trim();
const plugin110B64=fs.readFileSync(path.join(dir,'plugin-1.1.0.zip.b64'),'utf8').trim();
const plugin=Buffer.from(pluginB64,'base64');
if(plugin.length<3000||plugin[0]!==0x50||plugin[1]!==0x4b)throw new Error('Payload do plugin WordPress invalido.');
fs.writeFileSync(path.join(downloads,'exe-pro-connector-v1.0.0.zip'),plugin);
const plugin110=Buffer.from(plugin110B64,'base64');
if(plugin110.length<3000||plugin110[0]!==0x50||plugin110[1]!==0x4b)throw new Error('Payload do plugin WordPress 1.1 invalido.');
fs.writeFileSync(path.join(downloads,'exe-pro-connector-v1.1.0.zip'),plugin110);

fs.writeFileSync(indexPath,html);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','wordpress-control-370.js'),browserJs);
fs.writeFileSync(path.join(root,'web','wordpress-control-370.css'),browserCss);

for(const needle of ["const VERSION = '3.7.0';","const WP_CTRL_DEFAULT=","url.pathname==='/api/web/wordpress-control'","wordpress_sites","wordpressSite:"]){
  if(!server.includes(needle))throw new Error('Patch servidor 3.7.0 incompleto: '+needle);
}
for(const needle of ['wpControl370Script','WORDPRESS CLIENT CONTROL','Sites WordPress','3.7.0']){
  if(!html.includes(needle))throw new Error('Patch Web 3.7.0 incompleto: '+needle);
}
cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','wordpress-control-370.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.7.0: WordPress Client Control materializado e validado.');
