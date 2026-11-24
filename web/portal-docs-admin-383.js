'use strict';
(function(){
  const D383={data:null,loading:false,leadId:''};

  function e383(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function rank383(){try{return roleRank(S.session?.user?.role||'')}catch{return 1}}
  function can383(){return rank383()>=3}
  function clients383(){return rows('lead').filter(r=>isClient(r.payload||{})).sort((a,b)=>String(a.payload?.name||'').localeCompare(String(b.payload?.name||''),'pt-BR'))}
  function cname383(id){const r=rows('lead').find(x=>x.entityId===id);return r?.payload?.name||r?.payload?.companyName||id||'Cliente'}
  function doc383(t,id){return D383.data?.documents?.find(x=>x.entityType===t&&x.entityId===id)||null}
  function money383(v){try{return money(Number(v||0))}catch{return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}}
  function typeLabel383(t){return t==='proposal'?'Proposta':'Contrato'}
  function decisionLabel383(d){if(!d)return'Pendente';if(!d.current)return'Requer nova aprovação';return d.decision}
  function statusClass383(d){const s=decisionLabel383(d);return /Aprovado|Aceito/i.test(s)?'ok':/Recusado/i.test(s)?'bad':/nova|Pendente/i.test(s)?'warn':''}

  const baseBuild383=buildNav;
  buildNav=function(){
    baseBuild383();
    const nav2=$('nav2');
    if(nav2&&can383()&&!document.querySelector('[data-sec="portalapprovals"]')){
      nav2.insertAdjacentHTML('beforeend','<button data-sec="portalapprovals" onclick="openSec(\'portalapprovals\')"><span class="ico">✓</span><span>Aprovações Portal</span><span id="badge_portalapprovals" class="badge hidden"></span></button>');
    }
    markNav();
  };
  const baseRender383=render;
  render=function(){
    if(S.active==='portalapprovals'){renderApprovals383();return}
    baseRender383();
  };

  async function load383(force=false){
    if(!can383())return;
    if(D383.loading)return;
    if(D383.data&&!force)return;
    D383.loading=true;
    try{
      const q=D383.leadId?'?leadId='+encodeURIComponent(D383.leadId):'';
      D383.data=await api('/api/web/client-portal/documents'+q);
    }catch(e){toast(e.message,7000)}
    finally{D383.loading=false;if(S.active==='portalapprovals')renderApprovals383();badge383()}
  }
  window.loadApprovals383=load383;

  function summary383(){
    const a=D383.data?.documents||[],pub=a.filter(x=>x.publication?.published),pending=pub.filter(x=>!x.decision||!x.decision.current),approved=pub.filter(x=>x.decision?.current&&/Aprovado|Aceito/.test(x.decision.decision)),rejected=pub.filter(x=>x.decision?.current&&x.decision.decision==='Recusado');
    return'<div class="grid kpis d383-kpis">'+
      kpi('Publicados',pub.length,'visíveis no portal')+
      kpi('Aguardando',pending.length,'decisão do cliente')+
      kpi('Aprovados/Aceitos',approved.length,'decisões válidas')+
      kpi('Recusados',rejected.length,'precisam atenção')+
    '</div>';
  }
  function filter383(){
    const opts='<option value="">Todos os clientes</option>'+clients383().map(r=>'<option value="'+e383(r.entityId)+'" '+(r.entityId===D383.leadId?'selected':'')+'>'+e383(r.payload?.name||r.payload?.companyName||r.entityId)+'</option>').join('');
    return'<div class="d383-toolbar"><select onchange="changeLead383(this.value)">'+opts+'</select><button class="btn" onclick="loadApprovals383(true)">↻ Atualizar</button></div>';
  }
  window.changeLead383=async function(v){D383.leadId=v||'';D383.data=null;await load383(true)};

  function rowInfo383(d){
    const p=d.payload||{};
    if(d.entityType==='proposal')return{
      title:p.title||'Proposta comercial',
      subtitle:(p.items?.length||0)+' serviço(s) · '+money383(p.firstCycleTotal||0),
      amount:'Mensal '+money383(p.monthlyNet||0)
    };
    return{
      title:p.title||'Contrato',
      subtitle:(p.services?.length||0)+' serviço(s) · vence dia '+(p.billingDay||10),
      amount:money383(p.monthlyAmount||0)+'/mês'
    };
  }
  function table383(){
    const a=D383.data?.documents||[];
    if(!a.length)return'<div class="card"><div class="empty">Nenhuma proposta ou contrato encontrado.</div></div>';
    return'<div class="table-wrap"><table class="table d383-table"><thead><tr><th>Cliente</th><th>Documento</th><th>Publicação</th><th>Decisão</th><th>Valor</th><th>Ações</th></tr></thead><tbody>'+
      a.map(d=>{const i=rowInfo383(d),pub=!!d.publication?.published,dec=d.decision;return'<tr>'+
        '<td><b>'+e383(cname383(d.leadId))+'</b></td>'+
        '<td><b>'+e383(i.title)+'</b><div class="tiny muted">'+e383(typeLabel383(d.entityType))+' · '+e383(i.subtitle)+'</div></td>'+
        '<td><span class="status '+(pub?'ok':'')+'">'+(pub?'Publicado':'Oculto')+'</span></td>'+
        '<td><span class="status '+statusClass383(dec)+'">'+e383(decisionLabel383(dec))+'</span>'+(dec?.actorName?'<div class="tiny muted">'+e383(dec.actorName)+' · '+e383(day(dec.createdAt))+'</div>':'')+'</td>'+
        '<td><b>'+e383(i.amount)+'</b></td>'+
        '<td><div class="actions">'+
          '<button class="btn sm" onclick="previewDoc383(\''+e383(d.entityType)+'\',\''+e383(d.entityId)+'\')">Visualizar</button>'+
          '<button class="btn sm '+(!pub?'primary':'')+'" onclick="togglePublish383(\''+e383(d.entityType)+'\',\''+e383(d.entityId)+'\','+(!pub)+')">'+(pub?'Ocultar':'Publicar')+'</button>'+
          (pub&&dec?.current?'<button class="btn sm" onclick="reopenDoc383(\''+e383(d.entityType)+'\',\''+e383(d.entityId)+'\')">Solicitar nova decisão</button>':'')+
        '</div></td></tr>'}).join('')+
    '</tbody></table></div>';
  }

  function renderApprovals383(){
    if(!can383()){$('content').innerHTML=head('PORTAL','Aprovações Portal','Acesso restrito.')+'<div class="card"><div class="empty">Sem permissão.</div></div>';return}
    if(!D383.data&&!D383.loading)setTimeout(()=>load383(true),0);
    $('content').innerHTML=head('PORTAL DO CLIENTE','Aprovações Portal','Publique propostas e contratos para aprovação/aceite eletrônico do cliente.')+
      (D383.data?summary383():'<div class="card"><div class="empty">Carregando...</div></div>')+
      filter383()+
      '<div class="notice d383-note"><b>Aceite eletrônico:</b> o sistema registra nome informado, usuário do portal, data/hora e uma impressão hash da versão aprovada. Isso não é assinatura digital qualificada ICP-Brasil.</div>'+
      (D383.data?table383():'');
    badge383();
  }
  function badge383(){
    const b=$('badge_portalapprovals'),a=D383.data?.documents||[],n=a.filter(x=>x.publication?.published&&(!x.decision||!x.decision.current)).length;
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }

  window.togglePublish383=async function(type,id,published){
    const d=doc383(type,id);if(!d)return;
    if(published&&!confirm('Publicar este '+typeLabel383(type).toLowerCase()+' no Portal do Cliente para decisão?'))return;
    try{
      const j=await api('/api/web/client-portal/documents/publish',{method:'PATCH',body:JSON.stringify({entityType:type,entityId:id,published,approvalRequired:true})});
      D383.data={ok:true,documents:j.documents||[]};toast(published?'Documento publicado no portal.':'Documento ocultado do portal.');renderApprovals383();
    }catch(e){toast(e.message,7000)}
  };
  window.reopenDoc383=async function(type,id){
    if(!confirm('Reenviar a versão atual para uma nova aprovação/aceite? A decisão anterior continuará registrada no histórico.'))return;
    try{
      const j=await api('/api/web/client-portal/documents/reopen',{method:'POST',body:JSON.stringify({entityType:type,entityId:id})});
      D383.data={ok:true,documents:j.documents||[]};toast('Documento reenviado para nova decisão.');renderApprovals383();
    }catch(e){toast(e.message,7000)}
  };

  window.previewDoc383=function(type,id){
    const d=doc383(type,id);if(!d)return;const p=d.payload||{},s=d.snapshot||{};
    $('modalEyebrow').textContent=typeLabel383(type).toUpperCase();
    $('modalTitle').textContent=s.title||p.title||typeLabel383(type);
    $('modalMeta').textContent=cname383(d.leadId)+' · '+(d.publication?.published?'Publicado no Portal':'Oculto');
    let body='';
    if(type==='proposal'){
      body='<div class="d383-preview"><div class="grid kpis d383-preview-kpis">'+
        kpi('Implantação',money383(s.setupNet),'projeto')+kpi('Mensal',money383(s.monthlyNet),'recorrência')+kpi('Primeiro ciclo',money383(s.firstCycleTotal),'total')+kpi('Validade',(s.validityDays||15)+' dias','comercial')+
      '</div><div class="card"><h3>Escopo</h3><div class="d383-items">'+(s.items||[]).map(i=>'<div><b>'+e383(i.name)+'</b><span>'+e383(i.billingType||'')+' · '+e383(i.quantity||1)+' × '+money383(i.unitPrice)+'</span></div>').join('')+'</div></div>'+
      (s.paymentTerms?'<div class="card"><h3>Condições</h3><p>'+e383(s.paymentTerms)+'</p></div>':'')+
      (s.notes?'<div class="card"><h3>Observações</h3><p>'+e383(s.notes)+'</p></div>':'')+'</div>';
    }else{
      body='<div class="d383-preview"><div class="grid kpis d383-preview-kpis">'+kpi('Mensalidade',money383(s.monthlyAmount),'recorrente')+kpi('Vencimento','Dia '+e383(s.billingDay||10),'mensal')+kpi('Início',e383(s.startDate||'—'),'vigência')+kpi('Fim',e383(s.endDate||'—'),'vigência')+'</div><div class="card"><h3>Serviços</h3><div class="d383-items">'+(s.services||[]).map(x=>'<div><b>'+e383(x)+'</b></div>').join('')+'</div></div>'+(s.notes?'<div class="card"><h3>Observações</h3><p>'+e383(s.notes)+'</p></div>':'')+'</div>';
    }
    if(d.decision)body+='<div class="card d383-decision-card"><h3>Última decisão</h3><p><b>'+e383(d.decision.decision)+'</b> por '+e383(d.decision.actorName||'cliente')+' em '+e383(day(d.decision.createdAt))+'.</p>'+(d.decision.comment?'<p>'+e383(d.decision.comment)+'</p>':'')+(d.decision.current?'':'<div class="notice">O documento foi alterado depois desta decisão e requer nova aprovação.</div>')+'</div>';
    $('modalBody').innerHTML=body;$('modalBack').classList.remove('hidden');
  };

  const prevShow383=showEntityModal;
  showEntityModal=function(r){
    prevShow383(r);
    if(r?.entityType!=='lead'||!isClient(r.payload||{})||!can383())return;
    setTimeout(()=>injectClientDocs383(r),0);
  };
  async function injectClientDocs383(r){
    const body=$('modalBody');if(!body||document.getElementById('clientDocs383'))return;
    if(!D383.data)await load383(true);
    const docs=(D383.data?.documents||[]).filter(x=>x.leadId===r.entityId);
    body.insertAdjacentHTML('beforeend','<div id="clientDocs383" class="card d383-client-card"><div class="d383-client-head"><div><div class="eyebrow">PROPOSTAS & CONTRATOS</div><h3>Aprovações no Portal</h3></div><button class="btn sm" onclick="closeModal();openDocsForClient383(\''+e383(r.entityId)+'\')">Abrir central</button></div><div class="d383-client-stats"><span>'+docs.filter(x=>x.publication?.published).length+' publicado(s)</span><span>'+docs.filter(x=>x.publication?.published&&(!x.decision||!x.decision.current)).length+' aguardando</span><span>'+docs.filter(x=>x.decision?.current&&/Aprovado|Aceito/.test(x.decision.decision)).length+' aprovado(s)/aceito(s)</span></div></div>');
  }
  window.openDocsForClient383=async function(id){D383.leadId=id;D383.data=null;S.active='portalapprovals';await load383(true);render()};

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{buildNav()}catch{}},550));
  setTimeout(()=>{if(S?.session&&can383())load383(true)},3600);
})();
