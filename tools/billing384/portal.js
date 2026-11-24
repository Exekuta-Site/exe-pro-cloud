'use strict';
(function(){
  const PB384={loading:false};
  const baseFinance384=financePage;
  const baseDashboard384=dashboard;

  function money384p(v){return money(Number(v||0))}
  function e384p(v){return e(v)}
  function date384p(v){return date(v)}
  function status384p(i){const s=i.calc?.overdue&&!/Pago|Cancel|Exclu/i.test(i.status)?'Atrasado':i.status;return statusBadge(s)}
  function pct384p(v){return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%'}

  async function loadPortalBilling384(force=false){
    if(!P.data?.permissions?.finance){P.billing384={allowed:false,invoices:[],summary:{}};return P.billing384}
    if(PB384.loading)return P.billing384;
    if(P.billing384&&!force)return P.billing384;
    PB384.loading=true;
    try{P.billing384=await api('/api/portal/billing');return P.billing384}
    catch(err){console.error(err);P.billing384={allowed:false,invoices:[],summary:{}};return P.billing384}
    finally{PB384.loading=false}
  }
  window.loadPortalBilling384=loadPortalBilling384;

  dashboard=function(){
    let h=baseDashboard384();
    if(!P.data?.permissions?.finance)return h;
    if(P.billing384===undefined)setTimeout(()=>loadPortalBilling384(false).then(()=>{if(P.page==='dashboard')render()}),0);
    const b=P.billing384;if(!b?.allowed||!b.invoices?.length)return h;
    h+='<div class="card pb384-dash"><div class="card-head"><div><div class="eyebrow">FINANCEIRO RECORRENTE</div><h3>Mensalidades</h3><p class="muted tiny">Saldo atualizado conforme pagamentos, desconto e encargos configurados.</p></div><button class="btn" onclick="go(\'finance\')">Abrir financeiro</button></div>'+
      '<div class="pb384-mini"><div><span>Em aberto</span><b>'+e384p(b.summary.open||0)+'</b></div><div><span>Saldo</span><b>'+money384p(b.summary.balance)+'</b></div><div><span>Em atraso</span><b class="'+(Number(b.summary.overdue)>0?'overdue':'')+'">'+money384p(b.summary.overdue)+'</b></div><div><span>Pago</span><b>'+money384p(b.summary.paid)+'</b></div></div></div>';
    return h;
  };

  financePage=function(){
    let h=baseFinance384();
    if(!P.data.permissions.finance)return h;
    if(P.billing384===undefined)setTimeout(()=>loadPortalBilling384(false).then(()=>{if(P.page==='finance')render()}),0);
    const b=P.billing384;if(!b?.allowed)return h;
    const a=b.invoices||[];
    h+='<div class="card pb384-main"><div class="card-head"><div><div class="eyebrow">RECORRÊNCIA</div><h3>Mensalidades e composição</h3><p class="muted tiny">Veja serviços incluídos, pagamentos registrados e saldo atualizado.</p></div></div>'+
      '<div class="pb384-mini"><div><span>Cobranças abertas</span><b>'+e384p(b.summary.open||0)+'</b></div><div><span>Saldo total</span><b>'+money384p(b.summary.balance)+'</b></div><div><span>Em atraso</span><b class="'+(Number(b.summary.overdue)>0?'overdue':'')+'">'+money384p(b.summary.overdue)+'</b></div><div><span>Total pago</span><b>'+money384p(b.summary.paid)+'</b></div></div>'+
    '</div>'+
    (a.length?'<div class="pb384-invoices">'+a.map(invoiceCard384p).join('')+'</div>':'<div class="card empty">Nenhuma mensalidade recorrente gerada ainda.</div>');
    return h;
  };

  function invoiceCard384p(i){
    const c=i.calc||{},t=i.terms||{};
    return'<article class="card pb384-invoice">'+
      '<div class="card-head"><div><div class="eyebrow">'+e384p(i.period)+'</div><h3>'+e384p(i.description)+'</h3><div class="tiny muted">Vencimento '+date384p(i.dueDate)+' · '+e384p(i.paymentMethod||'Forma de pagamento não informada')+'</div></div>'+status384p(i)+'</div>'+
      '<div class="pb384-invoice-kpis"><div><span>Principal</span><b>'+money384p(i.principal)+'</b></div><div><span>Pago</span><b>'+money384p(c.paidTotal)+'</b></div><div><span>'+(c.discount?'Desconto':'Encargos')+'</span><b>'+(c.discount?('- '+money384p(c.discount)):money384p((c.lateFee||0)+(c.interest||0)))+'</b></div><div><span>Saldo</span><b>'+money384p(c.balance)+'</b></div></div>'+
      (c.overdue?'<div class="notice pb384-overdue">Em atraso após a carência: '+e384p(c.daysOverdue)+' dia(s). Multa '+pct384p(t.lateFeePercent)+' e juros '+pct384p(t.monthlyInterestPercent)+'/mês conforme configuração da cobrança.</div>':'')+
      (c.discountEligible?'<div class="notice pb384-discount">Pagamento antecipado elegível a desconto de '+pct384p(t.earlyDiscountPercent)+'.</div>':'')+
      '<div class="pb384-items"><div class="eyebrow">COMPOSIÇÃO</div>'+(i.items||[]).map(x=>'<div class="row"><div class="row-main"><b>'+e384p(x.description)+'</b></div><div class="row-side"><b>'+money384p(x.totalAmount)+'</b></div></div>').join('')+'</div>'+
      ((i.payments||[]).length?'<div class="pb384-payments"><div class="eyebrow">PAGAMENTOS REGISTRADOS</div>'+(i.payments||[]).map(p=>'<div class="row"><div class="row-main"><b>'+money384p(p.amount)+'</b><div>'+date384p(p.paidAt)+' · '+e384p(p.method||'—')+'</div></div><div class="row-side"><div>'+e384p(p.note||'')+'</div></div></div>').join('')+'</div>':'')+
    '</article>';
  }

  setTimeout(async()=>{if(P.data?.permissions?.finance){await loadPortalBilling384(false);if(P.page==='dashboard'||P.page==='finance')render()}},1300);
})();