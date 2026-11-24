'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const VERSION='4.1.4';
const root=path.resolve(__dirname,'..');
const routingPath=path.join(__dirname,'routing414','browser.js');
const indexPath=path.join(root,'web','index.html');
const portalPath=path.join(root,'web','portal.html');
const serverPath=path.join(root,'server.js');

for(const file of [routingPath,indexPath,portalPath,serverPath]){
  if(!fs.existsSync(file))throw new Error('Arquivo necessario ausente para Routing 4.1.4: '+file);
}
let html=fs.readFileSync(indexPath,'utf8');
let portal=fs.readFileSync(portalPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
const browser=fs.readFileSync(routingPath,'utf8');

server=server.replace("const VERSION = '3.9.1';","const VERSION = '"+VERSION+"';");
html=html.replaceAll('3.9.1',VERSION);
portal=portal.replaceAll('3.9.1',VERSION);

const routeMarker='EXE_PRO_414_ROUTES';
if(!server.includes(routeMarker)){
  const anchor="    if(req.method==='GET'&&url.pathname==='/health')";
  if(!server.includes(anchor))throw new Error('Anchor /health nao encontrado para Routing 4.1.4.');
  const routes=[
    "    const EXE_PRO_414_ROUTES=new Set(['/dashboard','/clientes','/sites-wordpress','/financeiro','/projetos','/seo','/configuracoes','/tarefas','/notificacoes','/saude-core']);",
    "    if(req.method==='GET'&&EXE_PRO_414_ROUTES.has(url.pathname))return serveWebFile(res,'index.html');"
  ].join('\n');
  server=server.replace(anchor,routes+'\n'+anchor);
}
if(!html.includes('routing414Script')){
  if(!html.includes('</body>'))throw new Error('Fechamento body nao encontrado para Routing 4.1.4.');
  html=html.replace('</body>','<script id="routing414Script">'+browser+'</script></body>');
}
for(const needle of ["const VERSION = '"+VERSION+"';",routeMarker]){
  if(!server.includes(needle))throw new Error('Routing 4.1.4 incompleto no servidor: '+needle);
}
for(const needle of ['routing414Script','/clientes','/sites-wordpress','/financeiro','/projetos','/seo','/configuracoes']){
  if(!html.includes(needle))throw new Error('Routing 4.1.4 incompleto no Admin: '+needle);
}
if(!html.includes(VERSION)||!portal.includes(VERSION))throw new Error('Versao 4.1.4 ausente nas interfaces.');
fs.writeFileSync(indexPath,html);
fs.writeFileSync(portalPath,portal);
fs.writeFileSync(serverPath,server);
cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',routingPath],{stdio:'inherit'});
console.log('EXE PRO Cloud 4.1.4: roteamento persistente aplicado e validado.');
