
// --- EXE PRO 3.8.4: Financeiro Recorrente Avancado ---
const BILLING_PROFILE_DEFAULT={
  enabled:true,
  autoGenerate:false,
  consolidateServices:true,
  billingDay:10,
  graceDays:0,
  lateFeePercent:0,
  monthlyInterestPercent:0,
  earlyDiscountPercent:0,
  earlyDiscountDays:0,
  paymentMethod:'',
  notes:''
};

function billingClean(v,max=500){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
function billingNum(v){
  const n=Number(v);return Number.isFinite(n)?n:0;
}
function billingPct(v){
  return Math.max(0,Math.min(100,billingNum(v)));
}
function billingInt(v,min,max,fallback){
  const n=Math.round(Number(v));
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function billingPeriod(v){
  const s=String(v||'').slice(0,7);
  return /^\d{4}-\d{2}$/.test(s)?s:'';
}
function billingCurrentPeriod(){
  const d=new Date(Date.now()-3*60*60*1000);
  return d.toISOString().slice(0,7);
}
function billingDateAdd(day,delta){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day||'')))return'';
  const d=new Date(String(day)+'T12:00:00.000Z');
  if(Number.isNaN(d.getTime()))return'';
  d.setUTCDate(d.getUTCDate()+Number(delta||0));
  return d.toISOString().slice(0,10);
}
function billingDateDiff(a,b){
  if(!a||!b)return 0;
  const aa=new Date(a+'T12:00:00.000Z'),bb=new Date(b+'T12:00:00.000Z');
  if(Number.isNaN(aa.getTime())||Number.isNaN(bb.getTime()))return 0;
  return Math.floor((bb-aa)/86400000);
}
function billingDueDate(period,day){
  period=billingPeriod(period);if(!period)return'';
  const [y,m]=period.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate();
  const d=Math.max(1,Math.min(last,billingInt(day,1,31,10)));
  return period+'-'+String(d).padStart(2,'0');
}
function billingLeadPayload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function billingServiceItems(leadPayload){
  const raw=Array.isArray(leadPayload?.clientServiceItems)?leadPayload.clientServiceItems:[];
  const active=raw.filter(x=>String(x?.status||'Ativo').toLowerCase()==='ativo'&&String(x?.billingCycle||'Mensal').toLowerCase()==='mensal')
    .map((x,i)=>({
      id:billingClean(x?.id||('service-'+i),180),
      name:billingClean(x?.name||'Servico',220),
      siteUrl:billingClean(x?.siteUrl,700),
      price:Math.max(0,billingNum(x?.price)),
      billingDay:billingInt(x?.billingDay,1,31,10)
    }))
    .filter(x=>x.price>0);
  if(active.length)return active;
  const fallback=Math.max(0,billingNum(leadPayload?.clientMonthlyAmount||leadPayload?.monthlyAmount));
  if(fallback>0)return[{id:'legacy-monthly',name:'Mensalidade de servicos',siteUrl:'',price:fallback,billingDay:billingInt(leadPayload?.clientBillingDay,1,31,10)}];
  return[];
}
function billingProfileFrom(row,leadPayload){
  const firstDay=billingServiceItems(leadPayload)[0]?.billingDay;
  return{
    enabled:row?row.enabled!==false:BILLING_PROFILE_DEFAULT.enabled,
    autoGenerate:row?!!row.auto_generate:BILLING_PROFILE_DEFAULT.autoGenerate,
    consolidateServices:row?row.consolidate_services!==false:BILLING_PROFILE_DEFAULT.consolidateServices,
    billingDay:billingInt(row?.billing_day??leadPayload?.clientBillingDay??firstDay,1,31,10),
    graceDays:billingInt(row?.grace_days,0,90,0),
    lateFeePercent:billingPct(row?.late_fee_percent),
    monthlyInterestPercent:billingPct(row?.monthly_interest_percent),
    earlyDiscountPercent:billingPct(row?.early_discount_percent),
    earlyDiscountDays:billingInt(row?.early_discount_days,0,60,0),
    paymentMethod:billingClean(row?.payment_method||leadPayload?.clientPaymentMethod,100),
    notes:billingClean(row?.notes,2000),
    saved:!!row,
    updatedAt:row?.updated_at||null,
    updatedBy:row?.updated_by||''
  };
}
async function billingProfileRow(leadId){
  return one(pool,'SELECT * FROM billing_profiles WHERE lead_id=$1',[leadId]);
}
async function billingLeadPatch(leadId,patch,origin='billing-profile'){
  return withTransaction(pool,async client=>{
    const row=await one(client,"SELECT * FROM entities WHERE entity_type='lead' AND entity_id=$1 FOR UPDATE",[leadId]);
    if(!row||row.deleted)return false;
    const payload={...billingLeadPayload(row),...(patch||{})},ver=Number(row.cloud_version||0)+1,now=nowIso();
    await client.query("UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,payload_json=$4::jsonb,updated_at=$5 WHERE entity_type='lead' AND entity_id=$6",[ver,origin,ver,JSON.stringify(payload),now,leadId]);
    await client.query("INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES('lead',$1,$2,$3,$4,FALSE,$5::jsonb,$6)",[leadId,ver,origin,ver,JSON.stringify(payload),now]);
    return true;
  });
}
async function billingReceivablePatch(receivableId,patch,origin='billing-payment'){
  return withTransaction(pool,async client=>{
    const row=await one(client,"SELECT * FROM entities WHERE entity_type='receivable' AND entity_id=$1 FOR UPDATE",[receivableId]);
    if(!row||row.deleted)return false;
    const payload={...billingLeadPayload(row),...(patch||{})},ver=Number(row.cloud_version||0)+1,now=nowIso();
    await client.query("UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,payload_json=$4::jsonb,updated_at=$5 WHERE entity_type='receivable' AND entity_id=$6",[ver,origin,ver,JSON.stringify(payload),now,receivableId]);
    await client.query("INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES('receivable',$1,$2,$3,$4,FALSE,$5::jsonb,$6)",[receivableId,ver,origin,ver,JSON.stringify(payload),now]);
    return true;
  });
}
async function billingSaveProfile(body,username){
  const leadId=validId(body.leadId,180);if(!leadId)return{status:400,body:{ok:false,error:'Cliente invalido.'}};
  const lead=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
  if(!lead)return{status:404,body:{ok:false,error:'Cliente nao encontrado.'}};
  const p=billingLeadPayload(lead);
  if(!(p.crmStatus==='Cliente'||p.clientSince))return{status:400,body:{ok:false,error:'O perfil financeiro recorrente so pode ser configurado para Cliente.'}};
  const profile={
    enabled:body.enabled!==false,autoGenerate:!!body.autoGenerate,consolidateServices:body.consolidateServices!==false,
    billingDay:billingInt(body.billingDay,1,31,10),graceDays:billingInt(body.graceDays,0,90,0),
    lateFeePercent:billingPct(body.lateFeePercent),monthlyInterestPercent:billingPct(body.monthlyInterestPercent),
    earlyDiscountPercent:billingPct(body.earlyDiscountPercent),earlyDiscountDays:billingInt(body.earlyDiscountDays,0,60,0),
    paymentMethod:billingClean(body.paymentMethod,100),notes:billingClean(body.notes,2000)
  };
  const now=nowIso();
  await pool.query("INSERT INTO billing_profiles(lead_id,enabled,auto_generate,consolidate_services,billing_day,grace_days,late_fee_percent,monthly_interest_percent,early_discount_percent,early_discount_days,payment_method,notes,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(lead_id) DO UPDATE SET enabled=EXCLUDED.enabled,auto_generate=EXCLUDED.auto_generate,consolidate_services=EXCLUDED.consolidate_services,billing_day=EXCLUDED.billing_day,grace_days=EXCLUDED.grace_days,late_fee_percent=EXCLUDED.late_fee_percent,monthly_interest_percent=EXCLUDED.monthly_interest_percent,early_discount_percent=EXCLUDED.early_discount_percent,early_discount_days=EXCLUDED.early_discount_days,payment_method=EXCLUDED.payment_method,notes=EXCLUDED.notes,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by",
    [leadId,profile.enabled,profile.autoGenerate,profile.consolidateServices,profile.billingDay,profile.graceDays,profile.lateFeePercent,profile.monthlyInterestPercent,profile.earlyDiscountPercent,profile.earlyDiscountDays,profile.paymentMethod||null,profile.notes||null,now,username]);
  await billingLeadPatch(leadId,{clientBillingDay:profile.billingDay,clientPaymentMethod:profile.paymentMethod},'billing-profile');
  return{status:200,body:{ok:true,view:await billingView(leadId)}};
}
async function billingCreateInvoice(client,leadRow,profile,period,services,actor,originKey,dueDate,description){
  const leadId=leadRow.entity_id,now=nowIso();
  const legacy=await one(client,"SELECT entity_id,payload_json FROM entities WHERE entity_type='receivable' AND deleted=FALSE AND payload_json->>'originKey'=$1 LIMIT 1",[originKey]);
  if(legacy){
    const lp=billingLeadPayload(legacy),principal=Math.max(0,billingNum(lp.amount));
    await client.query("INSERT INTO billing_invoices(receivable_id,lead_id,period_key,origin_key,principal_amount,due_date,payment_method,late_fee_percent,monthly_interest_percent,early_discount_percent,early_discount_days,grace_days,auto_generated,generated_at,generated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE,$13,$14) ON CONFLICT(origin_key) DO NOTHING",
      [legacy.entity_id,leadId,period,originKey,principal,billingClean(lp.dueDate,20)||dueDate,billingClean(lp.paymentMethod,100)||profile.paymentMethod,profile.lateFeePercent,profile.monthlyInterestPercent,profile.earlyDiscountPercent,profile.earlyDiscountDays,profile.graceDays,now,actor]);
    return{created:false,receivableId:legacy.entity_id,amount:principal,reason:'existing-entity'};
  }
  const existing=await one(client,'SELECT receivable_id,principal_amount FROM billing_invoices WHERE origin_key=$1',[originKey]);
  if(existing)return{created:false,receivableId:existing.receivable_id,amount:Number(existing.principal_amount||0),reason:'existing-invoice'};
  const amount=services.reduce((sum,x)=>sum+Math.max(0,billingNum(x.price)),0);
  if(amount<=0)return{created:false,amount:0,reason:'zero-amount'};
  const receivableId=crypto.randomUUID();
  const payload={
    leadId,description,amount:Number(amount.toFixed(2)),dueDate,status:'Pendente',
    paymentMethod:profile.paymentMethod||'',originKey
  };
  await client.query("INSERT INTO entities(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES('receivable',$1,1,'billing-engine',1,FALSE,$2::jsonb,$3)",[receivableId,JSON.stringify(payload),now]);
  await client.query("INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES('receivable',$1,1,'billing-engine',1,FALSE,$2::jsonb,$3)",[receivableId,JSON.stringify(payload),now]);
  await client.query("INSERT INTO billing_invoices(receivable_id,lead_id,period_key,origin_key,principal_amount,due_date,payment_method,late_fee_percent,monthly_interest_percent,early_discount_percent,early_discount_days,grace_days,auto_generated,generated_at,generated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE,$13,$14)",
    [receivableId,leadId,period,originKey,amount,dueDate,profile.paymentMethod||null,profile.lateFeePercent,profile.monthlyInterestPercent,profile.earlyDiscountPercent,profile.earlyDiscountDays,profile.graceDays,now,actor]);
  for(const s of services){
    await client.query("INSERT INTO billing_invoice_items(item_id,receivable_id,service_id,description,quantity,unit_amount,total_amount,created_at) VALUES($1,$2,$3,$4,1,$5,$5,$6)",
      [crypto.randomUUID(),receivableId,s.id||null,s.name||'Servico',s.price,now]);
  }
  return{created:true,receivableId,amount:Number(amount.toFixed(2)),reason:'created'};
}
async function billingGenerateForLead(leadRow,profile,period,actor){
  const p=billingLeadPayload(leadRow),services=billingServiceItems(p);
  if(!profile.enabled)return{created:0,skipped:1,total:0,reason:'disabled'};
  if(!services.length)return{created:0,skipped:1,total:0,reason:'no-recurring-services'};
  const label=period.split('-').reverse().join('/');
  return withTransaction(pool,async client=>{
    if(profile.consolidateServices){
      const due=billingDueDate(period,profile.billingDay),origin='billing:'+leadRow.entity_id+':'+period;
      const r=await billingCreateInvoice(client,leadRow,profile,period,services,actor,origin,due,'Mensalidade '+label+' — '+services.length+' servico(s)');
      return{created:r.created?1:0,skipped:r.created?0:1,total:r.created?r.amount:0,details:[r]};
    }
    let created=0,skipped=0,total=0,details=[];
    for(const s of services){
      const due=billingDueDate(period,s.billingDay||profile.billingDay),origin='billing:'+leadRow.entity_id+':'+period+':'+(s.id||crypto.createHash('sha1').update(s.name).digest('hex').slice(0,12));
      const r=await billingCreateInvoice(client,leadRow,profile,period,[s],actor,origin,due,s.name+' — '+label);
      details.push(r);if(r.created){created++;total+=r.amount}else skipped++;
    }
    return{created,skipped,total:Number(total.toFixed(2)),details};
  });
}
async function billingGenerate(body,username,autoOnly=false){
  const period=billingPeriod(body?.period)||billingCurrentPeriod(),onlyLead=body?.leadId?validId(body.leadId,180):'';
  const leads=await rows(pool,onlyLead?
    "SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE":
    "SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND deleted=FALSE",onlyLead?[onlyLead]:[]);
  let created=0,skipped=0,total=0,details=[];
  for(const lead of leads){
    const p=billingLeadPayload(lead);
    if(!(p.crmStatus==='Cliente'||p.clientSince)){skipped++;continue}
    const prow=await billingProfileRow(lead.entity_id),profile=billingProfileFrom(prow,p);
    if(autoOnly&&(!prow||!profile.autoGenerate||!profile.enabled)){continue}
    const r=await billingGenerateForLead(lead,profile,period,username||'billing-engine');
    created+=r.created||0;skipped+=r.skipped||0;total+=r.total||0;
    if((r.created||0)>0||onlyLead)details.push({leadId:lead.entity_id,...r});
  }
  const runId=crypto.randomUUID(),now=nowIso(),status='Concluido';
  await pool.query("INSERT INTO billing_runs(run_id,period_key,created_count,skipped_count,total_amount,status,detail_json,run_at,run_by) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)",
    [runId,period,created,skipped,Number(total.toFixed(2)),status,JSON.stringify(details.slice(0,250)),now,username||'billing-engine']);
  try{await notificationPlan()}catch(e){console.error('Billing notification plan:',e.message)}
  return{ok:true,runId,period,created,skipped,total:Number(total.toFixed(2)),details};
}
async function billingPaymentRows(receivableId){
  const rr=await rows(pool,'SELECT * FROM billing_payments WHERE receivable_id=$1 ORDER BY paid_at ASC,created_at ASC',[receivableId]);
  return rr.map(r=>({paymentId:r.payment_id,amount:Number(r.amount||0),paidAt:r.paid_at,method:r.method||'',note:r.note||'',createdBy:r.created_by||'',createdAt:r.created_at}));
}
async function billingItemRows(receivableId){
  const rr=await rows(pool,'SELECT * FROM billing_invoice_items WHERE receivable_id=$1 ORDER BY created_at ASC,item_id ASC',[receivableId]);
  return rr.map(r=>({itemId:r.item_id,serviceId:r.service_id||'',description:r.description,quantity:Number(r.quantity||1),unitAmount:Number(r.unit_amount||0),totalAmount:Number(r.total_amount||0)}));
}
function billingCalc(inv,payments,asOf){
  const principal=Math.max(0,Number(inv.principal_amount||0)),paid=payments.reduce((a,x)=>a+Math.max(0,Number(x.amount||0)),0);
  const due=String(inv.due_date||'').slice(0,10),today=String(asOf||portalToday()).slice(0,10);
  const status=String(inv.entity_payload?.status||inv.status||'Pendente');
  if(status.toLowerCase().includes('pago')){
    return{principal,paidTotal:Number(paid.toFixed(2)),discount:0,lateFee:0,interest:0,adjustedTotal:Number(paid.toFixed(2)||principal),balance:0,daysOverdue:0,overdue:false,discountEligible:false};
  }
  const discountDeadline=Number(inv.early_discount_days||0)>0?billingDateAdd(due,-Number(inv.early_discount_days||0)):due;
  const discountEligible=Number(inv.early_discount_percent||0)>0&&today<=discountDeadline&&paid===0;
  const discount=discountEligible?principal*Number(inv.early_discount_percent||0)/100:0;
  const lateStart=billingDateAdd(due,Number(inv.grace_days||0));
  const daysOverdue=today>lateStart?Math.max(1,billingDateDiff(lateStart,today)):0;
  const lateFee=daysOverdue>0?principal*Number(inv.late_fee_percent||0)/100:0;
  const interest=daysOverdue>0?principal*(Number(inv.monthly_interest_percent||0)/100)*(daysOverdue/30):0;
  const adjusted=Math.max(0,principal-discount+lateFee+interest),balance=Math.max(0,adjusted-paid);
  return{
    principal:Number(principal.toFixed(2)),paidTotal:Number(paid.toFixed(2)),discount:Number(discount.toFixed(2)),
    lateFee:Number(lateFee.toFixed(2)),interest:Number(interest.toFixed(2)),adjustedTotal:Number(adjusted.toFixed(2)),
    balance:Number(balance.toFixed(2)),daysOverdue,overdue:daysOverdue>0,discountEligible
  };
}
async function billingInvoiceDtos(leadId=''){
  const sql=leadId?
    "SELECT b.*,e.payload_json AS entity_payload,e.deleted,e.updated_at AS entity_updated_at,l.payload_json AS lead_payload FROM billing_invoices b LEFT JOIN entities e ON e.entity_type='receivable' AND e.entity_id=b.receivable_id LEFT JOIN entities l ON l.entity_type='lead' AND l.entity_id=b.lead_id WHERE b.lead_id=$1 ORDER BY b.due_date DESC":
    "SELECT b.*,e.payload_json AS entity_payload,e.deleted,e.updated_at AS entity_updated_at,l.payload_json AS lead_payload FROM billing_invoices b LEFT JOIN entities e ON e.entity_type='receivable' AND e.entity_id=b.receivable_id LEFT JOIN entities l ON l.entity_type='lead' AND l.entity_id=b.lead_id ORDER BY b.due_date DESC LIMIT 1000";
  const rr=await rows(pool,sql,leadId?[leadId]:[]),out=[];
  for(const r of rr){
    let ep=r.entity_payload||{};if(typeof ep==='string'){try{ep=JSON.parse(ep)}catch{ep={}}}
    r.entity_payload=ep;
    const payments=await billingPaymentRows(r.receivable_id),items=await billingItemRows(r.receivable_id),calc=billingCalc(r,payments);
    out.push({
      receivableId:r.receivable_id,leadId:r.lead_id,period:r.period_key,originKey:r.origin_key,dueDate:r.due_date,
      paymentMethod:r.payment_method||ep.paymentMethod||'',principal:Number(r.principal_amount||0),
      terms:{lateFeePercent:Number(r.late_fee_percent||0),monthlyInterestPercent:Number(r.monthly_interest_percent||0),earlyDiscountPercent:Number(r.early_discount_percent||0),earlyDiscountDays:Number(r.early_discount_days||0),graceDays:Number(r.grace_days||0)},
      status:r.deleted?'Excluido':String(ep.status||'Pendente'),description:String(ep.description||'Mensalidade'),
      generatedAt:r.generated_at,generatedBy:r.generated_by||'',autoGenerated:!!r.auto_generated,
      client:billingLeadPayload({payload_json:r.lead_payload}),items,payments,calc
    });
  }
  return out;
}
async function billingRecordPayment(body,username){
  const receivableId=validId(body.receivableId,180);if(!receivableId)return{status:400,body:{ok:false,error:'Cobranca invalida.'}};
  const inv=await one(pool,"SELECT b.*,e.payload_json AS entity_payload,e.deleted FROM billing_invoices b JOIN entities e ON e.entity_type='receivable' AND e.entity_id=b.receivable_id WHERE b.receivable_id=$1",[receivableId]);
  if(!inv||inv.deleted)return{status:404,body:{ok:false,error:'Cobranca recorrente nao encontrada.'}};
  let ep=inv.entity_payload||{};if(typeof ep==='string'){try{ep=JSON.parse(ep)}catch{ep={}}}inv.entity_payload=ep;
  if(String(ep.status||'').toLowerCase().includes('cancel'))return{status:400,body:{ok:false,error:'Nao e possivel registrar pagamento em cobranca cancelada.'}};
  const amount=Number(body.amount),paidAt=billingClean(body.paidAt||nowIso(),40);
  if(!Number.isFinite(amount)||amount<=0)return{status:400,body:{ok:false,error:'Informe um valor de pagamento valido.'}};
  const current=billingCalc(inv,await billingPaymentRows(receivableId),String(paidAt).slice(0,10));
  if(current.balance<=0.009)return{status:400,body:{ok:false,error:'Esta cobranca ja esta quitada.'}};
  if(amount>current.balance+0.05)return{status:400,body:{ok:false,error:'O pagamento informado excede o saldo calculado da cobranca.'}};
  const paymentId=crypto.randomUUID(),now=nowIso();
  await pool.query("INSERT INTO billing_payments(payment_id,receivable_id,lead_id,amount,paid_at,method,note,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [paymentId,receivableId,inv.lead_id,Number(amount.toFixed(2)),paidAt,billingClean(body.method,100),billingClean(body.note,1200),username,now]);
  const payments=await billingPaymentRows(receivableId),after=billingCalc(inv,payments,String(paidAt).slice(0,10)),isPaid=after.balance<=0.01;
  await billingReceivablePatch(receivableId,{status:isPaid?'Pago':'Parcial',paidAt:isPaid?paidAt:'',paidAmount:after.paidTotal},'billing-payment');
  if(isPaid){
    await pool.query("UPDATE notification_outbox SET status='Cancelado',updated_at=$1 WHERE receivable_id=$2 AND kind<>'paid' AND status IN ('Pendente','Falhou')",[now,receivableId]);
    try{await notificationPlan()}catch{}
  }
  return{status:200,body:{ok:true,paymentId,view:await billingView(inv.lead_id)}};
}
async function billingRemovePayment(body,username){
  const paymentId=validId(body.paymentId,180);if(!paymentId)return{status:400,body:{ok:false,error:'Pagamento invalido.'}};
  const pay=await one(pool,'SELECT * FROM billing_payments WHERE payment_id=$1',[paymentId]);if(!pay)return{status:404,body:{ok:false,error:'Pagamento nao encontrado.'}};
  await pool.query('DELETE FROM billing_payments WHERE payment_id=$1',[paymentId]);
  const inv=await one(pool,"SELECT b.*,e.payload_json AS entity_payload,e.deleted FROM billing_invoices b JOIN entities e ON e.entity_type='receivable' AND e.entity_id=b.receivable_id WHERE b.receivable_id=$1",[pay.receivable_id]);
  if(inv&&!inv.deleted){
    let ep=inv.entity_payload||{};if(typeof ep==='string'){try{ep=JSON.parse(ep)}catch{ep={}}}inv.entity_payload=ep;
    const payments=await billingPaymentRows(pay.receivable_id),calc=billingCalc(inv,payments);
    await billingReceivablePatch(pay.receivable_id,{status:payments.length?(calc.balance<=0.01?'Pago':'Parcial'):'Pendente',paidAt:calc.balance<=0.01?(ep.paidAt||nowIso()):'',paidAmount:calc.paidTotal},'billing-payment-remove');
  }
  await audit('billing_payment_remove',username,{headers:{},socket:{}},'Pagamento removido '+paymentId).catch(()=>{});
  return{status:200,body:{ok:true,view:await billingView(pay.lead_id)}};
}
async function billingView(leadId=''){
  const leads=await rows(pool,leadId?
    "SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE":
    "SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND deleted=FALSE",leadId?[leadId]:[]);
  const clients=[];
  for(const lead of leads){
    const p=billingLeadPayload(lead);if(!(p.crmStatus==='Cliente'||p.clientSince))continue;
    const services=billingServiceItems(p),profile=billingProfileFrom(await billingProfileRow(lead.entity_id),p);
    clients.push({
      leadId:lead.entity_id,name:String(p.name||p.companyName||'Cliente'),services,
      monthly:services.reduce((a,x)=>a+x.price,0),profile
    });
  }
  const invoices=await billingInvoiceDtos(leadId),runs=await rows(pool,'SELECT * FROM billing_runs ORDER BY run_at DESC LIMIT 30');
  const summary={
    clients:clients.length,autoProfiles:clients.filter(x=>x.profile.saved&&x.profile.enabled&&x.profile.autoGenerate).length,
    monthly:clients.reduce((a,x)=>a+x.monthly,0),invoices:invoices.length,
    open:invoices.filter(x=>!['Pago','Cancelado','Excluido'].includes(x.status)).length,
    overdueBalance:invoices.filter(x=>x.calc.overdue&&!['Pago','Cancelado','Excluido'].includes(x.status)).reduce((a,x)=>a+x.calc.balance,0),
    received:invoices.reduce((a,x)=>a+x.calc.paidTotal,0)
  };
  return{ok:true,period:billingCurrentPeriod(),summary,clients,invoices,runs:runs.map(r=>({runId:r.run_id,period:r.period_key,created:Number(r.created_count||0),skipped:Number(r.skipped_count||0),total:Number(r.total_amount||0),status:r.status,runAt:r.run_at,runBy:r.run_by||''}))};
}
async function billingPortalView(session){
  if(!portalOpRoleCanFinance(session.role))return{ok:true,allowed:false,invoices:[],summary:{}};
  const invoices=await billingInvoiceDtos(session.leadId);
  return{
    ok:true,allowed:true,invoices,
    summary:{
      open:invoices.filter(x=>!['Pago','Cancelado','Excluido'].includes(x.status)).length,
      balance:invoices.filter(x=>!['Pago','Cancelado','Excluido'].includes(x.status)).reduce((a,x)=>a+x.calc.balance,0),
      overdue:invoices.filter(x=>x.calc.overdue&&!['Pago','Cancelado','Excluido'].includes(x.status)).reduce((a,x)=>a+x.calc.balance,0),
      paid:invoices.reduce((a,x)=>a+x.calc.paidTotal,0)
    }
  };
}
async function billingRecurringTick(){
  try{
    await billingGenerate({period:billingCurrentPeriod()},'billing-engine',true);
  }catch(e){console.error('Billing recurring tick:',e.message)}
}
