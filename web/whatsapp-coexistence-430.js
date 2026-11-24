'use strict';
(function(){
  const W430={data:null,loading:false,state:'',sessionInfo:null,sdkPromise:null};
  function esc430(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function master430(){try{return isMaster()}catch{return false}}
  function api430(path,options){return api(path,options)}
  function field430(id,label,value,placeholder){
    return'<div class="field"><label>'+esc430(label)+'</label><input id="'+id+'" class="input" value="'+esc430(value||'')+'" placeholder="'+esc430(placeholder||'')+'"></div>';
  }
  function statusText430(c){
    if(c?.connected)return'<div class="wa430-status ok"><b>Conectado por Coexistência oficial.</b><div class="wa430-detail">'+esc430(c.displayPhoneNumber||c.phoneNumberId||'Número Business conectado')+'</div></div>';
    if(c?.lastError)return'<div class="wa430-status warn"><b>Última tentativa não concluída.</b><div class="wa430-detail">'+esc430(c.lastError)+'</div></div>';
    if(c?.enabled)return'<div class="wa430-status warn"><b>Pronto para conectar.</b><div class="wa430-detail">A Meta abrirá o fluxo oficial e exibirá o QR Code para leitura no WhatsApp Business.</div></div>';
    return'<div class="wa430-status warn"><b>Configuração pendente.</b><div class="wa430-detail">Informe o Meta App ID e o Embedded Signup Config ID para habilitar o QR Code oficial.</div></div>';
  }
  function render430Card(){
    const host=$('content');if(!host||S.active!=='whatsappBusiness')return;
    const c=W430.data||{};
    const cfg=c.config||c;
    let html='<div class="card wa430-card"><div class="wa430-eyebrow">CONEXÃO OFICIAL POR QR CODE</div><h3>WhatsApp Business — Coexistência</h3><p>Conecte seu número Business existente ao EXE PRO sem substituir o aplicativo WhatsApp Business do celular.</p>'+statusText430(cfg);
    if(master430()){
      html+='<div class="wa430-grid">'+
        field430('wa430_app_id','Meta App ID',cfg.appId||'','Ex.: 123456789012345')+
        field430('wa430_config_id','Embedded Signup Config ID',cfg.configId||'','Ex.: 987654321098765')+
      '</div>'+
      '<p class="wa430-help">Esses dois identificadores não são tokens. O App Secret permanece no campo protegido da configuração oficial.</p>'+
      '<div class="wa430-actions">'+
        '<button class="btn" onclick="saveWhatsApp430Config()">Salvar configuração QR</button>'+
        '<button class="btn primary" onclick="startWhatsApp430()">Conectar por QR Code oficial</button>'+
      '</div>';
    }
    html+='<p class="wa430-help">O QR Code será exibido pela Meta durante o Embedded Signup. Não é o QR Code do WhatsApp Web pessoal.</p></div>';
    const old=host.querySelector('.wa430-card');if(old)old.outerHTML=html;else host.insertAdjacentHTML('afterbegin',html);
  }
  async function loadMetaSdk430(appId,version){
    if(window.FB){try{window.FB.init({appId,autoLogAppEvents:false,xfbml:false,version:version||'v23.0'})}catch{};return window.FB}
    if(W430.sdkPromise)return W430.sdkPromise;
    W430.sdkPromise=new Promise((resolve,reject)=>{
      const previous=window.fbAsyncInit;
      window.fbAsyncInit=function(){try{window.FB.init({appId,autoLogAppEvents:false,xfbml:false,version:version||'v23.0'});resolve(window.FB)}catch(error){reject(error)}finally{if(previous)try{previous()}catch{}}};
      const script=document.createElement('script');
      script.async=true;script.defer=true;script.crossOrigin='anonymous';script.src='https://connect.facebook.net/pt_BR/sdk.js';
      script.onload=()=>setTimeout(()=>{if(!window.FB)reject(new Error('SDK da Meta não carregou.'))},5000);
      script.onerror=()=>reject(new Error('Não foi possível carregar o SDK da Meta.'));
      document.head.appendChild(script);
    });
    return W430.sdkPromise;
  }
  function parse430(value){
    if(value&&typeof value==='object')return value;
    if(typeof value==='string'){try{return JSON.parse(value)||{}}catch{}}
    return{};
  }
  function find430(root,keys){
    const wanted=new Set(keys),queue=[parse430(root)],seen=new Set();
    while(queue.length){
      const item=queue.shift();if(!item||typeof item!=='object'||seen.has(item))continue;seen.add(item);
      for(const key of wanted){if(item[key]!==undefined&&item[key]!==null&&String(item[key]).trim())return String(item[key]).trim()}
      for(const value of Object.values(item))if(value&&typeof value==='object')queue.push(value);
    }
    return'';
  }
  function capture430(event){
    if(event.origin!=='https://www.facebook.com'&&event.origin!=='https://web.facebook.com')return;
    const data=parse430(event.data);
    if(data.type!=='WA_EMBEDDED_SIGNUP')return;
    W430.sessionInfo=data.data||data;
    render430Card();
  }
  if(!window.__wa430MessageListener){window.__wa430MessageListener=true;window.addEventListener('message',capture430)}
  async function prepare430(){
    if(!W430.data?.config?.enabled||!master430())return;
    try{
      const start=await api430('/api/web/whatsapp/coexistence/start',{method:'POST',body:'{}'});
      W430.state=start.state||'';
      await loadMetaSdk430(W430.data.config.appId,W430.data.config.graphVersion);
    }catch(error){W430.prepareError=error.message||String(error)}
  }
  window.loadWhatsApp430=async function(force){
    if(W430.loading)return;
    if(W430.data&&!force){render430Card();return}
    W430.loading=true;
    try{W430.data=await api430('/api/web/whatsapp/coexistence/config');await prepare430()}
    catch(error){W430.data={config:{lastError:error.message||String(error)}}}
    finally{W430.loading=false;render430Card()}
  };
  window.saveWhatsApp430Config=async function(){
    try{
      const appId=$('wa430_app_id')?.value.trim(),configId=$('wa430_config_id')?.value.trim();
      const result=await api430('/api/web/whatsapp/coexistence/config',{method:'PATCH',body:JSON.stringify({appId,configId})});
      W430.data=result;await prepare430();render430Card();toast('Configuração do QR Code oficial salva.');
    }catch(error){toast(error.message||String(error),8000)}
  };
  window.startWhatsApp430=async function(){
    try{
      if(!W430.data)await loadWhatsApp430(true);
      const cfg=W430.data?.config||W430.data;
      if(!cfg?.enabled)throw new Error('Salve primeiro o Meta App ID e o Embedded Signup Config ID.');
      if(!W430.state){
        const start=await api430('/api/web/whatsapp/coexistence/start',{method:'POST',body:'{}'});
        W430.state=start.state||'';
      }
      const fb=await loadMetaSdk430(cfg.appId,cfg.graphVersion);
      if(!fb?.login)throw new Error('SDK da Meta não está disponível.');
      W430.sessionInfo=null;
      fb.login(function(response){
        (async function(){
          try{
          const code=response?.authResponse?.code||'';
          const accessToken=response?.authResponse?.accessToken||'';
          if(!code&&!accessToken)throw new Error('A autorização do WhatsApp Business foi cancelada ou não retornou código.');
          const result=await api430('/api/web/whatsapp/coexistence/complete',{method:'POST',body:JSON.stringify({state:W430.state,code,accessToken,sessionInfo:W430.sessionInfo})});
          W430.data=result;W430.state='';toast('WhatsApp Business conectado por QR Code oficial.');render430Card();
          }catch(error){toast(error.message||String(error),10000);W430.data={config:{lastError:error.message||String(error)}};render430Card()}
        })();
      },{
        config_id:cfg.configId,
        response_type:'code',
        override_default_response_type:true,
        extras:{
          setup:{},
          featureType:'whatsapp_business_app_onboarding',
          sessionInfoVersion:'3'
        }
      });
    }catch(error){toast(error.message||String(error),9000)}
  };
  const oldRender430=render;
  render=function(){
    oldRender430();
    if(S.active==='whatsappBusiness')setTimeout(render430Card,0);
  };
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{if(S?.session)loadWhatsApp430(true)}catch{}},700));
})();