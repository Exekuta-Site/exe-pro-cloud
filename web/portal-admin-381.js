'use strict';
(function(){
  const A381={data:null,loading:false,tab:'tickets',leadId:''};

  function e381(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function rank381(){try{return roleRank(S.session?.user?.role||'')}catch{return 1}}
  function canOps381(){return rank381()>=3}
  function clients381(){return rows('lead').filter(r=>isClient(r.payload||{})).sort((a,b)=>String(a.payload?.name||'').localeCompare(String(b.payload?.name||''),'pt-BR'))}
  function cname381(id){const r=rows('lead').find(x=>x.entityId===id);return r?.payload?.name||r?.payload?.companyName||id||'Cliente'}
  function bytes381(n){n=Number(n||0);if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(1)+' KB';return(n/1048576).toFixed(1)+' MB'}
  function down381(id){return'/api/web/client-portal/files/'+encodeURIComponent(id)+'/download'}
  function st381(s){try{return status(s)}catch{return'<span class="status">'+e381(s)+'</span>'}}

  const baseBuild381=buildNav;
  buildNav=function(){
    baseBuild381();
    const nav2=$('nav2');
    if(nav2&&canOps381()&&!document.querySelector('[data-sec="portalops"]')){
      nav2.insertAdjacentHTML('beforeend','<button data-sec="portalops" onclick="openSec(\'portalops\')"><span class="ico">AT</span><span>Atendimento Portal</span><span id="badge_portalops" class="badge hidden"></span></button>');
    }
    markNav();
  };
  const baseRender381=render;
  render=function(){
    if(S.active==='portalops'){renderPortalOps381();return}
    baseRender381();
  };

  async function loadAdminOps381(force=false){
    if(!canOps381())return;
    if(A381.loading)return;
    if(A381.data&&!force)return;
    A381.loading=true;
    try{
      const q=A381.leadId?'?leadId='+encodeURIComponent(A381.leadId):'';
      A381.data=await api('/api/web/client-portal/operations'+q);
    }catch(e){toast(e.message,7000)}
    finally{A381.loading=false;if(S.active==='portalops')renderPortalOps381();updateBadge381()}
  }
  window.loadAdminOps381=loadAdminOps381;

  function updateBadge381(){
    const b=$('badge_portalops'),n=Number(A381.data?.counts?.openTickets||0)+Number(A381.data?.counts?.pendingProofs||0);
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }
  function tabs381(){
    return'<div class="a381-tabs"><button class="btn '+(A381.tab==='tickets'?'primary':'')+'" onclick="setPortalOpsTab381(\'tickets\')">Chamados</button><button class="btn '+(A381.tab==='files'?'primary':'')+'" onclick="setPortalOpsTab381(\'files\')">Arquivos</button><button class="btn '+(A381.tab==='proofs'?'primary':'')+'" onclick="setPortalOpsTab381(\'proofs\')">Comprovantes</button></div>';
  }
  window.setPortalOpsTab381=function(tab){A381.tab=tab;renderPortalOps381()};

  function filterBar381(){
    const opts='<option value="">Todos os clientes</option>'+clients381().map(r=>'<option value="'+e381(r.entityId)+'" '+(r.entityId===A381.leadId?'selected':'')+'>'+e381(r.payload?.name||r.payload?.companyName||r.entityId)+'</option>').join('');
    return'<div class="a381-filter"><select id="a381_lead" onchange="changePortalLead381(this.value)">'+opts+'</select>'+tabs381()+'</div>';
  }
  window.changePortalLead381=async function(v){A381.leadId=v||'';A381.data=null;await loadAdminOps381(true)};

  function tickets381(){
    const a=A381.data?.tickets||[];
    if(!a.length)return'<div class="card"><div class="empty">Nenhum chamado encontrado.</div></div>';
    return'<div class="table-wrap"><table class="table a381-table"><thead><tr><th>Cliente</th><th>Chamado</th><th>Prioridade</th><th>Status</th><th>Responsável</th><th>Atualizado</th><th></th></tr></thead><tbody>'+
      a.map(t=>'<tr><td><b>'+e381(t.client?.name||t.client?.companyName||cname381(t.leadId))+'</b></td><td><b>'+e381(t.subject)+'</b><div class="tiny muted">'+e381(t.category)+' · '+(t.messages?.length||0)+' mensagem(ns)</div></td><td>'+e381(t.priority)+'</td><td>'+st381(t.status)+'</td><td>'+e381(t.assignedTo||'—')+'</td><td>'+e381(day(t.updatedAt))+'</td><td><button class="btn sm" onclick="openAdminTicket381(\''+e381(t.ticketId)+'\')">Abrir</button></td></tr>').join('')+
    '</tbody></table></div>';
  }
  function files381(){
    const a=A381.data?.files||[];
    return'<div class="a381-head-action"><div><h3>Arquivos compartilhados</h3><p class="help">Envie contratos, relatórios, briefings e documentos diretamente para o portal do cliente.</p></div><button class="btn primary" onclick="openAdminFile381()">+ Enviar arquivo</button></div>'+
      (a.length?'<div class="table-wrap"><table class="table a381-table"><thead><tr><th>Cliente</th><th>Arquivo</th><th>Categoria</th><th>Tamanho</th><th>Enviado por</th><th>Data</th><th></th></tr></thead><tbody>'+
      a.map(f=>'<tr><td><b>'+e381(f.client?.name||f.client?.companyName||cname381(f.leadId))+'</b></td><td>'+e381(f.filename)+'</td><td>'+e381(f.category)+'</td><td>'+bytes381(f.byteSize)+'</td><td>'+e381(f.uploadedByName||f.uploadedByType)+'</td><td>'+e381(day(f.createdAt))+'</td><td><a class="btn sm" href="'+down381(f.fileId)+'">Baixar</a></td></tr>').join('')+
      '</tbody></table></div>':'<div class="card"><div class="empty">Nenhum arquivo compartilhado.</div></div>');
  }
  function proofs381(){
    const a=A381.data?.proofs||[];
    if(!a.length)return'<div class="card"><div class="empty">Nenhum comprovante recebido.</div></div>';
    return'<div class="table-wrap"><table class="table a381-table"><thead><tr><th>Cliente</th><th>Cobrança</th><th>Arquivo</th><th>Status</th><th>Enviado</th><th></th></tr></thead><tbody>'+
      a.map(p=>'<tr><td><b>'+e381(p.client?.name||p.client?.companyName||cname381(p.leadId))+'</b></td><td>'+e381(p.receivable?.description||'Cobrança')+'<div class="tiny muted">'+money(Number(p.receivable?.amount||0))+'</div></td><td><a href="'+down381(p.fileId)+'">'+e381(p.filename)+'</a></td><td>'+st381(p.status)+'</td><td>'+e381(day(p.submittedAt))+'</td><td><button class="btn sm '+(p.status==='Aguardando conferencia'?'primary':'')+'" onclick="openProofReview381(\''+e381(p.proofId)+'\')">Conferir</button></td></tr>').join('')+
    '</tbody></table></div>';
  }

  function renderPortalOps381(){
    if(!canOps381()){ $('content').innerHTML=head('ATENDIMENTO','Atendimento Portal','Seu perfil não possui permissão.')+'<div class="card"><div class="empty">Acesso restrito.</div></div>';return }
    if(!A381.data&&!A381.loading)setTimeout(()=>loadAdminOps381(true),0);
    const c=A381.data?.counts||{};
    const actions='<button class="btn" onclick="loadAdminOps381(true)">↻ Atualizar</button>';
    $('content').innerHTML=head('PORTAL OPERACIONAL','Atendimento Portal','Chamados, arquivos e comprovantes enviados pelos clientes.',actions)+
      '<div class="grid kpis a381-kpis">'+kpi('Chamados abertos',c.openTickets||0,'aguardando atendimento')+kpi('Arquivos',c.files||0,'compartilhados')+kpi('Comprovantes',c.pendingProofs||0,'aguardando conferência')+'</div>'+
      filterBar381()+
      (!A381.data?'<div class="card"><div class="empty">Carregando...</div></div>':A381.tab==='files'?files381():A381.tab==='proofs'?proofs381():tickets381());
    updateBadge381();
  }

  function ticket381(id){return A381.data?.tickets?.find(x=>x.ticketId===id)}
  window.openAdminTicket381=function(id){
    const t=ticket381(id);if(!t)return;
    $('modalEyebrow').textContent='CHAMADO DO CLIENTE';
    $('modalTitle').textContent=t.subject;
    $('modalMeta').textContent=(t.client?.name||t.client?.companyName||cname381(t.leadId))+' · '+t.category;
    $('modalBody').innerHTML='<div class="a381-ticket-modal">'+
      '<div class="grid cols2"><div class="field"><label>STATUS</label><select id="a381_status"><option '+(t.status==='Aberto'?'selected':'')+'>Aberto</option><option '+(t.status==='Em andamento'?'selected':'')+'>Em andamento</option><option '+(t.status==='Aguardando cliente'?'selected':'')+'>Aguardando cliente</option><option '+(t.status==='Resolvido'?'selected':'')+'>Resolvido</option><option '+(t.status==='Fechado'?'selected':'')+'>Fechado</option></select></div><div class="field"><label>PRIORIDADE</label><select id="a381_priority"><option '+(t.priority==='Baixa'?'selected':'')+'>Baixa</option><option '+(t.priority==='Normal'?'selected':'')+'>Normal</option><option '+(t.priority==='Alta'?'selected':'')+'>Alta</option><option '+(t.priority==='Urgente'?'selected':'')+'>Urgente</option></select></div><div class="field wide"><label>RESPONSÁVEL</label><input id="a381_assigned" class="input" value="'+e381(t.assignedTo||S.session?.user?.username||'')+'"></div></div>'+
      '<div class="a381-messages">'+(t.messages||[]).map(m=>'<div class="a381-msg '+(m.authorType==='Cliente'?'client':'team')+'"><div class="tiny muted">'+e381(m.authorName||m.authorType)+' · '+e381(day(m.createdAt))+'</div><p>'+e381(m.body)+'</p></div>').join('')+'</div>'+
      '<div class="field"><label>RESPONDER AO CLIENTE</label><textarea id="a381_message" rows="4" placeholder="Mensagem opcional..."></textarea></div>'+
      '<div class="actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveAdminTicket381(\''+e381(id)+'\')">Salvar e responder</button></div></div>';
    $('modalBack').classList.remove('hidden');
  };
  window.saveAdminTicket381=async function(id){
    try{
      const j=await api('/api/web/client-portal/tickets',{method:'PATCH',body:JSON.stringify({ticketId:id,status:$('a381_status').value,priority:$('a381_priority').value,assignedTo:$('a381_assigned').value.trim(),message:$('a381_message').value.trim()})});
      A381.data=j.operations;closeModal();toast('Chamado atualizado.');renderPortalOps381();
    }catch(e){toast(e.message,7000)}
  };

  function clientOpts381(selected=''){return clients381().map(r=>'<option value="'+e381(r.entityId)+'" '+(r.entityId===selected?'selected':'')+'>'+e381(r.payload?.name||r.payload?.companyName||r.entityId)+'</option>').join('')}
  window.openAdminFile381=function(leadId=''){
    $('modalEyebrow').textContent='ARQUIVO DO CLIENTE';$('modalTitle').textContent='Compartilhar arquivo';$('modalMeta').textContent='O arquivo ficará disponível no Portal do Cliente.';
    $('modalBody').innerHTML='<div class="grid cols2"><div class="field"><label>CLIENTE</label><select id="a381_file_lead">'+clientOpts381(leadId||A381.leadId)+'</select></div><div class="field"><label>CATEGORIA</label><select id="a381_file_cat"><option>Arquivo</option><option>Contrato</option><option>Relatório</option><option>Briefing</option><option>Imagem</option><option>Outro</option></select></div><div class="field wide"><label>ARQUIVO</label><input id="a381_file_input" class="input" type="file"></div></div><div class="notice">PDF, JPG, PNG, WEBP, TXT, ZIP, DOCX ou XLSX. Máximo 8 MB.</div><div class="actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="sendAdminFile381()">Enviar ao portal</button></div>';
    $('modalBack').classList.remove('hidden');
  };
  window.sendAdminFile381=async function(){
    const f=$('a381_file_input').files?.[0];if(!f)return toast('Selecione um arquivo.');
    if(f.size>8*1024*1024)return toast('O arquivo excede 8 MB.');
    try{
      const base64=await readBase64381(f);
      const j=await api('/api/web/client-portal/files/upload',{method:'POST',body:JSON.stringify({leadId:$('a381_file_lead').value,category:$('a381_file_cat').value,filename:f.name,mimeType:f.type||mimeGuess381(f.name),base64})});
      A381.data=j.operations;closeModal();toast('Arquivo disponibilizado no portal.');A381.tab='files';renderPortalOps381();
    }catch(e){toast(e.message,7000)}
  };
  function readBase64381(f){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.onerror=reject;r.readAsDataURL(f)})}
  function mimeGuess381(name){const x=String(name).toLowerCase();if(x.endsWith('.pdf'))return'application/pdf';if(/\.jpe?g$/.test(x))return'image/jpeg';if(x.endsWith('.png'))return'image/png';if(x.endsWith('.webp'))return'image/webp';if(x.endsWith('.txt'))return'text/plain';if(x.endsWith('.zip'))return'application/zip';if(x.endsWith('.docx'))return'application/vnd.openxmlformats-officedocument.wordprocessingml.document';if(x.endsWith('.xlsx'))return'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';return'application/octet-stream'}

  function proof381(id){return A381.data?.proofs?.find(x=>x.proofId===id)}
  window.openProofReview381=function(id){
    const p=proof381(id);if(!p)return;
    $('modalEyebrow').textContent='COMPROVANTE';$('modalTitle').textContent=p.client?.name||p.client?.companyName||cname381(p.leadId);$('modalMeta').textContent=p.receivable?.description||'Cobrança';
    $('modalBody').innerHTML='<div class="a381-proof"><p><b>Valor:</b> '+money(Number(p.receivable?.amount||0))+'</p><p><b>Arquivo:</b> <a href="'+down381(p.fileId)+'">'+e381(p.filename)+'</a></p><p><b>Observação:</b> '+e381(p.note||'—')+'</p><div class="field"><label>STATUS</label><select id="a381_proof_status"><option '+(p.status==='Aguardando conferencia'?'selected':'')+'>Aguardando conferencia</option><option '+(p.status==='Aprovado'?'selected':'')+'>Aprovado</option><option '+(p.status==='Recusado'?'selected':'')+'>Recusado</option></select></div><div class="field"><label>OBSERVAÇÃO DA CONFERÊNCIA</label><textarea id="a381_proof_note" rows="3">'+e381(p.reviewNote||'')+'</textarea></div><div class="actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveProofReview381(\''+e381(id)+'\')">Salvar conferência</button></div></div>';
    $('modalBack').classList.remove('hidden');
  };
  window.saveProofReview381=async function(id){
    try{
      const j=await api('/api/web/client-portal/payment-proofs',{method:'PATCH',body:JSON.stringify({proofId:id,status:$('a381_proof_status').value,reviewNote:$('a381_proof_note').value.trim()})});
      A381.data=j.operations;closeModal();toast('Comprovante atualizado.');A381.tab='proofs';renderPortalOps381();
    }catch(e){toast(e.message,7000)}
  };

  const prevShow381=showEntityModal;
  showEntityModal=function(r){
    prevShow381(r);
    if(r?.entityType!=='lead'||!isClient(r.payload||{})||!canOps381())return;
    setTimeout(()=>injectClientOps381(r),0);
  };
  async function injectClientOps381(r){
    const body=$('modalBody');if(!body||document.getElementById('clientOpsCard381'))return;
    if(!A381.data){await loadAdminOps381(true)}
    const all=A381.data||{},tickets=(all.tickets||[]).filter(x=>x.leadId===r.entityId),files=(all.files||[]).filter(x=>x.leadId===r.entityId),proofs=(all.proofs||[]).filter(x=>x.leadId===r.entityId);
    body.insertAdjacentHTML('beforeend','<div id="clientOpsCard381" class="card a381-client-card"><div class="a381-client-head"><div><div class="eyebrow">PORTAL OPERACIONAL</div><h3>Atendimento do cliente</h3></div><button class="btn sm" onclick="closeModal();A381OpenClient381(\''+e381(r.entityId)+'\')">Abrir central</button></div><div class="a381-client-stats"><span>'+tickets.filter(x=>!['Resolvido','Fechado'].includes(x.status)).length+' chamado(s) aberto(s)</span><span>'+files.length+' arquivo(s)</span><span>'+proofs.filter(x=>x.status==='Aguardando conferencia').length+' comprovante(s) aguardando</span></div></div>');
  }
  window.A381OpenClient381=async function(id){A381.leadId=id;A381.data=null;S.active='portalops';await loadAdminOps381(true);render()};

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{buildNav()}catch{}},450));
  setTimeout(()=>{if(S?.session&&canOps381())loadAdminOps381(true)},3000);
})();
