
// --- EXE PRO 3.8.3: Propostas + Contratos + Aceite no Portal ---
const PORTAL_DOC_TYPES=new Set(['proposal','contract']);
const PORTAL_DOC_DECISIONS=new Set(['Aprovado','Recusado','Aceito']);

function portalDocClean(v,max){
  return String(v??'').replace(/\0/g,'').trim().slice(0,max);
}
function portalDocPayload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function portalDocType(v){
  const t=String(v||'').trim();
  return PORTAL_DOC_TYPES.has(t)?t:'';
}
function portalDocNum(v){
  const n=Number(v);return Number.isFinite(n)?n:0;
}
function portalDocProposalSnapshot(p){
  const items=(Array.isArray(p.items)?p.items:[]).map(i=>({
    name:portalDocClean(i?.name,220),
    description:portalDocClean(i?.description,1000),
    billingType:portalDocClean(i?.billingType,80),
    quantity:portalDocNum(i?.quantity||1),
    unitPrice:portalDocNum(i?.unitPrice),
    lineTotal:portalDocNum(i?.lineTotal)
  }));
  return{
    type:'proposal',
    leadId:portalDocClean(p.leadId,180),
    title:portalDocClean(p.title||'Proposta comercial',220),
    items,
    discountPercent:portalDocNum(p.discountPercent),
    validityDays:Math.max(1,Math.min(365,portalDocNum(p.validityDays)||15)),
    paymentTerms:portalDocClean(p.paymentTerms,3000),
    notes:portalDocClean(p.notes,3000),
    diagnosisSummary:portalDocClean(p.diagnosisSummary,3000),
    setupNet:portalDocNum(p.setupNet),
    monthlyNet:portalDocNum(p.monthlyNet),
    firstCycleTotal:portalDocNum(p.firstCycleTotal)
  };
}
function portalDocContractSnapshot(p){
  return{
    type:'contract',
    leadId:portalDocClean(p.leadId,180),
    proposalId:portalDocClean(p.proposalId,180),
    title:portalDocClean(p.title||'Contrato',220),
    monthlyAmount:portalDocNum(p.monthlyAmount),
    billingDay:Math.max(1,Math.min(31,portalDocNum(p.billingDay)||10)),
    startDate:portalDocClean(p.startDate,20),
    endDate:portalDocClean(p.endDate,20),
    services:(Array.isArray(p.services)?p.services:[]).map(x=>portalDocClean(x,220)).filter(Boolean).slice(0,100),
    notes:portalDocClean(p.notes,4000)
  };
}
function portalDocSnapshot(type,payload){
  return type==='proposal'?portalDocProposalSnapshot(payload):portalDocContractSnapshot(payload);
}
function portalDocHash(snapshot){
  return crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}
function portalDocIpHash(req,entityId){
  return crypto.createHash('sha256').update(portalIp(req)+'|'+String(entityId||'')+'|portal383').digest('hex');
}
async function portalDocEntity(type,id){
  return one(pool,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2 AND deleted=FALSE',[type,id]);
}
async function portalDocLatestDecision(type,id){
  return one(pool,'SELECT * FROM portal_document_decisions WHERE entity_type=$1 AND entity_id=$2 ORDER BY created_at DESC LIMIT 1',[type,id]);
}
function portalDocDecisionDto(r,currentHash){
  if(!r)return null;
  return{
    decisionId:r.decision_id,decision:r.decision,actorUsername:r.actor_username||'',actorName:r.actor_name||'',
    comment:r.comment||'',contentHash:r.content_hash,createdAt:r.created_at,
    current:!currentHash||r.content_hash===currentHash
  };
}
function portalDocPublicationDto(pub,entity,decision){
  const type=pub.entity_type,p=portalDocPayload(entity),snapshot=portalDocSnapshot(type,p),hash=portalDocHash(snapshot);
  return{
    documentId:pub.document_id,leadId:pub.lead_id,entityType:type,entityId:pub.entity_id,published:!!pub.published,
    approvalRequired:pub.approval_required!==false,publishedAt:pub.published_at||null,publishedBy:pub.published_by||'',
    updatedAt:pub.updated_at,contentHash:hash,payload:p,snapshot,
    decision:portalDocDecisionDto(decision,hash)
  };
}
async function portalDocsList(leadId='',publishedOnly=false){
  const args=[];let where=[];
  if(leadId){args.push(leadId);where.push('d.lead_id=$'+args.length)}
  if(publishedOnly)where.push('d.published=TRUE');
  const sql="SELECT d.*,e.payload_json,e.updated_at AS entity_updated_at FROM portal_documents d JOIN entities e ON e.entity_type=d.entity_type AND e.entity_id=d.entity_id AND e.deleted=FALSE "+(where.length?'WHERE '+where.join(' AND '):'')+" ORDER BY d.updated_at DESC LIMIT 500";
  const rr=await rows(pool,sql,args),out=[];
  for(const r of rr)out.push(portalDocPublicationDto(r,r,await portalDocLatestDecision(r.entity_type,r.entity_id)));
  return out;
}
async function portalDocAdminCandidates(leadId=''){
  const types=['proposal','contract'],out=[];
  for(const type of types){
    const args=[type];let sql="SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type=$1 AND deleted=FALSE";
    if(leadId){args.push(leadId);sql+=" AND payload_json->>'leadId'=$2"}
    sql+=" ORDER BY updated_at DESC LIMIT 500";
    const rr=await rows(pool,sql,args);
    for(const row of rr){
      const p=portalDocPayload(row),id=row.entity_id;
      const pub=await one(pool,'SELECT * FROM portal_documents WHERE entity_type=$1 AND entity_id=$2',[type,id]);
      const snap=portalDocSnapshot(type,p),hash=portalDocHash(snap),decision=await portalDocLatestDecision(type,id);
      out.push({
        entityType:type,entityId:id,leadId:String(p.leadId||''),payload:p,snapshot:snap,contentHash:hash,
        publication:pub?{documentId:pub.document_id,published:!!pub.published,approvalRequired:pub.approval_required!==false,publishedAt:pub.published_at||null,publishedBy:pub.published_by||'',updatedAt:pub.updated_at}:null,
        decision:portalDocDecisionDto(decision,hash),entityUpdatedAt:row.updated_at
      });
    }
  }
  return out.sort((a,b)=>String(b.entityUpdatedAt||'').localeCompare(String(a.entityUpdatedAt||'')));
}
async function portalDocPublish(body,username){
  const type=portalDocType(body.entityType),entityId=validId(body.entityId,180);
  if(!type||!entityId)return{status:400,body:{ok:false,error:'Documento invalido.'}};
  const entity=await portalDocEntity(type,entityId);if(!entity)return{status:404,body:{ok:false,error:'Documento nao encontrado.'}};
  const p=portalDocPayload(entity),leadId=validId(p.leadId,180);if(!leadId)return{status:400,body:{ok:false,error:'Documento sem cliente vinculado.'}};
  const published=body.published!==false,approvalRequired=body.approvalRequired!==false,now=nowIso();
  const current=await one(pool,'SELECT * FROM portal_documents WHERE entity_type=$1 AND entity_id=$2',[type,entityId]);
  if(current){
    await pool.query('UPDATE portal_documents SET lead_id=$1,published=$2,approval_required=$3,published_at=$4,published_by=$5,updated_at=$6 WHERE entity_type=$7 AND entity_id=$8',
      [leadId,published,approvalRequired,published?(current.published_at||now):null,published?username:null,now,type,entityId]);
  }else{
    await pool.query('INSERT INTO portal_documents(document_id,lead_id,entity_type,entity_id,published,approval_required,published_at,published_by,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [crypto.randomUUID(),leadId,type,entityId,published,approvalRequired,published?now:null,published?username:null,now]);
  }
  return{status:200,body:{ok:true,documents:await portalDocAdminCandidates('')}};
}
async function portalDocSyncPatch(type,id,patch,origin){
  return withTransaction(pool,async client=>{
    const row=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2 FOR UPDATE',[type,id]);
    if(!row||row.deleted)return false;
    const payload={...portalDocPayload(row),...(patch||{})},ver=Number(row.cloud_version||0)+1,now=nowIso(),src=origin||'portal-client';
    await client.query('UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,payload_json=$4::jsonb,updated_at=$5 WHERE entity_type=$6 AND entity_id=$7',
      [ver,src,ver,JSON.stringify(payload),now,type,id]);
    await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,FALSE,$6::jsonb,$7)',
      [type,id,ver,src,ver,JSON.stringify(payload),now]);
    return true;
  });
}
async function portalDocDecision(req,session,body){
  const type=portalDocType(body.entityType),entityId=validId(body.entityId,180);
  if(!type||!entityId)throw new Error('Documento invalido.');
  const pub=await one(pool,'SELECT * FROM portal_documents WHERE entity_type=$1 AND entity_id=$2 AND lead_id=$3 AND published=TRUE',[type,entityId,session.leadId]);
  if(!pub)throw new Error('Documento nao esta publicado para este cliente.');
  const entity=await portalDocEntity(type,entityId);if(!entity)throw new Error('Documento nao encontrado.');
  const p=portalDocPayload(entity),snapshot=portalDocSnapshot(type,p),contentHash=portalDocHash(snapshot);
  const latest=await portalDocLatestDecision(type,entityId);
  if(latest&&latest.content_hash===contentHash)throw new Error('Este documento ja possui uma decisao registrada para a versao atual.');
  const actorName=portalDocClean(body.actorName,180);
  if(actorName.length<3)throw new Error('Informe o nome completo de quem esta realizando o aceite.');
  const requested=String(body.decision||'');
  let decision;
  if(requested==='Recusado')decision='Recusado';
  else if(type==='proposal'&&requested==='Aprovado')decision='Aprovado';
  else if(type==='contract'&&requested==='Aceito')decision='Aceito';
  else throw new Error('Decisao invalida para este documento.');
  if(decision!=='Recusado'&&body.acceptedTerms!==true)throw new Error('Confirme que leu e concorda com o documento antes de continuar.');
  const now=nowIso(),decisionId=crypto.randomUUID();
  await pool.query('INSERT INTO portal_document_decisions(decision_id,lead_id,entity_type,entity_id,decision,actor_user_id,actor_username,actor_name,comment,content_hash,snapshot_json,ip_hash,user_agent,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14)',
    [decisionId,session.leadId,type,entityId,decision,session.userId,session.username,actorName,portalDocClean(body.comment,2000),contentHash,JSON.stringify(snapshot),portalDocIpHash(req,entityId),portalDocClean(req.headers['user-agent'],500),now]);
  if(type==='proposal'){
    await portalDocSyncPatch('proposal',entityId,{status:decision==='Aprovado'?'Aprovada':'Recusada',portalDecision:decision,portalDecisionAt:now,portalDecisionBy:actorName},'portal-proposal-decision');
  }else{
    await portalDocSyncPatch('contract',entityId,{portalAcceptanceStatus:decision,portalAcceptanceAt:now,portalAcceptanceBy:actorName},'portal-contract-decision');
  }
  return{ok:true,decisionId,documents:await portalDocsList(session.leadId,true)};
}
async function portalDocAdminDecisionReset(body,username){
  const type=portalDocType(body.entityType),entityId=validId(body.entityId,180);
  if(!type||!entityId)return{status:400,body:{ok:false,error:'Documento invalido.'}};
  const entity=await portalDocEntity(type,entityId);if(!entity)return{status:404,body:{ok:false,error:'Documento nao encontrado.'}};
  const p=portalDocPayload(entity),leadId=validId(p.leadId,180),now=nowIso();
  await pool.query('UPDATE portal_documents SET published=TRUE,published_at=$1,published_by=$2,updated_at=$1 WHERE entity_type=$3 AND entity_id=$4',[now,username,type,entityId]);
  return{status:200,body:{ok:true,documents:await portalDocAdminCandidates(leadId)}};
}
async function portalDocsForClient(session){
  return{ok:true,documents:await portalDocsList(session.leadId,true)};
}

// Acrescenta aprovacoes/aceites na Linha do Tempo do Portal.
const portalTimeline383Base=portalTimeline;
portalTimeline=async function(leadId,showFinance){
  const events=await portalTimeline383Base(leadId,showFinance);
  const rr=await rows(pool,'SELECT entity_type,entity_id,decision,actor_name,created_at FROM portal_document_decisions WHERE lead_id=$1 ORDER BY created_at DESC LIMIT 60',[leadId]);
  for(const x of rr){
    events.push({
      type:x.entity_type==='proposal'?'Proposta':'Contrato',
      title:x.entity_type==='proposal'?'Decisao sobre proposta':'Aceite de contrato',
      detail:x.decision+' por '+String(x.actor_name||'cliente'),
      at:x.created_at,refId:x.entity_id
    });
  }
  return events.filter(x=>x.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,100);
};
