(function(){
  'use strict';

  let activeProspectTab='maps';

  function cloudPhoneDigits(v){return String(v||'').replace(/\D/g,'')}
  function cloudWaNumber(x){let d=cloudPhoneDigits(x?.phone||'');if(!d)return'';if(d.length===10||d.length===11)d='55'+d;return d}
  function cloudNorm(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
  function cloudLeadScore(x){let s=28;if(x.phone)s+=22;if(x.website)s+=16;if(Number(x.rating||0)>=4)s+=12;if(Number(x.reviews||0)>=10)s+=8;if(Number(x.reviews||0)>=50)s+=6;if(x.photoName)s+=5;if(x.openNow===true)s+=3;return Math.max(35,Math.min(96,s))}
  function cloudExistingLead(x){
    const p=cloudPhoneDigits(x.phone);const n=cloudNorm(x.name),a=cloudNorm(x.address);
    return rows('lead').find(r=>{const y=r.payload||{};if(x.placeId&&y.placeId&&x.placeId===y.placeId)return true;const yp=cloudPhoneDigits(y.phone||y.whatsapp);if(p.length>=10&&yp.length>=10&&p===yp)return true;return n&&a&&n===cloudNorm(y.name||y.companyName)&&a===cloudNorm(y.address)})||null;
  }
  function cloudSearchCsvName(){const q=String(S.prospect?.query||'pesquisa').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,55)||'pesquisa';return 'exe_pro_'+q+'_'+new Date().toISOString().slice(0,10)+'.csv'}
  function cloudCsv(rowsData){
    if(!rowsData.length){toast('Não há resultados para exportar.');return false}
    const headers=['Empresa','Telefone','Endereço','Site','Categoria','Avaliação','Qtd Avaliações','Google Maps','Origem','Place ID'];
    const values=rowsData.map(x=>[x.name||'',x.phone||'',x.address||'',x.website||'',x.category||'',x.rating||0,x.reviews||0,x.mapsUrl||'',x.source||'Google Maps',x.placeId||'']);
    const enc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const csv='\ufeff'+[headers,...values].map(r=>r.map(enc).join(';')).join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=cloudSearchCsvName();a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return true;
  }
  function cloudLeadPayload(x){return{name:x.name,companyName:x.name,address:x.address,phone:x.phone,whatsapp:x.phone,website:x.website,source:'Google Maps',placeId:x.placeId,segment:x.segment,city:x.city,state:x.state,crmStatus:'Novo',notes:`Prospectado via EXE PRO Cloud · ${S.prospect?.query||''}`}}
  async function cloudCreateLead(x){return api('/api/web/entity',{method:'POST',body:JSON.stringify({entityType:'lead',payload:cloudLeadPayload(x)})})}

  window.cloudProspectTab=function(tab){activeProspectTab=tab;const box=document.getElementById('prospectResults');if(box)box.innerHTML=renderProspectResults()};
  window.cloudExportCurrentMaps=function(){cloudCsv(S.prospect?.results?.maps||[])};
  window.cloudSaveAllProspects=async function(downloadAfter=false){
    const maps=S.prospect?.results?.maps||[];if(!maps.length)return toast('Não há empresas do Maps para salvar.');
    let added=0,skipped=0,failed=0;toast('Salvando resultados no CRM...');
    for(const x of maps){
      if(cloudExistingLead(x)){skipped++;continue}
      try{await cloudCreateLead(x);added++}catch(e){failed++}
    }
    await refreshAll(false,true);const box=document.getElementById('prospectResults');if(box)box.innerHTML=renderProspectResults();
    toast(`${added} novo(s) lead(s) salvo(s) · ${skipped} já existente(s)${failed?' · '+failed+' falha(s)':''}.`,5000);
    if(downloadAfter)cloudCsv(maps);
  };

  window.saveProspect=async function(i){
    const x=S.prospect?.results?.maps?.[i];if(!x)return;
    if(cloudExistingLead(x)){toast('Esta empresa já está no CRM.');return}
    try{await cloudCreateLead(x);toast('Lead salvo no CRM.');await refreshAll(false,true);const box=document.getElementById('prospectResults');if(box)box.innerHTML=renderProspectResults()}catch(e){toast(e.message,5000)}
  };

  window.renderProspectResults=function(){
    if(!S.prospect)return '<div class="card prospect364-empty">Faça uma pesquisa para ver empresas, fotos e canais.</div>';
    const maps=S.prospect.results?.maps||[],google=S.prospect.results?.google||[],instagram=S.prospect.results?.instagram||[],facebook=S.prospect.results?.facebook||[];
    const counts={maps:maps.length,google:google.length,instagram:instagram.length,facebook:facebook.length};
    const tabs=`<div class="prospect364-tabs"><button class="prospect364-tab ${activeProspectTab==='maps'?'active':''}" onclick="cloudProspectTab('maps')">Empresas / Maps <b>${counts.maps}</b></button><button class="prospect364-tab ${activeProspectTab==='google'?'active':''}" onclick="cloudProspectTab('google')">Google <b>${counts.google}</b></button><button class="prospect364-tab ${activeProspectTab==='instagram'?'active':''}" onclick="cloudProspectTab('instagram')">Instagram <b>${counts.instagram}</b></button><button class="prospect364-tab ${activeProspectTab==='facebook'?'active':''}" onclick="cloudProspectTab('facebook')">Facebook <b>${counts.facebook}</b></button></div>`;
    const warning=S.prospect.warnings?.length?`<div class="notice prospect364-warning">${esc(S.prospect.warnings.join(' | '))}</div>`:'';
    if(activeProspectTab!=='maps'){
      const items=activeProspectTab==='google'?google:activeProspectTab==='instagram'?instagram:facebook;
      return `${warning}${tabs}<div class="prospect364-web-grid">${items.length?items.map(x=>{let host='';try{host=new URL(x.link||'').hostname.replace(/^www\./,'')}catch{}return `<article class="prospect364-web-card"><div class="prospect364-web-top"><span>${esc(activeProspectTab.toUpperCase())}</span><small>${esc(host||'resultado web')}</small></div><h3>${esc(x.name||'Resultado')}</h3><p>${esc(x.snippet||'')}</p>${x.link?`<a class="btn sm" target="_blank" rel="noopener" href="${esc(x.link)}">Abrir fonte</a>`:''}</article>`}).join(''):'<div class="card prospect364-empty">Nenhum resultado desta fonte.</div>'}</div>`;
    }
    const existingCount=maps.filter(cloudExistingLead).length;
    const toolbar=`<div class="prospect364-toolbar"><div><strong>${maps.length} empresa(s) exibida(s) · Maps</strong><span>${existingCount} já salva(s) no CRM · ${Math.max(0,maps.length-existingCount)} nova(s)</span><em>${esc(S.prospect.query||'')}</em></div><div class="prospect364-toolbar-actions"><button class="btn sm" onclick="cloudSaveAllProspects(false)">+ Salvar todos</button><button class="btn sm primary" onclick="cloudSaveAllProspects(true)">Salvar todos + CSV</button><button class="btn sm" onclick="cloudExportCurrentMaps()">↓ CSV</button></div></div>`;
    const grid=maps.length?`<div class="prospect364-grid">${maps.map((x,i)=>{const saved=!!cloudExistingLead(x),score=cloudLeadScore(x),wa=cloudWaNumber(x),photo=x.photoName?`/api/web/place-photo?name=${encodeURIComponent(x.photoName)}`:'';const category=x.category||'Empresa';const status=x.openNow===true?'Aberto agora':x.openNow===false?'Fechado agora':'Empresa';return `<article class="prospect364-card"><div class="prospect364-media">${photo?`<img loading="lazy" src="${photo}" alt="${esc(x.name||'Empresa')}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="prospect364-placeholder" style="display:none">Imagem indisponível</div>${x.photoAttribution?`<span class="prospect364-credit">Foto: ${esc(x.photoAttribution)}</span>`:''}`:'<div class="prospect364-placeholder">Sem imagem no Google Maps</div>'}<span class="prospect364-source">M · MAPS</span><span class="prospect364-score">${score}% lead</span></div><div class="prospect364-content"><h3>${esc(x.name||'Sem nome')}</h3><div class="prospect364-sub">${esc(category)} · <span>${esc(status)}</span>${saved?' · <b>Salvo no CRM</b>':''}${wa?' · <b>WhatsApp provável</b>':''}</div><div class="prospect364-address">⌖ <span>${esc(x.address||'Endereço não informado')}</span></div><div class="prospect364-info"><div><label>Contato</label><strong>${esc(x.phone||'Sem telefone')}</strong></div><div><label>Avaliação</label><strong>★ ${Number(x.rating||0).toFixed(1)} <small>(${Number(x.reviews||0)})</small></strong></div><div><label>Presença digital</label><strong>${x.website?'Site':'—'}</strong></div></div><div class="prospect364-links">${x.website?`<a class="btn sm" target="_blank" rel="noopener" href="${esc(x.website)}">Site</a>`:''}${x.mapsUrl?`<a class="btn sm" target="_blank" rel="noopener" href="${esc(x.mapsUrl)}">Maps</a>`:''}<a class="btn sm" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent([x.name,x.address].filter(Boolean).join(' '))}">Google</a></div><div class="prospect364-actions">${wa?`<button class="btn sm" onclick="openWaNumber('${esc(x.phone)}','${esc(x.name)}')">WhatsApp</button>`:''}<button class="btn sm ${saved?'':'primary'}" onclick="saveProspect(${i})">${saved?'✓ Já salvo':'+ Salvar lead'}</button></div></div></article>`}).join('')}</div>`:'<div class="card prospect364-empty">Nenhuma empresa encontrada no Maps.</div>';
    return `${warning}${tabs}${toolbar}${grid}`;
  };
})();
