
// --- EXE PRO 3.8.1: Chamados, Arquivos, Comprovantes e Timeline ---
const PORTAL_FILE_MAX_BYTES=8*1024*1024;
const PORTAL_FILE_MIME=new Set([
  'application/pdf','image/jpeg','image/png','image/webp','text/plain','application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const PORTAL_TICKET_STATUS=new Set(['Aberto','Em andamento','Aguardando cliente','Resolvido','Fechado']);
const PORTAL_TICKET_PRIORITY=new Set(['Baixa','Normal','Alta','Urgente']);
const PORTAL_TICKET_CATEGORY=new Set(['Site','SEO','Conteudo','Financeiro','Suporte','Outro']);

function portalOpClean(v,max){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
function portalOpRoleCanFinance(role){
  role=portalRole(role);
  return role==='Proprietario'||role==='Financeiro';
}
function portalOpCategory(v){
  const x=portalOpClean(v,40);
  return PORTAL_TICKET_CATEGORY.has(x)?x:'Outro';
}
function portalOpPriority(v){
  const x=portalOpClean(v,30);
  return PORTAL_TICKET_PRIORITY.has(x)?x:'Normal';
}
function portalOpStatus(v){
  const x=portalOpClean(v,40);
  return PORTAL_TICKET_STATUS.has(x)?x:'Aberto';
}
async function portalReadJsonLarge(req,maxBytes=12*1024*1024){
  return await new Promise((resolve,reject)=>{
    let size=0,chunks=[],done=false;
    function fail(e){if(done)return;done=true;reject(e)}
    req.on('data',chunk=>{
      if(done)return;
      size+=chunk.length;
      if(size>maxBytes){
        const e=new Error('Arquivo ou requisicao excede o limite permitido.');
        e.statusCode=413;fail(e);return;
      }
      chunks.push(chunk);
    });
    req.on('end',()=>{
      if(done)return;
      done=true;
      try{
        const raw=Buffer.concat(chunks).toString('utf8');
        resolve(raw?JSON.parse(raw):{});
      }catch{
        const e=new Error('JSON invalido.');e.statusCode=400;reject(e);
      }
    });
    req.on('error',fail);
  });
}
function portalParseUpload(body){
  const filename=portalOpClean(body.filename,220).replace(/[\\/:*?"<>|]+/g,'_');
  let mime=portalOpClean(body.mimeType,140).toLowerCase();
  let b64=String(body.base64||'').trim();
  const m=b64.match(/^data:([^;]+);base64,(.*)$/s);
  if(m){if(!mime)mime=String(m[1]||'').toLowerCase();b64=m[2]}
  if(!filename)throw new Error('Nome do arquivo ausente.');
  if(!PORTAL_FILE_MIME.has(mime))throw new Error('Tipo de arquivo nao permitido.');
  let bytes;
  try{bytes=Buffer.from(b64,'base64')}catch{throw new Error('Arquivo invalido.')}
  if(!bytes.length)throw new Error('Arquivo vazio.');
  if(bytes.length>PORTAL_FILE_MAX_BYTES)throw new Error('O arquivo excede 8 MB.');
  return{filename,mimeType:mime,bytes};
}
async function portalStoreFile(opts){
  const fileId=crypto.randomUUID(),now=nowIso();
  await pool.query(
    'INSERT INTO portal_files(file_id,lead_id,ticket_id,category,visibility,filename,mime_type,byte_size,content_bytes,uploaded_by_type,uploaded_by_id,uploaded_by_name,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
    [fileId,opts.leadId,opts.ticketId||null,portalOpClean(opts.category,80)||'Arquivo',opts.visibility==='Interno'?'Interno':'Cliente',opts.upload.filename,opts.upload.mimeType,opts.upload.bytes.length,opts.upload.bytes,opts.authorType,opts.authorId||null,portalOpClean(opts.authorName,180),now]
  );
  return{fileId,createdAt:now};
}
function portalFileMeta(r){
  return{
    fileId:r.file_id,leadId:r.lead_id,ticketId:r.ticket_id||null,category:r.category,visibility:r.visibility,
    filename:r.filename,mimeType:r.mime_type,byteSize:Number(r.byte_size||0),uploadedByType:r.uploaded_by_type,
    uploadedByName:r.uploaded_by_name||'',createdAt:r.created_at
  };
}
async function portalFileRow(fileId){
  return one(pool,'SELECT * FROM portal_files WHERE file_id=$1',[fileId]);
}
function portalSendFile(res,row){
  const name=String(row.filename||'arquivo').replace(/[\r\n"]/g,'_');
  res.writeHead(200,{
    'content-type':row.mime_type||'application/octet-stream',
    'content-length':Number(row.byte_size||row.content_bytes?.length||0),
    'content-disposition':'attachment; filename="'+name+'"',
    'cache-control':'private, no-store',
    'x-content-type-options':'nosniff'
  });
  return res.end(row.content_bytes);
}
function portalTicketDto(r){
  return{
    ticketId:r.ticket_id,leadId:r.lead_id,createdByUserId:r.created_by_user_id||null,
    category:r.category,subject:r.subject,description:r.description,priority:r.priority,status:r.status,
    assignedTo:r.assigned_to||'',createdAt:r.created_at,updatedAt:r.updated_at,closedAt:r.closed_at||null,
    client:r.lead_payload?portalPayload({payload_json:r.lead_payload}):undefined
  };
}
async function portalTicketMessages(ticketId,leadId){
  const rr=await rows(pool,'SELECT * FROM portal_ticket_messages WHERE ticket_id=$1 AND lead_id=$2 ORDER BY created_at ASC',[ticketId,leadId]);
  return rr.map(r=>({messageId:r.message_id,authorType:r.author_type,authorName:r.author_name||'',body:r.body,createdAt:r.created_at}));
}
async function portalTicketList(leadId){
  const rr=await rows(pool,'SELECT * FROM portal_tickets WHERE lead_id=$1 ORDER BY updated_at DESC',[leadId]);
  const out=[];
  for(const r of rr){
    const files=await rows(pool,"SELECT file_id,lead_id,ticket_id,category,visibility,filename,mime_type,byte_size,uploaded_by_type,uploaded_by_name,created_at FROM portal_files WHERE ticket_id=$1 AND visibility='Cliente' ORDER BY created_at DESC",[r.ticket_id]);
    out.push({...portalTicketDto(r),messages:await portalTicketMessages(r.ticket_id,leadId),files:files.map(portalFileMeta)});
  }
  return out;
}
async function portalTicketCreate(session,body){
  const subject=portalOpClean(body.subject,180),description=portalOpClean(body.description,6000);
  if(!subject||!description)throw new Error('Informe assunto e descricao do chamado.');
  const id=crypto.randomUUID(),now=nowIso(),category=portalOpCategory(body.category),priority=portalOpPriority(body.priority);
  await pool.query('INSERT INTO portal_tickets(ticket_id,lead_id,created_by_user_id,category,subject,description,priority,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
    [id,session.leadId,session.userId,category,subject,description,priority,'Aberto',now]);
  await pool.query('INSERT INTO portal_ticket_messages(message_id,ticket_id,lead_id,author_type,author_id,author_name,body,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [crypto.randomUUID(),id,session.leadId,'Cliente',session.userId,session.username,description,now]);
  return{id};
}
async function portalTicketAddMessage(opts){
  const body=portalOpClean(opts.body,6000);
  if(!body)throw new Error('Digite uma mensagem.');
  const ticket=await one(pool,'SELECT * FROM portal_tickets WHERE ticket_id=$1 AND lead_id=$2',[opts.ticketId,opts.leadId]);
  if(!ticket)throw new Error('Chamado nao encontrado.');
  const now=nowIso();
  await pool.query('INSERT INTO portal_ticket_messages(message_id,ticket_id,lead_id,author_type,author_id,author_name,body,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [crypto.randomUUID(),opts.ticketId,opts.leadId,opts.authorType,opts.authorId||null,portalOpClean(opts.authorName,180),body,now]);
  let nextStatus=ticket.status;
  if(opts.authorType==='Cliente'&&ticket.status==='Aguardando cliente')nextStatus='Em andamento';
  if(opts.authorType==='Equipe'&&ticket.status==='Aberto')nextStatus='Em andamento';
  await pool.query('UPDATE portal_tickets SET status=$1,updated_at=$2 WHERE ticket_id=$3',[nextStatus,now,opts.ticketId]);
}
async function portalTicketAdminPatch(body,username){
  const id=validId(body.ticketId,180);if(!id)throw new Error('Chamado invalido.');
  const current=await one(pool,'SELECT * FROM portal_tickets WHERE ticket_id=$1',[id]);if(!current)throw new Error('Chamado nao encontrado.');
  const status=body.status===undefined?current.status:portalOpStatus(body.status);
  const priority=body.priority===undefined?current.priority:portalOpPriority(body.priority);
  const assigned=body.assignedTo===undefined?current.assigned_to:portalOpClean(body.assignedTo,180);
  const now=nowIso(),closed=(status==='Resolvido'||status==='Fechado')?(current.closed_at||now):null;
  await pool.query('UPDATE portal_tickets SET status=$1,priority=$2,assigned_to=$3,updated_at=$4,closed_at=$5 WHERE ticket_id=$6',[status,priority,assigned||null,now,closed,id]);
  if(body.message)await portalTicketAddMessage({ticketId:id,leadId:current.lead_id,authorType:'Equipe',authorId:username,authorName:username,body:body.message});
}
async function portalProofList(leadId){
  const sql="SELECT p.*,f.filename,f.mime_type,f.byte_size,r.payload_json AS receivable_payload FROM portal_payment_proofs p JOIN portal_files f ON f.file_id=p.file_id LEFT JOIN entities r ON r.entity_type='receivable' AND r.entity_id=p.receivable_id WHERE p.lead_id=$1 ORDER BY p.submitted_at DESC";
  const rr=await rows(pool,sql,[leadId]);
  return rr.map(r=>({
    proofId:r.proof_id,receivableId:r.receivable_id,fileId:r.file_id,filename:r.filename,mimeType:r.mime_type,byteSize:Number(r.byte_size||0),
    note:r.note||'',status:r.status,submittedAt:r.submitted_at,reviewedAt:r.reviewed_at||null,reviewedBy:r.reviewed_by||'',reviewNote:r.review_note||'',
    receivable:portalPayload({payload_json:r.receivable_payload})
  }));
}
async function portalProofCreate(session,body){
  if(!portalOpRoleCanFinance(session.role))throw new Error('Seu perfil nao pode enviar comprovantes financeiros.');
  const receivableId=validId(body.receivableId,180);if(!receivableId)throw new Error('Cobranca invalida.');
  const rec=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='receivable' AND entity_id=$1 AND deleted=FALSE AND payload_json->>'leadId'=$2",[receivableId,session.leadId]);
  if(!rec)throw new Error('Cobranca nao encontrada para este cliente.');
  const upload=portalParseUpload(body);
  const stored=await portalStoreFile({leadId:session.leadId,category:'Comprovante',visibility:'Cliente',upload,authorType:'Cliente',authorId:session.userId,authorName:session.username});
  const proofId=crypto.randomUUID(),now=nowIso();
  await pool.query('INSERT INTO portal_payment_proofs(proof_id,lead_id,receivable_id,file_id,submitted_by_user_id,note,status,submitted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [proofId,session.leadId,receivableId,stored.fileId,session.userId,portalOpClean(body.note,1200),'Aguardando conferencia',now]);
  return{proofId,fileId:stored.fileId};
}
async function portalProofAdminPatch(body,username){
  const id=validId(body.proofId,180);if(!id)throw new Error('Comprovante invalido.');
  const proof=await one(pool,'SELECT * FROM portal_payment_proofs WHERE proof_id=$1',[id]);if(!proof)throw new Error('Comprovante nao encontrado.');
  const status=portalOpClean(body.status,60);
  if(!['Aguardando conferencia','Aprovado','Recusado'].includes(status))throw new Error('Status de comprovante invalido.');
  await pool.query('UPDATE portal_payment_proofs SET status=$1,reviewed_at=$2,reviewed_by=$3,review_note=$4 WHERE proof_id=$5',
    [status,nowIso(),username,portalOpClean(body.reviewNote,1200),id]);
}
async function portalFileList(leadId){
  const rr=await rows(pool,"SELECT file_id,lead_id,ticket_id,category,visibility,filename,mime_type,byte_size,uploaded_by_type,uploaded_by_name,created_at FROM portal_files WHERE lead_id=$1 AND visibility='Cliente' ORDER BY created_at DESC",[leadId]);
  return rr.map(portalFileMeta);
}
async function portalTimeline(leadId,showFinance){
  const events=[];
  const qTickets=rows(pool,'SELECT ticket_id,subject,status,updated_at,created_at FROM portal_tickets WHERE lead_id=$1 ORDER BY updated_at DESC LIMIT 60',[leadId]);
  const qFiles=rows(pool,"SELECT file_id,filename,category,created_at FROM portal_files WHERE lead_id=$1 AND visibility='Cliente' ORDER BY created_at DESC LIMIT 60",[leadId]);
  const qProjects=rows(pool,"SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='project' AND deleted=FALSE AND payload_json->>'leadId'=$1 ORDER BY updated_at DESC LIMIT 60",[leadId]);
  const qRec=showFinance?rows(pool,"SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='receivable' AND deleted=FALSE AND payload_json->>'leadId'=$1 ORDER BY updated_at DESC LIMIT 60",[leadId]):Promise.resolve([]);
  const qProofs=showFinance?rows(pool,'SELECT proof_id,receivable_id,status,submitted_at,reviewed_at FROM portal_payment_proofs WHERE lead_id=$1 ORDER BY submitted_at DESC LIMIT 60',[leadId]):Promise.resolve([]);
  const all=await Promise.all([qTickets,qFiles,qProjects,qRec,qProofs]);
  for(const x of all[0])events.push({type:'Chamado',title:x.subject,detail:'Status: '+x.status,at:x.updated_at||x.created_at,refId:x.ticket_id});
  for(const x of all[1])events.push({type:'Arquivo',title:x.filename,detail:x.category||'Arquivo',at:x.created_at,refId:x.file_id});
  for(const x of all[2]){const p=portalPayload(x);events.push({type:'Projeto',title:String(p.title||p.name||'Projeto'),detail:'Status: '+String(p.status||'Em andamento'),at:x.updated_at,refId:x.entity_id})}
  for(const x of all[3]){const p=portalPayload(x);events.push({type:'Financeiro',title:String(p.description||p.title||'Cobranca'),detail:String(p.status||'Pendente')+' · '+Number(p.amount||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),at:x.updated_at,refId:x.entity_id})}
  for(const x of all[4])events.push({type:'Comprovante',title:'Comprovante de pagamento',detail:x.status,at:x.reviewed_at||x.submitted_at,refId:x.proof_id});
  return events.filter(x=>x.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,100);
}
async function portalOperations(session){
  const showFinance=portalOpRoleCanFinance(session.role);
  const all=await Promise.all([
    portalTicketList(session.leadId),
    portalFileList(session.leadId),
    showFinance?portalProofList(session.leadId):Promise.resolve([]),
    portalTimeline(session.leadId,showFinance)
  ]);
  const tickets=all[0],files=all[1],proofs=all[2],timeline=all[3];
  return{
    ok:true,csrf:session.csrf,
    permissions:{finance:showFinance},
    counts:{openTickets:tickets.filter(x=>!['Resolvido','Fechado'].includes(x.status)).length,files:files.length,pendingProofs:proofs.filter(x=>x.status==='Aguardando conferencia').length},
    tickets,files,proofs,timeline
  };
}
async function portalAdminOperations(leadId){
  const ticketSql=leadId?
    "SELECT t.*,e.payload_json AS lead_payload FROM portal_tickets t LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=t.lead_id WHERE t.lead_id=$1 ORDER BY t.updated_at DESC LIMIT 500":
    "SELECT t.*,e.payload_json AS lead_payload FROM portal_tickets t LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=t.lead_id ORDER BY t.updated_at DESC LIMIT 500";
  const tickets=await rows(pool,ticketSql,leadId?[leadId]:[]);
  const fileSql=leadId?
    "SELECT f.*,e.payload_json AS lead_payload FROM portal_files f LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=f.lead_id WHERE f.lead_id=$1 ORDER BY f.created_at DESC LIMIT 500":
    "SELECT f.*,e.payload_json AS lead_payload FROM portal_files f LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=f.lead_id ORDER BY f.created_at DESC LIMIT 500";
  const files=await rows(pool,fileSql,leadId?[leadId]:[]);
  const proofSql=leadId?
    "SELECT p.*,f.filename,f.mime_type,f.byte_size,e.payload_json AS lead_payload,r.payload_json AS receivable_payload FROM portal_payment_proofs p JOIN portal_files f ON f.file_id=p.file_id LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=p.lead_id LEFT JOIN entities r ON r.entity_type='receivable' AND r.entity_id=p.receivable_id WHERE p.lead_id=$1 ORDER BY p.submitted_at DESC LIMIT 500":
    "SELECT p.*,f.filename,f.mime_type,f.byte_size,e.payload_json AS lead_payload,r.payload_json AS receivable_payload FROM portal_payment_proofs p JOIN portal_files f ON f.file_id=p.file_id LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=p.lead_id LEFT JOIN entities r ON r.entity_type='receivable' AND r.entity_id=p.receivable_id ORDER BY p.submitted_at DESC LIMIT 500";
  const proofs=await rows(pool,proofSql,leadId?[leadId]:[]);
  const ticketDtos=[];
  for(const t of tickets)ticketDtos.push({...portalTicketDto(t),messages:await portalTicketMessages(t.ticket_id,t.lead_id)});
  return{
    ok:true,
    counts:{openTickets:ticketDtos.filter(x=>!['Resolvido','Fechado'].includes(x.status)).length,files:files.length,pendingProofs:proofs.filter(x=>x.status==='Aguardando conferencia').length},
    tickets:ticketDtos,
    files:files.map(r=>({...portalFileMeta(r),client:portalPayload({payload_json:r.lead_payload})})),
    proofs:proofs.map(r=>({proofId:r.proof_id,leadId:r.lead_id,receivableId:r.receivable_id,fileId:r.file_id,filename:r.filename,mimeType:r.mime_type,byteSize:Number(r.byte_size||0),note:r.note||'',status:r.status,submittedAt:r.submitted_at,reviewedAt:r.reviewed_at||null,reviewedBy:r.reviewed_by||'',reviewNote:r.review_note||'',client:portalPayload({payload_json:r.lead_payload}),receivable:portalPayload({payload_json:r.receivable_payload})}))
  };
}
