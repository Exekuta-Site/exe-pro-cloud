
// --- EXE PRO 3.7.1: WordPress Client Control + Designer ---
const WP_CTRL_TEMPLATE_DEFAULTS={
  institutional:{
    key:'institutional',name:'Institucional',eyebrow:'ACESSO TEMPORARIAMENTE INDISPONÍVEL',
    title:'Site temporariamente indisponível',
    subtitle:'Estamos trabalhando para normalizar o acesso.',
    message:'Este site está temporariamente indisponível. Tente novamente mais tarde.',
    showProgress:true,progressLabel:'Regularização em andamento',
    accent:'#18b7a4',background:'#0d0f12',card:'#15181d',text:'#ffffff',
    buttonLabel:'Falar com suporte',buttonUrl:''
  },
  financial:{
    key:'financial',name:'Financeiro discreto',eyebrow:'AVISO TEMPORÁRIO',
    title:'Acesso temporariamente pausado',
    subtitle:'Aguardando regularização administrativa.',
    message:'O acesso público a este site está temporariamente indisponível. Para suporte, entre em contato com a equipe responsável.',
    showProgress:true,progressLabel:'Processo de regularização',
    accent:'#f0b84f',background:'#0f1012',card:'#17181b',text:'#ffffff',
    buttonLabel:'Entrar em contato',buttonUrl:''
  },
  premium:{
    key:'premium',name:'Manutenção premium',eyebrow:'MANUTENÇÃO TEMPORÁRIA',
    title:'Voltamos em breve',
    subtitle:'Uma pausa rápida para normalizar o acesso.',
    message:'Estamos trabalhando para que tudo volte ao normal o quanto antes. Obrigado pela compreensão.',
    showProgress:true,progressLabel:'Progresso da normalização',
    accent:'#8b5cf6',background:'#090b12',card:'#121522',text:'#ffffff',
    buttonLabel:'Suporte',buttonUrl:''
  }
};
const WP_CTRL_DEFAULT={
  automationEnabled:false,
  defaultGraceDays:7,
  autoResume:true,
  checkMinutes:15,
  utcOffsetMinutes:-180,
  suspendTitle:'Site temporariamente indisponível',
  suspendMessage:'Este site está temporariamente indisponível. Tente novamente mais tarde.',
  retryAfterSeconds:3600,
  defaultTemplate:'institutional',
  templates:WP_CTRL_TEMPLATE_DEFAULTS
};

function wpCtrlHex(v,fallback){
  const s=String(v||'').trim();
  return /^#[0-9a-fA-F]{6}$/.test(s)?s:fallback;
}
function wpCtrlTemplateNormalize(v,fallback){
  const x={...fallback,...(v||{})};
  return{
    key:fallback.key,name:String(x.name||fallback.name).trim().slice(0,80),
    eyebrow:String(x.eyebrow||fallback.eyebrow).trim().slice(0,120),
    title:String(x.title||fallback.title).trim().slice(0,180),
    subtitle:String(x.subtitle||fallback.subtitle).trim().slice(0,260),
    message:String(x.message||fallback.message).trim().slice(0,1400),
    showProgress:x.showProgress!==false,
    progressLabel:String(x.progressLabel||fallback.progressLabel).trim().slice(0,180),
    accent:wpCtrlHex(x.accent,fallback.accent),background:wpCtrlHex(x.background,fallback.background),
    card:wpCtrlHex(x.card,fallback.card),text:wpCtrlHex(x.text,fallback.text),
    buttonLabel:String(x.buttonLabel||fallback.buttonLabel).trim().slice(0,100),
    buttonUrl:wpCtrlNormalizeUrl(x.buttonUrl)||''
  };
}
function wpCtrlConfigNormalize(v){
  const c={...WP_CTRL_DEFAULT,...(v||{})};
  c.automationEnabled=!!c.automationEnabled;
  c.defaultGraceDays=Math.max(0,Math.min(90,Number(c.defaultGraceDays??7)));
  c.autoResume=c.autoResume!==false;
  c.checkMinutes=Math.max(5,Math.min(120,Number(c.checkMinutes||15)));
  c.utcOffsetMinutes=Math.max(-720,Math.min(840,Number(c.utcOffsetMinutes??-180)));
  c.suspendTitle=String(c.suspendTitle||WP_CTRL_DEFAULT.suspendTitle).trim().slice(0,180);
  c.suspendMessage=String(c.suspendMessage||WP_CTRL_DEFAULT.suspendMessage).trim().slice(0,1200);
  c.retryAfterSeconds=Math.max(60,Math.min(86400,Number(c.retryAfterSeconds||3600)));
  c.defaultTemplate=['institutional','financial','premium'].includes(String(c.defaultTemplate||''))?String(c.defaultTemplate):'institutional';
  const incoming=(v&&v.templates)||{};
  c.templates={
    institutional:wpCtrlTemplateNormalize(incoming.institutional,WP_CTRL_TEMPLATE_DEFAULTS.institutional),
    financial:wpCtrlTemplateNormalize(incoming.financial,WP_CTRL_TEMPLATE_DEFAULTS.financial),
    premium:wpCtrlTemplateNormalize(incoming.premium,WP_CTRL_TEMPLATE_DEFAULTS.premium)
  };
  return c;
}
async function wpCtrlGetConfig(){
  return wpCtrlConfigNormalize(await settingValue('wordpress_control_config',{}));
}
function wpCtrlNormalizeUrl(raw){
  let u;
  try{u=new URL(String(raw||'').trim())}catch{return''}
  if(u.protocol!=='https:'||u.username||u.password)return'';
  const h=String(u.hostname||'').toLowerCase();
  if(!h||h==='localhost'||h.endsWith('.local')||h.endsWith('.internal'))return'';
  if(/^\d+\.\d+\.\d+\.\d+$/.test(h)){
    const p=h.split('.').map(Number);
    if(p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168))return'';
  }
  if(h==='::1'||h.startsWith('fc')||h.startsWith('fd')||h.startsWith('fe80:'))return'';
  u.hash='';u.search='';
  u.pathname=u.pathname.replace(/\/+$/,'');
  return u.toString().replace(/\/+$/,'');
}
function wpCtrlSecretKey(id){return'wordpressSite:'+String(id||'')}
function wpCtrlPayload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function wpCtrlDay(config){
  const shifted=new Date(Date.now()+Number(config.utcOffsetMinutes||0)*60000);
  return shifted.toISOString().slice(0,10);
}
function wpCtrlDiffDays(a,b){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(a||''))||!/^\d{4}-\d{2}-\d{2}$/.test(String(b||'')))return 0;
  return Math.floor((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
}
async function wpCtrlFinance(leadId,config){
  const rr=await rows(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='receivable' AND deleted=FALSE AND payload_json->>'leadId'=$1",[leadId]);
  const today=wpCtrlDay(config);
  let overdueCount=0,maxOverdueDays=0,totalOverdue=0,nextDue='',openCount=0;
  for(const row of rr){
    const p=wpCtrlPayload(row),st=String(p.status||'Pendente').toLowerCase();
    if(st.includes('pago')||st.includes('cancel'))continue;
    openCount++;
    const due=String(p.dueDate||'').slice(0,10);
    if(due&&(!nextDue||due<nextDue))nextDue=due;
    const days=wpCtrlDiffDays(due,today);
    if(due&&days>0){
      overdueCount++;maxOverdueDays=Math.max(maxOverdueDays,days);totalOverdue+=Number(p.amount||0);
    }
  }
  return{openCount,overdueCount,maxOverdueDays,totalOverdue,nextDue,today};
}
async function wpCtrlRemote(site,action,payload){
  const base=wpCtrlNormalizeUrl(site.site_url);
  if(!base)throw new Error('URL WordPress invalida. Use HTTPS publico.');
  const secret=await getSecret(wpCtrlSecretKey(site.site_id));
  if(!secret)throw new Error('Chave de conexao WordPress nao configurada.');
  const route='/exe-pro/v1/'+action;
  const method=action==='status'?'GET':'POST';
  const body=method==='GET'?'':JSON.stringify(payload||{});
  const timestamp=String(Math.floor(Date.now()/1000));
  const nonce=crypto.randomBytes(18).toString('base64url');
  const bodyHash=crypto.createHash('sha256').update(body).digest('hex');
  const canonical=[timestamp,nonce,method,route,bodyHash].join('\n');
  const signature=crypto.createHmac('sha256',secret).update(canonical).digest('hex');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
    const res=await fetch(base+'/wp-json'+route,{
      method,redirect:'error',signal:controller.signal,
      headers:{'accept':'application/json','content-type':'application/json','user-agent':'EXE-PRO-Cloud/3.7.1','x-exe-timestamp':timestamp,'x-exe-nonce':nonce,'x-exe-signature':signature},
      body:method==='GET'?undefined:body
    });
    const text=await res.text();let data={};
    try{data=text?JSON.parse(text):{}}catch{data={raw:text.slice(0,500)}}
    if(!res.ok)throw new Error('WordPress HTTP '+res.status+': '+String(data.message||data.error||data.raw||'falha remota').slice(0,300));
    return data;
  }finally{clearTimeout(timer)}
}
async function wpCtrlMark(siteId,patch){
  const keys=['status','remote_suspended','suspend_mode','suspended_reason','last_checked_at','last_action_at','last_action','last_error'];
  const sets=[],args=[];let i=1;
  for(const k of keys){if(Object.prototype.hasOwnProperty.call(patch,k)){sets.push(k+'=$'+i++);args.push(patch[k])}}
  sets.push('updated_at=$'+i++);args.push(nowIso());
  args.push(siteId);
  if(sets.length)await pool.query('UPDATE wordpress_sites SET '+sets.join(',')+' WHERE site_id=$'+i,args);
}
async function wpCtrlStatus(site){
  try{
    const data=await wpCtrlRemote(site,'status');
    await wpCtrlMark(site.site_id,{status:data.suspended?'Suspenso':'Online',remote_suspended:!!data.suspended,suspend_mode:String(data.suspend_mode||''),last_checked_at:nowIso(),last_action:'status',last_action_at:nowIso(),last_error:null});
    return{ok:true,data};
  }catch(e){
    await wpCtrlMark(site.site_id,{status:'Erro',last_checked_at:nowIso(),last_action:'status',last_action_at:nowIso(),last_error:String(e.message||e).slice(0,500)});
    throw e;
  }
}
function wpCtrlDesignForSite(site,config){
  const key=['institutional','financial','premium'].includes(String(site.template_key||''))?String(site.template_key):config.defaultTemplate;
  const base={...(config.templates?.[key]||WP_CTRL_TEMPLATE_DEFAULTS.institutional)};
  let custom={};
  try{custom=typeof site.design_json==='string'?JSON.parse(site.design_json||'{}'):(site.design_json||{})}catch{custom={}}
  if(custom.messageOverride)base.message=String(custom.messageOverride).trim().slice(0,1400);
  if(custom.subtitleOverride)base.subtitle=String(custom.subtitleOverride).trim().slice(0,260);
  return{...base,template:key,progressPercent:Math.max(0,Math.min(100,Number(site.progress_percent??65)))};
}
async function wpCtrlAction(site,action,mode,reason){
  if(action==='suspend'&&!site.contract_allows_suspend)throw new Error('Suspensao nao autorizada para este cliente. Marque a clausula contratual primeiro.');
  const config=await wpCtrlGetConfig();
  const design=wpCtrlDesignForSite(site,config);
  const data=await wpCtrlRemote(site,action,action==='suspend'?{
    mode:mode||'manual',
    title:config.suspendTitle,
    message:config.suspendMessage,
    retry_after:config.retryAfterSeconds,
    reason:String(reason||'').slice(0,300),
    design
  }:{});
  const suspended=action==='suspend';
  await wpCtrlMark(site.site_id,{
    status:suspended?'Suspenso':'Online',
    remote_suspended:suspended,
    suspend_mode:suspended?(mode||'manual'):'',
    suspended_reason:suspended?String(reason||''):'',
    last_checked_at:nowIso(),last_action:action,last_action_at:nowIso(),last_error:null
  });
  return data;
}
async function wpCtrlOne(id){
  return one(pool,'SELECT * FROM wordpress_sites WHERE site_id=$1',[id]);
}
async function wpCtrlView(){
  const config=await wpCtrlGetConfig();
  const list=await rows(pool,"SELECT w.*,e.payload_json AS lead_payload FROM wordpress_sites w LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=w.lead_id AND e.deleted=FALSE ORDER BY w.updated_at DESC");
  const sites=[];
  for(const row of list){
    const finance=await wpCtrlFinance(row.lead_id,config);
    sites.push({
      siteId:row.site_id,leadId:row.lead_id,siteUrl:row.site_url,label:row.label||'',enabled:!!row.enabled,
      contractAllowsSuspend:!!row.contract_allows_suspend,autoSuspend:!!row.auto_suspend,autoResume:!!row.auto_resume,
      graceDays:Number(row.grace_days||config.defaultGraceDays),status:row.status||'Desconhecido',
      remoteSuspended:!!row.remote_suspended,suspendMode:row.suspend_mode||'',suspendedReason:row.suspended_reason||'',
      lastCheckedAt:row.last_checked_at,lastActionAt:row.last_action_at,lastAction:row.last_action||'',lastError:row.last_error||'',
      templateKey:row.template_key||config.defaultTemplate,progressPercent:Number(row.progress_percent??65),
      design:wpCtrlPayload({payload_json:row.design_json}),
      updatedAt:row.updated_at,leadPayload:wpCtrlPayload({payload_json:row.lead_payload}),finance
    });
  }
  return{ok:true,config,sites,summary:{
    total:sites.length,online:sites.filter(x=>x.status==='Online').length,suspended:sites.filter(x=>x.remoteSuspended).length,
    error:sites.filter(x=>x.status==='Erro').length,overdue:sites.filter(x=>x.finance.maxOverdueDays>0).length,
    automatic:sites.filter(x=>x.autoSuspend&&x.contractAllowsSuspend).length
  }};
}
async function wpCtrlCreate(body,session){
  const leadId=validId(body.leadId,180),siteUrl=wpCtrlNormalizeUrl(body.siteUrl),key=String(body.connectionKey||'').trim();
  if(!leadId||!siteUrl)return{status:400,body:{ok:false,error:'Cliente e URL HTTPS do WordPress sao obrigatorios.'}};
  if(key.length<32)return{status:400,body:{ok:false,error:'Informe a chave de conexao exibida pelo plugin EXE PRO Connector.'}};
  const lead=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
  if(!lead)return{status:404,body:{ok:false,error:'Cliente nao encontrado.'}};
  const id=crypto.randomUUID(),now=nowIso(),config=await wpCtrlGetConfig(),grace=Math.max(0,Math.min(90,Number(body.graceDays??config.defaultGraceDays)));
  try{
    const templateKey=['institutional','financial','premium'].includes(String(body.templateKey||''))?String(body.templateKey):config.defaultTemplate;
    const progressPercent=Math.max(0,Math.min(100,Number(body.progressPercent??65)));
    const designJson=JSON.stringify({messageOverride:String(body.messageOverride||'').trim().slice(0,1400),subtitleOverride:String(body.subtitleOverride||'').trim().slice(0,260)});
    const sql="INSERT INTO wordpress_sites(site_id,lead_id,site_url,site_url_norm,label,enabled,contract_allows_suspend,auto_suspend,auto_resume,grace_days,status,remote_suspended,created_at,updated_at,updated_by,template_key,progress_percent,design_json) VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,'Desconhecido',FALSE,$10,$10,$11,$12,$13,$14::jsonb)";
    await pool.query(sql,[id,leadId,siteUrl,String(body.label||'').trim().slice(0,160),body.enabled!==false,!!body.contractAllowsSuspend,!!body.autoSuspend,body.autoResume!==false,grace,now,session.username||'',templateKey,progressPercent,designJson]);
    await setSecret(wpCtrlSecretKey(id),key);
    const site=await wpCtrlOne(id);
    try{await wpCtrlStatus(site)}catch{}
    return{status:200,body:{ok:true,siteId:id,view:await wpCtrlView()}};
  }catch(e){
    if(/unique|duplicate/i.test(String(e.message||'')))return{status:409,body:{ok:false,error:'Este site WordPress ja esta conectado ao EXE PRO.'}};
    try{await pool.query('DELETE FROM wordpress_sites WHERE site_id=$1',[id])}catch{}
    throw e;
  }
}
async function wpCtrlPatch(body,session){
  const id=validId(body.siteId,180);if(!id)return{status:400,body:{ok:false,error:'Site invalido.'}};
  const current=await wpCtrlOne(id);if(!current)return{status:404,body:{ok:false,error:'Site nao encontrado.'}};
  const config=await wpCtrlGetConfig();
  const siteUrl=body.siteUrl===undefined?current.site_url:wpCtrlNormalizeUrl(body.siteUrl);
  if(!siteUrl)return{status:400,body:{ok:false,error:'URL HTTPS do WordPress invalida.'}};
  const leadId=body.leadId===undefined?current.lead_id:validId(body.leadId,180);
  if(!leadId)return{status:400,body:{ok:false,error:'Cliente invalido.'}};
  const grace=Math.max(0,Math.min(90,Number(body.graceDays??current.grace_days??config.defaultGraceDays)));
  const now=nowIso();
  try{
    const templateKey=['institutional','financial','premium'].includes(String(body.templateKey||current.template_key||''))?String(body.templateKey||current.template_key):config.defaultTemplate;
    const progressPercent=Math.max(0,Math.min(100,Number(body.progressPercent??current.progress_percent??65)));
    let currentDesign={};try{currentDesign=typeof current.design_json==='string'?JSON.parse(current.design_json||'{}'):(current.design_json||{})}catch{currentDesign={}}
    const designJson=JSON.stringify({...currentDesign,messageOverride:body.messageOverride===undefined?String(currentDesign.messageOverride||''):String(body.messageOverride||'').trim().slice(0,1400),subtitleOverride:body.subtitleOverride===undefined?String(currentDesign.subtitleOverride||''):String(body.subtitleOverride||'').trim().slice(0,260)});
    const sql="UPDATE wordpress_sites SET lead_id=$1,site_url=$2,site_url_norm=$2,label=$3,enabled=$4,contract_allows_suspend=$5,auto_suspend=$6,auto_resume=$7,grace_days=$8,updated_at=$9,updated_by=$10,template_key=$11,progress_percent=$12,design_json=$13::jsonb WHERE site_id=$14";
    await pool.query(sql,[leadId,siteUrl,String(body.label??current.label??'').trim().slice(0,160),body.enabled===undefined?current.enabled:!!body.enabled,
       body.contractAllowsSuspend===undefined?current.contract_allows_suspend:!!body.contractAllowsSuspend,
       body.autoSuspend===undefined?current.auto_suspend:!!body.autoSuspend,
       body.autoResume===undefined?current.auto_resume:!!body.autoResume,
       grace,now,session.username||'',templateKey,progressPercent,designJson,id]);
    if(String(body.connectionKey||'').trim())await setSecret(wpCtrlSecretKey(id),String(body.connectionKey).trim());
    return{status:200,body:{ok:true,view:await wpCtrlView()}};
  }catch(e){
    if(/unique|duplicate/i.test(String(e.message||'')))return{status:409,body:{ok:false,error:'Este site WordPress ja esta conectado ao EXE PRO.'}};
    throw e;
  }
}
async function wpCtrlRemove(body){
  const id=validId(body.siteId,180);if(!id)return{status:400,body:{ok:false,error:'Site invalido.'}};
  const site=await wpCtrlOne(id);if(!site)return{status:404,body:{ok:false,error:'Site nao encontrado.'}};
  if(site.remote_suspended&&!body.force)return{status:409,body:{ok:false,error:'O site ainda esta suspenso. Reative antes de remover a conexao ou confirme remocao forcada.'}};
  await pool.query('DELETE FROM wordpress_sites WHERE site_id=$1',[id]);
  await pool.query('DELETE FROM cloud_secrets WHERE secret_key=$1',[wpCtrlSecretKey(id)]);
  return{status:200,body:{ok:true,view:await wpCtrlView()}};
}
async function wpCtrlEvaluate(force){
  const config=await wpCtrlGetConfig();
  if(!config.automationEnabled&&!force)return{ok:true,skipped:true,reason:'Automacao WordPress desativada.'};
  const list=await rows(pool,'SELECT * FROM wordpress_sites WHERE enabled=TRUE ORDER BY updated_at ASC');
  let checked=0,suspended=0,resumed=0,failed=0;
  const details=[];
  for(const site of list){
    const finance=await wpCtrlFinance(site.lead_id,config);
    const grace=Math.max(0,Number(site.grace_days??config.defaultGraceDays));
    const shouldSuspend=!!site.auto_suspend&&!!site.contract_allows_suspend&&finance.maxOverdueDays>=grace&&finance.overdueCount>0;
    try{
      if(shouldSuspend&&!site.remote_suspended){
        await wpCtrlAction(site,'suspend','automatic','Inadimplencia: '+finance.maxOverdueDays+' dia(s) de atraso.');suspended++;
        details.push({siteId:site.site_id,action:'suspend',overdueDays:finance.maxOverdueDays});
      }else if(!finance.overdueCount&&site.remote_suspended&&site.suspend_mode==='automatic'&&site.auto_resume&&config.autoResume){
        await wpCtrlAction(site,'resume','automatic','Pagamento regularizado.');resumed++;
        details.push({siteId:site.site_id,action:'resume'});
      }
      checked++;
    }catch(e){
      failed++;details.push({siteId:site.site_id,action:'error',error:String(e.message||e).slice(0,300)});
      await wpCtrlMark(site.site_id,{status:'Erro',last_error:String(e.message||e).slice(0,500),last_action_at:nowIso(),last_action:'automation'});
    }
  }
  return{ok:true,checked,suspended,resumed,failed,details};
}
async function wpCtrlTick(){
  try{await wpCtrlEvaluate(false)}catch(e){console.error('WordPress control tick:',e.message)}
}
