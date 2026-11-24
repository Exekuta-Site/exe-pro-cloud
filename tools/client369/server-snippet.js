
// --- EXE PRO 3.6.9: exclusao sincronizada de entidades ---
async function webDeleteEntity(body,session){
  const type=validId(body.entityType,40),id=validId(body.entityId,180),cascade=!!body.cascade;
  if(!WEB_TYPES.has(type)||!id)return{status:400,body:{ok:false,error:'Tipo ou ID invalido.'}};
  if(!canWrite(session,type))return{status:403,body:{ok:false,error:'Seu perfil nao pode excluir este registro.'}};
  return withTransaction(pool,async client=>{
    const root=await one(client,'SELECT * FROM entities WHERE entity_type=$1 AND entity_id=$2 FOR UPDATE',[type,id]);
    if(!root)return{status:404,body:{ok:false,error:'Registro nao encontrado.'}};
    if(root.deleted)return{status:200,body:{ok:true,deleted:0,alreadyDeleted:true}};
    const expected=Number(body.cloudVersion||0);
    if(expected&&expected!==Number(root.cloud_version||0)){
      return{status:409,body:{ok:false,error:'O registro foi alterado em outro dispositivo. Atualize antes de excluir.',currentVersion:Number(root.cloud_version||0)}};
    }
    const targets=[root];
    if(cascade&&type==='lead'){
      for(const relatedType of['proposal','project','contract','receivable']){
        const rr=await rows(client,"SELECT * FROM entities WHERE entity_type=$1 AND deleted=FALSE AND payload_json->>'leadId'=$2 FOR UPDATE",[relatedType,id]);
        targets.push(...rr);
      }
    }
    const now=nowIso();let deleted=0;
    for(const row of targets){
      if(row.deleted)continue;
      const ver=Number(row.cloud_version||0)+1;
      let payload=row.payload_json??null;
      if(typeof payload==='string'){try{payload=JSON.parse(payload)}catch{payload=null}}
      await client.query('UPDATE entities SET cloud_version=$1,origin_installation_id=$2,origin_local_version=$3,deleted=TRUE,updated_at=$4 WHERE entity_type=$5 AND entity_id=$6',[ver,'cloud-web',ver,now,row.entity_type,row.entity_id]);
      await client.query('INSERT INTO changes(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,TRUE,$6::jsonb,$7)',[row.entity_type,row.entity_id,ver,'cloud-web',ver,JSON.stringify(payload),now]);
      deleted++;
    }
    return{status:200,body:{ok:true,deleted,cascade}};
  });
}
