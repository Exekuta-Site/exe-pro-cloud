'use strict';
(function(){
  const OP381={loading:false};
  const baseRender381=render;
  const baseDashboard381=dashboard;
  const baseFinance381=financePage;

  function bytes381(n){n=Number(n||0);if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(1)+' KB';return(n/1048576).toFixed(1)+' MB'}
  function typeLabel381(t){return({Chamado:'Chamado',Arquivo:'Arquivo',Projeto:'Projeto',Financeiro:'Financeiro',Comprovante:'Comprovante'})[t]||t}
  function ticketStatus381(s){return statusBadge(s)}
  function safeDownload381(id){return'/api/portal/files/'+encodeURIComponent(id)+'/download'}
  function categoryLabel381(v){return v==='Conteudo'?'Conteúdo':v}

  async function loadOps381(force=false){
    if(OP381.loading)return P.ops;
    if(P.ops&&!force)return P.ops;
    OP381.loading=true;
    try{P.ops=await api('/api/portal/operations');P.csrf=P.ops.csrf||P.csrf;updateOpsBadges381();return P.ops}
    catch(e){console.error(e);return null}
    finally{OP381.loading=false}
  }
  window.loadOps381=loadOps381;

  function ensureNav381(){
    const side=document.querySelector('.sidebar');if(!side||document.getElementById('ticketsNav381'))return;
    const foot=side.querySelector('.sidebar-foot');
    const html='<button class="navbtn" data-page="tickets" id="ticketsNav381" onclick="goOps381(\'tickets\')">Chamados <span id="ticketBadge381" class="op381-badge hidden"></span></button>'+
      '<button class="navbtn" data-page="files" id="filesNav381" onclick="goOps381(\'files\')">Arquivos</button>'+
      '<button class="navbtn" data-page="timeline" id="timelineNav381" onclick="goOps381(\'timeline\')">Linha do tempo</button>';
    if(foot)foot.insertAdjacentHTML('beforebegin',html);else side.insertAdjacentHTML('beforeend',html);
  }
  function updateOpsBadges381(){
    const b=document.getElementById('ticketBadge381'),n=Number(P.ops?.counts?.openTickets||0);
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }
  window.goOps381=async function(page){
    ensureNav381();
    P.page=page;
    await loadOps381(false);
    render();
  };

  dashboard=function(){
    let h=baseDashboard381();
    if(!P.ops)setTimeout(()=>loadOps381(false).then(()=>{if(P.page==='dashboard')render()}),0);
    const o=P.ops;
    if(!o)return h;
    h+='<div class="card op381-dashboard"><div class="card-head"><div><div class="eyebrow">ATENDIMENTO</div><h3>Portal operacional</h3></div><button class="btn" onclick="goOps381(\'tickets\')">Abrir chamados</button></div>'+
      '<div class="op381-mini-grid"><div><span>Chamados abertos</span><b>'+e(o.counts?.openTickets||0)+'</b></div><div><span>Arquivos compartilhados</span><b>'+e(o.counts?.files||0)+'</b></div>'+
      (P.data.permissions.finance?'<div><span>Comprovantes aguardando</span><b>'+e(o.counts?.pendingProofs||0)+'</b></div>':'')+
      '<div><span>Última movimentação</span><b class="op381-date">'+e(o.timeline?.[0]?date(o.timeline[0].at):'—')+'</b></div></div></div>';
    return h;
  };

  financePage=function(){
    let h=baseFinance381();
    if(!P.data.permissions.finance)return h;
    if(!P.ops)setTimeout(()=>loadOps381(false).then(()=>{if(P.page==='finance')render()}),0);
    const proofs=P.ops?.proofs||[];
    const open=(P.data.finance||[]).filter(x=>!String(x.status||'').toLowerCase().includes('pago')&&!String(x.status||'').toLowerCase().includes('cancel'));
    h+='<div class="card op381-proof-card"><div class="card-head"><div><div class="eyebrow">COMPROVANTES</div><h3>Comprovantes de pagamento</h3><p class="muted tiny">Envie um comprovante para conferência da equipe.</p></div>'+(open.length?'<button class="btn primary" onclick="openProof381()">+ Enviar comprovante</button>':'')+'</div>'+
      (proofs.length?'<div class="rows">'+proofs.map(x=>'<div class="row"><div class="row-main"><b>'+e(x.filename)+'</b><div>'+e(x.receivable?.description||'Cobrança')+' · '+date(x.submittedAt)+'</div></div><div class="row-side">'+statusBadge(x.status)+'<div><a href="'+safeDownload381(x.fileId)+'">Baixar</a></div></div></div>').join('')+'</div>':'<div class="empty">Nenhum comprovante enviado.</div>')+
    '</div>';
    return h;
  };

  function ticketsPage381(){
    const a=P.ops?.tickets||[];
    return'<div class="hero"><div><div class="eyebrow">ATENDIMENTO</div><h2>Chamados</h2><p>Solicite alterações, suporte, SEO, conteúdo ou atendimento financeiro.</p></div><button class="btn primary" onclick="openTicketCreate381()">+ Novo chamado</button></div>'+
      '<div class="kpis op381-kpis"><div class="kpi"><span>Abertos</span><b>'+e(P.ops?.counts?.openTickets||0)+'</b></div><div class="kpi"><span>Total</span><b>'+a.length+'</b></div><div class="kpi"><span>Arquivos</span><b>'+e(P.ops?.counts?.files||0)+'</b></div><div class="kpi"><span>Última atividade</span><b style="font-size:15px">'+e(P.ops?.timeline?.[0]?date(P.ops.timeline[0].at):'—')+'</b></div></div>'+
      (a.length?'<div class="op381-ticket-list">'+a.map(t=>'<article class="card op381-ticket"><div class="card-head"><div><div class="eyebrow">'+e(categoryLabel381(t.category))+' · '+e(t.priority)+'</div><h3>'+e(t.subject)+'</h3><p class="muted tiny">Atualizado em '+date(t.updatedAt)+' · '+(t.messages?.length||0)+' mensagem(ns)</p></div>'+ticketStatus381(t.status)+'</div><p>'+e(t.description)+'</p><div class="op381-ticket-foot"><span class="tiny muted">'+(t.assignedTo?'Responsável: '+e(t.assignedTo):'Aguardando distribuição')+'</span><button class="btn" onclick="openTicket381(\''+e(t.ticketId)+'\')">Abrir conversa</button></div></article>').join('')+'</div>':'<div class="card empty">Você ainda não abriu nenhum chamado.</div>');
  }

  function filesPage381(){
    const a=P.ops?.files||[];
    return'<div class="hero"><div><div class="eyebrow">ARQUIVOS</div><h2>Arquivos compartilhados</h2><p>Contratos, relatórios, briefings, imagens e documentos trocados com a equipe.</p></div><button class="btn primary" onclick="openFileUpload381()">+ Enviar arquivo</button></div>'+
      '<div class="notice op381-file-note">Arquivos permitidos: PDF, JPG, PNG, WEBP, TXT, ZIP, DOCX e XLSX. Limite de 8 MB por arquivo.</div>'+
      (a.length?'<div class="service-grid">'+a.map(f=>'<article class="service-card op381-file"><div class="card-head"><div><h4>'+e(f.filename)+'</h4><div class="tiny muted">'+e(f.category)+' · '+bytes381(f.byteSize)+'</div></div><span class="status">'+date(f.createdAt)+'</span></div><div class="tiny muted">Enviado por '+e(f.uploadedByName||f.uploadedByType)+'</div><div style="margin-top:12px"><a class="btn" href="'+safeDownload381(f.fileId)+'">Baixar arquivo</a></div></article>').join('')+'</div>':'<div class="card empty">Nenhum arquivo compartilhado ainda.</div>');
  }

  function timelinePage381(){
    const a=P.ops?.timeline||[];
    return'<div class="hero"><div><div class="eyebrow">HISTÓRICO</div><h2>Linha do tempo</h2><p>Principais movimentações da sua conta em ordem cronológica.</p></div></div>'+
      (a.length?'<div class="card op381-timeline">'+a.map(x=>'<div class="op381-event"><div class="op381-dot"></div><div><div class="tiny muted">'+e(typeLabel381(x.type))+' · '+date(x.at)+'</div><b>'+e(x.title)+'</b><p>'+e(x.detail||'')+'</p></div></div>').join('')+'</div>':'<div class="card empty">Nenhuma movimentação disponível.</div>');
  }

  render=function(){
    ensureNav381();
    if(['tickets','files','timeline'].includes(P.page)){
      nav();
      document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page===P.page));
      if(!P.ops&&!OP381.loading){setTimeout(()=>loadOps381(true).then(()=>render()),0);$('main').innerHTML='<div class="card empty">Carregando...</div>';return}
      $('clientChip').textContent=P.data?.client?.name||'';
      $('userChip').textContent=P.data?.user?.username+' · '+roleLabel(P.data?.user?.role);
      $('main').innerHTML=P.page==='tickets'?ticketsPage381():P.page==='files'?filesPage381():timelinePage381();
      updateOpsBadges381();return;
    }
    baseRender381();
    updateOpsBadges381();
  };

  function ticket381(id){return P.ops?.tickets?.find(x=>x.ticketId===id)}
  window.openTicketCreate381=function(){
    $('main').insertAdjacentHTML('beforeend','<div id="opModal381" class="op381-modal-back"><div class="op381-modal"><button class="op381-x" onclick="closeOp381()">×</button><div class="eyebrow">NOVO CHAMADO</div><h3>Abrir solicitação</h3>'+
      '<div class="op381-form-grid"><div class="field"><label>CATEGORIA</label><select id="op381_cat"><option>Site</option><option>SEO</option><option value="Conteudo">Conteúdo</option><option>Financeiro</option><option>Suporte</option><option>Outro</option></select></div><div class="field"><label>PRIORIDADE</label><select id="op381_pri"><option>Normal</option><option>Baixa</option><option>Alta</option><option>Urgente</option></select></div><div class="field wide"><label>ASSUNTO</label><input id="op381_sub" class="input" maxlength="180"></div><div class="field wide"><label>DESCRIÇÃO</label><textarea id="op381_desc" rows="6" maxlength="6000"></textarea></div></div>'+
      '<div class="actions"><button class="btn" onclick="closeOp381()">Cancelar</button><button class="btn primary" onclick="saveTicket381()">Abrir chamado</button></div></div></div>');
  };
  window.saveTicket381=async function(){
    try{
      const j=await api('/api/portal/tickets',{method:'POST',body:JSON.stringify({category:$('op381_cat').value,priority:$('op381_pri').value,subject:$('op381_sub').value.trim(),description:$('op381_desc').value.trim()})});
      P.ops=j.operations;closeOp381();render();
    }catch(e){alert(e.message)}
  };
  window.openTicket381=function(id){
    const t=ticket381(id);if(!t)return;
    const msgs=(t.messages||[]).map(m=>'<div class="op381-msg '+(m.authorType==='Cliente'?'client':'team')+'"><div class="tiny muted">'+e(m.authorName||m.authorType)+' · '+date(m.createdAt)+'</div><p>'+e(m.body)+'</p></div>').join('');
    const files=(t.files||[]).map(f=>'<a class="op381-attach" href="'+safeDownload381(f.fileId)+'">'+e(f.filename)+' · '+bytes381(f.byteSize)+'</a>').join('');
    $('main').insertAdjacentHTML('beforeend','<div id="opModal381" class="op381-modal-back"><div class="op381-modal large"><button class="op381-x" onclick="closeOp381()">×</button><div class="eyebrow">'+e(categoryLabel381(t.category))+' · '+e(t.priority)+'</div><h3>'+e(t.subject)+'</h3><div style="margin:8px 0">'+statusBadge(t.status)+'</div><div class="op381-conversation">'+msgs+'</div>'+
      (files?'<div class="op381-attachments">'+files+'</div>':'')+
      '<div class="field"><label>NOVA MENSAGEM</label><textarea id="op381_reply" rows="4" maxlength="6000"></textarea></div>'+
      '<div class="actions"><button class="btn" onclick="document.getElementById(\'ticketFile381\').click()">Anexar arquivo</button><input id="ticketFile381" type="file" class="hidden" onchange="uploadTicketFile381(\''+e(id)+'\',this)"><button class="btn primary" onclick="replyTicket381(\''+e(id)+'\')">Enviar mensagem</button></div></div></div>');
  };
  window.replyTicket381=async function(id){
    const msg=$('op381_reply').value.trim();if(!msg)return;
    try{const j=await api('/api/portal/tickets/message',{method:'POST',body:JSON.stringify({ticketId:id,message:msg})});P.ops=j.operations;closeOp381();openTicket381(id);updateOpsBadges381()}catch(e){alert(e.message)}
  };
  window.uploadTicketFile381=async function(id,input){
    const f=input.files?.[0];if(!f)return;
    try{await uploadFile381(f,{ticketId:id,category:'Chamado'});closeOp381();openTicket381(id)}catch(e){alert(e.message)}
  };
  window.openFileUpload381=function(){
    $('main').insertAdjacentHTML('beforeend','<div id="opModal381" class="op381-modal-back"><div class="op381-modal"><button class="op381-x" onclick="closeOp381()">×</button><div class="eyebrow">ARQUIVOS</div><h3>Enviar arquivo</h3><div class="field"><label>CATEGORIA</label><select id="fileCat381"><option>Arquivo</option><option>Contrato</option><option>Relatório</option><option>Briefing</option><option>Imagem</option><option>Outro</option></select></div><div class="field"><label>ARQUIVO</label><input id="fileInput381" class="input" type="file"></div><div class="actions"><button class="btn" onclick="closeOp381()">Cancelar</button><button class="btn primary" onclick="sendFile381()">Enviar</button></div></div></div>');
  };
  window.sendFile381=async function(){
    const f=$('fileInput381').files?.[0];if(!f)return alert('Selecione um arquivo.');
    try{await uploadFile381(f,{category:$('fileCat381').value});closeOp381();render()}catch(e){alert(e.message)}
  };
  async function uploadFile381(file,extra={}){
    if(file.size>8*1024*1024)throw new Error('O arquivo excede 8 MB.');
    const base64=await readBase64381(file);
    const j=await api('/api/portal/files/upload',{method:'POST',body:JSON.stringify({filename:file.name,mimeType:file.type||mimeGuess381(file.name),base64,...extra})});
    P.ops=j.operations;return j;
  }
  function mimeGuess381(name){
    const x=String(name).toLowerCase();
    if(x.endsWith('.pdf'))return'application/pdf';if(/\.jpe?g$/.test(x))return'image/jpeg';if(x.endsWith('.png'))return'image/png';if(x.endsWith('.webp'))return'image/webp';if(x.endsWith('.txt'))return'text/plain';if(x.endsWith('.zip'))return'application/zip';if(x.endsWith('.docx'))return'application/vnd.openxmlformats-officedocument.wordprocessingml.document';if(x.endsWith('.xlsx'))return'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';return'application/octet-stream';
  }
  function readBase64381(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.onerror=reject;r.readAsDataURL(file)})}
  window.openProof381=function(receivableId=''){
    const open=(P.data.finance||[]).filter(x=>!String(x.status||'').toLowerCase().includes('pago')&&!String(x.status||'').toLowerCase().includes('cancel'));
    $('main').insertAdjacentHTML('beforeend','<div id="opModal381" class="op381-modal-back"><div class="op381-modal"><button class="op381-x" onclick="closeOp381()">×</button><div class="eyebrow">FINANCEIRO</div><h3>Enviar comprovante</h3><div class="field"><label>COBRANÇA</label><select id="proofRec381">'+open.map(x=>'<option value="'+e(x.receivableId)+'" '+(x.receivableId===receivableId?'selected':'')+'>'+e(x.description)+' · '+money(x.amount)+' · '+date(x.dueDate)+'</option>').join('')+'</select></div><div class="field"><label>COMPROVANTE</label><input id="proofFile381" class="input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"></div><div class="field"><label>OBSERVAÇÃO</label><textarea id="proofNote381" rows="3"></textarea></div><div class="actions"><button class="btn" onclick="closeOp381()">Cancelar</button><button class="btn primary" onclick="sendProof381()">Enviar para conferência</button></div></div></div>');
  };
  window.sendProof381=async function(){
    const f=$('proofFile381').files?.[0];if(!f)return alert('Selecione o comprovante.');
    if(f.size>8*1024*1024)return alert('O arquivo excede 8 MB.');
    try{
      const base64=await readBase64381(f);
      const j=await api('/api/portal/payment-proofs',{method:'POST',body:JSON.stringify({receivableId:$('proofRec381').value,filename:f.name,mimeType:f.type||mimeGuess381(f.name),base64,note:$('proofNote381').value.trim()})});
      P.ops=j.operations;closeOp381();render();
    }catch(e){alert(e.message)}
  };
  window.closeOp381=function(){document.getElementById('opModal381')?.remove()};

  setTimeout(async()=>{ensureNav381();if(P.data){await loadOps381(false);if(P.page==='dashboard')render()}},700);
})();
