'use strict';
(function(){
  const T391={data:null,loading:false,view:'board',leadId:'',assigned:'',status:'',priority:'',editing:null};

  function e391(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function rank391(){try{return roleRank(S.session?.user?.role||'')}catch{return 1}}
  function canView391(){return rank391()>=2}
  function canEdit391(){return rank391()>=3}
  function canAdmin391(){return rank391()>=4}
  function me391(){return String(S.session?.user?.username||'')}
  function date391(v){try{return day(v)}catch{return String(v||'').slice(0,10)||'—'}}
  function dt391(v){if(!v)return'—';try{return new Date(v).toLocaleString('pt-BR')}catch{return String(v)}}
  function mins391(v){const n=Number(v||0);if(n<60)return n+' min';const h=Math.floor(n/60),m=n%60;return h+'h'+(m?(' '+m+'min'):'')}
  function statusLabel391(v){return v==='Concluida'?'Concluída':v}
  function slaClass391(s){return s?.overdue?'bad':s?.warning?'warn':/Concluido no prazo|Dentro do prazo/.test(s?.key||'')?'ok':''}
  function task391(id){return T391.data?.tasks?.find(x=>x.taskId===id)||null}
  function clientName391(id){const r=rows('lead').find(x=>x.entityId===id);return r?.payload?.name||r?.payload?.companyName||id||'Sem cliente'}
  function projectName391(id){return T391.data?.projects?.find(x=>x.projectId===id)?.title||''}
  function filtered391(){
    let a=[...(T391.data?.tasks||[])];
    if(T391.leadId)a=a.filter(x=>x.leadId===T391.leadId);
    if(T391.assigned)a=a.filter(x=>x.assignedUser===T391.assigned);
    if(T391.status)a=a.filter(x=>x.status===T391.status);
    if(T391.priority)a=a.filter(x=>x.priority===T391.priority);
    return a;
  }

  const oldBuild391=buildNav;
  buildNav=function(){
    oldBuild391();
    const nav2=$('nav2');
    if(nav2&&canView391()&&!document.querySelector('[data-sec="tasks391"]')){
      nav2.insertAdjacentHTML('beforeend','<button data-sec="tasks391" onclick="openSec(\'tasks391\')"><span class="ico">✓</span><span>Tarefas & SLA</span><span id="badge_tasks391" class="badge hidden"></span></button>');
    }
    markNav();
  };
  const oldRender391=render;
  render=function(){
    if(S.active==='tasks391'){renderTasks391();return}
    oldRender391();
  };

  async function load391(force=false){
    if(!canView391())return;
    if(T391.loading)return;
    if(T391.data&&!force)return;
    T391.loading=true;
    try{T391.data=await api('/api/web/tasks')}
    catch(err){toast(err.message,7000)}
    finally{T391.loading=false;if(S.active==='tasks391')renderTasks391();badge391()}
  }
  window.loadTasks391=load391;

  function badge391(){
    const b=$('badge_tasks391');if(!b||!T391.data)return;
    const s=T391.data.summary||{},n=Number(s.overdue||0)+Number(s.blocked||0);
    b.textContent=n;b.classList.toggle('hidden',!n);
  }
  function summary391(){
    const s=T391.data?.summary||{};
    return'<div class="grid kpis t391-kpis">'+
      kpi('Ativas',s.active||0,'tarefas em aberto')+
      kpi('Em andamento',s.inProgress||0,'execução')+
      kpi('Aguardando cliente',s.waitingClient||0,'dependências externas')+
      kpi('SLA estourado',s.overdue||0,'requer atenção')+
      kpi('Bloqueadas',s.blocked||0,'impedimentos')+
      kpi('Sem responsável',s.unassigned||0,'precisam distribuição')+
      kpi('Horas registradas',mins391(s.timeMinutes||0),'tempo acumulado')+
    '</div>';
  }
  function toolbar391(){
    const leads=rows('lead').filter(r=>isClient(r.payload||{})).sort((a,b)=>String(a.payload?.name||'').localeCompare(String(b.payload?.name||''),'pt-BR'));
    const leadOpts='<option value="">Todos os clientes</option>'+leads.map(r=>'<option value="'+e391(r.entityId)+'" '+(r.entityId===T391.leadId?'selected':'')+'>'+e391(r.payload?.name||r.payload?.companyName||r.entityId)+'</option>').join('');
    const team=T391.data?.team||[];
    const teamOpts='<option value="">Toda a equipe</option>'+team.map(u=>'<option value="'+e391(u.username)+'" '+(u.username===T391.assigned?'selected':'')+'>'+e391(u.username)+'</option>').join('');
    const stOpts='<option value="">Todos os status</option>'+['A fazer','Em andamento','Aguardando cliente','Bloqueada','Concluida','Cancelada'].map(x=>'<option value="'+x+'" '+(x===T391.status?'selected':'')+'>'+statusLabel391(x)+'</option>').join('');
    const prOpts='<option value="">Todas prioridades</option>'+['Urgente','Alta','Normal','Baixa'].map(x=>'<option '+(x===T391.priority?'selected':'')+'>'+x+'</option>').join('');
    return'<div class="t391-toolbar"><div class="t391-filters"><select onchange="taskFilter391(\'leadId\',this.value)">'+leadOpts+'</select><select onchange="taskFilter391(\'assigned\',this.value)">'+teamOpts+'</select><select onchange="taskFilter391(\'status\',this.value)">'+stOpts+'</select><select onchange="taskFilter391(\'priority\',this.value)">'+prOpts+'</select></div><div class="actions">'+
      '<button class="btn '+(T391.view==='board'?'primary':'')+'" onclick="setTaskView391(\'board\')">Quadro</button>'+
      '<button class="btn '+(T391.view==='list'?'primary':'')+'" onclick="setTaskView391(\'list\')">Lista</button>'+
      '<button class="btn '+(T391.view==='team'?'primary':'')+'" onclick="setTaskView391(\'team\')">Equipe & SLA</button>'+
    '</div></div>';
  }
  window.taskFilter391=function(k,v){T391[k]=v||'';renderTasks391()};
  window.setTaskView391=function(v){T391.view=v;renderTasks391()};
  window.myTasks391=function(){T391.assigned=me391();T391.status='';renderTasks391()};

  function taskCard391(t){
    return'<article class="t391-card '+(t.sla?.overdue?'sla-over':'')+'">'+
      '<div class="t391-card-top"><span class="t391-priority '+t.priority.toLowerCase()+'">'+e391(t.priority)+'</span><span class="status '+slaClass391(t.sla)+'">'+e391(t.sla?.label||'Sem SLA')+'</span></div>'+
      '<h4>'+e391(t.title)+'</h4><div class="tiny muted">'+e391(clientName391(t.leadId))+(t.projectId?' · '+e391(projectName391(t.projectId)):'')+'</div>'+
      '<div class="t391-card-meta"><span>Responsável: <b>'+e391(t.assignedUser||'Não definido')+'</b></span><span>Prazo: <b>'+e391(t.dueAt?date391(t.dueAt):'—')+'</b></span></div>'+
      (t.checklist?.length?'<div class="progress"><span style="width:'+Math.max(0,Math.min(100,t.checklistProgress||0))+'%"></span></div><div class="tiny muted">'+e391(t.checklistProgress||0)+'% do checklist</div>':'')+
      '<div class="t391-card-foot"><span class="tiny muted">'+(t.portalVisible?'Visível no Portal':'Interna')+' · '+mins391(t.timeMinutes||0)+'</span><button class="btn sm" onclick="openTask391(\''+e391(t.taskId)+'\')">Abrir</button></div>'+
    '</article>';
  }
  function board391(){
    const tasks=filtered391(),cols=['A fazer','Em andamento','Aguardando cliente','Bloqueada','Concluida'];
    return'<div class="t391-board">'+cols.map(st=>'<section class="t391-col"><div class="t391-col-head"><b>'+statusLabel391(st)+'</b><span>'+tasks.filter(x=>x.status===st).length+'</span></div><div class="t391-col-body">'+(tasks.filter(x=>x.status===st).map(taskCard391).join('')||'<div class="t391-empty">Sem tarefas</div>')+'</div></section>').join('')+'</div>';
  }
  function list391(){
    const a=filtered391();
    if(!a.length)return'<div class="card"><div class="empty">Nenhuma tarefa encontrada.</div></div>';
    return'<div class="table-wrap"><table class="table t391-table"><thead><tr><th>Tarefa</th><th>Cliente / projeto</th><th>Responsável</th><th>Status</th><th>Prioridade</th><th>SLA</th><th>Prazo</th><th>Checklist</th><th></th></tr></thead><tbody>'+
      a.map(t=>'<tr><td><b>'+e391(t.title)+'</b><div class="tiny muted">'+(t.ticket?.subject?'Chamado: '+e391(t.ticket.subject):'')+'</div></td><td>'+e391(clientName391(t.leadId))+'<div class="tiny muted">'+e391(projectName391(t.projectId)||'—')+'</div></td><td>'+e391(t.assignedUser||'—')+'</td><td><span class="status">'+e391(statusLabel391(t.status))+'</span></td><td>'+e391(t.priority)+'</td><td><span class="status '+slaClass391(t.sla)+'">'+e391(t.sla?.label||'—')+'</span><div class="tiny muted">'+(t.slaDueAt?dt391(t.slaDueAt):'')+'</div></td><td>'+e391(t.dueAt?date391(t.dueAt):'—')+'</td><td>'+e391(t.checklistProgress||0)+'%</td><td><button class="btn sm" onclick="openTask391(\''+e391(t.taskId)+'\')">Abrir</button></td></tr>').join('')+
    '</tbody></table></div>';
  }
  function team391(){
    const team=T391.data?.team||[],tasks=T391.data?.tasks||[],cfg=T391.data?.config||{};
    return'<div class="grid cols2">'+
      '<div class="card"><div class="card-head"><div><div class="eyebrow">EQUIPE</div><h3>Carga atual</h3></div></div><div class="t391-team">'+team.map(u=>{const a=tasks.filter(x=>x.assignedUser===u.username&&!['Concluida','Cancelada'].includes(x.status)),over=a.filter(x=>x.sla?.overdue).length,time=tasks.filter(x=>x.assignedUser===u.username).reduce((s,x)=>s+x.timeMinutes,0);return'<div><div><b>'+e391(u.username)+'</b><span>'+e391(u.role)+'</span></div><div class="t391-team-stats"><span>'+a.length+' ativa(s)</span><span class="'+(over?'bad-text':'')+'">'+over+' SLA estourado</span><span>'+mins391(time)+'</span></div></div>'}).join('')+'</div></div>'+
      '<div class="card"><div class="card-head"><div><div class="eyebrow">SLA</div><h3>Tempos por prioridade</h3><p class="help">Contagem em horas corridas.</p></div>'+(canAdmin391()?'<button class="btn sm" onclick="openSlaConfig391()">Configurar</button>':'')+'</div><div class="t391-sla-grid">'+['Urgente','Alta','Normal','Baixa'].map(p=>'<div><span>'+p+'</span><b>'+e391(cfg.hours?.[p]||'—')+'h</b></div>').join('')+'</div><div class="notice">Alerta entra em atenção quando '+e391(cfg.warningPercent||25)+'% do tempo de SLA estiver restante.</div></div>'+
    '</div>';
  }

  function renderTasks391(){
    if(!canView391()){$('content').innerHTML=head('OPERAÇÃO','Tarefas & SLA','Acesso restrito.')+'<div class="card"><div class="empty">Sem permissão.</div></div>';return}
    if(!T391.data&&!T391.loading)setTimeout(()=>load391(true),0);
    const actions=(canEdit391()?'<button class="btn primary" onclick="openTask391()">+ Nova tarefa</button>':'')+'<button class="btn" onclick="myTasks391()">Minha fila</button><button class="btn" onclick="loadTasks391(true)">↻ Atualizar</button>';
    $('content').innerHTML=head('OPERAÇÃO','Tarefas & SLA','Cliente → Projeto → Tarefa → Responsável → Prazo → Chamado → Portal.',actions)+
      (T391.data?summary391():'<div class="card"><div class="empty">Carregando...</div></div>')+
      (T391.data?toolbar391():'')+
      (T391.data?(T391.view==='list'?list391():T391.view==='team'?team391():board391()):'');
    badge391();
  }

  function clientOptions391(selected){
    return'<option value="">Sem cliente</option>'+rows('lead').filter(r=>isClient(r.payload||{})).sort((a,b)=>String(a.payload?.name||'').localeCompare(String(b.payload?.name||''),'pt-BR')).map(r=>'<option value="'+e391(r.entityId)+'" '+(r.entityId===selected?'selected':'')+'>'+e391(r.payload?.name||r.payload?.companyName||r.entityId)+'</option>').join('');
  }
  function teamOptions391(selected){
    return'<option value="">Sem responsável</option>'+(T391.data?.team||[]).map(u=>'<option value="'+e391(u.username)+'" '+(u.username===selected?'selected':'')+'>'+e391(u.username)+' · '+e391(u.role)+'</option>').join('');
  }
  function projectOptions391(leadId,selected){
    return'<option value="">Sem projeto</option>'+(T391.data?.projects||[]).filter(x=>!leadId||x.leadId===leadId).map(x=>'<option value="'+e391(x.projectId)+'" '+(x.projectId===selected?'selected':'')+'>'+e391(x.title)+'</option>').join('');
  }
  function ticketOptions391(leadId,selected){
    return'<option value="">Sem chamado</option>'+(T391.data?.tickets||[]).filter(x=>!leadId||x.leadId===leadId).map(x=>'<option value="'+e391(x.ticketId)+'" '+(x.ticketId===selected?'selected':'')+'>'+e391(x.subject)+' · '+e391(x.status)+'</option>').join('');
  }
  function localDt391(v){
    if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16);
  }
  function checklistEditor391(items){
    const a=items?.length?items:[];
    return'<div id="t391_checklist">'+a.map((x,i)=>checkRow391(x,i)).join('')+'</div>';
  }
  function checkRow391(x={},i=0){
    return'<div class="t391-check-row"><input class="t391-check-done" type="checkbox" '+(x.done?'checked':'')+'><input class="input t391-check-label" placeholder="Item do checklist" value="'+e391(x.label||'')+'"><label class="t391-mini-check"><input class="t391-check-public" type="checkbox" '+(x.portalVisible!==false?'checked':'')+'><span>Portal</span></label><button type="button" class="btn sm danger369" onclick="this.closest(\'.t391-check-row\').remove()">×</button></div>';
  }
  window.addCheck391=function(){const box=$('t391_checklist');if(box)box.insertAdjacentHTML('beforeend',checkRow391({},box.children.length))};
  function collectChecklist391(){
    return[...document.querySelectorAll('#t391_checklist .t391-check-row')].map((r,i)=>({label:r.querySelector('.t391-check-label').value.trim(),done:r.querySelector('.t391-check-done').checked,portalVisible:r.querySelector('.t391-check-public').checked,sortOrder:i})).filter(x=>x.label);
  }

  window.openTask391=function(id=''){
    const t=id?task391(id):null;T391.editing=t;
    const lead=t?.leadId||T391.leadId||'',assigned=t?.assignedUser||'',status=t?.status||'A fazer',priority=t?.priority||'Normal';
    $('modalEyebrow').textContent='TAREFA / SLA';$('modalTitle').textContent=t?'Editar tarefa':'Nova tarefa';$('modalMeta').textContent=t?(clientName391(t.leadId)+' · '+(t.sla?.label||'Sem SLA')):'Crie uma tarefa operacional vinculada ao cliente, projeto ou chamado.';
    $('modalBody').innerHTML='<div class="t391-editor">'+
      '<div class="grid cols2">'+
        '<div class="field"><label>CLIENTE</label><select id="t391_lead" onchange="refreshTaskLinks391()">'+clientOptions391(lead)+'</select></div>'+
        '<div class="field"><label>RESPONSÁVEL</label><select id="t391_assigned">'+teamOptions391(assigned)+'</select></div>'+
        '<div class="field"><label>PROJETO</label><select id="t391_project">'+projectOptions391(lead,t?.projectId||'')+'</select></div>'+
        '<div class="field"><label>CHAMADO</label><select id="t391_ticket">'+ticketOptions391(lead,t?.ticketId||'')+'</select></div>'+
        '<div class="field wide"><label>TÍTULO *</label><input id="t391_title" class="input" maxlength="220" value="'+e391(t?.title||'')+'"></div>'+
        '<div class="field wide"><label>DESCRIÇÃO</label><textarea id="t391_desc" rows="5" maxlength="6000">'+e391(t?.description||'')+'</textarea></div>'+
        '<div class="field"><label>STATUS</label><select id="t391_status">'+['A fazer','Em andamento','Aguardando cliente','Bloqueada','Concluida','Cancelada'].map(x=>'<option value="'+x+'" '+(x===status?'selected':'')+'>'+statusLabel391(x)+'</option>').join('')+'</select></div>'+
        '<div class="field"><label>PRIORIDADE</label><select id="t391_priority">'+['Urgente','Alta','Normal','Baixa'].map(x=>'<option '+(x===priority?'selected':'')+'>'+x+'</option>').join('')+'</select></div>'+
        '<div class="field"><label>PRAZO OPERACIONAL</label><input id="t391_due" class="input" type="datetime-local" value="'+e391(localDt391(t?.dueAt))+'"></div>'+
        '<div class="field"><label>PRAZO SLA</label><input id="t391_sla" class="input" type="datetime-local" value="'+e391(localDt391(t?.slaDueAt))+'"><div class="help">Se vazio em uma nova tarefa, é calculado pela prioridade.</div></div>'+
      '</div>'+
      '<label class="t391-public"><input id="t391_public" type="checkbox" '+(t?.portalVisible?'checked':'')+'><span>Exibir esta tarefa no Portal do Cliente</span></label>'+
      '<div class="t391-section"><div class="t391-section-head"><div><h3>Checklist</h3><p class="help">Marque quais itens podem aparecer no Portal.</p></div><button type="button" class="btn sm" onclick="addCheck391()">+ Item</button></div>'+checklistEditor391(t?.checklist||[])+'</div>'+
      (t?'<div class="t391-section"><div class="t391-section-head"><div><h3>Comentários</h3><p class="help">Histórico da tarefa.</p></div></div><div class="t391-comments">'+(t.comments?.length?t.comments.map(c=>'<div class="t391-comment"><div class="tiny muted">'+e391(c.authorName||c.authorType)+' · '+dt391(c.createdAt)+(c.portalVisible?' · Portal':'')+'</div><p>'+e391(c.body)+'</p></div>').join(''):'<div class="empty">Sem comentários.</div>')+'</div><div class="field"><label>NOVO COMENTÁRIO</label><textarea id="t391_comment" rows="3"></textarea></div><label class="t391-mini-check"><input id="t391_comment_public" type="checkbox"><span>Visível no Portal</span></label><button type="button" class="btn sm" onclick="addComment391(\''+e391(t.taskId)+'\')">Adicionar comentário</button></div>':'')+
      (t?'<div class="t391-section"><div class="t391-section-head"><div><h3>Tempo</h3><p class="help">'+mins391(t.timeMinutes||0)+' registrados.</p></div><button type="button" class="btn sm" onclick="openTime391(\''+e391(t.taskId)+'\')">+ Tempo</button></div></div>':'')+
      '<div class="actions">'+(t&&canAdmin391()?'<button class="btn danger369" onclick="removeTask391(\''+e391(t.taskId)+'\')">Excluir</button>':'')+'<span class="spacer"></span><button class="btn" onclick="closeModal()">Cancelar</button>'+(canEdit391()?'<button class="btn primary" onclick="saveTask391()">Salvar tarefa</button>':'')+'</div>'+
    '</div>';
    $('modalBack').classList.remove('hidden');
  };
  window.refreshTaskLinks391=function(){
    const lead=$('t391_lead').value;$('t391_project').innerHTML=projectOptions391(lead,'');$('t391_ticket').innerHTML=ticketOptions391(lead,'');
  };
  window.saveTask391=async function(){
    const t=T391.editing,body={taskId:t?.taskId,leadId:$('t391_lead').value,projectId:$('t391_project').value,ticketId:$('t391_ticket').value,title:$('t391_title').value.trim(),description:$('t391_desc').value.trim(),status:$('t391_status').value,priority:$('t391_priority').value,assignedUser:$('t391_assigned').value,dueAt:$('t391_due').value?new Date($('t391_due').value).toISOString():'',slaDueAt:$('t391_sla').value?new Date($('t391_sla').value).toISOString():(t?'':undefined),portalVisible:$('t391_public').checked};
    try{
      const j=await api('/api/web/tasks',{method:t?'PATCH':'POST',body:JSON.stringify(body)}),taskId=j.taskId||t?.taskId;
      T391.data=j.view;
      const list=collectChecklist391();
      if(taskId){const k=await api('/api/web/tasks/checklist',{method:'POST',body:JSON.stringify({taskId,items:list})});T391.data=k.view}
      closeModal();toast(t?'Tarefa atualizada.':'Tarefa criada.');renderTasks391();
    }catch(err){toast(err.message,7500)}
  };
  window.removeTask391=async function(id){
    if(!canAdmin391()||!confirm('Excluir esta tarefa e seus comentários, checklist e registros de tempo?'))return;
    try{const j=await api('/api/web/tasks/remove',{method:'POST',body:JSON.stringify({taskId:id})});T391.data=j.view;closeModal();toast('Tarefa removida.');renderTasks391()}catch(err){toast(err.message,7000)}
  };
  window.addComment391=async function(id){
    const body=$('t391_comment').value.trim();if(!body)return;
    try{const j=await api('/api/web/tasks/comment',{method:'POST',body:JSON.stringify({taskId:id,body,portalVisible:$('t391_comment_public').checked})});T391.data=j.view;T391.editing=task391(id);closeModal();openTask391(id)}catch(err){toast(err.message,7000)}
  };
  window.openTime391=function(id){
    closeModal();const t=task391(id);if(!t)return;
    $('modalEyebrow').textContent='TEMPO DA TAREFA';$('modalTitle').textContent=t.title;$('modalMeta').textContent='Tempo já registrado: '+mins391(t.timeMinutes||0);
    $('modalBody').innerHTML='<div class="grid cols2"><div class="field"><label>MINUTOS</label><input id="t391_minutes" class="input" type="number" min="1" max="1440" value="30"></div><div class="field"><label>DATA/HORA</label><input id="t391_worked" class="input" type="datetime-local" value="'+e391(localDt391(new Date().toISOString()))+'"></div><div class="field wide"><label>OBSERVAÇÃO</label><textarea id="t391_time_note" rows="3"></textarea></div></div><div class="actions"><button class="btn" onclick="closeModal();openTask391(\''+e391(id)+'\')">Voltar</button><button class="btn primary" onclick="saveTime391(\''+e391(id)+'\')">Registrar tempo</button></div>';
    $('modalBack').classList.remove('hidden');
  };
  window.saveTime391=async function(id){
    try{const j=await api('/api/web/tasks/time',{method:'POST',body:JSON.stringify({taskId:id,minutes:Number($('t391_minutes').value),workedAt:$('t391_worked').value?new Date($('t391_worked').value).toISOString():new Date().toISOString(),note:$('t391_time_note').value.trim()})});T391.data=j.view;closeModal();toast('Tempo registrado.');openTask391(id)}catch(err){toast(err.message,7000)}
  };

  window.openSlaConfig391=function(){
    if(!canAdmin391())return;const c=T391.data?.config||{};
    $('modalEyebrow').textContent='SLA OPERACIONAL';$('modalTitle').textContent='Configurar SLA';$('modalMeta').textContent='Tempos corridos por prioridade.';
    $('modalBody').innerHTML='<label class="t391-public"><input id="t391_sla_enabled" type="checkbox" '+(c.enabled!==false?'checked':'')+'><span>Ativar cálculo automático de SLA</span></label><div class="grid cols2">'+['Urgente','Alta','Normal','Baixa'].map(p=>'<div class="field"><label>'+p.toUpperCase()+' — HORAS</label><input id="sla391_'+p+'" class="input" type="number" min="1" max="720" value="'+e391(c.hours?.[p]||24)+'"></div>').join('')+'<div class="field"><label>ALERTA QUANDO RESTAR (%)</label><input id="sla391_warn" class="input" type="number" min="5" max="90" value="'+e391(c.warningPercent||25)+'"></div></div><div class="actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveSlaConfig391()">Salvar SLA</button></div>';
    $('modalBack').classList.remove('hidden');
  };
  window.saveSlaConfig391=async function(){
    try{
      const body={enabled:$('t391_sla_enabled').checked,hours:{Urgente:Number($('sla391_Urgente').value),Alta:Number($('sla391_Alta').value),Normal:Number($('sla391_Normal').value),Baixa:Number($('sla391_Baixa').value)},warningPercent:Number($('sla391_warn').value)};
      const j=await api('/api/web/task-sla-config',{method:'PATCH',body:JSON.stringify(body)});T391.data=j.view;closeModal();toast('SLA atualizado.');renderTasks391();
    }catch(err){toast(err.message,7000)}
  };

  window.createTaskFromTicket391=async function(ticketId){
    if(!canEdit391())return;
    try{
      const j=await api('/api/web/tasks/from-ticket',{method:'POST',body:JSON.stringify({ticketId,assignedUser:me391()})});
      T391.data=j.view;closeModal();toast('Tarefa criada a partir do chamado.');S.active='tasks391';T391.view='board';render();
    }catch(err){toast(err.message,7000)}
  };
  const oldTicket391=window.openAdminTicket381;
  if(typeof oldTicket391==='function'){
    window.openAdminTicket381=function(id){
      oldTicket391(id);
      if(!canEdit391())return;
      setTimeout(()=>{
        const body=$('modalBody');if(!body||document.getElementById('ticketTask391'))return;
        const actions=body.querySelector('.actions');
        if(actions)actions.insertAdjacentHTML('afterbegin','<button id="ticketTask391" class="btn" onclick="createTaskFromTicket391(\''+e391(id)+'\')">Criar tarefa</button>');
      },50);
    };
  }

  const oldShow391=showEntityModal;
  showEntityModal=function(r){
    oldShow391(r);
    if(r?.entityType!=='lead'||!isClient(r.payload||{})||!canView391())return;
    setTimeout(()=>injectClientTasks391(r),0);
  };
  async function injectClientTasks391(r){
    const body=$('modalBody');if(!body||document.getElementById('clientTasks391'))return;
    if(!T391.data)await load391(true);
    const tasks=(T391.data?.tasks||[]).filter(x=>x.leadId===r.entityId),active=tasks.filter(x=>!['Concluida','Cancelada'].includes(x.status));
    body.insertAdjacentHTML('beforeend','<div id="clientTasks391" class="card t391-client-card"><div class="t391-client-head"><div><div class="eyebrow">TAREFAS & SLA</div><h3>'+active.length+' tarefa(s) ativa(s)</h3></div><button class="btn sm" onclick="closeModal();openClientTasks391(\''+e391(r.entityId)+'\')">Abrir tarefas</button></div><div class="t391-client-stats"><span>'+active.filter(x=>x.status==='Em andamento').length+' em andamento</span><span class="'+(active.filter(x=>x.sla?.overdue).length?'bad-text':'')+'">'+active.filter(x=>x.sla?.overdue).length+' SLA estourado</span><span>'+active.filter(x=>x.status==='Aguardando cliente').length+' aguardando cliente</span></div></div>');
  }
  window.openClientTasks391=async function(id){T391.leadId=id;T391.data=null;S.active='tasks391';await load391(true);render()};

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{buildNav()}catch{}},700));
  setTimeout(()=>{if(S?.session&&canView391())load391(true)},4700);
})();