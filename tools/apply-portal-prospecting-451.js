'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const os = require('node:os');

const root = path.resolve(__dirname, '..');
const serverPath = path.join(root, 'server.js');
const indexPath = path.join(root, 'web', 'index.html');
const portalPath = path.join(root, 'web', 'portal.html');
const standalonePath = path.join(root, 'web', 'client-portal-380.js');
const sourceAdminPath = path.join(root, 'tools', 'portal380', 'admin.js');

let server = fs.readFileSync(serverPath, 'utf8');
let html = fs.readFileSync(indexPath, 'utf8');
let portal = fs.readFileSync(portalPath, 'utf8');
let standalone = fs.readFileSync(standalonePath, 'utf8');
let sourceAdmin = fs.readFileSync(sourceAdminPath, 'utf8');

function applyIn(text, anchor, replacement, label, fatal) {
  if (text.includes(replacement)) { console.log('EXE PRO Cloud 4.4.7: ' + label + ' (ja aplicado).'); return text; }
  if (!text.includes(anchor)) {
    if (fatal) throw new Error('EXE PRO 4.4.7: ancora nao encontrada: ' + label);
    console.warn('EXE PRO Cloud 4.4.7: AVISO - ancora ausente (ignorado): ' + label);
    return text;
  }
  console.log('EXE PRO Cloud 4.4.7: ' + label + ' aplicado.');
  return text.replace(anchor, () => replacement);
}

// ============ 1) Servidor: portalProspectSave (salva lead no CRM principal) ============
const serverSnippet = [
  'async function portalProspectSave(body,ps){',
  "  if(String(ps.role||'').toLowerCase()!=='proprietario')return{status:403,body:{ok:false,error:'Somente o perfil Proprietario do portal pode salvar leads.'}};",
  '  const x=body&&typeof body===\'object\'?body:{};',
  '  const name=validId(x.name,180)||validId(x.companyName,180);',
  '  if(!name)return{status:400,body:{ok:false,error:\'Informe o nome da empresa.\'}};',
  '  const id=validId(x.entityId||crypto.randomUUID(),180),now=nowIso();',
  '  const payload={',
  '    name,companyName:validId(x.companyName,180)||name,',
  '    address:validId(x.address,180),phone:validId(x.phone,60),whatsapp:validId(x.phone,60),',
  '    website:validId(x.website,240),placeId:validId(x.placeId,180),category:validId(x.category,120),',
  '    segment:validId(x.segment,120),city:validId(x.city,80),state:validId(x.state,40),region:validId(x.region,120),',
  '    rating:Number(x.rating||0),reviews:Number(x.reviews||0),mapsUrl:validId(x.mapsUrl,240),',
  "    source:'Portal do Cliente',crmStatus:'Novo',",
  "    notes:'Prospectado via Portal do Cliente'+(x.query?' · '+String(x.query).slice(0,120):''),",
  "    createdAt:now,updatedAt:now,createdBy:ps.username||'Portal'",
  '  };',
  '  return withTransaction(pool,async client=>{',
  "    const existing=await one(client,'SELECT 1 AS ok FROM entities WHERE entity_type=$1 AND entity_id=$2',['lead',id]);",
  '    if(existing)return{status:409,body:{ok:false,error:\'Este lead ja existe no CRM.\'}};',
  "    await client.query('INSERT INTO entities(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,1,$3,1,FALSE,$4::jsonb,$5)',['lead',id,'portal-web',JSON.stringify(payload),now]);",
  "    await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,1,$3,1,FALSE,$4::jsonb,$5)',['lead',id,'portal-web',JSON.stringify(payload),now]);",
  "    const row=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2',['lead',id]),cursor=await maxCursor(client);",
  '    return{status:201,body:{ok:true,row:publicRow(row),cursor}};',
  '  });',
  '}'
].join('\n');

server = applyIn(
  server,
  '\nfunction guardKey(',
  '\n' + serverSnippet + '\nfunction guardKey(',
  'servidor: portalProspectSave',
  true
);

// ============ 2) Servidor: rotas POST /api/portal/prospect e /prospect/save ============
const routeBlock = [
  "    if(req.method==='POST'&&url.pathname==='/api/portal/prospect'){",
  '      const ps=await portalAuth(req,res,true);if(!ps)return;',
  "      if(String(ps.role||'').toLowerCase()!=='proprietario')return json(res,403,{ok:false,error:'Somente o perfil Proprietario do portal pode prospectar.'});",
  '      const out=await webProspect(await readBody(req));return json(res,out.status,out.body);',
  '    }',
  "    if(req.method==='POST'&&url.pathname==='/api/portal/prospect/save'){",
  '      const ps=await portalAuth(req,res,true);if(!ps)return;',
  '      const out=await portalProspectSave(await readBody(req),ps);return json(res,out.status,out.body);',
  '    }'
].join('\n');

server = applyIn(
  server,
  "    if(req.method==='GET'&&url.pathname==='/api/portal/tasks'){",
  routeBlock + "\n    if(req.method==='GET'&&url.pathname==='/api/portal/tasks'){",
  'servidor: rotas de prospeccao do portal',
  true
);

// ============ 2c) Servidor: rota de foto do Google Places para o portal ============
const photoRoute = [
  "    if(req.method==='GET'&&url.pathname==='/api/portal/place-photo'){",
  '      const ps=await portalAuth(req,res,false);if(!ps)return;',
  "      const name=String(url.searchParams.get('name')||'').trim();",
  "      if(!/^places\\/[^/]+\\/photos\\/[^/]+$/.test(name))return json(res,400,{ok:false,error:'Foto do Google Places invalida.'});",
  "      const key=await getSecret('googlePlaces');",
  "      if(!key)return json(res,503,{ok:false,error:'Google Places nao configurado na Cloud.'});",
  '      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);',
  '      try{',
  "        const endpoint='https://places.googleapis.com/v1/'+name+'/media?maxWidthPx=1200&skipHttpRedirect=false&key='+encodeURIComponent(key),pr=await fetch(endpoint,{signal:controller.signal,redirect:'follow'});",
  "        if(!pr.ok)return json(res,pr.status,{ok:false,error:'Nao foi possivel carregar a foto do Google Places.'});",
  '        const buf=Buffer.from(await pr.arrayBuffer());',
  "        res.writeHead(200,{'content-type':pr.headers.get('content-type')||'image/jpeg','content-length':buf.length,'cache-control':'private, max-age=86400','x-content-type-options':'nosniff'});",
  '        return res.end(buf)',
  '      }catch(e){',
  "        return json(res,502,{ok:false,error:'Falha ao carregar foto do Google Places.'})",
  '      }finally{clearTimeout(timer)}',
  '    }'
].join('\n');

server = applyIn(
  server,
  "    if(req.method==='GET'&&url.pathname==='/api/portal/tasks'){",
  photoRoute + "\n    if(req.method==='GET'&&url.pathname==='/api/portal/tasks'){",
  'servidor: rota de foto do portal',
  true
);

// ============ 2b) Servidor: fallback gratuito para Instagram/Facebook (Serper) ============
// Contas gratuitas do Serper nao permitem o operador site:. Se falhar, refaz a busca
// sem operador e filtra resultados pelo dominio oficial (instagram.com / facebook.com).
const serperOld = "const sq=src==='google'?query:`site:${src==='instagram'?'instagram.com':'facebook.com'} ${query}`;try{const j=await fetchJson('https://google.serper.dev/search',{method:'POST',headers:{'content-type':'application/json','X-API-KEY':key},body:JSON.stringify({q:sq,gl:'br',hl:'pt-br',num:Math.min(20,limit)})},12000);results[src]=(j.organic||[]).slice(0,limit).map(x=>({name:x.title||'',link:x.link||'',snippet:x.snippet||'',source:src}))}catch(e){warnings.push(src+': '+e.message)}";
const serperNew = "const domain=src==='instagram'?'instagram.com':src==='facebook'?'facebook.com':'';const sq=src==='google'?query:`site:${domain} ${query}`;try{const j=await fetchJson('https://google.serper.dev/search',{method:'POST',headers:{'content-type':'application/json','X-API-KEY':key},body:JSON.stringify({q:sq,gl:'br',hl:'pt-br',num:Math.min(20,limit)})},12000);results[src]=(j.organic||[]).slice(0,limit).map(x=>({name:x.title||'',link:x.link||'',snippet:x.snippet||'',source:src}))}catch(e){if(src==='google'){warnings.push('Google: '+e.message)}else{try{const j2=await fetchJson('https://google.serper.dev/search',{method:'POST',headers:{'content-type':'application/json','X-API-KEY':key},body:JSON.stringify({q:query,gl:'br',hl:'pt-br',num:Math.min(20,limit)})},12000);results[src]=(j2.organic||[]).filter(x=>{const l=String(x.link||'').toLowerCase();return l.indexOf('//'+domain)>=0||l.indexOf('//www.'+domain)>=0}).slice(0,limit).map(x=>({name:x.title||'',link:x.link||'',snippet:x.snippet||'',source:src}))}catch(e2){warnings.push(src+': '+e.message)}}}";
server = applyIn(server, serperOld, serperNew, 'servidor: fallback Serper gratuito (Instagram/Facebook)', false);

// ============ 3) Admin: URL oficial + botao Abrir portal ============
const oldUrl = "function portalUrl380(){return location.origin+'/portal/';}";
const newUrl = "function portalUrl380(){return 'https://portal.exekuta.com.br/';}";
const oldNotice = "'<div class=\"notice cp380-domain\"><b>Endereço preparado:</b> portal.exekuta.com.br. Enquanto o subdomínio não estiver apontado no Cloudways/DNS, o mesmo portal funciona em <b>'+e380(location.origin+'/portal/')+'</b>.</div>'";
const newNotice = "'<div class=\"notice cp380-domain\"><b>Endereço oficial do portal:</b> portal.exekuta.com.br — este é o endereço copiado pelo botão Copiar portal.</div>'";
const oldBtn = "'<button class=\"btn sm\" onclick=\"copyPortalLink380()\">Copiar portal</button>'+";
const newBtn = "'<button class=\"btn sm\" onclick=\"copyPortalLink380()\">Copiar portal</button><button class=\"btn sm\" onclick=\"openPortal380()\">Abrir portal</button>'+";
const oldCopy = 'window.copyPortalLink380=async function(){';
const newCopy = "window.openPortal380=function(){window.open(portalUrl380(),'_blank','noopener')};\n  window.copyPortalLink380=async function(){";

for (let [label, t] of [['index.html', html], ['client-portal-380.js', standalone], ['portal380/admin.js', sourceAdmin]]) {
  t = applyIn(t, oldUrl, newUrl, 'admin: URL oficial do portal (' + label + ')', false);
  t = applyIn(t, oldNotice, newNotice, 'admin: aviso de dominio (' + label + ')', false);
  t = applyIn(t, oldBtn, newBtn, 'admin: botao Abrir portal (' + label + ')', false);
  t = applyIn(t, oldCopy, newCopy, 'admin: openPortal380() (' + label + ')', false);
  if (label === 'index.html') html = t;
  else if (label === 'client-portal-380.js') standalone = t;
  else sourceAdmin = t;
}

// ============ 3b) Admin: Bairro/Regiao e Cidade pre-definidas (Prospeccao Inteligente) ============
const PROSPECT_REGIONS_DATA = [
  { name: 'Guaratiba', cities: ['Rio de Janeiro'] },
  { name: 'Barra da Tijuca', cities: ['Rio de Janeiro'] },
  { name: 'Recreio dos Bandeirantes', cities: ['Rio de Janeiro'] },
  { name: 'Jacarepaguá', cities: ['Rio de Janeiro'] },
  { name: 'Campo Grande', cities: ['Rio de Janeiro'] },
  { name: 'Santa Cruz', cities: ['Rio de Janeiro'] },
  { name: 'Zona Sul RJ', cities: ['Rio de Janeiro'] },
  { name: 'Centro RJ', cities: ['Rio de Janeiro'] },
  { name: 'Zona Norte RJ', cities: ['Rio de Janeiro'] },
  { name: 'Baixada Fluminense', cities: ['Duque de Caxias', 'Nova Iguaçu', 'Belford Roxo', 'São João de Meriti', 'Queimados', 'Japeri', 'Mesquita', 'Nilópolis', 'Magé', 'Seropédica'] },
  { name: 'Grande Niterói', cities: ['Niterói', 'São Gonçalo', 'Maricá', 'Itaboraí'] },
  { name: 'Região dos Lagos', cities: ['Cabo Frio', 'Armação dos Búzios', 'São Pedro da Aldeia', 'Iguaba Grande', 'Saquarema', 'Araruama', 'Arraial do Cabo'] }
];

html = applyIn(
  html,
  '<div class="field"><label>Bairro / região</label><input id="ps_region" class="input" placeholder="Ex.: Guaratiba"></div><div class="field"><label>Cidade</label><input id="ps_city" class="input" placeholder="Rio de Janeiro"></div>',
  '<div class="field"><label>Bairro / região</label><select id="ps_region" class="input" onchange="psRegionChanged()"><option value="">— Selecione —</option>\'+PROSPECT_REGIONS.map(function(r){return \'<option>\'+r.name+\'</option>\'}).join(\'\')+\'<option value="__custom__">Outra (digitar)</option></select><input id="ps_region_custom" class="input hidden" placeholder="Digite o bairro/região" style="margin-top:6px"></div><div class="field"><label>Cidade</label><select id="ps_city" class="input" onchange="psCityChanged()"><option value="">— Selecione a região primeiro —</option></select><input id="ps_city_custom" class="input hidden" placeholder="Digite a cidade" style="margin-top:6px"></div>',
  'admin: selects de regiao/cidade',
  false
);

html = applyIn(
  html,
  'async function doProspect(){',
  'const PROSPECT_REGIONS=' + JSON.stringify(PROSPECT_REGIONS_DATA) + ';\n' +
  'function psRegionChanged(){const v=document.getElementById(\'ps_region\').value||\'\';document.getElementById(\'ps_region_custom\').classList.toggle(\'hidden\',v!==\'__custom__\');const sel=document.getElementById(\'ps_city\');const r=PROSPECT_REGIONS.find(function(x){return x.name===v});sel.innerHTML=r?r.cities.map(function(c){return \'<option>\'+c+\'</option>\'}).join(\'\')+\'<option value="__custom__">Outra (digitar)</option>\':\'<option value="">— Selecione a região primeiro —</option>\';document.getElementById(\'ps_city_custom\').classList.add(\'hidden\')}\n' +
  'function psCityChanged(){document.getElementById(\'ps_city_custom\').classList.toggle(\'hidden\',(document.getElementById(\'ps_city\').value||\'\')!==\'__custom__\')}\n' +
  'async function doProspect(){',
  'admin: helpers de regiao/cidade',
  false
);

html = applyIn(
  html,
  "region:$('ps_region').value,city:$('ps_city').value,",
  "region:($('ps_region').value==='__custom__'?$('ps_region_custom').value:$('ps_region').value),city:($('ps_city').value==='__custom__'?$('ps_city_custom').value:$('ps_city').value),",
  'admin: doProspect le campos custom',
  false
);

// ============ 4) Portal do Cliente: modulo de Prospeccao (perfil Proprietario) ============
// Remove eventual modulo anterior (defensivo - o portal.html e regenerado a cada build)
portal = portal.replace(/<style id="pp\d+Style">[\s\S]*?<\/style>/g, '');
portal = portal.replace(/<script id="portalProspecting\d+Script">[\s\S]*?<\/script>/g, '');

const ppStyle = '<style id="pp452Style">' +
  '.pp452-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px}' +
  '.pp452-lead{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--panel2);display:flex;flex-direction:column}' +
  '.pp452-photo-wrap{position:relative;height:150px;background:#0b0d11}' +
  '.pp452-photo{width:100%;height:100%;object-fit:cover;display:block}' +
  '.pp452-photo-empty{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(135deg,#151922,#0e1116)}' +
  '.pp452-photo-empty span{font-size:30px;font-weight:900;color:color-mix(in srgb,var(--accent) 65%,#5b6472);letter-spacing:-.04em}' +
  '.pp452-lead-body{padding:13px 14px 14px;display:flex;flex-direction:column;gap:7px;flex:1}' +
  '.pp452-lead-body h4{margin:0;font-size:14px;line-height:1.3}' +
  '.pp452-addr{margin:0;font-size:11.5px;color:var(--muted);line-height:1.45}' +
  '.pp452-tags{display:flex;gap:6px;flex-wrap:wrap}' +
  '.pp452-tag{font-size:9.5px;font-weight:800;letter-spacing:.04em;border:1px solid var(--line);color:var(--muted);border-radius:999px;padding:3px 9px;background:var(--panel)}' +
  '.pp452-tag-star{color:#f2bd63;border-color:rgba(242,189,99,.35)}' +
  '.pp452-tag-hot{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent);background:color-mix(in srgb,var(--accent) 9%,var(--panel))}' +
  '.pp452-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:auto;padding-top:4px}' +
  '.pp452-card{border:1px solid var(--line);border-radius:14px;padding:15px;background:var(--panel2)}' +
  '.pp452-card h4{margin:2px 0 6px;font-size:14px}' +
  '.pp452-card p{margin:0 0 4px;font-size:12px;color:var(--muted);line-height:1.45}' +
  '.pp452-card .pp452-src{font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}' +
  '.pp452-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}' +
  '.pp452-msg{padding:10px 13px;border-radius:11px;border:1px solid var(--line);background:var(--panel);font-size:12px;margin-top:12px}' +
  '.pp452-msg.ok{border-color:rgba(87,214,160,.4);color:var(--ok)}' +
  '.pp452-msg.warn{border-color:rgba(242,189,99,.4);color:var(--warn)}' +
  '.pp452-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}' +
  '.pp452-form .pp452-wide{grid-column:1/-1}' +
  '@media(max-width:760px){.pp452-grid,.pp452-form{grid-template-columns:1fr}}' +
  '</style>';

const ppScript = "<script id=\"portalProspecting452Script\">'use strict';\n" +
[
  '(function(){',
  '  const PP452={loading:false,data:null,saved:{}};',
  '  const PP452_REGIONS='+JSON.stringify(PROSPECT_REGIONS_DATA)+';',
  '  const baseDashboard452=dashboard;',
  '  const baseRender452=render;',
  '  function isOwner452(){return String(P.data?.user?.role||\'\').toLowerCase()===\'proprietario\'}',
  '  function waLink452(phone){let d=String(phone||\'\').replace(/\\D/g,\'\');if(!d)return\'\';if(d.startsWith(\'55\')&&(d.length===12||d.length===13))return d;if(d.length===10||d.length===11)return\'55\'+d;return d}',
  '  function ppMsg452(text,kind){const m=document.getElementById(\'pp452Msg\');if(m){m.textContent=text;m.className=\'pp452-msg\'+(kind?\' \'+kind:\'\')}}',
  '  function ensureProsNav452(){',
  '    const side=document.querySelector(\'.sidebar\');if(!side)return;',
  '    if(!isOwner452()){const b=document.getElementById(\'portalPros452\');if(b)b.remove();return}',
  '    if(document.getElementById(\'portalPros452\'))return;',
  '    const foot=side.querySelector(\'.sidebar-foot\');',
  '    const html=\'<button class="navbtn" data-page="prospecting" id="portalPros452" onclick="goPortalPros452()">Prospecção</button>\';',
  '    if(foot)foot.insertAdjacentHTML(\'beforebegin\',html);else side.insertAdjacentHTML(\'beforeend\',html);',
  '  }',
  '  window.goPortalPros452=async function(){P.page=\'prospecting\';PP452.data=PP452.data||{ok:false};render()};',
  '  window.ppRegionChanged452=function(){',
  '    const v=document.getElementById(\'pp452Region\')?.value||\'\';',
  '    document.getElementById(\'pp452RegionCustom\')?.classList.toggle(\'hidden\',v!==\'__custom__\');',
  '    const sel=document.getElementById(\'pp452City\');if(!sel)return;',
  '    const r=PP452_REGIONS.find(function(x){return x.name===v});',
  '    sel.innerHTML=r?r.cities.map(function(c){return \'<option>\'+c+\'</option>\'}).join(\'\')+\'<option value="__custom__">Outra (digitar)</option>\':\'<option value="">— Selecione a região primeiro —</option>\';',
  '    document.getElementById(\'pp452CityCustom\')?.classList.add(\'hidden\');',
  '  };',
  '  window.ppCityChanged452=function(){document.getElementById(\'pp452CityCustom\')?.classList.toggle(\'hidden\',(document.getElementById(\'pp452City\')?.value||\'\')!==\'__custom__\')};',
  '  async function ppRun452(){',
  '    const seg=String(document.getElementById(\'pp452Seg\')?.value||\'\').trim();',
  '    if(!seg){ppMsg452(\'Informe o segmento para buscar empresas.\',\'warn\');return}',
  '    const body={',
  '      segment:seg,',
  '      region:(function(){const s=document.getElementById(\'pp452Region\');const v=s?s.value:\'\';return v===\'__custom__\'?String(document.getElementById(\'pp452RegionCustom\')?.value||\'\').trim():String(v).trim()})(),',
  '      city:(function(){const s=document.getElementById(\'pp452City\');const v=s?s.value:\'\';return v===\'__custom__\'?String(document.getElementById(\'pp452CityCustom\')?.value||\'\').trim():String(v).trim()})(),',
  '      state:String(document.getElementById(\'pp452State\')?.value||\'\').trim(),',
  '      limit:Number(document.getElementById(\'pp452Limit\')?.value||20),',
  '      sources:[[\'maps\',\'pp452Maps\'],[\'google\',\'pp452Google\'],[\'instagram\',\'pp452Insta\'],[\'facebook\',\'pp452Face\']].filter(x=>document.getElementById(x[1])?.checked).map(x=>x[0])',
  '    };',
  '    if(!body.sources.length){ppMsg452(\'Selecione ao menos uma fonte de busca.\',\'warn\');return}',
  '    PP452.loading=true;ppMsg452(\'Pesquisando empresas...\');',
  '    try{',
  '      const j=await api(\'/api/portal/prospect\',{method:\'POST\',body:JSON.stringify(body)});',
  '      if(!j.ok)throw new Error(j.error||\'Falha na busca.\');',
  '      PP452.data=j;PP452.saved={};ppMsg452(\'\');',
  '      const el=document.getElementById(\'pp452Results\');if(el)el.innerHTML=ppResults452();',
  '      ppMsg452(\'Pesquisa concluída\'+(j.warnings&&j.warnings.length?\' · \'+j.warnings.join(\' | \'):\'\'),\'ok\');',
  '    }catch(err){ppMsg452(err.message||\'Falha na busca.\',\'warn\')}',
  '    finally{PP452.loading=false}',
  '  }',
  '  window.ppRun452=ppRun452;',
  '  function ppWebCard452(x){',
  '    return \'<article class="pp452-card"><div class="pp452-src">\'+e(String(x.source||\'WEB\').toUpperCase())+\'</div><h4>\'+e(x.name||\'\')+\'</h4><p>\'+e(x.snippet||\'\')+\'</p>\'+',
  '      (x.link?\'<div class="pp452-actions"><a class="btn" target="_blank" rel="noopener" href="\'+e(x.link)+\'">Abrir resultado</a></div>\':\'\')+\'</article>\';',
  '  }',
  '  function ppPhoto452(x){',
  '    const ph=x.photoName||\'\';',
  '    const letter=e(String(x.category||x.name||\'P\').slice(0,1).toUpperCase());',
  '    if(!ph)return\'<div class="pp452-photo-wrap"><div class="pp452-photo-empty"><span>\'+letter+\'</span></div></div>\';',
  '    return\'<div class="pp452-photo-wrap"><img class="pp452-photo" loading="lazy" alt="" src="/api/portal/place-photo?name=\'+encodeURIComponent(ph)+\'" onerror="this.style.display=\\\'none\\\';this.nextElementSibling.style.display=\\\'grid\\\'"><div class="pp452-photo-empty" style="display:none"><span>\'+letter+\'</span></div></div>\';',
  '  }',
  '  function ppMapCard452(x,i){',
  '    const key=x.placeId||(x.name+\'|\'+x.address);',
  '    const done=!!PP452.saved[key];',
  '    const wa=waLink452(x.phone);',
  '    const tags=[];',
  '    if(x.category)tags.push(\'<span class="pp452-tag">\'+e(x.category)+\'</span>\');',
  '    if(Number(x.reviews||0))tags.push(\'<span class="pp452-tag pp452-tag-star">⭐ \'+e(String(x.rating||\'—\'))+\' · \'+e(String(x.reviews))+\'</span>\');',
  '    if(!x.website)tags.push(\'<span class="pp452-tag pp452-tag-hot">Sem site</span>\');',
  '    return \'<article class="pp452-lead">\'+ppPhoto452(x)+',
  '      \'<div class="pp452-lead-body"><h4>\'+e(x.name||\'\')+\'</h4><p class="pp452-addr">\'+e(x.address||\'\')+\'</p>\'+',
  '      (x.phone?\'<p class="pp452-addr">📞 \'+e(x.phone)+\'</p>\':\'\')+',
  '      \'<div class="pp452-tags">\'+tags.join(\'\')+\'</div>\'+',
  '      \'<div class="pp452-actions">\'+',
  '      (done?\'<span class="pp452-msg ok" style="margin:0">✓ Salvo no CRM</span>\':\'<button class="btn" onclick="ppSave452(\'+i+\')">+ Salvar lead</button>\')+',
  '      (wa?\'<a class="btn" target="_blank" rel="noopener" href="https://wa.me/\'+wa+\'">WhatsApp</a>\':\'\')+',
  '      (x.mapsUrl?\'<a class="btn" target="_blank" rel="noopener" href="\'+e(x.mapsUrl)+\'">Maps</a>\':\'\')+',
  '      (x.website?\'<a class="btn" target="_blank" rel="noopener" href="\'+e(x.website)+\'">Site</a>\':\'\')+',
  '      \'</div></div></article>\';',
  '  }',
  '  function ppResults452(){',
  '    if(!PP452.data||!PP452.data.ok)return\'\';',
  '    const r=PP452.data.results||{};',
  '    const maps=r.maps||[],other=[...(r.google||[]),...(r.instagram||[]),...(r.facebook||[])];',
  '    if(!maps.length&&!other.length)return\'<div class="card empty">Nenhuma empresa encontrada. Ajuste a busca ou as fontes.</div>\';',
  '    let h=\'<div class="pp452-actions" style="margin-top:14px">\'+',
  '      (maps.length?\'<button class="btn" onclick="ppSaveAll452()">Salvar todos no CRM</button>\':\'\')+\'</div>\';',
  '    if(maps.length)h+=\'<div class="pp452-grid">\'+maps.map(ppMapCard452).join(\'\')+\'</div>\';',
  '    if(other.length)h+=\'<h3 style="margin:18px 0 4px">Resultados da web</h3><div class="pp452-grid">\'+other.map(ppWebCard452).join(\'\')+\'</div>\';',
  '    return h;',
  '  }',
  '  window.ppSave452=async function(i){',
  '    const x=PP452.data?.results?.maps?.[i];if(!x)return;',
  '    const key=x.placeId||(x.name+\'|\'+x.address);',
  '    try{',
  '      const j=await api(\'/api/portal/prospect/save\',{method:\'POST\',body:JSON.stringify({entityType:\'lead\',payload:{name:x.name,companyName:x.name,address:x.address,phone:x.phone,whatsapp:x.phone,website:x.website,source:\'Google Maps\',placeId:x.placeId,segment:x.segment,city:x.city,state:x.state,crmStatus:\'Novo\',category:x.category,rating:x.rating,reviews:x.reviews,mapsUrl:x.mapsUrl},query:PP452.data.query})});',
  '      if(!j.ok)throw new Error(j.error||\'Falha ao salvar.\');',
  '      PP452.saved[key]=true;',
  '      const el=document.getElementById(\'pp452Results\');if(el)el.innerHTML=ppResults452();',
  '      ppMsg452(\'Lead salvo no CRM — a equipe vai atender.\',\'ok\');',
  '    }catch(err){ppMsg452(err.message||\'Falha ao salvar o lead.\',\'warn\')}',
  '  };',
  '  window.ppSaveAll452=async function(){',
  '    const maps=PP452.data?.results?.maps||[];if(!maps.length)return;',
  '    let ok=0,fail=0;',
  '    for(let i=0;i<maps.length;i++){',
  '      const key=maps[i].placeId||(maps[i].name+\'|\'+maps[i].address);',
  '      if(PP452.saved[key]){ok++;continue}',
  '      try{await ppSave452(i);if(PP452.saved[key])ok++;else fail++}catch{fail++}',
  '    }',
  '    ppMsg452(ok+\' lead(s) salvo(s) no CRM\'+(fail?\' · \'+fail+\' falha(s)\':\'\'),\'ok\');',
  '  };',
  '  function prospectPage452(){',
  '    let h=\'<div class="hero"><div><div class="eyebrow">PROSPECÇÃO</div><h2>Encontrar novas oportunidades</h2><p>Busque empresas por segmento e região e salve os melhores contatos direto no CRM.</p></div></div>\';',
  '    if(!isOwner452())return h+\'<div class="card empty">Este recurso está disponível apenas para o perfil Proprietário do portal.</div>\';',
  '    h+=\'<div class="card"><div class="pp452-form">\'+',
  '      \'<div class="field pp452-wide"><label>Segmento / tipo de empresa *</label><input id="pp452Seg" class="input" placeholder="Ex.: Construção civil"></div>\'+',
  '      \'<div class="field"><label>Bairro / região</label><select id="pp452Region" class="input" onchange="ppRegionChanged452()"><option value="">— Selecione —</option>\'+PP452_REGIONS.map(function(r){return \'<option>\'+r.name+\'</option>\'}).join(\'\')+\'<option value="__custom__">Outra (digitar)</option></select><input id="pp452RegionCustom" class="input hidden" placeholder="Digite o bairro/região" style="margin-top:6px"></div>\'+',
  '      \'<div class="field"><label>Cidade</label><select id="pp452City" class="input" onchange="ppCityChanged452()"><option value="">— Selecione a região primeiro —</option></select><input id="pp452CityCustom" class="input hidden" placeholder="Digite a cidade" style="margin-top:6px"></div>\'+',
  '      \'<div class="field"><label>UF</label><input id="pp452State" class="input" maxlength="2" placeholder="RJ"></div>\'+',
  '      \'<div class="field"><label>Quantidade</label><select id="pp452Limit" class="input"><option>10</option><option selected>20</option><option>40</option></select></div>\'+',
  '      \'<div class="field pp452-wide"><label>Fontes</label><div style="display:flex;gap:12px;flex-wrap:wrap;padding-top:8px">\'+',
  '        \'<label><input type="checkbox" id="pp452Maps" checked> Google Maps</label>\'+',
  '        \'<label><input type="checkbox" id="pp452Google"> Google</label>\'+',
  '        \'<label><input type="checkbox" id="pp452Insta"> Instagram</label>\'+',
  '        \'<label><input type="checkbox" id="pp452Face"> Facebook</label>\'+',
  '        \'</div><div class="tiny muted" style="margin-top:6px">Instagram e Facebook: usamos busca com filtro por domínio oficial (compatível com contas gratuitas).</div></div>\'+',
  '      \'</div><button class="btn" style="margin-top:14px" onclick="ppRun452()">⌕ Prospectar agora</button></div>\'+',
  '      \'<div id="pp452Msg"></div><div id="pp452Results">\'+(PP452.data&&PP452.data.ok?ppResults452():\'\')+\'</div>\';',
  '    return h;',
  '  }',
  '  window.prospectPage452=prospectPage452;',
  '  dashboard=function(){',
  '    let h=baseDashboard452();',
  '    if(!isOwner452())return h;',
  '    h+=\'<div class="card"><div class="card-head"><div><div class="eyebrow">PROSPECÇÃO</div><h3>Encontrar novas oportunidades</h3><p class="muted tiny">Busque empresas por segmento e região e salve os contatos no CRM.</p></div><button class="btn" onclick="goPortalPros452()">Abrir prospecção</button></div></div>\';',
  '    return h;',
  '  };',
  '  render=function(){',
  '    ensureProsNav452();',
  '    if(P.page===\'prospecting\'){',
  '      nav();document.querySelectorAll(\'.navbtn\').forEach(b=>b.classList.toggle(\'active\',b.dataset.page===\'prospecting\'));',
  '      $(\'clientChip\').textContent=P.data?.client?.name||\'\';',
  '      $(\'userChip\').textContent=P.data?.user?.username+\' · \'+roleLabel(P.data?.user?.role);',
  '      $(\'main\').innerHTML=prospectPage452();',
  '      return;',
  '    }',
  '    baseRender452();',
  '  };',
  '  setTimeout(()=>{try{ensureProsNav452()}catch{}},1700);',
  '})();'
].join('\n') + '</script>';

if (!portal.includes('pp452Style')) {
  if (!portal.includes('</head>')) throw new Error('EXE PRO 4.4.7: ancora </head> nao encontrada no portal.html');
  portal = portal.replace('</head>', () => ppStyle + '</head>');
  console.log('EXE PRO Cloud 4.4.7: portal: estilo aplicado.');
}
if (!portal.includes('portalProspecting452Script')) {
  if (!portal.includes('</body>')) throw new Error('EXE PRO 4.4.7: ancora </body> nao encontrada no portal.html');
  portal = portal.replace('</body>', () => ppScript + '</body>');
  console.log('EXE PRO Cloud 4.4.7: portal: modulo Prospeccao aplicado.');
} else {
  console.log('EXE PRO Cloud 4.4.7: portal: modulo Prospeccao (ja aplicado).');
}

fs.writeFileSync(serverPath, server);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(portalPath, portal);
fs.writeFileSync(standalonePath, standalone);
fs.writeFileSync(sourceAdminPath, sourceAdmin);

// Rede de seguranca: valida sintaxe do server.js e do modulo do portal gerado
cp.execFileSync(process.execPath, ['--check', serverPath]);
const tmp = path.join(os.tmpdir(), 'pp452-check.js');
fs.writeFileSync(tmp, ppScript.replace(/^<script id="portalProspecting452Script">/, '').replace(/<\/script>$/, ''));
cp.execFileSync(process.execPath, ['--check', tmp]);
for (const needle of ["url.pathname==='/api/portal/prospect'", 'portalProspectSave(await readBody(req),ps)']) {
  if (!server.includes(needle)) throw new Error('EXE PRO 4.4.7: rota ausente no servidor: ' + needle);
}
if (!portal.includes('goPortalPros452') || !portal.includes('pp452Style')) throw new Error('EXE PRO 4.4.7: modulo do portal ausente.');
console.log('EXE PRO Cloud 4.4.7: Prospecção no Portal do Cliente aplicada e validada.');
