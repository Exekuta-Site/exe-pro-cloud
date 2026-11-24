(function(){
  'use strict';

  const MASTER_DEFAULTS={
    systemName:'EXE PRO',companyName:'EXEKUTA',tagline:'Prospecção - Relacionamento - Vendas',
    sideDescription:'Estratégia, execução e resultados para sua operação comercial.',
    primaryColor:'#0d9488',primaryDark:'#087a72',navColor:'#102231',logoData:'',
    companyLegalName:'',document:'',phone:'',whatsapp:'',email:'',website:'',address:'',instagram:'',
    proposalSubtitle:'Proposta comercial - Marketing Digital',proposalValidityDays:15,paymentTermsDefault:'',
    pixKey:'',bankInfo:'',proposalFooter:'Obrigado pela oportunidade. Esta proposta foi preparada especialmente para sua empresa.',
    messagePresentation:'Somos uma agência de Marketing Digital com foco em SEO Orgânico e criação de sites.',messageSignature:''
  };

  let masterLogoDraft=null;
  const currentBrand=()=>({...MASTER_DEFAULTS,...(S.brand||{})});
  const initials=v=>String(v||'EX').replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase()||'EX';

  function masterLogoMarkup(b,klass='master363-logo-fallback'){
    const logo=masterLogoDraft===null?(b.logoData||''):masterLogoDraft;
    return logo?`<img src="${esc(logo)}" alt="Logo">`:`<div class="${klass}" style="background:linear-gradient(145deg,${esc(b.primaryColor)},${esc(b.primaryDark)})">${esc(initials(b.systemName))}</div>`;
  }

  function renderMaster(){
    if(!isMaster()) return head('PAINEL MESTRE','Painel Mestre','Área exclusiva do Super Admin.')+'<div class="notice">Somente o Super Admin pode alterar identidade e dados institucionais.</div>';
    const b=currentBrand();
    if(masterLogoDraft===null) masterLogoDraft=b.logoData||'';
    return head('SUPER ADMIN / MESTRE','Painel Mestre','Personalize marca, dados da agência, propostas e comunicação. As alterações ficam salvas na Cloud e sincronizam com o Windows.')+
    `<div class="master363-layout">
      <div class="master363-stack">
        <div class="card master363-card">
          <h3>Identidade visual do sistema</h3><p class="help">Logo, nome, slogan e cores usados pela Cloud e compartilhados com a versão local.</p>
          <div class="master363-logo-row">
            <div id="m363LogoPreview" class="master363-logo-preview">${masterLogoMarkup(b)}</div>
            <div><input id="m363LogoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
              <div class="actions"><button id="m363ChooseLogo" class="btn">Escolher logo</button><button id="m363RemoveLogo" class="btn danger">Remover logo</button></div>
              <div class="tiny muted" style="margin-top:8px">PNG com fundo transparente é recomendado. Máximo de 5 MB; a imagem é reduzida antes do envio.</div>
            </div>
          </div>
          <div class="form-grid" style="margin-top:16px">
            <div class="field"><label>Nome do sistema</label><input id="m363SystemName" class="input" value="${esc(b.systemName)}"></div>
            <div class="field"><label>Marca / empresa</label><input id="m363CompanyName" class="input" value="${esc(b.companyName)}"></div>
            <div class="field wide"><label>Slogan / linha de apoio</label><input id="m363Tagline" class="input" value="${esc(b.tagline)}"></div>
            <div class="field wide"><label>Texto do menu lateral</label><input id="m363SideDescription" class="input" value="${esc(b.sideDescription)}"></div>
          </div>
          <div class="master363-colors">
            <div class="field"><label>Cor principal</label><div class="master363-color"><input id="m363PrimaryColor" type="color" value="${esc(b.primaryColor)}"><input id="m363PrimaryColorText" class="input" value="${esc(b.primaryColor)}"></div></div>
            <div class="field"><label>Cor secundária</label><div class="master363-color"><input id="m363PrimaryDark" type="color" value="${esc(b.primaryDark)}"><input id="m363PrimaryDarkText" class="input" value="${esc(b.primaryDark)}"></div></div>
            <div class="field"><label>Cor do menu</label><div class="master363-color"><input id="m363NavColor" type="color" value="${esc(b.navColor)}"><input id="m363NavColorText" class="input" value="${esc(b.navColor)}"></div></div>
          </div>
        </div>

        <div class="card master363-card"><h3>Dados da agência</h3><p class="help">Informações reutilizadas em propostas, apresentações e comunicação comercial.</p><div class="form-grid">
          <div class="field"><label>Razão social</label><input id="m363LegalName" class="input" value="${esc(b.companyLegalName||'')}"></div>
          <div class="field"><label>CNPJ / CPF</label><input id="m363Document" class="input" value="${esc(b.document||'')}"></div>
          <div class="field"><label>Telefone</label><input id="m363Phone" class="input" value="${esc(b.phone||'')}"></div>
          <div class="field"><label>WhatsApp</label><input id="m363Whatsapp" class="input" value="${esc(b.whatsapp||'')}"></div>
          <div class="field"><label>E-mail</label><input id="m363Email" class="input" type="email" value="${esc(b.email||'')}"></div>
          <div class="field"><label>Site</label><input id="m363Website" class="input" value="${esc(b.website||'')}"></div>
          <div class="field wide"><label>Endereço</label><input id="m363Address" class="input" value="${esc(b.address||'')}"></div>
          <div class="field wide"><label>Instagram</label><input id="m363Instagram" class="input" value="${esc(b.instagram||'')}" placeholder="@empresa ou link"></div>
        </div></div>

        <div class="card master363-card"><h3>Propostas e dados comerciais</h3><p class="help">Padrões comerciais compartilhados com a operação.</p><div class="form-grid">
          <div class="field wide"><label>Subtítulo da proposta</label><input id="m363ProposalSubtitle" class="input" value="${esc(b.proposalSubtitle||'')}"></div>
          <div class="field"><label>Validade padrão (dias)</label><input id="m363ProposalValidity" class="input" type="number" min="1" max="365" value="${esc(b.proposalValidityDays||15)}"></div>
          <div class="field"><label>Chave PIX</label><input id="m363PixKey" class="input" value="${esc(b.pixKey||'')}"></div>
          <div class="field wide"><label>Condições de pagamento padrão</label><input id="m363PaymentTerms" class="input" value="${esc(b.paymentTermsDefault||'')}"></div>
          <div class="field wide"><label>Dados bancários</label><textarea id="m363BankInfo" rows="3">${esc(b.bankInfo||'')}</textarea></div>
          <div class="field wide"><label>Rodapé da proposta</label><textarea id="m363ProposalFooter" rows="3">${esc(b.proposalFooter||'')}</textarea></div>
        </div></div>

        <div class="card master363-card"><h3>Apresentação e mensagens</h3><p class="help">Texto institucional e assinatura usados como apoio nas mensagens geradas.</p><div class="form-grid">
          <div class="field wide"><label>Apresentação da agência</label><textarea id="m363Presentation" rows="4">${esc(b.messagePresentation||'')}</textarea></div>
          <div class="field wide"><label>Assinatura padrão</label><textarea id="m363Signature" rows="3">${esc(b.messageSignature||'')}</textarea></div>
        </div></div>

        <div class="card master363-card"><div class="notice">A identidade é persistida no PostgreSQL. Alterações feitas no Painel Mestre da Cloud e no Windows usam a data de atualização para manter a versão mais recente durante a sincronização.</div><div class="actions" style="margin-top:14px"><button id="m363Reset" class="btn">Restaurar formulário padrão</button><button id="m363Save" class="btn primary">Salvar Painel Mestre</button></div></div>
      </div>

      <div class="card master363-preview">
        <div class="eyebrow">PRÉVIA EM TEMPO REAL</div><h3 style="margin:7px 0 13px">Como o sistema ficará</h3>
        <div class="master363-preview-shell">
          <div class="master363-preview-top"><div id="m363PreviewLogo" class="master363-preview-logo">${masterLogoMarkup(b,'master363-preview-logo-fallback')}</div><div><strong id="m363PreviewName">${esc(b.systemName)}</strong><span id="m363PreviewTag">by ${esc(b.companyName)} · ${esc(b.tagline)}</span></div></div>
          <div class="master363-preview-body"><div id="m363PreviewNav" class="master363-preview-nav"><i></i><i></i><i></i><i></i></div><div class="master363-preview-content"><h4 id="m363PreviewWelcome">${esc(b.systemName)}</h4><p id="m363PreviewDescription">${esc(b.sideDescription)}</p><div class="master363-preview-kpis"><b></b><b></b><b></b><b></b></div></div></div>
        </div>
        <div class="notice" style="margin-top:12px">Somente o perfil Super Admin pode alterar este painel.</div>
      </div>
    </div>`;
  }

  function value(id){return ($(id)?.value||'').trim()}
  function masterDraft(){
    return {
      ...currentBrand(),systemName:value('m363SystemName')||'EXE PRO',companyName:value('m363CompanyName')||'EXEKUTA',
      tagline:value('m363Tagline'),sideDescription:value('m363SideDescription'),primaryColor:value('m363PrimaryColorText'),primaryDark:value('m363PrimaryDarkText'),navColor:value('m363NavColorText'),
      logoData:masterLogoDraft||'',companyLegalName:value('m363LegalName'),document:value('m363Document'),phone:value('m363Phone'),whatsapp:value('m363Whatsapp'),email:value('m363Email'),website:value('m363Website'),address:value('m363Address'),instagram:value('m363Instagram'),
      proposalSubtitle:value('m363ProposalSubtitle'),proposalValidityDays:Number(value('m363ProposalValidity'))||15,paymentTermsDefault:value('m363PaymentTerms'),pixKey:value('m363PixKey'),bankInfo:value('m363BankInfo'),proposalFooter:value('m363ProposalFooter'),messagePresentation:value('m363Presentation'),messageSignature:value('m363Signature')
    };
  }

  function updatePreview(){
    if(!$('m363PreviewName')) return;
    const b=masterDraft();
    $('m363PreviewName').textContent=b.systemName;$('m363PreviewTag').textContent='by '+b.companyName+' · '+b.tagline;$('m363PreviewWelcome').textContent=b.systemName;$('m363PreviewDescription').textContent=b.sideDescription;
    $('m363PreviewNav').style.background=b.navColor;
    const logo=masterLogoDraft||'';
    $('m363PreviewLogo').style.background='linear-gradient(145deg,'+b.primaryColor+','+b.primaryDark+')';
    $('m363PreviewLogo').innerHTML=logo?'<img src="'+esc(logo)+'" alt="Logo">':esc(initials(b.systemName));
    $('m363LogoPreview').innerHTML=logo?'<img src="'+esc(logo)+'" alt="Logo">':'<div class="master363-logo-fallback" style="background:linear-gradient(145deg,'+esc(b.primaryColor)+','+esc(b.primaryDark)+')">'+esc(initials(b.systemName))+'</div>';
    document.querySelectorAll('.master363-preview-kpis b').forEach(x=>x.style.setProperty('--m363-brand',b.primaryColor));
  }

  function syncColor(colorId,textId,fromText){
    const color=$(colorId),txt=$(textId);if(!color||!txt)return;
    if(fromText){if(/^#[0-9a-f]{6}$/i.test(txt.value)) color.value=txt.value}else txt.value=color.value;
    updatePreview();
  }

  function handleLogo(input){
    const file=input.files&&input.files[0];if(!file)return;
    if(!file.type.startsWith('image/')) return toast('Escolha uma imagem válida.');
    if(file.size>5*1024*1024) return toast('Escolha uma imagem de até 5 MB.');
    const reader=new FileReader();
    reader.onload=()=>{
      if(file.type==='image/svg+xml'){masterLogoDraft=String(reader.result||'');updatePreview();return;}
      const img=new Image();img.onload=()=>{const max=720,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);masterLogoDraft=c.toDataURL('image/png');if(masterLogoDraft.length>1700000){masterLogoDraft='';toast('A logo ficou muito grande. Use uma imagem menor.');return;}updatePreview();};img.src=reader.result;
    };
    reader.readAsDataURL(file);
  }

  function resetForm(){
    const d=MASTER_DEFAULTS,ids={m363SystemName:'systemName',m363CompanyName:'companyName',m363Tagline:'tagline',m363SideDescription:'sideDescription',m363LegalName:'companyLegalName',m363Document:'document',m363Phone:'phone',m363Whatsapp:'whatsapp',m363Email:'email',m363Website:'website',m363Address:'address',m363Instagram:'instagram',m363ProposalSubtitle:'proposalSubtitle',m363ProposalValidity:'proposalValidityDays',m363PaymentTerms:'paymentTermsDefault',m363PixKey:'pixKey',m363BankInfo:'bankInfo',m363ProposalFooter:'proposalFooter',m363Presentation:'messagePresentation',m363Signature:'messageSignature'};
    Object.entries(ids).forEach(([id,k])=>{if($(id))$(id).value=d[k]??''});
    [['m363PrimaryColor','m363PrimaryColorText','primaryColor'],['m363PrimaryDark','m363PrimaryDarkText','primaryDark'],['m363NavColor','m363NavColorText','navColor']].forEach(([a,t,k])=>{if($(a))$(a).value=d[k];if($(t))$(t).value=d[k]});
    masterLogoDraft='';updatePreview();toast('Formulário restaurado. Clique em Salvar para aplicar.');
  }

  async function saveMaster(){
    const branding=masterDraft();
    if(!/^#[0-9a-f]{6}$/i.test(branding.primaryColor)||!/^#[0-9a-f]{6}$/i.test(branding.primaryDark)||!/^#[0-9a-f]{6}$/i.test(branding.navColor)) return toast('Confira as cores no formato #RRGGBB.');
    try{const j=await api('/api/web/branding',{method:'PATCH',body:JSON.stringify({branding})});applyBrand(j.branding||branding);masterLogoDraft=(j.branding||branding).logoData||'';render();toast('Painel Mestre salvo na Cloud.');}catch(e){toast(e.message,5000)}
  }

  function wireMaster(){
    if(S.active!=='master'||!$('m363Save')) return;
    document.querySelectorAll('#content input,#content textarea').forEach(el=>{if(!el.id.startsWith('m363'))return;el.addEventListener('input',updatePreview)});
    $('m363ChooseLogo').onclick=()=>$('m363LogoFile').click();$('m363RemoveLogo').onclick=()=>{masterLogoDraft='';$('m363LogoFile').value='';updatePreview()};$('m363LogoFile').onchange=e=>handleLogo(e.target);$('m363Reset').onclick=resetForm;$('m363Save').onclick=saveMaster;
    [['m363PrimaryColor','m363PrimaryColorText'],['m363PrimaryDark','m363PrimaryDarkText'],['m363NavColor','m363NavColorText']].forEach(([c,t])=>{if($(c))$(c).oninput=()=>syncColor(c,t,false);if($(t))$(t).oninput=()=>syncColor(c,t,true)});
    updatePreview();
  }

  const originalApplyBrand=applyBrand;
  applyBrand=function(b){originalApplyBrand(b);const d=document.querySelector('#paritySideIntro>span');if(d)d.textContent=S.brand.sideDescription||MASTER_DEFAULTS.sideDescription;};

  if(!NAV3.some(x=>x[0]==='master')) NAV3.splice(1,0,['master','★','Painel Mestre']);
  buildNav=function(){$('nav').innerHTML=NAV.map(navButton).join('');$('nav2').innerHTML=NAV2.map(navButton).join('');$('nav3').innerHTML=NAV3.filter(x=>x[0]!=='team'||isAdmin()).filter(x=>!['master','settings'].includes(x[0])||isMaster()).map(navButton).join('');markNav()};
  render=function(){if(!S.snap)return;$('content').innerHTML=({dashboard:renderDashboard,today:renderToday,prospect:renderProspect,leads:()=>renderLeadList(false),clients:()=>renderLeadList(true),pipeline:renderPipeline,central:renderCentral,conversations:renderConversations,proposals:()=>renderEntityList('proposal'),projects:()=>renderEntityList('project'),finance:renderFinance,agenda:renderAgenda,bi:renderBI,contracts:()=>renderEntityList('contract'),services:()=>renderEntityList('service'),activities:renderActivities,team:renderTeam,master:renderMaster,settings:renderSettings}[S.active]||renderDashboard)();wireMaster();};

  if(S.session){buildNav();render();}
})();
