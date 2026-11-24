'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'server.js');
let s = fs.readFileSync(target, 'utf8');

function apply(anchor, replacement, label) {
  if (!s.includes(anchor)) throw new Error('EXE PRO 4.4.6: ancora nao encontrada: ' + label);
  s = s.replace(anchor, () => replacement);
  console.log('EXE PRO Cloud 4.4.6: ' + label + ' aplicado.');
}

// 1) zlib
apply(
  `const crypto = require('node:crypto');`,
  `const crypto = require('node:crypto');
const zlib = require('node:zlib');`,
  'gzip: require zlib'
);

// 2) helper maybeGzip (compressa respostas textuais/JSON quando o cliente aceita gzip)
apply(
  `function json(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));`,
  `function maybeGzip(res, headers, body) {
  const reqUrl = (res.req && res.req.url) || '';
  if (reqUrl.indexOf('/sync') === 0) return null; // API de sync desktop permanece sem compressao
  const enc = String((res.req && res.req.headers && res.req.headers['accept-encoding']) || '');
  if (body.length > 2097152 || !/(^|,)\\s*gzip\\s*(,|$)/i.test(enc) || headers['content-encoding']) return null;
  const gz = zlib.gzipSync(body);
  if (gz.length >= body.length) return null;
  headers['content-encoding'] = 'gzip';
  headers['content-length'] = gz.length;
  return gz;
}
function json(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));`,
  'gzip: helper maybeGzip'
);

// 3) json() usa gzip
apply(
  `  if (REQUIRE_HTTPS) headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
  res.writeHead(status, headers);
  res.end(body);
}`,
  `  if (REQUIRE_HTTPS) headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
  const gz = maybeGzip(res, headers, body);
  if (gz) { res.writeHead(status, headers); return res.end(gz); }
  res.writeHead(status, headers);
  res.end(body);
}`,
  'gzip: json()'
);

// 4) cache de estaticos: manifest/icone 24h, service-worker mantem 300s
apply(
  `'cache-control':name==='index.html'?'no-store':'public, max-age=300'`,
  `'cache-control':name==='index.html'?'no-store':(name==='service-worker.js'?'public, max-age=300':'public, max-age=86400')`,
  'cache: estaticos'
);

// 5) serveWebFile usa gzip
apply(
  `if(REQUIRE_HTTPS)headers['strict-transport-security']='max-age=31536000; includeSubDomains';res.writeHead(200,headers);res.end(body);`,
  `if(REQUIRE_HTTPS)headers['strict-transport-security']='max-age=31536000; includeSubDomains';const gz2=maybeGzip(res,headers,body);if(gz2){res.writeHead(200,headers);return res.end(gz2)}res.writeHead(200,headers);res.end(body);`,
  'gzip: serveWebFile'
);

// 6) webSummary: renomeia para webSummaryInner e cria wrapper com cache de 5s
apply(
  `async function webSummary(){`,
  `let summaryCache={t:0,d:null};
async function webSummaryInner(){`,
  'perf: webSummary cache'
);

apply(
  `owner:x.owner||'',dueDate:x.dueDate||''}))};
}`,
  `owner:x.owner||'',dueDate:x.dueDate||''}))};
}
async function webSummary(){const now=Date.now();if(summaryCache.d&&now-summaryCache.t<5000)return summaryCache.d;const d=await webSummaryInner();summaryCache={t:now,d};return d}`,
  'perf: webSummary wrapper'
);

// 7) webEntityList: filtro e paginacao no SQL (multi-linha, strings curtas)
apply(
  `async function webEntityList(url){const type=validId(url.searchParams.get('type')||'',40);if(!WEB_TYPES.has(type))return{status:400,body:{ok:false,error:'Tipo de registro invalido.'}};const q=String(url.searchParams.get('q')||'').trim().toLowerCase(),offset=Math.max(0,Number(url.searchParams.get('offset')||0)),limit=Math.min(300,Math.max(1,Number(url.searchParams.get('limit')||100)));let list=await webRows(type);if(q)list=list.filter(r=>JSON.stringify(r.payload||{}).toLowerCase().includes(q));const total=list.length;list=list.slice(offset,offset+limit);return{status:200,body:{ok:true,type,total,offset,limit,rows:list}}}`,
  `async function webEntityList(url){
const type=validId(url.searchParams.get('type')||'',40);
if(!WEB_TYPES.has(type))return{status:400,body:{ok:false,error:'Tipo de registro invalido.'}};
const q=String(url.searchParams.get('q')||'').trim().toLowerCase(),offset=Math.max(0,Number(url.searchParams.get('offset')||0)),limit=Math.min(300,Math.max(1,Number(url.searchParams.get('limit')||100)));
const params=[type];
let where='entity_type=$1 AND deleted=FALSE';
if(q){params.push('%'+q+'%');where+=' AND payload_json::text ILIKE $2'}
const total=Number((await one(pool,'SELECT COUNT(*)::bigint AS n FROM entities WHERE '+where,params)).n||0);
params.push(limit,offset);
const list=await rows(pool,'SELECT * FROM entities WHERE '+where+' ORDER BY updated_at DESC LIMIT $'+(params.length-1)+' OFFSET $'+params.length,params);
return{status:200,body:{ok:true,type,total,offset,limit,rows:list.map(publicRow)}};
}`,
  'perf: webEntityList SQL'
);

fs.writeFileSync(target, s);

// Rede de seguranca: valida a sintaxe do server.js gerado antes de seguir o build
cp.execFileSync(process.execPath, ['--check', target]);
console.log('EXE PRO Cloud 4.4.6: sintaxe do server.js validada (node --check).');
console.log('EXE PRO Cloud 4.4.6: performance e seguranca aplicados e validados.');
