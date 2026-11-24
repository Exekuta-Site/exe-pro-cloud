
// --- EXE PRO 3.6.7: Central de Mensagens & Cobrancas ---
const NOTIFY_DEFAULT={
  autoSend:false,
  daysBefore:[5,1],
  daysAfter:[1,3],
  sendOnDue:true,
  sendPaidConfirmation:false,
  defaultHour:9,
  utcOffsetMinutes:-180,
  lookbackDays:7,
  whatsappPhoneNumberId:'',
  whatsappGraphVersion:'',
  whatsappTemplateLanguage:'pt_BR',
  whatsappTemplateBefore:'',
  whatsappTemplateDue:'',
  whatsappTemplateOverdue:'',
  whatsappTemplatePaid:'',
  telegramBotUsername:''
};

function notifyInts(v,fallback){
  const a=Array.isArray(v)?v:String(v??'').split(/[,; ]+/);
  const out=[...new Set(a.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=60))].sort((a,b)=>b-a);
  return out.length?out:fallback;
}
async function getNotifyConfig(){
  const raw=await settingValue('notification_config',{});
  return normalizeNotifyConfig({...NOTIFY_DEFAULT,...(raw||{})});
}
function normalizeNotifyConfig(v){
  const c={...NOTIFY_DEFAULT,...(v||{})};
  c.autoSend=!!c.autoSend;
  c.daysBefore=notifyInts(c.daysBefore,NOTIFY_DEFAULT.daysBefore);
  c.daysAfter=notifyInts(c.daysAfter,NOTIFY_DEFAULT.daysAfter);
  c.sendOnDue=c.sendOnDue!==false;
  c.sendPaidConfirmation=!!c.sendPaidConfirmation;
  c.defaultHour=Math.max(7,Math.min(20,Number(c.defaultHour||9)));
  c.utcOffsetMinutes=Math.max(-720,Math.min(840,Number(c.utcOffsetMinutes??-180)));
  c.lookbackDays=Math.max(0,Math.min(60,Number(c.lookbackDays??7)));
  c.whatsappPhoneNumberId=String(c.whatsappPhoneNumberId||'').trim();
  c.whatsappGraphVersion=String(c.whatsappGraphVersion||'').trim();
  c.whatsappTemplateLanguage=String(c.whatsappTemplateLanguage||'pt_BR').trim()||'pt_BR';
  c.whatsappTemplateBefore=String(c.whatsappTemplateBefore||'').trim();
  c.whatsappTemplateDue=String(c.whatsappTemplateDue||'').trim();
  c.whatsappTemplateOverdue=String(c.whatsappTemplateOverdue||'').trim();
  c.whatsappTemplatePaid=String(c.whatsappTemplatePaid||'').trim();
  c.telegramBotUsername=String(c.telegramBotUsername||'').trim().replace(/^@/,'');
  return c;
}
async function publicNotifyConfig(){
  const config=await getNotifyConfig();
  return {
    config,
    integrations:{
      whatsappConfigured:!!(await getSecret('whatsappAccessToken'))&&!!config.whatsappPhoneNumberId&&!!config.whatsappGraphVersion,
      telegramConfigured:!!(await getSecret('telegramBotToken'))&&!!config.telegramBotUsername
    }
  };
}
function notifyPayload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function notifyDigits(v){return String(v||'').replace(/\D+/g,'')}
function notifyDay(v){return String(v||'').slice(0,10)}
function notifyDateAdd(day,delta){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day||'')))return'';
  const d=new Date(day+'T12:00:00.000Z');
  if(Number.isNaN(d.getTime()))return'';
  d.setUTCDate(d.getUTCDate()+Number(delta||0));
  return d.toISOString().slice(0,10);
}
function notifyScheduleIso(day,hour,offsetMin){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day||'')))return'';
  const p=day.split('-').map(Number),y=p[0],m=p[1],d=p[2];
  const utcHour=Number(hour||9)-(Number(offsetMin||0)/60);
  return new Date(Date.UTC(y,m-1,d,utcHour,0,0)).toISOString();
}
function notifyMoney(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function notifyMessage(kind,lead,rec,brand){
  const name=lead.name||lead.companyName||lead.companyContactName||'cliente';
  const desc=rec.description||rec.title||'sua fatura';
  const due=notifyDay(rec.dueDate);
  const amount=notifyMoney(rec.amount);
  const pix=brand.pixKey?(' PIX: '+brand.pixKey+'.'):'';
  if(kind==='paid')return 'Olá, '+name+'. Confirmamos o pagamento de '+desc+' no valor de '+amount+'. Obrigado!'+pix;
  if(kind==='due')return 'Olá, '+name+'. Lembrete: '+desc+' vence hoje ('+due+'), no valor de '+amount+'.'+pix+' Se já pagou, desconsidere esta mensagem.';
  if(/^before_/.test(kind))return 'Olá, '+name+'. '+desc+' vence em '+String(kind.split('_')[1]||'')+' dia(s), em '+due+', no valor de '+amount+'.'+pix+' Se já pagou, desconsidere esta mensagem.';
  if(/^overdue_/.test(kind))return 'Olá, '+name+'. Identificamos que '+desc+', com vencimento em '+due+' e valor de '+amount+', está em atraso há '+String(kind.split('_')[1]||'')+' dia(s).'+pix+' Se já pagou, desconsidere esta mensagem.';
  return 'Olá, '+name+'. Temos uma atualização sobre '+desc+'.';
}
function notifyTemplateName(kind,c){
  if(kind==='paid')return c.whatsappTemplatePaid;
  if(kind==='due')return c.whatsappTemplateDue;
  if(/^before_/.test(kind))return c.whatsappTemplateBefore;
  if(/^overdue_/.test(kind))return c.whatsappTemplateOverdue;
  return'';
}
async function notifySystemPatchLead(leadId,patch,origin){
  origin=origin||'notification-system';
  return withTransaction(pool,async client=>{
    const row=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2 FOR UPDATE',['lead',leadId]);
    if(!row||row.deleted)return false;
    const payload={...notifyPayload(row),...(patch||{})};
    const ver=Number(row.cloud_version||0)+1,now=nowIso();
    await client.query('UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,payload_json=$4::jsonb,updated_at=$5 WHERE entity_type=$6 AND entity_id=$7',[ver,origin,ver,JSON.stringify(payload),now,'lead',leadId]);
    await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,FALSE,$6::jsonb,$7)',['lead',leadId,ver,origin,ver,JSON.stringify(payload),now]);
    return true;
  });
}
async function notifyInsert(leadId,receivableId,channel,kind,scheduledAt,message){
  const dedupe=[receivableId||'none',channel,kind,notifyDay(scheduledAt)].join('|');
  const id=crypto.randomUUID(),now=nowIso();
  const sql='INSERT INTO notification_outbox(notification_id,dedupe_key,lead_id,receivable_id,channel,kind,scheduled_at,status,message_text,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) ON CONFLICT(dedupe_key) DO NOTHING RETURNING notification_id';
  const r=await pool.query(sql,[id,dedupe,leadId,receivableId||null,channel,kind,scheduledAt,'Pendente',message,now]);
  return r.rowCount>0;
}
async function notificationPlan(){
  const config=await getNotifyConfig(),brand=await getBranding(),now=new Date(),today=now.toISOString().slice(0,10);
  const minDay=notifyDateAdd(today,-config.lookbackDays),maxDay=notifyDateAdd(today,90);
  const leadRows=await rows(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND deleted=FALSE");
  const leadMap=new Map(leadRows.map(x=>[x.entity_id,notifyPayload(x)]));
  const recRows=await rows(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='receivable' AND deleted=FALSE");
  let created=0,cancelled=0,eligible=0;
  for(const rr of recRows){
    const rec=notifyPayload(rr),leadId=String(rec.leadId||rec.clientId||rec.customerId||'');
    const lead=leadMap.get(leadId);if(!lead)continue;
    const consent=!!lead.billingNotificationsEnabled&&!!lead.notificationConsentAt;
    if(!consent)continue;
    eligible++;
    const status=String(rec.status||'Pendente').toLowerCase();
    if(status.includes('cancel')){
      const q=await pool.query("UPDATE notification_outbox SET status='Cancelado',updated_at=$1 WHERE receivable_id=$2 AND status IN ('Pendente','Falhou')",[nowIso(),rr.entity_id]);cancelled+=q.rowCount;continue;
    }
    const channels=[];
    if(lead.notifyWhatsApp!==false&&notifyDigits(lead.whatsapp||lead.phone))channels.push('whatsapp');
    if(lead.notifyTelegram&&String(lead.telegramChatId||''))channels.push('telegram');
    if(!channels.length)continue;
    if(status==='pago'){
      const q=await pool.query("UPDATE notification_outbox SET status='Cancelado',updated_at=$1 WHERE receivable_id=$2 AND kind<>'paid' AND status IN ('Pendente','Falhou')",[nowIso(),rr.entity_id]);cancelled+=q.rowCount;
      if(!config.sendPaidConfirmation)continue;
      const paidDay=notifyDay(rec.paidAt||rec.updatedAt||today)||today,scheduled=notifyScheduleIso(paidDay,config.defaultHour,config.utcOffsetMinutes);
      if(notifyDay(scheduled)<minDay)continue;
      for(const ch of channels)if(await notifyInsert(leadId,rr.entity_id,ch,'paid',scheduled,notifyMessage('paid',lead,rec,brand)))created++;
      continue;
    }
    const due=notifyDay(rec.dueDate);if(!due)continue;
    const schedules=[];
    for(const n of config.daysBefore)schedules.push(['before_'+n,notifyDateAdd(due,-n)]);
    if(config.sendOnDue)schedules.push(['due',due]);
    for(const n of config.daysAfter)schedules.push(['overdue_'+n,notifyDateAdd(due,n)]);
    for(const item of schedules){
      const kind=item[0],day=item[1];
      if(!day||day<minDay||day>maxDay)continue;
      const scheduled=notifyScheduleIso(day,config.defaultHour,config.utcOffsetMinutes);
      for(const ch of channels)if(await notifyInsert(leadId,rr.entity_id,ch,kind,scheduled,notifyMessage(kind,lead,rec,brand)))created++;
    }
  }
  return{created,cancelled,eligible};
}
async function notificationView(limit){
  limit=Math.max(1,Math.min(500,Number(limit||250)));
  const info=await publicNotifyConfig();
  const sql="SELECT n.notification_id,n.lead_id,n.receivable_id,n.channel,n.kind,n.scheduled_at,n.status,n.message_text,n.provider_message_id,n.error_text,n.created_at,n.sent_at,l.payload_json AS lead_payload,r.payload_json AS receivable_payload FROM notification_outbox n LEFT JOIN entities l ON l.entity_type='lead' AND l.entity_id=n.lead_id LEFT JOIN entities r ON r.entity_type='receivable' AND r.entity_id=n.receivable_id ORDER BY n.scheduled_at DESC,n.created_at DESC LIMIT $1";
  const rr=await rows(pool,sql,[limit]);
  const counts=await one(pool,"SELECT COUNT(*) FILTER(WHERE status='Pendente')::int AS pending,COUNT(*) FILTER(WHERE status='Pendente' AND scheduled_at<=$1)::int AS due,COUNT(*) FILTER(WHERE status='Enviado')::int AS sent,COUNT(*) FILTER(WHERE status='Falhou')::int AS failed FROM notification_outbox",[nowIso()]);
  const consented=await one(pool,"SELECT COUNT(*)::int AS n FROM entities WHERE entity_type='lead' AND deleted=FALSE AND payload_json->>'billingNotificationsEnabled'='true' AND COALESCE(payload_json->>'notificationConsentAt','')<>''");
  return{ok:true,...info,summary:{pending:Number(counts?.pending||0),due:Number(counts?.due||0),sent:Number(counts?.sent||0),failed:Number(counts?.failed||0),consented:Number(consented?.n||0)},rows:rr.map(x=>({notificationId:x.notification_id,leadId:x.lead_id,receivableId:x.receivable_id,channel:x.channel,kind:x.kind,scheduledAt:x.scheduled_at,status:x.status,messageText:x.message_text,providerMessageId:x.provider_message_id,errorText:x.error_text,createdAt:x.created_at,sentAt:x.sent_at,leadPayload:notifyPayload({payload_json:x.lead_payload}),receivablePayload:notifyPayload({payload_json:x.receivable_payload})}))};
}
async function sendWhatsAppNotification(row,lead,rec,config,brand){
  const token=await getSecret('whatsappAccessToken');if(!token)throw new Error('WhatsApp Access Token nao configurado.');
  if(!/^v\d+\.\d+$/.test(config.whatsappGraphVersion))throw new Error('Configure a versao da Graph API do WhatsApp.');
  if(!/^\d+$/.test(config.whatsappPhoneNumberId))throw new Error('Phone Number ID do WhatsApp invalido.');
  const template=notifyTemplateName(row.kind,config);if(!template)throw new Error('Template WhatsApp nao configurado para este tipo de aviso.');
  const to=notifyDigits(lead.whatsapp||lead.phone);if(!to)throw new Error('Contato sem WhatsApp/telefone.');
  const name=lead.name||lead.companyName||lead.companyContactName||'cliente',desc=rec.description||rec.title||'Fatura',due=notifyDay(rec.dueDate)||'-',amount=notifyMoney(rec.amount),pix=brand.pixKey||'-';
  const payload={messaging_product:'whatsapp',to:to,type:'template',template:{name:template,language:{code:config.whatsappTemplateLanguage||'pt_BR'},components:[{type:'body',parameters:[name,desc,due,amount,pix].map(text=>({type:'text',text:String(text)}))}]}};
  const url='https://graph.facebook.com/'+config.whatsappGraphVersion+'/'+config.whatsappPhoneNumberId+'/messages';
  const j=await fetchJson(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(payload)},20000);
  return j.messages?.[0]?.id||'';
}
async function sendTelegramNotification(row,lead){
  const token=await getSecret('telegramBotToken');if(!token)throw new Error('Telegram Bot Token nao configurado.');
  const chatId=String(lead.telegramChatId||'').trim();if(!chatId)throw new Error('Contato sem Telegram conectado.');
  const j=await fetchJson('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chatId,text:row.message_text,disable_web_page_preview:true})},15000);
  return String(j.result?.message_id||'');
}
async function notificationSendOne(id){
  const sql="SELECT n.*,l.payload_json AS lead_payload,r.payload_json AS receivable_payload FROM notification_outbox n LEFT JOIN entities l ON l.entity_type='lead' AND l.entity_id=n.lead_id LEFT JOIN entities r ON r.entity_type='receivable' AND r.entity_id=n.receivable_id WHERE n.notification_id=$1";
  const row=await one(pool,sql,[id]);
  if(!row)return{sent:false,failed:true,error:'Notificacao nao encontrada.'};
  if(!['Pendente','Falhou'].includes(row.status))return{sent:false,failed:false,error:'Notificacao ja processada.'};
  const lead=notifyPayload({payload_json:row.lead_payload}),rec=notifyPayload({payload_json:row.receivable_payload});
  if(!lead.billingNotificationsEnabled||!lead.notificationConsentAt){
    await pool.query("UPDATE notification_outbox SET status='Cancelado',error_text=$1,updated_at=$2 WHERE notification_id=$3",['Consentimento removido.',nowIso(),id]);
    return{sent:false,failed:false,error:'Consentimento removido.'};
  }
  const config=await getNotifyConfig(),brand=await getBranding();
  try{
    let provider='';
    if(row.channel==='whatsapp')provider=await sendWhatsAppNotification(row,lead,rec,config,brand);
    else if(row.channel==='telegram')provider=await sendTelegramNotification(row,lead);
    else throw new Error('Canal nao suportado.');
    const now=nowIso();
    await pool.query("UPDATE notification_outbox SET status='Enviado',provider_message_id=$1,error_text=NULL,sent_at=$2,updated_at=$2 WHERE notification_id=$3",[provider,now,id]);
    return{sent:true,failed:false};
  }catch(e){
    await pool.query("UPDATE notification_outbox SET status='Falhou',error_text=$1,updated_at=$2 WHERE notification_id=$3",[String(e.message||e).slice(0,500),nowIso(),id]);
    return{sent:false,failed:true,error:e.message};
  }
}
async function notificationSend(body){
  body=body||{};
  const id=String(body.notificationId||'').trim();
  if(id){const r=await notificationSendOne(id);return{ok:true,sent:r.sent?1:0,failed:r.failed?1:0,detail:r}}
  const dueOnly=body.dueOnly!==false,limit=Math.max(1,Math.min(100,Number(body.limit||50)));
  const sql=dueOnly?"SELECT notification_id FROM notification_outbox WHERE status IN ('Pendente','Falhou') AND scheduled_at<=$1 ORDER BY scheduled_at ASC LIMIT $2":"SELECT notification_id FROM notification_outbox WHERE status IN ('Pendente','Falhou') ORDER BY scheduled_at ASC LIMIT $1";
  const args=dueOnly?[nowIso(),limit]:[limit];
  const list=await rows(pool,sql,args);let sent=0,failed=0;
  for(const x of list){const r=await notificationSendOne(x.notification_id);if(r.sent)sent++;if(r.failed)failed++}
  return{ok:true,sent,failed,total:list.length};
}
async function syncTelegramContacts(){
  const token=await getSecret('telegramBotToken');if(!token)throw new Error('Telegram Bot Token nao configurado.');
  const saved=await settingValue('telegram_update_offset',{offset:0}),offset=Number(saved?.offset||0);
  const j=await fetchJson('https://api.telegram.org/bot'+token+'/getUpdates?limit=100&timeout=0&offset='+(offset+1),{},15000);
  let linked=0,max=offset;
  for(const u of(j.result||[])){
    max=Math.max(max,Number(u.update_id||0));
    const msg=u.message||u.edited_message||{},text=String(msg.text||''),m=text.match(/^\/start\s+exe_(.+)$/);
    if(!m)continue;
    const leadId=decodeURIComponent(m[1]),chatId=msg.chat?.id;
    if(!leadId||chatId===undefined)continue;
    if(await notifySystemPatchLead(leadId,{telegramChatId:String(chatId),telegramLinkedAt:nowIso(),notifyTelegram:true},'telegram-link'))linked++;
  }
  if(max>offset)await saveSetting('telegram_update_offset',{offset:max},'telegram-bot');
  return{ok:true,linked,offset:max};
}
async function notificationTick(){
  try{
    const c=await getNotifyConfig();if(!c.autoSend)return;
    await notificationPlan();await notificationSend({dueOnly:true,limit:50});
  }catch(e){console.error('Notification tick:',e.message)}
}
