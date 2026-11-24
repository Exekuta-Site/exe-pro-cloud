'use strict';
(function(){
  const PT391={loading:false};
  const baseDashboard391=dashboard;
  const baseRender391=render;

  function task391p(id){return (P.tasks391||[]).find(x=>x.taskId===id)||null}
  function status391p(v){return statusBadge(v==='Concluida'?'Concluída':v)}
  function dt391p(v){if(!v)return'—';try{return new Date(v).toLocaleDateString('pt-BR')}catch{return date(v)}}
  function project391p(t){return t.project?.title||t.project?.name||''}

  async function loadPortalTasks391(force=false){
    if(PT391.loading)return P.tasks391;
    if(P.tasks391&&!force)return P.tasks391;
    PT391.loading=true;
    try{const j=await api('/api/portal/tasks');P.tasks391=j.tasks||[];P.tasks391Summary=j.summary||{};return P.tasks391}
    catch(err){console.error(err);P.tasks391=[];P.tasks391Summary={};return P.tasks391}
    finally{PT391.loading=false}
  }
  window.loadPortalTasks391=loadPortalTasks391;

  function ensureTaskNav391(){
    const side=document.querySelector('.sidebar');if(!side||document.getElementById('portalTasks391'))return;
    const foot=side.querySelector('.sidebar-foot');
    const html='<button class="navbtn" data-page="tasks391" id="portalTasks391" onclick="goPortalTasks391()">Acompanhamento <span id="pt391Badge" class="op381-badge hidden"></span></button>';
    if(foot)foot.insertAdjacentHTML('beforebegin',html);else side.insertAdjacentHTML('beforeend',html);
  }
  window.goPortalTasks391=async function(id=''){P.page='tasks391';P.task391Selected=id||'';await loadPortalTasks391(false);render()};

  function badge391p(){
    const b=document.getElementById('pt391Badge'),n=Number(P.tasks391Summary?.waitingClient||0);
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }

  dashboard=function(){
    let h=baseDashboard391();
    if(P.tasks391===undefined)setTimeout(()=>loadPortalTasks391(false).then(()=>{if(P.page==='dashboard')render()}),0);
    const s=P.tasks391Summary||{},a=P.tasks391||[];
    if(!a.length)return h;
    h+='<div class="card pt391-dashboard"><div class="card-head"><div><div class="eyebrow">ACOMPANHAMENTO</div><h3>Tarefas e entregas</h3><p class="muted tiny">Veja o andamento do trabalho que sua equipe EXEKUTA publicou para acompanhamento.</p></div><button class="btn" onclick="goPortalTasks391()">Ver acompanhamento</button></div>'+
      '<div class="pt391-mini"><div><span>Ativas</span><b>'+e(s.active||0)+'</b></div><div><span>Em andamento</span><b>'+e(s.inProgress||0)+'</b></div><div><span>Aguardando você</span><b>'+e(s.waitingClient||0)+'</b></div><div><span>Concluídas</span><b>'+e(s.completed||0)+'</b></div></div></div>';
    return h;
  };

  function list391p(){
    const a=P.tasks391||[],active=a.filter(x=>!['Concluida','Cancelada'].includes(x.status)),done=a.filter(x=>x.status==='Concluida');
    return'<div class="hero"><div><div class="eyebrow">ACOMPANHAMENTO</div><h2>Tarefas e entregas</h2><p>Acompanhe o que está em execução, o que depende da sua resposta e o que já foi concluído.</p></div></div>'+
      '<div class="kpis pt391-kpis"><div class="kpi"><span>Ativas</span><b>'+active.length+'</b></div><div class="kpi"><span>Em andamento</span><b>'+active.filter(x=>x.status==='Em andamento').length+'</b></div><div class="kpi"><span>Aguardando você</span><b>'+active.filter(x=>x.status==='Aguardando cliente').length+'</b></div><div class="kpi"><span>Concluídas</span><b>'+done.length+'</b></div></div>'+
      (a.length?'<div class="pt391-grid">'+a.map(t=>'<article class="card pt391-card"><div class="card-head"><div><div class="eyebrow">'+e(t.priority||'Normal')+'</div><h3>'+e(t.title)+'</h3><div class="tiny muted">'+e(project391p(t)||'Atividade geral')+'</div></div>'+status391p(t.status)+'</div><p>'+e(t.description||'')+'</p>'+(t.checklist?.length?'<div class="progress"><span style="width:'+Math.max(0,Math.min(100,t.checklistProgress||0))+'%"></span></div><div class="tiny muted">'+e(t.checklistProgress||0)+'% concluído</div>':'')+'<div class="pt391-card-foot"><span class="tiny muted">Prazo: '+dt391p(t.dueAt)+'</span><button class="btn" onclick="goPortalTasks391(\''+e(t.taskId)+'\')">Abrir</button></div></article>').join('')+'</div>':'<div class="card empty">Nenhuma tarefa publicada para acompanhamento.</div>');
  }

  function detail391p(t){
    const checks=t.checklist||[],comments=t.comments||[];
    return'<div class="pt391-detail"><div class="hero"><div><div class="eyebrow">ACOMPANHAMENTO</div><h2>'+e(t.title)+'</h2><p>'+e(project391p(t)||'Atividade geral')+' · Prazo '+dt391p(t.dueAt)+'</p></div><div class="support"><button class="btn" onclick="goPortalTasks391()">← Voltar</button>'+status391p(t.status)+'</div></div>'+
      '<div class="grid2"><div class="card"><div class="eyebrow">DESCRIÇÃO</div><h3>O que está sendo feito</h3><p>'+e(t.description||'Sem descrição pública.')+'</p>'+(checks.length?'<div class="pt391-checklist"><div class="eyebrow">CHECKLIST</div>'+checks.map(x=>'<div class="'+(x.done?'done':'')+'"><span>'+(x.done?'✓':'○')+'</span><b>'+e(x.label)+'</b></div>').join('')+'</div>':'')+'</div>'+
      '<div class="card"><div class="eyebrow">STATUS</div><h3>'+e(t.status==='Concluida'?'Concluída':t.status)+'</h3><div class="pt391-facts"><div><span>Prioridade</span><b>'+e(t.priority)+'</b></div><div><span>Prazo</span><b>'+dt391p(t.dueAt)+'</b></div><div><span>Progresso</span><b>'+e(t.checklistProgress||0)+'%</b></div><div><span>Atualizado</span><b>'+dt391p(t.updatedAt)+'</b></div></div></div></div>'+
      '<div class="card"><div class="card-head"><div><div class="eyebrow">CONVERSA</div><h3>Comentários da tarefa</h3></div></div><div class="pt391-comments">'+(comments.length?comments.map(c=>'<div class="pt391-comment '+(c.authorType==='Cliente'?'client':'team')+'"><div class="tiny muted">'+e(c.authorName||c.authorType)+' · '+dt391p(c.createdAt)+'</div><p>'+e(c.body)+'</p></div>').join(''):'<div class="empty">Nenhum comentário publicado ainda.</div>')+'</div><div class="field"><label>ENVIAR COMENTÁRIO</label><textarea id="pt391Comment" rows="4" maxlength="6000" placeholder="Escreva sua resposta ou observação..."></textarea></div><div class="actions"><button class="btn primary" onclick="sendTaskComment391(\''+e(t.taskId)+'\')">Enviar comentário</button></div></div>'+
    '</div>';
  }

  function page391p(){
    if(P.task391Selected){const t=task391p(P.task391Selected);if(t)return detail391p(t)}
    return list391p();
  }
  window.sendTaskComment391=async function(id){
    const body=document.getElementById('pt391Comment')?.value.trim()||'';if(!body)return;
    try{const j=await api('/api/portal/tasks/comment',{method:'POST',body:JSON.stringify({taskId:id,body})});P.tasks391=j.view?.tasks||[];P.tasks391Summary=j.view?.summary||{};render()}catch(err){alert(err.message)}
  };

  render=function(){
    ensureTaskNav391();
    if(P.page==='tasks391'){
      nav();document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page==='tasks391'));
      if(P.tasks391===undefined&&!PT391.loading){$('main').innerHTML='<div class="card empty">Carregando acompanhamento...</div>';setTimeout(()=>loadPortalTasks391(true).then(()=>render()),0);return}
      $('clientChip').textContent=P.data?.client?.name||'';$('userChip').textContent=P.data?.user?.username+' · '+roleLabel(P.data?.user?.role);
      $('main').innerHTML=page391p();badge391p();return;
    }
    baseRender391();badge391p();
  };

  setTimeout(async()=>{ensureTaskNav391();if(P.data){await loadPortalTasks391(false);if(P.page==='dashboard')render()}},1500);
})();