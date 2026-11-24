'use strict';
(function(){
  const state={data:null,loading:false,showConfig:false};

  function role(){try{return roleRank(S.session?.user?.role||'')}catch{return 1}}
  function canOperate(){return role()>=3}
  function master(){try{return isMaster()}catch{return false}}
  function money367(v){try{return money(v)}catch{return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}}
  function date367(v){try{return day(v)}catch{return String(v||'').slice(0,10)||'—'}}
  function esc367(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function statusClass(s){s=String(s||'');return /Enviado/i.test(s)?'ok':/Falh/i.test(s)?'bad':/Cancel/i.test(s)?'':'warn'}
  function kindLabel(k){
    if(k==='due')return'Vence hoje';
    if(k==='paid')return'Pagamento confirmado';
    if(/^before_/.test(k))return String(k.split('_')[1]||'')+' dia(s) antes';
    if(/^overdue_/.test(k))return String(k.split('_')[1]||'')+' dia(s) em atraso';
    return k||'Aviso';
  }
  function channelLabel(c){return c==='whatsapp'?'WhatsApp':c==='telegram'?'Telegram':c}

  const oldBuildNav=buildNav;
  buildNav=function(){
    oldBuildNav();
    const nav2=$('nav2');
    if(nav2&&!document.querySelector('[data-sec="notifications"]')){
      nav2.insertAdjacentHTML('beforeend','<button data-sec="notifications" onclick="openSec(\'notifications\')"><span class="ico">🔔</span><span>Notificações</span><span id="badge_notifications" class="badge hidden"></span></button>');
    }
    markNav();
  };

  const oldRender=render;
  render=function(){
    if(S.active==='notifications'){renderNotifications367();return}
    oldRender();
  };

  function summaryCards(d){
    const s=d?.summary||{};
    return '<div class="grid kpis notif-kpis">'+
      kpi('Agendadas',s.pending||0,'aguardando envio')+
      kpi('Vencidas agora',s.due||0,'podem ser enviadas')+
      kpi('Enviadas',s.sent||0,'últimos registros')+
      kpi('Falhas',s.failed||0,'requerem atenção')+
      kpi('Contatos autorizados',s.consented||0,'cobrança habilitada')+
    '</div>';
  }

  function configHtml(d){
    if(!master())return'';
    const c=d?.config||{};
    const i=d?.integrations||{};
    return '<div class="card notif-config '+(state.showConfig?'':'hidden')+'" id="notifConfig367">'+
      '<div class="notif-config-head"><div><div class="eyebrow">CANAIS OFICIAIS</div><h3>WhatsApp Business + Telegram</h3><p class="help">Tokens ficam criptografados no servidor. O WhatsApp usa templates aprovados; o Telegram usa Bot API.</p></div>'+
      '<div class="actions"><span class="status '+(i.whatsappConfigured?'ok':'warn')+'">WhatsApp '+(i.whatsappConfigured?'configurado':'pendente')+'</span><span class="status '+(i.telegramConfigured?'ok':'warn')+'">Telegram '+(i.telegramConfigured?'configurado':'pendente')+'</span></div></div>'+
      '<div class="grid cols2">'+
        '<div class="notif-config-pane"><h3>WhatsApp Business Platform</h3>'+
          field367('n367_wa_phone','Phone Number ID',c.whatsappPhoneNumberId||'','Ex.: 123456789')+
          field367('n367_wa_version','Graph API version',c.whatsappGraphVersion||'','Ex.: v23.0')+
          field367('n367_wa_lang','Idioma do template',c.whatsappTemplateLanguage||'pt_BR','pt_BR')+
          secret367('n367_wa_token','Access Token','Deixe em branco para manter o token atual')+
          field367('n367_tpl_before','Template pré-vencimento',c.whatsappTemplateBefore||'','Nome aprovado na Meta')+
          field367('n367_tpl_due','Template vence hoje',c.whatsappTemplateDue||'','Nome aprovado na Meta')+
          field367('n367_tpl_overdue','Template em atraso',c.whatsappTemplateOverdue||'','Nome aprovado na Meta')+
          field367('n367_tpl_paid','Template pagamento confirmado',c.whatsappTemplatePaid||'','Opcional')+
        '</div>'+
        '<div class="notif-config-pane"><h3>Telegram Bot</h3>'+
          field367('n367_tg_user','Usuário do bot',c.telegramBotUsername||'','Ex.: ExeProBot')+
          secret367('n367_tg_token','Bot Token','Deixe em branco para manter o token atual')+
          '<div class="notice" style="margin-top:10px">O cliente precisa iniciar o bot uma vez. No Cliente 360 o EXE PRO gera o link de conexão e depois você usa “Sincronizar Telegram”.</div>'+
          '<h3 style="margin-top:18px">Régua de cobrança</h3>'+
          field367('n367_before','Dias antes do vencimento',(c.daysBefore||[5,1]).join(', '),'Ex.: 5, 1')+
          field367('n367_after','Dias após o vencimento',(c.daysAfter||[1,3]).join(', '),'Ex.: 1, 3')+
          number367('n367_hour','Horário padrão',c.defaultHour??9,7,20)+
          checkbox367('n367_due','Enviar no dia do vencimento',c.sendOnDue!==false)+
          checkbox367('n367_paid','Enviar confirmação de pagamento',!!c.sendPaidConfirmation)+
          checkbox367('n367_auto','Envio automático a cada 15 min',!!c.autoSend)+
        '</div>'+
      '</div>'+
      '<div class="actions" style="margin-top:14px"><button class="btn primary" onclick="saveNotificationConfig367()">Salvar integrações e régua</button><button class="btn" onclick="stateNotificationConfig367(false)">Fechar</button></div>'+
    '</div>';
  }

  function field367(id,label,value,ph){
    return '<div class="field"><label>'+label+'</label><input id="'+id+'" class="input" value="'+esc367(value)+'" placeholder="'+esc367(ph||'')+'"></div>';
  }
  function secret367(id,label,ph){
    return '<div class="field"><label>'+label+'</label><input id="'+id+'" class="input" type="password" autocomplete="new-password" placeholder="'+esc367(ph||'')+'"></div>';
  }
  function number367(id,label,value,min,max){
    return '<div class="field"><label>'+label+'</label><input id="'+id+'" class="input" type="number" min="'+min+'" max="'+max+'" value="'+esc367(value)+'"></div>';
  }
  function checkbox367(id,label,checked){
    return '<label class="notif-check"><input id="'+id+'" type="checkbox" '+(checked?'checked':'')+'> <span>'+label+'</span></label>';
  }

  function rowsHtml(d){
    const rows=d?.rows||[];
    if(!rows.length)return'<div class="card"><div class="empty">Nenhuma notificação planejada ainda.</div></div>';
    return '<div class="table-wrap"><table class="table notif-table"><thead><tr><th>Cliente / contato</th><th>Fatura</th><th>Canal</th><th>Tipo</th><th>Agendada</th><th>Status</th><th></th></tr></thead><tbody>'+
      rows.map(x=>{
        const lp=x.leadPayload||{},rp=x.receivablePayload||{};
        const phone=lp.whatsapp||lp.phone||'';
        return '<tr>'+
          '<td><b>'+esc367(lp.name||lp.companyName||x.leadId)+'</b><div class="tiny muted">'+esc367(phone||lp.email||'')+'</div></td>'+
          '<td><b>'+esc367(rp.description||'Cobrança')+'</b><div class="tiny muted">'+money367(rp.amount)+' · vence '+date367(rp.dueDate)+'</div></td>'+
          '<td><span class="notif-channel '+esc367(x.channel)+'">'+channelLabel(x.channel)+'</span></td>'+
          '<td>'+esc367(kindLabel(x.kind))+'</td>'+
          '<td>'+date367(x.scheduledAt)+'<div class="tiny muted">'+esc367(String(x.scheduledAt||'').slice(11,16))+'</div></td>'+
          '<td><span class="status '+statusClass(x.status)+'">'+esc367(x.status)+'</span>'+(x.errorText?'<div class="tiny notif-error">'+esc367(x.errorText)+'</div>':'')+'</td>'+
          '<td><div class="actions">'+
            (canOperate()&&/Pendente|Falhou/i.test(x.status)?'<button class="btn sm primary" onclick="sendNotification367(\''+esc367(x.notificationId)+'\')">Enviar</button>':'')+
            (canOperate()&&/Pendente|Falhou/i.test(x.status)?'<button class="btn sm" onclick="cancelNotification367(\''+esc367(x.notificationId)+'\')">Cancelar</button>':'')+
          '</div></td>'+
        '</tr>';
      }).join('')+
    '</tbody></table></div>';
  }

  async function loadNotifications367(force=false){
    if(state.loading)return;
    if(state.data&&!force)return;
    state.loading=true;
    try{state.data=await api('/api/web/notifications?limit=250')}
    catch(e){toast(e.message,6000)}
    finally{state.loading=false;if(S.active==='notifications')renderNotifications367()}
  }

  function renderNotifications367(){
    if(!state.data&&!state.loading){setTimeout(()=>loadNotifications367(true),0)}
    const d=state.data;
    const actions=(canOperate()?'<button class="btn primary" onclick="planNotifications367()">⚡ Planejar lembretes</button><button class="btn" onclick="sendDueNotifications367()">➤ Enviar vencidos agora</button><button class="btn" onclick="syncTelegram367()">✈ Sincronizar Telegram</button>':'')+
      (master()?'<button class="btn" onclick="stateNotificationConfig367(true)">⚙ Configurar canais</button>':'')+
      '<button class="btn" onclick="loadNotifications367(true)">↻ Atualizar</button>';
    $('content').innerHTML=
      head('MENSAGENS & COBRANÇAS','Central de Notificações','WhatsApp Business e Telegram para clientes/contatos autorizados, com histórico e proteção contra duplicidade.',actions)+
      (d?summaryCards(d):'<div class="card"><div class="empty">Carregando notificações...</div></div>')+
      (d?configHtml(d):'')+
      '<div class="notice notif-consent-note">Somente contatos com autorização registrada recebem cobrança. A prospecção continua sem disparos automáticos.</div>'+
      (d?rowsHtml(d):'');
    updateNotifBadge367();
  }

  function updateNotifBadge367(){
    const b=$('badge_notifications'),n=Number(state.data?.summary?.due||0)+Number(state.data?.summary?.failed||0);
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }

  window.stateNotificationConfig367=function(v){state.showConfig=!!v;renderNotifications367()};
  window.loadNotifications367=loadNotifications367;

  window.saveNotificationConfig367=async function(){
    try{
      const body={
        whatsappPhoneNumberId:$('n367_wa_phone').value.trim(),
        whatsappGraphVersion:$('n367_wa_version').value.trim(),
        whatsappTemplateLanguage:$('n367_wa_lang').value.trim()||'pt_BR',
        whatsappTemplateBefore:$('n367_tpl_before').value.trim(),
        whatsappTemplateDue:$('n367_tpl_due').value.trim(),
        whatsappTemplateOverdue:$('n367_tpl_overdue').value.trim(),
        whatsappTemplatePaid:$('n367_tpl_paid').value.trim(),
        telegramBotUsername:$('n367_tg_user').value.trim().replace(/^@/,''),
        whatsappAccessToken:$('n367_wa_token').value,
        telegramBotToken:$('n367_tg_token').value,
        daysBefore:parseDays367($('n367_before').value),
        daysAfter:parseDays367($('n367_after').value),
        defaultHour:Number($('n367_hour').value||9),
        sendOnDue:$('n367_due').checked,
        sendPaidConfirmation:$('n367_paid').checked,
        autoSend:$('n367_auto').checked
      };
      state.data=await api('/api/web/notification-config',{method:'PATCH',body:JSON.stringify(body)});
      state.showConfig=false;toast('Canais e régua de cobrança atualizados.');renderNotifications367();
    }catch(e){toast(e.message,7000)}
  };

  function parseDays367(v){return [...new Set(String(v||'').split(/[,; ]+/).map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=60))].sort((a,b)=>b-a)}

  window.planNotifications367=async function(){
    if(!confirm('Planejar lembretes de cobrança para os contatos autorizados?'))return;
    try{const j=await api('/api/web/notifications/plan',{method:'POST',body:'{}'});toast('Planejamento concluído: '+(j.created||0)+' nova(s) notificação(ões).');state.data=null;await loadNotifications367(true)}catch(e){toast(e.message,7000)}
  };
  window.sendDueNotifications367=async function(){
    if(!confirm('Enviar agora as notificações vencidas/pedentes pelos canais configurados?'))return;
    try{const j=await api('/api/web/notifications/send',{method:'POST',body:JSON.stringify({dueOnly:true})});toast('Envio: '+(j.sent||0)+' enviada(s), '+(j.failed||0)+' falha(s).',6500);state.data=null;await loadNotifications367(true)}catch(e){toast(e.message,7000)}
  };
  window.sendNotification367=async function(id){
    try{const j=await api('/api/web/notifications/send',{method:'POST',body:JSON.stringify({notificationId:id})});toast(j.sent?'Notificação enviada.':'Envio não concluído.');state.data=null;await loadNotifications367(true)}catch(e){toast(e.message,7000)}
  };
  window.cancelNotification367=async function(id){
    if(!confirm('Cancelar esta notificação?'))return;
    try{await api('/api/web/notifications/cancel',{method:'POST',body:JSON.stringify({notificationId:id})});toast('Notificação cancelada.');state.data=null;await loadNotifications367(true)}catch(e){toast(e.message,6000)}
  };
  window.syncTelegram367=async function(){
    try{const j=await api('/api/web/telegram/sync',{method:'POST',body:'{}'});toast('Telegram: '+(j.linked||0)+' contato(s) vinculado(s).');state.data=null;await refreshAll(false,true);await loadNotifications367(true)}catch(e){toast(e.message,7000)}
  };

  const oldShowEntityModal=showEntityModal;
  showEntityModal=function(r){
    oldShowEntityModal(r);
    if(r?.entityType!=='lead')return;
    setTimeout(()=>injectBillingPrefs367(r),0);
  };

  function injectBillingPrefs367(r){
    const body=$('modalBody');if(!body||$('billingPrefs367'))return;
    const x=r.payload||{},enabled=!!x.billingNotificationsEnabled;
    const bot=state.data?.config?.telegramBotUsername||'';
    const telegramLink=bot?('https://t.me/'+encodeURIComponent(bot)+'?start=exe_'+encodeURIComponent(r.entityId)):'';
    const html='<div id="billingPrefs367" class="card billing-prefs367">'+
      '<div class="billing-pref-head"><div><div class="eyebrow">NOTIFICAÇÕES FINANCEIRAS</div><h3>WhatsApp / Telegram</h3><p class="help">Ative somente quando o cliente ou contato tiver autorizado receber avisos de cobrança.</p></div>'+
      '<span class="status '+(enabled?'ok':'')+'">'+(enabled?'Autorizado':'Desativado')+'</span></div>'+
      '<div class="notif-pref-grid">'+
        checkbox367('bp367_enabled','Autoriza notificações de cobrança',enabled)+
        checkbox367('bp367_wa','WhatsApp',x.notifyWhatsApp!==false)+
        checkbox367('bp367_tg','Telegram',!!x.notifyTelegram)+
      '</div>'+
      '<div class="grid cols2" style="margin-top:10px"><div><div class="tiny muted">Consentimento</div><b>'+esc367(x.notificationConsentAt?date367(x.notificationConsentAt):'Não registrado')+'</b></div><div><div class="tiny muted">Telegram</div><b>'+esc367(x.telegramChatId?'Conectado · chat '+x.telegramChatId:'Ainda não conectado')+'</b></div></div>'+
      '<div class="actions" style="margin-top:12px"><button class="btn primary" onclick="saveBillingPrefs367(\''+esc367(r.entityId)+'\')">Salvar preferências</button>'+
      (telegramLink?'<a class="btn" target="_blank" rel="noopener" href="'+telegramLink+'">✈ Link para conectar Telegram</a>':'<button class="btn" onclick="openSec(\'notifications\');stateNotificationConfig367(true);closeModal()">Configurar Telegram</button>')+
      '</div></div>';
    body.insertAdjacentHTML('beforeend',html);
  }

  window.saveBillingPrefs367=async function(id){
    try{
      const r=rows('lead').find(x=>x.entityId===id);if(!r)throw new Error('Lead não encontrado.');
      const enabled=$('bp367_enabled').checked;
      const patch={
        billingNotificationsEnabled:enabled,
        notifyWhatsApp:$('bp367_wa').checked,
        notifyTelegram:$('bp367_tg').checked,
        notificationConsentAt:enabled?(r.payload?.notificationConsentAt||new Date().toISOString()):'',
        notificationConsentSource:enabled?'EXE PRO Cloud':'',
        notificationPreferenceUpdatedAt:new Date().toISOString()
      };
      await patchEntity(r,patch);await refreshAll(false,true);toast('Preferências de notificação salvas.');closeModal();
    }catch(e){toast(e.message,6500)}
  };

  const oldRenderFinance=renderFinance;
  renderFinance=function(){
    const html=oldRenderFinance();
    return html.replace('<div class="section-head"', '<div class="section-head"').replace('</div><div class="grid kpis">','<button class="btn" style="margin-left:8px" onclick="openSec(\'notifications\')">🔔 Notificações</button></div><div class="grid kpis">');
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{buildNav()}catch{}},300));
  setTimeout(()=>{if(S?.session)loadNotifications367(true)},1800);
})();
