'use strict';
(function(){
  const B384={data:null,loading:false,leadId:'',tab:'clients'};

  function e384(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function rank384(){try{return roleRank(S.session?.user?.role||'')}catch{return 1}}
  function can384(){return rank384()>=3}
  function admin384(){return rank384()>=4}
  function money384(v){try{return money(Number(v||0))}catch{return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}}
  function date384(v){try{return day(v)}catch{return String(v||'').slice(0,10)||'—'}}
  function pct384(v){return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%'}
  function client384(id){return B384.data?.clients?.find(x=>x.leadId===id)||null}
  function invoice384(id){return B384.data?.invoices?.find(x=>x.receivableId===id)||null}
  function status384(s,calc){const label=calc?.overdue&&!/Pago|Cancel|Exclu/i.test(s)?'Atrasado':s;let cls=/Pago/i.test(label)?'ok':/Atras|Exclu|Cancel/i.test(label)?'bad':/Parcial/i.test(label)?'warn':'';return'<span class="status '+cls+'">'+e384(label||'Pendente')+'</span>'}
  function termSummary384(p){const parts=[];if(Number(p.lateFeePercent)>0)parts.push('multa '+pct384(p.lateFeePercent));if(Number(p.monthlyInterestPercent)>0)parts.push('juros '+pct384(p.monthlyInterestPercent)+'/mês');if(Number(p.earlyDiscountPercent)>0)parts.push('desconto '+pct384(p.earlyDiscountPercent));return parts.length?parts.join(' · '):'sem acréscimos/desconto'}
  function currentPeriod384(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}

  const baseBuild384=buildNav;
  buildNav=function(){
    baseBuild384();
    const nav2=$('nav2');
    if(nav2&&can384()&&!document.querySelector('[data-sec="billing384"]')){
      nav2.insertAdjacentHTML('beforeend','<button data-sec="billing384" onclick="openSec(\'billing384\')"><span class="ico">R$</span><span>Financeiro Recorrente</span><span id="badge_billing384" class="badge hidden"></span></button>');
    }
    markNav();
  };
  const baseRender384=render;
  render=function(){
    if(S.active==='billing384'){renderBilling384();return}
    baseRender384();
  };

  async function load384(force=false){
    if(!can384())return;
    if(B384.loading)return;
    if(B384.data&&!force)return;
    B384.loading=true;
    try{
      const q=B384.leadId?'?leadId='+encodeURIComponent(B384.leadId):'';
      B384.data=await api('/api/web/billing-recurring'+q);
    }catch(err){toast(err.message,7000)}
    finally{B384.loading=false;if(S.active==='billing384')renderBilling384();badge384()}
  }
  window.loadBilling384=load384;

  function badge384(){
    const b=$('badge_billing384'),n=(B384.data?.invoices||[]).filter(x=>x.calc?.overdue&&!/Pago|Cancel|Exclu/i.test(x.status)).length;
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }
  function summary384(){
    const s=B384.data?.summary||{};
    return'<div class="grid kpis b384-kpis">'+
      kpi('Receita recorrente',money384(s.monthly),'serviços mensais ativos')+
      kpi('Automação ativa',s.autoProfiles||0,'clientes com geração automática')+
      kpi('Cobranças abertas',s.open||0,'recorrentes')+
      kpi('Saldo em atraso',money384(s.overdueBalance),'com encargos calculados')+
      kpi('Recebido',money384(s.received),'pagamentos registrados')+
    '</div>';
  }
  function tabs384(){
    return'<div class="b384-tabs">'+
      '<button class="btn '+(B384.tab==='clients'?'primary':'')+'" onclick="setBillingTab384(\'clients\')">Clientes</button>'+
      '<button class="btn '+(B384.tab==='invoices'?'primary':'')+'" onclick="setBillingTab384(\'invoices\')">Cobranças</button>'+
      '<button class="btn '+(B384.tab==='payments'?'primary':'')+'" onclick="setBillingTab384(\'payments\')">Pagamentos</button>'+
      '<button class="btn '+(B384.tab==='runs'?'primary':'')+'" onclick="setBillingTab384(\'runs\')">Execuções</button>'+
    '</div>';
  }
  window.setBillingTab384=function(t){B384.tab=t;renderBilling384()};
  function filters384(){
    const opts='<option value="">Todos os clientes</option>'+(B384.data?.clients||[]).map(c=>'<option value="'+e384(c.leadId)+'" '+(c.leadId===B384.leadId?'selected':'')+'>'+e384(c.name)+'</option>').join('');
    return'<div class="b384-toolbar"><select onchange="changeBillingLead384(this.value)">'+opts+'</select>'+tabs384()+'</div>';
  }
  window.changeBillingLead384=async function(v){B384.leadId=v||'';B384.data=null;await load384(true)};

  function clientsTable384(){
    const a=B384.data?.clients||[];
    if(!a.length)return'<div class="card"><div class="empty">Nenhum cliente com dados financeiros encontrado.</div></div>';
    return'<div class="table-wrap"><table class="table b384-table"><thead><tr><th>Cliente</th><th>Serviços mensais</th><th>Vencimento</th><th>Pagamento</th><th>Regras</th><th>Automação</th><th>Ações</th></tr></thead><tbody>'+
      a.map(c=>'<tr>'+
        '<td><b>'+e384(c.name)+'</b><div class="tiny muted">'+c.services.length+' serviço(s)</div></td>'+
        '<td><b>'+money384(c.monthly)+'</b><div class="tiny muted">'+e384(c.services.map(x=>x.name).slice(0,3).join(' · ')||'Sem serviço mensal')+'</div></td>'+
        '<td>Dia <b>'+e384(c.profile.billingDay)+'</b><div class="tiny muted">carência '+e384(c.profile.graceDays)+' dia(s)</div></td>'+
        '<td>'+e384(c.profile.paymentMethod||'Não definido')+'</td>'+
        '<td><span class="tiny">'+e384(termSummary384(c.profile))+'</span></td>'+
        '<td><span class="status '+(c.profile.saved&&c.profile.autoGenerate&&c.profile.enabled?'ok':'')+'">'+(c.profile.saved&&c.profile.autoGenerate&&c.profile.enabled?'Automático':'Manual')+'</span><div class="tiny muted">'+(c.profile.consolidateServices?'fatura única':'por serviço')+'</div></td>'+
        '<td><div class="actions"><button class="btn sm" onclick="openBillingProfile384(\''+e384(c.leadId)+'\')">Configurar</button><button class="btn sm primary" onclick="generateBilling384(\''+e384(c.leadId)+'\')">Gerar mês</button></div></td>'+
      '</tr>').join('')+
    '</tbody></table></div>';
  }
  function invoicesTable384(){
    const a=B384.data?.invoices||[];
    if(!a.length)return'<div class="card"><div class="empty">Nenhuma cobrança recorrente gerada.</div></div>';
    return'<div class="table-wrap"><table class="table b384-table"><thead><tr><th>Cliente</th><th>Cobrança</th><th>Vencimento</th><th>Principal</th><th>Pago</th><th>Saldo calculado</th><th>Status</th><th></th></tr></thead><tbody>'+
      a.map(i=>'<tr>'+
        '<td><b>'+e384(i.client?.name||i.client?.companyName||i.leadId)+'</b></td>'+
        '<td><b>'+e384(i.description)+'</b><div class="tiny muted">'+e384(i.period)+' · '+i.items.length+' item(ns)</div></td>'+
        '<td class="'+(i.calc?.overdue?'overdue':'')+'">'+date384(i.dueDate)+(i.calc?.daysOverdue?'<div class="tiny muted">'+i.calc.daysOverdue+' dia(s) após carência</div>':'')+'</td>'+
        '<td>'+money384(i.principal)+'</td>'+
        '<td>'+money384(i.calc?.paidTotal)+'</td>'+
        '<td><b>'+money384(i.calc?.balance)+'</b><div class="tiny muted">'+(i.calc?.discount?'-'+money384(i.calc.discount)+' desc. ':'')+(i.calc?.lateFee?'+'+money384(i.calc.lateFee)+' multa ':'')+(i.calc?.interest?'+'+money384(i.calc.interest)+' juros':'')+'</div></td>'+
        '<td>'+status384(i.status,i.calc)+'</td>'+
        '<td><div class="actions"><button class="btn sm" onclick="openInvoice384(\''+e384(i.receivableId)+'\')">Detalhes</button>'+(!/Pago|Cancel|Exclu/i.test(i.status)?'<button class="btn sm primary" onclick="openPayment384(\''+e384(i.receivableId)+'\')">Pagamento</button>':'')+'</div></td>'+
      '</tr>').join('')+
    '</tbody></table></div>';
  }
  function paymentsTable384(){
    const rows384=[];
    for(const i of(B384.data?.invoices||[]))for(const p of(i.payments||[]))rows384.push({invoice:i,payment:p});
    rows384.sort((a,b)=>String(b.payment.paidAt).localeCompare(String(a.payment.paidAt)));
    if(!rows384.length)return'<div class="card"><div class="empty">Nenhum pagamento recorrente registrado.</div></div>';
    return'<div class="table-wrap"><table class="table b384-table"><thead><tr><th>Data</th><th>Cliente</th><th>Cobrança</th><th>Valor</th><th>Método</th><th>Registrado por</th><th></th></tr></thead><tbody>'+
      rows384.map(x=>'<tr><td>'+date384(x.payment.paidAt)+'</td><td><b>'+e384(x.invoice.client?.name||x.invoice.client?.companyName||x.invoice.leadId)+'</b></td><td>'+e384(x.invoice.description)+'</td><td><b>'+money384(x.payment.amount)+'</b></td><td>'+e384(x.payment.method||'—')+'</td><td>'+e384(x.payment.createdBy||'—')+'</td><td>'+(admin384()?'<button class="btn sm danger369" onclick="removePayment384(\''+e384(x.payment.paymentId)+'\')">Excluir</button>':'')+'</td></tr>').join('')+
    '</tbody></table></div>';
  }
  function runsTable384(){
    const a=B384.data?.runs||[];
    if(!a.length)return'<div class="card"><div class="empty">Nenhuma execução registrada.</div></div>';
    return'<div class="table-wrap"><table class="table b384-table"><thead><tr><th>Execução</th><th>Período</th><th>Criadas</th><th>Ignoradas</th><th>Total</th><th>Executado por</th><th>Status</th></tr></thead><tbody>'+
      a.map(r=>'<tr><td>'+date384(r.runAt)+'<div class="tiny muted">'+e384(String(r.runAt||'').slice(11,19))+'</div></td><td><b>'+e384(r.period)+'</b></td><td>'+e384(r.created)+'</td><td>'+e384(r.skipped)+'</td><td>'+money384(r.total)+'</td><td>'+e384(r.runBy||'sistema')+'</td><td><span class="status ok">'+e384(r.status)+'</span></td></tr>').join('')+
    '</tbody></table></div>';
  }

  function renderBilling384(){
    if(!can384()){$('content').innerHTML=head('FINANCEIRO','Financeiro Recorrente','Acesso restrito.')+'<div class="card"><div class="empty">Seu perfil não possui permissão.</div></div>';return}
    if(!B384.data&&!B384.loading)setTimeout(()=>load384(true),0);
    const actions='<button class="btn primary" onclick="generateBilling384()">⚡ Gerar cobranças</button><button class="btn" onclick="loadBilling384(true)">↻ Atualizar</button>';
    $('content').innerHTML=head('FINANCEIRO','Financeiro Recorrente','Mensalidades automáticas, fatura consolidada, encargos, descontos e pagamentos parciais.',actions)+
      (B384.data?summary384():'<div class="card"><div class="empty">Carregando...</div></div>')+
      '<div class="notice b384-note"><b>Controle financeiro:</b> multa, juros e desconto são calculados conforme a configuração do cliente. Use percentuais compatíveis com o contrato e com as regras aplicáveis ao seu negócio.</div>'+
      (B384.data?filters384():'')+
      (B384.data?(B384.tab==='invoices'?invoicesTable384():B384.tab==='payments'?paymentsTable384():B384.tab==='runs'?runsTable384():clientsTable384()):'');
    badge384();
  }

  window.openBillingProfile384=function(leadId){
    const c=client384(leadId);if(!c)return;const p=c.profile||{};
    $('modalEyebrow').textContent='FINANCEIRO RECORRENTE';$('modalTitle').textContent=c.name;$('modalMeta').textContent=money384(c.monthly)+' / mês · '+c.services.length+' serviço(s)';
    $('modalBody').innerHTML='<div class="b384-profile">'+
      '<div class="grid cols2">'+
        '<label class="b384-check"><input id="b384_enabled" type="checkbox" '+(p.enabled!==false?'checked':'')+'><span>Perfil recorrente ativo</span></label>'+
        '<label class="b384-check"><input id="b384_auto" type="checkbox" '+(p.autoGenerate?'checked':'')+'><span>Gerar cobranças automaticamente</span></label>'+
        '<label class="b384-check"><input id="b384_consolidate" type="checkbox" '+(p.consolidateServices!==false?'checked':'')+'><span>Consolidar serviços em uma única cobrança</span></label>'+
      '</div>'+
      '<div class="grid cols2">'+
        '<div class="field"><label>DIA DO VENCIMENTO</label><input id="b384_day" class="input" type="number" min="1" max="31" value="'+e384(p.billingDay||10)+'"></div>'+
        '<div class="field"><label>FORMA DE PAGAMENTO</label><input id="b384_method" class="input" value="'+e384(p.paymentMethod||'')+'" placeholder="PIX, Boleto, Transferência..."></div>'+
        '<div class="field"><label>CARÊNCIA APÓS VENCIMENTO (DIAS)</label><input id="b384_grace" class="input" type="number" min="0" max="90" value="'+e384(p.graceDays||0)+'"></div>'+
        '<div class="field"><label>MULTA (%)</label><input id="b384_fee" class="input" type="number" min="0" max="100" step="0.01" value="'+e384(p.lateFeePercent||0)+'"></div>'+
        '<div class="field"><label>JUROS AO MÊS (%)</label><input id="b384_interest" class="input" type="number" min="0" max="100" step="0.01" value="'+e384(p.monthlyInterestPercent||0)+'"></div>'+
        '<div class="field"><label>DESCONTO ANTECIPADO (%)</label><input id="b384_discount" class="input" type="number" min="0" max="100" step="0.01" value="'+e384(p.earlyDiscountPercent||0)+'"></div>'+
        '<div class="field"><label>DESCONTO ATÉ X DIAS ANTES</label><input id="b384_discount_days" class="input" type="number" min="0" max="60" value="'+e384(p.earlyDiscountDays||0)+'"></div>'+
      '</div>'+
      '<div class="field"><label>OBSERVAÇÕES INTERNAS</label><textarea id="b384_notes" rows="3">'+e384(p.notes||'')+'</textarea></div>'+
      '<div class="card b384-service-preview"><h3>Serviços mensais</h3>'+c.services.map(s=>'<div class="row"><div class="row-main"><b>'+e384(s.name)+'</b><div>'+e384(s.siteUrl||'Serviço geral')+'</div></div><div class="row-side"><b>'+money384(s.price)+'</b><div>dia '+e384(s.billingDay)+'</div></div></div>').join('')+'</div>'+
      '<div class="actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveBillingProfile384(\''+e384(leadId)+'\')">Salvar configuração</button></div>'+
    '</div>';
    $('modalBack').classList.remove('hidden');
  };
  window.saveBillingProfile384=async function(leadId){
    try{
      const body={leadId,enabled:$('b384_enabled').checked,autoGenerate:$('b384_auto').checked,consolidateServices:$('b384_consolidate').checked,billingDay:Number($('b384_day').value||10),paymentMethod:$('b384_method').value.trim(),graceDays:Number($('b384_grace').value||0),lateFeePercent:Number($('b384_fee').value||0),monthlyInterestPercent:Number($('b384_interest').value||0),earlyDiscountPercent:Number($('b384_discount').value||0),earlyDiscountDays:Number($('b384_discount_days').value||0),notes:$('b384_notes').value.trim()};
      const j=await api('/api/web/billing-recurring/profile',{method:'PATCH',body:JSON.stringify(body)});
      B384.data=j.view;closeModal();toast('Configuração recorrente salva.');renderBilling384();
    }catch(err){toast(err.message,7000)}
  };

  window.generateBilling384=function(leadId=''){
    $('modalEyebrow').textContent='GERAR COBRANÇAS';$('modalTitle').textContent=leadId?(client384(leadId)?.name||'Cliente'):'Financeiro recorrente';$('modalMeta').textContent='A geração é idempotente: o mesmo mês não cria duplicidades.';
    $('modalBody').innerHTML='<div class="field"><label>PERÍODO</label><input id="b384_period" class="input" type="month" value="'+e384(currentPeriod384())+'"></div><div class="notice">Serão usados os serviços mensais ativos e a configuração financeira do cliente. Se a cobrança do período já existir, ela será ignorada.</div><div class="actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="confirmGenerateBilling384(\''+e384(leadId)+'\')">Gerar agora</button></div>';
    $('modalBack').classList.remove('hidden');
  };
  window.confirmGenerateBilling384=async function(leadId){
    try{
      const period=$('b384_period').value;if(!period)return toast('Informe o período.');
      const j=await api('/api/web/billing-recurring/generate',{method:'POST',body:JSON.stringify({period,leadId:leadId||undefined})});
      B384.data=j.view;closeModal();toast('Geração concluída: '+j.created+' cobrança(s), '+j.skipped+' ignorada(s), total '+money384(j.total)+'.',6500);B384.tab='invoices';renderBilling384();
    }catch(err){toast(err.message,8000)}
  };

  window.openInvoice384=function(id){
    const i=invoice384(id);if(!i)return;
    $('modalEyebrow').textContent='COBRANÇA RECORRENTE';$('modalTitle').textContent=i.description;$('modalMeta').textContent=(i.client?.name||i.client?.companyName||i.leadId)+' · vence '+date384(i.dueDate);
    const terms=i.terms||{},c=i.calc||{};
    $('modalBody').innerHTML='<div class="b384-invoice-detail">'+
      '<div class="grid kpis b384-detail-kpis">'+kpi('Principal',money384(i.principal),'valor original')+kpi('Pago',money384(c.paidTotal),'pagamentos')+kpi('Encargos',money384((c.lateFee||0)+(c.interest||0)),'multa + juros')+kpi('Saldo',money384(c.balance),c.overdue?'em atraso':'atual')+'</div>'+
      '<div class="grid cols2"><div class="card"><h3>Composição</h3>'+i.items.map(x=>'<div class="row"><div class="row-main"><b>'+e384(x.description)+'</b></div><div class="row-side"><b>'+money384(x.totalAmount)+'</b></div></div>').join('')+'</div><div class="card"><h3>Condições</h3><p class="tiny">Vencimento: <b>'+date384(i.dueDate)+'</b><br>Forma: <b>'+e384(i.paymentMethod||'—')+'</b><br>Carência: <b>'+e384(terms.graceDays)+' dia(s)</b><br>Multa: <b>'+pct384(terms.lateFeePercent)+'</b><br>Juros: <b>'+pct384(terms.monthlyInterestPercent)+'/mês</b><br>Desconto antecipado: <b>'+pct384(terms.earlyDiscountPercent)+'</b></p></div></div>'+
      '<div class="card"><div class="card-head"><div><h3>Pagamentos</h3><p class="help">Histórico desta cobrança.</p></div>'+(!/Pago|Cancel|Exclu/i.test(i.status)?'<button class="btn sm primary" onclick="closeModal();openPayment384(\''+e384(id)+'\')">+ Registrar pagamento</button>':'')+'</div>'+
        (i.payments.length?'<div class="rows">'+i.payments.map(p=>'<div class="row"><div class="row-main"><b>'+money384(p.amount)+'</b><div>'+date384(p.paidAt)+' · '+e384(p.method||'—')+(p.note?' · '+e384(p.note):'')+'</div></div><div class="row-side"><div>'+e384(p.createdBy||'')+'</div>'+(admin384()?'<button class="btn sm danger369" onclick="removePayment384(\''+e384(p.paymentId)+'\')">Excluir</button>':'')+'</div></div>').join('')+'</div>':'<div class="empty">Nenhum pagamento registrado.</div>')+
      '</div></div>';
    $('modalBack').classList.remove('hidden');
  };

  window.openPayment384=function(id){
    const i=invoice384(id);if(!i)return;const balance=Number(i.calc?.balance||0);
    $('modalEyebrow').textContent='REGISTRAR PAGAMENTO';$('modalTitle').textContent=i.client?.name||i.client?.companyName||'Cliente';$('modalMeta').textContent=i.description+' · saldo '+money384(balance);
    $('modalBody').innerHTML='<div class="grid cols2"><div class="field"><label>VALOR</label><input id="b384_pay_amount" class="input" type="number" step="0.01" min="0.01" max="'+e384(balance)+'" value="'+e384(balance.toFixed(2))+'"></div><div class="field"><label>DATA/HORA</label><input id="b384_pay_date" class="input" type="datetime-local" value="'+new Date().toISOString().slice(0,16)+'"></div><div class="field"><label>MÉTODO</label><input id="b384_pay_method" class="input" value="'+e384(i.paymentMethod||'PIX')+'"></div><div class="field wide"><label>OBSERVAÇÃO</label><textarea id="b384_pay_note" rows="3"></textarea></div></div><div class="notice">Pagamentos menores que o saldo deixam a cobrança como <b>Parcial</b>. Ao quitar o saldo calculado, o status passa para <b>Pago</b>.</div><div class="actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="savePayment384(\''+e384(id)+'\')">Registrar pagamento</button></div>';
    $('modalBack').classList.remove('hidden');
  };
  window.savePayment384=async function(id){
    try{
      const raw=$('b384_pay_date').value,paidAt=raw?new Date(raw).toISOString():new Date().toISOString();
      const body={receivableId:id,amount:Number($('b384_pay_amount').value),paidAt,method:$('b384_pay_method').value.trim(),note:$('b384_pay_note').value.trim()};
      const j=await api('/api/web/billing-recurring/payment',{method:'POST',body:JSON.stringify(body)});
      B384.data=j.view;closeModal();toast('Pagamento registrado.');B384.tab='payments';renderBilling384();
    }catch(err){toast(err.message,7500)}
  };
  window.removePayment384=async function(paymentId){
    if(!admin384()||!confirm('Excluir este pagamento? O saldo e o status da cobrança serão recalculados.'))return;
    try{
      const j=await api('/api/web/billing-recurring/payment/remove',{method:'POST',body:JSON.stringify({paymentId})});
      B384.data=j.view;closeModal();toast('Pagamento removido e cobrança recalculada.');renderBilling384();
    }catch(err){toast(err.message,7000)}
  };

  const prevShow384=showEntityModal;
  showEntityModal=function(r){
    prevShow384(r);
    if(r?.entityType!=='lead'||!isClient(r.payload||{})||!can384())return;
    setTimeout(()=>injectBillingClient384(r),0);
  };
  async function injectBillingClient384(r){
    const body=$('modalBody');if(!body||document.getElementById('billingClient384'))return;
    if(!B384.data)await load384(true);
    const c=(B384.data?.clients||[]).find(x=>x.leadId===r.entityId),inv=(B384.data?.invoices||[]).filter(x=>x.leadId===r.entityId);
    if(!c)return;
    body.insertAdjacentHTML('beforeend','<div id="billingClient384" class="card b384-client-card"><div class="b384-client-head"><div><div class="eyebrow">FINANCEIRO RECORRENTE</div><h3>'+money384(c.monthly)+'/mês</h3><p class="help">'+c.services.length+' serviço(s) mensal(is) · vence dia '+c.profile.billingDay+'</p></div><button class="btn sm" onclick="closeModal();openBillingClient384(\''+e384(r.entityId)+'\')">Abrir financeiro</button></div><div class="b384-client-stats"><span>'+inv.filter(x=>!['Pago','Cancelado','Excluido'].includes(x.status)).length+' aberta(s)</span><span>'+money384(inv.reduce((a,x)=>a+x.calc.paidTotal,0))+' recebido</span><span>'+money384(inv.reduce((a,x)=>a+x.calc.balance,0))+' saldo</span></div></div>');
  }
  window.openBillingClient384=async function(id){B384.leadId=id;B384.data=null;B384.tab='invoices';S.active='billing384';await load384(true);render()};

  const prevFinance384=renderFinance;
  renderFinance=function(){
    const html=prevFinance384();
    return html.replace('</div><div class="grid kpis">','<button class="btn" style="margin-left:8px" onclick="openSec(\'billing384\')">R$ Recorrência</button></div><div class="grid kpis">');
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{buildNav()}catch{}},600));
  setTimeout(()=>{if(S?.session&&can384())load384(true)},3900);
})();
