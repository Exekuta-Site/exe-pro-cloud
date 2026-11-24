'use strict';
// EXE PRO 4.4.8 - Controle remoto do Pop-up (EXE PRO Connector 1.4.0)
// Backend: estende wpCtrlRemote para GET (status) e adiciona rotas admin
// /api/web/wordpress-sites/popup (GET consulta, POST salva) reutilizando a
// chave HMAC existente do site. Frontend: botao "Pop-up" na tabela de sites
// + modal de edicao (ativo, titulo, mensagem, botao, cor, exibicao,
// frequencia, atraso) seguindo a documentacao INTEGRACAO-EXEKUTA-POPUP.md.
// Nao altera status/suspend/resume, nao expoe a chave ao navegador.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const serverPath = path.join(root, 'server.js');
const indexPath = path.join(root, 'web', 'index.html');
const standalonePath = path.join(root, 'web', 'wordpress-control-370.js');
const sourceAdminPath = path.join(root, 'tools', 'wp370', 'server-snippet.js');

let server = fs.readFileSync(serverPath, 'utf8');
let html = fs.readFileSync(indexPath, 'utf8');
let standalone = fs.readFileSync(standalonePath, 'utf8');
let sourceAdmin = fs.readFileSync(sourceAdminPath, 'utf8');

function applyIn(text, anchor, replacement, label, fatal) {
  if (text.includes(replacement)) { console.log('EXE PRO Cloud 4.4.8: ' + label + ' (ja aplicado).'); return text; }
  if (!text.includes(anchor)) {
    if (fatal) throw new Error('EXE PRO 4.4.8: ancora nao encontrada: ' + label);
    console.warn('EXE PRO Cloud 4.4.8: AVISO - ancora ausente (ignorado): ' + label);
    return text;
  }
  console.log('EXE PRO Cloud 4.4.8: ' + label + ' aplicado.');
  return text.replace(anchor, () => replacement);
}

// ============ 1) Servidor: sanitizacao do pop-up + wpCtrlPopupRemote ============
const serverSnippet = [
  "function wpCtrlPopupSanitize(v){const p=v&&typeof v==='object'?v:{},hex=s=>/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(String(s||''));",
  "  const out={};",
  "  if(p.enabled!==undefined)out.enabled=!!p.enabled;",
  "  if(p.title!==undefined)out.title=String(p.title).slice(0,180);",
  "  if(p.message!==undefined)out.message=String(p.message).slice(0,2000);",
  "  if(p.button_label!==undefined)out.button_label=String(p.button_label).slice(0,80);",
  "  if(p.button_url!==undefined){const s=String(p.button_url||'').trim();out.button_url=(s&&!/^https?:\\/\\//i.test(s))?'':s;}",
  "  if(p.accent_color!==undefined)out.accent_color=hex(p.accent_color)?p.accent_color:'#18b7a4';",
  "  if(p.show_on!==undefined)out.show_on=['all','home'].includes(p.show_on)?p.show_on:'all';",
  "  if(p.frequency!==undefined)out.frequency=['session','daily','always'].includes(p.frequency)?p.frequency:'session';",
  "  if(p.delay_seconds!==undefined)out.delay_seconds=Math.max(0,Math.min(30,Math.round(Number(p.delay_seconds)||0)));",
  "  return out;",
  '}',
  'async function wpCtrlPopupRemote(site,method,popup){',
  "  const base=wpCtrlNormalizeUrl(site.site_url);",
  "  if(!base)throw new Error('URL WordPress invalida. Use HTTPS publico.');",
  "  const secret=await getSecret(wpCtrlSecretKey(site.site_id));",
  "  if(!secret)throw new Error('Chave de conexao WordPress nao configurada.');",
  "  const route='/exe-pro/v1/popup';",
  "  const body=method==='GET'?'':JSON.stringify(popup||{});",
  "  const timestamp=String(Math.floor(Date.now()/1000));",
  "  const nonce=crypto.randomBytes(18).toString('base64url');",
  "  const bodyHash=crypto.createHash('sha256').update(body).digest('hex');",
  "  const canonical=[timestamp,nonce,method,route,bodyHash].join('\\n');",
  "  const signature=crypto.createHmac('sha256',secret).update(canonical).digest('hex');",
  '  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);',
  '  try{',
  "    const res=await fetch(base+'/wp-json'+route,{",
  "      method,redirect:'error',signal:controller.signal,",
  "      headers:{'accept':'application/json','content-type':'application/json','user-agent':'EXE-PRO-Cloud/4.4.8','x-exe-timestamp':timestamp,'x-exe-nonce':nonce,'x-exe-signature':signature},",
  "      body:method==='GET'?undefined:body",
  '    });',
  "    const text=await res.text();let data={};",
  "    try{data=text?JSON.parse(text):{}}catch{data={raw:text.slice(0,500)}}",
  "    if(!res.ok)throw new Error('WordPress HTTP '+res.status+': '+String(data.message||data.error||data.raw||'falha remota').slice(0,300));",
  '    return data;',
  '}finally{clearTimeout(timer)}',
  '}'
].join('\n');

server = applyIn(
  server,
  '\nfunction guardKey(',
  '\n' + serverSnippet + '\nfunction guardKey(',
  'servidor: helpers do pop-up',
  true
);

// ============ 2) Servidor: rotas GET/POST /api/web/wordpress-sites/popup ============
const routeBlock = [
  "    if(req.method==='GET'&&url.pathname==='/api/web/wordpress-sites/popup'){",
  '      const ss=await webAuth(req,res,false);if(!ss)return;',
  "      const id=validId(new URL(req.url,'https://x').searchParams.get('siteId'),180);",
  "      if(!id)return json(res,400,{ok:false,error:'Site invalido.'});",
  '      const site=await wpCtrlOne(id);if(!site)return json(res,404,{ok:false,error:\'Site WordPress nao encontrado.\'});',
  '      try{return json(res,200,{ok:true,popup:(await wpCtrlPopupRemote(site,\'GET\',null)).popup||{}})}',
  '      catch(e){return json(res,502,{ok:false,error:String(e.message||e)})}',
  '    }',
  "    if(req.method==='POST'&&url.pathname==='/api/web/wordpress-sites/popup'){",
  '      const ss=await webAuth(req,res,true);if(!ss)return;',
  "      if(roleRank(ss.role)<4)return json(res,403,{ok:false,error:'Somente Admin ou Super Admin pode controlar o pop-up do site.'});",
  '      const body=await readBody(req),id=validId(body.siteId,180);',
  "      if(!id)return json(res,400,{ok:false,error:'Site invalido.'});",
  '      const site=await wpCtrlOne(id);if(!site)return json(res,404,{ok:false,error:\'Site WordPress nao encontrado.\'});',
  '      try{',
  "        const out=await wpCtrlPopupRemote(site,'POST',wpCtrlPopupSanitize(body.popup));",
  "        await audit('wordpress_popup_update',ss.username,req,'Pop-up '+site.site_url);",
  '        return json(res,200,out);',
  '      }catch(e){return json(res,502,{ok:false,error:String(e.message||e)})}',
  '    }'
].join('\n');

server = applyIn(
  server,
  "    if(req.method==='POST'&&url.pathname==='/api/web/wordpress-sites/action'){",
  routeBlock + "\n    if(req.method==='POST'&&url.pathname==='/api/web/wordpress-sites/action'){",
  'servidor: rotas do pop-up',
  true
);

// ============ 3) Admin (3 arquivos): botao Pop-up + modal de edicao ============
const popupJs = [
  "  window.wpPopup460Open=async function(id){",
  "    const s=site370(id);if(!s)return;",
  "    $('modalEyebrow').textContent='WORDPRESS';$('modalTitle').textContent='Pop-up do site';$('modalMeta').textContent=s.label||s.siteUrl;",
  "    $('modalBody').innerHTML='<div class=\\'card\\'><div class=\\'empty\\'>Carregando configuracao do pop-up...</div></div>';$('modalBack').classList.remove('hidden');",
  "    try{",
  "      const j=await api('/api/web/wordpress-sites/popup?siteId='+encodeURIComponent(id));",
  "      const p=j.popup||{};",
  "      $('modalBody').innerHTML='<div class=\\'form-grid\\'>'+" +
  "        '<div class=\\'field\\'><label>STATUS</label><select id=\\'wp460_enabled\\' class=\\'input\\'><option value=\\'off\\''+(Number(p.enabled)?'':' selected')+'>Desativado</option><option value=\\'on\\''+(Number(p.enabled)?' selected':'')+'>Ativado</option></select></div>'+" +
  "        '<div class=\\'field\\'><label>COR DE DESTAQUE</label><input id=\\'wp460_accent\\' class=\\'input\\' type=\\'color\\' value=\\''+e370(String(p.accent_color||'#18b7a4'))+'\\'></div>'+" +
  "        '<div class=\\'field wide\\'><label>TITULO</label><input id=\\'wp460_title\\' class=\\'input\\' maxlength=\\'180\\' value=\\''+e370(p.title||'')+'\\'></div>'+" +
  "        '<div class=\\'field wide\\'><label>MENSAGEM</label><textarea id=\\'wp460_message\\' rows=\\'4\\' maxlength=\\'2000\\'>'+e370(p.message||'')+'</textarea></div>'+" +
  "        '<div class=\\'field\\'><label>TEXTO DO BOTAO</label><input id=\\'wp460_btn\\' class=\\'input\\' maxlength=\\'80\\' value=\\''+e370(p.button_label||'')+'\\'></div>'+" +
  "        '<div class=\\'field\\'><label>LINK DO BOTAO</label><input id=\\'wp460_url\\' class=\\'input\\' placeholder=\\'https://... (opcional)\\' value=\\''+e370(p.button_url||'')+'\\'></div>'+" +
  "        '<div class=\\'field\\'><label>EXIBIR EM</label><select id=\\'wp460_show\\' class=\\'input\\'><option value=\\'all\\''+(p.show_on==='home'?'':' selected')+'>Todas as paginas</option><option value=\\'home\\''+(p.show_on==='home'?' selected':'')+'>Somente a pagina inicial</option></select></div>'+" +
  "        '<div class=\\'field\\'><label>FREQUENCIA</label><select id=\\'wp460_freq\\' class=\\'input\\'><option value=\\'session\\''+(p.frequency==='daily'||p.frequency==='always'?'':' selected')+'>Uma vez por sessao</option><option value=\\'daily\\''+(p.frequency==='daily'?' selected':'')+'>Uma vez a cada 24h</option><option value=\\'always\\''+(p.frequency==='always'?' selected':'')+'>Toda visita</option></select></div>'+" +
  "        '<div class=\\'field\\'><label>ATRASO (SEGUNDOS)</label><input id=\\'wp460_delay\\' class=\\'input\\' type=\\'number\\' min=\\'0\\' max=\\'30\\' value=\\''+e370(String(Number(p.delay_seconds||0)))+'\\'></div>'+" +
  "      '</div>'+" +
  "      '<div class=\\'actions\\' style=\\'margin-top:14px\\'><button class=\\'btn\\' onclick=\\'closeModal()\\'>Cancelar</button><button class=\\'btn primary\\' onclick=\\'wpPopup460Save(\\''+e370(id)+'\\')\\'>Salvar no WordPress</button></div>';" +
  "    }catch(err){",
  "      $('modalBody').innerHTML='<div class=\\'card\\'><div class=\\'empty\\'>Falha ao consultar o pop-up: '+e370(String(err.message||err))+'</div></div>';" +
  "    }",
  "  };",
  "  window.wpPopup460Save=async function(id){",
  "    const payload={",
  "      enabled:document.getElementById('wp460_enabled')?.value==='on',",
  "      title:String(document.getElementById('wp460_title')?.value||''),",
  "      message:String(document.getElementById('wp460_message')?.value||''),",
  "      button_label:String(document.getElementById('wp460_btn')?.value||''),",
  "      button_url:String(document.getElementById('wp460_url')?.value||'').trim(),",
  "      accent_color:String(document.getElementById('wp460_accent')?.value||'#18b7a4'),",
  "      show_on:String(document.getElementById('wp460_show')?.value||'all'),",
  "      frequency:String(document.getElementById('wp460_freq')?.value||'session'),",
  "      delay_seconds:Number(document.getElementById('wp460_delay')?.value||0)",
  "    };",
  "    try{",
  "      await api('/api/web/wordpress-sites/popup',{method:'POST',body:JSON.stringify({siteId:id,popup:payload})});",
  "      toast('Pop-up atualizado no WordPress.',6000);closeModal();",
  "    }catch(err){toast(String(err.message||err),7000)}",
  "  };"
].join('\n');

const popupAnchor = '  window.wpAction370=async function(id,action){';
const popupInjected = popupJs + '\n' + popupAnchor;

html = applyIn(html, popupAnchor, popupInjected, 'admin: modal do pop-up (index.html)', false);
standalone = applyIn(standalone, popupAnchor, popupInjected, 'admin: modal do pop-up (wordpress-control-370.js)', false);
const browserJsPath = path.join(root, 'tools', 'wp370', 'browser.js');
let browserJs = fs.readFileSync(browserJsPath, 'utf8');
browserJs = applyIn(browserJs, popupAnchor, popupInjected, 'admin: modal do pop-up (wp370/browser.js)', false);

const oldBtn = "(canAdmin370()?'<button class=\"btn sm\" onclick=\"openWpSiteModal370(\\''+e370(s.siteId)+'\\')\">Editar</button><button class=\"btn sm danger369\" onclick=\"removeWpSite370(\\''+e370(s.siteId)+'\\')\">Remover</button>':'')+";
const newBtn = "(canAdmin370()?'<button class=\"btn sm\" onclick=\"wpPopup460Open(\\''+e370(s.siteId)+'\\')\">Pop-up</button><button class=\"btn sm\" onclick=\"openWpSiteModal370(\\''+e370(s.siteId)+'\\')\">Editar</button><button class=\"btn sm danger369\" onclick=\"removeWpSite370(\\''+e370(s.siteId)+'\\')\">Remover</button>':'')+";

html = applyIn(html, oldBtn, newBtn, 'admin: botao Pop-up (index.html)', false);
standalone = applyIn(standalone, oldBtn, newBtn, 'admin: botao Pop-up (wordpress-control-370.js)', false);
browserJs = applyIn(browserJs, oldBtn, newBtn, 'admin: botao Pop-up (wp370/browser.js)', false);

// ============ 5) Download v1.4.0: rota publica + links do painel ============
const dlOld = "    if(req.method==='GET'&&url.pathname==='/downloads/exe-pro-connector-v1.1.0.zip'){";
const dlNew = [
  "    if(req.method==='GET'&&url.pathname==='/downloads/exe-pro-connector-v1.4.0.zip'){",
  '      try{',
  "        const file=require('node:fs').readFileSync(require('node:path').join(__dirname,'web','downloads','exe-pro-connector-v1.4.0.zip'));",
  "        res.writeHead(200,{'content-type':'application/zip','content-length':file.length,'content-disposition':'attachment; filename=\"EXE_PRO_Connector_WordPress_v1.4.0.zip\"','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'});",
  '        return res.end(file);',
  "      }catch(e){return json(res,404,{ok:false,error:'Pacote do plugin indisponivel. Rode o build novamente.'})}",
  '    }',
  dlOld
].join('\n');
server = applyIn(server, dlOld, dlNew, 'servidor: rota de download v1.4.0', true);

for (let [lbl, txt] of [['index.html', html], ['wordpress-control-370.js', standalone], ['wp370/browser.js', browserJs]]) {
  txt = applyIn(txt, 'href="/downloads/exe-pro-connector-v1.1.0.zip">⬇ Plugin WordPress 1.1</a>', 'href="/downloads/exe-pro-connector-v1.4.0.zip">⬇ Plugin WordPress 1.4</a>', 'admin: link plugin (' + lbl + ')', false);
  txt = applyIn(txt, 'href="/downloads/exe-pro-connector-v1.1.0.zip">EXE PRO Connector 1.1</a>', 'href="/downloads/exe-pro-connector-v1.4.0.zip">EXE PRO Connector 1.4</a>', 'admin: aviso plugin (' + lbl + ')', false);
  if (lbl === 'index.html') html = txt; else if (lbl === 'wordpress-control-370.js') standalone = txt; else browserJs = txt;
}

fs.writeFileSync(serverPath, server);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(standalonePath, standalone);
fs.writeFileSync(browserJsPath, browserJs);

cp.execFileSync(process.execPath, ['--check', serverPath]);
for (const needle of ["'/exe-pro/v1/popup'", "url.pathname==='/api/web/wordpress-sites/popup'"]) {
  if (!server.includes(needle)) throw new Error('EXE PRO 4.4.8: parte ausente no servidor: ' + needle);
}
for (const needle of ['wpPopup460Open', 'wpPopup460Save']) {
  if (!html.includes(needle) || !standalone.includes(needle)) throw new Error('EXE PRO 4.4.8: UI do pop-up ausente.');
}
console.log('EXE PRO Cloud 4.4.8: controle remoto do Pop-up aplicado e validado.');
