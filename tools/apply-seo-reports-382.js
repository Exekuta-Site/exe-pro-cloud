'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(__dirname,'seo382');
const indexPath=path.join(root,'web','index.html');
const portalPath=path.join(root,'web','portal.html');
const serverPath=path.join(root,'server.js');

if(!fs.existsSync(indexPath)||!fs.existsSync(portalPath)||!fs.existsSync(serverPath))throw new Error('Fontes materializadas 3.8.2 nao encontradas.');
const adminJs=fs.readFileSync(path.join(dir,'admin.js'),'utf8');
const adminCss=fs.readFileSync(path.join(dir,'admin.css'),'utf8');
const portalJs=fs.readFileSync(path.join(dir,'portal.js'),'utf8');
const portalCss=fs.readFileSync(path.join(dir,'portal.css'),'utf8');
const serverSnippet=fs.readFileSync(path.join(dir,'server-snippet.js'),'utf8');
const routes=fs.readFileSync(path.join(dir,'routes.txt'),'utf8');
let html=fs.readFileSync(indexPath,'utf8');
let portal=fs.readFileSync(portalPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');

if(!html.includes('seoReports382Style'))html=html.replace('</head>','<style id="seoReports382Style">'+adminCss+'</style></head>');
if(!html.includes('seoReports382Script'))html=html.replace('</body>','<script id="seoReports382Script">'+adminJs+'</script></body>');
if(!portal.includes('seoPortal382Style'))portal=portal.replace('</head>','<style id="seoPortal382Style">'+portalCss+'</style></head>');
if(!portal.includes('seoPortal382Script'))portal=portal.replace('</body>','<script id="seoPortal382Script">'+portalJs+'</script></body>');

html=html.replaceAll('3.8.1','3.8.2');
portal=portal.replaceAll('3.8.1','3.8.2');
server=server.replaceAll('3.8.1','3.8.2');

if(!server.includes('const SEO_REPORT_STATUS=')){
  const anchor='\nfunction guardKey(';
  if(!server.includes(anchor))throw new Error('Anchor guardKey nao encontrado para SEO 3.8.2.');
  server=server.replace(anchor,()=> '\n'+serverSnippet+'\nfunction guardKey(');
}
if(!server.includes("url.pathname==='/api/web/seo-reports'")){
  const anchor='    // API de sincronizacao Windows <-> Cloudways.';
  if(!server.includes(anchor))throw new Error('Anchor de rotas nao encontrado para SEO 3.8.2.');
  server=server.replace(anchor,()=>routes+'\n'+anchor);
}

fs.writeFileSync(indexPath,html);
fs.writeFileSync(portalPath,portal);
fs.writeFileSync(serverPath,server);
fs.writeFileSync(path.join(root,'web','seo-reports-382.js'),adminJs);
fs.writeFileSync(path.join(root,'web','seo-reports-382.css'),adminCss);
fs.writeFileSync(path.join(root,'web','seo-portal-382.js'),portalJs);
fs.writeFileSync(path.join(root,'web','seo-portal-382.css'),portalCss);

for(const needle of ["const VERSION = '3.8.2';","SEO_REPORT_STATUS","seo_reports","seo_keywords","seo_pagespeed_runs","url.pathname==='/api/web/seo-reports'","url.pathname==='/api/portal/seo-reports'"]){
  if(!server.includes(needle))throw new Error('Patch servidor 3.8.2 incompleto: '+needle);
}
for(const needle of ['seoReports382Script','Relatórios SEO','3.8.2']){
  if(!html.includes(needle))throw new Error('Patch Admin SEO 3.8.2 incompleto: '+needle);
}
for(const needle of ['seoPortal382Script','Relatórios SEO','Imprimir / PDF']){
  if(!portal.includes(needle))throw new Error('Portal SEO 3.8.2 incompleto: '+needle);
}

cp.execFileSync(process.execPath,['--check',serverPath],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','seo-reports-382.js')],{stdio:'inherit'});
cp.execFileSync(process.execPath,['--check',path.join(root,'web','seo-portal-382.js')],{stdio:'inherit'});
console.log('EXE PRO Cloud 3.8.2: Relatorios SEO + PageSpeed + Portal aplicados.');
