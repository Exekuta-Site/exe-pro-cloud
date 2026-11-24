
// --- EXE PRO 4.3.0: WhatsApp Business App Onboarding / Coexistence ---
const WHATSAPP_COEXISTENCE_430='4.3.0';

function whatsapp430Value(value){
  if(value&&typeof value==='object')return value;
  if(typeof value==='string'){try{return JSON.parse(value)||{}}catch{}}
  return{};
}
function whatsapp430Error(value){return String(value?.message||value||'Erro na conexão oficial do WhatsApp.').slice(0,500)}
function whatsapp430Hash(value){return crypto.createHash('sha256').update(String(value||''),'utf8').digest('hex')}
function whatsapp430Find(root,keys){
  const wanted=new Set(keys),queue=[whatsapp430Value(root)],seen=new Set();
  while(queue.length){
    const item=queue.shift();if(!item||typeof item!=='object'||seen.has(item))continue;seen.add(item);
    for(const key of wanted){if(item[key]!==undefined&&item[key]!==null&&String(item[key]).trim())return String(item[key]).trim()}
    for(const value of Object.values(item))if(value&&typeof value==='object')queue.push(value);
  }
  return'';
}
async function whatsapp430ConfigView(){
  const saved=await settingValue('whatsapp_coexistence_config',{});
  const notify=await getNotifyConfig();
  const appId=String(saved.appId||process.env.WHATSAPP_META_APP_ID||'').trim();
  const configId=String(saved.configId||process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID||'').trim();
  const graphVersion=String(notify.whatsappGraphVersion||process.env.WHATSAPP_GRAPH_VERSION||'v23.0').trim();
  const access=!!(await getSecret('whatsappAccessToken'));
  const appSecret=!!(await getSecret('whatsappAppSecret'));
  return{
    ok:true,
    enabled:/^\d+$/.test(appId)&&/^\d+$/.test(configId),
    appId,
    configId,
    graphVersion:/^v\d+\.\d+$/.test(graphVersion)?graphVersion:'v23.0',
    accessTokenConfigured:access,
    appSecretConfigured:appSecret,
    connected:!!(saved.connectedAt&&saved.phoneNumberId),
    connectedAt:saved.connectedAt||'',
    wabaId:saved.wabaId||'',
    phoneNumberId:saved.phoneNumberId||notify.whatsappPhoneNumberId||'',
    displayPhoneNumber:saved.displayPhoneNumber||'',
    verifiedName:saved.verifiedName||'',
    mode:saved.mode||'coexistence',
    lastError:saved.lastError||''
  };
}
async function whatsapp430SaveConfig(body,user){
  body=body||{};
  const current=await settingValue('whatsapp_coexistence_config',{});
  const appId=String(body.appId===undefined?current.appId||process.env.WHATSAPP_META_APP_ID||'':body.appId||'').trim();
  const configId=String(body.configId===undefined?current.configId||process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID||'':body.configId||'').trim();
  if(appId&&!/^\d+$/.test(appId))throw new Error('Meta App ID inválido.');
  if(configId&&!/^\d+$/.test(configId))throw new Error('Embedded Signup Config ID inválido.');
  await saveSetting('whatsapp_coexistence_config',{...current,appId,configId,lastError:''},user);
  return whatsapp430ConfigView();
}
async function whatsapp430Start(user){
  const config=await whatsapp430ConfigView();
  if(!config.enabled)throw new Error('Configure o Meta App ID e o Embedded Signup Config ID antes de iniciar.');
  if(!config.appSecretConfigured)throw new Error('Configure primeiro o App Secret da Meta no painel WhatsApp Business.');
  const raw=crypto.randomBytes(32).toString('hex');
  const now=nowIso();
  await pool.query('DELETE FROM whatsapp_onboarding_states WHERE expires_at<$1 OR consumed_at IS NOT NULL',[now]);
  await pool.query('INSERT INTO whatsapp_onboarding_states(state_hash,username,created_at,expires_at,consumed_at) VALUES($1,$2,$3,$4,NULL)',[whatsapp430Hash(raw),user,now,new Date(Date.now()+10*60*1000).toISOString()]);
  return{ok:true,state:raw,config};
}
async function whatsapp430Graph(pathname,token,options){
  const config=await whatsapp430ConfigView();
  const headers={...(options?.headers||{}),authorization:'Bearer '+token,accept:'application/json'};
  if(options?.body!==undefined)headers['content-type']='application/json';
  return fetchJson('https://graph.facebook.com/'+config.graphVersion+'/'+pathname,{...(options||{}),headers},20000);
}
async function whatsapp430Complete(body,user){
  body=body||{};
  const rawState=String(body.state||'').trim();
  const stateHash=whatsapp430Hash(rawState);
  const stateRow=rawState?await one(pool,'SELECT * FROM whatsapp_onboarding_states WHERE state_hash=$1',[stateHash]):null;
  if(!stateRow||stateRow.username!==user||stateRow.consumed_at||new Date(stateRow.expires_at).getTime()<Date.now())throw new Error('O estado de conexão expirou. Inicie o QR Code novamente.');
  const code=String(body.code||'').trim().slice(0,2000);
  let accessToken=String(body.accessToken||'').trim();
  const config=await whatsapp430ConfigView();
  const session=whatsapp430Value(body.sessionInfo);
  const wabaId=whatsapp430Find(session,['waba_id','wabaId']);
  const phoneNumberId=whatsapp430Find(session,['phone_number_id','phoneNumberId']);
  if(!code&&!accessToken)throw new Error('A Meta não retornou o código de autorização.');
  if(code){
    const secret=await getSecret('whatsappAppSecret');
    if(!secret)throw new Error('App Secret da Meta não configurado.');
    const exchange='https://graph.facebook.com/'+config.graphVersion+'/oauth/access_token?client_id='+encodeURIComponent(config.appId)+'&client_secret='+encodeURIComponent(secret)+'&code='+encodeURIComponent(code);
    const exchanged=await fetchJson(exchange,{method:'GET',headers:{accept:'application/json'}},20000);
    accessToken=String(exchanged.access_token||'').trim();
  }
  if(!accessToken)throw new Error('A Meta não retornou um Access Token.');
  if(!/^\d+$/.test(wabaId)||!/^\d+$/.test(phoneNumberId))throw new Error('A Meta não retornou o WABA ID e o Phone Number ID. Feche e inicie novamente o QR Code oficial.');
  try{
    let phoneInfo={};
    try{phoneInfo=await whatsapp430Graph(phoneNumberId,accessToken,{method:'GET'})}catch{}
    let subscribeError='';
    try{await whatsapp430Graph(wabaId+'/subscribed_apps',accessToken,{method:'POST'})}catch(error){subscribeError=whatsapp430Error(error)}
    await setSecret('whatsappAccessToken',accessToken);
    const notify=await getNotifyConfig();
    const next=normalizeNotifyConfig({...notify,whatsappPhoneNumberId:phoneNumberId,whatsappGraphVersion:config.graphVersion});
    await saveSetting('notification_config',next,user);
    const current=await settingValue('whatsapp_coexistence_config',{});
    await saveSetting('whatsapp_coexistence_config',{
      ...current,
      appId:config.appId,
      configId:config.configId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber:String(phoneInfo.display_phone_number||'').slice(0,80),
      verifiedName:String(phoneInfo.verified_name||'').slice(0,180),
      mode:'coexistence',
      connectedAt:nowIso(),
      lastError:subscribeError
    },user);
    await pool.query('UPDATE whatsapp_onboarding_states SET consumed_at=$1 WHERE state_hash=$2',[nowIso(),stateHash]);
    return whatsapp430ConfigView();
  }catch(error){
    const current=await settingValue('whatsapp_coexistence_config',{});
    await saveSetting('whatsapp_coexistence_config',{...current,lastError:whatsapp430Error(error)},user);
    throw error;
  }
}
