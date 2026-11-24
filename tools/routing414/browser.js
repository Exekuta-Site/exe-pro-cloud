'use strict';
(function(){
  var VERSION='4.1.4';
  var STATE_PREFIX='exe-pro-route-state:'+VERSION+':';
  var ROUTES=[
    {path:'/dashboard',sections:['dashboard','home','inicio'],labels:['dashboard','inicio']},
    {path:'/clientes',sections:['clients','clientes','client','customers'],labels:['clientes','clients']},
    {path:'/sites-wordpress',sections:['wordpress','sites-wordpress'],labels:['siteswordpress','wordpress']},
    {path:'/financeiro',sections:['finance','finances','financeiro','billing','billing384'],labels:['financeiro','billing']},
    {path:'/projetos',sections:['projects','projetos','project'],labels:['projetos','projects']},
    {path:'/seo',sections:['seoreports','seo','seo-reports'],labels:['seo']},
    {path:'/configuracoes',sections:['settings','config','configuracoes','configuration'],labels:['configuracoes','settings']},
    {path:'/tarefas',sections:['tasks391','tasks','tarefas'],labels:['tarefas','sla']},
    {path:'/notificacoes',sections:['notifications','notificacoes'],labels:['notificacoes']},
    {path:'/saude-core',sections:['core390','core','saude-core'],labels:['saudedocore','core']}
  ];
  var DEFAULT_ROUTE={path:'/',sections:['dashboard','home','inicio'],labels:['dashboard','inicio']};
  var originalOpenSec=null;
  var originalBuildNav=null;
  var openWrapped=false;
  var buildWrapped=false;
  var listenersInstalled=false;
  var bootAttempts=0;
  var restoreSerial=0;
  var saveTimer=0;
  var restoring=false;
  var lastActions={};

  function normalize(v){
    return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
  }
  function normalizePath(v){
    var p=String(v||'/').split('?')[0].split('#')[0].replace(/\/+$/,'');
    return p||'/';
  }
  function routeFromPath(path){
    var p=normalizePath(path);
    if(p==='/')return DEFAULT_ROUTE;
    for(var i=0;i<ROUTES.length;i++)if(ROUTES[i].path===p)return ROUTES[i];
    return null;
  }
  function routeFromSection(section){
    var key=normalize(section);
    for(var i=0;i<ROUTES.length;i++){
      if(ROUTES[i].sections.some(function(x){return normalize(x)===key}))return ROUTES[i];
    }
    if(DEFAULT_ROUTE.sections.some(function(x){return normalize(x)===key}))return DEFAULT_ROUTE;
    return null;
  }
  function navButtons(){
    return Array.prototype.slice.call(document.querySelectorAll('#nav2 [data-sec]'));
  }
  function sectionForRoute(route){
    var buttons=navButtons();
    if(!buttons.length)return '';
    for(var i=0;i<route.sections.length;i++){
      var wanted=normalize(route.sections[i]);
      for(var j=0;j<buttons.length;j++){
        if(normalize(buttons[j].getAttribute('data-sec'))===wanted)return buttons[j].getAttribute('data-sec');
      }
    }
    for(var k=0;k<route.labels.length;k++){
      var label=normalize(route.labels[k]);
      for(var m=0;m<buttons.length;m++){
        if(normalize(buttons[m].textContent).indexOf(label)>=0)return buttons[m].getAttribute('data-sec');
      }
    }
    return '';
  }
  function updateAddress(path,replace){
    var next=normalizePath(path);
    if(normalizePath(location.pathname)===next)return;
    var state={exeProRoute:next,version:VERSION};
    if(replace)history.replaceState(state,'',next);
    else history.pushState(state,'',next);
  }
  function stateKey(path){return STATE_PREFIX+normalizePath(path)}
  function appRoot(){return document.querySelector('#app')||document.body}
  function controlKey(root,el){
    var explicit=el.getAttribute('data-route-key')||el.id||el.name;
    if(explicit)return 'explicit:'+explicit;
    var all=root.querySelectorAll('select,input,textarea');
    return 'index:'+Array.prototype.indexOf.call(all,el);
  }
  function eligibleControl(el){
    var type=String(el.getAttribute('type')||'').toLowerCase();
    if(['password','file','hidden','submit','button','reset'].indexOf(type)>=0)return false;
    if(el.tagName==='SELECT')return true;
    if(el.hasAttribute('data-route-state')||el.getAttribute('role')==='tab')return true;
    var token=(el.id||el.name||el.getAttribute('aria-label')||'').toLowerCase();
    return /filter|filtro|search|busca|query|status|priority|prioridade|assigned|responsavel|responsável|lead|client|cliente|project|projeto|period|periodo|período|view|visao|visão|tab/.test(token);
  }
  function captureState(path){
    var root=appRoot();
    var controls=root.querySelectorAll('select,input,textarea');
    var values={};
    for(var i=0;i<controls.length;i++){
      var el=controls[i];
      if(!eligibleControl(el))continue;
      var type=String(el.getAttribute('type')||'').toLowerCase();
      values[controlKey(root,el)]={
        type:type,
        value:(type==='checkbox'||type==='radio')?!!el.checked:String(el.value||'')
      };
    }
    return {controls:values,action:lastSafeAction(path),savedAt:Date.now()};
  }
  function lastSafeAction(path){
    return lastActions[normalizePath(path)]||null;
  }
  function saveState(){
    var route=routeFromPath(location.pathname);
    if(!route||route.path==='/'||!document.querySelector('#app'))return;
    try{sessionStorage.setItem(stateKey(route.path),JSON.stringify(captureState(route.path)))}catch(e){}
  }
  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(saveState,120);
  }
  function findControl(root,key){
    var controls=root.querySelectorAll('select,input,textarea');
    for(var i=0;i<controls.length;i++)if(controlKey(root,controls[i])===key)return controls[i];
    return null;
  }
  function applyControl(el,record){
    if(!el||!record)return false;
    var type=String(el.getAttribute('type')||'').toLowerCase();
    var changed=false;
    if(type==='checkbox'||type==='radio'){
      var checked=!!record.value;
      changed=el.checked!==checked;
      el.checked=checked;
    }else{
      var value=String(record.value==null?'':record.value);
      changed=String(el.value||'')!==value;
      if(changed&&el.tagName==='SELECT'){
        var option=Array.prototype.slice.call(el.options||[]).some(function(o){return String(o.value)===value});
        if(!option)return false;
      }
      if(changed)el.value=value;
    }
    if(changed&&(el.tagName==='SELECT'||type==='checkbox'||type==='radio')){
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return changed;
  }
  function applySavedAction(action){
    if(!action)return;
    var root=appRoot();
    var candidates=Array.prototype.slice.call(root.querySelectorAll('button,[role="tab"]'));
    var target=null;
    if(action.onclick){
      target=candidates.find(function(el){return el.getAttribute('onclick')===action.onclick});
    }
    if(!target&&action.text){
      var wanted=normalize(action.text);
      target=candidates.find(function(el){
        return normalize(el.textContent)===wanted&&isSafeTabButton(el);
      });
    }
    if(target)target.click();
  }
  function applySavedState(path){
    var raw=null;
    try{raw=sessionStorage.getItem(stateKey(path))}catch(e){}
    if(!raw)return;
    var saved=null;
    try{saved=JSON.parse(raw)}catch(e){return}
    var keys=Object.keys(saved.controls||{});
    var index=0;
    var serial=restoreSerial;
    function step(){
      if(serial!==restoreSerial)return;
      if(index>=keys.length){
        setTimeout(function(){if(serial===restoreSerial)applySavedAction(saved.action)},80);
        return;
      }
      var root=appRoot();
      var key=keys[index++];
      var el=findControl(root,key);
      if(el)applyControl(el,saved.controls[key]);
      setTimeout(step,45);
    }
    step();
  }
  function scheduleRestore(path){
    restoreSerial++;
    var serial=restoreSerial;
    [140,650,1400].forEach(function(delay){
      setTimeout(function(){
        if(serial===restoreSerial)applySavedState(path);
      },delay);
    });
  }
  function isSafeTabButton(el){
    var role=el.getAttribute('role');
    var text=normalize(el.textContent);
    return role==='tab'||/visaogeral|jobs|modulos|eventos|quadro|lista|equipe|sla|kanban|tabela|timeline|linhadotempo/.test(text);
  }
  function captureClick(event){
    var button=event.target&&event.target.closest?event.target.closest('button,[role="tab"]'):null;
    if(button&&isSafeTabButton(button)){
      var current=routeFromPath(location.pathname);
      if(current)lastActions[current.path]={
        onclick:button.getAttribute('onclick')||'',
        text:String(button.textContent||'').trim().slice(0,100)
      };
    }
    scheduleSave();
  }
  function captureChange(){scheduleSave()}
  function restoreFromLocation(){
    if(!originalOpenSec)return;
    var route=routeFromPath(location.pathname);
    if(!route)return;
    var section=sectionForRoute(route);
    if(!section){
      if(bootAttempts<80)setTimeout(restoreFromLocation,120);
      return;
    }
    restoring=true;
    try{originalOpenSec.call(window,section)}catch(e){}
    restoring=false;
    scheduleRestore(route.path);
  }
  function install(){
    if(!openWrapped&&typeof window.openSec==='function'){
      originalOpenSec=window.openSec;
      window.openSec=function(section){
        var result=originalOpenSec.apply(this,arguments);
        var route=routeFromSection(section);
        if(route&&!restoring)updateAddress(route.path,false);
        if(route)scheduleRestore(route.path);
        return result;
      };
      openWrapped=true;
    }
    if(!buildWrapped&&typeof window.buildNav==='function'){
      originalBuildNav=window.buildNav;
      window.buildNav=function(){
        var result=originalBuildNav.apply(this,arguments);
        setTimeout(restoreFromLocation,0);
        return result;
      };
      buildWrapped=true;
    }
    if(!listenersInstalled){
      window.addEventListener('popstate',function(){setTimeout(restoreFromLocation,0)});
      document.addEventListener('click',captureClick,true);
      document.addEventListener('change',captureChange,true);
      document.addEventListener('input',captureChange,true);
      listenersInstalled=true;
    }
  }
  function boot(){
    bootAttempts++;
    install();
    if(openWrapped)restoreFromLocation();
    if((!openWrapped||!buildWrapped)&&bootAttempts<80)setTimeout(boot,100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();