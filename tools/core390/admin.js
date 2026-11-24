'use strict';
(function(){
  const C390={data:null,loading:false,tab:'overview'};

  function e390(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function rank390(){try{return roleRank(S.session?.user?.role||'')}catch{return 1}}
  function can390(){return rank390()>=3}
  function admin390(){return rank390()>=4}
  function master390(){try{return isMaster()}catch{return false}}
  function n390(v){return Number(v||0).toLocaleString('pt-BR')}
  function bytes390(v){
    let n=Number(v||0);if(n<1024)return n390(n)+' B';
    if(n<1048576)return(n/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' KB';
    if(n<1073741824)return(n/1048576).toLocaleString('pt-BR',{maximumFractionDigits:1})+' MB';
    return(n/1073741824).toLocaleString('pt-BR',{maximumFractionDigits:2})+' GB';
  }
  function when390(v){if(!v)return'—';try{return new Date(v).toLocaleString('pt-BR')}catch{return String(v)}}
  function yesno390(v){return'<span class="status '+(v?'ok':'bad')+'">'+(v?'OK':'Pendente')+'</span>'}
  function severity390(v){const s=String(v||'info').toLowerCase();return s==='error'?'bad':s==='warn'?'warn':'ok'}
  function jobLabel390(k){return({notifications:'Notificações',wordpress:'WordPress Control',billing:'Financeiro recorrente'})[k]||k}
  function jobStatus390(s){return'<span class="status '+(/Concluido/i.test(s)?'ok':/Falhou/i.test(s)?'bad':/Executando/i.test(s)?'warn':'')+'">'+e390(s)+'</span>'}

  const oldBuild390=buildNav;
  buildNav=function(){
    oldBuild390();
    const nav2=$('nav2');
    if(nav2&&can390()&&!document.querySelector('[data-sec="core390"]')){
      nav2.insertAdjacentHTML('beforeend','<button data-sec="core390" onclick="openSec(\'core390\')"><span class="ico">SYS</span><span>Saúde do Core</span><span id="badge_core390" class="badge hidden"></span></button>');
    }
    markNav();
  };
  const oldRender390=render;
  render=function(){
    if(S.active==='core390'){renderCore390();return}
    oldRender390();
  };

  async function loadCore390(force=false){
    if(!can390())return;
    if(C390.loading)return;
    if(C390.data&&!force)return;
    C390.loading=true;
    try{C390.data=await api('/api/web/core-status')}
    catch(err){toast(err.message,7000)}
    finally{C390.loading=false;if(S.active==='core390')renderCore390();badge390()}
  }
  window.loadCore390=loadCore390;

  function badge390(){
    const b=$('badge_core390');if(!b||!C390.data)return;
    const d=C390.data;
    const n=(d.database?.missingTables?.length||0)+(d.notifications?.failed||0)+(d.wordpress?.errors||0)+(d.jobs?.recent||[]).filter(x=>x.status==='Falhou').slice(0,5).length;
    b.textContent=n;b.classList.toggle('hidden',!n);
  }

  function summary390(){
    const d=C390.data||{},sync=d.sync||{},portal=d.portal||{},billing=d.billing||{},wp=d.wordpress||{};
    return'<div class="grid kpis c390-kpis">'+
      kpi('Core',d.version||'—',d.ok?'operacional':'requer atenção')+
      kpi('Banco',bytes390(d.database?.sizeBytes),'PostgreSQL')+
      kpi('Registros',n390((sync.entities||[]).reduce((a,x)=>a+Number(x.active||0),0)),'entidades ativas')+
      kpi('Mudanças Sync',n390(sync.changes),'seq '+n390(sync.lastSeq))+
      kpi('Portal',n390(portal.ticketsOpen),'chamados abertos')+
      kpi('WordPress',n390(wp.errors),'site(s) com erro')+
      kpi('Financeiro',n390(billing.automatic),'perfil(is) automático(s)')+
    '</div>';
  }
  function tabs390(){
    return'<div class="c390-tabs">'+
      '<button class="btn '+(C390.tab==='overview'?'primary':'')+'" onclick="coreTab390(\'overview\')">Visão geral</button>'+
      '<button class="btn '+(C390.tab==='jobs'?'primary':'')+'" onclick="coreTab390(\'jobs\')">Jobs</button>'+
      '<button class="btn '+(C390.tab==='modules'?'primary':'')+'" onclick="coreTab390(\'modules\')">Módulos</button>'+
      '<button class="btn '+(C390.tab==='events'?'primary':'')+'" onclick="coreTab390(\'events\')">Eventos</button>'+
    '</div>';
  }
  window.coreTab390=function(t){C390.tab=t;renderCore390()};

  function overview390(){
    const d=C390.data||{},sec=d.security||{},int=d.integrations||{},sess=d.sessions||{},nt=d.notifications||{},wp=d.wordpress||{},p=d.portal||{},seo=d.seo||{},b=d.billing||{};
    return'<div class="grid cols2 c390-overview">'+
      '<div class="card"><div class="card-head"><div><div class="eyebrow">INFRAESTRUTURA</div><h3>Banco e sincronização</h3></div>'+yesno390(!d.database?.missingTables?.length)+'</div>'+
        '<div class="c390-list"><div><span>Banco</span><b>'+e390(d.database?.name||'—')+'</b></div><div><span>Tamanho</span><b>'+bytes390(d.database?.sizeBytes)+'</b></div><div><span>Instalações Windows</span><b>'+n390(d.sync?.installations)+'</b></div><div><span>Último seq</span><b>'+n390(d.sync?.lastSeq)+'</b></div><div><span>Último Windows visto</span><b>'+e390(when390(d.sync?.lastInstallationSeen))+'</b></div></div>'+
      '</div>'+
      '<div class="card"><div class="card-head"><div><div class="eyebrow">SEGURANÇA</div><h3>Configurações essenciais</h3></div></div>'+
        '<div class="c390-checks"><div>'+yesno390(sec.httpsRequired)+'<span>HTTPS obrigatório</span></div><div>'+yesno390(sec.cloudKeyConfigured)+'<span>Chave Sync</span></div><div>'+yesno390(sec.secretKeyConfigured)+'<span>Chave de segredos</span></div><div>'+yesno390(int.whatsappConfigured)+'<span>WhatsApp</span></div><div>'+yesno390(int.telegramConfigured)+'<span>Telegram</span></div><div>'+yesno390(int.pageSpeedKeyConfigured)+'<span>PageSpeed Key</span></div></div>'+
      '</div>'+
      '<div class="card"><div class="card-head"><div><div class="eyebrow">SESSÕES</div><h3>Acessos ativos</h3></div></div><div class="c390-list"><div><span>Admin</span><b>'+n390(sess.webTotal)+'</b></div><div><span>Admin expiradas</span><b>'+n390(sess.webExpired)+'</b></div><div><span>Portal</span><b>'+n390(sess.portalTotal)+'</b></div><div><span>Portal expiradas</span><b>'+n390(sess.portalExpired)+'</b></div></div></div>'+
      '<div class="card"><div class="card-head"><div><div class="eyebrow">OPERAÇÃO</div><h3>Saúde dos módulos</h3></div></div><div class="c390-list"><div><span>Notificações pendentes</span><b>'+n390(nt.pending)+'</b></div><div><span>Notificações com falha</span><b class="'+(nt.failed?'bad-text':'')+'">'+n390(nt.failed)+'</b></div><div><span>Sites WordPress</span><b>'+n390(wp.total)+'</b></div><div><span>WordPress com erro</span><b class="'+(wp.errors?'bad-text':'')+'">'+n390(wp.errors)+'</b></div><div><span>Chamados abertos</span><b>'+n390(p.ticketsOpen)+'</b></div><div><span>Arquivos Portal</span><b>'+bytes390(p.fileBytes)+'</b></div><div><span>Relatórios SEO</span><b>'+n390(seo.reports)+'</b></div><div><span>Perfis recorrentes</span><b>'+n390(b.profiles)+'</b></div></div></div>'+
    '</div>';
  }

  function jobs390(){
    const d=C390.data||{},runs=d.jobs?.recent||[],locks=d.jobs?.activeLocks||[];
    const buttons=admin390()?'<div class="c390-job-actions"><button class="btn" onclick="runCoreJob390(\'notifications\')">Executar Notificações</button><button class="btn" onclick="runCoreJob390(\'wordpress\')">Executar WordPress</button><button class="btn" onclick="runCoreJob390(\'billing\')">Executar Financeiro</button></div>':'';
    return'<div class="card"><div class="card-head"><div><div class="eyebrow">SCHEDULERS</div><h3>Jobs protegidos por lock PostgreSQL</h3><p class="help">Evita execução duplicada quando a Cloud tiver mais de um processo/instância.</p></div></div>'+buttons+
      (locks.length?'<div class="notice c390-locks">'+locks.map(x=>'<b>'+e390(jobLabel390(x.job_key))+'</b> até '+e390(when390(x.locked_until))).join(' · ')+'</div>':'<div class="notice">Nenhum job está bloqueado neste momento.</div>')+
      '</div>'+
      (runs.length?'<div class="table-wrap"><table class="table c390-table"><thead><tr><th>Job</th><th>Status</th><th>Início</th><th>Duração</th><th>Resultado / erro</th></tr></thead><tbody>'+runs.map(r=>'<tr><td><b>'+e390(jobLabel390(r.job_key))+'</b></td><td>'+jobStatus390(r.status)+'</td><td>'+e390(when390(r.started_at))+'</td><td>'+e390(r.duration_ms==null?'—':r.duration_ms+' ms')+'</td><td><span class="tiny '+(r.error_text?'bad-text':'muted')+'">'+e390(r.error_text||JSON.stringify(r.result||{}).slice(0,260))+'</span></td></tr>').join('')+'</tbody></table></div>':'<div class="card"><div class="empty">Nenhuma execução registrada.</div></div>');
  }

  function modules390(){
    const d=C390.data||{},mods=d.modules||[],tables=d.database?.tables||[];
    return'<div class="grid cols2">'+
      '<div class="card"><div class="card-head"><div><div class="eyebrow">MÓDULOS</div><h3>Registro consolidado</h3></div></div><div class="c390-modules">'+mods.map(m=>'<div><div><b>'+e390(m.name)+'</b><span>v'+e390(m.version)+(m.critical?' · crítico':'')+'</span></div>'+yesno390(m.ok)+'</div>').join('')+'</div></div>'+
      '<div class="card"><div class="card-head"><div><div class="eyebrow">SCHEMA</div><h3>Tabelas essenciais</h3></div></div><div class="c390-tables">'+tables.map(t=>'<span class="'+(t.ok?'ok':'bad')+'">'+e390(t.table)+'</span>').join('')+'</div>'+
        (d.database?.missingTables?.length?'<div class="notice bad">Ausentes: '+e390(d.database.missingTables.join(', '))+'</div>':'<div class="notice">Schema completo para a versão 3.9.0.</div>')+
      '</div>'+
    '</div>';
  }

  function events390(){
    const a=C390.data?.events||[];
    return a.length?'<div class="card c390-events">'+a.map(x=>'<div class="c390-event"><span class="status '+severity390(x.severity)+'">'+e390(x.severity)+'</span><div><b>'+e390(x.source)+'</b><p>'+e390(x.message)+'</p><small>'+e390(when390(x.created_at))+'</small></div></div>').join('')+'</div>':'<div class="card"><div class="empty">Nenhum evento técnico registrado.</div></div>';
  }

  function renderCore390(){
    if(!can390()){$('content').innerHTML=head('SISTEMA','Saúde do Core','Acesso restrito.')+'<div class="card"><div class="empty">Seu perfil não possui permissão.</div></div>';return}
    if(!C390.data&&!C390.loading)setTimeout(()=>loadCore390(true),0);
    const actions='<a class="btn" href="/api/web/core-diagnostics?download=1" target="_blank">↓ Diagnóstico JSON</a>'+(master390()?'<button class="btn" onclick="cleanupCore390()">Limpar expirados</button>':'')+'<button class="btn" onclick="loadCore390(true)">↻ Atualizar</button>';
    $('content').innerHTML=head('CORE & ESTABILIDADE','Saúde do Core','Diagnóstico central, schedulers protegidos, integridade do banco e estado dos módulos.',actions)+
      (C390.data?summary390():'<div class="card"><div class="empty">Carregando diagnóstico...</div></div>')+
      (C390.data?tabs390():'')+
      (C390.data?(C390.tab==='jobs'?jobs390():C390.tab==='modules'?modules390():C390.tab==='events'?events390():overview390()):'');
    badge390();
  }

  window.runCoreJob390=async function(jobKey){
    if(!admin390())return;
    if(!confirm('Executar agora o job '+jobLabel390(jobKey)+'?'))return;
    try{
      const j=await api('/api/web/core-jobs/run',{method:'POST',body:JSON.stringify({jobKey})});
      C390.data=j.status;toast('Job '+jobLabel390(jobKey)+' concluído.');C390.tab='jobs';renderCore390();
    }catch(err){toast(err.message,8000);await loadCore390(true)}
  };
  window.cleanupCore390=async function(){
    if(!master390()||!confirm('Remover sessões expiradas, guards antigos e histórico técnico com mais de 90 dias?'))return;
    try{
      const j=await api('/api/web/core-cleanup',{method:'POST',body:'{}'});C390.data=j.status;
      toast('Limpeza concluída: '+((j.webSessions||0)+(j.portalSessions||0))+' sessão(ões) expirada(s) removida(s).',6000);renderCore390();
    }catch(err){toast(err.message,7000)}
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{buildNav()}catch{}},650));
  setTimeout(()=>{if(S?.session&&can390())loadCore390(true)},4300);
})();