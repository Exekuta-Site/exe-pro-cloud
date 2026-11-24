'use strict';
(function(){
  function e368(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function num368(v){const x=Number(v);return Number.isFinite(x)?x:0}
  function today368(){return new Date().toISOString().slice(0,10)}
  function digits368(v){return String(v||'').replace(/\D+/g,'')}
  function norm368(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
  function addMonths368(dateStr,months){if(!months)return'';const d=new Date((dateStr||today368())+'T12:00:00');d.setMonth(d.getMonth()+Number(months||0));return d.toISOString().slice(0,10)}
  function canFinance368(){try{return roleRank(S.session?.user?.role)>=3}catch{return false}}

  const oldCloseModal368=closeModal;
  closeModal=function(){
    const m=$('modalBack')?.querySelector('.modal');if(m)m.classList.remove('client-create-cloud368');
    oldCloseModal368();
  };

  function ownerOptions368(){
    const set=new Set([S.session?.user?.username||'']);
    for(const r of rows('lead')){const a=String(r.payload?.assignedTo||'').trim();if(a)set.add(a)}
    const arr=[...set].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    return '<option value="">Sem responsável</option>'+arr.map(v=>'<option '+(v===(S.session?.user?.username||'')?'selected':'')+'>'+e368(v)+'</option>').join('');
  }
  function serviceChoices368(){
    const services=rows('service').map(r=>r.payload||{}).filter(x=>x.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
    if(!services.length)return'<span class="muted tiny">Cadastre serviços no Catálogo para selecioná-los aqui.</span>';
    return services.map(s=>'<label class="client-service-choice368"><input type="checkbox" value="'+e368(s.name||'Serviço')+'"><span>'+e368(s.name||'Serviço')+'</span></label>').join('');
  }
  function field368(id,label,ph='',type='text',extra=''){
    return '<div class="field"><label>'+label+'</label><input id="'+id+'" class="input" type="'+type+'" placeholder="'+e368(ph)+'" '+extra+'></div>';
  }
  function select368(id,label,options,value=''){
    return '<div class="field"><label>'+label+'</label><select id="'+id+'">'+options.map(o=>'<option '+(o===value?'selected':'')+'>'+e368(o)+'</option>').join('')+'</select></div>';
  }

  window.newClient=function(){showClientCreateCloud368()};

  window.showClientCreateCloud368=function(){
    $('modalEyebrow').textContent='NOVO REGISTRO';
    $('modalTitle').textContent='Novo cliente';
    $('modalMeta').textContent='Cadastro completo com a mesma estrutura da versão Windows.';
    const m=$('modalBack')?.querySelector('.modal');if(m)m.classList.add('client-create-cloud368');
    const day=Math.min(28,new Date().getDate());
    let h='<div id="clientCreateCloud368">'+
      '<div class="client-create-grid368">'+
        field368('cc368_name','NOME / NOME FANTASIA *','Nome principal do cliente')+
        field368('cc368_legal','RAZÃO SOCIAL','Razão social')+
        field368('cc368_doc','CNPJ / CPF','Documento do cliente')+
        field368('cc368_contact','CONTATO PRINCIPAL','Nome do responsável')+
        field368('cc368_role','CARGO / FUNÇÃO','Proprietário, Marketing...')+
        field368('cc368_email','E-MAIL','contato@empresa.com','email')+
        field368('cc368_phone','TELEFONE','(21) 99999-9999')+
        field368('cc368_wa','WHATSAPP','Telefone ou link wa.me')+
        field368('cc368_tg','TELEGRAM','@usuario ou t.me/usuario')+
        field368('cc368_site','SITE','https://...')+
        field368('cc368_ig','INSTAGRAM','https://instagram.com/...')+
        field368('cc368_fb','FACEBOOK','https://facebook.com/...')+
        '<div class="field span2"><label>ENDEREÇO</label><input id="cc368_address" class="input" placeholder="Rua, número, bairro"></div>'+
        field368('cc368_city','CIDADE','Cidade')+
        field368('cc368_state','UF','RJ','text','maxlength="2"')+
        '<div class="field"><label>RESPONSÁVEL INTERNO</label><select id="cc368_owner">'+ownerOptions368()+'</select></div>'+
        field368('cc368_since','CLIENTE DESDE','','date','value="'+today368()+'"')+
        select368('cc368_origin','ORIGEM',['Cliente antigo','Indicação','Prospecção','Site','Instagram','Google','Networking','Outro'],'Cliente antigo')+
        select368('cc368_account','SITUAÇÃO',['Ativo','Pausado','Encerrado'],'Ativo')+
        '<div class="field wide"><label>SERVIÇOS CONTRATADOS / EM CARTEIRA</label><div id="cc368_services" class="client-service-selector368">'+serviceChoices368()+'</div><div class="help" style="margin-top:5px">Você pode vincular serviços do catálogo mesmo sem criar uma proposta primeiro.</div></div>'+
        (canFinance368()?'<div class="field wide"><div class="client-finance368"><h3>Financeiro inicial <span class="muted tiny">(opcional)</span></h3><p class="help">Para clientes já contratados, crie a implantação, o contrato recorrente e a primeira mensalidade junto com o cadastro.</p><div class="client-create-grid368 finance368" style="margin-top:10px">'+
          field368('cc368_setup','IMPLANTAÇÃO / PROJETO (R$)','0,00','number','min="0" step="0.01"')+
          field368('cc368_monthly','MENSALIDADE (R$)','0,00','number','min="0" step="0.01"')+
          field368('cc368_due','PRIMEIRO VENCIMENTO','','date','value="'+today368()+'"')+
          field368('cc368_billday','DIA MENSAL','','number','min="1" max="28" value="'+day+'"')+
          field368('cc368_months','DURAÇÃO (MESES)','0 = sem término','number','min="0" step="1"')+
          '<div class="field"><label>FORMA DE PAGAMENTO</label><select id="cc368_pay"><option value="">Não informada</option><option>Pix</option><option>Boleto</option><option value="Cartao">Cartão</option><option>Transferencia</option><option>Dinheiro</option><option>Outro</option></select></div>'+
        '</div></div></div>':'')+
        '<div class="field wide"><label>PERFIL / CONTEXTO DO CLIENTE</label><textarea id="cc368_profile" rows="4" placeholder="Necessidades, perfil, objetivos, preferências e contexto importante..."></textarea></div>'+
        '<div class="field wide"><label>OBSERVAÇÕES INTERNAS</label><textarea id="cc368_notes" rows="3" placeholder="Informações administrativas ou comerciais adicionais"></textarea></div>'+
      '</div>'+
      '<div class="notice client-unified368"><b>Cadastro unificado:</b> se a empresa já existir como Lead, o EXE PRO converte o mesmo registro para Cliente e preserva o histórico anterior em vez de criar uma cópia.</div>'+
      '<div class="actions client-create-actions368"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveClientCreateCloud368()">Salvar cliente</button></div>'+
    '</div>';
    $('modalBody').innerHTML=h;
    $('modalBack').classList.remove('hidden');
  };

  function val368(id){return $(id)?.value??''}
  function services368(){return [...document.querySelectorAll('#cc368_services input[type=checkbox]:checked')].map(x=>x.value)}
  function clientPayload368(){
    return{
      name:val368('cc368_name').trim(),
      legalName:val368('cc368_legal').trim(),
      document:val368('cc368_doc').trim(),
      companyContactName:val368('cc368_contact').trim(),
      companyContactRole:val368('cc368_role').trim(),
      email:val368('cc368_email').trim(),
      phone:val368('cc368_phone').trim(),
      whatsapp:val368('cc368_wa').trim(),
      telegram:val368('cc368_tg').trim(),
      website:val368('cc368_site').trim(),
      instagram:val368('cc368_ig').trim(),
      facebook:val368('cc368_fb').trim(),
      address:val368('cc368_address').trim(),
      city:val368('cc368_city').trim(),
      state:val368('cc368_state').trim().toUpperCase(),
      assignedTo:val368('cc368_owner'),
      clientSince:val368('cc368_since')||today368(),
      clientOrigin:val368('cc368_origin')||'Cliente antigo',
      clientAccountStatus:val368('cc368_account')||'Ativo',
      clientServices:services368(),
      clientProfileNote:val368('cc368_profile').trim(),
      notes:val368('cc368_notes').trim(),
      crmStatus:'Cliente',
      source:'Cadastro direto'
    };
  }
  function financePayload368(){
    return{
      setup:num368(val368('cc368_setup')),
      monthly:num368(val368('cc368_monthly')),
      firstDue:val368('cc368_due')||today368(),
      billingDay:Math.max(1,Math.min(28,num368(val368('cc368_billday'))||10)),
      months:Math.max(0,Math.floor(num368(val368('cc368_months')))),
      paymentMethod:val368('cc368_pay')
    };
  }
  function findExisting368(p){
    const doc=digits368(p.document),phone=digits368(p.whatsapp||p.phone),name=norm368(p.name);
    for(const r of rows('lead')){
      const x=r.payload||{};
      if(doc&&doc.length>=8&&digits368(x.document)===doc)return r;
    }
    for(const r of rows('lead')){
      const x=r.payload||{},xp=digits368(x.whatsapp||x.phone),xn=norm368(x.name||x.companyName);
      if(phone&&xp===phone&&name&&xn===name)return r;
    }
    return null;
  }
  async function createEntity368(type,payload){
    return api('/api/web/entity',{method:'POST',body:JSON.stringify({entityType:type,payload})});
  }
  async function createInitialFinance368(clientId,p,fin){
    if(!canFinance368()||!clientId||(!fin.setup&&!fin.monthly))return;
    const due=fin.firstDue||today368();
    if(fin.setup>0){
      await createEntity368('receivable',{leadId:clientId,description:'Implantação / projeto inicial - '+p.name,category:'Projeto',amount:fin.setup,dueDate:due,status:'Pendente',paymentMethod:fin.paymentMethod,notes:'Gerado no cadastro inicial do cliente.'});
    }
    if(fin.monthly>0){
      const cj=await createEntity368('contract',{leadId:clientId,title:'Contrato recorrente - '+p.name,status:'Ativo',monthlyAmount:fin.monthly,billingDay:fin.billingDay,startDate:p.clientSince||today368(),endDate:addMonths368(p.clientSince||today368(),fin.months),services:p.clientServices||[],paymentMethod:fin.paymentMethod,notes:'Criado no cadastro inicial do cliente.'});
      const contractId=cj?.row?.entityId||'';
      await createEntity368('receivable',{leadId:clientId,contractId,originKey:contractId?('contract:'+contractId+':'+String(due).slice(0,7)):'',description:'Mensalidade - '+p.name,category:'Mensalidade',amount:fin.monthly,dueDate:due,status:'Pendente',paymentMethod:fin.paymentMethod,notes:'Primeira mensalidade gerada no cadastro do cliente.'});
    }
  }

  window.saveClientCreateCloud368=async function(){
    const p=clientPayload368(),fin=financePayload368();
    if(!p.name){toast('Informe o nome do cliente.');return}
    try{
      let existing=findExisting368(p),clientId='',action='created';
      if(existing){
        const wasClient=existing.payload?.crmStatus==='Cliente'||!!existing.payload?.clientSince;
        const msg=wasClient?'Este cliente já existe. Deseja atualizar o cadastro existente?':'Encontramos um Lead da mesma empresa. Deseja convertê-lo em Cliente sem perder o histórico?';
        if(!confirm(msg))return;
        const patch={...p,source:existing.payload?.source||p.source};
        const j=await patchEntity(existing,patch);
        clientId=j?.row?.entityId||existing.entityId;
        action=wasClient?'updated':'converted';
      }else{
        const j=await createEntity368('lead',p);
        clientId=j?.row?.entityId||'';
      }
      if(action!=='updated'&&(fin.setup>0||fin.monthly>0)){
        try{await createInitialFinance368(clientId,p,fin)}
        catch(fe){toast('Cliente salvo, mas houve falha ao criar o financeiro inicial: '+fe.message,7000)}
      }
      closeModal();
      await refreshAll(false,true);
      toast(action==='converted'?'Lead existente convertido em Cliente sem perder o histórico.':action==='updated'?'Cadastro do cliente atualizado.':'Cliente cadastrado com sucesso.',5500);
      if(clientId)setTimeout(()=>{const r=rows('lead').find(x=>x.entityId===clientId);if(r)showEntityModal(r)},200);
    }catch(e){toast('Erro ao salvar cliente: '+e.message,7000)}
  };
})();
