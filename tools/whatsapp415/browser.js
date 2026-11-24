'use strict';
(function(){
  var MARK='EXE_PRO_415_WHATSAPP_WEB';
  var WEB_BASE='https://web.whatsapp.com/';
  var installedKey='__exeProWhatsapp415Installed';

  if(window[installedKey])return;
  window[installedKey]=true;

  function cleanPhone(value){
    var raw=String(value||'').trim();
    if(!raw)return'';
    var digits=raw.replace(/\D+/g,'');
    if(digits.indexOf('00')===0)digits=digits.slice(2);
    if(digits.length===10||digits.length===11)digits='55'+digits;
    if(digits.length<8||digits.length>15)return'';
    return digits;
  }

  function leadById(id){
    try{
      var list=typeof payloads==='function'?payloads('lead'):[];
      return list.find(function(x){return String(x.id||'')===String(id)})||null;
    }catch(e){return null}
  }

  function notify(message){
    try{
      if(typeof toast==='function')toast(message,5200);
    }catch(e){}
  }

  function messageForLead(lead){
    var box=document.getElementById('convMsg');
    if(box&&String(box.value||'').trim())return box.value;
    try{
      if(typeof messageFor==='function')return messageFor(lead);
    }catch(e){}
    return'';
  }

  function openWhatsApp(phone,message){
    var digits=cleanPhone(phone);
    if(!digits){
      notify('Este contato não possui um número de WhatsApp válido.');
      return false;
    }
    var url=WEB_BASE+'send?phone='+encodeURIComponent(digits)+'&text='+encodeURIComponent(String(message||''));
    var popup=window.open(url,'_blank','noopener,noreferrer');
    if(!popup){
      try{
        if(navigator.clipboard&&message)navigator.clipboard.writeText(String(message));
      }catch(e){}
      notify('A nova aba foi bloqueada. Permita pop-ups para abrir o WhatsApp Web.');
      return false;
    }
    notify('WhatsApp Web aberto. Confira a conversa e clique em “Enviar”.');
    return true;
  }

  function openLead(id){
    var lead=leadById(id);
    if(!lead){
      notify('Não foi possível localizar este contato no CRM.');
      return false;
    }
    return openWhatsApp(lead.whatsapp||lead.phone,messageForLead(lead));
  }

  function openWhatsAppHome(){
    var popup=window.open(WEB_BASE,'_blank','noopener,noreferrer');
    if(!popup){
      notify('A nova aba foi bloqueada. Permita pop-ups para abrir o WhatsApp Web.');
      return false;
    }
    notify('WhatsApp Web aberto. Se necessário, escaneie o QR Code com o seu número atual.');
    return true;
  }

  function openFallback(){
    var selected='';
    try{selected=typeof S!=='undefined'?String(S.convLead||''):''}catch(e){}
    var lead=selected?leadById(selected):null;
    if(!lead){
      notify('Selecione um contato antes de usar o link alternativo.');
      return false;
    }
    var digits=cleanPhone(lead.whatsapp||lead.phone);
    if(!digits){
      notify('Este contato não possui um número de WhatsApp válido.');
      return false;
    }
    var url='https://wa.me/'+encodeURIComponent(digits)+'?text='+encodeURIComponent(messageForLead(lead));
    window.open(url,'_blank','noopener,noreferrer');
    notify('Link alternativo do WhatsApp aberto.');
    return true;
  }

  function clickHandler(event){
    var node=event.target&&event.target.closest?event.target.closest('button,a'):null;
    if(!node)return;

    var onclick=String(node.getAttribute('onclick')||'');
    var match=/openWaLead\(\s*['"]([^'"]+)['"]\s*\)/.exec(onclick);
    if(match){
      event.preventDefault();
      event.stopImmediatePropagation();
      openLead(match[1]);
      return;
    }

    var action=node.getAttribute('data-exe-whatsapp-web');
    if(action==='open'){
      event.preventDefault();
      event.stopImmediatePropagation();
      openWhatsAppHome();
      return;
    }
    if(action==='fallback'){
      event.preventDefault();
      event.stopImmediatePropagation();
      openFallback();
    }
  }

  function injectBanner(){
    var layout=document.querySelector('.conversation-layout');
    if(!layout||document.querySelector('[data-exe-whatsapp-web-banner]'))return;

    var banner=document.createElement('div');
    banner.className='card whatsapp-web-415-banner';
    banner.setAttribute('data-exe-whatsapp-web-banner','1');
    banner.innerHTML=
      '<div class="eyebrow">WHATSAPP WEB</div>'+
      '<h3>Seu WhatsApp atual</h3>'+
      '<p class="help">Use o número que já está conectado no WhatsApp Web. Se necessário, escaneie o QR Code na aba aberta.</p>'+
      '<div class="actions">'+
        '<button class="btn primary" type="button" data-exe-whatsapp-web="open">Abrir WhatsApp Web</button>'+
        '<button class="btn" type="button" data-exe-whatsapp-web="fallback">Link alternativo</button>'+
        '<span class="tiny muted">O envio é confirmado por você no WhatsApp.</span>'+
      '</div>';
    layout.parentNode.insertBefore(banner,layout);
  }

  function install(){
    document.addEventListener('click',clickHandler,true);
    var root=document.getElementById('content');
    if(!root){
      setTimeout(install,180);
      return;
    }
    var observer=new MutationObserver(function(){injectBanner()});
    observer.observe(root,{childList:true,subtree:true});
    injectBanner();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();

  window.EXE_PRO_415_WHATSAPP_WEB=MARK;
})();
