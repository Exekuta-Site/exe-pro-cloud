'use strict';
(function(){
  const PD383={loading:false};
  const baseDashboard383=dashboard;
  const baseRender383=render;

  function doc383(type,id){return (P.portalDocs||[]).find(x=>x.entityType===type&&x.entityId===id)||null}
  function label383(t){return t==='proposal'?'Proposta':'Contrato'}
  function dec383(d){if(!d)return'Aguardando decisão';if(!d.current)return'Nova aprovação necessária';return d.decision}
  function dclass383(d){const s=dec383(d);return /Aprovado|Aceito/.test(s)?'ok':/Recusado/.test(s)?'bad':'warn'}
  function money383(v){return money(Number(v||0))}
  function proposalTotal383(d){return Number(d?.snapshot?.firstCycleTotal||d?.payload?.firstCycleTotal||0)}
  function contractMonthly383(d){return Number(d?.snapshot?.monthlyAmount||d?.payload?.monthlyAmount||0)}

  async function loadDocs383(force=false){
    if(PD383.loading)return;
    if(P.portalDocs&&!force)return P.portalDocs;
    PD383.loading=true;
    try{const j=await api('/api/portal/documents');P.portalDocs=j.documents||[];return P.portalDocs}
    catch(e){console.error(e);P.portalDocs=[];return P.portalDocs}
    finally{PD383.loading=false}
  }
  window.loadPortalDocs383=loadDocs383;

  function ensureNav383(){
    const side=document.querySelector('.sidebar');if(!side||document.getElementById('docsNav383'))return;
    const foot=side.querySelector('.sidebar-foot');
    const html='<button class="navbtn" data-page="documents" id="docsNav383" onclick="goDocs383()">Propostas e contratos <span id="docsBadge383" class="op381-badge hidden"></span></button>';
    if(foot)foot.insertAdjacentHTML('beforebegin',html);else side.insertAdjacentHTML('beforeend',html);
  }
  window.goDocs383=async function(type='',id=''){
    P.page='documents';P.docSelected=type&&id?type+':'+id:'';
    await loadDocs383(false);render();
  };
  function badge383(){
    const b=document.getElementById('docsBadge383'),n=(P.portalDocs||[]).filter(x=>!x.decision||!x.decision.current).length;
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }

  dashboard=function(){
    let h=baseDashboard383();
    if(P.portalDocs===undefined)setTimeout(()=>loadDocs383(false).then(()=>{if(P.page==='dashboard')render()}),0);
    const a=P.portalDocs||[],pending=a.filter(x=>!x.decision||!x.decision.current);
    if(!a.length)return h;
    h+='<div class="card pd383-dashboard"><div class="card-head"><div><div class="eyebrow">DOCUMENTOS</div><h3>Propostas e contratos</h3><p class="muted tiny">'+pending.length+' documento(s) aguardando sua decisão.</p></div><button class="btn" onclick="goDocs383()">Abrir documentos</button></div>'+
      '<div class="pd383-mini-grid"><div><span>Publicados</span><b>'+a.length+'</b></div><div><span>Aguardando</span><b>'+pending.length+'</b></div><div><span>Aprovados/Aceitos</span><b>'+a.filter(x=>x.decision?.current&&/Aprovado|Aceito/.test(x.decision.decision)).length+'</b></div></div></div>';
    return h;
  };

  function list383(){
    const a=P.portalDocs||[];
    return'<div class="hero"><div><div class="eyebrow">DOCUMENTOS</div><h2>Propostas e contratos</h2><p>Visualize, aprove propostas e faça o aceite eletrônico dos contratos publicados para sua empresa.</p></div></div>'+
      '<div class="notice pd383-legal"><b>Aceite eletrônico:</b> ao aprovar ou aceitar, o sistema registra a versão do documento, usuário, nome informado e data/hora da decisão.</div>'+
      (a.length?'<div class="pd383-grid">'+a.map(d=>{const s=d.snapshot||{},isP=d.entityType==='proposal',value=isP?proposalTotal383(d):contractMonthly383(d);return'<article class="card pd383-card"><div class="card-head"><div><div class="eyebrow">'+label383(d.entityType).toUpperCase()+'</div><h3>'+e(s.title||d.payload?.title||label383(d.entityType))+'</h3><div class="tiny muted">'+(isP?((s.items?.length||0)+' serviço(s)'):'Vencimento dia '+e(s.billingDay||10))+'</div></div><span class="status '+dclass383(d.decision)+'">'+e(dec383(d.decision))+'</span></div><div class="pd383-value"><span>'+(isP?'Primeiro ciclo':'Mensalidade')+'</span><b>'+money383(value)+'</b></div><button class="btn primary" onclick="goDocs383(\''+e(d.entityType)+'\',\''+e(d.entityId)+'\')">Abrir '+label383(d.entityType).toLowerCase()+'</button></article>'}).join('')+'</div>':'<div class="card empty">Nenhuma proposta ou contrato publicado para sua conta.</div>');
  }

  function detail383(d){
    const s=d.snapshot||{},isP=d.entityType==='proposal',dec=d.decision,current=dec?.current;
    let main='';
    if(isP){
      main='<div class="grid kpis pd383-kpis"><div class="kpi"><span>Implantação</span><b>'+money383(s.setupNet)+'</b></div><div class="kpi"><span>Mensal</span><b>'+money383(s.monthlyNet)+'</b></div><div class="kpi"><span>Primeiro ciclo</span><b>'+money383(s.firstCycleTotal)+'</b></div><div class="kpi"><span>Validade</span><b>'+e(s.validityDays||15)+' dias</b></div></div>'+
        '<div class="card"><div class="eyebrow">ESCOPO</div><h3>Serviços e investimento</h3><div class="pd383-items">'+(s.items||[]).map(i=>'<div><div><b>'+e(i.name)+'</b><span>'+e(i.description||'')+'</span></div><div class="pd383-item-side">'+e(i.quantity||1)+' × '+money383(i.unitPrice)+'<br><b>'+money383(i.lineTotal)+'</b></div></div>').join('')+'</div></div>'+
        (s.diagnosisSummary?'<div class="card"><h3>Diagnóstico / objetivo</h3><p>'+e(s.diagnosisSummary)+'</p></div>':'')+
        (s.paymentTerms?'<div class="card"><h3>Condições de pagamento</h3><p>'+e(s.paymentTerms)+'</p></div>':'')+
        (s.notes?'<div class="card"><h3>Observações</h3><p>'+e(s.notes)+'</p></div>':'');
    }else{
      main='<div class="grid kpis pd383-kpis"><div class="kpi"><span>Mensalidade</span><b>'+money383(s.monthlyAmount)+'</b></div><div class="kpi"><span>Vencimento</span><b>Dia '+e(s.billingDay||10)+'</b></div><div class="kpi"><span>Início</span><b>'+date(s.startDate)+'</b></div><div class="kpi"><span>Fim</span><b>'+date(s.endDate)+'</b></div></div>'+
        '<div class="card"><div class="eyebrow">SERVIÇOS</div><h3>Escopo contratado</h3><div class="pd383-services">'+(s.services||[]).map(x=>'<span>'+e(x)+'</span>').join('')+'</div></div>'+
        (s.notes?'<div class="card"><h3>Observações</h3><p>'+e(s.notes)+'</p></div>':'');
    }
    const decision=current?'<div class="card pd383-decision"><div class="eyebrow">DECISÃO REGISTRADA</div><h3>'+e(dec.decision)+'</h3><p>Por <b>'+e(dec.actorName||'cliente')+'</b> em '+date(dec.createdAt)+'.</p>'+(dec.comment?'<p>'+e(dec.comment)+'</p>':'')+'</div>':'';
    const action=!current?'<div class="card pd383-action"><div class="card-head"><div><div class="eyebrow">AÇÃO NECESSÁRIA</div><h3>'+(isP?'Decisão sobre a proposta':'Aceite do contrato')+'</h3></div></div><p>'+(isP?'Aprove para registrar a concordância comercial, ou recuse informando um comentário.':'Leia o contrato e confirme o aceite eletrônico, ou recuse informando um comentário.')+'</p><div class="support"><button class="btn primary" onclick="openDecision383(\''+e(d.entityType)+'\',\''+e(d.entityId)+'\',\''+(isP?'Aprovado':'Aceito')+'\')">'+(isP?'Aprovar proposta':'Aceitar contrato')+'</button><button class="btn" onclick="openDecision383(\''+e(d.entityType)+'\',\''+e(d.entityId)+'\',\'Recusado\')">Recusar</button></div></div>':'';
    return'<div class="pd383-print"><div class="hero"><div><div class="eyebrow">'+label383(d.entityType).toUpperCase()+'</div><h2>'+e(s.title||label383(d.entityType))+'</h2><p>Publicado em '+date(d.publishedAt)+'</p></div><div class="support"><button class="btn" onclick="goDocs383()">← Voltar</button><button class="btn" onclick="printDoc383()">Imprimir / PDF</button></div></div>'+main+decision+action+'</div>';
  }

  function page383(){
    if(P.docSelected){const [t,id]=P.docSelected.split(':');const d=doc383(t,id);if(d)return detail383(d)}
    return list383();
  }
  window.printDoc383=function(){window.print()};

  window.openDecision383=function(type,id,decision){
    const d=doc383(type,id);if(!d)return;
    document.body.insertAdjacentHTML('beforeend','<div id="pdModal383" class="op381-modal-back"><div class="op381-modal"><button class="op381-x" onclick="closeDecision383()">×</button><div class="eyebrow">'+e(label383(type).toUpperCase())+'</div><h3>'+e(decision)+'</h3><p class="muted">Informe o nome completo da pessoa responsável por esta decisão.</p><div class="field"><label>NOME COMPLETO *</label><input id="pd383_name" class="input" maxlength="180"></div><div class="field"><label>COMENTÁRIO <span class="muted">(opcional)</span></label><textarea id="pd383_comment" rows="4" maxlength="2000"></textarea></div>'+(decision!=='Recusado'?'<label class="pd383-check"><input id="pd383_terms" type="checkbox"><span>Li o documento apresentado e concordo com seus termos e valores.</span></label>':'')+'<div class="actions"><button class="btn" onclick="closeDecision383()">Cancelar</button><button class="btn '+(decision==='Recusado'?'':'primary')+'" onclick="submitDecision383(\''+e(type)+'\',\''+e(id)+'\',\''+e(decision)+'\')">Confirmar '+e(decision.toLowerCase())+'</button></div></div></div>');
  };
  window.closeDecision383=function(){document.getElementById('pdModal383')?.remove()};
  window.submitDecision383=async function(type,id,decision){
    const actorName=document.getElementById('pd383_name')?.value.trim()||'',comment=document.getElementById('pd383_comment')?.value.trim()||'',acceptedTerms=decision==='Recusado'?false:!!document.getElementById('pd383_terms')?.checked;
    if(actorName.length<3)return alert('Informe o nome completo.');
    if(decision!=='Recusado'&&!acceptedTerms)return alert('Confirme que leu e concorda com o documento.');
    if(!confirm('Confirmar '+decision.toLowerCase()+'? Esta decisão ficará registrada no histórico.'))return;
    try{
      const j=await api('/api/portal/documents/decision',{method:'POST',body:JSON.stringify({entityType:type,entityId:id,decision,actorName,comment,acceptedTerms})});
      P.portalDocs=j.documents||[];closeDecision383();render();
    }catch(err){alert(err.message)}
  };

  render=function(){
    ensureNav383();
    if(P.page==='documents'){
      nav();document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page==='documents'));
      if(P.portalDocs===undefined&&!PD383.loading){$('main').innerHTML='<div class="card empty">Carregando documentos...</div>';setTimeout(()=>loadDocs383(true).then(()=>render()),0);return}
      $('clientChip').textContent=P.data?.client?.name||'';$('userChip').textContent=P.data?.user?.username+' · '+roleLabel(P.data?.user?.role);
      $('main').innerHTML=page383();badge383();return;
    }
    baseRender383();badge383();
  };

  setTimeout(async()=>{ensureNav383();if(P.data){await loadDocs383(false);if(P.page==='dashboard')render()}},1100);
})();
