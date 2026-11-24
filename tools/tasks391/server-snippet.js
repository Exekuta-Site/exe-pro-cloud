
// --- EXE PRO 3.9.1: Tarefas, Equipe e SLA ---
const TASK391_STATUS=new Set(['A fazer','Em andamento','Aguardando cliente','Bloqueada','Concluida','Cancelada']);
const TASK391_PRIORITY=new Set(['Baixa','Normal','Alta','Urgente']);
const TASK391_SLA_DEFAULT={
  enabled:true,
  hours:{Baixa:72,Normal:24,Alta:8,Urgente:4},
  warningPercent:25
};

function task391Clean(v,max=1200){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
function task391Status(v){
  const s=task391Clean(v,60).replace('Concluída','Concluida');
  return TASK391_STATUS.has(s)?s:'A fazer';
}
function task391Priority(v){
  const s=task391Clean(v,40);
  return TASK391_PRIORITY.has(s)?s:'Normal';
}
function task391Iso(v){
  const s=String(v||'').trim();
  if(!s)return'';
  const d=new Date(s);
  return Number.isNaN(d.getTime())?'':d.toISOString();
}
function task391Payload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function task391SlaConfigNormalize(v){
  const raw=v&&typeof v==='object'?v:{},hours=raw.hours&&typeof raw.hours==='object'?raw.hours:{};
  return{
    enabled:raw.enabled!==false,
    hours:{
      Baixa:Math.max(1,Math.min(720,Number(hours.Baixa??TASK391_SLA_DEFAULT.hours.Baixa)||72)),
      Normal:Math.max(1,Math.min(720,Number(hours.Normal??TASK391_SLA_DEFAULT.hours.Normal)||24)),
      Alta:Math.max(1,Math.min(720,Number(hours.Alta??TASK391_SLA_DEFAULT.hours.Alta)||8)),
      Urgente:Math.max(1,Math.min(720,Number(hours.Urgente??TASK391_SLA_DEFAULT.hours.Urgente)||4))
    },
    warningPercent:Math.max(5,Math.min(90,Number(raw.warningPercent??TASK391_SLA_DEFAULT.warningPercent)||25))
  };
}
async function task391SlaConfig(){
  return task391SlaConfigNormalize(await settingValue('task_sla_config',TASK391_SLA_DEFAULT));
}
function task391SlaDue(createdAt,priority,config){
  if(!config?.enabled)return'';
  const start=new Date(createdAt||Date.now());
  if(Number.isNaN(start.getTime()))return'';
  const hours=Number(config.hours?.[priority]||24);
  return new Date(start.getTime()+hours*3600000).toISOString();
}
function task391SlaState(task,config){
  const due=task.sla_due_at||'',created=task.created_at||'';
  if(!due||!config?.enabled)return{key:'Sem SLA',label:'Sem SLA',overdue:false,warning:false,remainingMinutes:null,elapsedPercent:null};
  const dueMs=Date.parse(due),createdMs=Date.parse(created),doneMs=task.completed_at?Date.parse(task.completed_at):0,now=Date.now();
  if(!Number.isFinite(dueMs))return{key:'Sem SLA',label:'Sem SLA',overdue:false,warning:false,remainingMinutes:null,elapsedPercent:null};
  const closed=['Concluida','Cancelada'].includes(task.status);
  const end=closed&&doneMs?doneMs:now;
  const remaining=Math.round((dueMs-end)/60000);
  if(closed){
    const late=doneMs&&doneMs>dueMs;
    return{key:late?'Concluido fora do prazo':'Concluido no prazo',label:late?'Concluído fora do prazo':'Concluído no prazo',overdue:!!late,warning:false,remainingMinutes:remaining,elapsedPercent:100};
  }
  const total=Math.max(1,dueMs-createdMs),elapsed=Math.max(0,end-createdMs),pct=Math.max(0,Math.min(999,elapsed/total*100));
  if(end>dueMs)return{key:'Estourado',label:'SLA estourado',overdue:true,warning:false,remainingMinutes:remaining,elapsedPercent:pct};
  const warnAt=100-Number(config.warningPercent||25);
  if(pct>=warnAt)return{key:'Atencao',label:'SLA em atenção',overdue:false,warning:true,remainingMinutes:remaining,elapsedPercent:pct};
  return{key:'Dentro do prazo',label:'Dentro do prazo',overdue:false,warning:false,remainingMinutes:remaining,elapsedPercent:pct};
}
async function task391Checklist(taskId,portalOnly=false){
  const rr=await rows(pool,'SELECT * FROM task_checklist WHERE task_id=$1 '+(portalOnly?'AND portal_visible=TRUE ':'')+'ORDER BY sort_order ASC,created_at ASC',[taskId]);
  return rr.map(r=>({checklistId:r.checklist_id,label:r.label,done:!!r.done,portalVisible:r.portal_visible!==false,sortOrder:Number(r.sort_order||0),updatedAt:r.updated_at}));
}
async function task391Comments(taskId,portalOnly=false){
  const rr=await rows(pool,'SELECT * FROM task_comments WHERE task_id=$1 '+(portalOnly?"AND (portal_visible=TRUE OR author_type='Cliente') ":'')+'ORDER BY created_at ASC',[taskId]);
  return rr.map(r=>({commentId:r.comment_id,authorType:r.author_type,authorName:r.author_name||'',body:r.body,portalVisible:!!r.portal_visible,createdAt:r.created_at}));
}
async function task391TimeLogs(taskId){
  const rr=await rows(pool,'SELECT * FROM task_time_logs WHERE task_id=$1 ORDER BY worked_at DESC,created_at DESC',[taskId]);
  return rr.map(r=>({timeLogId:r.time_log_id,userName:r.user_name||'',minutes:Number(r.minutes||0),note:r.note||'',workedAt:r.worked_at,createdAt:r.created_at}));
}
function task391ProjectTitle(payload,id){
  const p=payload&&typeof payload==='object'?payload:{};
  return String(p.title||p.name||id||'Projeto');
}
async function task391TaskDto(r,config,portalOnly=false){
  const checklist=await task391Checklist(r.task_id,portalOnly),comments=await task391Comments(r.task_id,portalOnly);
  const timeLogs=portalOnly?[]:await task391TimeLogs(r.task_id);
  const done=checklist.filter(x=>x.done).length,total=checklist.length;
  return{
    taskId:r.task_id,leadId:r.lead_id||'',projectId:r.project_id||'',ticketId:r.ticket_id||'',
    title:r.title,description:r.description||'',status:r.status,priority:r.priority,assignedUser:r.assigned_user||'',
    dueAt:r.due_at||null,slaDueAt:r.sla_due_at||null,portalVisible:!!r.portal_visible,
    createdBy:r.created_by||'',createdAt:r.created_at,updatedAt:r.updated_at,completedAt:r.completed_at||null,
    client:r.lead_payload?task391Payload({payload_json:r.lead_payload}):undefined,
    project:r.project_payload?task391Payload({payload_json:r.project_payload}):undefined,
    ticket:r.ticket_subject?{subject:r.ticket_subject,status:r.ticket_status||''}:undefined,
    checklist,comments,timeLogs,
    checklistProgress:total?Math.round(done/total*100):0,
    timeMinutes:timeLogs.reduce((a,x)=>a+x.minutes,0),
    sla:task391SlaState(r,config)
  };
}
async function task391List(leadId='',portalOnly=false){
  const args=[];let where=[];
  if(leadId){args.push(leadId);where.push('t.lead_id=$'+args.length)}
  if(portalOnly)where.push('t.portal_visible=TRUE');
  const sql="SELECT t.*,l.payload_json AS lead_payload,p.payload_json AS project_payload,pt.subject AS ticket_subject,pt.status AS ticket_status "+
    "FROM task_items t "+
    "LEFT JOIN entities l ON l.entity_type='lead' AND l.entity_id=t.lead_id AND l.deleted=FALSE "+
    "LEFT JOIN entities p ON p.entity_type='project' AND p.entity_id=t.project_id AND p.deleted=FALSE "+
    "LEFT JOIN portal_tickets pt ON pt.ticket_id=t.ticket_id "+
    (where.length?'WHERE '+where.join(' AND '):'')+
    " ORDER BY CASE t.status WHEN 'Em andamento' THEN 1 WHEN 'Aguardando cliente' THEN 2 WHEN 'A fazer' THEN 3 WHEN 'Bloqueada' THEN 4 WHEN 'Concluida' THEN 5 ELSE 6 END, t.sla_due_at ASC NULLS LAST,t.updated_at DESC LIMIT 1000";
  const rr=await rows(pool,sql,args),config=await task391SlaConfig(),out=[];
  for(const r of rr)out.push(await task391TaskDto(r,config,portalOnly));
  return out;
}
async function task391Team(){
  const rr=await rows(pool,"SELECT user_id,username,role,last_login_at FROM cloud_users WHERE active=TRUE ORDER BY username_ci ASC");
  return rr.map(r=>({userId:r.user_id,username:r.username,role:r.role,lastLoginAt:r.last_login_at||null}));
}
async function task391Projects(leadId=''){
  const args=[];let sql="SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='project' AND deleted=FALSE";
  if(leadId){args.push(leadId);sql+=" AND payload_json->>'leadId'=$1"}
  sql+=" ORDER BY updated_at DESC LIMIT 500";
  const rr=await rows(pool,sql,args);
  return rr.map(r=>{const p=task391Payload(r);return{projectId:r.entity_id,leadId:String(p.leadId||''),title:task391ProjectTitle(p,r.entity_id),status:String(p.status||''),deadline:String(p.deadline||p.dueDate||'').slice(0,10)}});
}
async function task391Tickets(leadId=''){
  const rr=await rows(pool,leadId?'SELECT ticket_id,lead_id,subject,status,priority,updated_at FROM portal_tickets WHERE lead_id=$1 ORDER BY updated_at DESC LIMIT 500':'SELECT ticket_id,lead_id,subject,status,priority,updated_at FROM portal_tickets ORDER BY updated_at DESC LIMIT 500',leadId?[leadId]:[]);
  return rr.map(r=>({ticketId:r.ticket_id,leadId:r.lead_id,subject:r.subject,status:r.status,priority:r.priority,updatedAt:r.updated_at}));
}
async function task391View(leadId=''){
  const tasks=await task391List(leadId,false),config=await task391SlaConfig();
  const active=tasks.filter(x=>!['Concluida','Cancelada'].includes(x.status));
  return{
    ok:true,config,team:await task391Team(),projects:await task391Projects(leadId),tickets:await task391Tickets(leadId),tasks,
    summary:{
      total:tasks.length,active:active.length,inProgress:active.filter(x=>x.status==='Em andamento').length,
      waitingClient:active.filter(x=>x.status==='Aguardando cliente').length,blocked:active.filter(x=>x.status==='Bloqueada').length,
      overdue:active.filter(x=>x.sla?.overdue).length,warning:active.filter(x=>x.sla?.warning).length,
      unassigned:active.filter(x=>!x.assignedUser).length,
      timeMinutes:tasks.reduce((a,x)=>a+x.timeMinutes,0)
    }
  };
}
async function task391ValidateLinks(leadId,projectId,ticketId){
  if(projectId){
    const p=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='project' AND entity_id=$1 AND deleted=FALSE",[projectId]);
    if(!p)throw new Error('Projeto nao encontrado.');
    const pp=task391Payload(p);if(leadId&&String(pp.leadId||'')&&String(pp.leadId)!==leadId)throw new Error('Projeto nao pertence ao cliente selecionado.');
  }
  if(ticketId){
    const t=await one(pool,'SELECT ticket_id,lead_id FROM portal_tickets WHERE ticket_id=$1',[ticketId]);
    if(!t)throw new Error('Chamado nao encontrado.');
    if(leadId&&t.lead_id&&t.lead_id!==leadId)throw new Error('Chamado nao pertence ao cliente selecionado.');
  }
}
async function task391Save(body,username){
  const id=body.taskId?validId(body.taskId,180):crypto.randomUUID(),existing=body.taskId?await one(pool,'SELECT * FROM task_items WHERE task_id=$1',[id]):null;
  if(body.taskId&&!existing)return{status:404,body:{ok:false,error:'Tarefa nao encontrada.'}};
  const title=task391Clean(body.title??existing?.title,220),description=task391Clean(body.description??existing?.description,6000);
  if(!title)return{status:400,body:{ok:false,error:'Titulo da tarefa e obrigatorio.'}};
  const leadId=body.leadId===undefined?(existing?.lead_id||''):(validId(body.leadId,180)||'');
  const projectId=body.projectId===undefined?(existing?.project_id||''):(validId(body.projectId,180)||'');
  const ticketId=body.ticketId===undefined?(existing?.ticket_id||''):(validId(body.ticketId,180)||'');
  await task391ValidateLinks(leadId,projectId,ticketId);
  const status=task391Status(body.status??existing?.status),priority=task391Priority(body.priority??existing?.priority);
  const assigned=body.assignedUser===undefined?(existing?.assigned_user||''):task391Clean(body.assignedUser,180);
  if(assigned){
    const user=await one(pool,'SELECT user_id FROM cloud_users WHERE username_ci=$1 AND active=TRUE',[assigned.toLowerCase()]);
    if(!user)return{status:400,body:{ok:false,error:'Responsavel selecionado nao esta ativo na equipe.'}};
  }
  const now=nowIso(),createdAt=existing?.created_at||now,config=await task391SlaConfig();
  const dueAt=body.dueAt===undefined?(existing?.due_at||null):(task391Iso(body.dueAt)||null);
  let slaDueAt;
  if(body.slaDueAt!==undefined)slaDueAt=task391Iso(body.slaDueAt)||null;
  else if(existing&&priority===existing.priority)slaDueAt=existing.sla_due_at||null;
  else slaDueAt=task391SlaDue(createdAt,priority,config)||null;
  const portalVisible=body.portalVisible===undefined?!!existing?.portal_visible:!!body.portalVisible;
  const completed=status==='Concluida'?(existing?.completed_at||now):null;
  if(existing){
    await pool.query('UPDATE task_items SET lead_id=$1,project_id=$2,ticket_id=$3,title=$4,description=$5,status=$6,priority=$7,assigned_user=$8,due_at=$9,sla_due_at=$10,portal_visible=$11,updated_at=$12,completed_at=$13 WHERE task_id=$14',
      [leadId||null,projectId||null,ticketId||null,title,description,status,priority,assigned||null,dueAt,slaDueAt,portalVisible,now,completed,id]);
  }else{
    await pool.query('INSERT INTO task_items(task_id,lead_id,project_id,ticket_id,title,description,status,priority,assigned_user,due_at,sla_due_at,portal_visible,created_by,created_at,updated_at,completed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15)',
      [id,leadId||null,projectId||null,ticketId||null,title,description,status,priority,assigned||null,dueAt,slaDueAt,portalVisible,username,now,completed]);
  }
  return{status:200,body:{ok:true,taskId:id,view:await task391View('')}};
}
async function task391Remove(body){
  const id=validId(body.taskId,180);if(!id)return{status:400,body:{ok:false,error:'Tarefa invalida.'}};
  const row=await one(pool,'SELECT task_id FROM task_items WHERE task_id=$1',[id]);if(!row)return{status:404,body:{ok:false,error:'Tarefa nao encontrada.'}};
  await withTransaction(pool,async client=>{
    await client.query('DELETE FROM task_checklist WHERE task_id=$1',[id]);
    await client.query('DELETE FROM task_comments WHERE task_id=$1',[id]);
    await client.query('DELETE FROM task_time_logs WHERE task_id=$1',[id]);
    await client.query('DELETE FROM task_items WHERE task_id=$1',[id]);
  });
  return{status:200,body:{ok:true,view:await task391View('')}};
}
async function task391ReplaceChecklist(body){
  const taskId=validId(body.taskId,180);if(!taskId)return{status:400,body:{ok:false,error:'Tarefa invalida.'}};
  const task=await one(pool,'SELECT task_id FROM task_items WHERE task_id=$1',[taskId]);if(!task)return{status:404,body:{ok:false,error:'Tarefa nao encontrada.'}};
  const list=(Array.isArray(body.items)?body.items:[]).slice(0,100),now=nowIso();
  await withTransaction(pool,async client=>{
    await client.query('DELETE FROM task_checklist WHERE task_id=$1',[taskId]);
    let pos=0;
    for(const item of list){
      const label=task391Clean(item?.label,500);if(!label)continue;
      await client.query('INSERT INTO task_checklist(checklist_id,task_id,label,done,portal_visible,sort_order,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$7)',
        [crypto.randomUUID(),taskId,label,!!item.done,item.portalVisible!==false,pos++,now]);
    }
    await client.query('UPDATE task_items SET updated_at=$1 WHERE task_id=$2',[now,taskId]);
  });
  return{status:200,body:{ok:true,view:await task391View('')}};
}
async function task391Comment(opts){
  const taskId=validId(opts.taskId,180);if(!taskId)throw new Error('Tarefa invalida.');
  const task=await one(pool,'SELECT * FROM task_items WHERE task_id=$1',[taskId]);if(!task)throw new Error('Tarefa nao encontrada.');
  if(opts.leadId&&task.lead_id!==opts.leadId)throw new Error('Tarefa nao pertence a este cliente.');
  if(opts.authorType==='Cliente'&&!task.portal_visible)throw new Error('Tarefa nao esta disponivel no Portal.');
  const body=task391Clean(opts.body,6000);if(!body)throw new Error('Digite um comentario.');
  const now=nowIso();
  await pool.query('INSERT INTO task_comments(comment_id,task_id,author_type,author_id,author_name,body,portal_visible,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [crypto.randomUUID(),taskId,opts.authorType||'Equipe',opts.authorId||null,task391Clean(opts.authorName,180),body,opts.authorType==='Cliente'?true:!!opts.portalVisible,now]);
  let nextStatus=task.status;
  if(opts.authorType==='Cliente'&&task.status==='Aguardando cliente')nextStatus='Em andamento';
  await pool.query('UPDATE task_items SET status=$1,updated_at=$2 WHERE task_id=$3',[nextStatus,now,taskId]);
}
async function task391Time(body,username){
  const taskId=validId(body.taskId,180);if(!taskId)return{status:400,body:{ok:false,error:'Tarefa invalida.'}};
  const task=await one(pool,'SELECT task_id FROM task_items WHERE task_id=$1',[taskId]);if(!task)return{status:404,body:{ok:false,error:'Tarefa nao encontrada.'}};
  const minutes=Math.max(1,Math.min(1440,Math.round(Number(body.minutes)||0)));if(!minutes)return{status:400,body:{ok:false,error:'Informe os minutos trabalhados.'}};
  const workedAt=task391Iso(body.workedAt)||nowIso(),now=nowIso();
  await pool.query('INSERT INTO task_time_logs(time_log_id,task_id,user_name,minutes,note,worked_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [crypto.randomUUID(),taskId,username,minutes,task391Clean(body.note,1200),workedAt,now]);
  await pool.query('UPDATE task_items SET updated_at=$1 WHERE task_id=$2',[now,taskId]);
  return{status:200,body:{ok:true,view:await task391View('')}};
}
async function task391SaveConfig(body,username){
  const next=task391SlaConfigNormalize(body||{});
  await saveSetting('task_sla_config',next,username);
  return{ok:true,config:next,view:await task391View('')};
}
async function task391FromTicket(body,username){
  const ticketId=validId(body.ticketId,180);if(!ticketId)return{status:400,body:{ok:false,error:'Chamado invalido.'}};
  const t=await one(pool,'SELECT * FROM portal_tickets WHERE ticket_id=$1',[ticketId]);if(!t)return{status:404,body:{ok:false,error:'Chamado nao encontrado.'}};
  const existing=await one(pool,'SELECT task_id FROM task_items WHERE ticket_id=$1 AND status<>$2 ORDER BY created_at DESC LIMIT 1',[ticketId,'Cancelada']);
  if(existing)return{status:409,body:{ok:false,error:'Este chamado ja possui uma tarefa vinculada.',taskId:existing.task_id}};
  return task391Save({
    leadId:t.lead_id,ticketId:t.ticket_id,title:t.subject,
    description:t.description||'',priority:TASK391_PRIORITY.has(t.priority)?t.priority:'Normal',
    status:'A fazer',portalVisible:true,assignedUser:body.assignedUser||''
  },username);
}
async function task391PortalView(session){
  const tasks=await task391List(session.leadId,true),active=tasks.filter(x=>!['Concluida','Cancelada'].includes(x.status));
  return{
    ok:true,tasks,
    summary:{
      total:tasks.length,active:active.length,inProgress:active.filter(x=>x.status==='Em andamento').length,
      waitingClient:active.filter(x=>x.status==='Aguardando cliente').length,completed:tasks.filter(x=>x.status==='Concluida').length
    }
  };
}

// Linha do tempo: tarefas publicas passam a aparecer no Portal.
const portalTimeline391Base=portalTimeline;
portalTimeline=async function(leadId,showFinance){
  const events=await portalTimeline391Base(leadId,showFinance);
  const rr=await rows(pool,"SELECT task_id,title,status,updated_at FROM task_items WHERE lead_id=$1 AND portal_visible=TRUE ORDER BY updated_at DESC LIMIT 60",[leadId]);
  for(const x of rr)events.push({type:'Tarefa',title:x.title,detail:'Status: '+String(x.status||''),at:x.updated_at,refId:x.task_id});
  return events.filter(x=>x.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,100);
};

// Saúde do Core: registra o novo modulo e contadores.
if(typeof CORE_MODULES!=='undefined'&&!CORE_MODULES.some(x=>x.key==='tasks')){
  CORE_MODULES.push({key:'tasks',name:'Tarefas, Equipe e SLA',version:'3.9.1',critical:true});
}
if(typeof CORE_REQUIRED_TABLES!=='undefined'){
  for(const t of ['task_items','task_checklist','task_comments','task_time_logs'])if(!CORE_REQUIRED_TABLES.includes(t))CORE_REQUIRED_TABLES.push(t);
}
const coreStatus391Base=coreStatus;
coreStatus=async function(){
  const d=await coreStatus391Base();
  const q=await one(pool,"SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status NOT IN ('Concluida','Cancelada'))::int AS active,COUNT(*) FILTER(WHERE status='Bloqueada')::int AS blocked,COUNT(*) FILTER(WHERE status NOT IN ('Concluida','Cancelada') AND sla_due_at IS NOT NULL AND sla_due_at<$1)::int AS overdue FROM task_items",[nowIso()]);
  d.tasks={total:Number(q?.total||0),active:Number(q?.active||0),blocked:Number(q?.blocked||0),overdue:Number(q?.overdue||0)};
  return d;
};
