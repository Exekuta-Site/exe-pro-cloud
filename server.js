'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { createPool, withTransaction } = require('./lib/postgres');
const { initSchema } = require('./lib/schema');
const { portalResponseHeaders } = require('./lib/portal-response-headers');

const HOST = process.env.EXE_CLOUD_HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || process.env.EXE_CLOUD_PORT || 8080);
const ACCESS_KEY = String(process.env.EXE_CLOUD_KEY || '').trim();
const SECRET_MASTER = String(process.env.EXE_CLOUD_SECRET_KEY || ACCESS_KEY).trim();
const MAX_BODY = 5 * 1024 * 1024;
const VERSION = '4.4.0';
// WHATSAPP_BUSINESS_420: Central de Conversas oficial.
// EXE_PRO_415_WHATSAPP_WEB: WhatsApp Web usa a sessao do navegador do usuario.
const PUBLIC_URL = String(process.env.EXE_CLOUD_PUBLIC_URL || '').trim().replace(/\/$/, '');
const REQUIRE_HTTPS = String(process.env.EXE_CLOUD_REQUIRE_HTTPS || '1') !== '0';
const ALLOW_KEY_LOGIN = String(process.env.EXE_CLOUD_ALLOW_KEY_LOGIN || '0') === '1';
const ADMIN_USER = String(process.env.EXE_CLOUD_ADMIN_USER || '').trim();
const ADMIN_PASSWORD_HASH = String(process.env.EXE_CLOUD_ADMIN_PASSWORD_HASH || '').trim();
const ADMIN_PASSWORD = String(process.env.EXE_CLOUD_ADMIN_PASSWORD || '');
const WEB_SESSION_HOURS = Math.min(24, Math.max(1, Number(process.env.EXE_CLOUD_WEB_SESSION_HOURS || 12)));
const LOGIN_MAX_ATTEMPTS = Math.min(20, Math.max(3, Number(process.env.EXE_CLOUD_LOGIN_MAX_ATTEMPTS || 5)));
const LOGIN_BLOCK_MINUTES = Math.min(120, Math.max(1, Number(process.env.EXE_CLOUD_LOGIN_BLOCK_MINUTES || 15)));
const RECOVERY_PASSWORD = String(process.env.EXE_CLOUD_RECOVERY_PASSWORD || '');
const WEB_ROOT = path.join(__dirname, 'web');
const WEB_TYPES = new Set(['lead','service','proposal','project','contract','receivable']);

if (!ACCESS_KEY) {
  console.error('ERRO: defina EXE_CLOUD_KEY antes de iniciar o EXE PRO Cloud.');
  process.exit(2);
}
if (!SECRET_MASTER) {
  console.error('ERRO: defina EXE_CLOUD_SECRET_KEY ou EXE_CLOUD_KEY.');
  process.exit(2);
}

const pool = createPool();

const WEB_PATCH_FIELDS = {
  lead: new Set(['name','companyName','crmStatus','clientAccountStatus','assignedTo','companyContactName','companyContactRole','nextActionAt','nextActionNote','notes','dealValue','clientProfileNote','clientServices','phone','whatsapp','telegram','email','website','address','city','state','source','segment','lastContactAt','contactAttempts','clientSince','instagram','facebook','mapsUrl','placeId','rating','reviews','photoName','photoAttribution','category','openNow','leadScore','leadScoreBand','prospectedAt','searchLabel','searchQuery','digitalPresence','whatsappProbable','googleResult','lastContactChannel','lastContactNote','billingNotificationsEnabled','notifyWhatsApp','notifyTelegram','notificationConsentAt','notificationConsentSource','notificationPreferenceUpdatedAt','telegramChatId','telegramLinkedAt','legalName','document','clientOrigin','clientMonthlyAmount','clientBillingDay','clientPaymentMethod','clientServiceItems']),
  proposal: new Set(['status','title','notes','paymentTerms','validityDays','setupTotal','setupNet','monthlyTotal','monthlyNet','discount','items','validUntil']),
  project: new Set(['status','priority','owner','dueDate','notes','title','startDate','tasks','progress','serviceId']),
  contract: new Set(['status','endDate','notes','billingDay','monthlyAmount','startDate','title','services','paymentMethod','leadId']),
  receivable: new Set(['status','paidAt','paymentMethod','notes','dueDate','amount','description','category','contractId','originKey','leadId']),
  service: new Set(['active','name','description','basePrice','billingType','category'])
};

function nowIso() { return new Date().toISOString(); }
function validId(v, max = 180) { const s = String(v || '').trim(); return s && s.length <= max ? s : ''; }
function safeEq(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}
function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function isoDay(v) { try { return String(v || '').slice(0, 10); } catch { return ''; } }
function maybeGzip(res, headers, body) {
  const reqUrl = (res.req && res.req.url) || '';
  if (reqUrl.indexOf('/sync') === 0) return null; // API de sync desktop permanece sem compressao
  const enc = String((res.req && res.req.headers && res.req.headers['accept-encoding']) || '');
  if (body.length > 2097152 || !/(^|,)\s*gzip\s*(,|$)/i.test(enc) || headers['content-encoding']) return null;
  const gz = zlib.gzipSync(body);
  if (gz.length >= body.length) return null;
  headers['content-encoding'] = 'gzip';
  headers['content-length'] = gz.length;
  return gz;
}
function json(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
  };
  if (REQUIRE_HTTPS) headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
  const gz = maybeGzip(res, headers, body);
  if (gz) { res.writeHead(status, headers); return res.end(gz); }
  res.writeHead(status, headers);
  res.end(body);
}
function redirect(res, location) { res.writeHead(302, { location, 'cache-control':'no-store' }); res.end(); }
function jsonDownload(res, filename, payload) { const body=Buffer.from(JSON.stringify(payload,null,2)); res.writeHead(200, {'content-type':'application/json; charset=utf-8','content-length':body.length,'content-disposition':`attachment; filename=\"${filename}\"`,'cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer'}); res.end(body); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0; const chunks = [];
    req.on('data', chunk => {
      total += chunk.length;
      if (total > MAX_BODY) { reject(Object.assign(new Error('Corpo da requisicao excede 5 MB.'), { statusCode:413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { const raw = Buffer.concat(chunks).toString('utf8'); resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(Object.assign(new Error('JSON invalido.'), { statusCode:400 })); }
    });
    req.on('error', reject);
  });
}
function publicRow(row) {
  if (!row) return null;
  let payload = row.payload_json ?? null;
  if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = null; } }
  return {
    entityType: row.entity_type,
    entityId: row.entity_id,
    cloudVersion: Number(row.cloud_version || 0),
    originInstallationId: row.origin_installation_id,
    originLocalVersion: Number(row.origin_local_version || 0),
    deleted: !!row.deleted,
    payload,
    updatedAt: row.updated_at,
    seq: row.seq === undefined ? undefined : Number(row.seq)
  };
}
async function one(db, text, params = []) { const r = await db.query(text, params); return r.rows[0] || null; }
async function rows(db, text, params = []) { const r = await db.query(text, params); return r.rows; }
async function maxCursor(db = pool) { const r = await one(db, 'SELECT COALESCE(MAX(seq),0)::bigint AS n FROM changes'); return Number(r?.n || 0); }
async function countWhere(table, where = '') { const r = await one(pool, `SELECT COUNT(*)::bigint AS n FROM ${table} ${where}`); return Number(r?.n || 0); }

function authOk(req) {
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const direct = String(req.headers['x-exe-cloud-key'] || '').trim();
  return safeEq(bearer || direct, ACCESS_KEY);
}
function requestIsHttps(req) { return !!req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https'; }
function clientIp(req) { const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); return xf || req.socket.remoteAddress || ''; }
function httpsGate(req, res, url) {
  if (!REQUIRE_HTTPS || requestIsHttps(req)) return false;
  const ip = String(req.socket.remoteAddress || '');
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return false;
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname.startsWith('/app'))) {
    const target = (PUBLIC_URL || `https://${req.headers.host || ''}`) + url.pathname + url.search;
    redirect(res, target); return true;
  }
  json(res, 426, { ok:false, error:'HTTPS obrigatorio neste servidor.' }); return true;
}
function cookieValue(req, name) {
  const raw = String(req.headers.cookie || '');
  for (const part of raw.split(';')) { const i = part.indexOf('='); if (i < 0) continue; if (part.slice(0,i).trim() === name) return decodeURIComponent(part.slice(i+1).trim()); }
  return '';
}
function tokenHash(token) { return crypto.createHash('sha256').update(String(token || '')).digest('hex'); }
function setWebCookie(req, res, token, maxAgeSeconds) {
  const secure = requestIsHttps(req) || REQUIRE_HTTPS ? '; Secure' : '';
  res.setHeader('set-cookie', `exe_cloud_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`);
}
function hashPassword(password) {
  const salt = crypto.randomBytes(24), N = 16384, r = 8, p = 1;
  const hash = crypto.scryptSync(String(password || ''), salt, 32, { N, r, p, maxmem:64*1024*1024 });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function validPasswordHashFormat(v) { return /^scrypt\$16384\$8\$1\$[0-9a-f]{32,128}\$[0-9a-f]{64}$/i.test(String(v || '')); }
function verifyPassword(password, encoded) {
  try {
    const [kind,nv,rv,pv,saltHex,hashHex] = String(encoded || '').split('$');
    if (kind !== 'scrypt') return false;
    const expected = Buffer.from(hashHex, 'hex'), salt = Buffer.from(saltHex, 'hex');
    const actual = crypto.scryptSync(String(password || ''), salt, expected.length, { N:Number(nv), r:Number(rv), p:Number(pv), maxmem:64*1024*1024 });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch { return false; }
}
function roleRank(role) { const x=String(role||'').toLowerCase(); if(x.includes('super'))return 5; if(x.includes('admin'))return 4; if(x.includes('gerente'))return 3; if(x.includes('vendedor'))return 2; return 1; }
function canWrite(session,type){ if(roleRank(session?.role)<=1)return false; if(['service','contract','receivable'].includes(type)&&roleRank(session?.role)<3)return false; return true; }
function canManageTeam(session){ return roleRank(session?.role)>=4; }
function isMaster(session){ return roleRank(session?.role)>=5; }

async function bootstrapAdmin() {
  const r = await one(pool, 'SELECT COUNT(*)::bigint AS n FROM cloud_users');
  if (Number(r?.n || 0) > 0) return;
  const username = validId(ADMIN_USER, 120);
  let ph = ADMIN_PASSWORD_HASH;
  if (!validPasswordHashFormat(ph) && ADMIN_PASSWORD.length >= 8) ph = hashPassword(ADMIN_PASSWORD);
  if (!username || !validPasswordHashFormat(ph)) {
    console.warn('AVISO: nenhum usuario Cloud inicial configurado. Defina EXE_CLOUD_ADMIN_USER e EXE_CLOUD_ADMIN_PASSWORD_HASH (ou EXE_CLOUD_ADMIN_PASSWORD).');
    return;
  }
  const now = nowIso();
  await pool.query('INSERT INTO cloud_users(user_id,username,username_ci,password_hash,role,active,created_at,updated_at,last_login_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(username_ci) DO NOTHING', [crypto.randomUUID(),username,username.toLowerCase(),ph,'Super Admin',true,now,now,null]);
  console.log(`Cloud Admin inicial criado: ${username}`);
}

async function upsertInstallation(db, installationId, label, at = nowIso()) {
  await db.query('INSERT INTO installations(installation_id,label,last_seen_at) VALUES($1,$2,$3) ON CONFLICT(installation_id) DO UPDATE SET label=EXCLUDED.label,last_seen_at=EXCLUDED.last_seen_at', [installationId,label,at]);
}

async function push(body) {
  const installationId = validId(body.installationId, 120);
  if (!installationId) return { status:400, body:{ok:false,error:'installationId obrigatorio.'} };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length > 1000) return { status:400, body:{ok:false,error:'Maximo de 1000 registros por envio.'} };
  const label = validId(body.device || body.actor || '', 120), now = nowIso();
  return withTransaction(pool, async client => {
    await upsertInstallation(client, installationId, label, now);
    const accepted = [], conflicts = [];
    for (const item of items) {
      const entityType = validId(item.entityType, 40), entityId = validId(item.entityId, 180);
      if (!entityType || !entityId) continue;
      const localVersion = Math.max(0, Number(item.localVersion || 0));
      const lastCloudVersion = Math.max(0, Number(item.lastCloudVersion || 0));
      const deleted = !!item.deleted;
      const payload = deleted ? null : (item.payload ?? null);
      const existing = await one(client, 'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2 FOR UPDATE', [entityType,entityId]);
      if (existing && existing.origin_installation_id === installationId && Number(existing.origin_local_version) === localVersion) {
        accepted.push({entityType,entityId,localVersion,cloudVersion:Number(existing.cloud_version),idempotent:true}); continue;
      }
      if (existing && lastCloudVersion !== Number(existing.cloud_version)) {
        conflicts.push({entityType,entityId,localVersion,expectedCloudVersion:lastCloudVersion,currentCloudVersion:Number(existing.cloud_version),remote:publicRow(existing)}); continue;
      }
      const cloudVersion = existing ? Number(existing.cloud_version)+1 : 1;
      const updatedAt = validId(item.updatedAt,80) || now;
      if (existing) {
        await client.query('UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,deleted=$4,payload_json=$5::jsonb,updated_at=$6 WHERE entity_type=$7 AND entity_id=$8', [cloudVersion,installationId,localVersion,deleted,payload===null?null:JSON.stringify(payload),updatedAt,entityType,entityId]);
      } else {
        await client.query('INSERT INTO entities(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8)', [entityType,entityId,cloudVersion,installationId,localVersion,deleted,payload===null?null:JSON.stringify(payload),updatedAt]);
      }
      await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8)', [entityType,entityId,cloudVersion,installationId,localVersion,deleted,payload===null?null:JSON.stringify(payload),updatedAt]);
      accepted.push({entityType,entityId,localVersion,cloudVersion,idempotent:false});
    }
    const cursor = await maxCursor(client);
    return { status:200, body:{ok:true,accepted,conflicts,cursor,serverTime:now} };
  });
}

async function pull(url, req) {
  const cursor = Math.max(0, Number(url.searchParams.get('cursor') || 0));
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get('limit') || 500)));
  const installationId = validId(req.headers['x-exe-installation-id'] || '', 120);
  if (installationId) await upsertInstallation(pool, installationId, validId(req.headers['x-exe-device'] || '',120));
  const list = await rows(pool, 'SELECT * FROM changes WHERE seq>$1 ORDER BY seq ASC LIMIT $2', [cursor,limit]);
  const changes = list.map(publicRow), nextCursor = changes.length ? Number(changes[changes.length-1].seq) : cursor;
  return {ok:true,cursor:nextCursor,hasMore:changes.length===limit,changes,serverTime:nowIso()};
}

async function getWebSession(req) {
  try { await pool.query('DELETE FROM web_sessions WHERE expires_at<$1', [nowIso()]); } catch {}
  const token = cookieValue(req,'exe_cloud_session'); if(!token)return null;
  const hash=tokenHash(token), row=await one(pool,'SELECT * FROM web_sessions WHERE token_hash=$1',[hash]);
  if(!row || String(row.expires_at)<=nowIso()) return null;
  try{await pool.query('UPDATE web_sessions SET last_seen_at=$1 WHERE token_hash=$2',[nowIso(),hash]);}catch{}
  return {tokenHash:hash,csrf:row.csrf_token,expiresAt:row.expires_at,device:row.device_label||'',userId:row.user_id||'',username:row.username||'',role:row.role||''};
}
async function webAuth(req,res,requireCsrf=false){const session=await getWebSession(req);if(!session){json(res,401,{ok:false,error:'Sessao Cloud expirada ou inexistente.'});return null}if(requireCsrf&&!safeEq(String(req.headers['x-exe-csrf']||''),String(session.csrf||''))){json(res,403,{ok:false,error:'Protecao de sessao invalida. Recarregue a pagina.'});return null}return session}

function serveWebFile(res,name){
  const allowed=new Map([['index.html','text/html; charset=utf-8'],['manifest.webmanifest','application/manifest+json; charset=utf-8'],['service-worker.js','text/javascript; charset=utf-8'],['app-icon.svg','image/svg+xml; charset=utf-8']]);
  if(!allowed.has(name))return json(res,404,{ok:false,error:'Arquivo nao encontrado.'});
  const file=path.join(WEB_ROOT,name);if(!fs.existsSync(file))return json(res,404,{ok:false,error:'Cloud Web nao instalada.'});const body=fs.readFileSync(file);
  const headers={'content-type':allowed.get(name),'content-length':body.length,'cache-control':name==='index.html'?'no-store':(name==='service-worker.js'?'public, max-age=300':'public, max-age=86400'),'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer','permissions-policy':'camera=(), microphone=(), geolocation=()','cross-origin-opener-policy':'same-origin','cross-origin-resource-policy':'same-origin','content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.facebook.com; connect-src 'self' https://connect.facebook.net https://graph.facebook.com https://www.facebook.com https://web.facebook.com; base-uri 'self'; form-action 'self'; object-src 'none'; frame-src 'self' https://www.facebook.com https://web.facebook.com; child-src 'self' https://www.facebook.com https://web.facebook.com; frame-ancestors 'none'"};
  if(REQUIRE_HTTPS)headers['strict-transport-security']='max-age=31536000; includeSubDomains';const gz2=maybeGzip(res,headers,body);if(gz2){res.writeHead(200,headers);return res.end(gz2)}res.writeHead(200,headers);res.end(body);
}

async function webRows(type){return (await rows(pool,'SELECT * FROM entities WHERE entity_type=$1 AND deleted=FALSE ORDER BY updated_at DESC',[type])).map(publicRow)}
let summaryCache={t:0,d:null};
async function webSummaryInner(){
  const [leadRows,proposalRows,projectRows,contractRows,receivableRows,serviceRows,cursor,records]=await Promise.all([webRows('lead'),webRows('proposal'),webRows('project'),webRows('contract'),webRows('receivable'),webRows('service'),maxCursor(),countWhere('entities','WHERE deleted=FALSE')]);
  const leads=leadRows.map(x=>x.payload||{}),proposals=proposalRows.map(x=>x.payload||{}),projects=projectRows.map(x=>x.payload||{}),contracts=contractRows.map(x=>x.payload||{}),receivables=receivableRows.map(x=>x.payload||{}),services=serviceRows.map(x=>x.payload||{});
  const today=nowIso().slice(0,10),month=today.slice(0,7),clients=leads.filter(x=>x.crmStatus==='Cliente');
  const activeProjects=projects.filter(x=>!['Concluído','Concluido','Cancelado'].includes(String(x.status||''))),overdueProjects=activeProjects.filter(x=>isoDay(x.dueDate)&&isoDay(x.dueDate)<today);
  const pending=receivables.filter(x=>!['Pago','Cancelado'].includes(String(x.status||''))),overdue=pending.filter(x=>isoDay(x.dueDate)&&isoDay(x.dueDate)<today);
  const paidMonth=receivables.filter(x=>x.status==='Pago'&&isoDay(x.paidAt||x.updatedAt).startsWith(month)).reduce((a,x)=>a+n(x.amount),0),mrr=contracts.filter(x=>x.status==='Ativo').reduce((a,x)=>a+n(x.monthlyAmount),0);
  return{ok:true,version:VERSION,serverTime:nowIso(),cursor,counts:{records,leads:leads.length,clients:clients.length,services:services.length,proposals:proposals.length,projects:projects.length,contracts:contracts.length,receivables:receivables.length},commercial:{openProposals:proposals.filter(x=>['Apresentada','Em negociação'].includes(String(x.status||''))).length,approvedProposals:proposals.filter(x=>x.status==='Aprovada').length},projects:{active:activeProjects.length,overdue:overdueProjects.length},finance:{open:pending.reduce((a,x)=>a+n(x.amount),0),overdue:overdue.reduce((a,x)=>a+n(x.amount),0),paidMonth,mrr},recentClients:clients.slice(0,6).map(x=>({id:x.id,name:x.name||x.companyName||'Cliente',owner:x.assignedTo||'',services:x.clientServices||[],since:x.clientSince||x.wonAt||x.updatedAt||''})),dueFinance:overdue.slice(0,6).map(x=>({id:x.id,leadId:x.leadId||'',description:x.description||'Cobrança',amount:n(x.amount),dueDate:x.dueDate||''})),activeProjects:activeProjects.slice(0,6).map(x=>({id:x.id,leadId:x.leadId||'',title:x.title||'Projeto',status:x.status||'',owner:x.owner||'',dueDate:x.dueDate||''}))};
}
async function webSummary(){const now=Date.now();if(summaryCache.d&&now-summaryCache.t<5000)return summaryCache.d;const d=await webSummaryInner();summaryCache={t:now,d};return d}
async function webEntityList(url){
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
}

async function webPatch(body,actor='Cloud Web'){
  const type=validId(body.entityType,40),id=validId(body.entityId,180);if(!WEB_TYPES.has(type)||!id)return{status:400,body:{ok:false,error:'Registro invalido.'}};
  return withTransaction(pool,async client=>{
    const existing=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2 FOR UPDATE',[type,id]);
    if(!existing||existing.deleted)return{status:404,body:{ok:false,error:'Registro nao encontrado.'}};
    const expected=Math.max(0,Number(body.expectedCloudVersion||0));if(expected&&expected!==Number(existing.cloud_version))return{status:409,body:{ok:false,error:'Este registro foi alterado por outra sessao. Recarregue antes de salvar.',currentCloudVersion:Number(existing.cloud_version),remote:publicRow(existing)}};
    let current=existing.payload_json&&typeof existing.payload_json==='object'?{...existing.payload_json}:{};const allowed=WEB_PATCH_FIELDS[type]||new Set(),patch=(body.patch&&typeof body.patch==='object')?body.patch:{};for(const[k,v]of Object.entries(patch))if(allowed.has(k))current[k]=v;
    const now=nowIso();current.id=current.id||id;current.updatedAt=now;current.updatedBy=actor;const cloudVersion=Number(existing.cloud_version)+1;
    await client.query('UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,deleted=FALSE,payload_json=$4::jsonb,updated_at=$5 WHERE entity_type=$6 AND entity_id=$7',[cloudVersion,'cloud-web',cloudVersion,JSON.stringify(current),now,type,id]);
    await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,FALSE,$6::jsonb,$7)',[type,id,cloudVersion,'cloud-web',cloudVersion,JSON.stringify(current),now]);
    const row=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2',[type,id]),cursor=await maxCursor(client);return{status:200,body:{ok:true,row:publicRow(row),cursor}};
  });
}
function cleanPayload(type,payload,id,session){const now=nowIso(),out={};for(const[k,v]of Object.entries(payload&&typeof payload==='object'?payload:{})){if((WEB_PATCH_FIELDS[type]||new Set()).has(k)||['leadId','proposalId','createdAt','createdBy','savedAt','savedBy','source','placeId'].includes(k))out[k]=v}out.id=id;out.createdAt=out.createdAt||now;out.updatedAt=now;out.updatedBy=session?.username||'Cloud Web';if(type==='lead'){out.crmStatus=out.crmStatus||'Novo';out.name=out.name||out.companyName||'Novo registro'}if(type==='project'){out.status=out.status||'Planejamento';out.title=out.title||'Novo projeto'}if(type==='proposal'){out.status=out.status||'Rascunho';out.title=out.title||'Nova proposta'}if(type==='receivable'){out.status=out.status||'Pendente';out.description=out.description||'Cobrança'}if(type==='contract'){out.status=out.status||'Ativo';out.title=out.title||'Contrato'}if(type==='service'){out.active=out.active!==false;out.name=out.name||'Serviço'}return out}
async function webCreate(body,session){const type=validId(body.entityType,40);if(!WEB_TYPES.has(type))return{status:400,body:{ok:false,error:'Tipo invalido.'}};if(!canWrite(session,type))return{status:403,body:{ok:false,error:'Seu perfil nao pode criar este registro.'}};const id=validId(body.entityId||crypto.randomUUID(),180);return withTransaction(pool,async client=>{const existing=await one(client,'SELECT 1 AS ok FROM entities WHERE entity_type=$1 AND entity_id=$2',[type,id]);if(existing)return{status:409,body:{ok:false,error:'Ja existe um registro com este ID.'}};const payload=cleanPayload(type,body.payload||{},id,session),now=nowIso();await client.query('INSERT INTO entities(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,1,$3,1,FALSE,$4::jsonb,$5)',[type,id,'cloud-web',JSON.stringify(payload),now]);await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,1,$3,1,FALSE,$4::jsonb,$5)',[type,id,'cloud-web',JSON.stringify(payload),now]);const row=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2',[type,id]),cursor=await maxCursor(client);return{status:201,body:{ok:true,row:publicRow(row),cursor}}})}
async function webPatchWithSession(body,session){if(!canWrite(session,validId(body.entityType,40)))return{status:403,body:{ok:false,error:'Seu perfil esta em modo somente leitura para este registro.'}};return webPatch(body,session?.username||'Cloud Web')}

const BRAND_DEFAULT={systemName:'EXE PRO',companyName:'EXEKUTA',tagline:'Prospecção - Relacionamento - Vendas',sideDescription:'Estratégia, execução e resultados para sua operação comercial.',primaryColor:'#8df900',primaryDark:'#5faa00',navColor:'#0b0b0b',logoData:'',companyLegalName:'',document:'',phone:'',whatsapp:'',email:'',website:'',address:'',instagram:'',proposalSubtitle:'Proposta comercial - Marketing Digital',proposalValidityDays:15,paymentTermsDefault:'',pixKey:'',bankInfo:'',proposalFooter:'Obrigado pela oportunidade.',messagePresentation:'Somos uma agência de Marketing Digital com foco em SEO Orgânico e criação de sites.',messageSignature:'',updatedAt:'',updatedBy:'',brandingVersion:'v1',commercialAutoEnabled:true,commercialFirstContactHours:4,commercialNoResponseDays:2,commercialStaleDays:7,commercialProposalDays:3,commercialDefaultHour:9};
async function settingValue(key,fallback={}){try{const row=await one(pool,'SELECT value_json FROM cloud_settings WHERE setting_key=$1',[key]);return row?row.value_json:fallback}catch{return fallback}}
async function saveSetting(key,value,user){const now=nowIso();await pool.query('INSERT INTO cloud_settings(setting_key,value_json,updated_at,updated_by) VALUES($1,$2::jsonb,$3,$4) ON CONFLICT(setting_key) DO UPDATE SET value_json=EXCLUDED.value_json,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by',[key,JSON.stringify(value??{}),now,String(user||'')]);return value}
async function getBranding(){return{...BRAND_DEFAULT,...await settingValue('branding',{})}}
async function normalizeBranding(v,meta={}){const out={...await getBranding()};for(const k of Object.keys(BRAND_DEFAULT))if(Object.prototype.hasOwnProperty.call(v||{},k))out[k]=v[k];for(const k of['primaryColor','primaryDark','navColor'])if(!/^#[0-9a-f]{6}$/i.test(String(out[k]||'')))out[k]=BRAND_DEFAULT[k];out.proposalValidityDays=Math.max(1,Math.min(365,Number(out.proposalValidityDays||15)));out.commercialAutoEnabled=out.commercialAutoEnabled!==false;out.commercialFirstContactHours=Math.max(1,Math.min(72,Number(out.commercialFirstContactHours||4)));out.commercialNoResponseDays=Math.max(1,Math.min(30,Number(out.commercialNoResponseDays||2)));out.commercialStaleDays=Math.max(1,Math.min(180,Number(out.commercialStaleDays||7)));out.commercialProposalDays=Math.max(1,Math.min(60,Number(out.commercialProposalDays||3)));out.commercialDefaultHour=Math.max(7,Math.min(20,Number(out.commercialDefaultHour||9)));out.brandingVersion=String(out.brandingVersion||'v1');out.updatedAt=String(out.updatedAt||'');out.updatedBy=String(out.updatedBy||'');if(meta.touch){out.updatedAt=nowIso();out.updatedBy=String(meta.user||'cloud');out.brandingVersion='v1'}return out}
const secretKey=crypto.createHash('sha256').update('EXE-PRO-CLOUD-SECRETS|'+SECRET_MASTER).digest();
function encryptSecret(v){if(!v)return'';const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',secretKey,iv);const enc=Buffer.concat([c.update(String(v),'utf8'),c.final()]),tag=c.getAuthTag();return[iv,tag,enc].map(x=>x.toString('base64')).join('.')}
function decryptSecret(v){if(!v)return'';try{const[a,b,cx]=String(v).split('.').map(x=>Buffer.from(x,'base64')),d=crypto.createDecipheriv('aes-256-gcm',secretKey,a);d.setAuthTag(b);return Buffer.concat([d.update(cx),d.final()]).toString('utf8')}catch{return''}}
async function getSecret(name){const row=await one(pool,'SELECT cipher_text FROM cloud_secrets WHERE secret_key=$1',[name]);return row?decryptSecret(row.cipher_text):''}
async function setSecret(name,value){if(!String(value||'').trim())return;await pool.query('INSERT INTO cloud_secrets(secret_key,cipher_text,updated_at) VALUES($1,$2,$3) ON CONFLICT(secret_key) DO UPDATE SET cipher_text=EXCLUDED.cipher_text,updated_at=EXCLUDED.updated_at',[name,encryptSecret(String(value).trim()),nowIso()])}
async function webSnapshot(){const types=[...WEB_TYPES],entities={};for(const t of types)entities[t]=await webRows(t);return{ok:true,version:VERSION,cursor:await maxCursor(),serverTime:nowIso(),entities}}
async function webActivity(limit=120){limit=Math.min(300,Math.max(1,Number(limit||120)));const[changes,auditRows]=await Promise.all([rows(pool,'SELECT seq,entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,updated_at FROM changes ORDER BY seq DESC LIMIT $1',[limit]),rows(pool,'SELECT id,event_type,username,ip,detail,created_at FROM cloud_audit ORDER BY id DESC LIMIT $1',[Math.min(limit,120)])]);return{ok:true,changes,audit:auditRows}}

async function webUsersList(session){if(!canManageTeam(session))return{status:403,body:{ok:false,error:'Acesso restrito a gestao da equipe.'}};const users=await rows(pool,'SELECT user_id,username,role,active,created_at,updated_at,last_login_at FROM cloud_users ORDER BY username_ci');return{status:200,body:{ok:true,users}}}
async function webUserCreate(body,session){if(!canManageTeam(session))return{status:403,body:{ok:false,error:'Acesso restrito.'}};const username=validId(body.username,120),password=String(body.password||''),role=String(body.role||'Vendedor');if(!username||password.length<8)return{status:400,body:{ok:false,error:'Informe usuario e senha com no minimo 8 caracteres.'}};if(roleRank(role)>=5&&!isMaster(session))return{status:403,body:{ok:false,error:'Somente Super Admin pode criar outro Super Admin.'}};if(await one(pool,'SELECT 1 AS ok FROM cloud_users WHERE username_ci=$1',[username.toLowerCase()]))return{status:409,body:{ok:false,error:'Usuario ja existe.'}};const now=nowIso();await pool.query('INSERT INTO cloud_users(user_id,username,username_ci,password_hash,role,active,created_at,updated_at,last_login_at) VALUES($1,$2,$3,$4,$5,TRUE,$6,$7,NULL)',[crypto.randomUUID(),username,username.toLowerCase(),hashPassword(password),role,now,now]);return webUsersList(session)}
async function webUserPatch(body,session){if(!canManageTeam(session))return{status:403,body:{ok:false,error:'Acesso restrito.'}};const u=await one(pool,'SELECT * FROM cloud_users WHERE user_id=$1',[validId(body.userId,120)]);if(!u)return{status:404,body:{ok:false,error:'Usuario nao encontrado.'}};const role=String(body.role||u.role),active=body.active===undefined?!!u.active:!!body.active;if((roleRank(u.role)>=5||roleRank(role)>=5)&&!isMaster(session))return{status:403,body:{ok:false,error:'Somente Super Admin pode alterar Super Admin.'}};if(u.user_id===session.userId&&(!active||roleRank(role)<roleRank(session.role)))return{status:400,body:{ok:false,error:'Voce nao pode desativar ou rebaixar sua propria conta.'}};if(roleRank(u.role)>=5&&(!active||roleRank(role)<5)){const masters=await one(pool,"SELECT COUNT(*)::bigint AS n FROM cloud_users WHERE active=TRUE AND LOWER(role) LIKE '%super%'");if(Number(masters?.n||0)<=1)return{status:400,body:{ok:false,error:'O sistema precisa manter pelo menos um Super Admin ativo.'}}}const now=nowIso(),password=String(body.password||'');await pool.query('UPDATE cloud_users SET role=$1,active=$2,updated_at=$3'+(password.length>=8?',password_hash=$5':'')+' WHERE user_id=$4',password.length>=8?[role,active,now,u.user_id,hashPassword(password)]:[role,active,now,u.user_id]);if(password.length>=8)await pool.query('DELETE FROM web_sessions WHERE user_id=$1 AND token_hash<>$2',[u.user_id,session.tokenHash]);return webUsersList(session)}

async function fetchJson(url,options={},ms=15000){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);try{const r=await fetch(url,{...options,signal:controller.signal});const txt=await r.text();let j={};try{j=txt?JSON.parse(txt):{}}catch{}if(!r.ok)throw new Error(j.error?.message||j.message||`HTTP ${r.status}`);return j}finally{clearTimeout(timer)}}
async function webProspect(body){const segment=String(body.segment||'').trim(),region=String(body.region||'').trim(),city=String(body.city||'').trim(),state=String(body.state||'').trim(),limit=Math.min(40,Math.max(1,Number(body.limit||20))),sources=Array.isArray(body.sources)?body.sources:['maps'];if(!segment)return{status:400,body:{ok:false,error:'Informe o segmento.'}};const query=[segment,region,city,state].filter(Boolean).join(' '),results={maps:[],google:[],instagram:[],facebook:[]},warnings=[];if(sources.includes('maps')){const key=await getSecret('googlePlaces');if(!key)warnings.push('Google Places nao configurado na Cloud.');else try{const j=await fetchJson('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'content-type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryTypeDisplayName,places.currentOpeningHours,places.photos'},body:JSON.stringify({textQuery:query,languageCode:'pt-BR',maxResultCount:Math.min(20,limit)})},18000);results.maps=(j.places||[]).slice(0,limit).map(p=>({placeId:p.id||'',name:p.displayName?.text||'',address:p.formattedAddress||'',phone:p.internationalPhoneNumber||p.nationalPhoneNumber||'',website:p.websiteUri||'',rating:p.rating||0,reviews:p.userRatingCount||0,mapsUrl:p.googleMapsUri||'',category:p.primaryTypeDisplayName?.text||'',openNow:p.currentOpeningHours?.openNow,photoName:p.photos?.[0]?.name||'',photoAttribution:p.photos?.[0]?.authorAttributions?.[0]?.displayName||'',source:'Google Maps',segment,city,state,region}))}catch(e){warnings.push('Google Maps: '+e.message)}}if(sources.some(x=>['google','instagram','facebook'].includes(x))){const key=await getSecret('serper');if(!key)warnings.push('Serper nao configurado na Cloud.');else for(const src of['google','instagram','facebook']){if(!sources.includes(src))continue;const domain=src==='instagram'?'instagram.com':src==='facebook'?'facebook.com':'';const sq=src==='google'?query:`site:${domain} ${query}`;try{const j=await fetchJson('https://google.serper.dev/search',{method:'POST',headers:{'content-type':'application/json','X-API-KEY':key},body:JSON.stringify({q:sq,gl:'br',hl:'pt-br',num:Math.min(20,limit)})},12000);results[src]=(j.organic||[]).slice(0,limit).map(x=>({name:x.title||'',link:x.link||'',snippet:x.snippet||'',source:src}))}catch(e){if(src==='google'){warnings.push('Google: '+e.message)}else{try{const j2=await fetchJson('https://google.serper.dev/search',{method:'POST',headers:{'content-type':'application/json','X-API-KEY':key},body:JSON.stringify({q:query,gl:'br',hl:'pt-br',num:Math.min(20,limit)})},12000);results[src]=(j2.organic||[]).filter(x=>{const l=String(x.link||'').toLowerCase();return l.indexOf('//'+domain)>=0||l.indexOf('//www.'+domain)>=0}).slice(0,limit).map(x=>({name:x.title||'',link:x.link||'',snippet:x.snippet||'',source:src}))}catch(e2){warnings.push(src+': '+e.message)}}}}}return{status:200,body:{ok:true,query,results,warnings}}}


// --- EXE PRO 3.9.1: Central de Mensagens & Cobrancas ---
const NOTIFY_DEFAULT={
  autoSend:false,
  daysBefore:[5,1],
  daysAfter:[1,3],
  sendOnDue:true,
  sendPaidConfirmation:false,
  defaultHour:9,
  utcOffsetMinutes:-180,
  lookbackDays:7,
  whatsappPhoneNumberId:'',
  whatsappGraphVersion:'',
  whatsappTemplateLanguage:'pt_BR',
  whatsappTemplateBefore:'',
  whatsappTemplateDue:'',
  whatsappTemplateOverdue:'',
  whatsappTemplatePaid:'',
  telegramBotUsername:''
};

function notifyInts(v,fallback){
  const a=Array.isArray(v)?v:String(v??'').split(/[,; ]+/);
  const out=[...new Set(a.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=60))].sort((a,b)=>b-a);
  return out.length?out:fallback;
}
async function getNotifyConfig(){
  const raw=await settingValue('notification_config',{});
  return normalizeNotifyConfig({...NOTIFY_DEFAULT,...(raw||{})});
}
function normalizeNotifyConfig(v){
  const c={...NOTIFY_DEFAULT,...(v||{})};
  c.autoSend=!!c.autoSend;
  c.daysBefore=notifyInts(c.daysBefore,NOTIFY_DEFAULT.daysBefore);
  c.daysAfter=notifyInts(c.daysAfter,NOTIFY_DEFAULT.daysAfter);
  c.sendOnDue=c.sendOnDue!==false;
  c.sendPaidConfirmation=!!c.sendPaidConfirmation;
  c.defaultHour=Math.max(7,Math.min(20,Number(c.defaultHour||9)));
  c.utcOffsetMinutes=Math.max(-720,Math.min(840,Number(c.utcOffsetMinutes??-180)));
  c.lookbackDays=Math.max(0,Math.min(60,Number(c.lookbackDays??7)));
  c.whatsappPhoneNumberId=String(c.whatsappPhoneNumberId||'').trim();
  c.whatsappGraphVersion=String(c.whatsappGraphVersion||'').trim();
  c.whatsappTemplateLanguage=String(c.whatsappTemplateLanguage||'pt_BR').trim()||'pt_BR';
  c.whatsappTemplateBefore=String(c.whatsappTemplateBefore||'').trim();
  c.whatsappTemplateDue=String(c.whatsappTemplateDue||'').trim();
  c.whatsappTemplateOverdue=String(c.whatsappTemplateOverdue||'').trim();
  c.whatsappTemplatePaid=String(c.whatsappTemplatePaid||'').trim();
  c.telegramBotUsername=String(c.telegramBotUsername||'').trim().replace(/^@/,'');
  return c;
}
async function publicNotifyConfig(){
  const config=await getNotifyConfig();
  return {
    config,
    integrations:{
      whatsappConfigured:!!(await getSecret('whatsappAccessToken'))&&!!config.whatsappPhoneNumberId&&!!config.whatsappGraphVersion,
      telegramConfigured:!!(await getSecret('telegramBotToken'))&&!!config.telegramBotUsername
    }
  };
}
function notifyPayload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function notifyDigits(v){return String(v||'').replace(/\D+/g,'')}
function notifyDay(v){return String(v||'').slice(0,10)}
function notifyDateAdd(day,delta){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day||'')))return'';
  const d=new Date(day+'T12:00:00.000Z');
  if(Number.isNaN(d.getTime()))return'';
  d.setUTCDate(d.getUTCDate()+Number(delta||0));
  return d.toISOString().slice(0,10);
}
function notifyScheduleIso(day,hour,offsetMin){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day||'')))return'';
  const p=day.split('-').map(Number),y=p[0],m=p[1],d=p[2];
  const utcHour=Number(hour||9)-(Number(offsetMin||0)/60);
  return new Date(Date.UTC(y,m-1,d,utcHour,0,0)).toISOString();
}
function notifyMoney(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function notifyMessage(kind,lead,rec,brand){
  const name=lead.name||lead.companyName||lead.companyContactName||'cliente';
  const desc=rec.description||rec.title||'sua fatura';
  const due=notifyDay(rec.dueDate);
  const amount=notifyMoney(rec.amount);
  const pix=brand.pixKey?(' PIX: '+brand.pixKey+'.'):'';
  if(kind==='paid')return 'Olá, '+name+'. Confirmamos o pagamento de '+desc+' no valor de '+amount+'. Obrigado!'+pix;
  if(kind==='due')return 'Olá, '+name+'. Lembrete: '+desc+' vence hoje ('+due+'), no valor de '+amount+'.'+pix+' Se já pagou, desconsidere esta mensagem.';
  if(/^before_/.test(kind))return 'Olá, '+name+'. '+desc+' vence em '+String(kind.split('_')[1]||'')+' dia(s), em '+due+', no valor de '+amount+'.'+pix+' Se já pagou, desconsidere esta mensagem.';
  if(/^overdue_/.test(kind))return 'Olá, '+name+'. Identificamos que '+desc+', com vencimento em '+due+' e valor de '+amount+', está em atraso há '+String(kind.split('_')[1]||'')+' dia(s).'+pix+' Se já pagou, desconsidere esta mensagem.';
  return 'Olá, '+name+'. Temos uma atualização sobre '+desc+'.';
}
function notifyTemplateName(kind,c){
  if(kind==='paid')return c.whatsappTemplatePaid;
  if(kind==='due')return c.whatsappTemplateDue;
  if(/^before_/.test(kind))return c.whatsappTemplateBefore;
  if(/^overdue_/.test(kind))return c.whatsappTemplateOverdue;
  return'';
}
async function notifySystemPatchLead(leadId,patch,origin){
  origin=origin||'notification-system';
  return withTransaction(pool,async client=>{
    const row=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2 FOR UPDATE',['lead',leadId]);
    if(!row||row.deleted)return false;
    const payload={...notifyPayload(row),...(patch||{})};
    const ver=Number(row.cloud_version||0)+1,now=nowIso();
    await client.query('UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,payload_json=$4::jsonb,updated_at=$5 WHERE entity_type=$6 AND entity_id=$7',[ver,origin,ver,JSON.stringify(payload),now,'lead',leadId]);
    await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,FALSE,$6::jsonb,$7)',['lead',leadId,ver,origin,ver,JSON.stringify(payload),now]);
    return true;
  });
}
async function notifyInsert(leadId,receivableId,channel,kind,scheduledAt,message){
  const dedupe=[receivableId||'none',channel,kind,notifyDay(scheduledAt)].join('|');
  const id=crypto.randomUUID(),now=nowIso();
  const sql='INSERT INTO notification_outbox(notification_id,dedupe_key,lead_id,receivable_id,channel,kind,scheduled_at,status,message_text,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) ON CONFLICT(dedupe_key) DO NOTHING RETURNING notification_id';
  const r=await pool.query(sql,[id,dedupe,leadId,receivableId||null,channel,kind,scheduledAt,'Pendente',message,now]);
  return r.rowCount>0;
}
async function notificationPlan(){
  const config=await getNotifyConfig(),brand=await getBranding(),now=new Date(),today=now.toISOString().slice(0,10);
  const minDay=notifyDateAdd(today,-config.lookbackDays),maxDay=notifyDateAdd(today,90);
  const leadRows=await rows(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND deleted=FALSE");
  const leadMap=new Map(leadRows.map(x=>[x.entity_id,notifyPayload(x)]));
  const recRows=await rows(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='receivable' AND deleted=FALSE");
  let created=0,cancelled=0,eligible=0;
  for(const rr of recRows){
    const rec=notifyPayload(rr),leadId=String(rec.leadId||rec.clientId||rec.customerId||'');
    const lead=leadMap.get(leadId);if(!lead)continue;
    const consent=!!lead.billingNotificationsEnabled&&!!lead.notificationConsentAt;
    if(!consent)continue;
    eligible++;
    const status=String(rec.status||'Pendente').toLowerCase();
    if(status.includes('cancel')){
      const q=await pool.query("UPDATE notification_outbox SET status='Cancelado',updated_at=$1 WHERE receivable_id=$2 AND status IN ('Pendente','Falhou')",[nowIso(),rr.entity_id]);cancelled+=q.rowCount;continue;
    }
    const channels=[];
    if(lead.notifyWhatsApp!==false&&notifyDigits(lead.whatsapp||lead.phone))channels.push('whatsapp');
    if(lead.notifyTelegram&&String(lead.telegramChatId||''))channels.push('telegram');
    if(!channels.length)continue;
    if(status==='pago'){
      const q=await pool.query("UPDATE notification_outbox SET status='Cancelado',updated_at=$1 WHERE receivable_id=$2 AND kind<>'paid' AND status IN ('Pendente','Falhou')",[nowIso(),rr.entity_id]);cancelled+=q.rowCount;
      if(!config.sendPaidConfirmation)continue;
      const paidDay=notifyDay(rec.paidAt||rec.updatedAt||today)||today,scheduled=notifyScheduleIso(paidDay,config.defaultHour,config.utcOffsetMinutes);
      if(notifyDay(scheduled)<minDay)continue;
      for(const ch of channels)if(await notifyInsert(leadId,rr.entity_id,ch,'paid',scheduled,notifyMessage('paid',lead,rec,brand)))created++;
      continue;
    }
    const due=notifyDay(rec.dueDate);if(!due)continue;
    const schedules=[];
    for(const n of config.daysBefore)schedules.push(['before_'+n,notifyDateAdd(due,-n)]);
    if(config.sendOnDue)schedules.push(['due',due]);
    for(const n of config.daysAfter)schedules.push(['overdue_'+n,notifyDateAdd(due,n)]);
    for(const item of schedules){
      const kind=item[0],day=item[1];
      if(!day||day<minDay||day>maxDay)continue;
      const scheduled=notifyScheduleIso(day,config.defaultHour,config.utcOffsetMinutes);
      for(const ch of channels)if(await notifyInsert(leadId,rr.entity_id,ch,kind,scheduled,notifyMessage(kind,lead,rec,brand)))created++;
    }
  }
  return{created,cancelled,eligible};
}
async function notificationView(limit){
  limit=Math.max(1,Math.min(500,Number(limit||250)));
  const info=await publicNotifyConfig();
  const sql="SELECT n.notification_id,n.lead_id,n.receivable_id,n.channel,n.kind,n.scheduled_at,n.status,n.message_text,n.provider_message_id,n.error_text,n.created_at,n.sent_at,l.payload_json AS lead_payload,r.payload_json AS receivable_payload FROM notification_outbox n LEFT JOIN entities l ON l.entity_type='lead' AND l.entity_id=n.lead_id LEFT JOIN entities r ON r.entity_type='receivable' AND r.entity_id=n.receivable_id ORDER BY n.scheduled_at DESC,n.created_at DESC LIMIT $1";
  const rr=await rows(pool,sql,[limit]);
  const counts=await one(pool,"SELECT COUNT(*) FILTER(WHERE status='Pendente')::int AS pending,COUNT(*) FILTER(WHERE status='Pendente' AND scheduled_at<=$1)::int AS due,COUNT(*) FILTER(WHERE status='Enviado')::int AS sent,COUNT(*) FILTER(WHERE status='Falhou')::int AS failed FROM notification_outbox",[nowIso()]);
  const consented=await one(pool,"SELECT COUNT(*)::int AS n FROM entities WHERE entity_type='lead' AND deleted=FALSE AND payload_json->>'billingNotificationsEnabled'='true' AND COALESCE(payload_json->>'notificationConsentAt','')<>''");
  return{ok:true,...info,summary:{pending:Number(counts?.pending||0),due:Number(counts?.due||0),sent:Number(counts?.sent||0),failed:Number(counts?.failed||0),consented:Number(consented?.n||0)},rows:rr.map(x=>({notificationId:x.notification_id,leadId:x.lead_id,receivableId:x.receivable_id,channel:x.channel,kind:x.kind,scheduledAt:x.scheduled_at,status:x.status,messageText:x.message_text,providerMessageId:x.provider_message_id,errorText:x.error_text,createdAt:x.created_at,sentAt:x.sent_at,leadPayload:notifyPayload({payload_json:x.lead_payload}),receivablePayload:notifyPayload({payload_json:x.receivable_payload})}))};
}
async function sendWhatsAppNotification(row,lead,rec,config,brand){
  const token=await getSecret('whatsappAccessToken');if(!token)throw new Error('WhatsApp Access Token nao configurado.');
  if(!/^v\d+\.\d+$/.test(config.whatsappGraphVersion))throw new Error('Configure a versao da Graph API do WhatsApp.');
  if(!/^\d+$/.test(config.whatsappPhoneNumberId))throw new Error('Phone Number ID do WhatsApp invalido.');
  const template=notifyTemplateName(row.kind,config);if(!template)throw new Error('Template WhatsApp nao configurado para este tipo de aviso.');
  const to=notifyDigits(lead.whatsapp||lead.phone);if(!to)throw new Error('Contato sem WhatsApp/telefone.');
  const name=lead.name||lead.companyName||lead.companyContactName||'cliente',desc=rec.description||rec.title||'Fatura',due=notifyDay(rec.dueDate)||'-',amount=notifyMoney(rec.amount),pix=brand.pixKey||'-';
  const payload={messaging_product:'whatsapp',to:to,type:'template',template:{name:template,language:{code:config.whatsappTemplateLanguage||'pt_BR'},components:[{type:'body',parameters:[name,desc,due,amount,pix].map(text=>({type:'text',text:String(text)}))}]}};
  const url='https://graph.facebook.com/'+config.whatsappGraphVersion+'/'+config.whatsappPhoneNumberId+'/messages';
  const j=await fetchJson(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(payload)},20000);
  return j.messages?.[0]?.id||'';
}
async function sendTelegramNotification(row,lead){
  const token=await getSecret('telegramBotToken');if(!token)throw new Error('Telegram Bot Token nao configurado.');
  const chatId=String(lead.telegramChatId||'').trim();if(!chatId)throw new Error('Contato sem Telegram conectado.');
  const j=await fetchJson('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chatId,text:row.message_text,disable_web_page_preview:true})},15000);
  return String(j.result?.message_id||'');
}
async function notificationSendOne(id){
  const sql="SELECT n.*,l.payload_json AS lead_payload,r.payload_json AS receivable_payload FROM notification_outbox n LEFT JOIN entities l ON l.entity_type='lead' AND l.entity_id=n.lead_id LEFT JOIN entities r ON r.entity_type='receivable' AND r.entity_id=n.receivable_id WHERE n.notification_id=$1";
  const row=await one(pool,sql,[id]);
  if(!row)return{sent:false,failed:true,error:'Notificacao nao encontrada.'};
  if(!['Pendente','Falhou'].includes(row.status))return{sent:false,failed:false,error:'Notificacao ja processada.'};
  const lead=notifyPayload({payload_json:row.lead_payload}),rec=notifyPayload({payload_json:row.receivable_payload});
  if(!lead.billingNotificationsEnabled||!lead.notificationConsentAt){
    await pool.query("UPDATE notification_outbox SET status='Cancelado',error_text=$1,updated_at=$2 WHERE notification_id=$3",['Consentimento removido.',nowIso(),id]);
    return{sent:false,failed:false,error:'Consentimento removido.'};
  }
  const config=await getNotifyConfig(),brand=await getBranding();
  try{
    let provider='';
    if(row.channel==='whatsapp')provider=await sendWhatsAppNotification(row,lead,rec,config,brand);
    else if(row.channel==='telegram')provider=await sendTelegramNotification(row,lead);
    else throw new Error('Canal nao suportado.');
    const now=nowIso();
    await pool.query("UPDATE notification_outbox SET status='Enviado',provider_message_id=$1,error_text=NULL,sent_at=$2,updated_at=$2 WHERE notification_id=$3",[provider,now,id]);
    return{sent:true,failed:false};
  }catch(e){
    await pool.query("UPDATE notification_outbox SET status='Falhou',error_text=$1,updated_at=$2 WHERE notification_id=$3",[String(e.message||e).slice(0,500),nowIso(),id]);
    return{sent:false,failed:true,error:e.message};
  }
}
async function notificationSend(body){
  body=body||{};
  const id=String(body.notificationId||'').trim();
  if(id){const r=await notificationSendOne(id);return{ok:true,sent:r.sent?1:0,failed:r.failed?1:0,detail:r}}
  const dueOnly=body.dueOnly!==false,limit=Math.max(1,Math.min(100,Number(body.limit||50)));
  const sql=dueOnly?"SELECT notification_id FROM notification_outbox WHERE status IN ('Pendente','Falhou') AND scheduled_at<=$1 ORDER BY scheduled_at ASC LIMIT $2":"SELECT notification_id FROM notification_outbox WHERE status IN ('Pendente','Falhou') ORDER BY scheduled_at ASC LIMIT $1";
  const args=dueOnly?[nowIso(),limit]:[limit];
  const list=await rows(pool,sql,args);let sent=0,failed=0;
  for(const x of list){const r=await notificationSendOne(x.notification_id);if(r.sent)sent++;if(r.failed)failed++}
  return{ok:true,sent,failed,total:list.length};
}
async function syncTelegramContacts(){
  const token=await getSecret('telegramBotToken');if(!token)throw new Error('Telegram Bot Token nao configurado.');
  const saved=await settingValue('telegram_update_offset',{offset:0}),offset=Number(saved?.offset||0);
  const j=await fetchJson('https://api.telegram.org/bot'+token+'/getUpdates?limit=100&timeout=0&offset='+(offset+1),{},15000);
  let linked=0,max=offset;
  for(const u of(j.result||[])){
    max=Math.max(max,Number(u.update_id||0));
    const msg=u.message||u.edited_message||{},text=String(msg.text||''),m=text.match(/^\/start\s+exe_(.+)$/);
    if(!m)continue;
    const leadId=decodeURIComponent(m[1]),chatId=msg.chat?.id;
    if(!leadId||chatId===undefined)continue;
    if(await notifySystemPatchLead(leadId,{telegramChatId:String(chatId),telegramLinkedAt:nowIso(),notifyTelegram:true},'telegram-link'))linked++;
  }
  if(max>offset)await saveSetting('telegram_update_offset',{offset:max},'telegram-bot');
  return{ok:true,linked,offset:max};
}
async function notificationTick(){
  try{
    const c=await getNotifyConfig();if(!c.autoSend)return;
    await notificationPlan();await notificationSend({dueOnly:true,limit:50});
  }catch(e){console.error('Notification tick:',e.message)}
}


// --- EXE PRO 3.9.1: exclusao sincronizada de entidades ---
async function webDeleteEntity(body,session){
  const type=validId(body.entityType,40),id=validId(body.entityId,180),cascade=!!body.cascade;
  if(!WEB_TYPES.has(type)||!id)return{status:400,body:{ok:false,error:'Tipo ou ID invalido.'}};
  if(!canWrite(session,type))return{status:403,body:{ok:false,error:'Seu perfil nao pode excluir este registro.'}};
  return withTransaction(pool,async client=>{
    const root=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2 FOR UPDATE',[type,id]);
    if(!root)return{status:404,body:{ok:false,error:'Registro nao encontrado.'}};
    if(root.deleted)return{status:200,body:{ok:true,deleted:0,alreadyDeleted:true}};
    const expected=Number(body.cloudVersion||0);
    if(expected&&expected!==Number(root.cloud_version||0)){
      return{status:409,body:{ok:false,error:'O registro foi alterado em outro dispositivo. Atualize antes de excluir.',currentVersion:Number(root.cloud_version||0)}};
    }
    const targets=[root];
    if(cascade&&type==='lead'){
      for(const relatedType of['proposal','project','contract','receivable']){
        const rr=await rows(client,"SELECT * FROM entities WHERE entity_type=$1 AND deleted=FALSE AND payload_json->>'leadId'=$2 FOR UPDATE",[relatedType,id]);
        targets.push(...rr);
      }
    }
    const now=nowIso();let deleted=0;
    for(const row of targets){
      if(row.deleted)continue;
      const ver=Number(row.cloud_version||0)+1;
      let payload=row.payload_json??null;
      if(typeof payload==='string'){try{payload=JSON.parse(payload)}catch{payload=null}}
      await client.query('UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,deleted=TRUE,updated_at=$4 WHERE entity_type=$5 AND entity_id=$6',[ver,'cloud-web',ver,now,row.entity_type,row.entity_id]);
      await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,TRUE,$6::jsonb,$7)',[row.entity_type,row.entity_id,ver,'cloud-web',ver,JSON.stringify(payload),now]);
      deleted++;
    }
    return{status:200,body:{ok:true,deleted,cascade}};
  });
}


// --- EXE PRO 3.9.1: WordPress Client Control + Designer ---
const WP_CTRL_TEMPLATE_DEFAULTS={
  institutional:{
    key:'institutional',name:'Institucional',eyebrow:'ACESSO TEMPORARIAMENTE INDISPONÍVEL',
    title:'Site temporariamente indisponível',
    subtitle:'Estamos trabalhando para normalizar o acesso.',
    message:'Este site está temporariamente indisponível. Tente novamente mais tarde.',
    showProgress:true,progressLabel:'Regularização em andamento',
    accent:'#18b7a4',background:'#0d0f12',card:'#15181d',text:'#ffffff',
    buttonLabel:'Falar com suporte',buttonUrl:''
  },
  financial:{
    key:'financial',name:'Financeiro discreto',eyebrow:'AVISO TEMPORÁRIO',
    title:'Acesso temporariamente pausado',
    subtitle:'Aguardando regularização administrativa.',
    message:'O acesso público a este site está temporariamente indisponível. Para suporte, entre em contato com a equipe responsável.',
    showProgress:true,progressLabel:'Processo de regularização',
    accent:'#f0b84f',background:'#0f1012',card:'#17181b',text:'#ffffff',
    buttonLabel:'Entrar em contato',buttonUrl:''
  },
  premium:{
    key:'premium',name:'Manutenção premium',eyebrow:'MANUTENÇÃO TEMPORÁRIA',
    title:'Voltamos em breve',
    subtitle:'Uma pausa rápida para normalizar o acesso.',
    message:'Estamos trabalhando para que tudo volte ao normal o quanto antes. Obrigado pela compreensão.',
    showProgress:true,progressLabel:'Progresso da normalização',
    accent:'#8b5cf6',background:'#090b12',card:'#121522',text:'#ffffff',
    buttonLabel:'Suporte',buttonUrl:''
  }
};
const WP_CTRL_DEFAULT={
  automationEnabled:false,
  defaultGraceDays:7,
  autoResume:true,
  checkMinutes:15,
  utcOffsetMinutes:-180,
  suspendTitle:'Site temporariamente indisponível',
  suspendMessage:'Este site está temporariamente indisponível. Tente novamente mais tarde.',
  retryAfterSeconds:3600,
  defaultTemplate:'institutional',
  templates:WP_CTRL_TEMPLATE_DEFAULTS
};

function wpCtrlHex(v,fallback){
  const s=String(v||'').trim();
  return /^#[0-9a-fA-F]{6}$/.test(s)?s:fallback;
}
function wpCtrlTemplateNormalize(v,fallback){
  const x={...fallback,...(v||{})};
  return{
    key:fallback.key,name:String(x.name||fallback.name).trim().slice(0,80),
    eyebrow:String(x.eyebrow||fallback.eyebrow).trim().slice(0,120),
    title:String(x.title||fallback.title).trim().slice(0,180),
    subtitle:String(x.subtitle||fallback.subtitle).trim().slice(0,260),
    message:String(x.message||fallback.message).trim().slice(0,1400),
    showProgress:x.showProgress!==false,
    progressLabel:String(x.progressLabel||fallback.progressLabel).trim().slice(0,180),
    accent:wpCtrlHex(x.accent,fallback.accent),background:wpCtrlHex(x.background,fallback.background),
    card:wpCtrlHex(x.card,fallback.card),text:wpCtrlHex(x.text,fallback.text),
    buttonLabel:String(x.buttonLabel||fallback.buttonLabel).trim().slice(0,100),
    buttonUrl:wpCtrlNormalizeUrl(x.buttonUrl)||''
  };
}
function wpCtrlConfigNormalize(v){
  const c={...WP_CTRL_DEFAULT,...(v||{})};
  c.automationEnabled=!!c.automationEnabled;
  c.defaultGraceDays=Math.max(0,Math.min(90,Number(c.defaultGraceDays??7)));
  c.autoResume=c.autoResume!==false;
  c.checkMinutes=Math.max(5,Math.min(120,Number(c.checkMinutes||15)));
  c.utcOffsetMinutes=Math.max(-720,Math.min(840,Number(c.utcOffsetMinutes??-180)));
  c.suspendTitle=String(c.suspendTitle||WP_CTRL_DEFAULT.suspendTitle).trim().slice(0,180);
  c.suspendMessage=String(c.suspendMessage||WP_CTRL_DEFAULT.suspendMessage).trim().slice(0,1200);
  c.retryAfterSeconds=Math.max(60,Math.min(86400,Number(c.retryAfterSeconds||3600)));
  c.defaultTemplate=['institutional','financial','premium'].includes(String(c.defaultTemplate||''))?String(c.defaultTemplate):'institutional';
  const incoming=(v&&v.templates)||{};
  c.templates={
    institutional:wpCtrlTemplateNormalize(incoming.institutional,WP_CTRL_TEMPLATE_DEFAULTS.institutional),
    financial:wpCtrlTemplateNormalize(incoming.financial,WP_CTRL_TEMPLATE_DEFAULTS.financial),
    premium:wpCtrlTemplateNormalize(incoming.premium,WP_CTRL_TEMPLATE_DEFAULTS.premium)
  };
  return c;
}
async function wpCtrlGetConfig(){
  return wpCtrlConfigNormalize(await settingValue('wordpress_control_config',{}));
}
function wpCtrlNormalizeUrl(raw){
  let u;
  try{u=new URL(String(raw||'').trim())}catch{return''}
  if(u.protocol!=='https:'||u.username||u.password)return'';
  const h=String(u.hostname||'').toLowerCase();
  if(!h||h==='localhost'||h.endsWith('.local')||h.endsWith('.internal'))return'';
  if(/^\d+\.\d+\.\d+\.\d+$/.test(h)){
    const p=h.split('.').map(Number);
    if(p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168))return'';
  }
  if(h==='::1'||h.startsWith('fc')||h.startsWith('fd')||h.startsWith('fe80:'))return'';
  u.hash='';u.search='';
  u.pathname=u.pathname.replace(/\/+$/,'');
  return u.toString().replace(/\/+$/,'');
}
function wpCtrlSecretKey(id){return'wordpressSite:'+String(id||'')}
function wpCtrlPayload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function wpCtrlDay(config){
  const shifted=new Date(Date.now()+Number(config.utcOffsetMinutes||0)*60000);
  return shifted.toISOString().slice(0,10);
}
function wpCtrlDiffDays(a,b){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(a||''))||!/^\d{4}-\d{2}-\d{2}$/.test(String(b||'')))return 0;
  return Math.floor((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
}
async function wpCtrlFinance(leadId,config){
  const rr=await rows(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='receivable' AND deleted=FALSE AND payload_json->>'leadId'=$1",[leadId]);
  const today=wpCtrlDay(config);
  let overdueCount=0,maxOverdueDays=0,totalOverdue=0,nextDue='',openCount=0;
  for(const row of rr){
    const p=wpCtrlPayload(row),st=String(p.status||'Pendente').toLowerCase();
    if(st.includes('pago')||st.includes('cancel'))continue;
    openCount++;
    const due=String(p.dueDate||'').slice(0,10);
    if(due&&(!nextDue||due<nextDue))nextDue=due;
    const days=wpCtrlDiffDays(due,today);
    if(due&&days>0){
      overdueCount++;maxOverdueDays=Math.max(maxOverdueDays,days);totalOverdue+=Number(p.amount||0);
    }
  }
  return{openCount,overdueCount,maxOverdueDays,totalOverdue,nextDue,today};
}
async function wpCtrlRemote(site,action,payload){
  const base=wpCtrlNormalizeUrl(site.site_url);
  if(!base)throw new Error('URL WordPress invalida. Use HTTPS publico.');
  const secret=await getSecret(wpCtrlSecretKey(site.site_id));
  if(!secret)throw new Error('Chave de conexao WordPress nao configurada.');
  const route='/exe-pro/v1/'+action;
  const method=action==='status'?'GET':'POST';
  const body=method==='GET'?'':JSON.stringify(payload||{});
  const timestamp=String(Math.floor(Date.now()/1000));
  const nonce=crypto.randomBytes(18).toString('base64url');
  const bodyHash=crypto.createHash('sha256').update(body).digest('hex');
  const canonical=[timestamp,nonce,method,route,bodyHash].join('\n');
  const signature=crypto.createHmac('sha256',secret).update(canonical).digest('hex');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
    const res=await fetch(base+'/wp-json'+route,{
      method,redirect:'error',signal:controller.signal,
      headers:{'accept':'application/json','content-type':'application/json','user-agent':'EXE-PRO-Cloud/3.9.1','x-exe-timestamp':timestamp,'x-exe-nonce':nonce,'x-exe-signature':signature},
      body:method==='GET'?undefined:body
    });
    const text=await res.text();let data={};
    try{data=text?JSON.parse(text):{}}catch{data={raw:text.slice(0,500)}}
    if(!res.ok)throw new Error('WordPress HTTP '+res.status+': '+String(data.message||data.error||data.raw||'falha remota').slice(0,300));
    return data;
  }finally{clearTimeout(timer)}
}
async function wpCtrlMark(siteId,patch){
  const keys=['status','remote_suspended','suspend_mode','suspended_reason','last_checked_at','last_action_at','last_action','last_error'];
  const sets=[],args=[];let i=1;
  for(const k of keys){if(Object.prototype.hasOwnProperty.call(patch,k)){sets.push(k+'=$'+i++);args.push(patch[k])}}
  sets.push('updated_at=$'+i++);args.push(nowIso());
  args.push(siteId);
  if(sets.length)await pool.query('UPDATE wordpress_sites SET '+sets.join(',')+' WHERE site_id=$'+i,args);
}
async function wpCtrlStatus(site){
  try{
    const data=await wpCtrlRemote(site,'status');
    await wpCtrlMark(site.site_id,{status:data.suspended?'Suspenso':'Online',remote_suspended:!!data.suspended,suspend_mode:String(data.suspend_mode||''),last_checked_at:nowIso(),last_action:'status',last_action_at:nowIso(),last_error:null});
    return{ok:true,data};
  }catch(e){
    await wpCtrlMark(site.site_id,{status:'Erro',last_checked_at:nowIso(),last_action:'status',last_action_at:nowIso(),last_error:String(e.message||e).slice(0,500)});
    throw e;
  }
}
function wpCtrlDesignForSite(site,config){
  const key=['institutional','financial','premium'].includes(String(site.template_key||''))?String(site.template_key):config.defaultTemplate;
  const base={...(config.templates?.[key]||WP_CTRL_TEMPLATE_DEFAULTS.institutional)};
  let custom={};
  try{custom=typeof site.design_json==='string'?JSON.parse(site.design_json||'{}'):(site.design_json||{})}catch{custom={}}
  if(custom.messageOverride)base.message=String(custom.messageOverride).trim().slice(0,1400);
  if(custom.subtitleOverride)base.subtitle=String(custom.subtitleOverride).trim().slice(0,260);
  return{...base,template:key,progressPercent:Math.max(0,Math.min(100,Number(site.progress_percent??65)))};
}
async function wpCtrlAction(site,action,mode,reason){
  if(action==='suspend'&&!site.contract_allows_suspend)throw new Error('Suspensao nao autorizada para este cliente. Marque a clausula contratual primeiro.');
  const config=await wpCtrlGetConfig();
  const design=wpCtrlDesignForSite(site,config);
  const data=await wpCtrlRemote(site,action,action==='suspend'?{
    mode:mode||'manual',
    title:config.suspendTitle,
    message:config.suspendMessage,
    retry_after:config.retryAfterSeconds,
    reason:String(reason||'').slice(0,300),
    design
  }:{});
  const suspended=action==='suspend';
  await wpCtrlMark(site.site_id,{
    status:suspended?'Suspenso':'Online',
    remote_suspended:suspended,
    suspend_mode:suspended?(mode||'manual'):'',
    suspended_reason:suspended?String(reason||''):'',
    last_checked_at:nowIso(),last_action:action,last_action_at:nowIso(),last_error:null
  });
  return data;
}
async function wpCtrlOne(id){
  return one(pool,'SELECT * FROM wordpress_sites WHERE site_id=$1',[id]);
}
async function wpCtrlView(){
  const config=await wpCtrlGetConfig();
  const list=await rows(pool,"SELECT w.*,e.payload_json AS lead_payload FROM wordpress_sites w LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=w.lead_id AND e.deleted=FALSE ORDER BY w.updated_at DESC");
  const sites=[];
  for(const row of list){
    const finance=await wpCtrlFinance(row.lead_id,config);
    sites.push({
      siteId:row.site_id,leadId:row.lead_id,siteUrl:row.site_url,label:row.label||'',enabled:!!row.enabled,
      contractAllowsSuspend:!!row.contract_allows_suspend,autoSuspend:!!row.auto_suspend,autoResume:!!row.auto_resume,
      graceDays:Number(row.grace_days||config.defaultGraceDays),status:row.status||'Desconhecido',
      remoteSuspended:!!row.remote_suspended,suspendMode:row.suspend_mode||'',suspendedReason:row.suspended_reason||'',
      lastCheckedAt:row.last_checked_at,lastActionAt:row.last_action_at,lastAction:row.last_action||'',lastError:row.last_error||'',
      templateKey:row.template_key||config.defaultTemplate,progressPercent:Number(row.progress_percent??65),
      design:wpCtrlPayload({payload_json:row.design_json}),
      updatedAt:row.updated_at,leadPayload:wpCtrlPayload({payload_json:row.lead_payload}),finance
    });
  }
  return{ok:true,config,sites,summary:{
    total:sites.length,online:sites.filter(x=>x.status==='Online').length,suspended:sites.filter(x=>x.remoteSuspended).length,
    error:sites.filter(x=>x.status==='Erro').length,overdue:sites.filter(x=>x.finance.maxOverdueDays>0).length,
    automatic:sites.filter(x=>x.autoSuspend&&x.contractAllowsSuspend).length
  }};
}
async function wpCtrlCreate(body,session){
  const leadId=validId(body.leadId,180),siteUrl=wpCtrlNormalizeUrl(body.siteUrl),key=String(body.connectionKey||'').trim();
  if(!leadId||!siteUrl)return{status:400,body:{ok:false,error:'Cliente e URL HTTPS do WordPress sao obrigatorios.'}};
  if(key.length<32)return{status:400,body:{ok:false,error:'Informe a chave de conexao exibida pelo plugin EXE PRO Connector.'}};
  const lead=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
  if(!lead)return{status:404,body:{ok:false,error:'Cliente nao encontrado.'}};
  const id=crypto.randomUUID(),now=nowIso(),config=await wpCtrlGetConfig(),grace=Math.max(0,Math.min(90,Number(body.graceDays??config.defaultGraceDays)));
  try{
    const templateKey=['institutional','financial','premium'].includes(String(body.templateKey||''))?String(body.templateKey):config.defaultTemplate;
    const progressPercent=Math.max(0,Math.min(100,Number(body.progressPercent??65)));
    const designJson=JSON.stringify({messageOverride:String(body.messageOverride||'').trim().slice(0,1400),subtitleOverride:String(body.subtitleOverride||'').trim().slice(0,260)});
    const sql="INSERT INTO wordpress_sites(site_id,lead_id,site_url,site_url_norm,label,enabled,contract_allows_suspend,auto_suspend,auto_resume,grace_days,status,remote_suspended,created_at,updated_at,updated_by,template_key,progress_percent,design_json) VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,'Desconhecido',FALSE,$10,$10,$11,$12,$13,$14::jsonb)";
    await pool.query(sql,[id,leadId,siteUrl,String(body.label||'').trim().slice(0,160),body.enabled!==false,!!body.contractAllowsSuspend,!!body.autoSuspend,body.autoResume!==false,grace,now,session.username||'',templateKey,progressPercent,designJson]);
    await setSecret(wpCtrlSecretKey(id),key);
    const site=await wpCtrlOne(id);
    try{await wpCtrlStatus(site)}catch{}
    return{status:200,body:{ok:true,siteId:id,view:await wpCtrlView()}};
  }catch(e){
    if(/unique|duplicate/i.test(String(e.message||'')))return{status:409,body:{ok:false,error:'Este site WordPress ja esta conectado ao EXE PRO.'}};
    try{await pool.query('DELETE FROM wordpress_sites WHERE site_id=$1',[id])}catch{}
    throw e;
  }
}
async function wpCtrlPatch(body,session){
  const id=validId(body.siteId,180);if(!id)return{status:400,body:{ok:false,error:'Site invalido.'}};
  const current=await wpCtrlOne(id);if(!current)return{status:404,body:{ok:false,error:'Site nao encontrado.'}};
  const config=await wpCtrlGetConfig();
  const siteUrl=body.siteUrl===undefined?current.site_url:wpCtrlNormalizeUrl(body.siteUrl);
  if(!siteUrl)return{status:400,body:{ok:false,error:'URL HTTPS do WordPress invalida.'}};
  const leadId=body.leadId===undefined?current.lead_id:validId(body.leadId,180);
  if(!leadId)return{status:400,body:{ok:false,error:'Cliente invalido.'}};
  const grace=Math.max(0,Math.min(90,Number(body.graceDays??current.grace_days??config.defaultGraceDays)));
  const now=nowIso();
  try{
    const templateKey=['institutional','financial','premium'].includes(String(body.templateKey||current.template_key||''))?String(body.templateKey||current.template_key):config.defaultTemplate;
    const progressPercent=Math.max(0,Math.min(100,Number(body.progressPercent??current.progress_percent??65)));
    let currentDesign={};try{currentDesign=typeof current.design_json==='string'?JSON.parse(current.design_json||'{}'):(current.design_json||{})}catch{currentDesign={}}
    const designJson=JSON.stringify({...currentDesign,messageOverride:body.messageOverride===undefined?String(currentDesign.messageOverride||''):String(body.messageOverride||'').trim().slice(0,1400),subtitleOverride:body.subtitleOverride===undefined?String(currentDesign.subtitleOverride||''):String(body.subtitleOverride||'').trim().slice(0,260)});
    const sql="UPDATE wordpress_sites SET lead_id=$1,site_url=$2,site_url_norm=$2,label=$3,enabled=$4,contract_allows_suspend=$5,auto_suspend=$6,auto_resume=$7,grace_days=$8,updated_at=$9,updated_by=$10,template_key=$11,progress_percent=$12,design_json=$13::jsonb WHERE site_id=$14";
    await pool.query(sql,[leadId,siteUrl,String(body.label??current.label??'').trim().slice(0,160),body.enabled===undefined?current.enabled:!!body.enabled,
       body.contractAllowsSuspend===undefined?current.contract_allows_suspend:!!body.contractAllowsSuspend,
       body.autoSuspend===undefined?current.auto_suspend:!!body.autoSuspend,
       body.autoResume===undefined?current.auto_resume:!!body.autoResume,
       grace,now,session.username||'',templateKey,progressPercent,designJson,id]);
    if(String(body.connectionKey||'').trim())await setSecret(wpCtrlSecretKey(id),String(body.connectionKey).trim());
    return{status:200,body:{ok:true,view:await wpCtrlView()}};
  }catch(e){
    if(/unique|duplicate/i.test(String(e.message||'')))return{status:409,body:{ok:false,error:'Este site WordPress ja esta conectado ao EXE PRO.'}};
    throw e;
  }
}
async function wpCtrlRemove(body){
  const id=validId(body.siteId,180);if(!id)return{status:400,body:{ok:false,error:'Site invalido.'}};
  const site=await wpCtrlOne(id);if(!site)return{status:404,body:{ok:false,error:'Site nao encontrado.'}};
  if(site.remote_suspended&&!body.force)return{status:409,body:{ok:false,error:'O site ainda esta suspenso. Reative antes de remover a conexao ou confirme remocao forcada.'}};
  await pool.query('DELETE FROM wordpress_sites WHERE site_id=$1',[id]);
  await pool.query('DELETE FROM cloud_secrets WHERE secret_key=$1',[wpCtrlSecretKey(id)]);
  return{status:200,body:{ok:true,view:await wpCtrlView()}};
}
async function wpCtrlEvaluate(force){
  const config=await wpCtrlGetConfig();
  if(!config.automationEnabled&&!force)return{ok:true,skipped:true,reason:'Automacao WordPress desativada.'};
  const list=await rows(pool,'SELECT * FROM wordpress_sites WHERE enabled=TRUE ORDER BY updated_at ASC');
  let checked=0,suspended=0,resumed=0,failed=0;
  const details=[];
  for(const site of list){
    const finance=await wpCtrlFinance(site.lead_id,config);
    const grace=Math.max(0,Number(site.grace_days??config.defaultGraceDays));
    const shouldSuspend=!!site.auto_suspend&&!!site.contract_allows_suspend&&finance.maxOverdueDays>=grace&&finance.overdueCount>0;
    try{
      if(shouldSuspend&&!site.remote_suspended){
        await wpCtrlAction(site,'suspend','automatic','Inadimplencia: '+finance.maxOverdueDays+' dia(s) de atraso.');suspended++;
        details.push({siteId:site.site_id,action:'suspend',overdueDays:finance.maxOverdueDays});
      }else if(!finance.overdueCount&&site.remote_suspended&&site.suspend_mode==='automatic'&&site.auto_resume&&config.autoResume){
        await wpCtrlAction(site,'resume','automatic','Pagamento regularizado.');resumed++;
        details.push({siteId:site.site_id,action:'resume'});
      }
      checked++;
    }catch(e){
      failed++;details.push({siteId:site.site_id,action:'error',error:String(e.message||e).slice(0,300)});
      await wpCtrlMark(site.site_id,{status:'Erro',last_error:String(e.message||e).slice(0,500),last_action_at:nowIso(),last_action:'automation'});
    }
  }
  return{ok:true,checked,suspended,resumed,failed,details};
}
async function wpCtrlTick(){
  try{await wpCtrlEvaluate(false)}catch(e){console.error('WordPress control tick:',e.message)}
}


// --- EXE PRO 3.9.1: Portal do Cliente ---
const PORTAL_COOKIE='exe_portal_session';
const PORTAL_SESSION_DAYS=7;
const PORTAL_ROLES=new Set(['Proprietario','Financeiro','Marketing','Visualizador']);

function portalNormUser(v){
  return String(v||'').trim().toLowerCase().slice(0,180);
}
function portalRole(v){
  const s=String(v||'Visualizador').trim();
  return PORTAL_ROLES.has(s)?s:'Visualizador';
}
function portalHashPassword(password){
  const p=String(password||'');
  if(p.length<8)throw new Error('A senha do portal precisa ter pelo menos 8 caracteres.');
  const salt=crypto.randomBytes(16);
  const hash=crypto.scryptSync(p,salt,32);
  return 'scrypt$'+salt.toString('base64url')+'$'+hash.toString('base64url');
}
function portalVerifyPassword(password,stored){
  try{
    const parts=String(stored||'').split('$');
    if(parts.length!==3||parts[0]!=='scrypt')return false;
    const salt=Buffer.from(parts[1],'base64url'),expected=Buffer.from(parts[2],'base64url');
    const got=crypto.scryptSync(String(password||''),salt,expected.length);
    return expected.length===got.length&&crypto.timingSafeEqual(expected,got);
  }catch{return false}
}
function portalTokenHash(token){
  return crypto.createHash('sha256').update(String(token||'')).digest('hex');
}
function portalCookies(req){
  const out={};
  for(const part of String(req.headers.cookie||'').split(';')){
    const i=part.indexOf('=');if(i<1)continue;
    const k=part.slice(0,i).trim(),v=part.slice(i+1).trim();
    try{out[k]=decodeURIComponent(v)}catch{out[k]=v}
  }
  return out;
}
function portalIp(req){
  const f=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  return (f||req.socket?.remoteAddress||'unknown').slice(0,120);
}
function portalCookie(token,maxAge){
  return PORTAL_COOKIE+'='+encodeURIComponent(token)+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+String(maxAge);
}
async function portalGuard(req,username){
  const key=crypto.createHash('sha256').update('portal|'+portalIp(req)+'|'+portalNormUser(username)).digest('hex');
  const row=await one(pool,'SELECT * FROM portal_login_guard WHERE guard_key=$1',[key]);
  const now=Date.now(),blocked=row?.blocked_until?Date.parse(row.blocked_until):0;
  return{key,row,blocked:blocked>now,blockedUntil:row?.blocked_until||null};
}
async function portalGuardFail(key,row){
  const fail=Number(row?.fail_count||0)+1,now=nowIso();
  let blocked=null;
  if(fail>=5)blocked=new Date(Date.now()+15*60*1000).toISOString();
  await pool.query("INSERT INTO portal_login_guard(guard_key,fail_count,blocked_until,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(guard_key) DO UPDATE SET fail_count=EXCLUDED.fail_count,blocked_until=EXCLUDED.blocked_until,updated_at=EXCLUDED.updated_at",[key,fail,blocked,now]);
}
async function portalGuardSuccess(key){
  await pool.query('DELETE FROM portal_login_guard WHERE guard_key=$1',[key]);
}
async function portalLogin(req,res,body){
  const username=portalNormUser(body.username),password=String(body.password||'');
  if(!username||!password)return json(res,400,{ok:false,error:'Informe usuario e senha.'});
  const guard=await portalGuard(req,username);
  if(guard.blocked)return json(res,429,{ok:false,error:'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'});
  const user=await one(pool,'SELECT * FROM portal_users WHERE username_ci=$1',[username]);
  if(!user||!user.active||!portalVerifyPassword(password,user.password_hash)){
    await portalGuardFail(guard.key,guard.row);
    return json(res,401,{ok:false,error:'Usuario ou senha invalidos.'});
  }
  const lead=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[user.lead_id]);
  if(!lead){
    await portalGuardFail(guard.key,guard.row);
    return json(res,403,{ok:false,error:'Cadastro do cliente nao esta disponivel.'});
  }
  await portalGuardSuccess(guard.key);
  const token=crypto.randomBytes(32).toString('base64url'),tokenHash=portalTokenHash(token),csrf=crypto.randomBytes(24).toString('base64url');
  const now=nowIso(),expires=new Date(Date.now()+PORTAL_SESSION_DAYS*86400000).toISOString();
  await pool.query('DELETE FROM portal_sessions WHERE expires_at<$1',[now]);
  await pool.query('INSERT INTO portal_sessions(token_hash,user_id,lead_id,csrf_token,created_at,expires_at,last_seen_at) VALUES($1,$2,$3,$4,$5,$6,$5)',[tokenHash,user.user_id,user.lead_id,csrf,now,expires]);
  await pool.query('UPDATE portal_users SET last_login_at=$1,updated_at=$1 WHERE user_id=$2',[now,user.user_id]);
  res.setHeader('set-cookie',portalCookie(token,PORTAL_SESSION_DAYS*86400));
  return json(res,200,{ok:true,csrf,user:{userId:user.user_id,username:user.username,role:user.role,leadId:user.lead_id}});
}
async function portalAuth(req,res,write){
  const token=portalCookies(req)[PORTAL_COOKIE];
  if(!token){json(res,401,{ok:false,error:'Sessao do portal nao encontrada.'});return null}
  const sql="SELECT s.*,u.username,u.role,u.active FROM portal_sessions s JOIN portal_users u ON u.user_id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>$2";
  const row=await one(pool,sql,[portalTokenHash(token),nowIso()]);
  if(!row||!row.active){res.setHeader('set-cookie',portalCookie('',0));json(res,401,{ok:false,error:'Sessao expirada.'});return null}
  if(write){
    const csrf=String(req.headers['x-csrf-token']||'');
    if(!csrf||csrf!==row.csrf_token){json(res,403,{ok:false,error:'CSRF invalido.'});return null}
  }
  await pool.query('UPDATE portal_sessions SET last_seen_at=$1 WHERE token_hash=$2',[nowIso(),row.token_hash]);
  return{tokenHash:row.token_hash,userId:row.user_id,leadId:row.lead_id,username:row.username,role:row.role,csrf:row.csrf_token};
}
async function portalLogout(req,res){
  const token=portalCookies(req)[PORTAL_COOKIE];
  if(token)await pool.query('DELETE FROM portal_sessions WHERE token_hash=$1',[portalTokenHash(token)]);
  res.setHeader('set-cookie',portalCookie('',0));
  return json(res,200,{ok:true});
}
function portalPayload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function portalMoneyNum(v){
  const n=Number(v);return Number.isFinite(n)?n:0;
}
function portalToday(){
  return new Date(Date.now()-3*60*60*1000).toISOString().slice(0,10);
}
function portalSanitizeBrand(b){
  b=b||{};
  return{
    name:String(b.agencyName||b.companyName||b.brandName||'EXEKUTA').slice(0,160),
    logo:String(b.logoUrl||b.logoDataUrl||'').slice(0,150000),
    accent:String(b.accentColor||b.primaryColor||'#18b7a4').slice(0,32),
    supportEmail:String(b.supportEmail||b.email||'').slice(0,180),
    supportWhatsapp:String(b.whatsapp||b.phone||'').slice(0,80),
    pixKey:String(b.pixKey||'').slice(0,220)
  };
}
function portalServiceItems(lead){
  const p=portalPayload(lead),items=Array.isArray(p.clientServiceItems)?p.clientServiceItems:[];
  return items.map((x,i)=>({
    id:String(x?.id||('service-'+i)).slice(0,180),
    name:String(x?.name||'Servico').slice(0,180),
    siteUrl:String(x?.siteUrl||'').slice(0,500),
    price:portalMoneyNum(x?.price),
    billingCycle:String(x?.billingCycle||'Mensal').slice(0,40),
    billingDay:Math.max(1,Math.min(28,Number(x?.billingDay||10))),
    status:String(x?.status||'Ativo').slice(0,40)
  }));
}
async function portalDashboard(session){
  const lead=await one(pool,"SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[session.leadId]);
  if(!lead)throw new Error('Cliente nao encontrado.');
  const p=portalPayload(lead),brand=portalSanitizeBrand(await getBranding());
  const sitePromise=rows(pool,'SELECT site_id,site_url,label,status,remote_suspended,last_checked_at FROM wordpress_sites WHERE lead_id=$1 AND enabled=TRUE ORDER BY updated_at DESC',[session.leadId]);
  const recvPromise=rows(pool,"SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='receivable' AND deleted=FALSE AND payload_json->>'leadId'=$1 ORDER BY COALESCE(payload_json->>'dueDate','') DESC",[session.leadId]);
  const projectPromise=rows(pool,"SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='project' AND deleted=FALSE AND payload_json->>'leadId'=$1 ORDER BY updated_at DESC",[session.leadId]);
  const all=await Promise.all([sitePromise,recvPromise,projectPromise]);
  const siteRows=all[0],recvRows=all[1],projectRows=all[2];
  const services=portalServiceItems(lead);
  const sites=siteRows.map(s=>({
    siteId:s.site_id,siteUrl:s.site_url,label:s.label||s.site_url,
    status:s.remote_suspended?'Temporariamente indisponivel':(s.status||'Desconhecido'),
    lastCheckedAt:s.last_checked_at||null
  }));
  const today=portalToday();
  let pending=0,overdue=0,paid=0,nextDue='',nextAmount=0;
  const finance=recvRows.map(r=>{
    const x=portalPayload(r),st=String(x.status||'Pendente'),due=String(x.dueDate||'').slice(0,10),amount=portalMoneyNum(x.amount);
    const low=st.toLowerCase(),isPaid=low.includes('pago'),isCancelled=low.includes('cancel'),isOverdue=!isPaid&&!isCancelled&&due&&due<today;
    if(isPaid)paid+=amount;else if(!isCancelled){pending+=amount;if(isOverdue)overdue+=amount;if(due&&(!nextDue||due<nextDue)){nextDue=due;nextAmount=amount}}
    return{
      receivableId:r.entity_id,
      description:String(x.description||x.title||'Cobranca').slice(0,220),
      amount,dueDate:due,status:st.slice(0,60),paymentMethod:String(x.paymentMethod||'').slice(0,80),
      overdue:isOverdue,updatedAt:r.updated_at
    };
  });
  const projects=projectRows.map(r=>{
    const x=portalPayload(r),progress=Math.max(0,Math.min(100,Number(x.progress??x.percentComplete??x.completion??0)||0));
    return{
      projectId:r.entity_id,title:String(x.title||x.name||'Projeto').slice(0,220),
      status:String(x.status||'Em andamento').slice(0,80),progress,
      startDate:String(x.startDate||'').slice(0,10),
      deadline:String(x.deadline||x.dueDate||x.endDate||'').slice(0,10),
      summary:String(x.clientSummary||x.summary||x.description||'').slice(0,1200),
      updatedAt:r.updated_at
    };
  });
  const monthly=services.filter(x=>x.status==='Ativo'&&x.billingCycle==='Mensal').reduce((a,x)=>a+x.price,0)||
    portalMoneyNum(p.clientMonthlyAmount||p.monthlyAmount||p.dealValue);
  const role=portalRole(session.role),showFinance=role==='Proprietario'||role==='Financeiro';
  const safeServices=showFinance?services:services.map(x=>({...x,price:null}));
  return{
    ok:true,csrf:session.csrf,user:{username:session.username,role},
    branding:brand,
    client:{
      clientId:lead.entity_id,name:String(p.name||p.companyName||'Cliente').slice(0,220),
      legalName:String(p.legalName||'').slice(0,220),document:String(p.document||'').slice(0,80),
      email:String(p.email||'').slice(0,180),phone:String(p.phone||'').slice(0,80),
      whatsapp:String(p.whatsapp||'').slice(0,80),city:String(p.city||'').slice(0,120),state:String(p.state||'').slice(0,40),
      status:String(p.clientAccountStatus||'Ativo').slice(0,60),clientSince:String(p.clientSince||'').slice(0,10),
      monthly:showFinance?monthly:null
    },
    permissions:{finance:showFinance,services:true,sites:true,projects:role!=='Financeiro'},
    summary:{services:services.filter(x=>x.status==='Ativo').length,sites:sites.length,projects:projects.length,monthly:showFinance?monthly:null,
      pending:showFinance?pending:null,overdue:showFinance?overdue:null,nextDue:showFinance?nextDue:'',nextAmount:showFinance?nextAmount:null},
    services:safeServices,sites,finance:showFinance?finance:[],projects:role==='Financeiro'?[]:projects
  };
}
async function portalAdminList(){
  const sql="SELECT u.user_id,u.lead_id,u.username,u.role,u.active,u.created_at,u.updated_at,u.last_login_at,e.payload_json AS lead_payload FROM portal_users u LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=u.lead_id ORDER BY u.updated_at DESC";
  const rr=await rows(pool,sql);
  return{ok:true,portalPath:'/portal/',users:rr.map(r=>({
    userId:r.user_id,leadId:r.lead_id,username:r.username,role:r.role,active:!!r.active,
    createdAt:r.created_at,updatedAt:r.updated_at,lastLoginAt:r.last_login_at,
    client:portalPayload({payload_json:r.lead_payload})
  }))};
}
async function portalAdminCreate(body,session){
  const leadId=validId(body.leadId,180),username=String(body.username||'').trim().slice(0,180),usernameCi=portalNormUser(username);
  if(!leadId||!usernameCi)return{status:400,body:{ok:false,error:'Cliente e usuario sao obrigatorios.'}};
  const lead=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
  if(!lead)return{status:404,body:{ok:false,error:'Cliente nao encontrado.'}};
  const lp=portalPayload(lead);
  if(!(lp.crmStatus==='Cliente'||lp.clientSince))return{status:400,body:{ok:false,error:'O acesso do portal so pode ser criado para um Cliente.'}};
  let passwordHash;
  try{passwordHash=portalHashPassword(body.password)}catch(e){return{status:400,body:{ok:false,error:e.message}}}
  const id=crypto.randomUUID(),now=nowIso(),role=portalRole(body.role);
  try{
    await pool.query('INSERT INTO portal_users(user_id,lead_id,username,username_ci,password_hash,role,active,must_change_password,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,TRUE,FALSE,$7,$7)',[id,leadId,username,usernameCi,passwordHash,role,now]);
  }catch(e){
    if(/unique|duplicate/i.test(String(e.message||'')))return{status:409,body:{ok:false,error:'Este usuario ja existe no Portal do Cliente.'}};
    throw e;
  }
  return{status:200,body:{ok:true,userId:id,list:await portalAdminList()}};
}
async function portalAdminPatch(body){
  const id=validId(body.userId,180);if(!id)return{status:400,body:{ok:false,error:'Usuario do portal invalido.'}};
  const current=await one(pool,'SELECT * FROM portal_users WHERE user_id=$1',[id]);
  if(!current)return{status:404,body:{ok:false,error:'Usuario do portal nao encontrado.'}};
  const username=body.username===undefined?current.username:String(body.username||'').trim().slice(0,180);
  const usernameCi=portalNormUser(username);
  if(!usernameCi)return{status:400,body:{ok:false,error:'Usuario nao pode ficar vazio.'}};
  let passwordHash=current.password_hash;
  if(String(body.password||'')){try{passwordHash=portalHashPassword(body.password)}catch(e){return{status:400,body:{ok:false,error:e.message}}}}
  const role=body.role===undefined?current.role:portalRole(body.role),active=body.active===undefined?current.active:!!body.active,now=nowIso();
  try{
    await pool.query('UPDATE portal_users SET username=$1,username_ci=$2,password_hash=$3,role=$4,active=$5,updated_at=$6 WHERE user_id=$7',[username,usernameCi,passwordHash,role,active,now,id]);
  }catch(e){
    if(/unique|duplicate/i.test(String(e.message||'')))return{status:409,body:{ok:false,error:'Este usuario ja existe no Portal do Cliente.'}};
    throw e;
  }
  if(!active||String(body.password||''))await pool.query('DELETE FROM portal_sessions WHERE user_id=$1',[id]);
  return{status:200,body:{ok:true,list:await portalAdminList()}};
}
async function portalAdminRemove(body){
  const id=validId(body.userId,180);if(!id)return{status:400,body:{ok:false,error:'Usuario do portal invalido.'}};
  await pool.query('DELETE FROM portal_sessions WHERE user_id=$1',[id]);
  const q=await pool.query('DELETE FROM portal_users WHERE user_id=$1',[id]);
  return{status:200,body:{ok:true,deleted:q.rowCount,list:await portalAdminList()}};
}


// --- EXE PRO 3.9.1: Chamados, Arquivos, Comprovantes e Timeline ---
const PORTAL_FILE_MAX_BYTES=8*1024*1024;
const PORTAL_FILE_MIME=new Set([
  'application/pdf','image/jpeg','image/png','image/webp','text/plain','application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const PORTAL_TICKET_STATUS=new Set(['Aberto','Em andamento','Aguardando cliente','Resolvido','Fechado']);
const PORTAL_TICKET_PRIORITY=new Set(['Baixa','Normal','Alta','Urgente']);
const PORTAL_TICKET_CATEGORY=new Set(['Site','SEO','Conteudo','Financeiro','Suporte','Outro']);

function portalOpClean(v,max){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
function portalOpRoleCanFinance(role){
  role=portalRole(role);
  return role==='Proprietario'||role==='Financeiro';
}
function portalOpCategory(v){
  const x=portalOpClean(v,40);
  return PORTAL_TICKET_CATEGORY.has(x)?x:'Outro';
}
function portalOpPriority(v){
  const x=portalOpClean(v,30);
  return PORTAL_TICKET_PRIORITY.has(x)?x:'Normal';
}
function portalOpStatus(v){
  const x=portalOpClean(v,40);
  return PORTAL_TICKET_STATUS.has(x)?x:'Aberto';
}
async function portalReadJsonLarge(req,maxBytes=12*1024*1024){
  return await new Promise((resolve,reject)=>{
    let size=0,chunks=[],done=false;
    function fail(e){if(done)return;done=true;reject(e)}
    req.on('data',chunk=>{
      if(done)return;
      size+=chunk.length;
      if(size>maxBytes){
        const e=new Error('Arquivo ou requisicao excede o limite permitido.');
        e.statusCode=413;fail(e);return;
      }
      chunks.push(chunk);
    });
    req.on('end',()=>{
      if(done)return;
      done=true;
      try{
        const raw=Buffer.concat(chunks).toString('utf8');
        resolve(raw?JSON.parse(raw):{});
      }catch{
        const e=new Error('JSON invalido.');e.statusCode=400;reject(e);
      }
    });
    req.on('error',fail);
  });
}
function portalParseUpload(body){
  const filename=portalOpClean(body.filename,220).replace(/[\\/:*?"<>|]+/g,'_');
  let mime=portalOpClean(body.mimeType,140).toLowerCase();
  let b64=String(body.base64||'').trim();
  const m=b64.match(/^data:([^;]+);base64,(.*)$/s);
  if(m){if(!mime)mime=String(m[1]||'').toLowerCase();b64=m[2]}
  if(!filename)throw new Error('Nome do arquivo ausente.');
  if(!PORTAL_FILE_MIME.has(mime))throw new Error('Tipo de arquivo nao permitido.');
  let bytes;
  try{bytes=Buffer.from(b64,'base64')}catch{throw new Error('Arquivo invalido.')}
  if(!bytes.length)throw new Error('Arquivo vazio.');
  if(bytes.length>PORTAL_FILE_MAX_BYTES)throw new Error('O arquivo excede 8 MB.');
  return{filename,mimeType:mime,bytes};
}
async function portalStoreFile(opts){
  const fileId=crypto.randomUUID(),now=nowIso();
  await pool.query(
    'INSERT INTO portal_files(file_id,lead_id,ticket_id,category,visibility,filename,mime_type,byte_size,content_bytes,uploaded_by_type,uploaded_by_id,uploaded_by_name,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
    [fileId,opts.leadId,opts.ticketId||null,portalOpClean(opts.category,80)||'Arquivo',opts.visibility==='Interno'?'Interno':'Cliente',opts.upload.filename,opts.upload.mimeType,opts.upload.bytes.length,opts.upload.bytes,opts.authorType,opts.authorId||null,portalOpClean(opts.authorName,180),now]
  );
  return{fileId,createdAt:now};
}
function portalFileMeta(r){
  return{
    fileId:r.file_id,leadId:r.lead_id,ticketId:r.ticket_id||null,category:r.category,visibility:r.visibility,
    filename:r.filename,mimeType:r.mime_type,byteSize:Number(r.byte_size||0),uploadedByType:r.uploaded_by_type,
    uploadedByName:r.uploaded_by_name||'',createdAt:r.created_at
  };
}
async function portalFileRow(fileId){
  return one(pool,'SELECT * FROM portal_files WHERE file_id=$1',[fileId]);
}
function portalSendFile(res,row){
  const name=String(row.filename||'arquivo').replace(/[\r\n"]/g,'_');
  res.writeHead(200,{
    'content-type':row.mime_type||'application/octet-stream',
    'content-length':Number(row.byte_size||row.content_bytes?.length||0),
    'content-disposition':'attachment; filename="'+name+'"',
    'cache-control':'private, no-store',
    'x-content-type-options':'nosniff'
  });
  return res.end(row.content_bytes);
}
function portalTicketDto(r){
  return{
    ticketId:r.ticket_id,leadId:r.lead_id,createdByUserId:r.created_by_user_id||null,
    category:r.category,subject:r.subject,description:r.description,priority:r.priority,status:r.status,
    assignedTo:r.assigned_to||'',createdAt:r.created_at,updatedAt:r.updated_at,closedAt:r.closed_at||null,
    client:r.lead_payload?portalPayload({payload_json:r.lead_payload}):undefined
  };
}
async function portalTicketMessages(ticketId,leadId){
  const rr=await rows(pool,'SELECT * FROM portal_ticket_messages WHERE ticket_id=$1 AND lead_id=$2 ORDER BY created_at ASC',[ticketId,leadId]);
  return rr.map(r=>({messageId:r.message_id,authorType:r.author_type,authorName:r.author_name||'',body:r.body,createdAt:r.created_at}));
}
async function portalTicketList(leadId){
  const rr=await rows(pool,'SELECT * FROM portal_tickets WHERE lead_id=$1 ORDER BY updated_at DESC',[leadId]);
  const out=[];
  for(const r of rr){
    const files=await rows(pool,"SELECT file_id,lead_id,ticket_id,category,visibility,filename,mime_type,byte_size,uploaded_by_type,uploaded_by_name,created_at FROM portal_files WHERE ticket_id=$1 AND visibility='Cliente' ORDER BY created_at DESC",[r.ticket_id]);
    out.push({...portalTicketDto(r),messages:await portalTicketMessages(r.ticket_id,leadId),files:files.map(portalFileMeta)});
  }
  return out;
}
async function portalTicketCreate(session,body){
  const subject=portalOpClean(body.subject,180),description=portalOpClean(body.description,6000);
  if(!subject||!description)throw new Error('Informe assunto e descricao do chamado.');
  const id=crypto.randomUUID(),now=nowIso(),category=portalOpCategory(body.category),priority=portalOpPriority(body.priority);
  await pool.query('INSERT INTO portal_tickets(ticket_id,lead_id,created_by_user_id,category,subject,description,priority,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
    [id,session.leadId,session.userId,category,subject,description,priority,'Aberto',now]);
  await pool.query('INSERT INTO portal_ticket_messages(message_id,ticket_id,lead_id,author_type,author_id,author_name,body,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [crypto.randomUUID(),id,session.leadId,'Cliente',session.userId,session.username,description,now]);
  return{id};
}
async function portalTicketAddMessage(opts){
  const body=portalOpClean(opts.body,6000);
  if(!body)throw new Error('Digite uma mensagem.');
  const ticket=await one(pool,'SELECT * FROM portal_tickets WHERE ticket_id=$1 AND lead_id=$2',[opts.ticketId,opts.leadId]);
  if(!ticket)throw new Error('Chamado nao encontrado.');
  const now=nowIso();
  await pool.query('INSERT INTO portal_ticket_messages(message_id,ticket_id,lead_id,author_type,author_id,author_name,body,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [crypto.randomUUID(),opts.ticketId,opts.leadId,opts.authorType,opts.authorId||null,portalOpClean(opts.authorName,180),body,now]);
  let nextStatus=ticket.status;
  if(opts.authorType==='Cliente'&&ticket.status==='Aguardando cliente')nextStatus='Em andamento';
  if(opts.authorType==='Equipe'&&ticket.status==='Aberto')nextStatus='Em andamento';
  await pool.query('UPDATE portal_tickets SET status=$1,updated_at=$2 WHERE ticket_id=$3',[nextStatus,now,opts.ticketId]);
}
async function portalTicketAdminPatch(body,username){
  const id=validId(body.ticketId,180);if(!id)throw new Error('Chamado invalido.');
  const current=await one(pool,'SELECT * FROM portal_tickets WHERE ticket_id=$1',[id]);if(!current)throw new Error('Chamado nao encontrado.');
  const status=body.status===undefined?current.status:portalOpStatus(body.status);
  const priority=body.priority===undefined?current.priority:portalOpPriority(body.priority);
  const assigned=body.assignedTo===undefined?current.assigned_to:portalOpClean(body.assignedTo,180);
  const now=nowIso(),closed=(status==='Resolvido'||status==='Fechado')?(current.closed_at||now):null;
  await pool.query('UPDATE portal_tickets SET status=$1,priority=$2,assigned_to=$3,updated_at=$4,closed_at=$5 WHERE ticket_id=$6',[status,priority,assigned||null,now,closed,id]);
  if(body.message)await portalTicketAddMessage({ticketId:id,leadId:current.lead_id,authorType:'Equipe',authorId:username,authorName:username,body:body.message});
}
async function portalProofList(leadId){
  const sql="SELECT p.*,f.filename,f.mime_type,f.byte_size,r.payload_json AS receivable_payload FROM portal_payment_proofs p JOIN portal_files f ON f.file_id=p.file_id LEFT JOIN entities r ON r.entity_type='receivable' AND r.entity_id=p.receivable_id WHERE p.lead_id=$1 ORDER BY p.submitted_at DESC";
  const rr=await rows(pool,sql,[leadId]);
  return rr.map(r=>({
    proofId:r.proof_id,receivableId:r.receivable_id,fileId:r.file_id,filename:r.filename,mimeType:r.mime_type,byteSize:Number(r.byte_size||0),
    note:r.note||'',status:r.status,submittedAt:r.submitted_at,reviewedAt:r.reviewed_at||null,reviewedBy:r.reviewed_by||'',reviewNote:r.review_note||'',
    receivable:portalPayload({payload_json:r.receivable_payload})
  }));
}
async function portalProofCreate(session,body){
  if(!portalOpRoleCanFinance(session.role))throw new Error('Seu perfil nao pode enviar comprovantes financeiros.');
  const receivableId=validId(body.receivableId,180);if(!receivableId)throw new Error('Cobranca invalida.');
  const rec=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='receivable' AND entity_id=$1 AND deleted=FALSE AND payload_json->>'leadId'=$2",[receivableId,session.leadId]);
  if(!rec)throw new Error('Cobranca nao encontrada para este cliente.');
  const upload=portalParseUpload(body);
  const stored=await portalStoreFile({leadId:session.leadId,category:'Comprovante',visibility:'Cliente',upload,authorType:'Cliente',authorId:session.userId,authorName:session.username});
  const proofId=crypto.randomUUID(),now=nowIso();
  await pool.query('INSERT INTO portal_payment_proofs(proof_id,lead_id,receivable_id,file_id,submitted_by_user_id,note,status,submitted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [proofId,session.leadId,receivableId,stored.fileId,session.userId,portalOpClean(body.note,1200),'Aguardando conferencia',now]);
  return{proofId,fileId:stored.fileId};
}
async function portalProofAdminPatch(body,username){
  const id=validId(body.proofId,180);if(!id)throw new Error('Comprovante invalido.');
  const proof=await one(pool,'SELECT * FROM portal_payment_proofs WHERE proof_id=$1',[id]);if(!proof)throw new Error('Comprovante nao encontrado.');
  const status=portalOpClean(body.status,60);
  if(!['Aguardando conferencia','Aprovado','Recusado'].includes(status))throw new Error('Status de comprovante invalido.');
  await pool.query('UPDATE portal_payment_proofs SET status=$1,reviewed_at=$2,reviewed_by=$3,review_note=$4 WHERE proof_id=$5',
    [status,nowIso(),username,portalOpClean(body.reviewNote,1200),id]);
}
async function portalFileList(leadId){
  const rr=await rows(pool,"SELECT file_id,lead_id,ticket_id,category,visibility,filename,mime_type,byte_size,uploaded_by_type,uploaded_by_name,created_at FROM portal_files WHERE lead_id=$1 AND visibility='Cliente' ORDER BY created_at DESC",[leadId]);
  return rr.map(portalFileMeta);
}
async function portalTimeline(leadId,showFinance){
  const events=[];
  const qTickets=rows(pool,'SELECT ticket_id,subject,status,updated_at,created_at FROM portal_tickets WHERE lead_id=$1 ORDER BY updated_at DESC LIMIT 60',[leadId]);
  const qFiles=rows(pool,"SELECT file_id,filename,category,created_at FROM portal_files WHERE lead_id=$1 AND visibility='Cliente' ORDER BY created_at DESC LIMIT 60",[leadId]);
  const qProjects=rows(pool,"SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='project' AND deleted=FALSE AND payload_json->>'leadId'=$1 ORDER BY updated_at DESC LIMIT 60",[leadId]);
  const qRec=showFinance?rows(pool,"SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='receivable' AND deleted=FALSE AND payload_json->>'leadId'=$1 ORDER BY updated_at DESC LIMIT 60",[leadId]):Promise.resolve([]);
  const qProofs=showFinance?rows(pool,'SELECT proof_id,receivable_id,status,submitted_at,reviewed_at FROM portal_payment_proofs WHERE lead_id=$1 ORDER BY submitted_at DESC LIMIT 60',[leadId]):Promise.resolve([]);
  const all=await Promise.all([qTickets,qFiles,qProjects,qRec,qProofs]);
  for(const x of all[0])events.push({type:'Chamado',title:x.subject,detail:'Status: '+x.status,at:x.updated_at||x.created_at,refId:x.ticket_id});
  for(const x of all[1])events.push({type:'Arquivo',title:x.filename,detail:x.category||'Arquivo',at:x.created_at,refId:x.file_id});
  for(const x of all[2]){const p=portalPayload(x);events.push({type:'Projeto',title:String(p.title||p.name||'Projeto'),detail:'Status: '+String(p.status||'Em andamento'),at:x.updated_at,refId:x.entity_id})}
  for(const x of all[3]){const p=portalPayload(x);events.push({type:'Financeiro',title:String(p.description||p.title||'Cobranca'),detail:String(p.status||'Pendente')+' · '+Number(p.amount||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),at:x.updated_at,refId:x.entity_id})}
  for(const x of all[4])events.push({type:'Comprovante',title:'Comprovante de pagamento',detail:x.status,at:x.reviewed_at||x.submitted_at,refId:x.proof_id});
  return events.filter(x=>x.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,100);
}
async function portalOperations(session){
  const showFinance=portalOpRoleCanFinance(session.role);
  const all=await Promise.all([
    portalTicketList(session.leadId),
    portalFileList(session.leadId),
    showFinance?portalProofList(session.leadId):Promise.resolve([]),
    portalTimeline(session.leadId,showFinance)
  ]);
  const tickets=all[0],files=all[1],proofs=all[2],timeline=all[3];
  return{
    ok:true,csrf:session.csrf,
    permissions:{finance:showFinance},
    counts:{openTickets:tickets.filter(x=>!['Resolvido','Fechado'].includes(x.status)).length,files:files.length,pendingProofs:proofs.filter(x=>x.status==='Aguardando conferencia').length},
    tickets,files,proofs,timeline
  };
}
async function portalAdminOperations(leadId){
  const ticketSql=leadId?
    "SELECT t.*,e.payload_json AS lead_payload FROM portal_tickets t LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=t.lead_id WHERE t.lead_id=$1 ORDER BY t.updated_at DESC LIMIT 500":
    "SELECT t.*,e.payload_json AS lead_payload FROM portal_tickets t LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=t.lead_id ORDER BY t.updated_at DESC LIMIT 500";
  const tickets=await rows(pool,ticketSql,leadId?[leadId]:[]);
  const fileSql=leadId?
    "SELECT f.*,e.payload_json AS lead_payload FROM portal_files f LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=f.lead_id WHERE f.lead_id=$1 ORDER BY f.created_at DESC LIMIT 500":
    "SELECT f.*,e.payload_json AS lead_payload FROM portal_files f LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=f.lead_id ORDER BY f.created_at DESC LIMIT 500";
  const files=await rows(pool,fileSql,leadId?[leadId]:[]);
  const proofSql=leadId?
    "SELECT p.*,f.filename,f.mime_type,f.byte_size,e.payload_json AS lead_payload,r.payload_json AS receivable_payload FROM portal_payment_proofs p JOIN portal_files f ON f.file_id=p.file_id LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=p.lead_id LEFT JOIN entities r ON r.entity_type='receivable' AND r.entity_id=p.receivable_id WHERE p.lead_id=$1 ORDER BY p.submitted_at DESC LIMIT 500":
    "SELECT p.*,f.filename,f.mime_type,f.byte_size,e.payload_json AS lead_payload,r.payload_json AS receivable_payload FROM portal_payment_proofs p JOIN portal_files f ON f.file_id=p.file_id LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=p.lead_id LEFT JOIN entities r ON r.entity_type='receivable' AND r.entity_id=p.receivable_id ORDER BY p.submitted_at DESC LIMIT 500";
  const proofs=await rows(pool,proofSql,leadId?[leadId]:[]);
  const ticketDtos=[];
  for(const t of tickets)ticketDtos.push({...portalTicketDto(t),messages:await portalTicketMessages(t.ticket_id,t.lead_id)});
  return{
    ok:true,
    counts:{openTickets:ticketDtos.filter(x=>!['Resolvido','Fechado'].includes(x.status)).length,files:files.length,pendingProofs:proofs.filter(x=>x.status==='Aguardando conferencia').length},
    tickets:ticketDtos,
    files:files.map(r=>({...portalFileMeta(r),client:portalPayload({payload_json:r.lead_payload})})),
    proofs:proofs.map(r=>({proofId:r.proof_id,leadId:r.lead_id,receivableId:r.receivable_id,fileId:r.file_id,filename:r.filename,mimeType:r.mime_type,byteSize:Number(r.byte_size||0),note:r.note||'',status:r.status,submittedAt:r.submitted_at,reviewedAt:r.reviewed_at||null,reviewedBy:r.reviewed_by||'',reviewNote:r.review_note||'',client:portalPayload({payload_json:r.lead_payload}),receivable:portalPayload({payload_json:r.receivable_payload})}))
  };
}


// --- EXE PRO 3.9.1: Relatorios SEO + Portal ---
const SEO_REPORT_STATUS=new Set(['Rascunho','Publicado']);
const SEO_STRATEGIES=new Set(['mobile','desktop']);

function seoClean(v,max=500){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
function seoNum(v){
  const n=Number(v);return Number.isFinite(n)?n:0;
}
function seoNullableNum(v){
  if(v===null||v===undefined||v==='')return null;
  const n=Number(v);return Number.isFinite(n)?n:null;
}
function seoDate(v){
  const s=String(v||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';
}
function seoList(v,maxItems=20,maxLen=600){
  const a=Array.isArray(v)?v:String(v||'').split(/\r?\n/);
  return a.map(x=>seoClean(x,maxLen)).filter(Boolean).slice(0,maxItems);
}
function seoMetrics(v){
  const x=v&&typeof v==='object'?v:{};
  return{
    organicClicks:seoNum(x.organicClicks),
    impressions:seoNum(x.impressions),
    ctr:seoNum(x.ctr),
    avgPosition:seoNum(x.avgPosition),
    sessions:seoNum(x.sessions),
    users:seoNum(x.users),
    conversions:seoNum(x.conversions),
    keywordsTop10:seoNum(x.keywordsTop10),
    localRating:seoNum(x.localRating),
    localReviews:seoNum(x.localReviews),
    pagespeedMobile:seoNum(x.pagespeedMobile),
    pagespeedDesktop:seoNum(x.pagespeedDesktop),
    lcpMobile:seoNullableNum(x.lcpMobile),
    lcpDesktop:seoNullableNum(x.lcpDesktop),
    clsMobile:seoNullableNum(x.clsMobile),
    clsDesktop:seoNullableNum(x.clsDesktop),
    inpMobile:seoNullableNum(x.inpMobile),
    inpDesktop:seoNullableNum(x.inpDesktop)
  };
}
function seoNormalizePublicUrl(raw){
  let u;
  try{u=new URL(String(raw||'').trim())}catch{return''}
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return'';
  const h=String(u.hostname||'').toLowerCase();
  if(!h||h==='localhost'||h.endsWith('.local')||h.endsWith('.internal'))return'';
  if(/^\d+\.\d+\.\d+\.\d+$/.test(h)){
    const p=h.split('.').map(Number);
    if(p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168))return'';
  }
  if(h==='::1'||h.startsWith('fc')||h.startsWith('fd')||h.startsWith('fe80:'))return'';
  u.hash='';
  return u.toString();
}
function seoKeywordNormalize(k,leadId,reportId){
  return{
    keywordId:validId(k?.keywordId,180)||crypto.randomUUID(),
    reportId,
    leadId,
    keyword:seoClean(k?.keyword,220),
    position:seoNullableNum(k?.position),
    previousPosition:seoNullableNum(k?.previousPosition),
    clicks:Math.max(0,Math.round(seoNum(k?.clicks))),
    impressions:Math.max(0,Math.round(seoNum(k?.impressions))),
    landingPage:seoClean(k?.landingPage,900)
  };
}
async function seoKeywordsReplace(client,reportId,leadId,keywords){
  await client.query('DELETE FROM seo_keywords WHERE report_id=$1',[reportId]);
  const list=(Array.isArray(keywords)?keywords:[]).map(k=>seoKeywordNormalize(k,leadId,reportId)).filter(k=>k.keyword).slice(0,500);
  const now=nowIso();
  for(const k of list){
    await client.query('INSERT INTO seo_keywords(keyword_id,report_id,lead_id,keyword,position,previous_position,clicks,impressions,landing_page,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [k.keywordId,reportId,leadId,k.keyword,k.position,k.previousPosition,k.clicks,k.impressions,k.landingPage||null,now]);
  }
  return list.length;
}
async function seoKeywordRows(reportId){
  const rr=await rows(pool,'SELECT * FROM seo_keywords WHERE report_id=$1 ORDER BY position ASC NULLS LAST, clicks DESC, keyword ASC',[reportId]);
  return rr.map(r=>({
    keywordId:r.keyword_id,keyword:r.keyword,position:r.position===null?null:Number(r.position),
    previousPosition:r.previous_position===null?null:Number(r.previous_position),
    clicks:Number(r.clicks||0),impressions:Number(r.impressions||0),landingPage:r.landing_page||''
  }));
}
function seoReportDto(r,keywords){
  let metrics=r.metrics_json||{},highlights=r.highlights_json||[],next=r.next_actions_json||[];
  if(typeof metrics==='string'){try{metrics=JSON.parse(metrics)}catch{metrics={}}}
  if(typeof highlights==='string'){try{highlights=JSON.parse(highlights)}catch{highlights=[]}}
  if(typeof next==='string'){try{next=JSON.parse(next)}catch{next=[]}}
  return{
    reportId:r.report_id,leadId:r.lead_id,siteUrl:r.site_url||'',periodStart:r.period_start,periodEnd:r.period_end,
    periodLabel:r.period_label||'',status:r.status,metrics:seoMetrics(metrics),summary:r.summary||'',
    highlights:Array.isArray(highlights)?highlights:[],nextActions:Array.isArray(next)?next:[],
    publishedAt:r.published_at||null,createdAt:r.created_at,updatedAt:r.updated_at,updatedBy:r.updated_by||'',
    client:r.lead_payload?portalPayload({payload_json:r.lead_payload}):undefined,
    keywords:Array.isArray(keywords)?keywords:[]
  };
}
async function seoReportOne(reportId){
  const r=await one(pool,"SELECT s.*,e.payload_json AS lead_payload FROM seo_reports s LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=s.lead_id WHERE s.report_id=$1",[reportId]);
  if(!r)return null;
  return seoReportDto(r,await seoKeywordRows(reportId));
}
async function seoReportsList(leadId='',publishedOnly=false){
  const args=[];let where=[];
  if(leadId){args.push(leadId);where.push('s.lead_id=$'+args.length)}
  if(publishedOnly)where.push("s.status='Publicado'");
  const sql="SELECT s.*,e.payload_json AS lead_payload FROM seo_reports s LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=s.lead_id "+(where.length?'WHERE '+where.join(' AND '):'')+" ORDER BY s.period_end DESC,s.updated_at DESC LIMIT 500";
  const rr=await rows(pool,sql,args),out=[];
  for(const r of rr)out.push(seoReportDto(r,await seoKeywordRows(r.report_id)));
  return out;
}
async function seoReportSave(body,username){
  const id=validId(body.reportId,180)||crypto.randomUUID(),leadId=validId(body.leadId,180);
  const start=seoDate(body.periodStart),end=seoDate(body.periodEnd);
  if(!leadId||!start||!end)return{status:400,body:{ok:false,error:'Cliente e periodo do relatorio sao obrigatorios.'}};
  if(start>end)return{status:400,body:{ok:false,error:'O inicio do periodo nao pode ser posterior ao fim.'}};
  const lead=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
  if(!lead)return{status:404,body:{ok:false,error:'Cliente nao encontrado.'}};
  const lp=portalPayload(lead);
  if(!(lp.crmStatus==='Cliente'||lp.clientSince))return{status:400,body:{ok:false,error:'Relatorios SEO so podem ser vinculados a Clientes.'}};
  const existing=body.reportId?await one(pool,'SELECT * FROM seo_reports WHERE report_id=$1',[id]):null;
  const status=SEO_REPORT_STATUS.has(String(body.status||''))?String(body.status):existing?.status||'Rascunho';
  const siteUrl=seoNormalizePublicUrl(body.siteUrl)||seoClean(body.siteUrl,900);
  const periodLabel=seoClean(body.periodLabel,120)||start.slice(0,7);
  const metrics=seoMetrics(body.metrics),summary=seoClean(body.summary,6000),highlights=seoList(body.highlights,20,600),nextActions=seoList(body.nextActions,20,600);
  const now=nowIso(),publishedAt=status==='Publicado'?(existing?.published_at||now):null;
  await withTransaction(pool,async client=>{
    if(existing){
      await client.query('UPDATE seo_reports SET lead_id=$1,site_url=$2,period_start=$3,period_end=$4,period_label=$5,status=$6,metrics_json=$7::jsonb,summary=$8,highlights_json=$9::jsonb,next_actions_json=$10::jsonb,published_at=$11,updated_at=$12,updated_by=$13 WHERE report_id=$14',
        [leadId,siteUrl||null,start,end,periodLabel,status,JSON.stringify(metrics),summary,JSON.stringify(highlights),JSON.stringify(nextActions),publishedAt,now,username,id]);
    }else{
      await client.query('INSERT INTO seo_reports(report_id,lead_id,site_url,period_start,period_end,period_label,status,metrics_json,summary,highlights_json,next_actions_json,published_at,created_at,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11::jsonb,$12,$13,$13,$14)',
        [id,leadId,siteUrl||null,start,end,periodLabel,status,JSON.stringify(metrics),summary,JSON.stringify(highlights),JSON.stringify(nextActions),publishedAt,now,username]);
    }
    await seoKeywordsReplace(client,id,leadId,body.keywords);
  });
  return{status:200,body:{ok:true,report:await seoReportOne(id),reports:await seoReportsList('')}};
}
async function seoReportRemove(body){
  const id=validId(body.reportId,180);if(!id)return{status:400,body:{ok:false,error:'Relatorio invalido.'}};
  await withTransaction(pool,async client=>{
    await client.query('DELETE FROM seo_keywords WHERE report_id=$1',[id]);
    await client.query('DELETE FROM seo_reports WHERE report_id=$1',[id]);
  });
  return{status:200,body:{ok:true,reports:await seoReportsList('')}};
}
async function seoPageSpeedRun(body,username){
  const leadId=validId(body.leadId,180),strategy=SEO_STRATEGIES.has(String(body.strategy||'').toLowerCase())?String(body.strategy).toLowerCase():'mobile';
  const siteUrl=seoNormalizePublicUrl(body.siteUrl);
  if(!leadId||!siteUrl)throw new Error('Cliente e URL publica do site sao obrigatorios.');
  const lead=await one(pool,"SELECT entity_id FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
  if(!lead)throw new Error('Cliente nao encontrado.');
  const key=await getSecret('googlePageSpeedApiKey');
  const q=new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  q.searchParams.set('url',siteUrl);q.searchParams.set('strategy',strategy);q.searchParams.set('category','PERFORMANCE');
  if(key)q.searchParams.set('key',key);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  let j;
  try{
    const res=await fetch(q,{signal:controller.signal,headers:{'accept':'application/json','user-agent':'EXE-PRO-Cloud/3.9.1'}});
    j=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error('PageSpeed HTTP '+res.status+': '+seoClean(j?.error?.message||'falha ao consultar o Google',300));
  }finally{clearTimeout(timer)}
  const audits=j?.lighthouseResult?.audits||{},cat=j?.lighthouseResult?.categories?.performance;
  const score=Math.round(seoNum(cat?.score)*100);
  const lcp=seoNullableNum(audits['largest-contentful-paint']?.numericValue);
  const cls=seoNullableNum(audits['cumulative-layout-shift']?.numericValue);
  const inp=seoNullableNum(audits['interaction-to-next-paint']?.numericValue);
  const runId=crypto.randomUUID(),now=nowIso();
  await pool.query('INSERT INTO seo_pagespeed_runs(run_id,lead_id,site_url,strategy,performance_score,lcp_ms,cls,inp_ms,raw_json,created_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)',
    [runId,leadId,siteUrl,strategy,score,lcp,cls,inp,JSON.stringify({id:j?.id||siteUrl,analysisUTCTimestamp:j?.analysisUTCTimestamp||null,loadingExperience:j?.loadingExperience||null}),now,username]);
  return{ok:true,run:{runId,leadId,siteUrl,strategy,score,lcpMs:lcp,cls,inpMs:inp,createdAt:now}};
}
async function seoPageSpeedLatest(leadId){
  const rr=await rows(pool,'SELECT * FROM seo_pagespeed_runs WHERE lead_id=$1 ORDER BY created_at DESC LIMIT 20',[leadId]);
  return rr.map(r=>({runId:r.run_id,leadId:r.lead_id,siteUrl:r.site_url,strategy:r.strategy,score:Number(r.performance_score||0),lcpMs:r.lcp_ms===null?null:Number(r.lcp_ms),cls:r.cls===null?null:Number(r.cls),inpMs:r.inp_ms===null?null:Number(r.inp_ms),createdAt:r.created_at}));
}
async function seoConfigView(){
  return{ok:true,pageSpeedKeyConfigured:!!(await getSecret('googlePageSpeedApiKey'))};
}
async function seoPortalReports(session){
  const reports=await seoReportsList(session.leadId,true);
  return{ok:true,reports};
}


// --- EXE PRO 3.9.1: Propostas + Contratos + Aceite no Portal ---
const PORTAL_DOC_TYPES=new Set(['proposal','contract']);
const PORTAL_DOC_DECISIONS=new Set(['Aprovado','Recusado','Aceito']);

function portalDocClean(v,max){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
function portalDocPayload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function portalDocType(v){
  const t=String(v||'').trim();
  return PORTAL_DOC_TYPES.has(t)?t:'';
}
function portalDocNum(v){
  const n=Number(v);return Number.isFinite(n)?n:0;
}
function portalDocProposalSnapshot(p){
  const items=(Array.isArray(p.items)?p.items:[]).map(i=>({
    name:portalDocClean(i?.name,220),
    description:portalDocClean(i?.description,1000),
    billingType:portalDocClean(i?.billingType,80),
    quantity:portalDocNum(i?.quantity||1),
    unitPrice:portalDocNum(i?.unitPrice),
    lineTotal:portalDocNum(i?.lineTotal)
  }));
  return{
    type:'proposal',
    leadId:portalDocClean(p.leadId,180),
    title:portalDocClean(p.title||'Proposta comercial',220),
    items,
    discountPercent:portalDocNum(p.discountPercent),
    validityDays:Math.max(1,Math.min(365,portalDocNum(p.validityDays)||15)),
    paymentTerms:portalDocClean(p.paymentTerms,3000),
    notes:portalDocClean(p.notes,3000),
    diagnosisSummary:portalDocClean(p.diagnosisSummary,3000),
    setupNet:portalDocNum(p.setupNet),
    monthlyNet:portalDocNum(p.monthlyNet),
    firstCycleTotal:portalDocNum(p.firstCycleTotal)
  };
}
function portalDocContractSnapshot(p){
  return{
    type:'contract',
    leadId:portalDocClean(p.leadId,180),
    proposalId:portalDocClean(p.proposalId,180),
    title:portalDocClean(p.title||'Contrato',220),
    monthlyAmount:portalDocNum(p.monthlyAmount),
    billingDay:Math.max(1,Math.min(31,portalDocNum(p.billingDay)||10)),
    startDate:portalDocClean(p.startDate,20),
    endDate:portalDocClean(p.endDate,20),
    services:(Array.isArray(p.services)?p.services:[]).map(x=>portalDocClean(x,220)).filter(Boolean).slice(0,100),
    notes:portalDocClean(p.notes,4000)
  };
}
function portalDocSnapshot(type,payload){
  return type==='proposal'?portalDocProposalSnapshot(payload):portalDocContractSnapshot(payload);
}
function portalDocHash(snapshot){
  return crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}
function portalDocIpHash(req,entityId){
  return crypto.createHash('sha256').update(portalIp(req)+'|'+String(entityId||'')+'|portal383').digest('hex');
}
async function portalDocEntity(type,id){
  return one(pool,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2 AND deleted=FALSE',[type,id]);
}
async function portalDocLatestDecision(type,id){
  return one(pool,'SELECT * FROM portal_document_decisions WHERE entity_type=$1 AND entity_id=$2 ORDER BY created_at DESC LIMIT 1',[type,id]);
}
function portalDocDecisionDto(r,currentHash){
  if(!r)return null;
  return{
    decisionId:r.decision_id,decision:r.decision,actorUsername:r.actor_username||'',actorName:r.actor_name||'',
    comment:r.comment||'',contentHash:r.content_hash,createdAt:r.created_at,
    current:!currentHash||r.content_hash===currentHash
  };
}
function portalDocPublicationDto(pub,entity,decision){
  const type=pub.entity_type,p=portalDocPayload(entity),snapshot=portalDocSnapshot(type,p),hash=portalDocHash(snapshot);
  return{
    documentId:pub.document_id,leadId:pub.lead_id,entityType:type,entityId:pub.entity_id,published:!!pub.published,
    approvalRequired:pub.approval_required!==false,publishedAt:pub.published_at||null,publishedBy:pub.published_by||'',
    updatedAt:pub.updated_at,contentHash:hash,payload:p,snapshot,
    decision:portalDocDecisionDto(decision,hash)
  };
}
async function portalDocsList(leadId='',publishedOnly=false){
  const args=[];let where=[];
  if(leadId){args.push(leadId);where.push('d.lead_id=$'+args.length)}
  if(publishedOnly)where.push('d.published=TRUE');
  const sql="SELECT d.*,e.payload_json,e.updated_at AS entity_updated_at FROM portal_documents d JOIN entities e ON e.entity_type=d.entity_type AND e.entity_id=d.entity_id AND e.deleted=FALSE "+(where.length?'WHERE '+where.join(' AND '):'')+" ORDER BY d.updated_at DESC LIMIT 500";
  const rr=await rows(pool,sql,args),out=[];
  for(const r of rr)out.push(portalDocPublicationDto(r,r,await portalDocLatestDecision(r.entity_type,r.entity_id)));
  return out;
}
async function portalDocAdminCandidates(leadId=''){
  const types=['proposal','contract'],out=[];
  for(const type of types){
    const args=[type];let sql="SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type=$1 AND deleted=FALSE";
    if(leadId){args.push(leadId);sql+=" AND payload_json->>'leadId'=$2"}
    sql+=" ORDER BY updated_at DESC LIMIT 500";
    const rr=await rows(pool,sql,args);
    for(const row of rr){
      const p=portalDocPayload(row),id=row.entity_id;
      const pub=await one(pool,'SELECT * FROM portal_documents WHERE entity_type=$1 AND entity_id=$2',[type,id]);
      const snap=portalDocSnapshot(type,p),hash=portalDocHash(snap),decision=await portalDocLatestDecision(type,id);
      out.push({
        entityType:type,entityId:id,leadId:String(p.leadId||''),payload:p,snapshot:snap,contentHash:hash,
        publication:pub?{documentId:pub.document_id,published:!!pub.published,approvalRequired:pub.approval_required!==false,publishedAt:pub.published_at||null,publishedBy:pub.published_by||'',updatedAt:pub.updated_at}:null,
        decision:portalDocDecisionDto(decision,hash),entityUpdatedAt:row.updated_at
      });
    }
  }
  return out.sort((a,b)=>String(b.entityUpdatedAt||'').localeCompare(String(a.entityUpdatedAt||'')));
}
async function portalDocPublish(body,username){
  const type=portalDocType(body.entityType),entityId=validId(body.entityId,180);
  if(!type||!entityId)return{status:400,body:{ok:false,error:'Documento invalido.'}};
  const entity=await portalDocEntity(type,entityId);if(!entity)return{status:404,body:{ok:false,error:'Documento nao encontrado.'}};
  const p=portalDocPayload(entity),leadId=validId(p.leadId,180);if(!leadId)return{status:400,body:{ok:false,error:'Documento sem cliente vinculado.'}};
  const published=body.published!==false,approvalRequired=body.approvalRequired!==false,now=nowIso();
  const current=await one(pool,'SELECT * FROM portal_documents WHERE entity_type=$1 AND entity_id=$2',[type,entityId]);
  if(current){
    await pool.query('UPDATE portal_documents SET lead_id=$1,published=$2,approval_required=$3,published_at=$4,published_by=$5,updated_at=$6 WHERE entity_type=$7 AND entity_id=$8',
      [leadId,published,approvalRequired,published?(current.published_at||now):null,published?username:null,now,type,entityId]);
  }else{
    await pool.query('INSERT INTO portal_documents(document_id,lead_id,entity_type,entity_id,published,approval_required,published_at,published_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [crypto.randomUUID(),leadId,type,entityId,published,approvalRequired,published?now:null,published?username:null,now]);
  }
  return{status:200,body:{ok:true,documents:await portalDocAdminCandidates('')}};
}
async function portalDocSyncPatch(type,id,patch,origin){
  return withTransaction(pool,async client=>{
    const row=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2 FOR UPDATE',[type,id]);
    if(!row||row.deleted)return false;
    const payload={...portalDocPayload(row),...(patch||{})},ver=Number(row.cloud_version||0)+1,now=nowIso(),src=origin||'portal-client';
    await client.query('UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,payload_json=$4::jsonb,updated_at=$5 WHERE entity_type=$6 AND entity_id=$7',
      [ver,src,ver,JSON.stringify(payload),now,type,id]);
    await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,FALSE,$6::jsonb,$7)',
      [type,id,ver,src,ver,JSON.stringify(payload),now]);
    return true;
  });
}
async function portalDocDecision(req,session,body){
  const type=portalDocType(body.entityType),entityId=validId(body.entityId,180);
  if(!type||!entityId)throw new Error('Documento invalido.');
  const pub=await one(pool,'SELECT * FROM portal_documents WHERE entity_type=$1 AND entity_id=$2 AND lead_id=$3 AND published=TRUE',[type,entityId,session.leadId]);
  if(!pub)throw new Error('Documento nao esta publicado para este cliente.');
  const entity=await portalDocEntity(type,entityId);if(!entity)throw new Error('Documento nao encontrado.');
  const p=portalDocPayload(entity),snapshot=portalDocSnapshot(type,p),contentHash=portalDocHash(snapshot);
  const latest=await portalDocLatestDecision(type,entityId);
  if(latest&&latest.content_hash===contentHash)throw new Error('Este documento ja possui uma decisao registrada para a versao atual.');
  const actorName=portalDocClean(body.actorName,180);
  if(actorName.length<3)throw new Error('Informe o nome completo de quem esta realizando o aceite.');
  const requested=String(body.decision||'');
  let decision;
  if(requested==='Recusado')decision='Recusado';
  else if(type==='proposal'&&requested==='Aprovado')decision='Aprovado';
  else if(type==='contract'&&requested==='Aceito')decision='Aceito';
  else throw new Error('Decisao invalida para este documento.');
  if(decision!=='Recusado'&&body.acceptedTerms!==true)throw new Error('Confirme que leu e concorda com o documento antes de continuar.');
  const now=nowIso(),decisionId=crypto.randomUUID();
  await pool.query('INSERT INTO portal_document_decisions(decision_id,lead_id,entity_type,entity_id,decision,actor_user_id,actor_username,actor_name,comment,content_hash,snapshot_json,ip_hash,user_agent,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14)',
    [decisionId,session.leadId,type,entityId,decision,session.userId,session.username,actorName,portalDocClean(body.comment,2000),contentHash,JSON.stringify(snapshot),portalDocIpHash(req,entityId),portalDocClean(req.headers['user-agent'],500),now]);
  if(type==='proposal'){
    await portalDocSyncPatch('proposal',entityId,{status:decision==='Aprovado'?'Aprovada':'Recusada',portalDecision:decision,portalDecisionAt:now,portalDecisionBy:actorName},'portal-proposal-decision');
  }else{
    await portalDocSyncPatch('contract',entityId,{portalAcceptanceStatus:decision,portalAcceptanceAt:now,portalAcceptanceBy:actorName},'portal-contract-decision');
  }
  return{ok:true,decisionId,documents:await portalDocsList(session.leadId,true)};
}
async function portalDocAdminDecisionReset(body,username){
  const type=portalDocType(body.entityType),entityId=validId(body.entityId,180);
  if(!type||!entityId)return{status:400,body:{ok:false,error:'Documento invalido.'}};
  const entity=await portalDocEntity(type,entityId);if(!entity)return{status:404,body:{ok:false,error:'Documento nao encontrado.'}};
  const p=portalDocPayload(entity),leadId=validId(p.leadId,180),now=nowIso();
  await pool.query('UPDATE portal_documents SET published=TRUE,published_at=$1,published_by=$2,updated_at=$1 WHERE entity_type=$3 AND entity_id=$4',[now,username,type,entityId]);
  return{status:200,body:{ok:true,documents:await portalDocAdminCandidates(leadId)}};
}
async function portalDocsForClient(session){
  return{ok:true,documents:await portalDocsList(session.leadId,true)};
}

// Acrescenta aprovacoes/aceites na Linha do Tempo do Portal.
const portalTimeline383Base=portalTimeline;
portalTimeline=async function(leadId,showFinance){
  const events=await portalTimeline383Base(leadId,showFinance);
  const rr=await rows(pool,'SELECT entity_type,entity_id,decision,actor_name,created_at FROM portal_document_decisions WHERE lead_id=$1 ORDER BY created_at DESC LIMIT 60',[leadId]);
  for(const x of rr){
    events.push({
      type:x.entity_type==='proposal'?'Proposta':'Contrato',
      title:x.entity_type==='proposal'?'Decisao sobre proposta':'Aceite de contrato',
      detail:x.decision+' por '+String(x.actor_name||'cliente'),
      at:x.created_at,refId:x.entity_id
    });
  }
  return events.filter(x=>x.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,100);
};


// --- EXE PRO 3.9.1: Financeiro Recorrente Avancado ---
const BILLING_PROFILE_DEFAULT={
  enabled:true,
  autoGenerate:false,
  consolidateServices:true,
  billingDay:10,
  graceDays:0,
  lateFeePercent:0,
  monthlyInterestPercent:0,
  earlyDiscountPercent:0,
  earlyDiscountDays:0,
  paymentMethod:'',
  notes:''
};

function billingClean(v,max=500){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
function billingNum(v){
  const n=Number(v);return Number.isFinite(n)?n:0;
}
function billingPct(v){
  return Math.max(0,Math.min(100,billingNum(v)));
}
function billingInt(v,min,max,fallback){
  const n=Math.round(Number(v));
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function billingPeriod(v){
  const s=String(v||'').slice(0,7);
  return /^\d{4}-\d{2}$/.test(s)?s:'';
}
function billingCurrentPeriod(){
  const d=new Date(Date.now()-3*60*60*1000);
  return d.toISOString().slice(0,7);
}
function billingDateAdd(day,delta){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day||'')))return'';
  const d=new Date(String(day)+'T12:00:00.000Z');
  if(Number.isNaN(d.getTime()))return'';
  d.setUTCDate(d.getUTCDate()+Number(delta||0));
  return d.toISOString().slice(0,10);
}
function billingDateDiff(a,b){
  if(!a||!b)return 0;
  const aa=new Date(a+'T12:00:00.000Z'),bb=new Date(b+'T12:00:00.000Z');
  if(Number.isNaN(aa.getTime())||Number.isNaN(bb.getTime()))return 0;
  return Math.floor((bb-aa)/86400000);
}
function billingDueDate(period,day){
  period=billingPeriod(period);if(!period)return'';
  const [y,m]=period.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate();
  const d=Math.max(1,Math.min(last,billingInt(day,1,31,10)));
  return period+'-'+String(d).padStart(2,'0');
}
function billingLeadPayload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function billingServiceItems(leadPayload){
  const raw=Array.isArray(leadPayload?.clientServiceItems)?leadPayload.clientServiceItems:[];
  const active=raw.filter(x=>String(x?.status||'Ativo').toLowerCase()==='ativo'&&String(x?.billingCycle||'Mensal').toLowerCase()==='mensal')
    .map((x,i)=>({
      id:billingClean(x?.id||('service-'+i),180),
      name:billingClean(x?.name||'Servico',220),
      siteUrl:billingClean(x?.siteUrl,700),
      price:Math.max(0,billingNum(x?.price)),
      billingDay:billingInt(x?.billingDay,1,31,10)
    }))
    .filter(x=>x.price>0);
  if(active.length)return active;
  const fallback=Math.max(0,billingNum(leadPayload?.clientMonthlyAmount||leadPayload?.monthlyAmount));
  if(fallback>0)return[{id:'legacy-monthly',name:'Mensalidade de servicos',siteUrl:'',price:fallback,billingDay:billingInt(leadPayload?.clientBillingDay,1,31,10)}];
  return[];
}
function billingProfileFrom(row,leadPayload){
  const firstDay=billingServiceItems(leadPayload)[0]?.billingDay;
  return{
    enabled:row?row.enabled!==false:BILLING_PROFILE_DEFAULT.enabled,
    autoGenerate:row?!!row.auto_generate:BILLING_PROFILE_DEFAULT.autoGenerate,
    consolidateServices:row?row.consolidate_services!==false:BILLING_PROFILE_DEFAULT.consolidateServices,
    billingDay:billingInt(row?.billing_day??leadPayload?.clientBillingDay??firstDay,1,31,10),
    graceDays:billingInt(row?.grace_days,0,90,0),
    lateFeePercent:billingPct(row?.late_fee_percent),
    monthlyInterestPercent:billingPct(row?.monthly_interest_percent),
    earlyDiscountPercent:billingPct(row?.early_discount_percent),
    earlyDiscountDays:billingInt(row?.early_discount_days,0,60,0),
    paymentMethod:billingClean(row?.payment_method||leadPayload?.clientPaymentMethod,100),
    notes:billingClean(row?.notes,2000),
    saved:!!row,
    updatedAt:row?.updated_at||null,
    updatedBy:row?.updated_by||''
  };
}
async function billingProfileRow(leadId){
  return one(pool,'SELECT * FROM billing_profiles WHERE lead_id=$1',[leadId]);
}
async function billingLeadPatch(leadId,patch,origin='billing-profile'){
  return withTransaction(pool,async client=>{
    const row=await one(client,"SELECT * FROM entities WHERE entity_type='lead' AND entity_id=$1 FOR UPDATE",[leadId]);
    if(!row||row.deleted)return false;
    const payload={...billingLeadPayload(row),...(patch||{})},ver=Number(row.cloud_version||0)+1,now=nowIso();
    await client.query("UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,payload_json=$4::jsonb,updated_at=$5 WHERE entity_type='lead' AND entity_id=$6",[ver,origin,ver,JSON.stringify(payload),now,leadId]);
    await client.query("INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES('lead',$1,$2,$3,$4,FALSE,$5::jsonb,$6)",[leadId,ver,origin,ver,JSON.stringify(payload),now]);
    return true;
  });
}
async function billingReceivablePatch(receivableId,patch,origin='billing-payment'){
  return withTransaction(pool,async client=>{
    const row=await one(client,"SELECT * FROM entities WHERE entity_type='receivable' AND entity_id=$1 FOR UPDATE",[receivableId]);
    if(!row||row.deleted)return false;
    const payload={...billingLeadPayload(row),...(patch||{})},ver=Number(row.cloud_version||0)+1,now=nowIso();
    await client.query("UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,payload_json=$4::jsonb,updated_at=$5 WHERE entity_type='receivable' AND entity_id=$6",[ver,origin,ver,JSON.stringify(payload),now,receivableId]);
    await client.query("INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES('receivable',$1,$2,$3,$4,FALSE,$5::jsonb,$6)",[receivableId,ver,origin,ver,JSON.stringify(payload),now]);
    return true;
  });
}
async function billingSaveProfile(body,username){
  const leadId=validId(body.leadId,180);if(!leadId)return{status:400,body:{ok:false,error:'Cliente invalido.'}};
  const lead=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
  if(!lead)return{status:404,body:{ok:false,error:'Cliente nao encontrado.'}};
  const p=billingLeadPayload(lead);
  if(!(p.crmStatus==='Cliente'||p.clientSince))return{status:400,body:{ok:false,error:'O perfil financeiro recorrente so pode ser configurado para Cliente.'}};
  const profile={
    enabled:body.enabled!==false,autoGenerate:!!body.autoGenerate,consolidateServices:body.consolidateServices!==false,
    billingDay:billingInt(body.billingDay,1,31,10),graceDays:billingInt(body.graceDays,0,90,0),
    lateFeePercent:billingPct(body.lateFeePercent),monthlyInterestPercent:billingPct(body.monthlyInterestPercent),
    earlyDiscountPercent:billingPct(body.earlyDiscountPercent),earlyDiscountDays:billingInt(body.earlyDiscountDays,0,60,0),
    paymentMethod:billingClean(body.paymentMethod,100),notes:billingClean(body.notes,2000)
  };
  const now=nowIso();
  await pool.query("INSERT INTO billing_profiles(lead_id,enabled,auto_generate,consolidate_services,billing_day,grace_days,late_fee_percent,monthly_interest_percent,early_discount_percent,early_discount_days,payment_method,notes,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(lead_id) DO UPDATE SET enabled=EXCLUDED.enabled,auto_generate=EXCLUDED.auto_generate,consolidate_services=EXCLUDED.consolidate_services,billing_day=EXCLUDED.billing_day,grace_days=EXCLUDED.grace_days,late_fee_percent=EXCLUDED.late_fee_percent,monthly_interest_percent=EXCLUDED.monthly_interest_percent,early_discount_percent=EXCLUDED.early_discount_percent,early_discount_days=EXCLUDED.early_discount_days,payment_method=EXCLUDED.payment_method,notes=EXCLUDED.notes,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by",
    [leadId,profile.enabled,profile.autoGenerate,profile.consolidateServices,profile.billingDay,profile.graceDays,profile.lateFeePercent,profile.monthlyInterestPercent,profile.earlyDiscountPercent,profile.earlyDiscountDays,profile.paymentMethod||null,profile.notes||null,now,username]);
  await billingLeadPatch(leadId,{clientBillingDay:profile.billingDay,clientPaymentMethod:profile.paymentMethod},'billing-profile');
  return{status:200,body:{ok:true,view:await billingView(leadId)}};
}
async function billingCreateInvoice(client,leadRow,profile,period,services,actor,originKey,dueDate,description){
  const leadId=leadRow.entity_id,now=nowIso();
  const legacy=await one(client,"SELECT entity_id,payload_json FROM entities WHERE entity_type='receivable' AND deleted=FALSE AND payload_json->>'originKey'=$1 LIMIT 1",[originKey]);
  if(legacy){
    const lp=billingLeadPayload(legacy),principal=Math.max(0,billingNum(lp.amount));
    await client.query("INSERT INTO billing_invoices(receivable_id,lead_id,period_key,origin_key,principal_amount,due_date,payment_method,late_fee_percent,monthly_interest_percent,early_discount_percent,early_discount_days,grace_days,auto_generated,generated_at,generated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE,$13,$14) ON CONFLICT(origin_key) DO NOTHING",
      [legacy.entity_id,leadId,period,originKey,principal,billingClean(lp.dueDate,20)||dueDate,billingClean(lp.paymentMethod,100)||profile.paymentMethod,profile.lateFeePercent,profile.monthlyInterestPercent,profile.earlyDiscountPercent,profile.earlyDiscountDays,profile.graceDays,now,actor]);
    return{created:false,receivableId:legacy.entity_id,amount:principal,reason:'existing-entity'};
  }
  const existing=await one(client,'SELECT receivable_id,principal_amount FROM billing_invoices WHERE origin_key=$1',[originKey]);
  if(existing)return{created:false,receivableId:existing.receivable_id,amount:Number(existing.principal_amount||0),reason:'existing-invoice'};
  const amount=services.reduce((sum,x)=>sum+Math.max(0,billingNum(x.price)),0);
  if(amount<=0)return{created:false,amount:0,reason:'zero-amount'};
  const receivableId=crypto.randomUUID();
  const payload={
    leadId,description,amount:Number(amount.toFixed(2)),dueDate,status:'Pendente',
    paymentMethod:profile.paymentMethod||'',originKey
  };
  await client.query("INSERT INTO entities(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES('receivable',$1,1,'billing-engine',1,FALSE,$2::jsonb,$3)",[receivableId,JSON.stringify(payload),now]);
  await client.query("INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES('receivable',$1,1,'billing-engine',1,FALSE,$2::jsonb,$3)",[receivableId,JSON.stringify(payload),now]);
  await client.query("INSERT INTO billing_invoices(receivable_id,lead_id,period_key,origin_key,principal_amount,due_date,payment_method,late_fee_percent,monthly_interest_percent,early_discount_percent,early_discount_days,grace_days,auto_generated,generated_at,generated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE,$13,$14)",
    [receivableId,leadId,period,originKey,amount,dueDate,profile.paymentMethod||null,profile.lateFeePercent,profile.monthlyInterestPercent,profile.earlyDiscountPercent,profile.earlyDiscountDays,profile.graceDays,now,actor]);
  for(const s of services){
    await client.query("INSERT INTO billing_invoice_items(item_id,receivable_id,service_id,description,quantity,unit_amount,total_amount,created_at) VALUES($1,$2,$3,$4,1,$5,$5,$6)",
      [crypto.randomUUID(),receivableId,s.id||null,s.name||'Servico',s.price,now]);
  }
  return{created:true,receivableId,amount:Number(amount.toFixed(2)),reason:'created'};
}
async function billingGenerateForLead(leadRow,profile,period,actor){
  const p=billingLeadPayload(leadRow),services=billingServiceItems(p);
  if(!profile.enabled)return{created:0,skipped:1,total:0,reason:'disabled'};
  if(!services.length)return{created:0,skipped:1,total:0,reason:'no-recurring-services'};
  const label=period.split('-').reverse().join('/');
  return withTransaction(pool,async client=>{
    if(profile.consolidateServices){
      const due=billingDueDate(period,profile.billingDay),origin='billing:'+leadRow.entity_id+':'+period;
      const r=await billingCreateInvoice(client,leadRow,profile,period,services,actor,origin,due,'Mensalidade '+label+' — '+services.length+' servico(s)');
      return{created:r.created?1:0,skipped:r.created?0:1,total:r.created?r.amount:0,details:[r]};
    }
    let created=0,skipped=0,total=0,details=[];
    for(const s of services){
      const due=billingDueDate(period,s.billingDay||profile.billingDay),origin='billing:'+leadRow.entity_id+':'+period+':'+(s.id||crypto.createHash('sha1').update(s.name).digest('hex').slice(0,12));
      const r=await billingCreateInvoice(client,leadRow,profile,period,[s],actor,origin,due,s.name+' — '+label);
      details.push(r);if(r.created){created++;total+=r.amount}else skipped++;
    }
    return{created,skipped,total:Number(total.toFixed(2)),details};
  });
}
async function billingGenerate(body,username,autoOnly=false){
  const period=billingPeriod(body?.period)||billingCurrentPeriod(),onlyLead=body?.leadId?validId(body.leadId,180):'';
  const leads=await rows(pool,onlyLead?
    "SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE":
    "SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND deleted=FALSE",onlyLead?[onlyLead]:[]);
  let created=0,skipped=0,total=0,details=[];
  for(const lead of leads){
    const p=billingLeadPayload(lead);
    if(!(p.crmStatus==='Cliente'||p.clientSince)){skipped++;continue}
    const prow=await billingProfileRow(lead.entity_id),profile=billingProfileFrom(prow,p);
    if(autoOnly&&(!prow||!profile.autoGenerate||!profile.enabled)){continue}
    const r=await billingGenerateForLead(lead,profile,period,username||'billing-engine');
    created+=r.created||0;skipped+=r.skipped||0;total+=r.total||0;
    if((r.created||0)>0||onlyLead)details.push({leadId:lead.entity_id,...r});
  }
  const runId=crypto.randomUUID(),now=nowIso(),status='Concluido';
  await pool.query("INSERT INTO billing_runs(run_id,period_key,created_count,skipped_count,total_amount,status,detail_json,run_at,run_by) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)",
    [runId,period,created,skipped,Number(total.toFixed(2)),status,JSON.stringify(details.slice(0,250)),now,username||'billing-engine']);
  try{await notificationPlan()}catch(e){console.error('Billing notification plan:',e.message)}
  return{ok:true,runId,period,created,skipped,total:Number(total.toFixed(2)),details};
}
async function billingPaymentRows(receivableId){
  const rr=await rows(pool,'SELECT * FROM billing_payments WHERE receivable_id=$1 ORDER BY paid_at ASC,created_at ASC',[receivableId]);
  return rr.map(r=>({paymentId:r.payment_id,amount:Number(r.amount||0),paidAt:r.paid_at,method:r.method||'',note:r.note||'',createdBy:r.created_by||'',createdAt:r.created_at}));
}
async function billingItemRows(receivableId){
  const rr=await rows(pool,'SELECT * FROM billing_invoice_items WHERE receivable_id=$1 ORDER BY created_at ASC,item_id ASC',[receivableId]);
  return rr.map(r=>({itemId:r.item_id,serviceId:r.service_id||'',description:r.description,quantity:Number(r.quantity||1),unitAmount:Number(r.unit_amount||0),totalAmount:Number(r.total_amount||0)}));
}
function billingCalc(inv,payments,asOf){
  const principal=Math.max(0,Number(inv.principal_amount||0)),paid=payments.reduce((a,x)=>a+Math.max(0,Number(x.amount||0)),0);
  const due=String(inv.due_date||'').slice(0,10),today=String(asOf||portalToday()).slice(0,10);
  const status=String(inv.entity_payload?.status||inv.status||'Pendente');
  if(status.toLowerCase().includes('pago')){
    return{principal,paidTotal:Number(paid.toFixed(2)),discount:0,lateFee:0,interest:0,adjustedTotal:Number(paid.toFixed(2)||principal),balance:0,daysOverdue:0,overdue:false,discountEligible:false};
  }
  const discountDeadline=Number(inv.early_discount_days||0)>0?billingDateAdd(due,-Number(inv.early_discount_days||0)):due;
  const discountEligible=Number(inv.early_discount_percent||0)>0&&today<=discountDeadline&&paid===0;
  const discount=discountEligible?principal*Number(inv.early_discount_percent||0)/100:0;
  const lateStart=billingDateAdd(due,Number(inv.grace_days||0));
  const daysOverdue=today>lateStart?Math.max(1,billingDateDiff(lateStart,today)):0;
  const lateFee=daysOverdue>0?principal*Number(inv.late_fee_percent||0)/100:0;
  const interest=daysOverdue>0?principal*(Number(inv.monthly_interest_percent||0)/100)*(daysOverdue/30):0;
  const adjusted=Math.max(0,principal-discount+lateFee+interest),balance=Math.max(0,adjusted-paid);
  return{
    principal:Number(principal.toFixed(2)),paidTotal:Number(paid.toFixed(2)),discount:Number(discount.toFixed(2)),
    lateFee:Number(lateFee.toFixed(2)),interest:Number(interest.toFixed(2)),adjustedTotal:Number(adjusted.toFixed(2)),
    balance:Number(balance.toFixed(2)),daysOverdue,overdue:daysOverdue>0,discountEligible
  };
}
async function billingInvoiceDtos(leadId=''){
  const sql=leadId?
    "SELECT b.*,e.payload_json AS entity_payload,e.deleted,e.updated_at AS entity_updated_at,l.payload_json AS lead_payload FROM billing_invoices b LEFT JOIN entities e ON e.entity_type='receivable' AND e.entity_id=b.receivable_id LEFT JOIN entities l ON l.entity_type='lead' AND l.entity_id=b.lead_id WHERE b.lead_id=$1 ORDER BY b.due_date DESC":
    "SELECT b.*,e.payload_json AS entity_payload,e.deleted,e.updated_at AS entity_updated_at,l.payload_json AS lead_payload FROM billing_invoices b LEFT JOIN entities e ON e.entity_type='receivable' AND e.entity_id=b.receivable_id LEFT JOIN entities l ON l.entity_type='lead' AND l.entity_id=b.lead_id ORDER BY b.due_date DESC LIMIT 1000";
  const rr=await rows(pool,sql,leadId?[leadId]:[]),out=[];
  for(const r of rr){
    let ep=r.entity_payload||{};if(typeof ep==='string'){try{ep=JSON.parse(ep)}catch{ep={}}}
    r.entity_payload=ep;
    const payments=await billingPaymentRows(r.receivable_id),items=await billingItemRows(r.receivable_id),calc=billingCalc(r,payments);
    out.push({
      receivableId:r.receivable_id,leadId:r.lead_id,period:r.period_key,originKey:r.origin_key,dueDate:r.due_date,
      paymentMethod:r.payment_method||ep.paymentMethod||'',principal:Number(r.principal_amount||0),
      terms:{lateFeePercent:Number(r.late_fee_percent||0),monthlyInterestPercent:Number(r.monthly_interest_percent||0),earlyDiscountPercent:Number(r.early_discount_percent||0),earlyDiscountDays:Number(r.early_discount_days||0),graceDays:Number(r.grace_days||0)},
      status:r.deleted?'Excluido':String(ep.status||'Pendente'),description:String(ep.description||'Mensalidade'),
      generatedAt:r.generated_at,generatedBy:r.generated_by||'',autoGenerated:!!r.auto_generated,
      client:billingLeadPayload({payload_json:r.lead_payload}),items,payments,calc
    });
  }
  return out;
}
async function billingRecordPayment(body,username){
  const receivableId=validId(body.receivableId,180);if(!receivableId)return{status:400,body:{ok:false,error:'Cobranca invalida.'}};
  const inv=await one(pool,"SELECT b.*,e.payload_json AS entity_payload,e.deleted FROM billing_invoices b JOIN entities e ON e.entity_type='receivable' AND e.entity_id=b.receivable_id WHERE b.receivable_id=$1",[receivableId]);
  if(!inv||inv.deleted)return{status:404,body:{ok:false,error:'Cobranca recorrente nao encontrada.'}};
  let ep=inv.entity_payload||{};if(typeof ep==='string'){try{ep=JSON.parse(ep)}catch{ep={}}}inv.entity_payload=ep;
  if(String(ep.status||'').toLowerCase().includes('cancel'))return{status:400,body:{ok:false,error:'Nao e possivel registrar pagamento em cobranca cancelada.'}};
  const amount=Number(body.amount),paidAt=billingClean(body.paidAt||nowIso(),40);
  if(!Number.isFinite(amount)||amount<=0)return{status:400,body:{ok:false,error:'Informe um valor de pagamento valido.'}};
  const current=billingCalc(inv,await billingPaymentRows(receivableId),String(paidAt).slice(0,10));
  if(current.balance<=0.009)return{status:400,body:{ok:false,error:'Esta cobranca ja esta quitada.'}};
  if(amount>current.balance+0.05)return{status:400,body:{ok:false,error:'O pagamento informado excede o saldo calculado da cobranca.'}};
  const paymentId=crypto.randomUUID(),now=nowIso();
  await pool.query("INSERT INTO billing_payments(payment_id,receivable_id,lead_id,amount,paid_at,method,note,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [paymentId,receivableId,inv.lead_id,Number(amount.toFixed(2)),paidAt,billingClean(body.method,100),billingClean(body.note,1200),username,now]);
  const payments=await billingPaymentRows(receivableId),after=billingCalc(inv,payments,String(paidAt).slice(0,10)),isPaid=after.balance<=0.01;
  await billingReceivablePatch(receivableId,{status:isPaid?'Pago':'Parcial',paidAt:isPaid?paidAt:'',paidAmount:after.paidTotal},'billing-payment');
  if(isPaid){
    await pool.query("UPDATE notification_outbox SET status='Cancelado',updated_at=$1 WHERE receivable_id=$2 AND kind<>'paid' AND status IN ('Pendente','Falhou')",[now,receivableId]);
    try{await notificationPlan()}catch{}
  }
  return{status:200,body:{ok:true,paymentId,view:await billingView(inv.lead_id)}};
}
async function billingRemovePayment(body,username){
  const paymentId=validId(body.paymentId,180);if(!paymentId)return{status:400,body:{ok:false,error:'Pagamento invalido.'}};
  const pay=await one(pool,'SELECT * FROM billing_payments WHERE payment_id=$1',[paymentId]);if(!pay)return{status:404,body:{ok:false,error:'Pagamento nao encontrado.'}};
  await pool.query('DELETE FROM billing_payments WHERE payment_id=$1',[paymentId]);
  const inv=await one(pool,"SELECT b.*,e.payload_json AS entity_payload,e.deleted FROM billing_invoices b JOIN entities e ON e.entity_type='receivable' AND e.entity_id=b.receivable_id WHERE b.receivable_id=$1",[pay.receivable_id]);
  if(inv&&!inv.deleted){
    let ep=inv.entity_payload||{};if(typeof ep==='string'){try{ep=JSON.parse(ep)}catch{ep={}}}inv.entity_payload=ep;
    const payments=await billingPaymentRows(pay.receivable_id),calc=billingCalc(inv,payments);
    await billingReceivablePatch(pay.receivable_id,{status:payments.length?(calc.balance<=0.01?'Pago':'Parcial'):'Pendente',paidAt:calc.balance<=0.01?(ep.paidAt||nowIso()):'',paidAmount:calc.paidTotal},'billing-payment-remove');
  }
  await audit('billing_payment_remove',username,{headers:{},socket:{}},'Pagamento removido '+paymentId).catch(()=>{});
  return{status:200,body:{ok:true,view:await billingView(pay.lead_id)}};
}
async function billingView(leadId=''){
  const leads=await rows(pool,leadId?
    "SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE":
    "SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND deleted=FALSE",leadId?[leadId]:[]);
  const clients=[];
  for(const lead of leads){
    const p=billingLeadPayload(lead);if(!(p.crmStatus==='Cliente'||p.clientSince))continue;
    const services=billingServiceItems(p),profile=billingProfileFrom(await billingProfileRow(lead.entity_id),p);
    clients.push({
      leadId:lead.entity_id,name:String(p.name||p.companyName||'Cliente'),services,
      monthly:services.reduce((a,x)=>a+x.price,0),profile
    });
  }
  const invoices=await billingInvoiceDtos(leadId),runs=await rows(pool,'SELECT * FROM billing_runs ORDER BY run_at DESC LIMIT 30');
  const summary={
    clients:clients.length,autoProfiles:clients.filter(x=>x.profile.saved&&x.profile.enabled&&x.profile.autoGenerate).length,
    monthly:clients.reduce((a,x)=>a+x.monthly,0),invoices:invoices.length,
    open:invoices.filter(x=>!['Pago','Cancelado','Excluido'].includes(x.status)).length,
    overdueBalance:invoices.filter(x=>x.calc.overdue&&!['Pago','Cancelado','Excluido'].includes(x.status)).reduce((a,x)=>a+x.calc.balance,0),
    received:invoices.reduce((a,x)=>a+x.calc.paidTotal,0)
  };
  return{ok:true,period:billingCurrentPeriod(),summary,clients,invoices,runs:runs.map(r=>({runId:r.run_id,period:r.period_key,created:Number(r.created_count||0),skipped:Number(r.skipped_count||0),total:Number(r.total_amount||0),status:r.status,runAt:r.run_at,runBy:r.run_by||''}))};
}
async function billingPortalView(session){
  if(!portalOpRoleCanFinance(session.role))return{ok:true,allowed:false,invoices:[],summary:{}};
  const invoices=await billingInvoiceDtos(session.leadId);
  return{
    ok:true,allowed:true,invoices,
    summary:{
      open:invoices.filter(x=>!['Pago','Cancelado','Excluido'].includes(x.status)).length,
      balance:invoices.filter(x=>!['Pago','Cancelado','Excluido'].includes(x.status)).reduce((a,x)=>a+x.calc.balance,0),
      overdue:invoices.filter(x=>x.calc.overdue&&!['Pago','Cancelado','Excluido'].includes(x.status)).reduce((a,x)=>a+x.calc.balance,0),
      paid:invoices.reduce((a,x)=>a+x.calc.paidTotal,0)
    }
  };
}
async function billingRecurringTick(){
  try{
    await billingGenerate({period:billingCurrentPeriod()},'billing-engine',true);
  }catch(e){console.error('Billing recurring tick:',e.message)}
}


// --- EXE PRO 3.9.1: Core Stability & Consolidation ---
const CORE_VERSION='3.9.1';
const CORE_INSTANCE_ID=(String(process.env.HOSTNAME||'node').slice(0,40)+'-'+process.pid+'-'+crypto.randomBytes(5).toString('hex')).slice(0,96);
const CORE_MODULES=[
  {key:'crm',name:'CRM / Sync Core',version:'3.6.9',critical:true},
  {key:'notifications',name:'Notificacoes',version:'3.6.7',critical:true},
  {key:'wordpress',name:'WordPress Client Control',version:'3.7.1',critical:true},
  {key:'portal',name:'Portal do Cliente',version:'3.8.3',critical:true},
  {key:'seo',name:'Relatorios SEO',version:'3.8.2',critical:false},
  {key:'billing',name:'Financeiro Recorrente',version:'3.8.4',critical:true}
];
const CORE_REQUIRED_TABLES=[
  'entities','changes','cloud_users','notification_outbox','wordpress_sites',
  'portal_users','portal_tickets','portal_files','portal_documents','portal_document_decisions',
  'seo_reports','billing_profiles','billing_invoices','billing_payments',
  'core_schema_versions','core_job_locks','core_job_runs','core_runtime_events'
];

function coreSafeJson(v,fallback={}){
  if(v===null||v===undefined)return fallback;
  if(typeof v==='string'){try{return JSON.parse(v)}catch{return fallback}}
  return v;
}
function coreClean(v,max=1200){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
async function coreEvent(severity,source,message,detail){
  try{
    await pool.query(
      'INSERT INTO core_runtime_events(event_id,severity,source,message,detail_json,created_at) VALUES($1,$2,$3,$4,$5::jsonb,$6)',
      [crypto.randomUUID(),coreClean(severity||'info',20),coreClean(source||'core',80),coreClean(message||'',1200),JSON.stringify(detail||{}),nowIso()]
    );
  }catch(e){console.error('Core event:',e.message)}
}
async function coreAcquireJobLock(jobKey,ttlMs){
  const token=crypto.randomUUID(),now=nowIso(),until=new Date(Date.now()+Math.max(30000,Number(ttlMs||60000))).toISOString();
  const q=await pool.query(
    "INSERT INTO core_job_locks(job_key,lock_token,locked_until,updated_at) VALUES($1,$2,$3,$4) "+
    "ON CONFLICT(job_key) DO UPDATE SET lock_token=EXCLUDED.lock_token,locked_until=EXCLUDED.locked_until,updated_at=EXCLUDED.updated_at "+
    "WHERE core_job_locks.locked_until<EXCLUDED.updated_at RETURNING job_key",
    [jobKey,token,until,now]
  );
  return q.rowCount?{token,until}:null;
}
async function coreReleaseJobLock(jobKey,token){
  await pool.query('DELETE FROM core_job_locks WHERE job_key=$1 AND lock_token=$2',[jobKey,token]);
}
async function coreRunResult(jobKey,manual){
  if(jobKey==='notifications'){
    const config=await getNotifyConfig();
    if(!manual&&!config.autoSend)return{skipped:true,reason:'Envio automatico desativado.'};
    const plan=await notificationPlan();
    const send=await notificationSend({dueOnly:true,limit:50});
    return{plan,send};
  }
  if(jobKey==='wordpress'){
    return await wpCtrlEvaluate(!!manual);
  }
  if(jobKey==='billing'){
    return await billingGenerate({period:billingCurrentPeriod()},manual?'core-manual':'billing-engine',true);
  }
  throw new Error('Job de Core desconhecido: '+jobKey);
}
async function coreRunScheduled(jobKey,ttlMs,manual=false,actor='scheduler'){
  const lock=await coreAcquireJobLock(jobKey,ttlMs);
  if(!lock)return{ok:true,skipped:true,reason:'Outro processo ja esta executando este job.'};
  const runId=crypto.randomUUID(),started=Date.now(),startedAt=nowIso();
  await pool.query(
    "INSERT INTO core_job_runs(run_id,job_key,instance_id,status,started_at,result_json) VALUES($1,$2,$3,'Executando',$4,'{}'::jsonb)",
    [runId,jobKey,CORE_INSTANCE_ID,startedAt]
  );
  try{
    const result=await coreRunResult(jobKey,manual);
    const finished=nowIso(),duration=Date.now()-started;
    await pool.query(
      "UPDATE core_job_runs SET status=$1,finished_at=$2,duration_ms=$3,result_json=$4::jsonb,error_text=NULL WHERE run_id=$5",
      [result?.skipped?'Ignorado':'Concluido',finished,duration,JSON.stringify(result||{}),runId]
    );
    if(manual)await coreEvent('info','job:'+jobKey,'Execucao manual concluida',{actor,runId,durationMs:duration});
    return{ok:true,runId,result};
  }catch(e){
    const finished=nowIso(),duration=Date.now()-started,error=coreClean(e.message||e,1000);
    await pool.query(
      "UPDATE core_job_runs SET status='Falhou',finished_at=$1,duration_ms=$2,error_text=$3 WHERE run_id=$4",
      [finished,duration,error,runId]
    );
    await coreEvent('error','job:'+jobKey,'Job falhou',{actor,runId,error});
    throw e;
  }finally{
    try{await coreReleaseJobLock(jobKey,lock.token)}catch{}
  }
}
async function coreTableHealth(){
  const out=[];
  for(const table of CORE_REQUIRED_TABLES){
    const r=await one(pool,'SELECT to_regclass($1) AS name',['public.'+table]);
    out.push({table,ok:!!r?.name});
  }
  return out;
}
async function coreStatus(){
  const now=nowIso();
  const db=await one(pool,'SELECT current_database() AS name,pg_database_size(current_database())::bigint AS size,version() AS server_version');
  const [entityCounts,changeSeq,installs,webSessions,portalSessions,notifyCounts,wpCounts,ticketCounts,seoCounts,billingCounts,fileBytes,locks,runs,events,schemaVersions]=await Promise.all([
    rows(pool,"SELECT entity_type,COUNT(*)::int AS n,COUNT(*) FILTER(WHERE deleted=FALSE)::int AS active FROM entities GROUP BY entity_type ORDER BY entity_type"),
    one(pool,'SELECT COALESCE(MAX(seq),0)::bigint AS seq,COUNT(*)::bigint AS n FROM changes'),
    one(pool,'SELECT COUNT(*)::int AS n,MAX(last_seen_at) AS last_seen FROM installations'),
    one(pool,'SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE expires_at<=$1)::int AS expired FROM web_sessions',[now]),
    one(pool,'SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE expires_at<=$1)::int AS expired FROM portal_sessions',[now]),
    one(pool,"SELECT COUNT(*) FILTER(WHERE status='Pendente')::int AS pending,COUNT(*) FILTER(WHERE status='Falhou')::int AS failed,COUNT(*) FILTER(WHERE status='Enviado')::int AS sent FROM notification_outbox"),
    one(pool,"SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='Erro')::int AS errors,COUNT(*) FILTER(WHERE remote_suspended=TRUE)::int AS suspended FROM wordpress_sites"),
    one(pool,"SELECT COUNT(*) FILTER(WHERE status NOT IN ('Resolvido','Fechado'))::int AS open,COUNT(*)::int AS total FROM portal_tickets"),
    one(pool,"SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='Publicado')::int AS published FROM seo_reports"),
    one(pool,"SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE auto_generate=TRUE AND enabled=TRUE)::int AS automatic FROM billing_profiles"),
    one(pool,"SELECT COALESCE(SUM(byte_size),0)::bigint AS bytes,COUNT(*)::int AS files FROM portal_files"),
    rows(pool,'SELECT job_key,locked_until,updated_at FROM core_job_locks WHERE locked_until>$1 ORDER BY job_key',[now]),
    rows(pool,'SELECT run_id,job_key,status,started_at,finished_at,duration_ms,result_json,error_text FROM core_job_runs ORDER BY started_at DESC LIMIT 30'),
    rows(pool,'SELECT severity,source,message,detail_json,created_at FROM core_runtime_events ORDER BY created_at DESC LIMIT 30'),
    rows(pool,'SELECT version,description,applied_at FROM core_schema_versions ORDER BY applied_at DESC LIMIT 20')
  ]);
  const tables=await coreTableHealth();
  const missingTables=tables.filter(x=>!x.ok).map(x=>x.table);
  let notificationInfo={integrations:{whatsappConfigured:false,telegramConfigured:false}};
  try{notificationInfo=await publicNotifyConfig()}catch{}
  let seoInfo={pageSpeedKeyConfigured:false};
  try{seoInfo=await seoConfigView()}catch{}
  const moduleState=CORE_MODULES.map(m=>({...m,ok:true}));
  if(missingTables.length)for(const m of moduleState)if(m.critical)m.ok=false;
  const security={
    httpsRequired:String(process.env.EXE_CLOUD_REQUIRE_HTTPS||'').toLowerCase()!=='0',
    cloudKeyConfigured:!!process.env.EXE_CLOUD_KEY,
    secretKeyConfigured:!!process.env.EXE_CLOUD_SECRET_KEY,
    dbSslRequested:['1','true','yes','on','require'].includes(String(process.env.EXE_CLOUD_DB_SSL||process.env.PGSSLMODE||'').toLowerCase())
  };
  return{
    ok:missingTables.length===0,
    version:CORE_VERSION,
    instanceId:CORE_INSTANCE_ID,
    time:now,
    database:{name:db?.name||'',sizeBytes:Number(db?.size||0),serverVersion:String(db?.server_version||'').slice(0,180),tables,missingTables},
    modules:moduleState,
    security,
    integrations:{
      whatsappConfigured:!!notificationInfo?.integrations?.whatsappConfigured,
      telegramConfigured:!!notificationInfo?.integrations?.telegramConfigured,
      pageSpeedKeyConfigured:!!seoInfo?.pageSpeedKeyConfigured
    },
    sync:{entities:entityCounts,changes:Number(changeSeq?.n||0),lastSeq:Number(changeSeq?.seq||0),installations:Number(installs?.n||0),lastInstallationSeen:installs?.last_seen||null},
    sessions:{webTotal:Number(webSessions?.total||0),webExpired:Number(webSessions?.expired||0),portalTotal:Number(portalSessions?.total||0),portalExpired:Number(portalSessions?.expired||0)},
    notifications:{pending:Number(notifyCounts?.pending||0),failed:Number(notifyCounts?.failed||0),sent:Number(notifyCounts?.sent||0)},
    wordpress:{total:Number(wpCounts?.total||0),errors:Number(wpCounts?.errors||0),suspended:Number(wpCounts?.suspended||0)},
    portal:{ticketsTotal:Number(ticketCounts?.total||0),ticketsOpen:Number(ticketCounts?.open||0),files:Number(fileBytes?.files||0),fileBytes:Number(fileBytes?.bytes||0)},
    seo:{reports:Number(seoCounts?.total||0),published:Number(seoCounts?.published||0)},
    billing:{profiles:Number(billingCounts?.total||0),automatic:Number(billingCounts?.automatic||0)},
    jobs:{activeLocks:locks,recent:runs.map(x=>({...x,result:coreSafeJson(x.result_json,{})}))},
    events:events.map(x=>({...x,detail:coreSafeJson(x.detail_json,{})})),
    schemaVersions
  };
}
async function coreCleanup(username){
  const now=nowIso(),old30=new Date(Date.now()-30*86400000).toISOString(),old90=new Date(Date.now()-90*86400000).toISOString();
  return withTransaction(pool,async client=>{
    const a=await client.query('DELETE FROM web_sessions WHERE expires_at<=$1',[now]);
    const b=await client.query('DELETE FROM portal_sessions WHERE expires_at<=$1',[now]);
    const c=await client.query("DELETE FROM web_login_guard WHERE updated_at<$1 AND (blocked_until IS NULL OR blocked_until<$2)",[old30,now]);
    const d=await client.query("DELETE FROM portal_login_guard WHERE updated_at<$1 AND (blocked_until IS NULL OR blocked_until<$2)",[old30,now]);
    const e=await client.query('DELETE FROM core_job_runs WHERE started_at<$1',[old90]);
    const f=await client.query('DELETE FROM core_runtime_events WHERE created_at<$1',[old90]);
    return{ok:true,webSessions:a.rowCount,portalSessions:b.rowCount,webGuards:c.rowCount,portalGuards:d.rowCount,jobRuns:e.rowCount,events:f.rowCount,by:username};
  });
}
async function coreStartupRecord(){
  try{
    const status=await coreStatus();
    await coreEvent(status.ok?'info':'warn','startup','EXE PRO Core iniciado',{
      version:CORE_VERSION,
      missingTables:status.database.missingTables,
      database:status.database.name
    });
  }catch(e){
    console.error('Core startup check:',e.message);
  }
}


// --- EXE PRO 3.9.1: Tarefas, Equipe e SLA ---
const TASK391_STATUS=new Set(['A fazer','Em andamento','Aguardando cliente','Bloqueada','Concluida','Cancelada']);
const TASK391_PRIORITY=new Set(['Baixa','Normal','Alta','Urgente']);
const TASK391_SLA_DEFAULT={
  enabled:true,
  hours:{Baixa:72,Normal:24,Alta:8,Urgente:4},
  warningPercent:25
};

function task391Clean(v,max=1200){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
function task391Status(v){
  const s=task391Clean(v,60).replace('Concluída','Concluida');
  return TASK391_STATUS.has(s)?s:'A fazer';
}
function task391Priority(v){
  const s=task391Clean(v,40);
  return TASK391_PRIORITY.has(s)?s:'Normal';
}
function task391Iso(v){
  const s=String(v||'').trim();
  if(!s)return'';
  const d=new Date(s);
  return Number.isNaN(d.getTime())?'':d.toISOString();
}
function task391Payload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function task391SlaConfigNormalize(v){
  const raw=v&&typeof v==='object'?v:{},hours=raw.hours&&typeof raw.hours==='object'?raw.hours:{};
  return{
    enabled:raw.enabled!==false,
    hours:{
      Baixa:Math.max(1,Math.min(720,Number(hours.Baixa??TASK391_SLA_DEFAULT.hours.Baixa)||72)),
      Normal:Math.max(1,Math.min(720,Number(hours.Normal??TASK391_SLA_DEFAULT.hours.Normal)||24)),
      Alta:Math.max(1,Math.min(720,Number(hours.Alta??TASK391_SLA_DEFAULT.hours.Alta)||8)),
      Urgente:Math.max(1,Math.min(720,Number(hours.Urgente??TASK391_SLA_DEFAULT.hours.Urgente)||4))
    },
    warningPercent:Math.max(5,Math.min(90,Number(raw.warningPercent??TASK391_SLA_DEFAULT.warningPercent)||25))
  };
}
async function task391SlaConfig(){
  return task391SlaConfigNormalize(await settingValue('task_sla_config',TASK391_SLA_DEFAULT));
}
function task391SlaDue(createdAt,priority,config){
  if(!config?.enabled)return'';
  const start=new Date(createdAt||Date.now());
  if(Number.isNaN(start.getTime()))return'';
  const hours=Number(config.hours?.[priority]||24);
  return new Date(start.getTime()+hours*3600000).toISOString();
}
function task391SlaState(task,config){
  const due=task.sla_due_at||'',created=task.created_at||'';
  if(!due||!config?.enabled)return{key:'Sem SLA',label:'Sem SLA',overdue:false,warning:false,remainingMinutes:null,elapsedPercent:null};
  const dueMs=Date.parse(due),createdMs=Date.parse(created),doneMs=task.completed_at?Date.parse(task.completed_at):0,now=Date.now();
  if(!Number.isFinite(dueMs))return{key:'Sem SLA',label:'Sem SLA',overdue:false,warning:false,remainingMinutes:null,elapsedPercent:null};
  const closed=['Concluida','Cancelada'].includes(task.status);
  const end=closed&&doneMs?doneMs:now;
  const remaining=Math.round((dueMs-end)/60000);
  if(closed){
    const late=doneMs&&doneMs>dueMs;
    return{key:late?'Concluido fora do prazo':'Concluido no prazo',label:late?'Concluído fora do prazo':'Concluído no prazo',overdue:!!late,warning:false,remainingMinutes:remaining,elapsedPercent:100};
  }
  const total=Math.max(1,dueMs-createdMs),elapsed=Math.max(0,end-createdMs),pct=Math.max(0,Math.min(999,elapsed/total*100));
  if(end>dueMs)return{key:'Estourado',label:'SLA estourado',overdue:true,warning:false,remainingMinutes:remaining,elapsedPercent:pct};
  const warnAt=100-Number(config.warningPercent||25);
  if(pct>=warnAt)return{key:'Atencao',label:'SLA em atenção',overdue:false,warning:true,remainingMinutes:remaining,elapsedPercent:pct};
  return{key:'Dentro do prazo',label:'Dentro do prazo',overdue:false,warning:false,remainingMinutes:remaining,elapsedPercent:pct};
}
async function task391Checklist(taskId,portalOnly=false){
  const rr=await rows(pool,'SELECT * FROM task_checklist WHERE task_id=$1 '+(portalOnly?'AND portal_visible=TRUE ':'')+'ORDER BY sort_order ASC,created_at ASC',[taskId]);
  return rr.map(r=>({checklistId:r.checklist_id,label:r.label,done:!!r.done,portalVisible:r.portal_visible!==false,sortOrder:Number(r.sort_order||0),updatedAt:r.updated_at}));
}
async function task391Comments(taskId,portalOnly=false){
  const rr=await rows(pool,'SELECT * FROM task_comments WHERE task_id=$1 '+(portalOnly?"AND (portal_visible=TRUE OR author_type='Cliente') ":'')+'ORDER BY created_at ASC',[taskId]);
  return rr.map(r=>({commentId:r.comment_id,authorType:r.author_type,authorName:r.author_name||'',body:r.body,portalVisible:!!r.portal_visible,createdAt:r.created_at}));
}
async function task391TimeLogs(taskId){
  const rr=await rows(pool,'SELECT * FROM task_time_logs WHERE task_id=$1 ORDER BY worked_at DESC,created_at DESC',[taskId]);
  return rr.map(r=>({timeLogId:r.time_log_id,userName:r.user_name||'',minutes:Number(r.minutes||0),note:r.note||'',workedAt:r.worked_at,createdAt:r.created_at}));
}
function task391ProjectTitle(payload,id){
  const p=payload&&typeof payload==='object'?payload:{};
  return String(p.title||p.name||id||'Projeto');
}
async function task391TaskDto(r,config,portalOnly=false){
  const checklist=await task391Checklist(r.task_id,portalOnly),comments=await task391Comments(r.task_id,portalOnly);
  const timeLogs=portalOnly?[]:await task391TimeLogs(r.task_id);
  const done=checklist.filter(x=>x.done).length,total=checklist.length;
  return{
    taskId:r.task_id,leadId:r.lead_id||'',projectId:r.project_id||'',ticketId:r.ticket_id||'',
    title:r.title,description:r.description||'',status:r.status,priority:r.priority,assignedUser:r.assigned_user||'',
    dueAt:r.due_at||null,slaDueAt:r.sla_due_at||null,portalVisible:!!r.portal_visible,
    createdBy:r.created_by||'',createdAt:r.created_at,updatedAt:r.updated_at,completedAt:r.completed_at||null,
    client:r.lead_payload?task391Payload({payload_json:r.lead_payload}):undefined,
    project:r.project_payload?task391Payload({payload_json:r.project_payload}):undefined,
    ticket:r.ticket_subject?{subject:r.ticket_subject,status:r.ticket_status||''}:undefined,
    checklist,comments,timeLogs,
    checklistProgress:total?Math.round(done/total*100):0,
    timeMinutes:timeLogs.reduce((a,x)=>a+x.minutes,0),
    sla:task391SlaState(r,config)
  };
}
async function task391List(leadId='',portalOnly=false){
  const args=[];let where=[];
  if(leadId){args.push(leadId);where.push('t.lead_id=$'+args.length)}
  if(portalOnly)where.push('t.portal_visible=TRUE');
  const sql="SELECT t.*,l.payload_json AS lead_payload,p.payload_json AS project_payload,pt.subject AS ticket_subject,pt.status AS ticket_status "+
    "FROM task_items t "+
    "LEFT JOIN entities l ON l.entity_type='lead' AND l.entity_id=t.lead_id AND l.deleted=FALSE "+
    "LEFT JOIN entities p ON p.entity_type='project' AND p.entity_id=t.project_id AND p.deleted=FALSE "+
    "LEFT JOIN portal_tickets pt ON pt.ticket_id=t.ticket_id "+
    (where.length?'WHERE '+where.join(' AND '):'')+
    " ORDER BY CASE t.status WHEN 'Em andamento' THEN 1 WHEN 'Aguardando cliente' THEN 2 WHEN 'A fazer' THEN 3 WHEN 'Bloqueada' THEN 4 WHEN 'Concluida' THEN 5 ELSE 6 END, t.sla_due_at ASC NULLS LAST,t.updated_at DESC LIMIT 1000";
  const rr=await rows(pool,sql,args),config=await task391SlaConfig(),out=[];
  for(const r of rr)out.push(await task391TaskDto(r,config,portalOnly));
  return out;
}
async function task391Team(){
  const rr=await rows(pool,"SELECT user_id,username,role,last_login_at FROM cloud_users WHERE active=TRUE ORDER BY username_ci ASC");
  return rr.map(r=>({userId:r.user_id,username:r.username,role:r.role,lastLoginAt:r.last_login_at||null}));
}
async function task391Projects(leadId=''){
  const args=[];let sql="SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='project' AND deleted=FALSE";
  if(leadId){args.push(leadId);sql+=" AND payload_json->>'leadId'=$1"}
  sql+=" ORDER BY updated_at DESC LIMIT 500";
  const rr=await rows(pool,sql,args);
  return rr.map(r=>{const p=task391Payload(r);return{projectId:r.entity_id,leadId:String(p.leadId||''),title:task391ProjectTitle(p,r.entity_id),status:String(p.status||''),deadline:String(p.deadline||p.dueDate||'').slice(0,10)}});
}
async function task391Tickets(leadId=''){
  const rr=await rows(pool,leadId?'SELECT ticket_id,lead_id,subject,status,priority,updated_at FROM portal_tickets WHERE lead_id=$1 ORDER BY updated_at DESC LIMIT 500':'SELECT ticket_id,lead_id,subject,status,priority,updated_at FROM portal_tickets ORDER BY updated_at DESC LIMIT 500',leadId?[leadId]:[]);
  return rr.map(r=>({ticketId:r.ticket_id,leadId:r.lead_id,subject:r.subject,status:r.status,priority:r.priority,updatedAt:r.updated_at}));
}
async function task391View(leadId=''){
  const tasks=await task391List(leadId,false),config=await task391SlaConfig();
  const active=tasks.filter(x=>!['Concluida','Cancelada'].includes(x.status));
  return{
    ok:true,config,team:await task391Team(),projects:await task391Projects(leadId),tickets:await task391Tickets(leadId),tasks,
    summary:{
      total:tasks.length,active:active.length,inProgress:active.filter(x=>x.status==='Em andamento').length,
      waitingClient:active.filter(x=>x.status==='Aguardando cliente').length,blocked:active.filter(x=>x.status==='Bloqueada').length,
      overdue:active.filter(x=>x.sla?.overdue).length,warning:active.filter(x=>x.sla?.warning).length,
      unassigned:active.filter(x=>!x.assignedUser).length,
      timeMinutes:tasks.reduce((a,x)=>a+x.timeMinutes,0)
    }
  };
}
async function task391ValidateLinks(leadId,projectId,ticketId){
  if(projectId){
    const p=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='project' AND entity_id=$1 AND deleted=FALSE",[projectId]);
    if(!p)throw new Error('Projeto nao encontrado.');
    const pp=task391Payload(p);if(leadId&&String(pp.leadId||'')&&String(pp.leadId)!==leadId)throw new Error('Projeto nao pertence ao cliente selecionado.');
  }
  if(ticketId){
    const t=await one(pool,'SELECT ticket_id,lead_id FROM portal_tickets WHERE ticket_id=$1',[ticketId]);
    if(!t)throw new Error('Chamado nao encontrado.');
    if(leadId&&t.lead_id&&t.lead_id!==leadId)throw new Error('Chamado nao pertence ao cliente selecionado.');
  }
}
async function task391Save(body,username){
  const id=body.taskId?validId(body.taskId,180):crypto.randomUUID(),existing=body.taskId?await one(pool,'SELECT * FROM task_items WHERE task_id=$1',[id]):null;
  if(body.taskId&&!existing)return{status:404,body:{ok:false,error:'Tarefa nao encontrada.'}};
  const title=task391Clean(body.title??existing?.title,220),description=task391Clean(body.description??existing?.description,6000);
  if(!title)return{status:400,body:{ok:false,error:'Titulo da tarefa e obrigatorio.'}};
  const leadId=body.leadId===undefined?(existing?.lead_id||''):(validId(body.leadId,180)||'');
  const projectId=body.projectId===undefined?(existing?.project_id||''):(validId(body.projectId,180)||'');
  const ticketId=body.ticketId===undefined?(existing?.ticket_id||''):(validId(body.ticketId,180)||'');
  await task391ValidateLinks(leadId,projectId,ticketId);
  const status=task391Status(body.status??existing?.status),priority=task391Priority(body.priority??existing?.priority);
  const assigned=body.assignedUser===undefined?(existing?.assigned_user||''):task391Clean(body.assignedUser,180);
  if(assigned){
    const user=await one(pool,'SELECT user_id FROM cloud_users WHERE username_ci=$1 AND active=TRUE',[assigned.toLowerCase()]);
    if(!user)return{status:400,body:{ok:false,error:'Responsavel selecionado nao esta ativo na equipe.'}};
  }
  const now=nowIso(),createdAt=existing?.created_at||now,config=await task391SlaConfig();
  const dueAt=body.dueAt===undefined?(existing?.due_at||null):(task391Iso(body.dueAt)||null);
  let slaDueAt;
  if(body.slaDueAt!==undefined)slaDueAt=task391Iso(body.slaDueAt)||null;
  else if(existing&&priority===existing.priority)slaDueAt=existing.sla_due_at||null;
  else slaDueAt=task391SlaDue(createdAt,priority,config)||null;
  const portalVisible=body.portalVisible===undefined?!!existing?.portal_visible:!!body.portalVisible;
  const completed=status==='Concluida'?(existing?.completed_at||now):null;
  if(existing){
    await pool.query('UPDATE task_items SET lead_id=$1,project_id=$2,ticket_id=$3,title=$4,description=$5,status=$6,priority=$7,assigned_user=$8,due_at=$9,sla_due_at=$10,portal_visible=$11,updated_at=$12,completed_at=$13 WHERE task_id=$14',
      [leadId||null,projectId||null,ticketId||null,title,description,status,priority,assigned||null,dueAt,slaDueAt,portalVisible,now,completed,id]);
  }else{
    await pool.query('INSERT INTO task_items(task_id,lead_id,project_id,ticket_id,title,description,status,priority,assigned_user,due_at,sla_due_at,portal_visible,created_by,created_at,updated_at,completed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15)',
      [id,leadId||null,projectId||null,ticketId||null,title,description,status,priority,assigned||null,dueAt,slaDueAt,portalVisible,username,now,completed]);
  }
  return{status:200,body:{ok:true,taskId:id,view:await task391View('')}};
}
async function task391Remove(body){
  const id=validId(body.taskId,180);if(!id)return{status:400,body:{ok:false,error:'Tarefa invalida.'}};
  const row=await one(pool,'SELECT task_id FROM task_items WHERE task_id=$1',[id]);if(!row)return{status:404,body:{ok:false,error:'Tarefa nao encontrada.'}};
  await withTransaction(pool,async client=>{
    await client.query('DELETE FROM task_checklist WHERE task_id=$1',[id]);
    await client.query('DELETE FROM task_comments WHERE task_id=$1',[id]);
    await client.query('DELETE FROM task_time_logs WHERE task_id=$1',[id]);
    await client.query('DELETE FROM task_items WHERE task_id=$1',[id]);
  });
  return{status:200,body:{ok:true,view:await task391View('')}};
}
async function task391ReplaceChecklist(body){
  const taskId=validId(body.taskId,180);if(!taskId)return{status:400,body:{ok:false,error:'Tarefa invalida.'}};
  const task=await one(pool,'SELECT task_id FROM task_items WHERE task_id=$1',[taskId]);if(!task)return{status:404,body:{ok:false,error:'Tarefa nao encontrada.'}};
  const list=(Array.isArray(body.items)?body.items:[]).slice(0,100),now=nowIso();
  await withTransaction(pool,async client=>{
    await client.query('DELETE FROM task_checklist WHERE task_id=$1',[taskId]);
    let pos=0;
    for(const item of list){
      const label=task391Clean(item?.label,500);if(!label)continue;
      await client.query('INSERT INTO task_checklist(checklist_id,task_id,label,done,portal_visible,sort_order,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$7)',
        [crypto.randomUUID(),taskId,label,!!item.done,item.portalVisible!==false,pos++,now]);
    }
    await client.query('UPDATE task_items SET updated_at=$1 WHERE task_id=$2',[now,taskId]);
  });
  return{status:200,body:{ok:true,view:await task391View('')}};
}
async function task391Comment(opts){
  const taskId=validId(opts.taskId,180);if(!taskId)throw new Error('Tarefa invalida.');
  const task=await one(pool,'SELECT * FROM task_items WHERE task_id=$1',[taskId]);if(!task)throw new Error('Tarefa nao encontrada.');
  if(opts.leadId&&task.lead_id!==opts.leadId)throw new Error('Tarefa nao pertence a este cliente.');
  if(opts.authorType==='Cliente'&&!task.portal_visible)throw new Error('Tarefa nao esta disponivel no Portal.');
  const body=task391Clean(opts.body,6000);if(!body)throw new Error('Digite um comentario.');
  const now=nowIso();
  await pool.query('INSERT INTO task_comments(comment_id,task_id,author_type,author_id,author_name,body,portal_visible,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [crypto.randomUUID(),taskId,opts.authorType||'Equipe',opts.authorId||null,task391Clean(opts.authorName,180),body,opts.authorType==='Cliente'?true:!!opts.portalVisible,now]);
  let nextStatus=task.status;
  if(opts.authorType==='Cliente'&&task.status==='Aguardando cliente')nextStatus='Em andamento';
  await pool.query('UPDATE task_items SET status=$1,updated_at=$2 WHERE task_id=$3',[nextStatus,now,taskId]);
}
async function task391Time(body,username){
  const taskId=validId(body.taskId,180);if(!taskId)return{status:400,body:{ok:false,error:'Tarefa invalida.'}};
  const task=await one(pool,'SELECT task_id FROM task_items WHERE task_id=$1',[taskId]);if(!task)return{status:404,body:{ok:false,error:'Tarefa nao encontrada.'}};
  const minutes=Math.max(1,Math.min(1440,Math.round(Number(body.minutes)||0)));if(!minutes)return{status:400,body:{ok:false,error:'Informe os minutos trabalhados.'}};
  const workedAt=task391Iso(body.workedAt)||nowIso(),now=nowIso();
  await pool.query('INSERT INTO task_time_logs(time_log_id,task_id,user_name,minutes,note,worked_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [crypto.randomUUID(),taskId,username,minutes,task391Clean(body.note,1200),workedAt,now]);
  await pool.query('UPDATE task_items SET updated_at=$1 WHERE task_id=$2',[now,taskId]);
  return{status:200,body:{ok:true,view:await task391View('')}};
}
async function task391SaveConfig(body,username){
  const next=task391SlaConfigNormalize(body||{});
  await saveSetting('task_sla_config',next,username);
  return{ok:true,config:next,view:await task391View('')};
}
async function task391FromTicket(body,username){
  const ticketId=validId(body.ticketId,180);if(!ticketId)return{status:400,body:{ok:false,error:'Chamado invalido.'}};
  const t=await one(pool,'SELECT * FROM portal_tickets WHERE ticket_id=$1',[ticketId]);if(!t)return{status:404,body:{ok:false,error:'Chamado nao encontrado.'}};
  const existing=await one(pool,'SELECT task_id FROM task_items WHERE ticket_id=$1 AND status<>$2 ORDER BY created_at DESC LIMIT 1',[ticketId,'Cancelada']);
  if(existing)return{status:409,body:{ok:false,error:'Este chamado ja possui uma tarefa vinculada.',taskId:existing.task_id}};
  return task391Save({
    leadId:t.lead_id,ticketId:t.ticket_id,title:t.subject,
    description:t.description||'',priority:TASK391_PRIORITY.has(t.priority)?t.priority:'Normal',
    status:'A fazer',portalVisible:true,assignedUser:body.assignedUser||''
  },username);
}
async function task391PortalView(session){
  const tasks=await task391List(session.leadId,true),active=tasks.filter(x=>!['Concluida','Cancelada'].includes(x.status));
  return{
    ok:true,tasks,
    summary:{
      total:tasks.length,active:active.length,inProgress:active.filter(x=>x.status==='Em andamento').length,
      waitingClient:active.filter(x=>x.status==='Aguardando cliente').length,completed:tasks.filter(x=>x.status==='Concluida').length
    }
  };
}

// Linha do tempo: tarefas publicas passam a aparecer no Portal.
const portalTimeline391Base=portalTimeline;
portalTimeline=async function(leadId,showFinance){
  const events=await portalTimeline391Base(leadId,showFinance);
  const rr=await rows(pool,"SELECT task_id,title,status,updated_at FROM task_items WHERE lead_id=$1 AND portal_visible=TRUE ORDER BY updated_at DESC LIMIT 60",[leadId]);
  for(const x of rr)events.push({type:'Tarefa',title:x.title,detail:'Status: '+String(x.status||''),at:x.updated_at,refId:x.task_id});
  return events.filter(x=>x.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,100);
};

// Saúde do Core: registra o novo modulo e contadores.
if(typeof CORE_MODULES!=='undefined'&&!CORE_MODULES.some(x=>x.key==='tasks')){
  CORE_MODULES.push({key:'tasks',name:'Tarefas, Equipe e SLA',version:'3.9.1',critical:true});
}
if(typeof CORE_REQUIRED_TABLES!=='undefined'){
  for(const t of ['task_items','task_checklist','task_comments','task_time_logs'])if(!CORE_REQUIRED_TABLES.includes(t))CORE_REQUIRED_TABLES.push(t);
}
const coreStatus391Base=coreStatus;
coreStatus=async function(){
  const d=await coreStatus391Base();
  const q=await one(pool,"SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status NOT IN ('Concluida','Cancelada'))::int AS active,COUNT(*) FILTER(WHERE status='Bloqueada')::int AS blocked,COUNT(*) FILTER(WHERE status NOT IN ('Concluida','Cancelada') AND sla_due_at IS NOT NULL AND sla_due_at<$1)::int AS overdue FROM task_items",[nowIso()]);
  d.tasks={total:Number(q?.total||0),active:Number(q?.active||0),blocked:Number(q?.blocked||0),overdue:Number(q?.overdue||0)};
  return d;
};


// --- EXE PRO 4.4.0: WhatsApp Business Central de Conversas ---
const WHATSAPP_BUSINESS_420='4.4.0';

function whatsapp420Payload(value){
  if(value&&typeof value==='object')return value;
  if(typeof value==='string'){try{return JSON.parse(value)||{}}catch{}}
  return {};
}
function whatsapp420Digits(value){
  let d=String(value||'').replace(/\D+/g,'');
  if(d.startsWith('00'))d=d.slice(2);
  if(d.length===10||d.length===11)d='55'+d;
  return d.length>=8&&d.length<=15?d:'';
}
function whatsapp420SamePhone(a,b){
  const x=whatsapp420Digits(a),y=whatsapp420Digits(b);
  return !!(x&&y&&x.length>=8&&y.length>=8&&(x===y||x.endsWith(y)||y.endsWith(x)));
}
function whatsapp420MessageIso(value){
  const n=Number(value||0);
  if(!Number.isFinite(n)||n<=0)return nowIso();
  return new Date(n<100000000000? n*1000:n).toISOString();
}
function whatsapp420ContactName(payload,fallback=''){
  const p=whatsapp420Payload(payload);
  return String(p.name||p.companyName||p.companyContactName||fallback||'').trim().slice(0,180);
}
function whatsapp420Error(value){
  return String(value?.message||value||'Erro no WhatsApp.').slice(0,500);
}
function whatsapp420StatusLabel(value){
  const v=String(value||'').toLowerCase();
  if(v==='delivered')return'Delivered';
  if(v==='read')return'Read';
  if(v==='sent')return'Sent';
  if(v==='failed')return'Failed';
  return v||'Received';
}
async function whatsapp420PublicConfig(){
  const c=await getNotifyConfig();
  const access=!!(await getSecret('whatsappAccessToken'));
  const verify=!!(await getSecret('whatsappVerifyToken'));
  const app=!!(await getSecret('whatsappAppSecret'));
  const base=String(PUBLIC_URL||'').replace(/\/+$/,'');
  return{
    configured:access&&!!c.whatsappPhoneNumberId&&!!c.whatsappGraphVersion,
    webhookReady:verify&&app,
    phoneNumberId:c.whatsappPhoneNumberId||'',
    graphVersion:c.whatsappGraphVersion||'',
    accessTokenConfigured:access,
    verifyTokenConfigured:verify,
    appSecretConfigured:app,
    webhookUrl:(base||'')+'/api/whatsapp/webhook'
  };
}
async function whatsapp420ConfigUpdate(body,user){
  body=body||{};
  const current=await getNotifyConfig();
  const next=normalizeNotifyConfig({
    ...current,
    whatsappPhoneNumberId:body.phoneNumberId===undefined?current.whatsappPhoneNumberId:String(body.phoneNumberId||'').trim(),
    whatsappGraphVersion:body.graphVersion===undefined?current.whatsappGraphVersion:String(body.graphVersion||'').trim()
  });
  if(next.whatsappPhoneNumberId&&!/^\d+$/.test(next.whatsappPhoneNumberId))throw new Error('Phone Number ID inválido.');
  if(next.whatsappGraphVersion&&!/^v\d+\.\d+$/.test(next.whatsappGraphVersion))throw new Error('Graph API version inválida. Use, por exemplo, v23.0.');
  if(String(body.accessToken||'').trim())await setSecret('whatsappAccessToken',body.accessToken);
  if(String(body.verifyToken||'').trim())await setSecret('whatsappVerifyToken',body.verifyToken);
  if(String(body.appSecret||'').trim())await setSecret('whatsappAppSecret',body.appSecret);
  await saveSetting('notification_config',next,user);
  return whatsapp420PublicConfig();
}
async function whatsapp420FindLead(phone){
  const leadRows=await rows(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND deleted=FALSE");
  for(const row of leadRows){
    const p=whatsapp420Payload(row.payload_json);
    if([p.whatsapp,p.phone,p.mobile,p.cellphone].some(value=>whatsapp420SamePhone(phone,value)))return{leadId:row.entity_id,payload:p};
  }
  return null;
}
async function whatsapp420EnsureConversation(input){
  input=input||{};
  const requestedId=validId(input.conversationId,180);
  let current=requestedId?await one(pool,'SELECT * FROM whatsapp_conversations WHERE conversation_id=$1',[requestedId]):null;
  const phone=whatsapp420Digits(input.phone||input.phoneNumber||current?.phone_number);
  if(!phone)throw new Error('Informe um número de WhatsApp válido.');
  if(!current)current=await one(pool,'SELECT * FROM whatsapp_conversations WHERE phone_number=$1',[phone]);
  const leadId=validId(input.leadId,180)||null;
  const contactName=String(input.contactName||'').trim().slice(0,180);
  const now=nowIso();
  if(current){
    await pool.query('UPDATE whatsapp_conversations SET phone_number=$1,contact_name=COALESCE(NULLIF($2,\'\'),contact_name),lead_id=COALESCE($3,lead_id),updated_at=$4 WHERE conversation_id=$5',[phone,contactName,leadId,now,current.conversation_id]);
    return one(pool,'SELECT * FROM whatsapp_conversations WHERE conversation_id=$1',[current.conversation_id]);
  }
  const id=crypto.randomUUID();
  const inserted=await pool.query('INSERT INTO whatsapp_conversations(conversation_id,lead_id,phone_number,contact_name,status,last_message_at,last_inbound_at,unread_count,created_at,updated_at) VALUES($1,$2,$3,$4,\'Aberta\',NULL,NULL,0,$5,$5) ON CONFLICT(phone_number) DO UPDATE SET contact_name=COALESCE(NULLIF(EXCLUDED.contact_name,\'\'),whatsapp_conversations.contact_name),lead_id=COALESCE(EXCLUDED.lead_id,whatsapp_conversations.lead_id),updated_at=EXCLUDED.updated_at RETURNING *',[id,leadId,phone,contactName,now]);
  return inserted.rows[0];
}
function whatsapp420ConversationView(row){
  return{
    conversationId:row.conversation_id,
    leadId:row.lead_id||'',
    phoneNumber:row.phone_number||'',
    contactName:row.contact_name||row.phone_number||'',
    status:row.status||'Aberta',
    lastMessageAt:row.last_message_at||'',
    lastInboundAt:row.last_inbound_at||'',
    unreadCount:Number(row.unread_count||0),
    lastMessageBody:row.last_message_body||'',
    lastMessageDirection:row.last_message_direction||''
  };
}
function whatsapp420MessageView(row){
  return{
    messageId:row.message_id,
    conversationId:row.conversation_id,
    providerMessageId:row.provider_message_id||'',
    direction:row.direction,
    messageType:row.message_type,
    body:row.body||'',
    status:row.status||'',
    errorText:row.error_text||'',
    sentBy:row.sent_by||'',
    createdAt:row.created_at,
    updatedAt:row.updated_at
  };
}
async function whatsapp420View(url){
  const limit=Math.max(1,Math.min(200,Number(url.searchParams.get('limit')||100)));
  const list=await rows(pool,"SELECT c.*,last_msg.body AS last_message_body,last_msg.direction AS last_message_direction FROM whatsapp_conversations c LEFT JOIN LATERAL (SELECT body,direction FROM whatsapp_messages m WHERE m.conversation_id=c.conversation_id ORDER BY m.created_at DESC,m.updated_at DESC LIMIT 1) last_msg ON TRUE ORDER BY c.last_message_at DESC NULLS LAST,c.updated_at DESC LIMIT $1",[limit]);
  const requested=validId(url.searchParams.get('conversationId'),180);
  const selectedId=requested||(list[0]?.conversation_id||'');
  const selectedRow=selectedId?await one(pool,'SELECT * FROM whatsapp_conversations WHERE conversation_id=$1',[selectedId]):null;
  const messages=selectedRow?await rows(pool,'SELECT message_id,conversation_id,provider_message_id,direction,message_type,body,status,error_text,sent_by,created_at,updated_at FROM whatsapp_messages WHERE conversation_id=$1 ORDER BY created_at DESC,updated_at DESC LIMIT 500',[selectedRow.conversation_id]):[];
  const unread=await one(pool,'SELECT COALESCE(SUM(unread_count),0)::int AS total,COUNT(*)::int AS conversations FROM whatsapp_conversations WHERE unread_count>0');
  return{
    ok:true,
    config:await whatsapp420PublicConfig(),
    summary:{conversations:list.length,unread:Number(unread?.total||0),unreadConversations:Number(unread?.conversations||0)},
    conversations:list.map(whatsapp420ConversationView),
    selected:selectedRow?{...whatsapp420ConversationView(selectedRow),messages:messages.reverse().map(whatsapp420MessageView)}:null
  };
}
async function whatsapp420ClearFailed(body){
  body=body||{};
  const conversationId=validId(body.conversationId,180);
  if(!conversationId)throw new Error('Conversa não informada.');
  const conversation=await one(pool,'SELECT conversation_id FROM whatsapp_conversations WHERE conversation_id=$1',[conversationId]);
  if(!conversation)throw new Error('Conversa não encontrada.');
  const result=await pool.query("DELETE FROM whatsapp_messages WHERE conversation_id=$1 AND LOWER(status)='failed' RETURNING message_id",[conversationId]);
  await pool.query('UPDATE whatsapp_conversations SET updated_at=$1 WHERE conversation_id=$2',[nowIso(),conversationId]);
  return Number(result?.rowCount||0);
}
function whatsapp420TextFromMessage(message){
  const type=String(message?.type||'text');
  if(type==='text')return String(message?.text?.body||'').trim();
  if(type==='image')return String(message?.image?.caption||'[Imagem recebida]').trim();
  if(type==='video')return String(message?.video?.caption||'[Vídeo recebido]').trim();
  if(type==='audio')return'[Áudio recebido]';
  if(type==='document')return String(message?.document?.caption||'[Documento recebido]').trim();
  if(type==='location')return'[Localização recebida]';
  if(type==='contacts')return'[Contato recebido]';
  if(type==='sticker')return'[Sticker recebido]';
  return'['+type+' recebido]';
}
async function whatsapp420StoreInbound(value,message){
  const providerId=validId(message?.id,240);
  const from=whatsapp420Digits(message?.from);
  if(!providerId||!from)return false;
  const contact=(value?.contacts||[]).find(x=>whatsapp420Digits(x?.wa_id)===from)||{};
  const lead=await whatsapp420FindLead(from);
  const conversation=await whatsapp420EnsureConversation({phone:from,leadId:lead?.leadId||'',contactName:contact?.profile?.name||''});
  const createdAt=whatsapp420MessageIso(message?.timestamp);
  const messageType=String(message?.type||'text').slice(0,40);
  const body=whatsapp420TextFromMessage(message).slice(0,10000);
  const now=nowIso();
  const inserted=await pool.query("INSERT INTO whatsapp_messages(message_id,conversation_id,provider_message_id,direction,message_type,body,status,error_text,sent_by,provider_payload,created_at,updated_at) VALUES($1,$2,$3,'inbound',$4,$5,'Received',NULL,NULL,$6::jsonb,$7,$8) ON CONFLICT(provider_message_id) DO NOTHING RETURNING message_id",[crypto.randomUUID(),conversation.conversation_id,providerId,messageType,body,JSON.stringify(message),createdAt,now]);
  if(!inserted.rowCount)return false;
  await pool.query("UPDATE whatsapp_conversations SET lead_id=COALESCE($1,lead_id),contact_name=COALESCE(NULLIF($2,''),contact_name),last_message_at=$3,last_inbound_at=$3,unread_count=unread_count+1,updated_at=$4 WHERE conversation_id=$5",[lead?.leadId||null,contact?.profile?.name||'',createdAt,now,conversation.conversation_id]);
  return true;
}
async function whatsapp420StoreStatus(status){
  const providerId=validId(status?.id,240);
  if(!providerId)return false;
  const state=String(status?.status||'').toLowerCase();
  if(!state)return false;
  const errorText=(status?.errors||[]).map(x=>x?.title||x?.message||'').filter(Boolean).join('; ').slice(0,500)||null;
  const result=await pool.query('UPDATE whatsapp_messages SET status=$1,error_text=$2,updated_at=$3 WHERE provider_message_id=$4',[whatsapp420StatusLabel(state),errorText,nowIso(),providerId]);
  return result.rowCount>0;
}
function whatsapp420SignatureValid(raw,secret,header){
  const expected=crypto.createHmac('sha256',secret).update(raw,'utf8').digest('hex');
  const actual=String(header||'').replace(/^sha256=/i,'').trim();
  if(!/^[a-f0-9]{64}$/i.test(actual))return false;
  return crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(actual,'hex'));
}
function whatsapp420ReadRaw(req){
  return new Promise((resolve,reject)=>{
    let raw='',size=0;
    req.setEncoding('utf8');
    req.on('data',chunk=>{size+=Buffer.byteLength(chunk,'utf8');if(size>2*1024*1024){reject(new Error('Webhook muito grande.'));req.destroy();return}raw+=chunk});
    req.on('end',()=>resolve(raw));
    req.on('error',reject);
  });
}
async function whatsapp420WebhookVerify(url,res){
  const verify=await getSecret('whatsappVerifyToken');
  const mode=url.searchParams.get('hub.mode'),token=url.searchParams.get('hub.verify_token'),challenge=url.searchParams.get('hub.challenge');
  if(mode==='subscribe'&&verify&&token===verify&&challenge){
    res.writeHead(200,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});res.end(challenge);return;
  }
  return json(res,403,{ok:false,error:'Verificação do webhook recusada.'});
}
async function whatsapp420WebhookReceive(req,res){
  const secret=await getSecret('whatsappAppSecret');
  if(!secret)return json(res,503,{ok:false,error:'App Secret do WhatsApp ainda não configurado.'});
  const raw=await whatsapp420ReadRaw(req);
  if(!whatsapp420SignatureValid(raw,secret,req.headers['x-hub-signature-256']))return json(res,403,{ok:false,error:'Assinatura do webhook inválida.'});
  let body={};try{body=raw?JSON.parse(raw):{}}catch{return json(res,400,{ok:false,error:'Payload do webhook inválido.'})}
  if(body.object!=='whatsapp_business_account')return json(res,200,{ok:true,ignored:true});
  let received=0,updated=0;
  for(const entry of(body.entry||[])){
    for(const change of(entry.changes||[])){
      const value=change.value||{};
      for(const message of(value.messages||[]))if(await whatsapp420StoreInbound(value,message))received++;
      for(const status of(value.statuses||[]))if(await whatsapp420StoreStatus(status))updated++;
    }
  }
  return json(res,200,{ok:true,received,updated});
}
async function whatsapp420CreateConversation(body){
  body=body||{};
  const phone=whatsapp420Digits(body.phoneNumber||body.phone);
  if(!phone)throw new Error('Informe o número com DDD e país, por exemplo 5511999999999.');
  let leadId=validId(body.leadId,180),contactName=String(body.contactName||'').trim().slice(0,180);
  if(leadId){
    const lead=await one(pool,"SELECT payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
    if(lead&&!contactName)contactName=whatsapp420ContactName(lead.payload_json);
  }
  const conversation=await whatsapp420EnsureConversation({phone,leadId,contactName});
  return whatsapp420ConversationView(conversation);
}
async function whatsapp420SendText(body,user){
  body=body||{};
  const text=String(body.text||'').trim().slice(0,4096);
  if(!text)throw new Error('Digite uma mensagem.');
  let phone=whatsapp420Digits(body.phoneNumber||body.phone),leadId=validId(body.leadId,180),contactName=String(body.contactName||'').trim().slice(0,180);
  if(!phone&&leadId){
    const lead=await one(pool,"SELECT payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
    const p=whatsapp420Payload(lead?.payload_json);phone=whatsapp420Digits(p.whatsapp||p.phone);if(!contactName)contactName=whatsapp420ContactName(p);
  }
  const conversation=await whatsapp420EnsureConversation({conversationId:body.conversationId,phone,leadId,contactName});
  const config=await getNotifyConfig(),token=await getSecret('whatsappAccessToken');
  if(!token)throw new Error('Access Token do WhatsApp ainda não configurado.');
  if(!/^\d+$/.test(config.whatsappPhoneNumberId||''))throw new Error('Phone Number ID do WhatsApp ainda não configurado.');
  if(!/^v\d+\.\d+$/.test(config.whatsappGraphVersion||''))throw new Error('Graph API version inválida ou não configurada.');
  const payload={messaging_product:'whatsapp',recipient_type:'individual',to:conversation.phone_number,type:'text',text:{preview_url:false,body:text}};
  const now=nowIso();
  try{
    const result=await fetchJson('https://graph.facebook.com/'+config.whatsappGraphVersion+'/'+config.whatsappPhoneNumberId+'/messages',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(payload)},20000);
    const providerId=validId(result.messages?.[0]?.id,240);if(!providerId)throw new Error('WhatsApp não retornou o ID da mensagem.');
    const inserted=await pool.query("INSERT INTO whatsapp_messages(message_id,conversation_id,provider_message_id,direction,message_type,body,status,error_text,sent_by,provider_payload,created_at,updated_at) VALUES($1,$2,$3,'outbound','text',$4,'Sent',NULL,$5,$6::jsonb,$7,$7) RETURNING message_id",[crypto.randomUUID(),conversation.conversation_id,providerId,text,user||'',JSON.stringify(result),now]);
    await pool.query('UPDATE whatsapp_conversations SET last_message_at=$1,updated_at=$1 WHERE conversation_id=$2',[now,conversation.conversation_id]);
    return{conversationId:conversation.conversation_id,message:whatsapp420MessageView(inserted.rows[0]),providerMessageId:providerId};
  }catch(error){
    await pool.query("INSERT INTO whatsapp_messages(message_id,conversation_id,provider_message_id,direction,message_type,body,status,error_text,sent_by,provider_payload,created_at,updated_at) VALUES($1,$2,NULL,'outbound','text',$3,'Failed',$4,$5,'{}'::jsonb,$6,$6)",[crypto.randomUUID(),conversation.conversation_id,text,whatsapp420Error(error),user||'',now]);
    await pool.query('UPDATE whatsapp_conversations SET last_message_at=$1,updated_at=$1 WHERE conversation_id=$2',[now,conversation.conversation_id]);
    throw error;
  }
}


// --- EXE PRO 4.4.0: WhatsApp Business App Onboarding / Coexistence ---
const WHATSAPP_COEXISTENCE_430='4.4.0';

function whatsapp430Value(value){
  if(value&&typeof value==='object')return value;
  if(typeof value==='string'){try{return JSON.parse(value)||{}}catch{}}
  return{};
}
function whatsapp430Error(value){return String(value?.message||value||'Erro na conexão oficial do WhatsApp.').slice(0,500)}
function whatsapp430Hash(value){return crypto.createHash('sha256').update(String(value||''),'utf8').digest('hex')}
function whatsapp430Find(root,keys){
  const wanted=new Set(keys),queue=[whatsapp430Value(root)],seen=new Set();
  while(queue.length){
    const item=queue.shift();if(!item||typeof item!=='object'||seen.has(item))continue;seen.add(item);
    for(const key of wanted){if(item[key]!==undefined&&item[key]!==null&&String(item[key]).trim())return String(item[key]).trim()}
    for(const value of Object.values(item))if(value&&typeof value==='object')queue.push(value);
  }
  return'';
}
async function whatsapp430ConfigView(){
  const saved=await settingValue('whatsapp_coexistence_config',{});
  const notify=await getNotifyConfig();
  const appId=String(saved.appId||process.env.WHATSAPP_META_APP_ID||'').trim();
  const configId=String(saved.configId||process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID||'').trim();
  const graphVersion=String(notify.whatsappGraphVersion||process.env.WHATSAPP_GRAPH_VERSION||'v23.0').trim();
  const access=!!(await getSecret('whatsappAccessToken'));
  const appSecret=!!(await getSecret('whatsappAppSecret'));
  return{
    ok:true,
    enabled:/^\d+$/.test(appId)&&/^\d+$/.test(configId),
    appId,
    configId,
    graphVersion:/^v\d+\.\d+$/.test(graphVersion)?graphVersion:'v23.0',
    accessTokenConfigured:access,
    appSecretConfigured:appSecret,
    connected:!!(saved.connectedAt&&saved.phoneNumberId),
    connectedAt:saved.connectedAt||'',
    wabaId:saved.wabaId||'',
    phoneNumberId:saved.phoneNumberId||notify.whatsappPhoneNumberId||'',
    displayPhoneNumber:saved.displayPhoneNumber||'',
    verifiedName:saved.verifiedName||'',
    mode:saved.mode||'coexistence',
    lastError:saved.lastError||''
  };
}
async function whatsapp430SaveConfig(body,user){
  body=body||{};
  const current=await settingValue('whatsapp_coexistence_config',{});
  const appId=String(body.appId===undefined?current.appId||process.env.WHATSAPP_META_APP_ID||'':body.appId||'').trim();
  const configId=String(body.configId===undefined?current.configId||process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID||'':body.configId||'').trim();
  if(appId&&!/^\d+$/.test(appId))throw new Error('Meta App ID inválido.');
  if(configId&&!/^\d+$/.test(configId))throw new Error('Embedded Signup Config ID inválido.');
  await saveSetting('whatsapp_coexistence_config',{...current,appId,configId,lastError:''},user);
  return whatsapp430ConfigView();
}
async function whatsapp430Start(user){
  const config=await whatsapp430ConfigView();
  if(!config.enabled)throw new Error('Configure o Meta App ID e o Embedded Signup Config ID antes de iniciar.');
  if(!config.appSecretConfigured)throw new Error('Configure primeiro o App Secret da Meta no painel WhatsApp Business.');
  const raw=crypto.randomBytes(32).toString('hex');
  const now=nowIso();
  await pool.query('DELETE FROM whatsapp_onboarding_states WHERE expires_at<$1 OR consumed_at IS NOT NULL',[now]);
  await pool.query('INSERT INTO whatsapp_onboarding_states(state_hash,username,created_at,expires_at,consumed_at) VALUES($1,$2,$3,$4,NULL)',[whatsapp430Hash(raw),user,now,new Date(Date.now()+10*60*1000).toISOString()]);
  return{ok:true,state:raw,config};
}
async function whatsapp430Graph(pathname,token,options){
  const config=await whatsapp430ConfigView();
  const headers={...(options?.headers||{}),authorization:'Bearer '+token,accept:'application/json'};
  if(options?.body!==undefined)headers['content-type']='application/json';
  return fetchJson('https://graph.facebook.com/'+config.graphVersion+'/'+pathname,{...(options||{}),headers},20000);
}
async function whatsapp430Complete(body,user){
  body=body||{};
  const rawState=String(body.state||'').trim();
  const stateHash=whatsapp430Hash(rawState);
  const stateRow=rawState?await one(pool,'SELECT * FROM whatsapp_onboarding_states WHERE state_hash=$1',[stateHash]):null;
  if(!stateRow||stateRow.username!==user||stateRow.consumed_at||new Date(stateRow.expires_at).getTime()<Date.now())throw new Error('O estado de conexão expirou. Inicie o QR Code novamente.');
  const code=String(body.code||'').trim().slice(0,2000);
  let accessToken=String(body.accessToken||'').trim();
  const config=await whatsapp430ConfigView();
  const session=whatsapp430Value(body.sessionInfo);
  const wabaId=whatsapp430Find(session,['waba_id','wabaId']);
  const phoneNumberId=whatsapp430Find(session,['phone_number_id','phoneNumberId']);
  if(!code&&!accessToken)throw new Error('A Meta não retornou o código de autorização.');
  if(code){
    const secret=await getSecret('whatsappAppSecret');
    if(!secret)throw new Error('App Secret da Meta não configurado.');
    const exchange='https://graph.facebook.com/'+config.graphVersion+'/oauth/access_token?client_id='+encodeURIComponent(config.appId)+'&client_secret='+encodeURIComponent(secret)+'&code='+encodeURIComponent(code);
    const exchanged=await fetchJson(exchange,{method:'GET',headers:{accept:'application/json'}},20000);
    accessToken=String(exchanged.access_token||'').trim();
  }
  if(!accessToken)throw new Error('A Meta não retornou um Access Token.');
  if(!/^\d+$/.test(wabaId)||!/^\d+$/.test(phoneNumberId))throw new Error('A Meta não retornou o WABA ID e o Phone Number ID. Feche e inicie novamente o QR Code oficial.');
  try{
    let phoneInfo={};
    try{phoneInfo=await whatsapp430Graph(phoneNumberId,accessToken,{method:'GET'})}catch{}
    let subscribeError='';
    try{await whatsapp430Graph(wabaId+'/subscribed_apps',accessToken,{method:'POST'})}catch(error){subscribeError=whatsapp430Error(error)}
    await setSecret('whatsappAccessToken',accessToken);
    const notify=await getNotifyConfig();
    const next=normalizeNotifyConfig({...notify,whatsappPhoneNumberId:phoneNumberId,whatsappGraphVersion:config.graphVersion});
    await saveSetting('notification_config',next,user);
    const current=await settingValue('whatsapp_coexistence_config',{});
    await saveSetting('whatsapp_coexistence_config',{
      ...current,
      appId:config.appId,
      configId:config.configId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber:String(phoneInfo.display_phone_number||'').slice(0,80),
      verifiedName:String(phoneInfo.verified_name||'').slice(0,180),
      mode:'coexistence',
      connectedAt:nowIso(),
      lastError:subscribeError
    },user);
    await pool.query('UPDATE whatsapp_onboarding_states SET consumed_at=$1 WHERE state_hash=$2',[nowIso(),stateHash]);
    return whatsapp430ConfigView();
  }catch(error){
    const current=await settingValue('whatsapp_coexistence_config',{});
    await saveSetting('whatsapp_coexistence_config',{...current,lastError:whatsapp430Error(error)},user);
    throw error;
  }
}

const SITE440_MARKER = 'EXE_PRO_SITE_LEADS_440';
const SITE440_SECRET = String(process.env.EXE_CLOUD_SITE_LEAD_SECRET || '').trim();
const SITE440_MAX_BODY = 256 * 1024;
const SITE440_MAX_SKEW_MS = 5 * 60 * 1000;
const SITE440_RATE_WINDOW_MS = 10 * 60 * 1000;
const SITE440_RATE_LIMIT = 30;
const siteLead440Rate = new Map();

function siteLead440ReadRawBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    let settled = false;
    const chunks = [];
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve(value);
    };
    req.on('data', chunk => {
      if (settled) return;
      total += chunk.length;
      if (total > SITE440_MAX_BODY) {
        req.resume();
        finish(Object.assign(new Error('Payload do site excede o limite permitido.'), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => finish(null, Buffer.concat(chunks).toString('utf8')));
    req.on('error', error => finish(error));
  });
}

function siteLead440ExpectedSignature(timestamp, rawBody) {
  return 'sha256=' + crypto.createHmac('sha256', SITE440_SECRET)
    .update(String(timestamp) + '.' + String(rawBody), 'utf8')
    .digest('hex');
}

function siteLead440SignatureValid(req, rawBody) {
  if (!SITE440_SECRET) return false;
  const timestamp = String(req.headers['x-exekuta-timestamp'] || '').trim();
  const signature = String(req.headers['x-exekuta-signature'] || '').trim().toLowerCase();
  if (!/^[0-9]{10,13}$/.test(timestamp) || !/^sha256=[0-9a-f]{64}$/.test(signature)) return false;
  const numeric = Number(timestamp);
  const timestampMs = timestamp.length === 10 ? numeric * 1000 : numeric;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > SITE440_MAX_SKEW_MS) return false;
  return safeEq(signature, siteLead440ExpectedSignature(timestamp, rawBody).toLowerCase());
}

function siteLead440RateAllowed(key) {
  const now = Date.now();
  const current = siteLead440Rate.get(key);
  if (!current || now - current.startedAt >= SITE440_RATE_WINDOW_MS) {
    siteLead440Rate.set(key, { startedAt: now, count: 1 });
  } else {
    current.count += 1;
    if (current.count > SITE440_RATE_LIMIT) return false;
  }
  if (siteLead440Rate.size > 5000) {
    for (const [entryKey, entry] of siteLead440Rate) {
      if (now - entry.startedAt >= SITE440_RATE_WINDOW_MS) siteLead440Rate.delete(entryKey);
    }
  }
  return true;
}

function siteLead440Input(body, keys, max, label) {
  const candidates = Array.isArray(keys) ? keys : [keys];
  let raw = '';
  for (const key of candidates) {
    if (body[key] !== undefined && body[key] !== null) {
      raw = body[key];
      break;
    }
  }
  const value = String(raw || '').trim();
  if (value.length > max) return { ok: false, error: label + ' excede o limite permitido.' };
  return { ok: true, value };
}

function siteLead440Normalize(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Payload do site invalido.' };
  }
  const honeypot = String(body.honeypot || '').trim();
  if (honeypot) return { ok: false, error: 'Formulario invalido.' };
  const consent = body.consent === true || body.consent === 1 || body.consent === '1' || body.consent === 'true';
  if (!consent) return { ok: false, error: 'O consentimento e obrigatorio.' };

  const schema = [
    ['name', ['name'], 120, 'Nome'],
    ['email', ['email'], 180, 'E-mail'],
    ['whatsapp', ['whatsapp', 'phone'], 40, 'WhatsApp'],
    ['company', ['company', 'companyName'], 180, 'Empresa'],
    ['role', ['role'], 120, 'Cargo'],
    ['website', ['website'], 300, 'Site'],
    ['challenge', ['challenge'], 500, 'Desafio'],
    ['service', ['service'], 180, 'Servico'],
    ['investment', ['investment'], 120, 'Investimento'],
    ['message', ['message'], 4000, 'Mensagem'],
    ['sourcePage', ['sourcePage', 'source_page'], 300, 'Pagina de origem'],
    ['externalId', ['eventId', 'externalId'], 180, 'Identificador externo']
  ];
  const values = {};
  for (const [key, keys, max, label] of schema) {
    const field = siteLead440Input(body, keys, max, label);
    if (!field.ok) return field;
    values[key] = field.value;
  }

  values.name = values.name.replace(/\s+/g, ' ');
  values.email = values.email.toLowerCase();
  if (values.name.length < 2) return { ok: false, error: 'Informe seu nome.' };
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    return { ok: false, error: 'E-mail invalido.' };
  }
  const phoneDigits = values.whatsapp.replace(/\D/g, '');
  if (values.whatsapp && (phoneDigits.length < 10 || phoneDigits.length > 20)) {
    return { ok: false, error: 'WhatsApp invalido.' };
  }
  if (!values.email && !phoneDigits) {
    return { ok: false, error: 'Informe e-mail ou WhatsApp.' };
  }
  if (values.website) {
    try {
      const website = new URL(values.website);
      if (!['http:', 'https:'].includes(website.protocol)) throw new Error('protocol');
    } catch {
      return { ok: false, error: 'Site invalido.' };
    }
  }

  const utm = {};
  if (body.utm && typeof body.utm === 'object' && !Array.isArray(body.utm)) {
    for (const key of ['source', 'medium', 'campaign', 'term', 'content']) {
      const field = siteLead440Input(body.utm, key, 120, 'UTM ' + key);
      if (!field.ok) return field;
      if (field.value) utm[key] = field.value;
    }
  }
  return {
    ok: true,
    value: {
      ...values,
      phoneDigits,
      utm
    }
  };
}

function siteLead440Fingerprint(value) {
  const input = value || {};
  const externalId = String(input.externalId || '').trim();
  const canonical = externalId
    ? 'event:' + externalId
    : [
      'payload',
      String(input.email || '').toLowerCase(),
      String(input.phoneDigits || String(input.whatsapp || '').replace(/\D/g, '')),
      String(input.website || '').toLowerCase(),
      String(input.sourcePage || '').toLowerCase(),
      String(input.message || '').toLowerCase()
    ].join('|');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

async function siteLead440Handle(req) {
  if (!SITE440_SECRET) {
    return { status: 503, body: { ok: false, error: 'Integracao do site ainda nao foi configurada na Cloud.' } };
  }
  const rawBody = await siteLead440ReadRawBody(req);
  if (!siteLead440SignatureValid(req, rawBody)) {
    return { status: 401, body: { ok: false, error: 'Assinatura da integracao invalida ou expirada.' } };
  }
  let body;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return { status: 400, body: { ok: false, error: 'JSON invalido.' } };
  }
  const headerEventId = String(req.headers['x-exekuta-event-id'] || '').trim();
  if (headerEventId && !body.eventId && !body.externalId) {
    body = { ...body, eventId: headerEventId };
  }
  const normalized = siteLead440Normalize(body);
  if (!normalized.ok) return { status: 400, body: { ok: false, error: normalized.error } };
  const rateKey = clientIp(req) || 'unknown';
  if (!siteLead440RateAllowed(rateKey)) {
    return { status: 429, body: { ok: false, error: 'Muitas tentativas. Aguarde alguns minutos.' } };
  }

  const value = normalized.value;
  const integrationKey = siteLead440Fingerprint(value);
  const result = await withTransaction(pool, async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [integrationKey]);
    const duplicate = await one(client, "SELECT entity_id FROM entities WHERE entity_type='lead' AND deleted=FALSE AND payload_json->>'integrationKey'=$1 LIMIT 1", [integrationKey]);
    if (duplicate) {
      return {
        status: 200,
        body: { ok: true, duplicate: true, leadId: duplicate.entity_id }
      };
    }

    const leadId = 'site-' + crypto.randomUUID();
    const now = nowIso();
    const note = [value.message, value.challenge].filter(Boolean).join('\n\n').slice(0, 4000);
    const payload = {
      id: leadId,
      leadId,
      name: value.name,
      companyName: value.company || value.name,
      companyContactName: value.name,
      companyContactRole: value.role,
      email: value.email,
      phone: value.whatsapp,
      whatsapp: value.whatsapp,
      website: value.website,
      service: value.service,
      clientServices: value.service,
      segment: value.service,
      investment: value.investment,
      challenge: value.challenge,
      message: value.message,
      notes: note,
      source: 'Site EXEKUTA',
      sourcePage: value.sourcePage,
      utm: value.utm,
      consent: true,
      consentAt: now,
      integration: 'exekuta-site',
      integrationKey,
      externalId: value.externalId,
      crmStatus: 'Novo',
      createdAt: now,
      createdBy: 'Site EXEKUTA',
      updatedAt: now,
      updatedBy: 'Site EXEKUTA'
    };
    await client.query(
      'INSERT INTO entities(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,1,$3,1,FALSE,$4::jsonb,$5)',
      ['lead', leadId, 'site-exekuta', JSON.stringify(payload), now]
    );
    await client.query(
      'INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,1,$3,1,FALSE,$4::jsonb,$5)',
      ['lead', leadId, 'site-exekuta', JSON.stringify(payload), now]
    );
    return {
      status: 201,
      body: { ok: true, duplicate: false, leadId, cursor: await maxCursor(client) }
    };
  });
  await audit(result.body.duplicate ? 'site_lead_duplicate' : 'site_lead_created', 'site-exekuta', req, String(result.body.leadId || ''));
  return result;
}

async function portalProspectSave(body,ps){
  if(String(ps.role||'').toLowerCase()!=='proprietario')return{status:403,body:{ok:false,error:'Somente o perfil Proprietario do portal pode salvar leads.'}};
  const x=body&&typeof body==='object'?body:{};
  const name=validId(x.name,180)||validId(x.companyName,180);
  if(!name)return{status:400,body:{ok:false,error:'Informe o nome da empresa.'}};
  const id=validId(x.entityId||crypto.randomUUID(),180),now=nowIso();
  const payload={
    name,companyName:validId(x.companyName,180)||name,
    address:validId(x.address,180),phone:validId(x.phone,60),whatsapp:validId(x.phone,60),
    website:validId(x.website,240),placeId:validId(x.placeId,180),category:validId(x.category,120),
    segment:validId(x.segment,120),city:validId(x.city,80),state:validId(x.state,40),region:validId(x.region,120),
    rating:Number(x.rating||0),reviews:Number(x.reviews||0),mapsUrl:validId(x.mapsUrl,240),
    source:'Portal do Cliente',crmStatus:'Novo',
    notes:'Prospectado via Portal do Cliente'+(x.query?' · '+String(x.query).slice(0,120):''),
    createdAt:now,updatedAt:now,createdBy:ps.username||'Portal'
  };
  return withTransaction(pool,async client=>{
    const existing=await one(client,'SELECT 1 AS ok FROM entities WHERE entity_type=$1 AND entity_id=$2',['lead',id]);
    if(existing)return{status:409,body:{ok:false,error:'Este lead ja existe no CRM.'}};
    await client.query('INSERT INTO entities(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,1,$3,1,FALSE,$4::jsonb,$5)',['lead',id,'portal-web',JSON.stringify(payload),now]);
    await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,1,$3,1,FALSE,$4::jsonb,$5)',['lead',id,'portal-web',JSON.stringify(payload),now]);
    const row=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2',['lead',id]),cursor=await maxCursor(client);
    return{status:201,body:{ok:true,row:publicRow(row),cursor}};
  });
}
function wpCtrlPopupSanitize(v){const p=v&&typeof v==='object'?v:{},hex=s=>/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(String(s||''));
  const out={};
  if(p.enabled!==undefined)out.enabled=!!p.enabled;
  if(p.title!==undefined)out.title=String(p.title).slice(0,180);
  if(p.message!==undefined)out.message=String(p.message).slice(0,2000);
  if(p.button_label!==undefined)out.button_label=String(p.button_label).slice(0,80);
  if(p.button_url!==undefined){const s=String(p.button_url||'').trim();out.button_url=(s&&!/^https?:\/\//i.test(s))?'':s;}
  if(p.accent_color!==undefined)out.accent_color=hex(p.accent_color)?p.accent_color:'#18b7a4';
  if(p.show_on!==undefined)out.show_on=['all','home'].includes(p.show_on)?p.show_on:'all';
  if(p.frequency!==undefined)out.frequency=['session','daily','always'].includes(p.frequency)?p.frequency:'session';
  if(p.delay_seconds!==undefined)out.delay_seconds=Math.max(0,Math.min(30,Math.round(Number(p.delay_seconds)||0)));
  return out;
}
async function wpCtrlPopupRemote(site,method,popup){
  const base=wpCtrlNormalizeUrl(site.site_url);
  if(!base)throw new Error('URL WordPress invalida. Use HTTPS publico.');
  const secret=await getSecret(wpCtrlSecretKey(site.site_id));
  if(!secret)throw new Error('Chave de conexao WordPress nao configurada.');
  const route='/exe-pro/v1/popup';
  const body=method==='GET'?'':JSON.stringify(popup||{});
  const timestamp=String(Math.floor(Date.now()/1000));
  const nonce=crypto.randomBytes(18).toString('base64url');
  const bodyHash=crypto.createHash('sha256').update(body).digest('hex');
  const canonical=[timestamp,nonce,method,route,bodyHash].join('\n');
  const signature=crypto.createHmac('sha256',secret).update(canonical).digest('hex');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
    const res=await fetch(base+'/wp-json'+route,{
      method,redirect:'error',signal:controller.signal,
      headers:{'accept':'application/json','content-type':'application/json','user-agent':'EXE-PRO-Cloud/4.4.8','x-exe-timestamp':timestamp,'x-exe-nonce':nonce,'x-exe-signature':signature},
      body:method==='GET'?undefined:body
    });
    const text=await res.text();let data={};
    try{data=text?JSON.parse(text):{}}catch{data={raw:text.slice(0,500)}}
    if(!res.ok)throw new Error('WordPress HTTP '+res.status+': '+String(data.message||data.error||data.raw||'falha remota').slice(0,300));
    return data;
}finally{clearTimeout(timer)}
}
function guardKey(ip,user){return`${ip}|${String(user||'').toLowerCase()}`}
async function loginBlocked(ip,user){const row=await one(pool,'SELECT * FROM web_login_guard WHERE guard_key=$1',[guardKey(ip,user)]);return!!(row&&row.blocked_until&&row.blocked_until>nowIso())}
async function recordLoginFail(ip,user){const key=guardKey(ip,user),old=await one(pool,'SELECT * FROM web_login_guard WHERE guard_key=$1',[key]),now=new Date(),count=(old?Number(old.fail_count||0):0)+1,blocked=count>=LOGIN_MAX_ATTEMPTS?new Date(now.getTime()+LOGIN_BLOCK_MINUTES*60000).toISOString():null;await pool.query('INSERT INTO web_login_guard(guard_key,fail_count,blocked_until,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(guard_key) DO UPDATE SET fail_count=EXCLUDED.fail_count,blocked_until=EXCLUDED.blocked_until,updated_at=EXCLUDED.updated_at',[key,count,blocked,now.toISOString()]);return blocked}
async function clearLoginGuard(ip,user){try{await pool.query('DELETE FROM web_login_guard WHERE guard_key=$1',[guardKey(ip,user)])}catch{}}
async function audit(eventType,username,req,detail=''){try{await pool.query('INSERT INTO cloud_audit(event_type,username,ip,detail,created_at) VALUES($1,$2,$3,$4,$5)',[eventType,username||'',clientIp(req),String(detail||'').slice(0,500),nowIso()])}catch{}}
async function applyRecoveryPassword(){
  if(!RECOVERY_PASSWORD)return;
  if(RECOVERY_PASSWORD.length<12){console.warn('AVISO: EXE_CLOUD_RECOVERY_PASSWORD ignorada: use pelo menos 12 caracteres.');return}
  const username=validId(ADMIN_USER,120);if(!username){console.warn('AVISO: recovery exige EXE_CLOUD_ADMIN_USER.');return}
  const u=await one(pool,'SELECT * FROM cloud_users WHERE username_ci=$1',[username.toLowerCase()]);if(!u){console.warn('AVISO: usuario de recovery nao encontrado.');return}
  await pool.query('UPDATE cloud_users SET password_hash=$1,active=TRUE,updated_at=$2 WHERE user_id=$3',[hashPassword(RECOVERY_PASSWORD),nowIso(),u.user_id]);
  await pool.query('DELETE FROM web_sessions WHERE user_id=$1',[u.user_id]);
  await pool.query('INSERT INTO cloud_audit(event_type,username,ip,detail,created_at) VALUES($1,$2,$3,$4,$5)',['recovery_password',u.username,'startup','Senha redefinida por variavel de emergencia. Remova EXE_CLOUD_RECOVERY_PASSWORD e faça novo deploy.',nowIso()]);
  console.warn('ATENCAO: senha de emergencia aplicada. Remova EXE_CLOUD_RECOVERY_PASSWORD do ambiente e faca novo deploy.');
}
async function securitySessions(session){
  const scope=isMaster(session)?'all':'own';
  const list=isMaster(session)?await rows(pool,'SELECT token_hash,created_at,expires_at,last_seen_at,device_label,user_id,username,role FROM web_sessions ORDER BY last_seen_at DESC LIMIT 100'):await rows(pool,'SELECT token_hash,created_at,expires_at,last_seen_at,device_label,user_id,username,role FROM web_sessions WHERE user_id=$1 ORDER BY last_seen_at DESC LIMIT 30',[session.userId]);
  return{ok:true,scope,sessions:list.map(x=>({sessionId:x.token_hash,current:x.token_hash===session.tokenHash,createdAt:x.created_at,expiresAt:x.expires_at,lastSeenAt:x.last_seen_at,device:x.device_label||'',userId:x.user_id||'',username:x.username||'',role:x.role||''}))};
}
async function securityStatus(session){
  const [activeSessions,activeUsers,failed24,blocked,latestAudit]=await Promise.all([
    countWhere('web_sessions','WHERE expires_at>NOW()::text'),countWhere('cloud_users','WHERE active=TRUE'),
    one(pool,"SELECT COUNT(*)::bigint AS n FROM cloud_audit WHERE event_type='login_fail' AND created_at >= (NOW() - INTERVAL '24 hours')::text"),
    one(pool,"SELECT COUNT(*)::bigint AS n FROM web_login_guard WHERE blocked_until IS NOT NULL AND blocked_until>NOW()::text"),
    rows(pool,'SELECT id,event_type,username,ip,detail,created_at FROM cloud_audit ORDER BY id DESC LIMIT 12')]);
  return{ok:true,version:VERSION,sessionHours:WEB_SESSION_HOURS,loginMaxAttempts:LOGIN_MAX_ATTEMPTS,loginBlockMinutes:LOGIN_BLOCK_MINUTES,activeSessions,activeUsers,failedLogins24h:Number(failed24?.n||0),blockedLogins:Number(blocked?.n||0),latestAudit,role:session.role};
}
async function opsStatus(){
  const t0=Date.now();await pool.query('SELECT 1');const dbLatencyMs=Date.now()-t0;const mem=process.memoryUsage();
  const [records,changes,installations]=await Promise.all([countWhere('entities','WHERE deleted=FALSE'),countWhere('changes'),countWhere('installations')]);
  return{ok:true,version:VERSION,uptimeSeconds:Math.round(process.uptime()),database:'postgresql',dbLatencyMs,memory:{rssMB:Math.round(mem.rss/1048576),heapUsedMB:Math.round(mem.heapUsed/1048576)},records,changes,installations,publicUrl:PUBLIC_URL||'',httpsRequired:REQUIRE_HTTPS,time:nowIso()};
}
async function buildLogicalBackup(){
  const [entities,changes,installations,users,auditRows,settings,secrets]=await Promise.all([
    rows(pool,'SELECT * FROM entities ORDER BY entity_type,entity_id'),rows(pool,'SELECT * FROM changes ORDER BY seq'),rows(pool,'SELECT * FROM installations ORDER BY installation_id'),
    rows(pool,'SELECT user_id,username,username_ci,password_hash,role,active,created_at,updated_at,last_login_at FROM cloud_users ORDER BY username_ci'),rows(pool,'SELECT * FROM cloud_audit ORDER BY id'),rows(pool,'SELECT * FROM cloud_settings ORDER BY setting_key'),rows(pool,'SELECT * FROM cloud_secrets ORDER BY secret_key')]);
  const base={meta:{product:'EXE PRO Cloudways',format:1,version:VERSION,exportedAt:nowIso(),warning:'Arquivo sensivel: contem hashes de senha e segredos criptografados. Guarde em local seguro.'},data:{entities,changes,installations,users,audit:auditRows,settings,secrets}};
  return{...base,checksum:crypto.createHash('sha256').update(JSON.stringify(base)).digest('hex')};
}
function validateLogicalBackup(b){
  if(!b||b.meta?.product!=='EXE PRO Cloudways'||Number(b.meta?.format)!==1||!b.data)return{ok:false,error:'Arquivo nao reconhecido como backup EXE PRO.'};
  const required=['entities','changes','installations','users','audit','settings','secrets'];for(const k of required)if(!Array.isArray(b.data[k]))return{ok:false,error:`Secao ausente ou invalida: ${k}`};
  const base={meta:b.meta,data:b.data},checksum=crypto.createHash('sha256').update(JSON.stringify(base)).digest('hex');if(b.checksum&&!safeEq(checksum,b.checksum))return{ok:false,error:'Checksum do backup nao confere.'};
  return{ok:true,version:b.meta.version||'',exportedAt:b.meta.exportedAt||'',counts:Object.fromEntries(required.map(k=>[k,b.data[k].length])),checksum};
}
async function testIntegration(provider){
  if(provider==='googlePlaces'){const key=await getSecret('googlePlaces');if(!key)return{status:400,body:{ok:false,error:'Google Places nao configurado.'}};try{const j=await fetchJson('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'content-type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id'},body:JSON.stringify({textQuery:'EXEKUTA Brasil',languageCode:'pt-BR',maxResultCount:1})},12000);return{status:200,body:{ok:true,provider,resultCount:(j.places||[]).length}}}catch(e){return{status:502,body:{ok:false,provider,error:e.message}}}}
  if(provider==='serper'){const key=await getSecret('serper');if(!key)return{status:400,body:{ok:false,error:'Serper nao configurado.'}};try{const j=await fetchJson('https://google.serper.dev/search',{method:'POST',headers:{'content-type':'application/json','X-API-KEY':key},body:JSON.stringify({q:'EXEKUTA',gl:'br',hl:'pt-br',num:1})},12000);return{status:200,body:{ok:true,provider,resultCount:(j.organic||[]).length}}}catch(e){return{status:502,body:{ok:false,provider,error:e.message}}}}
  return{status:400,body:{ok:false,error:'Integracao invalida.'}};
}


const server=http.createServer(async(req,res)=>{
  try{
    let url;try{url=new URL(req.url,`http://${req.headers.host||'localhost'}`)}catch{return json(res,400,{ok:false,error:'URL invalida.'})};if(httpsGate(req,res,url))return;
    if(req.method==='GET'&&url.pathname==='/'&&String(req.headers.host||'').split(':')[0].toLowerCase()!=='portal.exekuta.com.br')return serveWebFile(res,'index.html');
    if(req.method==='GET'&&(url.pathname==='/app'||url.pathname==='/app/'))return redirect(res,'/');
    if(req.method==='GET'&&['/manifest.webmanifest','/service-worker.js','/app-icon.svg'].includes(url.pathname))return serveWebFile(res,url.pathname.slice(1));
    const EXE_PRO_414_ROUTES=new Set(['/dashboard','/clientes','/sites-wordpress','/financeiro','/projetos','/seo','/configuracoes','/tarefas','/notificacoes','/whatsapp','/saude-core']);
    if(req.method==='GET'&&EXE_PRO_414_ROUTES.has(url.pathname))return serveWebFile(res,'index.html');
    if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,product:'EXE PRO Cloudways',version:VERSION,web:true,database:'postgresql',time:nowIso()});
    if(req.method==='GET'&&url.pathname==='/version')return json(res,200,{ok:true,product:'EXE PRO Cloudways',version:VERSION,publicUrl:PUBLIC_URL||'',httpsRequired:REQUIRE_HTTPS,database:'postgresql'});
    if(req.method==='GET'&&url.pathname==='/ready'){try{await pool.query('SELECT 1 AS ok');return json(res,200,{ok:true,ready:true,version:VERSION,database:'postgresql',time:nowIso()})}catch{return json(res,503,{ok:false,ready:false,version:VERSION,database:'error'})}}
    if(req.method==='GET'&&url.pathname.startsWith('/app/'))return serveWebFile(res,url.pathname.slice('/app/'.length)||'index.html');
    if(req.method==='GET'&&url.pathname==='/api/web/config'){const c=await countWhere('cloud_users');return json(res,200,{ok:true,version:VERSION,authMode:c>0?'user':(ALLOW_KEY_LOGIN?'key':'unconfigured'),publicUrl:PUBLIC_URL||'',httpsRequired:REQUIRE_HTTPS,database:'postgresql'})}
    if(req.method==='POST'&&url.pathname==='/api/web/login'){
      const body=await readBody(req),ip=clientIp(req);let identity={userId:'',username:'',role:''};const c=await countWhere('cloud_users');
      if(c>0){const username=validId(body.username,120);if(await loginBlocked(ip,username))return json(res,429,{ok:false,error:`Muitas tentativas. Aguarde ${LOGIN_BLOCK_MINUTES} minutos.`});const user=username?await one(pool,'SELECT * FROM cloud_users WHERE username_ci=$1',[username.toLowerCase()]):null;if(!user||!user.active||!verifyPassword(String(body.password||''),user.password_hash)){await recordLoginFail(ip,username);await audit('login_fail',username,req,'Senha ou usuario invalido');return json(res,401,{ok:false,error:'Usuario ou senha invalidos.'})}await clearLoginGuard(ip,username);identity={userId:user.user_id,username:user.username,role:user.role||'Super Admin'};await pool.query('UPDATE cloud_users SET last_login_at=$1,updated_at=$2 WHERE user_id=$3',[nowIso(),nowIso(),user.user_id]);await audit('login_ok',user.username,req,'Cloud Web')}
      else if(ALLOW_KEY_LOGIN){const key=String(body.key||'').trim();if(!safeEq(key,ACCESS_KEY))return json(res,401,{ok:false,error:'Chave Cloud invalida.'});identity={userId:'lab',username:'Cloud Lab',role:'Super Admin'}}else return json(res,503,{ok:false,error:'Cloud Web ainda nao possui usuario administrador configurado.'});
      const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex'),now=new Date(),expires=new Date(now.getTime()+WEB_SESSION_HOURS*3600000);await pool.query('INSERT INTO web_sessions(token_hash,csrf_token,created_at,expires_at,last_seen_at,device_label,user_id,username,role) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(token_hash) DO UPDATE SET csrf_token=EXCLUDED.csrf_token,expires_at=EXCLUDED.expires_at,last_seen_at=EXCLUDED.last_seen_at,device_label=EXCLUDED.device_label,user_id=EXCLUDED.user_id,username=EXCLUDED.username,role=EXCLUDED.role',[tokenHash(token),csrf,now.toISOString(),expires.toISOString(),now.toISOString(),validId(body.device||req.headers['user-agent']||'Cloud Web',120),identity.userId,identity.username,identity.role]);setWebCookie(req,res,token,WEB_SESSION_HOURS*3600);return json(res,200,{ok:true,csrf,expiresAt:expires.toISOString(),version:VERSION,user:{username:identity.username,role:identity.role}})
    }
    if(req.method==='GET'&&url.pathname==='/api/web/session'){const ss=await webAuth(req,res,false);if(!ss)return;return json(res,200,{ok:true,csrf:ss.csrf,expiresAt:ss.expiresAt,version:VERSION,user:{username:ss.username,role:ss.role}})}
    if(req.method==='POST'&&url.pathname==='/api/web/logout'){const ss=await webAuth(req,res,true);if(!ss)return;await audit('logout',ss.username,req,'Cloud Web');await pool.query('DELETE FROM web_sessions WHERE token_hash=$1',[ss.tokenHash]);setWebCookie(req,res,'',0);return json(res,200,{ok:true})}
    if(req.method==='GET'&&url.pathname==='/api/web/security/status'){const ss=await webAuth(req,res,false);if(!ss)return;return json(res,200,await securityStatus(ss))}
    if(req.method==='GET'&&url.pathname==='/api/web/security/sessions'){const ss=await webAuth(req,res,false);if(!ss)return;return json(res,200,await securitySessions(ss))}
    if(req.method==='POST'&&url.pathname==='/api/web/security/sessions/revoke'){const ss=await webAuth(req,res,true);if(!ss)return;const body=await readBody(req),sid=validId(body.sessionId,128);if(!sid)return json(res,400,{ok:false,error:'Sessao invalida.'});const target=await one(pool,'SELECT * FROM web_sessions WHERE token_hash=$1',[sid]);if(!target)return json(res,404,{ok:false,error:'Sessao nao encontrada.'});if(!isMaster(ss)&&target.user_id!==ss.userId)return json(res,403,{ok:false,error:'Voce so pode encerrar suas proprias sessoes.'});await pool.query('DELETE FROM web_sessions WHERE token_hash=$1',[sid]);await audit('session_revoke',ss.username,req,`Sessao encerrada: ${target.username||''} / ${target.device_label||''}`);if(sid===ss.tokenHash){setWebCookie(req,res,'',0);return json(res,200,{ok:true,currentRevoked:true})}return json(res,200,{ok:true,currentRevoked:false})}
    if(req.method==='POST'&&url.pathname==='/api/web/security/password'){const ss=await webAuth(req,res,true);if(!ss)return;const body=await readBody(req),current=String(body.currentPassword||''),next=String(body.newPassword||'');if(next.length<12)return json(res,400,{ok:false,error:'A nova senha deve ter pelo menos 12 caracteres.'});const u=await one(pool,'SELECT * FROM cloud_users WHERE user_id=$1',[ss.userId]);if(!u||!verifyPassword(current,u.password_hash))return json(res,401,{ok:false,error:'Senha atual incorreta.'});await pool.query('UPDATE cloud_users SET password_hash=$1,updated_at=$2 WHERE user_id=$3',[hashPassword(next),nowIso(),u.user_id]);await pool.query('DELETE FROM web_sessions WHERE user_id=$1 AND token_hash<>$2',[u.user_id,ss.tokenHash]);await audit('password_change',ss.username,req,'Senha alterada pelo proprio usuario; outras sessoes encerradas.');return json(res,200,{ok:true})}
    if(req.method==='GET'&&url.pathname==='/api/web/ops/status'){const ss=await webAuth(req,res,false);if(!ss)return;if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin.'});return json(res,200,await opsStatus())}
    if(req.method==='GET'&&url.pathname==='/api/web/backup/export'){const ss=await webAuth(req,res,false);if(!ss)return;if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin.'});const backup=await buildLogicalBackup();await audit('backup_export',ss.username,req,`Backup logico ${backup.checksum.slice(0,12)}`);return jsonDownload(res,`exe-pro-backup-${nowIso().slice(0,10)}.json`,backup)}
    if(req.method==='POST'&&url.pathname==='/api/web/backup/validate'){const ss=await webAuth(req,res,true);if(!ss)return;if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin.'});const out=validateLogicalBackup(await readBody(req));await audit('backup_validate',ss.username,req,out.ok?'Backup validado com sucesso':'Backup invalido');return json(res,out.ok?200:400,out)}

    if(req.method==='GET'&&url.pathname==='/api/web/summary'){const ss=await webAuth(req,res,false);if(!ss)return;return json(res,200,await webSummary())}
    if(req.method==='GET'&&url.pathname==='/api/web/entities'){const ss=await webAuth(req,res,false);if(!ss)return;const out=await webEntityList(url);return json(res,out.status,out.body)}
    if(req.method==='PATCH'&&url.pathname==='/api/web/entity'){const ss=await webAuth(req,res,true);if(!ss)return;const out=await webPatchWithSession(await readBody(req),ss);if(out.status<300)await audit('entity_update',ss.username,req,`${out.body?.row?.entityType||''}:${out.body?.row?.entityId||''}`);return json(res,out.status,out.body)}
    if(req.method==='POST'&&url.pathname==='/api/web/entity'){const ss=await webAuth(req,res,true);if(!ss)return;const out=await webCreate(await readBody(req),ss);if(out.status<300)await audit('entity_create',ss.username,req,`${out.body?.row?.entityType||''}:${out.body?.row?.entityId||''}`);return json(res,out.status,out.body)}
    if(req.method==='GET'&&url.pathname==='/api/web/branding/public')return json(res,200,{ok:true,branding:await getBranding()});
    if(req.method==='GET'&&url.pathname==='/api/web/branding'){const ss=await webAuth(req,res,false);if(!ss)return;return json(res,200,{ok:true,branding:await getBranding()})}
    if(req.method==='PATCH'&&url.pathname==='/api/web/branding'){const ss=await webAuth(req,res,true);if(!ss)return;if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin pode alterar a identidade.'});const body=await readBody(req),b=await normalizeBranding(body.branding||body,{touch:true,user:ss.username});await saveSetting('branding',b,ss.username);await audit('branding_update',ss.username,req,'Identidade Cloud atualizada');return json(res,200,{ok:true,branding:b})}
    if(req.method==='GET'&&url.pathname==='/api/web/snapshot'){const ss=await webAuth(req,res,false);if(!ss)return;return json(res,200,await webSnapshot())}
    if(req.method==='GET'&&url.pathname==='/api/web/activity'){const ss=await webAuth(req,res,false);if(!ss)return;return json(res,200,await webActivity(url.searchParams.get('limit')||120))}
    if(req.method==='GET'&&url.pathname==='/api/web/users'){const ss=await webAuth(req,res,false);if(!ss)return;const out=await webUsersList(ss);return json(res,out.status,out.body)}
    if(req.method==='POST'&&url.pathname==='/api/web/users'){const ss=await webAuth(req,res,true);if(!ss)return;const out=await webUserCreate(await readBody(req),ss);if(out.status<300)await audit('user_create',ss.username,req,'Usuario Cloud criado');return json(res,out.status,out.body)}
    if(req.method==='PATCH'&&url.pathname==='/api/web/users'){const ss=await webAuth(req,res,true);if(!ss)return;const out=await webUserPatch(await readBody(req),ss);if(out.status<300)await audit('user_update',ss.username,req,'Usuario Cloud atualizado');return json(res,out.status,out.body)}
    if(req.method==='GET'&&url.pathname==='/api/web/integrations'){const ss=await webAuth(req,res,false);if(!ss)return;if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin.'});return json(res,200,{ok:true,googlePlacesConfigured:!!await getSecret('googlePlaces'),serperConfigured:!!await getSecret('serper')})}
    if(req.method==='PATCH'&&url.pathname==='/api/web/integrations'){const ss=await webAuth(req,res,true);if(!ss)return;if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin.'});const body=await readBody(req);if(String(body.googlePlaces||'').trim())await setSecret('googlePlaces',body.googlePlaces);if(String(body.serper||'').trim())await setSecret('serper',body.serper);await audit('integrations_update',ss.username,req,'Integracoes Cloud atualizadas');return json(res,200,{ok:true,googlePlacesConfigured:!!await getSecret('googlePlaces'),serperConfigured:!!await getSecret('serper')})}
    if(req.method==='POST'&&url.pathname==='/api/web/integrations/test'){const ss=await webAuth(req,res,true);if(!ss)return;if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin.'});const body=await readBody(req),out=await testIntegration(String(body.provider||''));await audit('integration_test',ss.username,req,`${body.provider||''}: ${out.body.ok?'OK':'FALHA'}`);return json(res,out.status,out.body)}
    if(req.method==='GET'&&url.pathname==='/api/web/place-photo'){const ss=await webAuth(req,res,false);if(!ss)return;const name=String(url.searchParams.get('name')||'').trim();if(!/^places\/[^/]+\/photos\/[^/]+$/.test(name))return json(res,400,{ok:false,error:'Foto do Google Places invalida.'});const key=await getSecret('googlePlaces');if(!key)return json(res,503,{ok:false,error:'Google Places nao configurado na Cloud.'});const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const endpoint='https://places.googleapis.com/v1/'+name+'/media?maxWidthPx=1200&skipHttpRedirect=false&key='+encodeURIComponent(key),pr=await fetch(endpoint,{signal:controller.signal,redirect:'follow'});if(!pr.ok)return json(res,pr.status,{ok:false,error:'Nao foi possivel carregar a foto do Google Places.'});const buf=Buffer.from(await pr.arrayBuffer());res.writeHead(200,{'content-type':pr.headers.get('content-type')||'image/jpeg','content-length':buf.length,'cache-control':'private, max-age=86400','x-content-type-options':'nosniff'});return res.end(buf)}catch(e){return json(res,502,{ok:false,error:'Falha ao carregar foto do Google Places.'})}finally{clearTimeout(timer)}}
    if(req.method==='POST'&&url.pathname==='/api/web/prospect'){const ss=await webAuth(req,res,true);if(!ss)return;if(roleRank(ss.role)<=1)return json(res,403,{ok:false,error:'Perfil somente leitura.'});const out=await webProspect(await readBody(req));return json(res,out.status,out.body)}


    if(req.method==='GET'&&url.pathname==='/api/web/notifications'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      return json(res,200,await notificationView(url.searchParams.get('limit')||250));
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/notification-config'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin pode configurar canais e regua de cobranca.'});
      const body=await readBody(req),current=await getNotifyConfig();
      const safe={...body};delete safe.whatsappAccessToken;delete safe.telegramBotToken;
      const next=normalizeNotifyConfig({...current,...safe});
      if(String(body.whatsappAccessToken||'').trim())await setSecret('whatsappAccessToken',body.whatsappAccessToken);
      if(String(body.telegramBotToken||'').trim())await setSecret('telegramBotToken',body.telegramBotToken);
      await saveSetting('notification_config',next,ss.username);
      await audit('notification_config_update',ss.username,req,'Canais e regua de cobranca atualizados');
      return json(res,200,await notificationView(250));
    }
    if(req.method==='POST'&&url.pathname==='/api/web/notifications/plan'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para planejar cobrancas.'});
      const out=await notificationPlan();
      await audit('notification_plan',ss.username,req,'Planejamento de notificacoes');
      return json(res,200,{ok:true,...out});
    }
    if(req.method==='POST'&&url.pathname==='/api/web/notifications/send'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para enviar cobrancas.'});
      const out=await notificationSend(await readBody(req));
      await audit('notification_send',ss.username,req,'Envio manual de notificacoes');
      return json(res,200,out);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/notifications/cancel'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para cancelar notificacoes.'});
      const body=await readBody(req),id=String(body.notificationId||'').trim();
      if(!id)return json(res,400,{ok:false,error:'Informe a notificacao.'});
      const q=await pool.query("UPDATE notification_outbox SET status='Cancelado',updated_at=$1 WHERE notification_id=$2 AND status IN ('Pendente','Falhou')",[nowIso(),id]);
      return json(res,200,{ok:true,cancelled:q.rowCount});
    }
    if(req.method==='POST'&&url.pathname==='/api/web/telegram/sync'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para vincular Telegram.'});
      const out=await syncTelegramContacts();
      await audit('telegram_sync',ss.username,req,'Vinculos Telegram atualizados: '+out.linked);
      return json(res,200,out);
    }


    if(req.method==='POST'&&url.pathname==='/api/web/entity/delete'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      const out=await webDeleteEntity(await readBody(req),ss);
      if(out.status<400)await audit('entity_delete',ss.username,req,'Exclusao Cloud sincronizada');
      return json(res,out.status,out.body);
    }

    if(req.method==='GET'&&url.pathname==='/downloads/exe-pro-connector-v1.4.0.zip'){
      try{
        const file=require('node:fs').readFileSync(require('node:path').join(__dirname,'web','downloads','exe-pro-connector-v1.4.0.zip'));
        res.writeHead(200,{'content-type':'application/zip','content-length':file.length,'content-disposition':'attachment; filename="EXE_PRO_Connector_WordPress_v1.4.0.zip"','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'});
        return res.end(file);
      }catch(e){return json(res,404,{ok:false,error:'Pacote do plugin indisponivel. Rode o build novamente.'})}
    }
    if(req.method==='GET'&&url.pathname==='/downloads/exe-pro-connector-v1.1.0.zip'){
      try{
        const file=require('node:fs').readFileSync(require('node:path').join(__dirname,'web','downloads','exe-pro-connector-v1.1.0.zip'));
        res.writeHead(200,{'content-type':'application/zip','content-length':file.length,'content-disposition':'attachment; filename="EXE_PRO_Connector_WordPress_v1.1.0.zip"','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'});
        return res.end(file);
      }catch{return json(res,404,{ok:false,error:'Plugin WordPress 1.1 nao encontrado.'})}
    }
    if(req.method==='GET'&&url.pathname==='/downloads/exe-pro-connector-v1.0.0.zip'){
      try{
        const file=require('node:fs').readFileSync(require('node:path').join(__dirname,'web','downloads','exe-pro-connector-v1.0.0.zip'));
        res.writeHead(200,{'content-type':'application/zip','content-length':file.length,'content-disposition':'attachment; filename="EXE_PRO_Connector_WordPress_v1.0.0.zip"','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'});
        return res.end(file);
      }catch{return json(res,404,{ok:false,error:'Plugin WordPress nao encontrado.'})}
    }

    if(req.method==='GET'&&url.pathname==='/api/web/wordpress-control'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      if(roleRank(ss.role)<2)return json(res,403,{ok:false,error:'Perfil sem acesso ao controle WordPress.'});
      return json(res,200,await wpCtrlView());
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/wordpress-control/config'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin pode configurar a automacao WordPress.'});
      const body=await readBody(req),next=wpCtrlConfigNormalize({...await wpCtrlGetConfig(),...body});
      await saveSetting('wordpress_control_config',next,ss.username);
      await audit('wordpress_control_config',ss.username,req,'Configuracao WordPress atualizada');
      return json(res,200,await wpCtrlView());
    }
    if(req.method==='POST'&&url.pathname==='/api/web/wordpress-sites'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode conectar sites WordPress.'});
      const out=await wpCtrlCreate(await readBody(req),ss);
      if(out.status<400)await audit('wordpress_site_create',ss.username,req,'Site WordPress conectado');
      return json(res,out.status,out.body);
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/wordpress-sites'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode editar sites WordPress.'});
      const out=await wpCtrlPatch(await readBody(req),ss);
      if(out.status<400)await audit('wordpress_site_update',ss.username,req,'Site WordPress atualizado');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/wordpress-sites/remove'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode remover sites WordPress.'});
      const out=await wpCtrlRemove(await readBody(req));
      if(out.status<400)await audit('wordpress_site_remove',ss.username,req,'Conexao WordPress removida');
      return json(res,out.status,out.body);
    }
    if(req.method==='GET'&&url.pathname==='/api/web/wordpress-sites/popup'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      const id=validId(new URL(req.url,'https://x').searchParams.get('siteId'),180);
      if(!id)return json(res,400,{ok:false,error:'Site invalido.'});
      const site=await wpCtrlOne(id);if(!site)return json(res,404,{ok:false,error:'Site WordPress nao encontrado.'});
      try{return json(res,200,{ok:true,popup:(await wpCtrlPopupRemote(site,'GET',null)).popup||{}})}
      catch(e){return json(res,502,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='POST'&&url.pathname==='/api/web/wordpress-sites/popup'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode controlar o pop-up do site.'});
      const body=await readBody(req),id=validId(body.siteId,180);
      if(!id)return json(res,400,{ok:false,error:'Site invalido.'});
      const site=await wpCtrlOne(id);if(!site)return json(res,404,{ok:false,error:'Site WordPress nao encontrado.'});
      try{
        const out=await wpCtrlPopupRemote(site,'POST',wpCtrlPopupSanitize(body.popup));
        await audit('wordpress_popup_update',ss.username,req,'Pop-up '+site.site_url);
        return json(res,200,out);
      }catch(e){return json(res,502,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='POST'&&url.pathname==='/api/web/wordpress-sites/action'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode controlar sites WordPress.'});
      const body=await readBody(req),id=validId(body.siteId,180),action=String(body.action||'');
      if(!id||!['status','suspend','resume'].includes(action))return json(res,400,{ok:false,error:'Acao WordPress invalida.'});
      const site=await wpCtrlOne(id);if(!site)return json(res,404,{ok:false,error:'Site WordPress nao encontrado.'});
      try{
        if(action==='status')await wpCtrlStatus(site);else await wpCtrlAction(site,action,'manual',String(body.reason||'Acao manual pelo EXE PRO'));
        await audit('wordpress_site_'+action,ss.username,req,'WordPress '+action+' '+site.site_url);
        return json(res,200,await wpCtrlView());
      }catch(e){return json(res,502,{ok:false,error:String(e.message||e),view:await wpCtrlView()})}
    }
    if(req.method==='POST'&&url.pathname==='/api/web/wordpress-control/evaluate'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode avaliar a automacao WordPress.'});
      const result=await wpCtrlEvaluate(true);
      await audit('wordpress_control_evaluate',ss.username,req,'Avaliacao WordPress: '+JSON.stringify({suspended:result.suspended,resumed:result.resumed,failed:result.failed}));
      return json(res,200,{...result,view:await wpCtrlView()});
    }


    if(req.method==='GET'&&((url.pathname==='/portal')||(url.pathname==='/portal/')||(url.pathname==='/portal/index.html')||((String(req.headers.host||'').split(':')[0].toLowerCase()==='portal.exekuta.com.br')&&url.pathname==='/'))){
      try{
        const file=require('node:fs').readFileSync(require('node:path').join(__dirname,'web','portal.html'));
        res.writeHead(200,portalResponseHeaders(file.length, REQUIRE_HTTPS));
        return res.end(file);
      }catch{return json(res,404,{ok:false,error:'Portal do Cliente nao encontrado.'})}
    }
    if(req.method==='POST'&&url.pathname==='/api/portal/login'){
      return portalLogin(req,res,await readBody(req));
    }
    if(req.method==='POST'&&url.pathname==='/api/portal/logout'){
      const ps=await portalAuth(req,res,true);if(!ps)return;
      return portalLogout(req,res);
    }
    if(req.method==='GET'&&url.pathname==='/api/portal/session'){
      const ps=await portalAuth(req,res,false);if(!ps)return;
      return json(res,200,{ok:true,csrf:ps.csrf,user:{username:ps.username,role:ps.role,leadId:ps.leadId}});
    }
    if(req.method==='GET'&&url.pathname==='/api/portal/dashboard'){
      const ps=await portalAuth(req,res,false);if(!ps)return;
      try{return json(res,200,await portalDashboard(ps))}
      catch(e){return json(res,500,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='GET'&&url.pathname==='/api/web/client-portal/users'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode gerenciar acessos do Portal do Cliente.'});
      return json(res,200,await portalAdminList());
    }
    if(req.method==='POST'&&url.pathname==='/api/web/client-portal/users'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode criar acessos do Portal do Cliente.'});
      const out=await portalAdminCreate(await readBody(req),ss);
      if(out.status<400)await audit('client_portal_user_create',ss.username,req,'Acesso do Portal do Cliente criado');
      return json(res,out.status,out.body);
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/client-portal/users'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode editar acessos do Portal do Cliente.'});
      const out=await portalAdminPatch(await readBody(req));
      if(out.status<400)await audit('client_portal_user_update',ss.username,req,'Acesso do Portal do Cliente atualizado');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/client-portal/users/remove'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode remover acessos do Portal do Cliente.'});
      const out=await portalAdminRemove(await readBody(req));
      if(out.status<400)await audit('client_portal_user_remove',ss.username,req,'Acesso do Portal do Cliente removido');
      return json(res,out.status,out.body);
    }


    if(req.method==='GET'&&url.pathname==='/api/portal/operations'){
      const ps=await portalAuth(req,res,false);if(!ps)return;
      return json(res,200,await portalOperations(ps));
    }
    if(req.method==='POST'&&url.pathname==='/api/portal/tickets'){
      const ps=await portalAuth(req,res,true);if(!ps)return;
      try{
        const out=await portalTicketCreate(ps,await readBody(req));
        return json(res,200,{ok:true,...out,operations:await portalOperations(ps)});
      }catch(e){return json(res,e.statusCode||400,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='POST'&&url.pathname==='/api/portal/tickets/message'){
      const ps=await portalAuth(req,res,true);if(!ps)return;
      try{
        const body=await readBody(req),ticketId=validId(body.ticketId,180);
        if(!ticketId)return json(res,400,{ok:false,error:'Chamado invalido.'});
        await portalTicketAddMessage({ticketId,leadId:ps.leadId,authorType:'Cliente',authorId:ps.userId,authorName:ps.username,body:body.message});
        return json(res,200,{ok:true,operations:await portalOperations(ps)});
      }catch(e){return json(res,e.statusCode||400,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='POST'&&url.pathname==='/api/portal/files/upload'){
      const ps=await portalAuth(req,res,true);if(!ps)return;
      try{
        const body=await portalReadJsonLarge(req),upload=portalParseUpload(body);
        const ticketId=body.ticketId?validId(body.ticketId,180):null;
        if(ticketId){
          const ticket=await one(pool,'SELECT ticket_id FROM portal_tickets WHERE ticket_id=$1 AND lead_id=$2',[ticketId,ps.leadId]);
          if(!ticket)return json(res,404,{ok:false,error:'Chamado nao encontrado para este cliente.'});
        }
        const stored=await portalStoreFile({leadId:ps.leadId,ticketId,category:body.category||'Arquivo',visibility:'Cliente',upload,authorType:'Cliente',authorId:ps.userId,authorName:ps.username});
        return json(res,200,{ok:true,...stored,operations:await portalOperations(ps)});
      }catch(e){return json(res,e.statusCode||400,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='GET'&&url.pathname.startsWith('/api/portal/files/')&&url.pathname.endsWith('/download')){
      const ps=await portalAuth(req,res,false);if(!ps)return;
      const parts=url.pathname.split('/'),fileId=validId(parts[4],180);
      if(!fileId)return json(res,400,{ok:false,error:'Arquivo invalido.'});
      const row=await portalFileRow(fileId);
      if(!row||row.lead_id!==ps.leadId||row.visibility!=='Cliente')return json(res,404,{ok:false,error:'Arquivo nao encontrado.'});
      return portalSendFile(res,row);
    }
    if(req.method==='POST'&&url.pathname==='/api/portal/payment-proofs'){
      const ps=await portalAuth(req,res,true);if(!ps)return;
      try{
        const out=await portalProofCreate(ps,await portalReadJsonLarge(req));
        return json(res,200,{ok:true,...out,operations:await portalOperations(ps)});
      }catch(e){return json(res,e.statusCode||400,{ok:false,error:String(e.message||e)})}
    }

    if(req.method==='GET'&&url.pathname==='/api/web/client-portal/operations'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para atender o Portal do Cliente.'});
      const leadId=url.searchParams.get('leadId')?validId(url.searchParams.get('leadId'),180):'';
      return json(res,200,await portalAdminOperations(leadId));
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/client-portal/tickets'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para atualizar chamados.'});
      try{
        await portalTicketAdminPatch(await readBody(req),ss.username);
        return json(res,200,{ok:true,operations:await portalAdminOperations('')});
      }catch(e){return json(res,e.statusCode||400,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='POST'&&url.pathname==='/api/web/client-portal/files/upload'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para enviar arquivos ao cliente.'});
      try{
        const body=await portalReadJsonLarge(req),leadId=validId(body.leadId,180),upload=portalParseUpload(body);
        if(!leadId)return json(res,400,{ok:false,error:'Cliente invalido.'});
        const lead=await one(pool,"SELECT entity_id FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
        if(!lead)return json(res,404,{ok:false,error:'Cliente nao encontrado.'});
        const ticketId=body.ticketId?validId(body.ticketId,180):null;
        if(ticketId){
          const ticket=await one(pool,'SELECT ticket_id FROM portal_tickets WHERE ticket_id=$1 AND lead_id=$2',[ticketId,leadId]);
          if(!ticket)return json(res,404,{ok:false,error:'Chamado nao encontrado para este cliente.'});
        }
        const stored=await portalStoreFile({leadId,ticketId,category:body.category||'Arquivo',visibility:'Cliente',upload,authorType:'Equipe',authorId:ss.username,authorName:ss.username});
        return json(res,200,{ok:true,...stored,operations:await portalAdminOperations('')});
      }catch(e){return json(res,e.statusCode||400,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='GET'&&url.pathname.startsWith('/api/web/client-portal/files/')&&url.pathname.endsWith('/download')){
      const ss=await webAuth(req,res,false);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para baixar arquivos do Portal.'});
      const parts=url.pathname.split('/'),fileId=validId(parts[5],180);
      if(!fileId)return json(res,400,{ok:false,error:'Arquivo invalido.'});
      const row=await portalFileRow(fileId);
      if(!row)return json(res,404,{ok:false,error:'Arquivo nao encontrado.'});
      return portalSendFile(res,row);
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/client-portal/payment-proofs'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para conferir comprovantes.'});
      try{
        await portalProofAdminPatch(await readBody(req),ss.username);
        return json(res,200,{ok:true,operations:await portalAdminOperations('')});
      }catch(e){return json(res,e.statusCode||400,{ok:false,error:String(e.message||e)})}
    }


    if(req.method==='GET'&&url.pathname==='/api/web/seo-reports'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para relatorios SEO.'});
      const leadId=url.searchParams.get('leadId')?validId(url.searchParams.get('leadId'),180):'';
      const reportId=url.searchParams.get('reportId')?validId(url.searchParams.get('reportId'),180):'';
      if(reportId){
        const report=await seoReportOne(reportId);
        if(!report)return json(res,404,{ok:false,error:'Relatorio SEO nao encontrado.'});
        return json(res,200,{ok:true,report,pageSpeed:await seoPageSpeedLatest(report.leadId),config:await seoConfigView()});
      }
      return json(res,200,{ok:true,reports:await seoReportsList(leadId),config:await seoConfigView()});
    }
    if(req.method==='POST'&&url.pathname==='/api/web/seo-reports'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para criar relatorios SEO.'});
      const out=await seoReportSave(await readBody(req),ss.username);
      if(out.status<400)await audit('seo_report_create',ss.username,req,'Relatorio SEO criado/atualizado');
      return json(res,out.status,out.body);
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/seo-reports'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para editar relatorios SEO.'});
      const out=await seoReportSave(await readBody(req),ss.username);
      if(out.status<400)await audit('seo_report_update',ss.username,req,'Relatorio SEO atualizado');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/seo-reports/remove'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode excluir relatorios SEO.'});
      const out=await seoReportRemove(await readBody(req));
      if(out.status<400)await audit('seo_report_remove',ss.username,req,'Relatorio SEO removido');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/seo/pagespeed'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para testar PageSpeed.'});
      try{
        const out=await seoPageSpeedRun(await readBody(req),ss.username);
        await audit('seo_pagespeed_run',ss.username,req,'PageSpeed executado');
        return json(res,200,out);
      }catch(e){return json(res,e.statusCode||502,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/seo/config'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin pode configurar a chave PageSpeed.'});
      const body=await readBody(req),key=String(body.pageSpeedApiKey||'').trim();
      if(key)await setSecret('googlePageSpeedApiKey',key);
      if(body.clearPageSpeedApiKey===true)await pool.query('DELETE FROM cloud_secrets WHERE secret_key=$1',['googlePageSpeedApiKey']);
      await audit('seo_config_update',ss.username,req,'Configuracao SEO/PageSpeed atualizada');
      return json(res,200,await seoConfigView());
    }

    if(req.method==='GET'&&url.pathname==='/api/portal/seo-reports'){
      const ps=await portalAuth(req,res,false);if(!ps)return;
      return json(res,200,await seoPortalReports(ps));
    }


    if(req.method==='GET'&&url.pathname==='/api/web/client-portal/documents'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para Propostas e Contratos do Portal.'});
      const leadId=url.searchParams.get('leadId')?validId(url.searchParams.get('leadId'),180):'';
      return json(res,200,{ok:true,documents:await portalDocAdminCandidates(leadId)});
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/client-portal/documents/publish'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para publicar documentos no Portal.'});
      const out=await portalDocPublish(await readBody(req),ss.username);
      if(out.status<400)await audit('portal_document_publish',ss.username,req,'Publicacao de proposta/contrato no Portal');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/client-portal/documents/reopen'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para reenviar documentos ao Portal.'});
      const out=await portalDocAdminDecisionReset(await readBody(req),ss.username);
      if(out.status<400)await audit('portal_document_reopen',ss.username,req,'Documento reenviado para nova decisao');
      return json(res,out.status,out.body);
    }

    if(req.method==='GET'&&url.pathname==='/api/portal/documents'){
      const ps=await portalAuth(req,res,false);if(!ps)return;
      return json(res,200,await portalDocsForClient(ps));
    }
    if(req.method==='POST'&&url.pathname==='/api/portal/documents/decision'){
      const ps=await portalAuth(req,res,true);if(!ps)return;
      try{
        const out=await portalDocDecision(req,ps,await readBody(req));
        return json(res,200,out);
      }catch(e){return json(res,e.statusCode||400,{ok:false,error:String(e.message||e)})}
    }


    if(req.method==='GET'&&url.pathname==='/api/web/billing-recurring'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para Financeiro Recorrente.'});
      const leadId=url.searchParams.get('leadId')?validId(url.searchParams.get('leadId'),180):'';
      return json(res,200,await billingView(leadId));
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/billing-recurring/profile'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para configurar recorrencia.'});
      const out=await billingSaveProfile(await readBody(req),ss.username);
      if(out.status<400)await audit('billing_profile_update',ss.username,req,'Perfil financeiro recorrente atualizado');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/billing-recurring/generate'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para gerar cobrancas recorrentes.'});
      try{
        const out=await billingGenerate(await readBody(req),ss.username,false);
        await audit('billing_generate',ss.username,req,'Geracao recorrente '+out.period+': '+out.created+' cobranca(s)');
        return json(res,200,{...out,view:await billingView('')});
      }catch(e){return json(res,e.statusCode||400,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='POST'&&url.pathname==='/api/web/billing-recurring/payment'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para registrar pagamento.'});
      const out=await billingRecordPayment(await readBody(req),ss.username);
      if(out.status<400)await audit('billing_payment_add',ss.username,req,'Pagamento recorrente registrado');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/billing-recurring/payment/remove'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode excluir pagamentos.'});
      const out=await billingRemovePayment(await readBody(req),ss.username);
      if(out.status<400)await audit('billing_payment_remove',ss.username,req,'Pagamento recorrente removido');
      return json(res,out.status,out.body);
    }

    if(req.method==='GET'&&url.pathname==='/api/portal/billing'){
      const ps=await portalAuth(req,res,false);if(!ps)return;
      return json(res,200,await billingPortalView(ps));
    }


    if(req.method==='GET'&&url.pathname==='/api/web/core-status'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para diagnostico do Core.'});
      return json(res,200,await coreStatus());
    }
    if(req.method==='POST'&&url.pathname==='/api/web/core-jobs/run'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode executar jobs do Core.'});
      const body=await readBody(req),jobKey=String(body.jobKey||'').trim();
      if(!['notifications','wordpress','billing'].includes(jobKey))return json(res,400,{ok:false,error:'Job do Core invalido.'});
      try{
        const ttl=jobKey==='billing'?20*60*1000:14*60*1000;
        const out=await coreRunScheduled(jobKey,ttl,true,ss.username);
        await audit('core_job_run',ss.username,req,'Execucao manual do job '+jobKey);
        return json(res,200,{ok:true,...out,status:await coreStatus()});
      }catch(e){return json(res,500,{ok:false,error:String(e.message||e),status:await coreStatus()})}
    }
    if(req.method==='POST'&&url.pathname==='/api/web/core-cleanup'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin pode executar limpeza do Core.'});
      const result=await coreCleanup(ss.username);
      await coreEvent('info','maintenance','Limpeza de Core executada',result);
      await audit('core_cleanup',ss.username,req,'Limpeza de sessoes expiradas e historico tecnico antigo');
      return json(res,200,{...result,status:await coreStatus()});
    }
    if(req.method==='GET'&&url.pathname==='/api/web/core-diagnostics'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para diagnostico do Core.'});
      const data=await coreStatus();
      if(url.searchParams.get('download')==='1'){
        const body=Buffer.from(JSON.stringify(data,null,2),'utf8');
        res.writeHead(200,{
          'content-type':'application/json; charset=utf-8',
          'content-length':body.length,
          'content-disposition':'attachment; filename="EXE_PRO_Core_Diagnostics_3.9.1.json"',
          'cache-control':'no-store',
          'x-content-type-options':'nosniff'
        });
        return res.end(body);
      }
      return json(res,200,data);
    }


    if(req.method==='GET'&&url.pathname==='/api/web/tasks'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      if(roleRank(ss.role)<2)return json(res,403,{ok:false,error:'Perfil sem acesso a Tarefas e SLA.'});
      const leadId=url.searchParams.get('leadId')?validId(url.searchParams.get('leadId'),180):'';
      return json(res,200,await task391View(leadId));
    }
    if(req.method==='POST'&&url.pathname==='/api/web/tasks'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para criar tarefas.'});
      const out=await task391Save(await readBody(req),ss.username);
      if(out.status<400)await audit('task_create',ss.username,req,'Tarefa criada');
      return json(res,out.status,out.body);
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/tasks'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para editar tarefas.'});
      const out=await task391Save(await readBody(req),ss.username);
      if(out.status<400)await audit('task_update',ss.username,req,'Tarefa atualizada');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/tasks/remove'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode excluir tarefas.'});
      const out=await task391Remove(await readBody(req));
      if(out.status<400)await audit('task_remove',ss.username,req,'Tarefa removida');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/tasks/checklist'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para alterar checklist.'});
      const out=await task391ReplaceChecklist(await readBody(req));
      if(out.status<400)await audit('task_checklist_update',ss.username,req,'Checklist de tarefa atualizado');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/tasks/comment'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<2)return json(res,403,{ok:false,error:'Perfil sem permissao para comentar em tarefas.'});
      try{
        const body=await readBody(req);
        await task391Comment({taskId:body.taskId,authorType:'Equipe',authorId:ss.userId||ss.username,authorName:ss.username,body:body.body,portalVisible:!!body.portalVisible});
        await audit('task_comment',ss.username,req,'Comentario em tarefa');
        return json(res,200,{ok:true,view:await task391View('')});
      }catch(e){return json(res,400,{ok:false,error:String(e.message||e)})}
    }
    if(req.method==='POST'&&url.pathname==='/api/web/tasks/time'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<2)return json(res,403,{ok:false,error:'Perfil sem permissao para registrar tempo.'});
      const out=await task391Time(await readBody(req),ss.username);
      if(out.status<400)await audit('task_time_add',ss.username,req,'Tempo registrado em tarefa');
      return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/web/tasks/from-ticket'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissao para criar tarefa a partir de chamado.'});
      const out=await task391FromTicket(await readBody(req),ss.username);
      if(out.status<400)await audit('task_from_ticket',ss.username,req,'Tarefa criada a partir de chamado');
      return json(res,out.status,out.body);
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/task-sla-config'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode configurar SLA.'});
      const out=await task391SaveConfig(await readBody(req),ss.username);
      await audit('task_sla_config',ss.username,req,'Configuracao de SLA atualizada');
      return json(res,200,out);
    }

    if(req.method==='POST'&&url.pathname==='/api/portal/prospect'){
      const ps=await portalAuth(req,res,true);if(!ps)return;
      if(String(ps.role||'').toLowerCase()!=='proprietario')return json(res,403,{ok:false,error:'Somente o perfil Proprietario do portal pode prospectar.'});
      const out=await webProspect(await readBody(req));return json(res,out.status,out.body);
    }
    if(req.method==='POST'&&url.pathname==='/api/portal/prospect/save'){
      const ps=await portalAuth(req,res,true);if(!ps)return;
      const out=await portalProspectSave(await readBody(req),ps);return json(res,out.status,out.body);
    }
    if(req.method==='GET'&&url.pathname==='/api/portal/place-photo'){
      const ps=await portalAuth(req,res,false);if(!ps)return;
      const name=String(url.searchParams.get('name')||'').trim();
      if(!/^places\/[^/]+\/photos\/[^/]+$/.test(name))return json(res,400,{ok:false,error:'Foto do Google Places invalida.'});
      const key=await getSecret('googlePlaces');
      if(!key)return json(res,503,{ok:false,error:'Google Places nao configurado na Cloud.'});
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
      try{
        const endpoint='https://places.googleapis.com/v1/'+name+'/media?maxWidthPx=1200&skipHttpRedirect=false&key='+encodeURIComponent(key),pr=await fetch(endpoint,{signal:controller.signal,redirect:'follow'});
        if(!pr.ok)return json(res,pr.status,{ok:false,error:'Nao foi possivel carregar a foto do Google Places.'});
        const buf=Buffer.from(await pr.arrayBuffer());
        res.writeHead(200,{'content-type':pr.headers.get('content-type')||'image/jpeg','content-length':buf.length,'cache-control':'private, max-age=86400','x-content-type-options':'nosniff'});
        return res.end(buf)
      }catch(e){
        return json(res,502,{ok:false,error:'Falha ao carregar foto do Google Places.'})
      }finally{clearTimeout(timer)}
    }
    if(req.method==='GET'&&url.pathname==='/api/portal/tasks'){
      const ps=await portalAuth(req,res,false);if(!ps)return;
      return json(res,200,await task391PortalView(ps));
    }
    if(req.method==='POST'&&url.pathname==='/api/portal/tasks/comment'){
      const ps=await portalAuth(req,res,true);if(!ps)return;
      try{
        const body=await readBody(req);
        await task391Comment({taskId:body.taskId,leadId:ps.leadId,authorType:'Cliente',authorId:ps.userId,authorName:ps.username,body:body.body,portalVisible:true});
        return json(res,200,{ok:true,view:await task391PortalView(ps)});
      }catch(e){return json(res,400,{ok:false,error:String(e.message||e)})}
    }


    if(req.method==='GET'&&url.pathname==='/api/whatsapp/webhook')return whatsapp420WebhookVerify(url,res);
    if(req.method==='POST'&&url.pathname==='/api/whatsapp/webhook')return whatsapp420WebhookReceive(req,res);
    if(req.method==='GET'&&url.pathname==='/api/web/whatsapp/config'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      return json(res,200,{ok:true,config:await whatsapp420PublicConfig()});
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/whatsapp/config'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin pode configurar o WhatsApp Business.'});
      const config=await whatsapp420ConfigUpdate(await readBody(req),ss.username);
      await audit('whatsapp_business_config_update',ss.username,req,'Configuração oficial do WhatsApp Business atualizada');
      return json(res,200,{ok:true,config});
    }
    if(req.method==='GET'&&url.pathname==='/api/web/whatsapp/conversations'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      return json(res,200,await whatsapp420View(url));
    }
    if(req.method==='POST'&&url.pathname==='/api/web/whatsapp/conversations'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissão para abrir conversas.'});
      const conversation=await whatsapp420CreateConversation(await readBody(req));
      await audit('whatsapp_business_conversation_create',ss.username,req,'Conversa criada: '+conversation.conversationId);
      return json(res,200,{ok:true,conversation});
    }
    if(req.method==='POST'&&url.pathname==='/api/web/whatsapp/messages'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissão para enviar mensagens.'});
      const out=await whatsapp420SendText(await readBody(req),ss.username);
      await audit('whatsapp_business_message_send',ss.username,req,'Mensagem enviada: '+out.providerMessageId);
      return json(res,200,{ok:true,...out});
    }
    if(req.method==='POST'&&url.pathname==='/api/web/whatsapp/clear-failed'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(roleRank(ss.role)<3)return json(res,403,{ok:false,error:'Perfil sem permissão para limpar mensagens.'});
      const deleted=await whatsapp420ClearFailed(await readBody(req));
      await audit('whatsapp_business_failed_messages_clear',ss.username,req,'Mensagens com falha removidas: '+deleted);
      return json(res,200,{ok:true,deleted});
    }
    if(req.method==='POST'&&url.pathname==='/api/web/whatsapp/read'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      const id=validId((await readBody(req)).conversationId,180);if(!id)return json(res,400,{ok:false,error:'Conversa não informada.'});
      await pool.query('UPDATE whatsapp_conversations SET unread_count=0,updated_at=$1 WHERE conversation_id=$2',[nowIso(),id]);
      return json(res,200,{ok:true});
    }


    if(req.method==='GET'&&url.pathname==='/api/web/whatsapp/coexistence/config'){
      const ss=await webAuth(req,res,false);if(!ss)return;
      return json(res,200,{ok:true,config:await whatsapp430ConfigView()});
    }
    if(req.method==='PATCH'&&url.pathname==='/api/web/whatsapp/coexistence/config'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin pode configurar a conexão oficial por QR Code.'});
      const config=await whatsapp430SaveConfig(await readBody(req),ss.username);
      await audit('whatsapp_business_coexistence_config_update',ss.username,req,'Configuração do Embedded Signup atualizada');
      return json(res,200,{ok:true,config});
    }
    if(req.method==='POST'&&url.pathname==='/api/web/whatsapp/coexistence/start'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin pode iniciar a conexão oficial por QR Code.'});
      return json(res,200,await whatsapp430Start(ss.username));
    }
    if(req.method==='POST'&&url.pathname==='/api/web/whatsapp/coexistence/complete'){
      const ss=await webAuth(req,res,true);if(!ss)return;
      if(!isMaster(ss))return json(res,403,{ok:false,error:'Somente Super Admin pode concluir a conexão oficial por QR Code.'});
      const config=await whatsapp430Complete(await readBody(req),ss.username);
      await audit('whatsapp_business_coexistence_connected',ss.username,req,'WhatsApp Business conectado por Coexistência oficial');
      return json(res,200,{ok:true,config});
    }

    if(req.method==='POST'&&url.pathname==='/api/integrations/site-lead'){
      const out=await siteLead440Handle(req);
      return json(res,out.status,out.body);
    }

    // API de sincronizacao Windows <-> Cloudways.
    if(!authOk(req))return json(res,401,{ok:false,error:'Chave Cloud invalida.'});
    if(req.method==='PUT'&&url.pathname==='/api/v1/branding'){const body=await readBody(req),incoming=await normalizeBranding(body.branding||body),current=await getBranding(),inAt=Date.parse(incoming.updatedAt||''),curAt=Date.parse(current.updatedAt||'');let b=current;const accept=!current.updatedAt||(incoming.updatedAt&&(!Number.isFinite(curAt)||!Number.isFinite(inAt)||inAt>=curAt));if(accept){b=incoming;await saveSetting('branding',b,validId(req.headers['x-exe-installation-id']||'windows',120))}return json(res,200,{ok:true,branding:b,accepted:accept})}
    if(req.method==='GET'&&url.pathname==='/api/v1/branding')return json(res,200,{ok:true,branding:await getBranding()});
    if(req.method==='GET'&&url.pathname==='/api/v1/info'){const[entities,deleted,changes,installations,cursor]=await Promise.all([countWhere('entities','WHERE deleted=FALSE'),countWhere('entities','WHERE deleted=TRUE'),countWhere('changes'),countWhere('installations'),maxCursor()]);return json(res,200,{ok:true,product:'EXE PRO Cloudways',version:VERSION,webUrl:'/',database:'postgresql',entities,deleted,changes,installations,cursor,time:nowIso()})}
    if(req.method==='POST'&&url.pathname==='/api/v1/sync/push'){const out=await push(await readBody(req));return json(res,out.status,out.body)}
    if(req.method==='GET'&&url.pathname==='/api/v1/sync/pull')return json(res,200,await pull(url,req));
    return json(res,404,{ok:false,error:'Rota nao encontrada.'});
  }catch(e){console.error('Request error:',e);return json(res,e.statusCode||500,{ok:false,error:e.statusCode?e.message:'Erro interno do EXE PRO Cloud.'})}
});

async function start(){
  await initSchema(pool);
  await bootstrapAdmin();
  await applyRecoveryPassword();
  server.listen(PORT,HOST,()=>{
    console.log('');console.log('EXE PRO 3.9.1 - CLOUDWAYS EDITION');console.log(`Servidor: ${HOST}:${PORT}`);console.log(`Cloud Web: ${PUBLIC_URL?PUBLIC_URL+'/':'/'}`);console.log('Banco: PostgreSQL');console.log(`HTTPS obrigatorio: ${REQUIRE_HTTPS?'SIM':'NAO'}`);if(PUBLIC_URL)console.log(`URL publica: ${PUBLIC_URL}`);console.log('');
  });
}

async function shutdown(sig){console.log(`Encerrando EXE PRO Cloud (${sig})...`);server.close(async()=>{try{await pool.end()}catch{}process.exit(0)});setTimeout(()=>process.exit(1),8000).unref()}
process.on('SIGTERM',()=>shutdown('SIGTERM'));process.on('SIGINT',()=>shutdown('SIGINT'));
start().catch(err=>{console.error('Falha ao iniciar EXE PRO Cloud:',err);process.exit(1)});
setTimeout(()=>coreStartupRecord().catch(()=>{}),15000).unref();
setTimeout(()=>coreRunScheduled('wordpress',14*60*1000,false,'scheduler').catch(()=>{}),60000).unref();
setInterval(()=>coreRunScheduled('wordpress',14*60*1000,false,'scheduler').catch(()=>{}),15*60*1000).unref();
setTimeout(()=>coreRunScheduled('notifications',14*60*1000,false,'scheduler').catch(()=>{}),30000).unref();
setInterval(()=>coreRunScheduled('notifications',14*60*1000,false,'scheduler').catch(()=>{}),15*60*1000).unref();
setTimeout(()=>coreRunScheduled('billing',20*60*1000,false,'scheduler').catch(()=>{}),45000).unref();
setInterval(()=>coreRunScheduled('billing',20*60*1000,false,'scheduler').catch(()=>{}),6*60*60*1000).unref();
