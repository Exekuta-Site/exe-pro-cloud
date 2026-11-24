
// --- EXE PRO 3.8.0: Portal do Cliente ---
const PORTAL_COOKIE='exe_portal_session';
const PORTAL_SESSION_DAYS=7;
const PORTAL_ROLES=new Set(['Proprietario','Financeiro','Marketing','Visualizador']);

function portalNormUser(v){
  return String(v||'').trim().toLowerCase().slice(0,180);
}
function portalRole(v){
  const s=String(v||'Visualizador').trim();
  return PORTAL_ROLES.has(s)?s:'Visualizador';
}
function portalHashPassword(password){
  const p=String(password||'');
  if(p.length<8)throw new Error('A senha do portal precisa ter pelo menos 8 caracteres.');
  const salt=crypto.randomBytes(16);
  const hash=crypto.scryptSync(p,salt,32);
  return 'scrypt$'+salt.toString('base64url')+'$'+hash.toString('base64url');
}
function portalVerifyPassword(password,stored){
  try{
    const parts=String(stored||'').split('$');
    if(parts.length!==3||parts[0]!=='scrypt')return false;
    const salt=Buffer.from(parts[1],'base64url'),expected=Buffer.from(parts[2],'base64url');
    const got=crypto.scryptSync(String(password||''),salt,expected.length);
    return expected.length===got.length&&crypto.timingSafeEqual(expected,got);
  }catch{return false}
}
function portalTokenHash(token){
  return crypto.createHash('sha256').update(String(token||'')).digest('hex');
}
function portalCookies(req){
  const out={};
  for(const part of String(req.headers.cookie||'').split(';')){
    const i=part.indexOf('=');if(i<1)continue;
    const k=part.slice(0,i).trim(),v=part.slice(i+1).trim();
    try{out[k]=decodeURIComponent(v)}catch{out[k]=v}
  }
  return out;
}
function portalIp(req){
  const f=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  return (f||req.socket?.remoteAddress||'unknown').slice(0,120);
}
function portalCookie(token,maxAge){
  return PORTAL_COOKIE+'='+encodeURIComponent(token)+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+String(maxAge);
}
async function portalGuard(req,username){
  const key=crypto.createHash('sha256').update('portal|'+portalIp(req)+'|'+portalNormUser(username)).digest('hex');
  const row=await one(pool,'SELECT * FROM portal_login_guard WHERE guard_key=$1',[key]);
  const now=Date.now(),blocked=row?.blocked_until?Date.parse(row.blocked_until):0;
  return{key,row,blocked:blocked>now,blockedUntil:row?.blocked_until||null};
}
async function portalGuardFail(key,row){
  const fail=Number(row?.fail_count||0)+1,now=nowIso();
  let blocked=null;
  if(fail>=5)blocked=new Date(Date.now()+15*60*1000).toISOString();
  await pool.query("INSERT INTO portal_login_guard(guard_key,fail_count,blocked_until,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(guard_key) DO UPDATE SET fail_count=EXCLUDED.fail_count,blocked_until=EXCLUDED.blocked_until,updated_at=EXCLUDED.updated_at",[key,fail,blocked,now]);
}
async function portalGuardSuccess(key){
  await pool.query('DELETE FROM portal_login_guard WHERE guard_key=$1',[key]);
}
async function portalLogin(req,res,body){
  const username=portalNormUser(body.username),password=String(body.password||'');
  if(!username||!password)return json(res,400,{ok:false,error:'Informe usuario e senha.'});
  const guard=await portalGuard(req,username);
  if(guard.blocked)return json(res,429,{ok:false,error:'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'});
  const user=await one(pool,'SELECT * FROM portal_users WHERE username_ci=$1',[username]);
  if(!user||!user.active||!portalVerifyPassword(password,user.password_hash)){
    await portalGuardFail(guard.key,guard.row);
    return json(res,401,{ok:false,error:'Usuario ou senha invalidos.'});
  }
  const lead=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[user.lead_id]);
  if(!lead){
    await portalGuardFail(guard.key,guard.row);
    return json(res,403,{ok:false,error:'Cadastro do cliente nao esta disponivel.'});
  }
  await portalGuardSuccess(guard.key);
  const token=crypto.randomBytes(32).toString('base64url'),tokenHash=portalTokenHash(token),csrf=crypto.randomBytes(24).toString('base64url');
  const now=nowIso(),expires=new Date(Date.now()+PORTAL_SESSION_DAYS*86400000).toISOString();
  await pool.query('DELETE FROM portal_sessions WHERE expires_at<$1',[now]);
  await pool.query('INSERT INTO portal_sessions(token_hash,user_id,lead_id,csrf_token,created_at,expires_at,last_seen_at) VALUES($1,$2,$3,$4,$5,$6,$5)',[tokenHash,user.user_id,user.lead_id,csrf,now,expires]);
  await pool.query('UPDATE portal_users SET last_login_at=$1,updated_at=$1 WHERE user_id=$2',[now,user.user_id]);
  res.setHeader('set-cookie',portalCookie(token,PORTAL_SESSION_DAYS*86400));
  return json(res,200,{ok:true,csrf,user:{userId:user.user_id,username:user.username,role:user.role,leadId:user.lead_id}});
}
async function portalAuth(req,res,write){
  const token=portalCookies(req)[PORTAL_COOKIE];
  if(!token){json(res,401,{ok:false,error:'Sessao do portal nao encontrada.'});return null}
  const sql="SELECT s.*,u.username,u.role,u.active FROM portal_sessions s JOIN portal_users u ON u.user_id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>$2";
  const row=await one(pool,sql,[portalTokenHash(token),nowIso()]);
  if(!row||!row.active){res.setHeader('set-cookie',portalCookie('',0));json(res,401,{ok:false,error:'Sessao expirada.'});return null}
  if(write){
    const csrf=String(req.headers['x-csrf-token']||'');
    if(!csrf||csrf!==row.csrf_token){json(res,403,{ok:false,error:'CSRF invalido.'});return null}
  }
  await pool.query('UPDATE portal_sessions SET last_seen_at=$1 WHERE token_hash=$2',[nowIso(),row.token_hash]);
  return{tokenHash:row.token_hash,userId:row.user_id,leadId:row.lead_id,username:row.username,role:row.role,csrf:row.csrf_token};
}
async function portalLogout(req,res){
  const token=portalCookies(req)[PORTAL_COOKIE];
  if(token)await pool.query('DELETE FROM portal_sessions WHERE token_hash=$1',[portalTokenHash(token)]);
  res.setHeader('set-cookie',portalCookie('',0));
  return json(res,200,{ok:true});
}
function portalPayload(row){
  let p=row?.payload_json||{};
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{p={}}}
  return p||{};
}
function portalMoneyNum(v){
  const n=Number(v);return Number.isFinite(n)?n:0;
}
function portalToday(){
  return new Date(Date.now()-3*60*60*1000).toISOString().slice(0,10);
}
function portalSanitizeBrand(b){
  b=b||{};
  return{
    name:String(b.agencyName||b.companyName||b.brandName||'EXEKUTA').slice(0,160),
    logo:String(b.logoUrl||b.logoDataUrl||'').slice(0,150000),
    accent:String(b.accentColor||b.primaryColor||'#18b7a4').slice(0,32),
    supportEmail:String(b.supportEmail||b.email||'').slice(0,180),
    supportWhatsapp:String(b.whatsapp||b.phone||'').slice(0,80),
    pixKey:String(b.pixKey||'').slice(0,220)
  };
}
function portalServiceItems(lead){
  const p=portalPayload(lead),items=Array.isArray(p.clientServiceItems)?p.clientServiceItems:[];
  return items.map((x,i)=>({
    id:String(x?.id||('service-'+i)).slice(0,180),
    name:String(x?.name||'Servico').slice(0,180),
    siteUrl:String(x?.siteUrl||'').slice(0,500),
    price:portalMoneyNum(x?.price),
    billingCycle:String(x?.billingCycle||'Mensal').slice(0,40),
    billingDay:Math.max(1,Math.min(28,Number(x?.billingDay||10))),
    status:String(x?.status||'Ativo').slice(0,40)
  }));
}
async function portalDashboard(session){
  const lead=await one(pool,"SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[session.leadId]);
  if(!lead)throw new Error('Cliente nao encontrado.');
  const p=portalPayload(lead),brand=portalSanitizeBrand(await getBranding());
  const sitePromise=rows(pool,'SELECT site_id,site_url,label,status,remote_suspended,last_checked_at FROM wordpress_sites WHERE lead_id=$1 AND enabled=TRUE ORDER BY updated_at DESC',[session.leadId]);
  const recvPromise=rows(pool,"SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='receivable' AND deleted=FALSE AND payload_json->>'leadId'=$1 ORDER BY COALESCE(payload_json->>'dueDate','') DESC",[session.leadId]);
  const projectPromise=rows(pool,"SELECT entity_id,payload_json,updated_at FROM entities WHERE entity_type='project' AND deleted=FALSE AND payload_json->>'leadId'=$1 ORDER BY updated_at DESC",[session.leadId]);
  const all=await Promise.all([sitePromise,recvPromise,projectPromise]);
  const siteRows=all[0],recvRows=all[1],projectRows=all[2];
  const services=portalServiceItems(lead);
  const sites=siteRows.map(s=>({
    siteId:s.site_id,siteUrl:s.site_url,label:s.label||s.site_url,
    status:s.remote_suspended?'Temporariamente indisponivel':(s.status||'Desconhecido'),
    lastCheckedAt:s.last_checked_at||null
  }));
  const today=portalToday();
  let pending=0,overdue=0,paid=0,nextDue='',nextAmount=0;
  const finance=recvRows.map(r=>{
    const x=portalPayload(r),st=String(x.status||'Pendente'),due=String(x.dueDate||'').slice(0,10),amount=portalMoneyNum(x.amount);
    const low=st.toLowerCase(),isPaid=low.includes('pago'),isCancelled=low.includes('cancel'),isOverdue=!isPaid&&!isCancelled&&due&&due<today;
    if(isPaid)paid+=amount;else if(!isCancelled){pending+=amount;if(isOverdue)overdue+=amount;if(due&&(!nextDue||due<nextDue)){nextDue=due;nextAmount=amount}}
    return{
      receivableId:r.entity_id,
      description:String(x.description||x.title||'Cobranca').slice(0,220),
      amount,dueDate:due,status:st.slice(0,60),paymentMethod:String(x.paymentMethod||'').slice(0,80),
      overdue:isOverdue,updatedAt:r.updated_at
    };
  });
  const projects=projectRows.map(r=>{
    const x=portalPayload(r),progress=Math.max(0,Math.min(100,Number(x.progress??x.percentComplete??x.completion??0)||0));
    return{
      projectId:r.entity_id,title:String(x.title||x.name||'Projeto').slice(0,220),
      status:String(x.status||'Em andamento').slice(0,80),progress,
      startDate:String(x.startDate||'').slice(0,10),
      deadline:String(x.deadline||x.dueDate||x.endDate||'').slice(0,10),
      summary:String(x.clientSummary||x.summary||x.description||'').slice(0,1200),
      updatedAt:r.updated_at
    };
  });
  const monthly=services.filter(x=>x.status==='Ativo'&&x.billingCycle==='Mensal').reduce((a,x)=>a+x.price,0)||
    portalMoneyNum(p.clientMonthlyAmount||p.monthlyAmount||p.dealValue);
  const role=portalRole(session.role),showFinance=role==='Proprietario'||role==='Financeiro';
  const safeServices=showFinance?services:services.map(x=>({...x,price:null}));
  return{
    ok:true,csrf:session.csrf,user:{username:session.username,role},
    branding:brand,
    client:{
      clientId:lead.entity_id,name:String(p.name||p.companyName||'Cliente').slice(0,220),
      legalName:String(p.legalName||'').slice(0,220),document:String(p.document||'').slice(0,80),
      email:String(p.email||'').slice(0,180),phone:String(p.phone||'').slice(0,80),
      whatsapp:String(p.whatsapp||'').slice(0,80),city:String(p.city||'').slice(0,120),state:String(p.state||'').slice(0,40),
      status:String(p.clientAccountStatus||'Ativo').slice(0,60),clientSince:String(p.clientSince||'').slice(0,10),
      monthly:showFinance?monthly:null
    },
    permissions:{finance:showFinance,services:true,sites:true,projects:role!=='Financeiro'},
    summary:{services:services.filter(x=>x.status==='Ativo').length,sites:sites.length,projects:projects.length,monthly:showFinance?monthly:null,
      pending:showFinance?pending:null,overdue:showFinance?overdue:null,nextDue:showFinance?nextDue:'',nextAmount:showFinance?nextAmount:null},
    services:safeServices,sites,finance:showFinance?finance:[],projects:role==='Financeiro'?[]:projects
  };
}
async function portalAdminList(){
  const sql="SELECT u.user_id,u.lead_id,u.username,u.role,u.active,u.created_at,u.updated_at,u.last_login_at,e.payload_json AS lead_payload FROM portal_users u LEFT JOIN entities e ON e.entity_type='lead' AND e.entity_id=u.lead_id ORDER BY u.updated_at DESC";
  const rr=await rows(pool,sql);
  return{ok:true,portalPath:'/portal/',users:rr.map(r=>({
    userId:r.user_id,leadId:r.lead_id,username:r.username,role:r.role,active:!!r.active,
    createdAt:r.created_at,updatedAt:r.updated_at,lastLoginAt:r.last_login_at,
    client:portalPayload({payload_json:r.lead_payload})
  }))};
}
async function portalAdminCreate(body,session){
  const leadId=validId(body.leadId,180),username=String(body.username||'').trim().slice(0,180),usernameCi=portalNormUser(username);
  if(!leadId||!usernameCi)return{status:400,body:{ok:false,error:'Cliente e usuario sao obrigatorios.'}};
  const lead=await one(pool,"SELECT entity_id,payload_json FROM entities WHERE entity_type='lead' AND entity_id=$1 AND deleted=FALSE",[leadId]);
  if(!lead)return{status:404,body:{ok:false,error:'Cliente nao encontrado.'}};
  const lp=portalPayload(lead);
  if(!(lp.crmStatus==='Cliente'||lp.clientSince))return{status:400,body:{ok:false,error:'O acesso do portal so pode ser criado para um Cliente.'}};
  let passwordHash;
  try{passwordHash=portalHashPassword(body.password)}catch(e){return{status:400,body:{ok:false,error:e.message}}}
  const id=crypto.randomUUID(),now=nowIso(),role=portalRole(body.role);
  try{
    await pool.query('INSERT INTO portal_users(user_id,lead_id,username,username_ci,password_hash,role,active,must_change_password,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,TRUE,FALSE,$7,$7)',[id,leadId,username,usernameCi,passwordHash,role,now]);
  }catch(e){
    if(/unique|duplicate/i.test(String(e.message||'')))return{status:409,body:{ok:false,error:'Este usuario ja existe no Portal do Cliente.'}};
    throw e;
  }
  return{status:200,body:{ok:true,userId:id,list:await portalAdminList()}};
}
async function portalAdminPatch(body){
  const id=validId(body.userId,180);if(!id)return{status:400,body:{ok:false,error:'Usuario do portal invalido.'}};
  const current=await one(pool,'SELECT * FROM portal_users WHERE user_id=$1',[id]);
  if(!current)return{status:404,body:{ok:false,error:'Usuario do portal nao encontrado.'}};
  const username=body.username===undefined?current.username:String(body.username||'').trim().slice(0,180);
  const usernameCi=portalNormUser(username);
  if(!usernameCi)return{status:400,body:{ok:false,error:'Usuario nao pode ficar vazio.'}};
  let passwordHash=current.password_hash;
  if(String(body.password||'')){try{passwordHash=portalHashPassword(body.password)}catch(e){return{status:400,body:{ok:false,error:e.message}}}}
  const role=body.role===undefined?current.role:portalRole(body.role),active=body.active===undefined?current.active:!!body.active,now=nowIso();
  try{
    await pool.query('UPDATE portal_users SET username=$1,username_ci=$2,password_hash=$3,role=$4,active=$5,updated_at=$6 WHERE user_id=$7',[username,usernameCi,passwordHash,role,active,now,id]);
  }catch(e){
    if(/unique|duplicate/i.test(String(e.message||'')))return{status:409,body:{ok:false,error:'Este usuario ja existe no Portal do Cliente.'}};
    throw e;
  }
  if(!active||String(body.password||''))await pool.query('DELETE FROM portal_sessions WHERE user_id=$1',[id]);
  return{status:200,body:{ok:true,list:await portalAdminList()}};
}
async function portalAdminRemove(body){
  const id=validId(body.userId,180);if(!id)return{status:400,body:{ok:false,error:'Usuario do portal invalido.'}};
  await pool.query('DELETE FROM portal_sessions WHERE user_id=$1',[id]);
  const q=await pool.query('DELETE FROM portal_users WHERE user_id=$1',[id]);
  return{status:200,body:{ok:true,deleted:q.rowCount,list:await portalAdminList()}};
}
