
// --- EXE PRO 3.9.0: Core Stability & Consolidation ---
const CORE_VERSION='3.9.0';
const CORE_INSTANCE_ID=(String(process.env.HOSTNAME||'node').slice(0,40)+'-'+process.pid+'-'+crypto.randomBytes(5).toString('hex')).slice(0,96);
const CORE_MODULES=[
  {key:'crm',name:'CRM / Sync Core',version:'3.6.9',critical:true},
  {key:'notifications',name:'Notificacoes',version:'3.6.7',critical:true},
  {key:'wordpress',name:'WordPress Client Control',version:'3.7.1',critical:true},
  {key:'portal',name:'Portal do Cliente',version:'3.8.3',critical:true},
  {key:'seo',name:'Relatorios SEO',version:'3.8.2',critical:false},
  {key:'billing',name:'Financeiro Recorrente',version:'3.8.4',critical:true}
];
const CORE_REQUIRED_TABLES=[
  'entities','changes','cloud_users','notification_outbox','wordpress_sites',
  'portal_users','portal_tickets','portal_files','portal_documents','portal_document_decisions',
  'seo_reports','billing_profiles','billing_invoices','billing_payments',
  'core_schema_versions','core_job_locks','core_job_runs','core_runtime_events'
];

function coreSafeJson(v,fallback={}){
  if(v===null||v===undefined)return fallback;
  if(typeof v==='string'){try{return JSON.parse(v)}catch{return fallback}}
  return v;
}
function coreClean(v,max=1200){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
async function coreEvent(severity,source,message,detail){
  try{
    await pool.query(
      'INSERT INTO core_runtime_events(event_id,severity,source,message,detail_json,created_at) VALUES($1,$2,$3,$4,$5::jsonb,$6)',
      [crypto.randomUUID(),coreClean(severity||'info',20),coreClean(source||'core',80),coreClean(message||'',1200),JSON.stringify(detail||{}),nowIso()]
    );
  }catch(e){console.error('Core event:',e.message)}
}
async function coreAcquireJobLock(jobKey,ttlMs){
  const token=crypto.randomUUID(),now=nowIso(),until=new Date(Date.now()+Math.max(30000,Number(ttlMs||60000))).toISOString();
  const q=await pool.query(
    "INSERT INTO core_job_locks(job_key,lock_token,locked_until,updated_at) VALUES($1,$2,$3,$4) "+
    "ON CONFLICT(job_key) DO UPDATE SET lock_token=EXCLUDED.lock_token,locked_until=EXCLUDED.locked_until,updated_at=EXCLUDED.updated_at "+
    "WHERE core_job_locks.locked_until<EXCLUDED.updated_at RETURNING job_key",
    [jobKey,token,until,now]
  );
  return q.rowCount?{token,until}:null;
}
async function coreReleaseJobLock(jobKey,token){
  await pool.query('DELETE FROM core_job_locks WHERE job_key=$1 AND lock_token=$2',[jobKey,token]);
}
async function coreRunResult(jobKey,manual){
  if(jobKey==='notifications'){
    const config=await getNotifyConfig();
    if(!manual&&!config.autoSend)return{skipped:true,reason:'Envio automatico desativado.'};
    const plan=await notificationPlan();
    const send=await notificationSend({dueOnly:true,limit:50});
    return{plan,send};
  }
  if(jobKey==='wordpress'){
    return await wpCtrlEvaluate(!!manual);
  }
  if(jobKey==='billing'){
    return await billingGenerate({period:billingCurrentPeriod()},manual?'core-manual':'billing-engine',true);
  }
  throw new Error('Job de Core desconhecido: '+jobKey);
}
async function coreRunScheduled(jobKey,ttlMs,manual=false,actor='scheduler'){
  const lock=await coreAcquireJobLock(jobKey,ttlMs);
  if(!lock)return{ok:true,skipped:true,reason:'Outro processo ja esta executando este job.'};
  const runId=crypto.randomUUID(),started=Date.now(),startedAt=nowIso();
  await pool.query(
    "INSERT INTO core_job_runs(run_id,job_key,instance_id,status,started_at,result_json) VALUES($1,$2,$3,'Executando',$4,'{}'::jsonb)",
    [runId,jobKey,CORE_INSTANCE_ID,startedAt]
  );
  try{
    const result=await coreRunResult(jobKey,manual);
    const finished=nowIso(),duration=Date.now()-started;
    await pool.query(
      "UPDATE core_job_runs SET status=$1,finished_at=$2,duration_ms=$3,result_json=$4::jsonb,error_text=NULL WHERE run_id=$5",
      [result?.skipped?'Ignorado':'Concluido',finished,duration,JSON.stringify(result||{}),runId]
    );
    if(manual)await coreEvent('info','job:'+jobKey,'Execucao manual concluida',{actor,runId,durationMs:duration});
    return{ok:true,runId,result};
  }catch(e){
    const finished=nowIso(),duration=Date.now()-started,error=coreClean(e.message||e,1000);
    await pool.query(
      "UPDATE core_job_runs SET status='Falhou',finished_at=$1,duration_ms=$2,error_text=$3 WHERE run_id=$4",
      [finished,duration,error,runId]
    );
    await coreEvent('error','job:'+jobKey,'Job falhou',{actor,runId,error});
    throw e;
  }finally{
    try{await coreReleaseJobLock(jobKey,lock.token)}catch{}
  }
}
async function coreTableHealth(){
  const out=[];
  for(const table of CORE_REQUIRED_TABLES){
    const r=await one(pool,'SELECT to_regclass($1) AS name',['public.'+table]);
    out.push({table,ok:!!r?.name});
  }
  return out;
}
async function coreStatus(){
  const now=nowIso();
  const db=await one(pool,'SELECT current_database() AS name,pg_database_size(current_database())::bigint AS size,version() AS server_version');
  const [entityCounts,changeSeq,installs,webSessions,portalSessions,notifyCounts,wpCounts,ticketCounts,seoCounts,billingCounts,fileBytes,locks,runs,events,schemaVersions]=await Promise.all([
    rows(pool,"SELECT entity_type,COUNT(*)::int AS n,COUNT(*) FILTER(WHERE deleted=FALSE)::int AS active FROM entities GROUP BY entity_type ORDER BY entity_type"),
    one(pool,'SELECT COALESCE(MAX(seq),0)::bigint AS seq,COUNT(*)::bigint AS n FROM changes'),
    one(pool,'SELECT COUNT(*)::int AS n,MAX(last_seen_at) AS last_seen FROM installations'),
    one(pool,'SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE expires_at<=$1)::int AS expired FROM web_sessions',[now]),
    one(pool,'SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE expires_at<=$1)::int AS expired FROM portal_sessions',[now]),
    one(pool,"SELECT COUNT(*) FILTER(WHERE status='Pendente')::int AS pending,COUNT(*) FILTER(WHERE status='Falhou')::int AS failed,COUNT(*) FILTER(WHERE status='Enviado')::int AS sent FROM notification_outbox"),
    one(pool,"SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='Erro')::int AS errors,COUNT(*) FILTER(WHERE remote_suspended=TRUE)::int AS suspended FROM wordpress_sites"),
    one(pool,"SELECT COUNT(*) FILTER(WHERE status NOT IN ('Resolvido','Fechado'))::int AS open,COUNT(*)::int AS total FROM portal_tickets"),
    one(pool,"SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='Publicado')::int AS published FROM seo_reports"),
    one(pool,"SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE auto_generate=TRUE AND enabled=TRUE)::int AS automatic FROM billing_profiles"),
    one(pool,"SELECT COALESCE(SUM(byte_size),0)::bigint AS bytes,COUNT(*)::int AS files FROM portal_files"),
    rows(pool,'SELECT job_key,locked_until,updated_at FROM core_job_locks WHERE locked_until>$1 ORDER BY job_key',[now]),
    rows(pool,'SELECT run_id,job_key,status,started_at,finished_at,duration_ms,result_json,error_text FROM core_job_runs ORDER BY started_at DESC LIMIT 30'),
    rows(pool,'SELECT severity,source,message,detail_json,created_at FROM core_runtime_events ORDER BY created_at DESC LIMIT 30'),
    rows(pool,'SELECT version,description,applied_at FROM core_schema_versions ORDER BY applied_at DESC LIMIT 20')
  ]);
  const tables=await coreTableHealth();
  const missingTables=tables.filter(x=>!x.ok).map(x=>x.table);
  let notificationInfo={integrations:{whatsappConfigured:false,telegramConfigured:false}};
  try{notificationInfo=await publicNotifyConfig()}catch{}
  let seoInfo={pageSpeedKeyConfigured:false};
  try{seoInfo=await seoConfigView()}catch{}
  const moduleState=CORE_MODULES.map(m=>({...m,ok:true}));
  if(missingTables.length)for(const m of moduleState)if(m.critical)m.ok=false;
  const security={
    httpsRequired:String(process.env.EXE_CLOUD_REQUIRE_HTTPS||'').toLowerCase()!=='0',
    cloudKeyConfigured:!!process.env.EXE_CLOUD_KEY,
    secretKeyConfigured:!!process.env.EXE_CLOUD_SECRET_KEY,
    dbSslRequested:['1','true','yes','on','require'].includes(String(process.env.EXE_CLOUD_DB_SSL||process.env.PGSSLMODE||'').toLowerCase())
  };
  return{
    ok:missingTables.length===0,
    version:CORE_VERSION,
    instanceId:CORE_INSTANCE_ID,
    time:now,
    database:{name:db?.name||'',sizeBytes:Number(db?.size||0),serverVersion:String(db?.server_version||'').slice(0,180),tables,missingTables},
    modules:moduleState,
    security,
    integrations:{
      whatsappConfigured:!!notificationInfo?.integrations?.whatsappConfigured,
      telegramConfigured:!!notificationInfo?.integrations?.telegramConfigured,
      pageSpeedKeyConfigured:!!seoInfo?.pageSpeedKeyConfigured
    },
    sync:{entities:entityCounts,changes:Number(changeSeq?.n||0),lastSeq:Number(changeSeq?.seq||0),installations:Number(installs?.n||0),lastInstallationSeen:installs?.last_seen||null},
    sessions:{webTotal:Number(webSessions?.total||0),webExpired:Number(webSessions?.expired||0),portalTotal:Number(portalSessions?.total||0),portalExpired:Number(portalSessions?.expired||0)},
    notifications:{pending:Number(notifyCounts?.pending||0),failed:Number(notifyCounts?.failed||0),sent:Number(notifyCounts?.sent||0)},
    wordpress:{total:Number(wpCounts?.total||0),errors:Number(wpCounts?.errors||0),suspended:Number(wpCounts?.suspended||0)},
    portal:{ticketsTotal:Number(ticketCounts?.total||0),ticketsOpen:Number(ticketCounts?.open||0),files:Number(fileBytes?.files||0),fileBytes:Number(fileBytes?.bytes||0)},
    seo:{reports:Number(seoCounts?.total||0),published:Number(seoCounts?.published||0)},
    billing:{profiles:Number(billingCounts?.total||0),automatic:Number(billingCounts?.automatic||0)},
    jobs:{activeLocks:locks,recent:runs.map(x=>({...x,result:coreSafeJson(x.result_json,{})}))},
    events:events.map(x=>({...x,detail:coreSafeJson(x.detail_json,{})})),
    schemaVersions
  };
}
async function coreCleanup(username){
  const now=nowIso(),old30=new Date(Date.now()-30*86400000).toISOString(),old90=new Date(Date.now()-90*86400000).toISOString();
  return withTransaction(pool,async client=>{
    const a=await client.query('DELETE FROM web_sessions WHERE expires_at<=$1',[now]);
    const b=await client.query('DELETE FROM portal_sessions WHERE expires_at<=$1',[now]);
    const c=await client.query("DELETE FROM web_login_guard WHERE updated_at<$1 AND (blocked_until IS NULL OR blocked_until<$2)",[old30,now]);
    const d=await client.query("DELETE FROM portal_login_guard WHERE updated_at<$1 AND (blocked_until IS NULL OR blocked_until<$2)",[old30,now]);
    const e=await client.query('DELETE FROM core_job_runs WHERE started_at<$1',[old90]);
    const f=await client.query('DELETE FROM core_runtime_events WHERE created_at<$1',[old90]);
    return{ok:true,webSessions:a.rowCount,portalSessions:b.rowCount,webGuards:c.rowCount,portalGuards:d.rowCount,jobRuns:e.rowCount,events:f.rowCount,by:username};
  });
}
async function coreStartupRecord(){
  try{
    const status=await coreStatus();
    await coreEvent(status.ok?'info':'warn','startup','EXE PRO Core iniciado',{
      version:CORE_VERSION,
      missingTables:status.database.missingTables,
      database:status.database.name
    });
  }catch(e){
    console.error('Core startup check:',e.message);
  }
}
