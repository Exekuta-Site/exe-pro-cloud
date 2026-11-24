
// --- EXE PRO 4.2.0: WhatsApp Business Central de Conversas ---
const WHATSAPP_BUSINESS_420='4.2.0';

function whatsapp420Payload(value){
  if(value&&typeof value==='object')return value;
  if(typeof value==='string'){try{return JSON.parse(value)||{}}catch{}}
  return {};
}
function whatsapp420Digits(value){
  let d=String(value||'').replace(/\D+/g,'');
  if(d.startsWith('00'))d=d.slice(2);
  if(d.length===10||d.length===11)d='55'+d;
  return d.length>=8&&d.length<=15?d:'';
}
function whatsapp420SamePhone(a,b){
  const x=whatsapp420Digits(a),y=whatsapp420Digits(b);
  return !!(x&&y&&x.length>=8&&y.length>=8&&(x===y||x.endsWith(y)||y.endsWith(x)));
}
function whatsapp420MessageIso(value){
  const n=Number(value||0);
  if(!Number.isFinite(n)||n<=0)return nowIso();
  return new Date(n<100000000000? n*1000:n).toISOString();
}
function whatsapp420ContactName(payload,fallback=''){
  const p=whatsapp420Payload(payload);
  return String(p.name||p.companyName||p.companyContactName||fallback||'').trim().slice(0,180);
}
function whatsapp420Error(value){
  return String(value?.message||value||'Erro no WhatsApp.').slice(0,500);
}
function whatsapp420StatusLabel(value){
  const v=String(value||'').toLowerCase();
  if(v==='delivered')return'Delivered';
  if(v==='read')return'Read';
  if(v==='sent')return'Sent';
  if(v==='failed')return'Failed';
  return v||'Received';
}
async function whatsapp420PublicConfig(){
  const c=await getNotifyConfig();
  const access=!!(await getSecret('whatsappAccessToken'));
  const verify=!!(await getSecret('whatsappVerifyToken'));
  const app=!!(await getSecret('whatsappAppSecret'));
  const base=String(PUBLIC_URL||'').replace(/\/+$/,'');
  return{
    configured:access&&!!c.whatsappPhoneNumberId&&!!c.whatsappGraphVersion,
    webhookReady:verify&&app,
    phoneNumberId:c.whatsappPhoneNumberId||'',
    graphVersion:c.whatsappGraphVersion||'',
    accessTokenConfigured:access,
    verifyTokenConfigured:verify,
    appSecretConfigured:app,
    webhookUrl:(base||'')+'/api/whatsapp/webhook'
  };
}
async function whatsapp420ConfigUpdate(body,user){
  body=body||{};
  const current=await getNotifyConfig();
  const next=normalizeNotifyConfig({
    ...current,
    whatsappPhoneNumberId:body.phoneNumberId===undefined?current.whatsappPhoneNumberId:String(body.phoneNumberId||'').trim(),
    whatsappGraphVersion:body.graphVersion===undefined?current.whatsappGraphVersion:String(body.graphVersion||'').trim()
  });
  if(next.whatsappPhoneNumberId&&!/^\d+$/.test(next.whatsappPhoneNumberId))throw new Error('Phone Number ID inválido.');
  if(next.whatsappGraphVersion&&!/^v\d+\.\d+$/.test(next.whatsappGraphVersion))throw new Error('Graph API version inválida. Use, por exemplo, v23.0.');
  if(String(body.accessToken||'').trim())await setSecret('whatsappAccessToken',body.accessToken);
  if(String(body.verifyToken||'').trim())await setSecret('whatsappVerifyToken',body.verifyToken);
  if(String(body.appSecret||'').trim())await setSecret('whatsappAppSecret',body.appSecret);
  await saveSetting('notification_config',next,user);
  return whatsapp420PublicConfig();
}
async function whatsapp420FindLead(phone){
  const leadRows=await rows(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND deleted=FALSE");
  for(const row of leadRows){
    const p=whatsapp420Payload(row.payload_json);
    if([p.whatsapp,p.phone,p.mobile,p.cellphone].some(value=>whatsapp420SamePhone(phone,value)))return{leadId:row.entity_id,payload:p};
  }
  return null;
}
async function whatsapp420EnsureConversation(input){
  input=input||{};
  const requestedId=validId(input.conversationId,180);
  let current=requestedId?await one(pool,'SELECT * FROM whatsapp_conversations WHERE conversation_id=$1',[requestedId]):null;
  const phone=whatsapp420Digits(input.phone||input.phoneNumber||current?.phone_number);
  if(!phone)throw new Error('Informe um número de WhatsApp válido.');
  if(!current)current=await one(pool,'SELECT * FROM whatsapp_conversations WHERE phone_number=$1',[phone]);
  const leadId=validId(input.leadId,180)||null;
  const contactName=String(input.contactName||'').trim().slice(0,180);
  const now=nowIso();
  if(current){
    await pool.query('UPDATE whatsapp_conversations SET phone_number=$1,contact_name=COALESCE(NULLIF($2,\'\'),contact_name),lead_id=COALESCE($3,lead_id),updated_at=$4 WHERE conversation_id=$5',[phone,contactName,leadId,now,current.conversation_id]);
    return one(pool,'SELECT * FROM whatsapp_conversations WHERE conversation_id=$1',[current.conversation_id]);
  }
  const id=crypto.randomUUID();
  const inserted=await pool.query('INSERT INTO whatsapp_conversations(conversation_id,lead_id,phone_number,contact_name,status,last_message_at,last_inbound_at,unread_count,created_at,updated_at) VALUES($1,$2,$3,$4,\'Aberta\',NULL,NULL,0,$5,$5) ON CONFLICT(phone_number) DO UPDATE SET contact_name=COALESCE(NULLIF(EXCLUDED.contact_name,\'\'),whatsapp_conversations.contact_name),lead_id=COALESCE(EXCLUDED.lead_id,whatsapp_conversations.lead_id),updated_at=EXCLUDED.updated_at RETURNING *',[id,leadId,phone,contactName,now]);
  return inserted.rows[0];
}
function whatsapp420ConversationView(row){
  return{
    conversationId:row.conversation_id,
    leadId:row.lead_id||'',
    phoneNumber:row.phone_number||'',
    contactName:row.contact_name||row.phone_number||'',
    status:row.status||'Aberta',
    lastMessageAt:row.last_message_at||'',
    lastInboundAt:row.last_inbound_at||'',
    unreadCount:Number(row.unread_count||0),
    lastMessageBody:row.last_message_body||'',
    lastMessageDirection:row.last_message_direction||''
  };
}
function whatsapp420MessageView(row){
  return{
    messageId:row.message_id,
    conversationId:row.conversation_id,
    providerMessageId:row.provider_message_id||'',
    direction:row.direction,
    messageType:row.message_type,
    body:row.body||'',
    status:row.status||'',
    errorText:row.error_text||'',
    sentBy:row.sent_by||'',
    createdAt:row.created_at,
    updatedAt:row.updated_at
  };
}
async function whatsapp420View(url){
  const limit=Math.max(1,Math.min(200,Number(url.searchParams.get('limit')||100)));
  const list=await rows(pool,"SELECT c.*,last_msg.body AS last_message_body,last_msg.direction AS last_message_direction FROM whatsapp_conversations c LEFT JOIN LATERAL (SELECT body,direction FROM whatsapp_messages m WHERE m.conversation_id=c.conversation_id ORDER BY m.created_at DESC,m.updated_at DESC LIMIT 1) last_msg ON TRUE ORDER BY c.last_message_at DESC NULLS LAST,c.updated_at DESC LIMIT $1",[limit]);
  const requested=validId(url.searchParams.get('conversationId'),180);
  const selectedId=requested||(list[0]?.conversation_id||'');
  const selectedRow=selectedId?await one(pool,'SELECT * FROM whatsapp_conversations WHERE conversation_id=$1',[selectedId]):null;
  const messages=selectedRow?await rows(pool,'SELECT message_id,conversation_id,provider_message_id,direction,message_type,body,status,error_text,sent_by,created_at,updated_at FROM whatsapp_messages WHERE conversation_id=$1 ORDER BY created_at DESC,updated_at DESC LIMIT 500',[selectedRow.conversation_id]):[];
  const unread=await one(pool,'SELECT COALESCE(SUM(unread_count),0)::int AS total,COUNT(*)::int AS conversations FROM whatsapp_conversations WHERE unread_count>0');
  return{
    ok:true,
    config:await whatsapp420PublicConfig(),
    summary:{conversations:list.length,unread:Number(unread?.total||0),unreadConversations:Number(unread?.conversations||0)},
    conversations:list.map(whatsapp420ConversationView),
    selected:selectedRow?{...whatsapp420ConversationView(selectedRow),messages:messages.reverse().map(whatsapp420MessageView)}:null
  };
}
async function whatsapp420ClearFailed(body){
  body=body||{};
  const conversationId=validId(body.conversationId,180);
  if(!conversationId)throw new Error('Conversa não informada.');
  const conversation=await one(pool,'SELECT conversation_id FROM whatsapp_conversations WHERE conversation_id=$1',[conversationId]);
  if(!conversation)throw new Error('Conversa não encontrada.');
  const result=await pool.query("DELETE FROM whatsapp_messages WHERE conversation_id=$1 AND LOWER(status)='failed' RETURNING message_id",[conversationId]);
  await pool.query('UPDATE whatsapp_conversations SET updated_at=$1 WHERE conversation_id=$2',[nowIso(),conversationId]);
  return Number(result?.rowCount||0);
}
function whatsapp420TextFromMessage(message){
  const type=String(message?.type||'text');
  if(type==='text')return String(message?.text?.body||'').trim();
  if(type==='image')return String(message?.image?.caption||'[Imagem recebida]').trim();
  if(type==='video')return String(message?.video?.caption||'[Vídeo recebido]').trim();
  if(type==='audio')return'[Áudio recebido]';
  if(type==='document')return String(message?.document?.caption||'[Documento recebido]').trim();
  if(type==='location')return'[Localização recebida]';
  if(type==='contacts')return'[Contato recebido]';
  if(type==='sticker')return'[Sticker recebido]';
  return'['+type+' recebido]';
}
async function whatsapp420StoreInbound(value,message){
  const providerId=validId(message?.id,240);
  const from=whatsapp420Digits(message?.from);
  if(!providerId||!from)return false;
  const contact=(value?.contacts||[]).find(x=>whatsapp420Digits(x?.wa_id)===from)||{};
  const lead=await whatsapp420FindLead(from);
  const conversation=await whatsapp420EnsureConversation({phone:from,leadId:lead?.leadId||'',contactName:contact?.profile?.name||''});
  const createdAt=whatsapp420MessageIso(message?.timestamp);
  const messageType=String(message?.type||'text').slice(0,40);
  const body=whatsapp420TextFromMessage(message).slice(0,10000);
  const now=nowIso();
  const inserted=await pool.query("INSERT INTO whatsapp_messages(message_id,conversation_id,provider_message_id,direction,message_type,body,status,error_text,sent_by,provider_payload,created_at,updated_at) VALUES($1,$2,$3,'inbound',$4,$5,'Received',NULL,NULL,$6::jsonb,$7,$8) ON CONFLICT(provider_message_id) DO NOTHING RETURNING message_id",[crypto.randomUUID(),conversation.conversation_id,providerId,messageType,body,JSON.stringify(message),createdAt,now]);
  if(!inserted.rowCount)return false;
  await pool.query("UPDATE whatsapp_conversations SET lead_id=COALESCE($1,lead_id),contact_name=COALESCE(NULLIF($2,''),contact_name),last_message_at=$3,last_inbound_at=$3,unread_count=unread_count+1,updated_at=$4 WHERE conversation_id=$5",[lead?.leadId||null,contact?.profile?.name||'',createdAt,now,conversation.conversation_id]);
  return true;
}
async function whatsapp420StoreStatus(status){
  const providerId=validId(status?.id,240);
  if(!providerId)return false;
  const state=String(status?.status||'').toLowerCase();
  if(!state)return false;
  const errorText=(status?.errors||[]).map(x=>x?.title||x?.message||'').filter(Boolean).join('; ').slice(0,500)||null;
  const result=await pool.query('UPDATE whatsapp_messages SET status=$1,error_text=$2,updated_at=$3 WHERE provider_message_id=$4',[whatsapp420StatusLabel(state),errorText,nowIso(),providerId]);
  return result.rowCount>0;
}
function whatsapp420SignatureValid(raw,secret,header){
  const expected=crypto.createHmac('sha256',secret).update(raw,'utf8').digest('hex');
  const actual=String(header||'').replace(/^sha256=/i,'').trim();
  if(!/^[a-f0-9]{64}$/i.test(actual))return false;
  return crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(actual,'hex'));
}
function whatsapp420ReadRaw(req){
  return new Promise((resolve,reject)=>{
    let raw='',size=0;
    req.setEncoding('utf8');
    req.on('data',chunk=>{size+=Buffer.byteLength(chunk,'utf8');if(size>2*1024*1024){reject(new Error('Webhook muito grande.'));req.destroy();return}raw+=chunk});
    req.on('end',()=>resolve(raw));
    req.on('error',reject);
  });
}
async function whatsapp420WebhookVerify(url,res){
  const verify=await getSecret('whatsappVerifyToken');
  const mode=url.searchParams.get('hub.mode'),token=url.searchParams.get('hub.verify_token'),challenge=url.searchParams.get('hub.challenge');
  if(mode==='subscribe'&&verify&&token===verify&&challenge){
    res.writeHead(200,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});res.end(challenge);return;
  }
  return json(res,403,{ok:false,error:'Verificação do webhook recusada.'});
}
async function whatsapp420WebhookReceive(req,res){
  const secret=await getSecret('whatsappAppSecret');
  if(!secret)return json(res,503,{ok:false,error:'App Secret do WhatsApp ainda não configurado.'});
  const raw=await whatsapp420ReadRaw(req);
  if(!whatsapp420SignatureValid(raw,secret,req.headers['x-hub-signature-256']))return json(res,403,{ok:false,error:'Assinatura do webhook inválida.'});
  let body={};try{body=raw?JSON.parse(raw):{}}catch{return json(res,400,{ok:false,error:'Payload do webhook inválido.'})}
  if(body.object!=='whatsapp_business_account')return json(res,200,{ok:true,ignored:true});
  let received=0,updated=0;
  for(const entry of(body.entry||[])){
    for(const change of(entry.changes||[])){
      const value=change.value||{};
      for(const message of(value.messages||[]))if(await whatsapp420StoreInbound(value,message))received++;
      for(const status of(value.statuses||[]))if(await whatsapp420StoreStatus(status))updated++;
    }
  }
  return json(res,200,{ok:true,received,updated});
}
async function whatsapp420CreateConversation(body){
  body=body||{};
  const phone=whatsapp420Digits(body.phoneNumber||body.phone);
  if(!phone)throw new Error('Informe o número com DDD e país, por exemplo 5511999999999.');
  let leadId=validId(body.leadId,180),contactName=String(body.contactName||'').trim().slice(0,180);
  if(leadId){
    const lead=await one(pool,"SELECT payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
    if(lead&&!contactName)contactName=whatsapp420ContactName(lead.payload_json);
  }
  const conversation=await whatsapp420EnsureConversation({phone,leadId,contactName});
  return whatsapp420ConversationView(conversation);
}
async function whatsapp420SendText(body,user){
  body=body||{};
  const text=String(body.text||'').trim().slice(0,4096);
  if(!text)throw new Error('Digite uma mensagem.');
  let phone=whatsapp420Digits(body.phoneNumber||body.phone),leadId=validId(body.leadId,180),contactName=String(body.contactName||'').trim().slice(0,180);
  if(!phone&&leadId){
    const lead=await one(pool,"SELECT payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
    const p=whatsapp420Payload(lead?.payload_json);phone=whatsapp420Digits(p.whatsapp||p.phone);if(!contactName)contactName=whatsapp420ContactName(p);
  }
  const conversation=await whatsapp420EnsureConversation({conversationId:body.conversationId,phone,leadId,contactName});
  const config=await getNotifyConfig(),token=await getSecret('whatsappAccessToken');
  if(!token)throw new Error('Access Token do WhatsApp ainda não configurado.');
  if(!/^\d+$/.test(config.whatsappPhoneNumberId||''))throw new Error('Phone Number ID do WhatsApp ainda não configurado.');
  if(!/^v\d+\.\d+$/.test(config.whatsappGraphVersion||''))throw new Error('Graph API version inválida ou não configurada.');
  const payload={messaging_product:'whatsapp',recipient_type:'individual',to:conversation.phone_number,type:'text',text:{preview_url:false,body:text}};
  const now=nowIso();
  try{
    const result=await fetchJson('https://graph.facebook.com/'+config.whatsappGraphVersion+'/'+config.whatsappPhoneNumberId+'/messages',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(payload)},20000);
    const providerId=validId(result.messages?.[0]?.id,240);if(!providerId)throw new Error('WhatsApp não retornou o ID da mensagem.');
    const inserted=await pool.query("INSERT INTO whatsapp_messages(message_id,conversation_id,provider_message_id,direction,message_type,body,status,error_text,sent_by,provider_payload,created_at,updated_at) VALUES($1,$2,$3,'outbound','text',$4,'Sent',NULL,$5,$6::jsonb,$7,$7) RETURNING message_id",[crypto.randomUUID(),conversation.conversation_id,providerId,text,user||'',JSON.stringify(result),now]);
    await pool.query('UPDATE whatsapp_conversations SET last_message_at=$1,updated_at=$1 WHERE conversation_id=$2',[now,conversation.conversation_id]);
    return{conversationId:conversation.conversation_id,message:whatsapp420MessageView(inserted.rows[0]),providerMessageId:providerId};
  }catch(error){
    await pool.query("INSERT INTO whatsapp_messages(message_id,conversation_id,provider_message_id,direction,message_type,body,status,error_text,sent_by,provider_payload,created_at,updated_at) VALUES($1,$2,NULL,'outbound','text',$3,'Failed',$4,$5,'{}'::jsonb,$6,$6)",[crypto.randomUUID(),conversation.conversation_id,text,whatsapp420Error(error),user||'',now]);
    await pool.query('UPDATE whatsapp_conversations SET last_message_at=$1,updated_at=$1 WHERE conversation_id=$2',[now,conversation.conversation_id]);
    throw error;
  }
}
