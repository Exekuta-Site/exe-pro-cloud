'use strict';
const { createPool } = require('../lib/postgres');
const { initSchema } = require('../lib/schema');
(async()=>{const pool=createPool();try{await initSchema(pool);const r=await pool.query('SELECT current_database() AS database, current_user AS username, NOW() AS now');console.log(JSON.stringify({ok:true,...r.rows[0]},null,2));}finally{await pool.end()}})().catch(e=>{console.error(JSON.stringify({ok:false,error:e.message},null,2));process.exit(1)});
