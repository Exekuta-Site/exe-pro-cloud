'use strict';
(function(){
  const WP370={data:null,loading:false,showConfig:false};

  function e370(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function role370(){try{return roleRank(S.session?.user?.role||'')}catch{return 1}}
  function canAdmin370(){return role370()>=4}
  function master370(){try{return isMaster()}catch{return false}}
  function money370(v){try{return money(v)}catch{return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}}
  function day370(v){try{return day(v)}catch{return String(v||'').slice(0,10)||'—'}}
  function clients370(){return rows('lead').filter(r=>isClient(r.payload||{})).sort((a,b)=>String(a.payload?.name||'').localeCompare(String(b.payload?.name||''),'pt-BR'))}
  function site370(id){return WP370.data?.sites?.find(x=>x.siteId===id)||null}
  function sitesForLead370(id){return (WP370.data?.sites||[]).filter(x=>x.leadId===id)}
  window.getWpSitesForLead370=function(id){return sitesForLead370(id).map(s=>({siteId:s.siteId,siteUrl:s.siteUrl,label:s.label||s.siteUrl,status:s.status}))};
  function status370(s){
    if(s.remoteSuspended)return'<span class="status wp370-suspended">Suspenso</span>';
    if(s.status==='Online')return'<span class="status ok">Online</span>';
    if(s.status==='Erro')return'<span class="status bad">Erro</span>';
    return'<span class="status warn">'+e370(s.status||'Desconhecido')+'</span>';
  }
  function finance370(s){
    const f=s.finance||{};
    if(f.maxOverdueDays>0)return'<b class="wp370-overdue">'+f.maxOverdueDays+'d em atraso</b><div class="tiny muted">'+(f.overdueCount||0)+' cobrança(s) · '+money370(f.totalOverdue||0)+'</div>';
    if(f.nextDue)return'<b>Regular</b><div class="tiny muted">Próximo: '+day370(f.nextDue)+'</div>';
    return'<span class="muted">Sem cobrança aberta</span>';
  }
  function automation370(s){
    if(!s.contractAllowsSuspend)return'<span class="status">Sem autorização contratual</span>';
    if(!s.autoSuspend)return'<span class="status">Controle manual</span>';
    return'<span class="status ok">Auto após '+Number(s.graceDays||0)+'d</span><div class="tiny muted">'+(s.autoResume?'reativa ao regularizar':'reativação manual')+'</div>';
  }

  const prevBuildNav370=buildNav;
  buildNav=function(){
    prevBuildNav370();
    const nav2=$('nav2');
    if(nav2&&!document.querySelector('[data-sec="wordpress"]')){
      nav2.insertAdjacentHTML('beforeend','<button data-sec="wordpress" onclick="openSec(\'wordpress\')"><span class="ico">W</span><span>Sites WordPress</span><span id="badge_wordpress" class="badge hidden"></span></button>');
    }
    markNav();
  };

  const prevRender370=render;
  render=function(){
    if(S.active==='wordpress'){renderWordPress370();return}
    prevRender370();
  };

  async function loadWordPress370(force=false){
    if(WP370.loading)return;
    if(WP370.data&&!force)return;
    WP370.loading=true;
    try{WP370.data=await api('/api/web/wordpress-control')}
    catch(e){if(role370()>=2)toast(e.message,6000)}
    finally{WP370.loading=false;if(S.active==='wordpress')renderWordPress370();updateWpBadge370()}
  }
  window.loadWordPress370=loadWordPress370;

  function summary370(d){
    const s=d.summary||{};
    return'<div class="grid kpis wp370-kpis">'+
      kpi('Sites conectados',s.total||0,'WordPress gerenciados')+
      kpi('Online',s.online||0,'respondendo agora')+
      kpi('Suspensos',s.suspended||0,'modo temporário 503')+
      kpi('Com atraso',s.overdue||0,'financeiro em aberto')+
      kpi('Automáticos',s.automatic||0,'regra de suspensão ativa')+
    '</div>';
  }

  function templateCards371(c){
    const keys=['institutional','financial','premium'];
    return '<div class="wp371-template-grid">'+keys.map(k=>{
      const t=c.templates?.[k]||{},pct=k==='premium'?72:k==='financial'?62:68;
      return '<article class="wp371-template-card">'+
        '<div class="wp371-mini '+k+'" style="--a:'+e370(t.accent||'#18b7a4')+';--bg:'+e370(t.background||'#0d0f12')+';--card:'+e370(t.card||'#15181d')+';--tx:'+e370(t.text||'#fff')+'">'+
          '<span>'+e370(t.eyebrow||'')+'</span><b>'+e370(t.title||'Modelo')+'</b><small>'+e370(t.subtitle||'')+'</small>'+
          '<i><em style="width:'+pct+'%"></em></i>'+
        '</div>'+
        '<div class="wp371-template-meta"><div><b>'+e370(t.name||k)+'</b><div class="tiny muted">'+e370(t.progressLabel||'Barra de progresso')+'</div></div><button class="btn sm" onclick="openWpTemplateDesigner371(\''+k+'\')">Editar modelo</button></div>'+
      '</article>';
    }).join('')+'</div>';
  }
  function config370(d){
    if(!master370()||!WP370.showConfig)return'';
    const c=d.config||{};
    return'<div class="card wp370-config">'+
      '<div class="wp370-config-head"><div><div class="eyebrow">AUTOMAÇÃO WORDPRESS</div><h3>Regras globais de suspensão</h3><p class="help">A automação só atua em sites cujo cliente tenha autorização contratual marcada e auto suspensão ativada.</p></div><span class="status '+(c.automationEnabled?'ok':'warn')+'">'+(c.automationEnabled?'Automação ativa':'Automação desativada')+'</span></div>'+
      '<div class="grid cols2">'+
        '<div class="field"><label>Carência padrão (dias)</label><input id="wp370_grace" class="input" type="number" min="0" max="90" value="'+e370(c.defaultGraceDays??7)+'"></div>'+
        '<div class="field"><label>Retry-After da página 503 (segundos)</label><input id="wp370_retry" class="input" type="number" min="60" max="86400" value="'+e370(c.retryAfterSeconds??3600)+'"></div>'+
        '<div class="field wide"><label>Título da página temporária</label><input id="wp370_title" class="input" value="'+e370(c.suspendTitle||'Site temporariamente indisponível')+'"></div>'+
        '<div class="field wide"><label>Mensagem pública</label><textarea id="wp370_message" rows="3">'+e370(c.suspendMessage||'Este site está temporariamente indisponível. Tente novamente mais tarde.')+'</textarea></div>'+
      '</div>'+
      '<div class="wp371-designer-block"><div class="eyebrow">DESIGNER DA PÁGINA 503</div><h3>3 modelos editáveis</h3><p class="help">Edite textos, cores, botão e barra de progresso. Cada site escolhe um modelo e pode ter mensagem/progresso próprios.</p>'+templateCards371(c)+'</div>'+
      '<label class="wp370-check"><input id="wp370_auto" type="checkbox" '+(c.automationEnabled?'checked':'')+'><span>Ativar avaliação automática de inadimplência</span></label>'+
      '<label class="wp370-check"><input id="wp370_resume" type="checkbox" '+(c.autoResume!==false?'checked':'')+'><span>Reativar automaticamente sites suspensos pelo EXE PRO quando não houver mais atraso</span></label>'+
      '<div class="actions" style="margin-top:12px"><button class="btn primary" onclick="saveWpConfig370()">Salvar regras</button><button class="btn" onclick="WP370Config(false)">Fechar</button></div>'+
    '</div>';
  }

  function table370(d){
    const sites=d.sites||[];
    if(!sites.length)return'<div class="card"><div class="empty">Nenhum site WordPress conectado. Instale o EXE PRO Connector no WordPress do cliente e clique em “Conectar site”.</div></div>';
    return'<div class="table-wrap"><table class="table wp370-table"><thead><tr><th>Cliente / site</th><th>Financeiro</th><th>Status</th><th>Automação</th><th>Última verificação</th><th>Ações</th></tr></thead><tbody>'+
      sites.map(s=>{
        const p=s.leadPayload||{};
        return'<tr>'+
          '<td><b>'+e370(p.name||p.companyName||'Cliente')+'</b><div><a href="'+e370(s.siteUrl)+'" target="_blank" rel="noopener">'+e370(s.label||s.siteUrl)+'</a></div><div class="tiny muted">'+e370(s.siteUrl)+'</div></td>'+
          '<td>'+finance370(s)+'</td>'+
          '<td>'+status370(s)+(s.lastError?'<div class="tiny wp370-error">'+e370(s.lastError)+'</div>':'')+'</td>'+
          '<td>'+automation370(s)+'<div class="tiny muted" style="margin-top:5px">Modelo: '+e370(({institutional:'Institucional',financial:'Financeiro discreto',premium:'Premium'})[s.templateKey]||s.templateKey||'Institucional')+' · '+e370(s.progressPercent||0)+'%</div></td>'+
          '<td>'+e370(s.lastCheckedAt?day370(s.lastCheckedAt):'Nunca')+'<div class="tiny muted">'+e370(s.lastAction||'')+'</div></td>'+
          '<td><div class="actions wp370-actions">'+
            (canAdmin370()?'<button class="btn sm" onclick="wpAction370(\''+e370(s.siteId)+'\',\'status\')">Testar</button>':'')+
            (canAdmin370()&&!s.remoteSuspended?'<button class="btn sm wp370-suspend-btn" '+(!s.contractAllowsSuspend?'disabled title="Marque autorização contratual primeiro"':'')+' onclick="wpAction370(\''+e370(s.siteId)+'\',\'suspend\')">Suspender</button>':'')+
            (canAdmin370()&&s.remoteSuspended?'<button class="btn sm primary" onclick="wpAction370(\''+e370(s.siteId)+'\',\'resume\')">Reativar</button>':'')+
            (canAdmin370()?'<button class="btn sm" onclick="wpPopup460Open(\''+e370(s.siteId)+'\')">Pop-up</button><button class="btn sm" onclick="openWpSiteModal370(\''+e370(s.siteId)+'\')">Editar</button><button class="btn sm danger369" onclick="removeWpSite370(\''+e370(s.siteId)+'\')">Remover</button>':'')+
          '</div></td>'+
        '</tr>';
      }).join('')+
    '</tbody></table></div>';
  }

  function renderWordPress370(){
    if(!WP370.data&&!WP370.loading)setTimeout(()=>loadWordPress370(true),0);
    const d=WP370.data;
    const actions=(canAdmin370()?'<button class="btn primary" onclick="openWpSiteModal370()">+ Conectar site</button><button class="btn" onclick="evaluateWp370()">⚡ Avaliar agora</button>':'')+
      (master370()?'<button class="btn" onclick="WP370Config(true)">⚙ Automação</button>':'')+
      '<a class="btn" href="/downloads/exe-pro-connector-v1.4.0.zip">⬇ Plugin WordPress 1.4</a>'+
      '<button class="btn" onclick="loadWordPress370(true)">↻ Atualizar</button>';
    $('content').innerHTML=
      head('WORDPRESS CLIENT CONTROL','Sites WordPress','Controle seguro de sites WordPress de clientes, integrado ao Financeiro e com reativação após regularização.',actions)+
      (d?summary370(d):'<div class="card"><div class="empty">Carregando sites WordPress...</div></div>')+
      (d?config370(d):'')+
      '<div class="notice wp370-legal"><b>Proteção operacional:</b> suspensão automática só funciona quando a autorização contratual estiver marcada no site do cliente. O plugin não apaga conteúdo: ele entrega uma página temporária com HTTP 503 e mantém o wp-admin acessível.</div>'+
      (d?table370(d):'');
    updateWpBadge370();
  }

  window.openWpTemplateDesigner371=function(key){
    const c=WP370.data?.config||{},t=c.templates?.[key]||{};
    $('modalEyebrow').textContent='WORDPRESS MAINTENANCE DESIGNER';
    $('modalTitle').textContent='Editar modelo · '+(t.name||key);
    $('modalMeta').textContent='Visual exibido ao visitante quando o site estiver temporariamente suspenso.';
    $('modalBody').innerHTML='<div class="wp371-designer-modal">'+
      '<div class="grid cols2">'+
        '<div class="field"><label>NOME DO MODELO</label><input id="wpt371_name" class="input" value="'+e370(t.name||'')+'"></div>'+
        '<div class="field"><label>SELO / EYEBROW</label><input id="wpt371_eyebrow" class="input" value="'+e370(t.eyebrow||'')+'"></div>'+
        '<div class="field wide"><label>TÍTULO</label><input id="wpt371_title" class="input" value="'+e370(t.title||'')+'"></div>'+
        '<div class="field wide"><label>SUBTÍTULO</label><input id="wpt371_subtitle" class="input" value="'+e370(t.subtitle||'')+'"></div>'+
        '<div class="field wide"><label>MENSAGEM</label><textarea id="wpt371_message" rows="4">'+e370(t.message||'')+'</textarea></div>'+
        '<div class="field"><label>TEXTO DA BARRA</label><input id="wpt371_progress" class="input" value="'+e370(t.progressLabel||'')+'"></div>'+
        '<div class="field"><label>TEXTO DO BOTÃO</label><input id="wpt371_button" class="input" value="'+e370(t.buttonLabel||'')+'"></div>'+
        '<div class="field wide"><label>LINK DO BOTÃO</label><input id="wpt371_url" class="input" value="'+e370(t.buttonUrl||'')+'" placeholder="https://... (opcional)"></div>'+
        '<div class="field"><label>COR DE DESTAQUE</label><input id="wpt371_accent" class="input" type="color" value="'+e370(t.accent||'#18b7a4')+'"></div>'+
        '<div class="field"><label>FUNDO</label><input id="wpt371_bg" class="input" type="color" value="'+e370(t.background||'#0d0f12')+'"></div>'+
        '<div class="field"><label>CARTÃO</label><input id="wpt371_card" class="input" type="color" value="'+e370(t.card||'#15181d')+'"></div>'+
        '<div class="field"><label>TEXTO</label><input id="wpt371_text" class="input" type="color" value="'+e370(t.text||'#ffffff')+'"></div>'+
      '</div>'+
      '<label class="wp370-check"><input id="wpt371_show" type="checkbox" '+(t.showProgress!==false?'checked':'')+'><span>Mostrar barra de progresso</span></label>'+
      '<div class="actions" style="margin-top:14px"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveWpTemplate371(\''+key+'\')">Salvar modelo</button></div>'+
    '</div>';
    $('modalBack').classList.remove('hidden');
  };
  window.saveWpTemplate371=async function(key){
    try{
      const c=JSON.parse(JSON.stringify(WP370.data?.config||{}));c.templates=c.templates||{};
      c.templates[key]={...(c.templates[key]||{}),key,
        name:$('wpt371_name').value.trim(),eyebrow:$('wpt371_eyebrow').value.trim(),title:$('wpt371_title').value.trim(),
        subtitle:$('wpt371_subtitle').value.trim(),message:$('wpt371_message').value.trim(),progressLabel:$('wpt371_progress').value.trim(),
        buttonLabel:$('wpt371_button').value.trim(),buttonUrl:$('wpt371_url').value.trim(),accent:$('wpt371_accent').value,
        background:$('wpt371_bg').value,card:$('wpt371_card').value,text:$('wpt371_text').value,showProgress:$('wpt371_show').checked
      };
      WP370.data=await api('/api/web/wordpress-control/config',{method:'PATCH',body:JSON.stringify({templates:c.templates})});
      closeModal();toast('Modelo WordPress atualizado.');WP370.showConfig=true;renderWordPress370();
    }catch(e){toast(e.message,7000)}
  };

  window.WP370Config=function(v){WP370.showConfig=!!v;renderWordPress370()};
  window.saveWpConfig370=async function(){
    try{
      const body={
        automationEnabled:$('wp370_auto').checked,
        autoResume:$('wp370_resume').checked,
        defaultGraceDays:Number($('wp370_grace').value||7),
        retryAfterSeconds:Number($('wp370_retry').value||3600),
        suspendTitle:$('wp370_title').value.trim(),
        suspendMessage:$('wp370_message').value.trim()
      };
      WP370.data=await api('/api/web/wordpress-control/config',{method:'PATCH',body:JSON.stringify(body)});
      WP370.showConfig=false;toast('Automação WordPress atualizada.');renderWordPress370();
    }catch(e){toast(e.message,7000)}
  };

  function clientOptions370(selected){
    return clients370().map(r=>{
      const p=r.payload||{},name=p.name||p.companyName||r.entityId;
      return'<option value="'+e370(r.entityId)+'" '+(r.entityId===selected?'selected':'')+'>'+e370(name)+'</option>';
    }).join('');
  }
  window.openWpSiteModal370=function(id='',leadId=''){
    const s=id?site370(id):null,config=WP370.data?.config||{};
    $('modalEyebrow').textContent='WORDPRESS CLIENT CONTROL';
    $('modalTitle').textContent=s?'Editar site WordPress':'Conectar site WordPress';
    $('modalMeta').textContent='Instale o plugin EXE PRO Connector no WordPress e informe a chave exibida em Configurações → EXE PRO Connector.';
    const selectedLead=s?.leadId||leadId||clients370()[0]?.entityId||'';
    $('modalBody').innerHTML=
      '<div class="wp370-modal">'+
        '<div class="notice"><b>1.</b> Instale o <a href="/downloads/exe-pro-connector-v1.4.0.zip">EXE PRO Connector 1.4</a> no WordPress. <b>2.</b> Copie a Chave de conexão. <b>3.</b> Cadastre abaixo. Não informe usuário ou senha do WordPress.</div>'+
        '<div class="grid cols2" style="margin-top:12px">'+
          '<div class="field"><label>CLIENTE</label><select id="wps370_lead">'+clientOptions370(selectedLead)+'</select></div>'+
          '<div class="field"><label>APELIDO DO SITE</label><input id="wps370_label" class="input" value="'+e370(s?.label||'')+'" placeholder="Site principal"></div>'+
          '<div class="field wide"><label>URL WORDPRESS HTTPS *</label><input id="wps370_url" class="input" value="'+e370(s?.siteUrl||'')+'" placeholder="https://cliente.com.br"></div>'+
          '<div class="field wide"><label>CHAVE DE CONEXÃO '+(s?'(deixe vazio para manter)':'*')+'</label><input id="wps370_key" class="input" type="password" autocomplete="new-password" placeholder="'+(s?'Deixe vazio para manter a chave atual':'Cole a chave exibida pelo plugin')+'"></div>'+
          '<div class="field"><label>CARÊNCIA (DIAS)</label><input id="wps370_grace" class="input" type="number" min="0" max="90" value="'+e370(s?.graceDays??config.defaultGraceDays??7)+'"></div>'+
          '<div class="field"><label>MODELO DA PÁGINA</label><select id="wps370_template"><option value="institutional" '+((s?.templateKey||config.defaultTemplate||'institutional')==='institutional'?'selected':'')+'>Institucional</option><option value="financial" '+((s?.templateKey||config.defaultTemplate)==='financial'?'selected':'')+'>Financeiro discreto</option><option value="premium" '+((s?.templateKey||config.defaultTemplate)==='premium'?'selected':'')+'>Manutenção premium</option></select></div>'+
          '<div class="field"><label>PROGRESSO (%)</label><input id="wps370_progress" class="input" type="number" min="0" max="100" value="'+e370(s?.progressPercent??65)+'"></div>'+
          '<div class="field wide"><label>SUBTÍTULO ESPECÍFICO <span class="muted tiny">(opcional)</span></label><input id="wps370_subtitle_override" class="input" value="'+e370(s?.design?.subtitleOverride||'')+'" placeholder="Deixe vazio para usar o modelo"></div>'+
          '<div class="field wide"><label>MENSAGEM ESPECÍFICA <span class="muted tiny">(opcional)</span></label><textarea id="wps370_message_override" rows="3" placeholder="Deixe vazio para usar a mensagem do modelo">'+e370(s?.design?.messageOverride||'')+'</textarea></div>'+
        '</div>'+
        '<label class="wp370-check"><input id="wps370_enabled" type="checkbox" '+(s?.enabled!==false?'checked':'')+'><span>Conexão ativa</span></label>'+
        '<label class="wp370-check wp370-contract"><input id="wps370_contract" type="checkbox" '+(s?.contractAllowsSuspend?'checked':'')+'><span><b>O contrato com este cliente permite suspensão por inadimplência</b></span></label>'+
        '<label class="wp370-check"><input id="wps370_auto" type="checkbox" '+(s?.autoSuspend?'checked':'')+'><span>Suspender automaticamente após a carência</span></label>'+
        '<label class="wp370-check"><input id="wps370_resume" type="checkbox" '+(s?.autoResume!==false?'checked':'')+'><span>Reativar automaticamente quando o financeiro for regularizado</span></label>'+
        '<div class="actions" style="margin-top:14px"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveWpSite370(\''+e370(s?.siteId||'')+'\')">'+(s?'Salvar alterações':'Conectar e testar')+'</button></div>'+
      '</div>';
    $('modalBack').classList.remove('hidden');
  };

  window.saveWpSite370=async function(id=''){
    try{
      const body={
        siteId:id||undefined,leadId:$('wps370_lead').value,siteUrl:$('wps370_url').value.trim(),label:$('wps370_label').value.trim(),
        connectionKey:$('wps370_key').value,graceDays:Number($('wps370_grace').value||7),enabled:$('wps370_enabled').checked,
        contractAllowsSuspend:$('wps370_contract').checked,autoSuspend:$('wps370_auto').checked,autoResume:$('wps370_resume').checked,
        templateKey:$('wps370_template').value,progressPercent:Number($('wps370_progress').value||65),
        subtitleOverride:$('wps370_subtitle_override').value.trim(),messageOverride:$('wps370_message_override').value.trim()
      };
      const method=id?'PATCH':'POST';
      const j=await api('/api/web/wordpress-sites',{method,body:JSON.stringify(body)});
      WP370.data=j.view||WP370.data;closeModal();toast(id?'Site WordPress atualizado.':'Site conectado. O EXE PRO tentou validar o plugin automaticamente.',5500);renderWordPress370();
    }catch(e){toast(e.message,7500)}
  };

  window.wpPopup460Open=async function(id){
    const s=site370(id);if(!s)return;
    $('modalEyebrow').textContent='WORDPRESS';$('modalTitle').textContent='Pop-up do site';$('modalMeta').textContent=s.label||s.siteUrl;
    $('modalBody').innerHTML='<div class=\'card\'><div class=\'empty\'>Carregando configuracao do pop-up...</div></div>';$('modalBack').classList.remove('hidden');
    try{
      const j=await api('/api/web/wordpress-sites/popup?siteId='+encodeURIComponent(id));
      const p=j.popup||{};
      $('modalBody').innerHTML='<div class=\'form-grid\'>'+        '<div class=\'field\'><label>STATUS</label><select id=\'wp460_enabled\' class=\'input\'><option value=\'off\''+(Number(p.enabled)?'':' selected')+'>Desativado</option><option value=\'on\''+(Number(p.enabled)?' selected':'')+'>Ativado</option></select></div>'+        '<div class=\'field\'><label>COR DE DESTAQUE</label><input id=\'wp460_accent\' class=\'input\' type=\'color\' value=\''+e370(String(p.accent_color||'#18b7a4'))+'\'></div>'+        '<div class=\'field wide\'><label>TITULO</label><input id=\'wp460_title\' class=\'input\' maxlength=\'180\' value=\''+e370(p.title||'')+'\'></div>'+        '<div class=\'field wide\'><label>MENSAGEM</label><textarea id=\'wp460_message\' rows=\'4\' maxlength=\'2000\'>'+e370(p.message||'')+'</textarea></div>'+        '<div class=\'field\'><label>TEXTO DO BOTAO</label><input id=\'wp460_btn\' class=\'input\' maxlength=\'80\' value=\''+e370(p.button_label||'')+'\'></div>'+        '<div class=\'field\'><label>LINK DO BOTAO</label><input id=\'wp460_url\' class=\'input\' placeholder=\'https://... (opcional)\' value=\''+e370(p.button_url||'')+'\'></div>'+        '<div class=\'field\'><label>EXIBIR EM</label><select id=\'wp460_show\' class=\'input\'><option value=\'all\''+(p.show_on==='home'?'':' selected')+'>Todas as paginas</option><option value=\'home\''+(p.show_on==='home'?' selected':'')+'>Somente a pagina inicial</option></select></div>'+        '<div class=\'field\'><label>FREQUENCIA</label><select id=\'wp460_freq\' class=\'input\'><option value=\'session\''+(p.frequency==='daily'||p.frequency==='always'?'':' selected')+'>Uma vez por sessao</option><option value=\'daily\''+(p.frequency==='daily'?' selected':'')+'>Uma vez a cada 24h</option><option value=\'always\''+(p.frequency==='always'?' selected':'')+'>Toda visita</option></select></div>'+        '<div class=\'field\'><label>ATRASO (SEGUNDOS)</label><input id=\'wp460_delay\' class=\'input\' type=\'number\' min=\'0\' max=\'30\' value=\''+e370(String(Number(p.delay_seconds||0)))+'\'></div>'+      '</div>'+      '<div class=\'actions\' style=\'margin-top:14px\'><button class=\'btn\' onclick=\'closeModal()\'>Cancelar</button><button class=\'btn primary\' onclick=\'wpPopup460Save(\''+e370(id)+'\')\'>Salvar no WordPress</button></div>';    }catch(err){
      $('modalBody').innerHTML='<div class=\'card\'><div class=\'empty\'>Falha ao consultar o pop-up: '+e370(String(err.message||err))+'</div></div>';    }
  };
  window.wpPopup460Save=async function(id){
    const payload={
      enabled:document.getElementById('wp460_enabled')?.value==='on',
      title:String(document.getElementById('wp460_title')?.value||''),
      message:String(document.getElementById('wp460_message')?.value||''),
      button_label:String(document.getElementById('wp460_btn')?.value||''),
      button_url:String(document.getElementById('wp460_url')?.value||'').trim(),
      accent_color:String(document.getElementById('wp460_accent')?.value||'#18b7a4'),
      show_on:String(document.getElementById('wp460_show')?.value||'all'),
      frequency:String(document.getElementById('wp460_freq')?.value||'session'),
      delay_seconds:Number(document.getElementById('wp460_delay')?.value||0)
    };
    try{
      await api('/api/web/wordpress-sites/popup',{method:'POST',body:JSON.stringify({siteId:id,popup:payload})});
      toast('Pop-up atualizado no WordPress.',6000);closeModal();
    }catch(err){toast(String(err.message||err),7000)}
  };
  window.wpAction370=async function(id,action){
    const s=site370(id);if(!s)return;
    if(action==='suspend'&&!confirm('Suspender temporariamente '+(s.label||s.siteUrl)+'? O frontend responderá HTTP 503, mas administradores continuarão acessando o wp-admin.'))return;
    if(action==='resume'&&!confirm('Reativar o site agora?'))return;
    try{
      WP370.data=await api('/api/web/wordpress-sites/action',{method:'POST',body:JSON.stringify({siteId:id,action})});
      toast(action==='status'?'Conexão WordPress testada.':action==='suspend'?'Site suspenso temporariamente.':'Site reativado.',5500);renderWordPress370();
    }catch(e){toast(e.message,7500);await loadWordPress370(true)}
  };

  window.evaluateWp370=async function(){
    if(!confirm('Avaliar agora todas as regras WordPress? Sites autorizados e com auto suspensão podem ser temporariamente suspensos se a carência já tiver sido ultrapassada.'))return;
    try{
      const j=await api('/api/web/wordpress-control/evaluate',{method:'POST',body:'{}'});
      WP370.data=j.view||WP370.data;toast('Avaliação: '+(j.suspended||0)+' suspenso(s), '+(j.resumed||0)+' reativado(s), '+(j.failed||0)+' falha(s).',6500);renderWordPress370();
    }catch(e){toast(e.message,7500)}
  };

  window.removeWpSite370=async function(id){
    const s=site370(id);if(!s)return;
    if(!confirm('Remover a conexão do EXE PRO com '+(s.label||s.siteUrl)+'? Isso não remove o plugin do WordPress.'))return;
    try{
      const j=await api('/api/web/wordpress-sites/remove',{method:'POST',body:JSON.stringify({siteId:id})});
      WP370.data=j.view||WP370.data;toast('Conexão WordPress removida.');renderWordPress370();
    }catch(e){
      if(/ainda esta suspenso/i.test(e.message||'')&&confirm('O site ainda aparece como suspenso. Remover a conexão mesmo assim? Você terá que reativá-lo pelo wp-admin do WordPress.')){
        try{const j=await api('/api/web/wordpress-sites/remove',{method:'POST',body:JSON.stringify({siteId:id,force:true})});WP370.data=j.view||WP370.data;toast('Conexão removida de forma forçada.');renderWordPress370()}catch(e2){toast(e2.message,7500)}
      }else toast(e.message,7500)
    }
  };

  function updateWpBadge370(){
    const b=$('badge_wordpress'),n=Number(WP370.data?.summary?.suspended||0)+Number(WP370.data?.summary?.error||0);
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }

  const prevShowEntity370=showEntityModal;
  showEntityModal=function(r){
    prevShowEntity370(r);
    if(r?.entityType!=='lead'||!isClient(r.payload||{}))return;
    setTimeout(()=>injectWpClient370(r),0);
  };
  function injectWpClient370(r){
    const body=$('modalBody');if(!body||document.getElementById('wpClientCard370'))return;
    if(!WP370.data){loadWordPress370(true).then(()=>{setTimeout(()=>injectWpClient370(r),20)});return}
    const sites=sitesForLead370(r.entityId);
    const cards=sites.length?sites.map(s=>'<div class="wp370-client-site"><div><b>'+e370(s.label||s.siteUrl)+'</b><div class="tiny muted">'+e370(s.siteUrl)+'</div></div><div>'+status370(s)+'</div><div class="actions"><button class="btn sm" onclick="closeModal();openSec(\'wordpress\')">Gerenciar</button></div></div>').join(''):'<div class="muted">Nenhum WordPress conectado a este cliente.</div>';
    body.insertAdjacentHTML('beforeend','<div id="wpClientCard370" class="card wp370-client-card"><div class="wp370-client-head"><div><div class="eyebrow">WORDPRESS CLIENT CONTROL</div><h3>Sites do cliente</h3></div>'+(canAdmin370()?'<button class="btn sm primary" onclick="closeModal();openSec(\'wordpress\');setTimeout(()=>openWpSiteModal370(\'\',\''+e370(r.entityId)+'\'),100)">+ Conectar</button>':'')+'</div>'+cards+'</div>');
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{buildNav()}catch{}},350));
  setTimeout(()=>{if(S?.session)loadWordPress370(true)},2200);
})();
