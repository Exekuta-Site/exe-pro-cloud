
// --- EXE PRO 3.8.2: Relatorios SEO + Portal ---
const SEO_REPORT_STATUS=new Set(['Rascunho','Publicado']);
const SEO_STRATEGIES=new Set(['mobile','desktop']);

function seoClean(v,max=500){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
function seoNum(v){
  const n=Number(v);return Number.isFinite(n)?n:0;
}
function seoNullableNum(v){
  if(v===null||v===undefined||v==='')return null;
  const n=Number(v);return Number.isFinite(n)?n:null;
}
function seoDate(v){
  const s=String(v||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';
}
function seoList(v,maxItems=20,maxLen=600){
  const a=Array.isArray(v)?v:String(v||'').split(/\r?\n/);
  return a.map(x=>seoClean(x,maxLen)).filter(Boolean).slice(0,maxItems);
}
function seoMetrics(v){
  const x=v&&typeof v==='object'?v:{};
  return{
    organicClicks:seoNum(x.organicClicks),
    impressions:seoNum(x.impressions),
    ctr:seoNum(x.ctr),
    avgPosition:seoNum(x.avgPosition),
    sessions:seoNum(x.sessions),
    users:seoNum(x.users),
    conversions:seoNum(x.conversions),
    keywordsTop10:seoNum(x.keywordsTop10),
    localRating:seoNum(x.localRating),
    localReviews:seoNum(x.localReviews),
    pagespeedMobile:seoNum(x.pagespeedMobile),
    pagespeedDesktop:seoNum(x.pagespeedDesktop),
    lcpMobile:seoNullableNum(x.lcpMobile),
    lcpDesktop:seoNullableNum(x.lcpDesktop),
    clsMobile:seoNullableNum(x.clsMobile),
    clsDesktop:seoNullableNum(x.clsDesktop),
    inpMobile:seoNullableNum(x.inpMobile),
    inpDesktop:seoNullableNum(x.inpDesktop)
  };
}
function seoNormalizePublicUrl(raw){
  let u;
  try{u=new URL(String(raw||'').trim())}catch{return''}
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return'';
  const h=String(u.hostname||'').toLowerCase();
  if(!h||h==='localhost'||h.endsWith('.local')||h.endsWith('.internal'))return'';
  if(/^\d+\.\d+\.\d+\.\d+$/.test(h)){
    const p=h.split('.').map(Number);
    if(p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168))return'';
  }
  if(h==='::1'||h.startsWith('fc')||h.startsWith('fd')||h.startsWith('fe80:'))return'';
  u.hash='';
  return u.toString();
}
function seoKeywordNormalize(k,leadId,reportId){
  return{
    keywordId:validId(k?.keywordId,180)||crypto.randomUUID(),
    reportId,
    leadId,
    keyword:seoClean(k?.keyword,220),
    position:seoNullableNum(k?.position),
    previousPosition:seoNullableNum(k?.previousPosition),
    clicks:Math.max(0,Math.round(seoNum(k?.clicks))),
    impressions:Math.max(0,Math.round(seoNum(k?.impressions))),
    landingPage:seoClean(k?.landingPage,900)
  };
}
async function seoKeywordsReplace(client,reportId,leadId,keywords){
  await client.query('DELETE FROM seo_keywords WHERE report_id=$1',[reportId]);
  const list=(Array.isArray(keywords)?keywords:[]).map(k=>seoKeywordNormalize(k,leadId,reportId)).filter(k=>k.keyword).slice(0,500);
  const now=nowIso();
  for(const k of list){
    await client.query('INSERT INTO seo_keywords(keyword_id,report_id,lead_id,keyword,position,previous_position,clicks,impressions,landing_page,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [k.keywordId,reportId,leadId,k.keyword,k.position,k.previousPosition,k.clicks,k.impressions,k.landingPage||null,now]);
  }
  return list.length;
}
async function seoKeywordRows(reportId){
  const rr=await rows(pool,'SELECT * FROM seo_keywords WHERE report_id=$1 ORDER BY position ASC NULLS LAST, clicks DESC, keyword ASC',[reportId]);
  return rr.map(r=>({
    keywordId:r.keyword_id,keyword:r.keyword,position:r.position===null?null:Number(r.position),
    previousPosition:r.previous_position===null?null:Number(r.previous_position),
    clicks:Number(r.clicks||0),impressions:Number(r.impressions||0),landingPage:r.landing_page||''
  }));
}
function seoReportDto(r,keywords){
  let metrics=r.metrics_json||{},highlights=r.highlights_json||[],next=r.next_actions_json||[];
  if(typeof metrics==='string'){try{metrics=JSON.parse(metrics)}catch{metrics={}}}
  if(typeof highlights==='string'){try{highlights=JSON.parse(highlights)}catch{highlights=[]}}
  if(typeof next==='string'){try{next=JSON.parse(next)}catch{next=[]}}
  return{
    reportId:r.report_id,leadId:r.lead_id,siteUrl:r.site_url||'',periodStart:r.period_start,periodEnd:r.period_end,
    periodLabel:r.period_label||'',status:r.status,metrics:seoMetrics(metrics),summary:r.summary||'',
    highlights:Array.isArray(highlights)?highlights:[],nextActions:Array.isArray(next)?next:[],
    publishedAt:r.published_at||null,createdAt:r.created_at,updatedAt:r.updated_at,updatedBy:r.updated_by||'',
    client:r.lead_payload?portalPayload({payload_json:r.lead_payload}):undefined,
    keywords:Array.isArray(keywords)?keywords:[]
  };
}
async function seoReportOne(reportId){
  const r=await one(pool,"SELECT s.*,e.payload_json AS lead_payload FROM seo_reports s LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=s.lead_id WHERE s.report_id=$1",[reportId]);
  if(!r)return null;
  return seoReportDto(r,await seoKeywordRows(reportId));
}
async function seoReportsList(leadId='',publishedOnly=false){
  const args=[];let where=[];
  if(leadId){args.push(leadId);where.push('s.lead_id=$'+args.length)}
  if(publishedOnly)where.push("s.status='Publicado'");
  const sql="SELECT s.*,e.payload_json AS lead_payload FROM seo_reports s LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=s.lead_id "+(where.length?'WHERE '+where.join(' AND '):'')+" ORDER BY s.period_end DESC,s.updated_at DESC LIMIT 500";
  const rr=await rows(pool,sql,args),out=[];
  for(const r of rr)out.push(seoReportDto(r,await seoKeywordRows(r.report_id)));
  return out;
}
async function seoReportSave(body,username){
  const id=validId(body.reportId,180)||crypto.randomUUID(),leadId=validId(body.leadId,180);
  const start=seoDate(body.periodStart),end=seoDate(body.periodEnd);
  if(!leadId||!start||!end)return{status:400,body:{ok:false,error:'Cliente e periodo do relatorio sao obrigatorios.'}};
  if(start>end)return{status:400,body:{ok:false,error:'O inicio do periodo nao pode ser posterior ao fim.'}};
  const lead=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
  if(!lead)return{status:404,body:{ok:false,error:'Cliente nao encontrado.'}};
  const lp=portalPayload(lead);
  if(!(lp.crmStatus==='Cliente'||lp.clientSince))return{status:400,body:{ok:false,error:'Relatorios SEO so podem ser vinculados a Clientes.'}};
  const existing=body.reportId?await one(pool,'SELECT * FROM seo_reports WHERE report_id=$1',[id]):null;
  const status=SEO_REPORT_STATUS.has(String(body.status||''))?String(body.status):existing?.status||'Rascunho';
  const siteUrl=seoNormalizePublicUrl(body.siteUrl)||seoClean(body.siteUrl,900);
  const periodLabel=seoClean(body.periodLabel,120)||start.slice(0,7);
  const metrics=seoMetrics(body.metrics),summary=seoClean(body.summary,6000),highlights=seoList(body.highlights,20,600),nextActions=seoList(body.nextActions,20,600);
  const now=nowIso(),publishedAt=status==='Publicado'?(existing?.published_at||now):null;
  await withTransaction(pool,async client=>{
    if(existing){
      await client.query('UPDATE seo_reports SET lead_id=$1,site_url=$2,period_start=$3,period_end=$4,period_label=$5,status=$6,metrics_json=$7::jsonb,summary=$8,highlights_json=$9::jsonb,next_actions_json=$10::jsonb,published_at=$11,updated_at=$12,updated_by=$13 WHERE report_id=$14',
        [leadId,siteUrl||null,start,end,periodLabel,status,JSON.stringify(metrics),summary,JSON.stringify(highlights),JSON.stringify(nextActions),publishedAt,now,username,id]);
    }else{
      await client.query('INSERT INTO seo_reports(report_id,lead_id,site_url,period_start,period_end,period_label,status,metrics_json,summary,highlights_json,next_actions_json,published_at,created_at,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11::jsonb,$12,$13,$13,$14)',
        [id,leadId,siteUrl||null,start,end,periodLabel,status,JSON.stringify(metrics),summary,JSON.stringify(highlights),JSON.stringify(nextActions),publishedAt,now,username]);
    }
    await seoKeywordsReplace(client,id,leadId,body.keywords);
  });
  return{status:200,body:{ok:true,report:await seoReportOne(id),reports:await seoReportsList('')}};
}
async function seoReportRemove(body){
  const id=validId(body.reportId,180);if(!id)return{status:400,body:{ok:false,error:'Relatorio invalido.'}};
  await withTransaction(pool,async client=>{
    await client.query('DELETE FROM seo_keywords WHERE report_id=$1',[id]);
    await client.query('DELETE FROM seo_reports WHERE report_id=$1',[id]);
  });
  return{status:200,body:{ok:true,reports:await seoReportsList('')}};
}
async function seoPageSpeedRun(body,username){
  const leadId=validId(body.leadId,180),strategy=SEO_STRATEGIES.has(String(body.strategy||'').toLowerCase())?String(body.strategy).toLowerCase():'mobile';
  const siteUrl=seoNormalizePublicUrl(body.siteUrl);
  if(!leadId||!siteUrl)throw new Error('Cliente e URL publica do site sao obrigatorios.');
  const lead=await one(pool,"SELECT entity_id FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
  if(!lead)throw new Error('Cliente nao encontrado.');
  const key=await getSecret('googlePageSpeedApiKey');
  const q=new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  q.searchParams.set('url',siteUrl);q.searchParams.set('strategy',strategy);q.searchParams.set('category','PERFORMANCE');
  if(key)q.searchParams.set('key',key);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  let j;
  try{
    const res=await fetch(q,{signal:controller.signal,headers:{'accept':'application/json','user-agent':'EXE-PRO-Cloud/3.8.2'}});
    j=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error('PageSpeed HTTP '+res.status+': '+seoClean(j?.error?.message||'falha ao consultar o Google',300));
  }finally{clearTimeout(timer)}
  const audits=j?.lighthouseResult?.audits||{},cat=j?.lighthouseResult?.categories?.performance;
  const score=Math.round(seoNum(cat?.score)*100);
  const lcp=seoNullableNum(audits['largest-contentful-paint']?.numericValue);
  const cls=seoNullableNum(audits['cumulative-layout-shift']?.numericValue);
  const inp=seoNullableNum(audits['interaction-to-next-paint']?.numericValue);
  const runId=crypto.randomUUID(),now=nowIso();
  await pool.query('INSERT INTO seo_pagespeed_runs(run_id,lead_id,site_url,strategy,performance_score,lcp_ms,cls,inp_ms,raw_json,created_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)',
    [runId,leadId,siteUrl,strategy,score,lcp,cls,inp,JSON.stringify({id:j?.id||siteUrl,analysisUTCTimestamp:j?.analysisUTCTimestamp||null,loadingExperience:j?.loadingExperience||null}),now,username]);
  return{ok:true,run:{runId,leadId,siteUrl,strategy,score,lcpMs:lcp,cls,inpMs:inp,createdAt:now}};
}
async function seoPageSpeedLatest(leadId){
  const rr=await rows(pool,'SELECT * FROM seo_pagespeed_runs WHERE lead_id=$1 ORDER BY created_at DESC LIMIT 20',[leadId]);
  return rr.map(r=>({runId:r.run_id,leadId:r.lead_id,siteUrl:r.site_url,strategy:r.strategy,score:Number(r.performance_score||0),lcpMs:r.lcp_ms===null?null:Number(r.lcp_ms),cls:r.cls===null?null:Number(r.cls),inpMs:r.inp_ms===null?null:Number(r.inp_ms),createdAt:r.created_at}));
}
async function seoConfigView(){
  return{ok:true,pageSpeedKeyConfigured:!!(await getSecret('googlePageSpeedApiKey'))};
}
async function seoPortalReports(session){
  const reports=await seoReportsList(session.leadId,true);
  return{ok:true,reports};
}
