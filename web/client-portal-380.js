'use strict';
(function(){
  const CP380={data:null,loading:false};

  function e380(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function role380(){try{return roleRank(S.session?.user?.role||'')}catch{return 1}}
  function canManage380(){return role380()>=4}
  function clients380(){return rows('lead').filter(r=>isClient(r.payload||{})).sort((a,b)=>String(a.payload?.name||'').localeCompare(String(b.payload?.name||''),'pt-BR'))}
  function clientName380(id){const r=rows('lead').find(x=>x.entityId===id);return r?.payload?.name||r?.payload?.companyName||id||'Cliente'}
  function portalUrl380(){return 'https://portal.exekuta.com.br/';}
  function roleLabel380(v){return ({Proprietario:'Proprietário',Financeiro:'Financeiro',Marketing:'Marketing',Visualizador:'Visualizador'})[v]||v}

  const prevBuildNav380=buildNav;
  buildNav=function(){
    prevBuildNav380();
    const nav2=$('nav2');
    if(nav2&&canManage380()&&!document.querySelector('[data-sec="clientportal"]')){
      nav2.insertAdjacentHTML('beforeend','<button data-sec="clientportal" onclick="openSec(\'clientportal\')"><span class="ico">CP</span><span>Portal do Cliente</span><span id="badge_clientportal" class="badge hidden"></span></button>');
    }
    markNav();
  };

  const prevRender380=render;
  render=function(){
    if(S.active==='clientportal'){renderClientPortal380();return}
    prevRender380();
  };

  async function loadClientPortal380(force=false){
    if(!canManage380())return;
    if(CP380.loading)return;
    if(CP380.data&&!force)return;
    CP380.loading=true;
    try{CP380.data=await api('/api/web/client-portal/users')}
    catch(e){toast(e.message,6500)}
    finally{CP380.loading=false;if(S.active==='clientportal')renderClientPortal380();updatePortalBadge380()}
  }
  window.loadClientPortal380=loadClientPortal380;

  function summary380(){
    const users=CP380.data?.users||[];
    const active=users.filter(x=>x.active),clients=new Set(active.map(x=>x.leadId));
    const recent=active.filter(x=>x.lastLoginAt).length;
    return '<div class="grid kpis cp380-kpis">'+
      kpi('Acessos ativos',active.length,'usuários do portal')+
      kpi('Clientes com portal',clients.size,'empresas com acesso')+
      kpi('Já acessaram',recent,'logins registrados')+
      kpi('Inativos',users.length-active.length,'acessos desativados')+
    '</div>';
  }

  function table380(){
    const users=CP380.data?.users||[];
    if(!users.length)return'<div class="card"><div class="empty">Nenhum acesso criado. Abra um cliente e crie o primeiro usuário do Portal do Cliente.</div></div>';
    return '<div class="table-wrap"><table class="table cp380-table"><thead><tr><th>Cliente</th><th>Usuário</th><th>Perfil</th><th>Status</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>'+
      users.map(u=>{
        const p=u.client||{},name=p.name||p.companyName||clientName380(u.leadId);
        return '<tr>'+
          '<td><b>'+e380(name)+'</b><div class="tiny muted">'+e380(p.email||p.phone||'')+'</div></td>'+
          '<td><b>'+e380(u.username)+'</b></td>'+
          '<td>'+e380(roleLabel380(u.role))+'</td>'+
          '<td><span class="status '+(u.active?'ok':'')+'">'+(u.active?'Ativo':'Inativo')+'</span></td>'+
          '<td>'+e380(u.lastLoginAt?day(u.lastLoginAt):'Nunca')+'</td>'+
          '<td><div class="actions cp380-actions">'+
            '<button class="btn sm" onclick="openPortalUser380(\''+e380(u.userId)+'\')">Editar</button>'+
            '<button class="btn sm" onclick="copyPortalLink380()">Copiar portal</button><button class="btn sm" onclick="openPortal380()">Abrir portal</button>'+
            '<button class="btn sm danger369" onclick="removePortalUser380(\''+e380(u.userId)+'\')">Remover</button>'+
          '</div></td>'+
        '</tr>';
      }).join('')+
    '</tbody></table></div>';
  }

  function renderClientPortal380(){
    if(!canManage380()){
      $('content').innerHTML=head('PORTAL DO CLIENTE','Portal do Cliente','Acesso reservado a Admin e Super Admin.')+'<div class="card"><div class="empty">Seu perfil não possui permissão para gerenciar acessos de clientes.</div></div>';
      return;
    }
    if(!CP380.data&&!CP380.loading)setTimeout(()=>loadClientPortal380(true),0);
    const actions='<button class="btn primary" onclick="openPortalUser380()">+ Novo acesso</button><button class="btn" onclick="openPortal380()">↗ Abrir portal</button><button class="btn" onclick="loadClientPortal380(true)">↻ Atualizar</button>';
    $('content').innerHTML=
      head('ÁREA DO CLIENTE','Portal do Cliente','Acesso separado para seus clientes acompanharem serviços, sites, financeiro e projetos.',actions)+
      '<div class="notice cp380-domain"><b>Endereço oficial do portal:</b> portal.exekuta.com.br — este é o endereço copiado pelo botão Copiar portal.</div>'+
      (CP380.data?summary380():'<div class="card"><div class="empty">Carregando acessos...</div></div>')+
      (CP380.data?table380():'');
    updatePortalBadge380();
  }

  function clientOptions380(selected){
    return clients380().map(r=>'<option value="'+e380(r.entityId)+'" '+(r.entityId===selected?'selected':'')+'>'+e380(r.payload?.name||r.payload?.companyName||r.entityId)+'</option>').join('');
  }
  function user380(id){return CP380.data?.users?.find(x=>x.userId===id)||null}

  window.openPortalUser380=function(id='',leadId=''){
    const u=id?user380(id):null,selected=u?.leadId||leadId||clients380()[0]?.entityId||'';
    $('modalEyebrow').textContent='PORTAL DO CLIENTE';
    $('modalTitle').textContent=u?'Editar acesso':'Novo acesso do cliente';
    $('modalMeta').textContent=u?'Atualize usuário, perfil, status ou redefina a senha.':'Crie um login separado para o cliente. Nenhum acesso administrativo do EXE PRO é compartilhado.';
    $('modalBody').innerHTML='<div class="cp380-modal">'+
      '<div class="grid cols2">'+
        '<div class="field"><label>CLIENTE</label><select id="cpu380_lead" '+(u?'disabled':'')+'>'+clientOptions380(selected)+'</select></div>'+
        '<div class="field"><label>PERFIL</label><select id="cpu380_role"><option value="Proprietario" '+((u?.role||'Proprietario')==='Proprietario'?'selected':'')+'>Proprietário</option><option value="Financeiro" '+(u?.role==='Financeiro'?'selected':'')+'>Financeiro</option><option value="Marketing" '+(u?.role==='Marketing'?'selected':'')+'>Marketing</option><option value="Visualizador" '+(u?.role==='Visualizador'?'selected':'')+'>Visualizador</option></select></div>'+
        '<div class="field"><label>USUÁRIO / E-MAIL *</label><input id="cpu380_user" class="input" value="'+e380(u?.username||'')+'" placeholder="cliente@empresa.com"></div>'+
        '<div class="field"><label>'+ (u?'NOVA SENHA (OPCIONAL)':'SENHA INICIAL *') +'</label><input id="cpu380_password" class="input" type="password" autocomplete="new-password" placeholder="'+(u?'Deixe vazio para manter':'Mínimo 8 caracteres')+'"></div>'+
      '</div>'+
      (u?'<label class="cp380-check"><input id="cpu380_active" type="checkbox" '+(u.active?'checked':'')+'><span>Acesso ativo</span></label>':'')+
      '<div class="notice" style="margin-top:12px"><b>Perfis:</b> Proprietário vê tudo; Financeiro vê cobranças e serviços; Marketing vê serviços, sites e projetos; Visualizador não vê valores financeiros.</div>'+
      '<div class="actions" style="margin-top:14px"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="savePortalUser380(\''+e380(u?.userId||'')+'\')">'+(u?'Salvar alterações':'Criar acesso')+'</button></div>'+
    '</div>';
    $('modalBack').classList.remove('hidden');
  };

  window.savePortalUser380=async function(id=''){
    const body={
      userId:id||undefined,
      leadId:$('cpu380_lead')?.value,
      username:$('cpu380_user').value.trim(),
      password:$('cpu380_password').value,
      role:$('cpu380_role').value,
      active:id?$('cpu380_active').checked:true
    };
    if(!body.username)return toast('Informe o usuário do portal.');
    if(!id&&String(body.password||'').length<8)return toast('A senha inicial precisa ter pelo menos 8 caracteres.');
    try{
      const method=id?'PATCH':'POST';
      const j=await api('/api/web/client-portal/users',{method,body:JSON.stringify(body)});
      CP380.data=j.list||CP380.data;closeModal();toast(id?'Acesso do cliente atualizado.':'Acesso criado. Envie ao cliente o endereço do portal, usuário e senha inicial.',6500);renderClientPortal380();
    }catch(e){toast(e.message,7000)}
  };

  window.removePortalUser380=async function(id){
    const u=user380(id);if(!u)return;
    if(!confirm('Remover definitivamente o acesso '+u.username+' do Portal do Cliente?'))return;
    try{
      const j=await api('/api/web/client-portal/users/remove',{method:'POST',body:JSON.stringify({userId:id})});
      CP380.data=j.list||CP380.data;toast('Acesso removido.');renderClientPortal380();
    }catch(e){toast(e.message,7000)}
  };

  window.openPortal380=function(){window.open(portalUrl380(),'_blank','noopener')};
  window.copyPortalLink380=async function(){
    const url=portalUrl380();
    try{await navigator.clipboard.writeText(url);toast('Endereço do portal copiado: '+url,5000)}
    catch{prompt('Copie o endereço do portal:',url)}
  };
  window.openPortal380=function(){window.open(location.origin+'/portal/','_blank','noopener')};

  function updatePortalBadge380(){
    const b=$('badge_clientportal'),n=(CP380.data?.users||[]).filter(x=>!x.active).length;
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }

  const prevShowEntity380=showEntityModal;
  showEntityModal=function(r){
    prevShowEntity380(r);
    if(r?.entityType!=='lead'||!isClient(r.payload||{}))return;
    setTimeout(()=>injectPortalClient380(r),0);
  };
  function injectPortalClient380(r){
    const body=$('modalBody');if(!body||document.getElementById('clientPortalCard380')||!canManage380())return;
    if(!CP380.data){loadClientPortal380(true).then(()=>setTimeout(()=>injectPortalClient380(r),30));return}
    const users=(CP380.data.users||[]).filter(x=>x.leadId===r.entityId);
    const detail=users.length?users.map(u=>'<div class="cp380-client-user"><div><b>'+e380(u.username)+'</b><div class="tiny muted">'+e380(roleLabel380(u.role))+' · '+(u.active?'Ativo':'Inativo')+'</div></div><button class="btn sm" onclick="openPortalUser380(\''+e380(u.userId)+'\')">Editar</button></div>').join(''):'<div class="muted">Este cliente ainda não possui acesso ao portal.</div>';
    body.insertAdjacentHTML('beforeend','<div id="clientPortalCard380" class="card cp380-client-card"><div class="cp380-client-head"><div><div class="eyebrow">PORTAL DO CLIENTE</div><h3>Acessos do cliente</h3></div><button class="btn sm primary" onclick="openPortalUser380(\'\',\''+e380(r.entityId)+'\')">+ Criar acesso</button></div>'+detail+'</div>');
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{buildNav()}catch{}},400));
  setTimeout(()=>{if(S?.session&&canManage380())loadClientPortal380(true)},2600);
})();
