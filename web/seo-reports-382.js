'use strict';
(function(){
  const SEO382={data:null,loading:false,leadId:'',editing:null};

  function e382(v){try{return esc(v)}catch{return String(v??'').replace(/[&<>"']/g,'')}}
  function rank382(){try{return roleRank(S.session?.user?.role||'')}catch{return 1}}
  function canSeo382(){return rank382()>=3}
  function canDelete382(){return rank382()>=4}
  function master382(){try{return isMaster()}catch{return false}}
  function clients382(){return rows('lead').filter(r=>isClient(r.payload||{})).sort((a,b)=>String(a.payload?.name||'').localeCompare(String(b.payload?.name||''),'pt-BR'))}
  function clientName382(id){const r=rows('lead').find(x=>x.entityId===id);return r?.payload?.name||r?.payload?.companyName||id||'Cliente'}
  function n382(v){const n=Number(v);return Number.isFinite(n)?n:0}
  function fmt382(v,d=0){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})}
  function pct382(v){return fmt382(v,2)+'%'}
  function report382(id){return SEO382.data?.reports?.find(x=>x.reportId===id)||null}
  function status382(s){try{return status(s)}catch{return'<span class="status">'+e382(s)+'</span>'}}
  function period382(r){return r.periodLabel||((r.periodStart||'')+' → '+(r.periodEnd||''))}
  function defaultDates382(){const d=new Date(),end=new Date(d.getFullYear(),d.getMonth(),0),start=new Date(end.getFullYear(),end.getMonth(),1);return{start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10),label:start.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}}
  function siteForLead382(id){const r=rows('lead').find(x=>x.entityId===id),p=r?.payload||{};return p.website||p.site||''}

  const baseBuild382=buildNav;
  buildNav=function(){
    baseBuild382();
    const nav2=$('nav2');
    if(nav2&&canSeo382()&&!document.querySelector('[data-sec="seoreports"]')){
      nav2.insertAdjacentHTML('beforeend','<button data-sec="seoreports" onclick="openSec(\'seoreports\')"><span class="ico">SEO</span><span>Relatórios SEO</span><span id="badge_seoreports" class="badge hidden"></span></button>');
    }
    markNav();
  };
  const baseRender382=render;
  render=function(){
    if(S.active==='seoreports'){renderSeo382();return}
    baseRender382();
  };

  async function loadSeo382(force=false){
    if(!canSeo382())return;
    if(SEO382.loading)return;
    if(SEO382.data&&!force)return;
    SEO382.loading=true;
    try{
      const q=SEO382.leadId?'?leadId='+encodeURIComponent(SEO382.leadId):'';
      SEO382.data=await api('/api/web/seo-reports'+q);
    }catch(e){toast(e.message,7000)}
    finally{SEO382.loading=false;if(S.active==='seoreports')renderSeo382();updateBadge382()}
  }
  window.loadSeo382=loadSeo382;

  function summary382(){
    const a=SEO382.data?.reports||[],pub=a.filter(x=>x.status==='Publicado'),draft=a.filter(x=>x.status!=='Publicado'),clients=new Set(a.map(x=>x.leadId));
    return'<div class="grid kpis seo382-kpis">'+
      kpi('Relatórios',a.length,'períodos cadastrados')+
      kpi('Publicados',pub.length,'visíveis no portal')+
      kpi('Rascunhos',draft.length,'em preparação')+
      kpi('Clientes',clients.size,'com relatório SEO')+
    '</div>';
  }
  function filters382(){
    const opts='<option value="">Todos os clientes</option>'+clients382().map(r=>'<option value="'+e382(r.entityId)+'" '+(r.entityId===SEO382.leadId?'selected':'')+'>'+e382(r.payload?.name||r.payload?.companyName||r.entityId)+'</option>').join('');
    return'<div class="seo382-toolbar"><select onchange="changeSeoLead382(this.value)">'+opts+'</select><div class="actions">'+(master382()?'<button class="btn" onclick="openSeoConfig382()">⚙ PageSpeed</button>':'')+'<button class="btn primary" onclick="openSeoReport382()">+ Novo relatório</button></div></div>';
  }
  window.changeSeoLead382=async function(v){SEO382.leadId=v||'';SEO382.data=null;await loadSeo382(true)};

  function table382(){
    const a=SEO382.data?.reports||[];
    if(!a.length)return'<div class="card"><div class="empty">Nenhum relatório SEO cadastrado.</div></div>';
    return'<div class="table-wrap"><table class="table seo382-table"><thead><tr><th>Cliente</th><th>Período / site</th><th>Google orgânico</th><th>GA / conversões</th><th>PageSpeed</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+
      a.map(r=>{
        const m=r.metrics||{};
        return'<tr>'+
          '<td><b>'+e382(r.client?.name||r.client?.companyName||clientName382(r.leadId))+'</b></td>'+
          '<td><b>'+e382(period382(r))+'</b><div class="tiny muted">'+e382(r.siteUrl||'Site não informado')+'</div></td>'+
          '<td><b>'+fmt382(m.organicClicks)+'</b> cliques<div class="tiny muted">'+fmt382(m.impressions)+' imp. · CTR '+pct382(m.ctr)+' · pos. '+fmt382(m.avgPosition,1)+'</div></td>'+
          '<td><b>'+fmt382(m.sessions)+'</b> sessões<div class="tiny muted">'+fmt382(m.users)+' usuários · '+fmt382(m.conversions)+' conversões</div></td>'+
          '<td><b>M '+fmt382(m.pagespeedMobile)+'</b> · <b>D '+fmt382(m.pagespeedDesktop)+'</b></td>'+
          '<td>'+status382(r.status)+'</td>'+
          '<td><div class="actions"><button class="btn sm" onclick="openSeoReport382(\''+e382(r.reportId)+'\')">Editar</button>'+
          '<button class="btn sm" onclick="previewSeo382(\''+e382(r.reportId)+'\')">Visualizar</button>'+
          (canDelete382()?'<button class="btn sm danger369" onclick="removeSeo382(\''+e382(r.reportId)+'\')">Excluir</button>':'')+
          '</div></td>'+
        '</tr>';
      }).join('')+
    '</tbody></table></div>';
  }

  function renderSeo382(){
    if(!canSeo382()){
      $('content').innerHTML=head('SEO','Relatórios SEO','Acesso restrito.')+'<div class="card"><div class="empty">Seu perfil não possui permissão.</div></div>';return;
    }
    if(!SEO382.data&&!SEO382.loading)setTimeout(()=>loadSeo382(true),0);
    const actions='<button class="btn" onclick="loadSeo382(true)">↻ Atualizar</button>';
    $('content').innerHTML=head('SEO & PERFORMANCE','Relatórios SEO','Relatórios mensais para acompanhar tráfego orgânico, palavras-chave, conversões e performance técnica.',actions)+
      (SEO382.data?summary382():'<div class="card"><div class="empty">Carregando...</div></div>')+
      filters382()+
      '<div class="notice seo382-note"><b>3.8.2:</b> métricas de Search Console/GA4 podem ser registradas/importadas no relatório e o PageSpeed é consultado diretamente. A conexão OAuth automática com Google Search Console/GA4 será uma evolução separada, pois depende das credenciais Google da agência.</div>'+
      (SEO382.data?table382():'');
    updateBadge382();
  }
  function updateBadge382(){
    const b=$('badge_seoreports'),n=(SEO382.data?.reports||[]).filter(x=>x.status!=='Publicado').length;
    if(b){b.textContent=n;b.classList.toggle('hidden',!n)}
  }

  function clientOptions382(selected){
    return clients382().map(r=>'<option value="'+e382(r.entityId)+'" '+(r.entityId===selected?'selected':'')+'>'+e382(r.payload?.name||r.payload?.companyName||r.entityId)+'</option>').join('');
  }
  function metricField382(id,label,value,step='1'){
    return'<div class="field"><label>'+label+'</label><input id="'+id+'" class="input" type="number" step="'+step+'" value="'+e382(value??0)+'"></div>';
  }
  function keywordRow382(k={},i=0){
    return'<div class="seo382-key-row" data-keyword-id="'+e382(k.keywordId||'')+'">'+
      '<input class="input sk-keyword" placeholder="Palavra-chave" value="'+e382(k.keyword||'')+'">'+
      '<input class="input sk-pos" type="number" step="0.1" placeholder="Pos." value="'+e382(k.position??'')+'">'+
      '<input class="input sk-prev" type="number" step="0.1" placeholder="Anterior" value="'+e382(k.previousPosition??'')+'">'+
      '<input class="input sk-clicks" type="number" min="0" placeholder="Cliques" value="'+e382(k.clicks??0)+'">'+
      '<input class="input sk-impr" type="number" min="0" placeholder="Impressões" value="'+e382(k.impressions??0)+'">'+
      '<input class="input sk-page" placeholder="Landing page" value="'+e382(k.landingPage||'')+'">'+
      '<button class="btn sm danger369" type="button" onclick="this.closest(\'.seo382-key-row\').remove()">×</button>'+
    '</div>';
  }
  window.addSeoKeyword382=function(){
    const box=$('seo382_keywords');if(box)box.insertAdjacentHTML('beforeend',keywordRow382({},box.children.length));
  };
  function collectKeywords382(){
    return [...document.querySelectorAll('#seo382_keywords .seo382-key-row')].map(row=>({
      keywordId:row.dataset.keywordId||undefined,keyword:row.querySelector('.sk-keyword').value.trim(),
      position:row.querySelector('.sk-pos').value,previousPosition:row.querySelector('.sk-prev').value,
      clicks:row.querySelector('.sk-clicks').value,impressions:row.querySelector('.sk-impr').value,landingPage:row.querySelector('.sk-page').value.trim()
    })).filter(x=>x.keyword);
  }
  function collectLines382(id){return $(id).value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}

  window.openSeoReport382=async function(id=''){
    let r=id?report382(id):null;
    if(id&&!r){
      const j=await api('/api/web/seo-reports?reportId='+encodeURIComponent(id));r=j.report;
    }
    SEO382.editing=r||null;
    const d=defaultDates382(),leadId=r?.leadId||SEO382.leadId||clients382()[0]?.entityId||'',m=r?.metrics||{};
    $('modalEyebrow').textContent='RELATÓRIO SEO';
    $('modalTitle').textContent=r?'Editar relatório':'Novo relatório';
    $('modalMeta').textContent='Relatório mensal publicado no Portal do Cliente.';
    $('modalBody').innerHTML='<div class="seo382-editor">'+
      '<div class="grid cols2">'+
        '<div class="field"><label>CLIENTE</label><select id="seo382_lead" onchange="seoLeadChange382()">'+clientOptions382(leadId)+'</select></div>'+
        '<div class="field"><label>SITE</label><input id="seo382_site" class="input" value="'+e382(r?.siteUrl||siteForLead382(leadId))+'" placeholder="https://cliente.com.br"></div>'+
        '<div class="field"><label>INÍCIO</label><input id="seo382_start" class="input" type="date" value="'+e382(r?.periodStart||d.start)+'"></div>'+
        '<div class="field"><label>FIM</label><input id="seo382_end" class="input" type="date" value="'+e382(r?.periodEnd||d.end)+'"></div>'+
        '<div class="field"><label>RÓTULO DO PERÍODO</label><input id="seo382_label" class="input" value="'+e382(r?.periodLabel||d.label)+'"></div>'+
        '<div class="field"><label>STATUS</label><select id="seo382_status"><option '+((r?.status||'Rascunho')==='Rascunho'?'selected':'')+'>Rascunho</option><option '+(r?.status==='Publicado'?'selected':'')+'>Publicado</option></select></div>'+
      '</div>'+
      '<div class="seo382-section"><div class="seo382-section-head"><div><h3>Search Console / Orgânico</h3><p class="help">Informe dados do período ou importe palavras-chave CSV.</p></div><button class="btn sm" onclick="document.getElementById(\'seoCsv382\').click()">Importar CSV de palavras-chave</button><input id="seoCsv382" class="hidden" type="file" accept=".csv,text/csv" onchange="importSeoCsv382(this)"></div>'+
        '<div class="grid cols4">'+
          metricField382('seo382_clicks','CLIQUES',m.organicClicks)+metricField382('seo382_impressions','IMPRESSÕES',m.impressions)+metricField382('seo382_ctr','CTR (%)',m.ctr,'0.01')+metricField382('seo382_position','POSIÇÃO MÉDIA',m.avgPosition,'0.1')+
        '</div></div>'+
      '<div class="seo382-section"><h3>Google Analytics / Resultado</h3><div class="grid cols4">'+
        metricField382('seo382_sessions','SESSÕES',m.sessions)+metricField382('seo382_users','USUÁRIOS',m.users)+metricField382('seo382_conv','CONVERSÕES',m.conversions)+metricField382('seo382_top10','PALAVRAS TOP 10',m.keywordsTop10)+
      '</div></div>'+
      '<div class="seo382-section"><div class="seo382-section-head"><div><h3>PageSpeed</h3><p class="help">Consulta oficial do PageSpeed Insights para o site acima.</p></div><div class="actions"><button class="btn sm" onclick="runPageSpeed382(\'mobile\')">Testar mobile</button><button class="btn sm" onclick="runPageSpeed382(\'desktop\')">Testar desktop</button></div></div><div class="grid cols4">'+
        metricField382('seo382_psm','MOBILE',m.pagespeedMobile)+metricField382('seo382_psd','DESKTOP',m.pagespeedDesktop)+metricField382('seo382_lcpm','LCP MOBILE (ms)',m.lcpMobile??'','0.1')+metricField382('seo382_lcpd','LCP DESKTOP (ms)',m.lcpDesktop??'','0.1')+
      '</div><div class="grid cols4">'+
        metricField382('seo382_clsm','CLS MOBILE',m.clsMobile??'','0.001')+metricField382('seo382_clsd','CLS DESKTOP',m.clsDesktop??'','0.001')+metricField382('seo382_inpm','INP MOBILE (ms)',m.inpMobile??'','0.1')+metricField382('seo382_inpd','INP DESKTOP (ms)',m.inpDesktop??'','0.1')+
      '</div></div>'+
      '<div class="seo382-section"><h3>SEO Local</h3><div class="grid cols2">'+metricField382('seo382_rating','AVALIAÇÃO GOOGLE',m.localRating,'0.1')+metricField382('seo382_reviews','AVALIAÇÕES',m.localReviews)+'</div></div>'+
      '<div class="seo382-section"><div class="seo382-section-head"><div><h3>Palavras-chave</h3><p class="help">Acompanhe posição atual, anterior, cliques e landing page.</p></div><button class="btn sm primary" type="button" onclick="addSeoKeyword382()">+ Palavra-chave</button></div><div class="seo382-key-head"><span>Palavra</span><span>Pos.</span><span>Anterior</span><span>Cliques</span><span>Imp.</span><span>Landing page</span><span></span></div><div id="seo382_keywords">'+((r?.keywords?.length?r.keywords:[{}]).map((k,i)=>keywordRow382(k,i)).join(''))+'</div></div>'+
      '<div class="field"><label>RESUMO EXECUTIVO</label><textarea id="seo382_summary" rows="5">'+e382(r?.summary||'')+'</textarea></div>'+
      '<div class="grid cols2"><div class="field"><label>DESTAQUES (1 POR LINHA)</label><textarea id="seo382_highlights" rows="5">'+e382((r?.highlights||[]).join('\n'))+'</textarea></div><div class="field"><label>PRÓXIMAS AÇÕES (1 POR LINHA)</label><textarea id="seo382_actions" rows="5">'+e382((r?.nextActions||[]).join('\n'))+'</textarea></div></div>'+
      '<div class="actions seo382-editor-actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveSeo382()">Salvar relatório</button></div>'+
    '</div>';
    $('modalBack').classList.remove('hidden');
  };
  window.seoLeadChange382=function(){const id=$('seo382_lead').value;if(!$('seo382_site').value.trim())$('seo382_site').value=siteForLead382(id)};

  window.saveSeo382=async function(){
    const r=SEO382.editing,body={
      reportId:r?.reportId,leadId:$('seo382_lead').value,siteUrl:$('seo382_site').value.trim(),periodStart:$('seo382_start').value,periodEnd:$('seo382_end').value,
      periodLabel:$('seo382_label').value.trim(),status:$('seo382_status').value,
      metrics:{
        organicClicks:n382($('seo382_clicks').value),impressions:n382($('seo382_impressions').value),ctr:n382($('seo382_ctr').value),avgPosition:n382($('seo382_position').value),
        sessions:n382($('seo382_sessions').value),users:n382($('seo382_users').value),conversions:n382($('seo382_conv').value),keywordsTop10:n382($('seo382_top10').value),
        localRating:n382($('seo382_rating').value),localReviews:n382($('seo382_reviews').value),pagespeedMobile:n382($('seo382_psm').value),pagespeedDesktop:n382($('seo382_psd').value),
        lcpMobile:$('seo382_lcpm').value, lcpDesktop:$('seo382_lcpd').value, clsMobile:$('seo382_clsm').value, clsDesktop:$('seo382_clsd').value, inpMobile:$('seo382_inpm').value, inpDesktop:$('seo382_inpd').value
      },
      summary:$('seo382_summary').value.trim(),highlights:collectLines382('seo382_highlights'),nextActions:collectLines382('seo382_actions'),keywords:collectKeywords382()
    };
    try{
      const method=r?'PATCH':'POST',j=await api('/api/web/seo-reports',{method,body:JSON.stringify(body)});
      SEO382.data={...(SEO382.data||{}),reports:j.reports||[]};SEO382.editing=null;closeModal();toast(body.status==='Publicado'?'Relatório publicado no Portal do Cliente.':'Relatório salvo como rascunho.',5500);renderSeo382();
    }catch(e){toast(e.message,7000)}
  };
  window.removeSeo382=async function(id){
    const r=report382(id);if(!r||!confirm('Excluir definitivamente o relatório SEO de '+period382(r)+'?'))return;
    try{const j=await api('/api/web/seo-reports/remove',{method:'POST',body:JSON.stringify({reportId:id})});SEO382.data={...(SEO382.data||{}),reports:j.reports||[]};toast('Relatório excluído.');renderSeo382()}catch(e){toast(e.message,7000)}
  };
  window.previewSeo382=function(id){
    const r=report382(id);if(!r)return;
    $('modalEyebrow').textContent='PRÉVIA DO RELATÓRIO';$('modalTitle').textContent=period382(r);$('modalMeta').textContent=(r.client?.name||clientName382(r.leadId))+' · '+(r.siteUrl||'');
    const m=r.metrics||{};
    $('modalBody').innerHTML='<div class="seo382-preview"><div class="grid kpis seo382-preview-kpis">'+kpi('Cliques',fmt382(m.organicClicks),'orgânico')+kpi('Impressões',fmt382(m.impressions),'Search Console')+kpi('Sessões',fmt382(m.sessions),'Analytics')+kpi('PageSpeed',fmt382(m.pagespeedMobile),'mobile')+'</div><div class="card"><h3>Resumo</h3><p>'+e382(r.summary||'Sem resumo executivo.')+'</p></div><div class="grid cols2"><div class="card"><h3>Destaques</h3><ul>'+(r.highlights||[]).map(x=>'<li>'+e382(x)+'</li>').join('')+'</ul></div><div class="card"><h3>Próximas ações</h3><ul>'+(r.nextActions||[]).map(x=>'<li>'+e382(x)+'</li>').join('')+'</ul></div></div></div>';
    $('modalBack').classList.remove('hidden');
  };
  window.runPageSpeed382=async function(strategy){
    const leadId=$('seo382_lead').value,siteUrl=$('seo382_site').value.trim();if(!siteUrl)return toast('Informe o site antes de testar.');
    toast('Executando PageSpeed '+strategy+'...',3500);
    try{
      const j=await api('/api/web/seo/pagespeed',{method:'POST',body:JSON.stringify({leadId,siteUrl,strategy})}),r=j.run;
      if(strategy==='mobile'){$('seo382_psm').value=r.score;$('seo382_lcpm').value=r.lcpMs??'';$('seo382_clsm').value=r.cls??'';$('seo382_inpm').value=r.inpMs??''}
      else{$('seo382_psd').value=r.score;$('seo382_lcpd').value=r.lcpMs??'';$('seo382_clsd').value=r.cls??'';$('seo382_inpd').value=r.inpMs??''}
      toast('PageSpeed '+strategy+': '+r.score+'/100',5000);
    }catch(e){toast(e.message,8000)}
  };

  window.openSeoConfig382=function(){
    const cfg=SEO382.data?.config||{};
    $('modalEyebrow').textContent='SEO / PAGESPEED';$('modalTitle').textContent='Configurar PageSpeed';$('modalMeta').textContent='A chave é opcional, mas ajuda com quota e estabilidade da API.';
    $('modalBody').innerHTML='<div class="field"><label>GOOGLE PAGESPEED API KEY</label><input id="seo382_pskey" class="input" type="password" autocomplete="new-password" placeholder="'+(cfg.pageSpeedKeyConfigured?'Chave já configurada — deixe vazio para manter':'Cole a chave do Google Cloud')+'"></div><label class="seo382-check"><input id="seo382_clear" type="checkbox"><span>Remover a chave atual</span></label><div class="actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveSeoConfig382()">Salvar</button></div>';
    $('modalBack').classList.remove('hidden');
  };
  window.saveSeoConfig382=async function(){
    try{
      const j=await api('/api/web/seo/config',{method:'PATCH',body:JSON.stringify({pageSpeedApiKey:$('seo382_pskey').value,clearPageSpeedApiKey:$('seo382_clear').checked})});
      SEO382.data.config=j;closeModal();toast('Configuração PageSpeed atualizada.');
    }catch(e){toast(e.message,7000)}
  };

  window.importSeoCsv382=async function(input){
    const f=input.files?.[0];if(!f)return;
    try{
      const text=await f.text(),lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);if(lines.length<2)throw new Error('CSV vazio.');
      const sep=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';
      const parse=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(ch===sep&&!q){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out};
      const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
      const h=parse(lines[0]).map(norm),find=(...names)=>{for(const n of names){const i=h.indexOf(norm(n));if(i>=0)return i}return-1};
      const iq=find('query','consulta','palavra-chave','palavrachave'),ic=find('clicks','cliques'),ii=find('impressions','impressoes'),ip=find('position','posicao'),il=find('page','pagina','landingpage');
      if(iq<0)throw new Error('Não encontrei a coluna de palavra-chave/query.');
      const box=$('seo382_keywords');box.innerHTML='';
      for(let n=1;n<lines.length&&n<=500;n++){const a=parse(lines[n]);const k={keyword:a[iq]||'',clicks:ic>=0?a[ic]:0,impressions:ii>=0?a[ii]:0,position:ip>=0?String(a[ip]||'').replace(',','.'):'',landingPage:il>=0?a[il]:''};if(k.keyword)box.insertAdjacentHTML('beforeend',keywordRow382(k,n))}
      toast('CSV importado para o relatório. Revise antes de salvar.',6000);
    }catch(e){toast(e.message,7000)}
    finally{input.value=''}
  };

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{buildNav()}catch{}},500));
  setTimeout(()=>{if(S?.session&&canSeo382())loadSeo382(true)},3300);
})();
