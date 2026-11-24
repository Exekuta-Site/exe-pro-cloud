'use strict';
(function(){
  const SEO382P={loading:false};
  const baseDashboard382=dashboard;
  const baseRender382=render;

  function e382p(v){return e(v)}
  function fmt382p(v,d=0){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})}
  function pct382p(v){return fmt382p(v,2)+'%'}
  function report382p(id){return (P.seoReports||[]).find(x=>x.reportId===id)||null}
  function grade382p(v){v=Number(v||0);return v>=90?'Excelente':v>=75?'Bom':v>=50?'Atenção':'Crítico'}
  function delta382p(k){
    const a=Number(k.position),b=Number(k.previousPosition);
    if(!Number.isFinite(a)||!Number.isFinite(b))return'—';
    const d=b-a;if(Math.abs(d)<.05)return'0';
    return(d>0?'+':'')+d.toFixed(1);
  }

  async function loadSeoPortal382(force=false){
    if(SEO382P.loading)return;
    if(P.seoReports&&!force)return P.seoReports;
    SEO382P.loading=true;
    try{
      const j=await api('/api/portal/seo-reports');
      P.seoReports=j.reports||[];
      return P.seoReports;
    }catch(e){console.error(e);P.seoReports=[];return P.seoReports}
    finally{SEO382P.loading=false}
  }
  window.loadSeoPortal382=loadSeoPortal382;

  function ensureSeoNav382(){
    const side=document.querySelector('.sidebar');if(!side||document.getElementById('seoNav382p'))return;
    const foot=side.querySelector('.sidebar-foot');
    const html='<button class="navbtn" data-page="seo" id="seoNav382p" onclick="goSeo382()">Relatórios SEO</button>';
    if(foot)foot.insertAdjacentHTML('beforebegin',html);else side.insertAdjacentHTML('beforeend',html);
  }
  window.goSeo382=async function(id=''){
    P.page='seo';P.seoSelected=id||'';await loadSeoPortal382(false);render();
  };

  dashboard=function(){
    let h=baseDashboard382();
    if(P.seoReports===undefined)setTimeout(()=>loadSeoPortal382(false).then(()=>{if(P.page==='dashboard')render()}),0);
    const r=(P.seoReports||[])[0];
    if(!r)return h;
    const m=r.metrics||{};
    h+='<div class="card seo382p-dashboard"><div class="card-head"><div><div class="eyebrow">RELATÓRIO SEO</div><h3>'+e382p(r.periodLabel||date(r.periodEnd))+'</h3><p class="muted tiny">'+e382p(r.siteUrl||'')+'</p></div><button class="btn" onclick="goSeo382(\''+e382p(r.reportId)+'\')">Ver relatório</button></div>'+
      '<div class="seo382p-mini"><div><span>Cliques orgânicos</span><b>'+fmt382p(m.organicClicks)+'</b></div><div><span>Impressões</span><b>'+fmt382p(m.impressions)+'</b></div><div><span>Posição média</span><b>'+fmt382p(m.avgPosition,1)+'</b></div><div><span>PageSpeed mobile</span><b>'+fmt382p(m.pagespeedMobile)+'</b></div></div></div>';
    return h;
  };

  function listPage382(){
    const a=P.seoReports||[];
    return'<div class="hero"><div><div class="eyebrow">SEO & PERFORMANCE</div><h2>Relatórios SEO</h2><p>Acompanhe tráfego orgânico, palavras-chave, conversões e desempenho técnico.</p></div></div>'+
      (a.length?'<div class="service-grid seo382p-grid">'+a.map(r=>{const m=r.metrics||{};return'<article class="service-card seo382p-card"><div class="card-head"><div><h4>'+e382p(r.periodLabel||date(r.periodEnd))+'</h4><div class="tiny muted">'+e382p(r.siteUrl||'Site')+'</div></div><span class="status ok">Publicado</span></div><div class="seo382p-card-metrics"><div><span>Cliques</span><b>'+fmt382p(m.organicClicks)+'</b></div><div><span>Impressões</span><b>'+fmt382p(m.impressions)+'</b></div><div><span>Posição</span><b>'+fmt382p(m.avgPosition,1)+'</b></div><div><span>Mobile</span><b>'+fmt382p(m.pagespeedMobile)+'</b></div></div><button class="btn primary" onclick="goSeo382(\''+e382p(r.reportId)+'\')">Abrir relatório</button></article>'}).join('')+'</div>':'<div class="card empty">Nenhum relatório SEO publicado para sua conta.</div>');
  }

  function detailPage382(r){
    const m=r.metrics||{},kw=r.keywords||[];
    return'<div class="seo382p-print">'+
      '<div class="hero seo382p-report-head"><div><div class="eyebrow">RELATÓRIO SEO</div><h2>'+e382p(r.periodLabel||date(r.periodEnd))+'</h2><p>'+e382p(r.siteUrl||'')+' · '+date(r.periodStart)+' a '+date(r.periodEnd)+'</p></div><div class="support"><button class="btn" onclick="goSeo382()">← Voltar</button><button class="btn primary" onclick="printSeo382()">Imprimir / PDF</button></div></div>'+
      '<div class="kpis seo382p-kpis">'+
        '<div class="kpi"><span>Cliques orgânicos</span><b>'+fmt382p(m.organicClicks)+'</b><small>Search Console</small></div>'+
        '<div class="kpi"><span>Impressões</span><b>'+fmt382p(m.impressions)+'</b><small>CTR '+pct382p(m.ctr)+'</small></div>'+
        '<div class="kpi"><span>Posição média</span><b>'+fmt382p(m.avgPosition,1)+'</b><small>'+fmt382p(m.keywordsTop10)+' termos Top 10</small></div>'+
        '<div class="kpi"><span>Sessões</span><b>'+fmt382p(m.sessions)+'</b><small>'+fmt382p(m.conversions)+' conversões</small></div>'+
      '</div>'+
      '<div class="grid2">'+
        '<div class="card"><div class="eyebrow">RESUMO EXECUTIVO</div><h3>Visão do período</h3><p>'+e382p(r.summary||'Sem resumo executivo informado.')+'</p></div>'+
        '<div class="card"><div class="eyebrow">PAGESPEED</div><h3>Performance técnica</h3><div class="seo382p-speed"><div><span>Mobile</span><b>'+fmt382p(m.pagespeedMobile)+'</b><small>'+grade382p(m.pagespeedMobile)+'</small></div><div><span>Desktop</span><b>'+fmt382p(m.pagespeedDesktop)+'</b><small>'+grade382p(m.pagespeedDesktop)+'</small></div></div><div class="tiny muted">LCP: '+fmt382p(m.lcpMobile,0)+' ms mobile · '+fmt382p(m.lcpDesktop,0)+' ms desktop<br>CLS: '+fmt382p(m.clsMobile,3)+' mobile · '+fmt382p(m.clsDesktop,3)+' desktop</div></div>'+
      '</div>'+
      '<div class="grid2">'+
        '<div class="card"><div class="eyebrow">DESTAQUES</div><h3>O que melhorou</h3>'+(r.highlights?.length?'<ul class="seo382p-list">'+r.highlights.map(x=>'<li>'+e382p(x)+'</li>').join('')+'</ul>':'<p class="muted">Nenhum destaque registrado.</p>')+'</div>'+
        '<div class="card"><div class="eyebrow">PRÓXIMAS AÇÕES</div><h3>Plano do próximo período</h3>'+(r.nextActions?.length?'<ul class="seo382p-list">'+r.nextActions.map(x=>'<li>'+e382p(x)+'</li>').join('')+'</ul>':'<p class="muted">Nenhuma ação registrada.</p>')+'</div>'+
      '</div>'+
      '<div class="card"><div class="card-head"><div><div class="eyebrow">PALAVRAS-CHAVE</div><h3>Posicionamento monitorado</h3></div><span class="status">'+kw.length+' termo(s)</span></div>'+
        (kw.length?'<div class="table-wrap"><table class="table seo382p-table"><thead><tr><th>Palavra-chave</th><th>Posição</th><th>Anterior</th><th>Variação</th><th>Cliques</th><th>Impressões</th><th>Página</th></tr></thead><tbody>'+kw.map(k=>'<tr><td><b>'+e382p(k.keyword)+'</b></td><td>'+fmt382p(k.position,1)+'</td><td>'+fmt382p(k.previousPosition,1)+'</td><td class="'+(Number(k.previousPosition)-Number(k.position)>0?'seo382p-up':'')+'">'+e382p(delta382p(k))+'</td><td>'+fmt382p(k.clicks)+'</td><td>'+fmt382p(k.impressions)+'</td><td><span class="tiny">'+e382p(k.landingPage||'—')+'</span></td></tr>').join('')+'</tbody></table></div>':'<div class="empty">Nenhuma palavra-chave adicionada.</div>')+
      '</div>'+
      '<div class="card"><div class="eyebrow">SEO LOCAL</div><h3>Presença local</h3><div class="seo382p-local"><div><span>Avaliação Google</span><b>'+fmt382p(m.localRating,1)+'</b></div><div><span>Avaliações</span><b>'+fmt382p(m.localReviews)+'</b></div><div><span>Usuários</span><b>'+fmt382p(m.users)+'</b></div><div><span>Conversões</span><b>'+fmt382p(m.conversions)+'</b></div></div></div>'+
    '</div>';
  }

  function seoPage382(){
    const id=P.seoSelected||'',r=id?report382p(id):null;
    return r?detailPage382(r):listPage382();
  }
  window.printSeo382=function(){window.print()};

  render=function(){
    ensureSeoNav382();
    if(P.page==='seo'){
      nav();document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page==='seo'));
      if(P.seoReports===undefined&&!SEO382P.loading){$('main').innerHTML='<div class="card empty">Carregando relatórios...</div>';setTimeout(()=>loadSeoPortal382(true).then(()=>render()),0);return}
      $('clientChip').textContent=P.data?.client?.name||'';$('userChip').textContent=P.data?.user?.username+' · '+roleLabel(P.data?.user?.role);
      $('main').innerHTML=seoPage382();return;
    }
    baseRender382();
  };

  setTimeout(async()=>{ensureSeoNav382();if(P.data){await loadSeoPortal382(false);if(P.page==='dashboard')render()}},900);
})();
