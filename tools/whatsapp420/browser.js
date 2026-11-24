'use strict';
(function(){
  const W420={data:null,loading:false,showConfig:false,selectedId:''};
  function role420(){try{return roleRank(S.session?.user?.role||'')}catch{return 1}}
  function canWrite420(){return role420()>=3}
  function master420(){try{return isMaster()}catch{return false}}
  function esc420(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function enc420(v){return encodeURIComponent(String(v||''))}
  function dec420(v){try{return decodeURIComponent(String(v||''))}catch{return''}}
  function date420(v){if(!v)return'—';try{return new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}catch{return String(v).slice(0,16)}}
  function status420(v){const s=String(v||'');return /Failed|Falhou/i.test(s)?'bad':/Sent|Delivered|Read|Enviado/i.test(s)?'ok':'warn'}
  function failedCount420(messages){return(messages||[]).filter(m=>String(m?.status||'').trim().toLowerCase()==='failed').length}
  function api420Url(){return W420.selectedId?'/api/web/whatsapp/conversations?limit=100&conversationId='+enc420(W420.selectedId):'/api/web/whatsapp/conversations?limit=100'}
  function empty420(text){return'<div class="wa420-empty">'+esc420(text)+'</div>'}
  const oldBuildNav=buildNav;
  buildNav=function(){
    oldBuildNav();
    const nav2=$('nav2');
    if(nav2&&!document.querySelector('[data-sec="whatsappBusiness"]')){
      nav2.insertAdjacentHTML('beforeend','<button data-sec="whatsappBusiness" onclick="openSec(\'whatsappBusiness\')"><span class="ico">💬</span><span>WhatsApp Business</span><span id="badge_whatsapp_business" class="badge hidden"></span></button>');
    }
    try{markNav()}catch{}
  };
  const oldRender=render;
  render=function(){
    if(S.active==='whatsappBusiness'){render420();return}
    oldRender();
  };
  function field420(id,label,value,placeholder,type){
    return'<div class="field"><label>'+label+'</label><input id="'+id+'" class="input" type="'+(type||'text')+'" value="'+esc420(value||'')+'" placeholder="'+esc420(placeholder||'')+'"></div>';
  }
  function config420(d){
    if(!W420.showConfig||!master420())return'';
    const c=d?.config||{};
    return'<div class="card wa420-config">'+
      '<div class="wa420-config-head"><div><div class="eyebrow">CONEXÃO OFICIAL</div><h3>WhatsApp Business Platform</h3><p class="wa420-help">O EXE PRO usa a API oficial da Meta. Não usa QR Code nem clona o WhatsApp pessoal.</p></div></div>'+
      '<div class="wa420-config-grid">'+
        field420('wa420_phone','Phone Number ID',c.phoneNumberId||'','Ex.: 123456789')+
        field420('wa420_graph','Graph API version',c.graphVersion||'v23.0','Ex.: v23.0')+
        field420('wa420_token','Access Token', '',c.accessTokenConfigured?'Já configurado; deixe vazio para manter':'Cole o token da Meta','password')+
        field420('wa420_verify','Verify Token do webhook','',c.verifyTokenConfigured?'Já configurado; deixe vazio para manter':'Crie um token forte','password')+
        field420('wa420_app','App Secret da Meta','',c.appSecretConfigured?'Já configurado; deixe vazio para manter':'Cole o App Secret','password')+
      '</div>'+
      '<div class="wa420-field"><div class="tiny muted">URL para cadastrar no painel da Meta</div><div class="wa420-webhook">'+esc420(c.webhookUrl||'/api/whatsapp/webhook')+'</div><p class="wa420-help">Depois de salvar, configure o webhook da Meta com essa URL e o mesmo Verify Token. Inscreva o campo messages.</p></div>'+
      '<div class="actions" style="margin-top:14px"><button class="btn primary" onclick="saveWhatsApp420Config()">Salvar conexão</button><button class="btn" onclick="toggleWhatsApp420Config(false)">Fechar</button></div>'+
    '</div>';
  }
  function statusBanner420(d){
    const c=d?.config||{};
    if(c.configured&&c.webhookReady)return'<div class="card wa420-banner"><h3>WhatsApp Business conectado</h3><p>Envio pela API oficial e recebimento por webhook estão habilitados.</p></div>';
    return'<div class="card wa420-banner warn"><h3>Conexão pendente</h3><p>Configure as credenciais da Meta e o webhook para ativar o envio e receber novas mensagens.</p></div>';
  }
  function start420(){
    return'<div class="wa420-start"><div class="eyebrow">NOVA CONVERSA</div><div class="grid cols2">'+
      '<div class="field"><label>NÚMERO COM DDD E PAÍS</label><input id="wa420_new_phone" class="input" placeholder="5511999999999"></div>'+
      '<div class="field"><label>NOME (OPCIONAL)</label><input id="wa420_new_name" class="input" placeholder="Nome do contato"></div>'+
    '</div><div class="actions" style="margin-top:10px"><button class="btn primary" onclick="createWhatsApp420()">Abrir conversa</button></div></div>';
  }
  function list420(d){
    const rows=d?.conversations||[];
    return'<div class="card wa420-list"><div class="wa420-list-head"><div><div class="eyebrow">CONVERSAS</div><h3>'+String(rows.length)+' conversa(s)</h3></div><button class="btn sm" onclick="loadWhatsApp420(true)">↻</button></div>'+
      (canWrite420()?start420():'')+
      '<div class="wa420-conversation">'+(rows.length?rows.map(x=>{
        const active=x.conversationId===W420.selectedId?' active':'';
        const unread=x.unreadCount?'<span class="wa420-unread">'+x.unreadCount+'</span>':'';
        return'<button class="wa420-row'+active+'" onclick="selectWhatsApp420(\''+enc420(x.conversationId)+'\')"><div class="wa420-row-top"><b>'+esc420(x.contactName||x.phoneNumber)+'</b><span class="tiny muted">'+esc420(date420(x.lastMessageAt))+'</span></div><div class="tiny muted">'+esc420(x.phoneNumber)+'</div><div class="wa420-row-preview">'+esc420(x.lastMessageBody||'Sem mensagens ainda')+' '+unread+'</div></button>';
      }).join(''):empty420('Nenhuma conversa recebida ainda.'))+'</div></div>';
  }
  function chat420(d){
    const x=d?.selected;
    if(!x)return'<div class="card wa420-chat">'+empty420('Selecione uma conversa ou abra uma nova conversa.')+'</div>';
    const msgs=x.messages||[];
    const failed=failedCount420(msgs);
    const cleanup=canWrite420()&&failed?'<button class="btn sm" onclick="clearFailedWhatsApp420()">Limpar falhas ('+failed+')</button>':'';
    const compose=canWrite420()?'<div class="wa420-compose"><textarea id="wa420_text" class="input" maxlength="4096" placeholder="Digite a mensagem..."></textarea><button class="btn primary" onclick="sendWhatsApp420()">Enviar</button></div><p class="wa420-help">Mensagens livres dependem da janela de atendimento da Meta. Fora dela, use um template aprovado em Notificações.</p>':'';
    return'<div class="card wa420-chat"><div class="wa420-chat-head"><div><div class="eyebrow">CONVERSA</div><h3>'+esc420(x.contactName||x.phoneNumber)+'</h3><div class="tiny muted">'+esc420(x.phoneNumber)+(x.leadId?' · Lead vinculado':'')+'</div></div>'+cleanup+'<span class="status '+status420(x.status)+'">'+esc420(x.status)+'</span></div>'+
      '<div class="wa420-chat-body">'+(msgs.length?msgs.map(m=>'<div class="wa420-bubble '+(m.direction==='outbound'?'outbound':'')+'"><div>'+esc420(m.body)+'</div><div class="wa420-bubble-meta">'+esc420(m.direction==='outbound'?'Você':'Contato')+' · '+esc420(date420(m.createdAt))+' · '+esc420(m.status)+(m.errorText?' · '+esc420(m.errorText):'')+'</div></div>').join(''):empty420('Nenhuma mensagem nesta conversa.'))+'</div>'+
      compose+'</div>';
  }
  function render420(){
    const d=W420.data;
    const s=d?.summary||{};
    const actions=(master420()?'<button class="btn" onclick="toggleWhatsApp420Config(true)">⚙ Configurar conexão</button>':'')+'<button class="btn" onclick="loadWhatsApp420(true)">↻ Atualizar</button>';
    $('content').innerHTML=head('WHATSAPP BUSINESS','Central de Conversas','Envie e receba mensagens dentro do EXE PRO pela API oficial da Meta.',actions)+
      (d?statusBanner420(d):'<div class="card"><div class="empty">Carregando WhatsApp Business...</div></div>')+
      (d?config420(d):'')+
      '<div class="grid kpis wa420-kpis">'+kpi('Conversas',s.conversations||0,'histórico local')+kpi('Não lidas',s.unread||0,'aguardando atendimento')+kpi('Webhook',d?.config?.webhookReady?'OK':'Pendente','recebimento oficial')+'</div>'+
      '<div class="notice wa420-note">Esta Central usa o número Business configurado na Meta. O WhatsApp pessoal com QR Code continua separado no botão WhatsApp Web.</div>'+
      '<div class="wa420-layout">'+(d?list420(d):'<div></div>')+(d?chat420(d):'<div></div>')+'</div>';
    const b=$('badge_whatsapp_business'),n=Number(s.unread||0);
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }
  window.toggleWhatsApp420Config=function(value){W420.showConfig=!!value;render420()};
  window.loadWhatsApp420=async function(force){
    if(W420.loading)return;
    if(W420.data&&!force)return;
    W420.loading=true;
    try{W420.data=await api(api420Url());if(!W420.selectedId&&W420.data.selected)W420.selectedId=W420.data.selected.conversationId}
    catch(e){toast(e.message,7000)}
    finally{W420.loading=false;if(S.active==='whatsappBusiness')render420()}
  };
  window.selectWhatsApp420=async function(encoded){
    W420.selectedId=dec420(encoded);
    try{await api('/api/web/whatsapp/read',{method:'POST',body:JSON.stringify({conversationId:W420.selectedId})})}catch{}
    W420.data=null;await loadWhatsApp420(true);
  };
  window.createWhatsApp420=async function(){
    try{
      const phone=$('wa420_new_phone')?.value.trim(),name=$('wa420_new_name')?.value.trim();
      const j=await api('/api/web/whatsapp/conversations',{method:'POST',body:JSON.stringify({phoneNumber:phone,contactName:name})});
      W420.selectedId=j.conversation.conversationId;W420.data=null;await loadWhatsApp420(true);toast('Conversa aberta.');
    }catch(e){toast(e.message,7000)}
  };
  window.sendWhatsApp420=async function(){
    try{
      const box=$('wa420_text'),text420=box?.value.trim();if(!text420)return toast('Digite uma mensagem.');
      const j=await api('/api/web/whatsapp/messages',{method:'POST',body:JSON.stringify({conversationId:W420.selectedId,text:text420})});
      W420.selectedId=j.conversationId;W420.data=null;await loadWhatsApp420(true);toast('Mensagem enviada.');
    }catch(e){toast(e.message,8000)}
  };
  window.clearFailedWhatsApp420=async function(){
    const count=failedCount420(W420.data?.selected?.messages||[]);
    if(!W420.selectedId||!count)return toast('Não há mensagens com falha nesta conversa.');
    if(!window.confirm('Apagar somente '+count+' mensagem(ns) com falha desta conversa?'))return;
    try{
      const j=await api('/api/web/whatsapp/clear-failed',{method:'POST',body:JSON.stringify({conversationId:W420.selectedId})});
      W420.data=null;await loadWhatsApp420(true);
      toast((Number(j.deleted)||0)+' mensagem(ns) com falha apagada(s).');
    }catch(e){toast(e.message,8000)}
  };
  window.saveWhatsApp420Config=async function(){
    try{
      const j=await api('/api/web/whatsapp/config',{method:'PATCH',body:JSON.stringify({
        phoneNumberId:$('wa420_phone').value.trim(),
        graphVersion:$('wa420_graph').value.trim(),
        accessToken:$('wa420_token').value,
        verifyToken:$('wa420_verify').value,
        appSecret:$('wa420_app').value
      })});
      W420.showConfig=false;W420.data=null;await loadWhatsApp420(true);toast(j.config.configured?'Conexão do WhatsApp Business salva.':'Configuração salva; faltam credenciais para ativar.');
    }catch(e){toast(e.message,8000)}
  };
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{buildNav()}catch{};if(S?.session)loadWhatsApp420(true)},500));
})();