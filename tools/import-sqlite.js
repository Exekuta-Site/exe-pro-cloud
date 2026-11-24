'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createPool,withTransaction}=require('../lib/postgres');
const {initSchema}=require('../lib/schema');
const input=path.resolve(process.argv[2]||'');
if(!input||!fs.existsSync(input)){console.error('Uso: npm run import:sqlite -- /caminho/exe_pro_cloud.sqlite');process.exit(2)}
function tableExists(db,name){try{return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)}catch{return false}}
function all(db,table){return tableExists(db,table)?db.prepare(`SELECT * FROM ${table}`).all():[]}
(async()=>{
  const sqlite=new DatabaseSync(input,{readOnly:true}),pool=createPool();await initSchema(pool);
  const stats={};
  await withTransaction(pool,async c=>{
    const entities=all(sqlite,'entities');stats.entities=entities.length;
    for(const r of entities)await c.query(`INSERT INTO entities(entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8) ON CONFLICT(entity_type,entity_id) DO UPDATE SET cloud_version=EXCLUDED.cloud_version,origin_installation_id=EXCLUDED.origin_installation_id,origin_local_version=EXCLUDED.origin_local_version,deleted=EXCLUDED.deleted,payload_json=EXCLUDED.payload_json,updated_at=EXCLUDED.updated_at`,[r.entity_type,r.entity_id,r.cloud_version,r.origin_installation_id,r.origin_local_version,!!r.deleted,r.payload_json||null,r.updated_at]);
    const changes=all(sqlite,'changes');stats.changes=changes.length;
    for(const r of changes)await c.query(`INSERT INTO changes(seq,entity_type,entity_id,cloud_version,origin_installation_id,origin_local_version,deleted,payload_json,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) ON CONFLICT(seq) DO NOTHING`,[r.seq,r.entity_type,r.entity_id,r.cloud_version,r.origin_installation_id,r.origin_local_version,!!r.deleted,r.payload_json||null,r.updated_at]);
    const installations=all(sqlite,'installations');stats.installations=installations.length;
    for(const r of installations)await c.query(`INSERT INTO installations(installation_id,label,last_seen_at) VALUES($1,$2,$3) ON CONFLICT(installation_id) DO UPDATE SET label=EXCLUDED.label,last_seen_at=EXCLUDED.last_seen_at`,[r.installation_id,r.label,r.last_seen_at]);
    const users=all(sqlite,'cloud_users');stats.users=users.length;
    for(const r of users)await c.query(`INSERT INTO cloud_users(user_id,username,username_ci,password_hash,role,active,created_at,updated_at,last_login_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(username_ci) DO UPDATE SET password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,active=EXCLUDED.active,updated_at=EXCLUDED.updated_at,last_login_at=EXCLUDED.last_login_at`,[r.user_id,r.username,String(r.username||'').toLowerCase(),r.password_hash,r.role,!!r.active,r.created_at,r.updated_at,r.last_login_at]);
    const audit=all(sqlite,'cloud_audit');stats.audit=audit.length;
    for(const r of audit)await c.query(`INSERT INTO cloud_audit(id,event_type,username,ip,detail,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,[r.id,r.event_type,r.username,r.ip,r.detail,r.created_at]);
    const settings=all(sqlite,'cloud_settings');stats.settings=settings.length;
    for(const r of settings)await c.query(`INSERT INTO cloud_settings(setting_key,value_json,updated_at,updated_by) VALUES($1,$2::jsonb,$3,$4) ON CONFLICT(setting_key) DO UPDATE SET value_json=EXCLUDED.value_json,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by`,[r.setting_key,r.value_json||'{}',r.updated_at,r.updated_by]);
    const secrets=process.env.EXE_IMPORT_SECRETS==='1'?all(sqlite,'cloud_secrets'):[];stats.secrets=secrets.length;
    for(const r of secrets)await c.query(`INSERT INTO cloud_secrets(secret_key,cipher_text,updated_at) VALUES($1,$2,$3) ON CONFLICT(secret_key) DO UPDATE SET cipher_text=EXCLUDED.cipher_text,updated_at=EXCLUDED.updated_at`,[r.secret_key,r.cipher_text,r.updated_at]);
    await c.query(`SELECT setval(pg_get_serial_sequence('changes','seq'), GREATEST(COALESCE((SELECT MAX(seq) FROM changes),1),1), (SELECT COUNT(*)>0 FROM changes))`);
    await c.query(`SELECT setval(pg_get_serial_sequence('cloud_audit','id'), GREATEST(COALESCE((SELECT MAX(id) FROM cloud_audit),1),1), (SELECT COUNT(*)>0 FROM cloud_audit))`);
  });
  sqlite.close();await pool.end();console.log(JSON.stringify({ok:true,input,imported:stats},null,2));
})().catch(e=>{console.error(JSON.stringify({ok:false,error:e.message},null,2));process.exit(1)});
