'use strict';
(function(){
  const baseShowClient368=window.showClientCreateCloud368;
  const baseRenderLeadList369=renderLeadList;

  function e369(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function n369(v){const x=Number(v);return Number.isFinite(x)?x:0}
  function norm369(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
  function digits369(v){return String(v||'').replace(/\D+/g,'')}
  function today369(){return new Date().toISOString().slice(0,10)}
  function canWrite369(){try{return canWrite()}catch{return true}}
  function canFinance369(){try{return roleRank(S.session?.user?.role)>=3}catch{return false}}
  function isActiveContract369(x){return !['Encerrado','Cancelado','Pausado'].includes(String(x?.status||''))}

  function linkedContracts369(id){
    return rows('contract').filter(r=>String(r.payload?.leadId||'')===String(id));
  }
  function linkedReceivables369(id){
    return rows('receivable').filter(r=>String(r.payload?.leadId||'')===String(id));
  }
  function linkedRows369(id){
    const out=[];
    for(const type of ['proposal','project','contract','receivable']){
      for(const r of rows(type))if(String(r.payload?.leadId||'')===String(id))out.push(r);
    }
    return out;
  }
  function activeContract369(id){
    return linkedContracts369(id).find(r=>isActiveContract369(r.payload||{}))||null;
  }
  function serviceItems371(x){
    const arr=Array.isArray(x?.clientServiceItems)?x.clientServiceItems:[];
    return arr.filter(it=>it&&typeof it==='object');
  }
  function serviceMonthlyTotal371(x){
    return serviceItems371(x).filter(it=>String(it.status||'Ativo')==='Ativo'&&String(it.billingCycle||'Mensal')==='Mensal').reduce((a,it)=>a+n369(it.price),0);
  }
  function serviceOtherTotal371(x){
    return serviceItems371(x).filter(it=>String(it.status||'Ativo')==='Ativo'&&String(it.billingCycle||'Mensal')!=='Mensal').reduce((a,it)=>a+n369(it.price),0);
  }
  function serviceCatalog371(){
    try{return rows('service').map(r=>r.payload||{}).filter(x=>x.active!==false).map(x=>x.name||x.serviceName).filter(Boolean)}catch{return[]}
  }
  function serviceSiteOptions371(leadId){
    let out=[];
    try{if(typeof window.getWpSitesForLead370==='function')out=window.getWpSitesForLead370(leadId)||[]}catch{}
    return out;
  }
  function serviceRow371(item={},idx=0,leadId=''){
    const catalogs=serviceCatalog371(),sites=serviceSiteOptions371(leadId),id=item.id||('svc_'+Date.now().toString(36)+'_'+idx);
    const siteList=sites.map(s=>'<option value="'+e369(s.siteUrl)+'">'+e369(s.label||s.siteUrl)+'</option>').join('');
    const catList=catalogs.map(s=>'<option value="'+e369(s)+'"></option>').join('');
    return '<div class="client-service-price-row371" data-service-id="'+e369(id)+'">'+
      '<div class="field"><label>SERVIÇO</label><input class="input sp371-name" list="sp371-catalog-'+idx+'" value="'+e369(item.name||'')+'" placeholder="Ex.: SEO Local"><datalist id="sp371-catalog-'+idx+'">'+catList+'</datalist></div>'+
      '<div class="field"><label>SITE / DOMÍNIO</label><input class="input sp371-site" list="sp371-sites-'+idx+'" value="'+e369(item.siteUrl||'')+'" placeholder="https://cliente.com.br"><datalist id="sp371-sites-'+idx+'">'+siteList+'</datalist></div>'+
      '<div class="field"><label>VALOR</label><input class="input sp371-price" type="number" min="0" step="0.01" value="'+e369(n369(item.price)||'')+'" placeholder="0,00"></div>'+
      '<div class="field"><label>PERIODICIDADE</label><select class="sp371-cycle"><option '+(String(item.billingCycle||'Mensal')==='Mensal'?'selected':'')+'>Mensal</option><option '+(item.billingCycle==='Único'?'selected':'')+'>Único</option><option '+(item.billingCycle==='Anual'?'selected':'')+'>Anual</option></select></div>'+
      '<div class="field"><label>VENCIMENTO</label><input class="input sp371-day" type="number" min="1" max="28" value="'+e369(item.billingDay||10)+'"></div>'+
      '<div class="field"><label>STATUS</label><select class="sp371-status"><option '+(String(item.status||'Ativo')==='Ativo'?'selected':'')+'>Ativo</option><option '+(item.status==='Pausado'?'selected':'')+'>Pausado</option><option '+(item.status==='Encerrado'?'selected':'')+'>Encerrado</option></select></div>'+
      '<button class="btn sm danger369 sp371-remove" type="button" onclick="removeServicePrice371(this)">Remover</button>'+
    '</div>';
  }
  window.removeServicePrice371=function(btn){btn.closest('.client-service-price-row371')?.remove();updateServicePricing371()};
  window.addServicePrice371=function(){
    const box=document.getElementById('clientServicePricingRows371');if(!box)return;
    const leadId=S.clientEdit369||'';
    box.insertAdjacentHTML('beforeend',serviceRow371({},box.children.length,leadId));
    bindServicePricing371();
  };
  function collectServiceItems371(){
    const out=[];
    document.querySelectorAll('#clientServicePricingRows371 .client-service-price-row371').forEach((row,idx)=>{
      const name=row.querySelector('.sp371-name')?.value.trim()||'';if(!name)return;
      out.push({
        id:row.dataset.serviceId||('svc_'+Date.now().toString(36)+'_'+idx),
        name,
        siteUrl:row.querySelector('.sp371-site')?.value.trim()||'',
        price:n369(row.querySelector('.sp371-price')?.value),
        billingCycle:row.querySelector('.sp371-cycle')?.value||'Mensal',
        billingDay:Math.max(1,Math.min(28,n369(row.querySelector('.sp371-day')?.value)||10)),
        status:row.querySelector('.sp371-status')?.value||'Ativo'
      });
    });
    return out;
  }
  function updateServicePricing371(){
    const items=collectServiceItems371();
    const monthly=items.filter(x=>x.status==='Ativo'&&x.billingCycle==='Mensal').reduce((a,x)=>a+n369(x.price),0);
    const other=items.filter(x=>x.status==='Ativo'&&x.billingCycle!=='Mensal').reduce((a,x)=>a+n369(x.price),0);
    const m=$('cc368_monthly');if(m&&items.length)m.value=monthly.toFixed(2);
    const sm=document.getElementById('serviceMonthlyTotal371'),so=document.getElementById('serviceOtherTotal371');
    if(sm)sm.textContent=money(monthly);if(so)so.textContent=money(other);
  }
  function bindServicePricing371(){
    document.querySelectorAll('#clientServicePricingRows371 input,#clientServicePricingRows371 select').forEach(el=>{el.oninput=updateServicePricing371;el.onchange=updateServicePricing371});
    updateServicePricing371();
  }
  function renderServicePricing371(record){
    const anchor=document.getElementById('cc368_services')?.closest('.field');if(!anchor)return;
    document.getElementById('clientServicePricing371')?.remove();
    const items=serviceItems371(record?.payload||{});
    const html='<div id="clientServicePricing371" class="field wide"><div class="client-service-pricing371">'+
      '<div class="client-service-pricing-head371"><div><h3>Serviços por site e valor</h3><p class="help">Cadastre cada serviço com domínio, preço e periodicidade. O total mensal alimenta automaticamente a mensalidade do cliente.</p></div><button class="btn sm primary" type="button" onclick="addServicePrice371()">+ Adicionar serviço</button></div>'+
      '<div id="clientServicePricingRows371">'+(items.length?items.map((it,i)=>serviceRow371(it,i,record?.entityId||'')).join(''):serviceRow371({},0,record?.entityId||''))+'</div>'+
      '<div class="client-service-totals371"><div><span>Total mensal</span><b id="serviceMonthlyTotal371">'+money(serviceMonthlyTotal371(record?.payload||{}))+'</b></div><div><span>Outros valores</span><b id="serviceOtherTotal371">'+money(serviceOtherTotal371(record?.payload||{}))+'</b></div></div>'+
    '</div></div>';
    anchor.insertAdjacentHTML('afterend',html);bindServicePricing371();
  }

  function clientMonthly369(r){
    const contracts=linkedContracts369(r.entityId).filter(x=>isActiveContract369(x.payload||{}));
    const priced=serviceMonthlyTotal371(r.payload||{});
    if(priced>0)return priced;
    const sum=contracts.reduce((a,x)=>a+n369(x.payload?.monthlyAmount),0);
    if(sum>0)return sum;
    const x=r.payload||{};
    return n369(x.clientMonthlyAmount||x.monthlyAmount||x.dealValue||0);
  }
  function clientBillingDay369(r){
    const c=activeContract369(r.entityId);
    return Math.max(1,Math.min(28,n369(c?.payload?.billingDay||r.payload?.clientBillingDay||10)||10));
  }
  function clientPayment369(r){
    const c=activeContract369(r.entityId);
    return String(c?.payload?.paymentMethod||r.payload?.clientPaymentMethod||'');
  }
  function nextReceivable369(id){
    const arr=linkedReceivables369(id).filter(r=>!['Pago','Cancelado'].includes(String(r.payload?.status||''))).sort((a,b)=>String(a.payload?.dueDate||'').localeCompare(String(b.payload?.dueDate||'')));
    return arr[0]||null;
  }

  function clients369(){
    let arr=rows('lead').filter(r=>isClient(r.payload||{}));
    const q=norm369(S.clientSearch369||'');
    if(q)arr=arr.filter(r=>{
      const x=r.payload||{};
      return [x.name,x.companyName,x.legalName,x.document,x.phone,x.whatsapp,x.email,x.assignedTo,x.city].some(v=>norm369(v).includes(q));
    });
    return arr.sort((a,b)=>String(a.payload?.name||a.payload?.companyName||'').localeCompare(String(b.payload?.name||b.payload?.companyName||''),'pt-BR'));
  }

  function renderClients369(){
    const list=clients369();
    const actions=canWrite369()?'<button class="btn primary" onclick="newClient()">+ Novo cliente</button>':'';
    let h=head('CARTEIRA DE CLIENTES','Clientes','Clientes ativos, mensalidades e histórico comercial centralizado.',actions);
    h+='<div class="client-toolbar369"><input class="input" placeholder="Buscar empresa, telefone, responsável..." value="'+e369(S.clientSearch369||'')+'" oninput="S.clientSearch369=this.value;render()"><span class="status">'+list.length+' registro(s)</span></div>';
    if(!list.length)return h+'<div class="card"><div class="empty">Nenhum cliente encontrado.</div></div>';
    h+='<div class="table-wrap"><table class="table client-table369"><thead><tr><th>Empresa</th><th>Status</th><th>Responsável</th><th>Contato</th><th>Mensalidade</th><th>Próxima ação</th><th>Ações</th></tr></thead><tbody>';
    h+=list.map(r=>{
      const x=r.payload||{},monthly=clientMonthly369(r),contact=x.whatsapp||x.phone||x.email||'—';
      const acc=x.clientAccountStatus||'Ativo';
      return '<tr>'+
        '<td><b>'+e369(x.name||x.companyName||'Cliente')+'</b><div class="tiny muted">'+e369([x.city,x.state].filter(Boolean).join(' · ')||x.legalName||'')+'</div></td>'+
        '<td>'+status(acc)+'</td>'+
        '<td>'+e369(x.assignedTo||'—')+'</td>'+
        '<td>'+e369(contact)+'</td>'+
        '<td><b class="client-monthly369">'+money(monthly)+'</b><div class="tiny muted">'+(monthly>0?'recorrente':'sem mensalidade')+'</div></td>'+
        '<td>'+e369(x.nextActionAt?day(x.nextActionAt):'—')+(x.nextActionNote?'<div class="tiny muted">'+e369(x.nextActionNote)+'</div>':'')+'</td>'+
        '<td><div class="actions client-actions369">'+
          (canWrite369()?'<button class="btn sm" onclick="editClient369(\''+e369(r.entityId)+'\')">Editar</button>':'')+
          '<button class="btn sm" onclick="openEntity(\'lead\',\''+e369(r.entityId)+'\')">360°</button>'+
          (canWrite369()?'<button class="btn sm danger369" onclick="deleteClient369(\''+e369(r.entityId)+'\')">Excluir</button>':'')+
        '</div></td>'+
      '</tr>';
    }).join('');
    return h+'</tbody></table></div>';
  }

  renderLeadList=function(clientOnly=false){
    if(clientOnly)return renderClients369();
    return baseRenderLeadList369(false);
  };

  function prepareForm369(record){
    const modal=$('modalBack')?.querySelector('.modal');
    if(modal)modal.classList.add('client-create-cloud368','client-edit369');
    const save=[...document.querySelectorAll('#modalBody button')].find(b=>/Salvar cliente|Salvar alterações/i.test(b.textContent||''));
    if(save){save.textContent=record?'Salvar alterações':'Salvar cliente';save.setAttribute('onclick','saveClient369()')}
    S.clientEdit369=record?record.entityId:null;
    if(!record)return;
    const x=record.payload||{},c=activeContract369(record.entityId),rec=nextReceivable369(record.entityId);
    $('modalTitle').textContent='Editar cliente';
    $('modalMeta').textContent='Edite cadastro, carteira e mensalidade. O histórico e o ID do cliente são preservados.';
    const values={
      cc368_name:x.name||x.companyName||'',cc368_legal:x.legalName||'',cc368_doc:x.document||'',
      cc368_contact:x.companyContactName||'',cc368_role:x.companyContactRole||'',cc368_email:x.email||'',
      cc368_phone:x.phone||'',cc368_wa:x.whatsapp||'',cc368_tg:x.telegram||'',cc368_site:x.website||'',
      cc368_ig:x.instagram||'',cc368_fb:x.facebook||'',cc368_address:x.address||'',cc368_city:x.city||'',
      cc368_state:x.state||'',cc368_owner:x.assignedTo||'',cc368_since:String(x.clientSince||'').slice(0,10)||today369(),
      cc368_origin:x.clientOrigin||x.source||'Cliente antigo',cc368_account:x.clientAccountStatus||'Ativo',
      cc368_profile:x.clientProfileNote||'',cc368_notes:x.notes||'',cc368_setup:0,
      cc368_monthly:clientMonthly369(record),cc368_due:String(rec?.payload?.dueDate||today369()).slice(0,10),
      cc368_billday:clientBillingDay369(record),cc368_months:0,cc368_pay:clientPayment369(record)
    };
    for(const [id,v] of Object.entries(values)){const el=$(id);if(el)el.value=v}
    const selected=new Set((x.clientServices||[]).map(norm369));
    document.querySelectorAll('#cc368_services input[type=checkbox]').forEach(cb=>{cb.checked=selected.has(norm369(cb.value))});
    renderServicePricing371(record);
    const fin=document.querySelector('.client-finance368');
    if(fin&&!document.getElementById('clientFinanceHint369')){
      fin.insertAdjacentHTML('afterbegin','<div id="clientFinanceHint369" class="notice client-finance-hint369">A mensalidade abaixo é o valor recorrente do cliente. Ao salvar, o EXE PRO atualiza o contrato ativo e a cobrança pendente vinculada.</div>');
    }
  }

  window.newClient=function(){
    S.clientEdit369=null;
    baseShowClient368();
    setTimeout(()=>prepareForm369(null),0);
  };
  window.editClient369=function(id){
    const r=rows('lead').find(x=>x.entityId===id);
    if(!r)return toast('Cliente não encontrado.');
    baseShowClient368();
    setTimeout(()=>prepareForm369(r),0);
  };

  function v369(id){return $(id)?.value??''}
  function services369(){return [...document.querySelectorAll('#cc368_services input[type=checkbox]:checked')].map(x=>x.value)}
  function collect369(){
    const monthly=n369(v369('cc368_monthly')),billingDay=Math.max(1,Math.min(28,n369(v369('cc368_billday'))||10));
    return{
      name:v369('cc368_name').trim(),legalName:v369('cc368_legal').trim(),document:v369('cc368_doc').trim(),
      companyContactName:v369('cc368_contact').trim(),companyContactRole:v369('cc368_role').trim(),email:v369('cc368_email').trim(),
      phone:v369('cc368_phone').trim(),whatsapp:v369('cc368_wa').trim(),telegram:v369('cc368_tg').trim(),website:v369('cc368_site').trim(),
      instagram:v369('cc368_ig').trim(),facebook:v369('cc368_fb').trim(),address:v369('cc368_address').trim(),city:v369('cc368_city').trim(),
      state:v369('cc368_state').trim().toUpperCase(),assignedTo:v369('cc368_owner'),clientSince:v369('cc368_since')||today369(),
      clientOrigin:v369('cc368_origin')||'Cliente antigo',clientAccountStatus:v369('cc368_account')||'Ativo',
      clientServiceItems:collectServiceItems371(),
      clientServices:[...new Set([...services369(),...collectServiceItems371().map(x=>x.name)])],
      clientProfileNote:v369('cc368_profile').trim(),notes:v369('cc368_notes').trim(),crmStatus:'Cliente',
      clientMonthlyAmount:collectServiceItems371().length?collectServiceItems371().filter(x=>x.status==='Ativo'&&x.billingCycle==='Mensal').reduce((a,x)=>a+n369(x.price),0):monthly,
      clientBillingDay:billingDay,clientPaymentMethod:v369('cc368_pay'),source:'Cadastro direto'
    };
  }
  function finance369(){
    const items=collectServiceItems371();
    const pricedMonthly=items.filter(x=>x.status==='Ativo'&&x.billingCycle==='Mensal').reduce((a,x)=>a+n369(x.price),0);
    return{setup:n369(v369('cc368_setup')),monthly:items.length?pricedMonthly:n369(v369('cc368_monthly')),due:v369('cc368_due')||today369(),
      billingDay:Math.max(1,Math.min(28,n369(v369('cc368_billday'))||10)),months:Math.max(0,Math.floor(n369(v369('cc368_months')))),paymentMethod:v369('cc368_pay')};
  }
  function findDuplicate369(p){
    const doc=digits369(p.document),phone=digits369(p.whatsapp||p.phone),name=norm369(p.name);
    if(doc&&doc.length>=8){const r=rows('lead').find(r=>digits369(r.payload?.document)===doc);if(r)return r}
    if(phone&&name){return rows('lead').find(r=>digits369(r.payload?.whatsapp||r.payload?.phone)===phone&&norm369(r.payload?.name||r.payload?.companyName)===name)||null}
    return null;
  }
  async function create369(type,payload){return api('/api/web/entity',{method:'POST',body:JSON.stringify({entityType:type,payload})})}

  function conservativeLegacyContract369(client){
    const linked=activeContract369(client.entityId);if(linked)return linked;
    const name=norm369(client.payload?.name||client.payload?.companyName);
    if(!name)return null;
    const sameClients=rows('lead').filter(r=>isClient(r.payload||{})&&norm369(r.payload?.name||r.payload?.companyName)===name);
    if(sameClients.length!==1)return null;
    const matches=rows('contract').filter(r=>!r.payload?.leadId&&isActiveContract369(r.payload||{})&&norm369(r.payload?.title)==='contrato recorrente - '+name);
    return matches.length===1?matches[0]:null;
  }
  async function syncFinance369(clientId,p,fin,isEdit){
    if(!canFinance369()||!clientId)return;
    let client=rows('lead').find(r=>r.entityId===clientId)||{entityId:clientId,payload:p};
    let contract=activeContract369(clientId)||conservativeLegacyContract369(client);
    if(fin.monthly>0||contract){
      const patch={leadId:clientId,title:'Contrato recorrente - '+p.name,status:'Ativo',monthlyAmount:fin.monthly,billingDay:fin.billingDay,
        startDate:p.clientSince||today369(),services:p.clientServices||[],paymentMethod:fin.paymentMethod};
      if(fin.months>0){const d=new Date((p.clientSince||today369())+'T12:00:00');d.setMonth(d.getMonth()+fin.months);patch.endDate=d.toISOString().slice(0,10)}
      if(contract)await patchEntity(contract,patch);else if(fin.monthly>0){const j=await create369('contract',patch);contract=j?.row||null}
    }
    if(fin.setup>0){
      await create369('receivable',{leadId:clientId,description:'Implantação / projeto inicial - '+p.name,category:'Projeto',amount:fin.setup,dueDate:fin.due,status:'Pendente',paymentMethod:fin.paymentMethod,notes:isEdit?'Implantação adicionada na edição do cliente.':'Gerado no cadastro inicial do cliente.'});
    }
    if(fin.monthly>0){
      const existing=linkedReceivables369(clientId).find(r=>String(r.payload?.dueDate||'').slice(0,10)===fin.due&&String(r.payload?.category||'').toLowerCase().includes('mensal')&&!['Pago','Cancelado'].includes(String(r.payload?.status||'')));
      const contractId=contract?.entityId||contract?.row?.entityId||'';
      const patch={leadId:clientId,contractId,originKey:contractId?('contract:'+contractId+':'+String(fin.due).slice(0,7)):'',
        description:'Mensalidade - '+p.name,category:'Mensalidade',amount:fin.monthly,dueDate:fin.due,status:'Pendente',paymentMethod:fin.paymentMethod};
      if(existing)await patchEntity(existing,patch);else await create369('receivable',patch);
    }
  }

  window.saveClient369=async function(){
    const p=collect369(),fin=finance369();
    if(!p.name)return toast('Informe o nome do cliente.');
    try{
      let r=S.clientEdit369?rows('lead').find(x=>x.entityId===S.clientEdit369):null;
      let action=r?'updated':'created',clientId='';
      if(!r){
        const dup=findDuplicate369(p);
        if(dup){
          const wasClient=isClient(dup.payload||{});
          if(!confirm(wasClient?'Este cliente já existe. Deseja atualizar o cadastro existente?':'Encontramos um Lead da mesma empresa. Deseja convertê-lo em Cliente sem perder o histórico?'))return;
          r=dup;action=wasClient?'updated':'converted';
        }
      }
      if(r){
        const patch={...p,source:r.payload?.source||p.source};
        const j=await patchEntity(r,patch);clientId=j?.row?.entityId||r.entityId;
      }else{
        const j=await create369('lead',p);clientId=j?.row?.entityId||'';
      }
      await refreshAll(false,true);
      try{await syncFinance369(clientId,p,fin,action==='updated')}catch(fe){toast('Cliente salvo, mas o financeiro precisa de atenção: '+fe.message,7000)}
      closeModal();await refreshAll(false,true);
      toast(action==='converted'?'Lead convertido em Cliente sem perder o histórico.':action==='updated'?'Cliente e mensalidade atualizados.':'Cliente cadastrado com mensalidade vinculada.',5500);
    }catch(e){toast('Erro ao salvar cliente: '+e.message,7000)}
  };

  window.deleteClient369=async function(id){
    const r=rows('lead').find(x=>x.entityId===id);if(!r)return toast('Cliente não encontrado.');
    const name=r.payload?.name||r.payload?.companyName||'este cliente',linked=linkedRows369(id);
    if(!confirm('Excluir '+name+'? A exclusão será sincronizada com o Windows.'))return;
    let cascade=false;
    if(linked.length){
      cascade=confirm('Este cliente possui '+linked.length+' registro(s) vinculado(s) em propostas, projetos, contratos ou financeiro.\n\nOK = excluir também os registros vinculados.\nCancelar = não excluir nada.');
      if(!cascade)return;
    }
    try{
      const j=await api('/api/web/entity/delete',{method:'POST',body:JSON.stringify({entityType:'lead',entityId:id,cloudVersion:r.cloudVersion,cascade})});
      await refreshAll(false,true);toast((j.deleted||1)+' registro(s) enviado(s) para exclusão sincronizada.',5000);
    }catch(e){toast('Não foi possível excluir: '+e.message,7000)}
  };
})();
