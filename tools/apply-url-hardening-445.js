'use strict';
// EXE PRO 4.4.5 — Hardening: URLs de request malformadas (ex.: '//?author=1' de bots)
// hoje derrubam new URL() e respondem 500. Este patch responde 400 limpo.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const serverPath = path.join(root, 'server.js');
let server = fs.readFileSync(serverPath, 'utf8');

const from = "const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(httpsGate(req,res,url))return;";
const to = "let url;try{url=new URL(req.url,`http://${req.headers.host||'localhost'}`)}catch{return json(res,400,{ok:false,error:'URL invalida.'})};if(httpsGate(req,res,url))return;";

const occurrences = server.split(from).length - 1;
if (occurrences !== 1) {
  throw new Error('Patch 4.4.5: esperado exatamente 1 ocorrencia do trecho, encontrado ' + occurrences);
}
server = server.replace(from, to);
fs.writeFileSync(serverPath, server);
console.log('EXE PRO Cloud 4.4.5: hardening de URL aplicado (400 em URLs malformadas).');
