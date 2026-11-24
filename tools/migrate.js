'use strict';
const { createPool } = require('../lib/postgres');
const { initSchema } = require('../lib/schema');
(async()=>{const pool=createPool();try{await initSchema(pool);console.log('Schema PostgreSQL EXE PRO 3.5.0 pronto.')}finally{await pool.end()}})().catch(e=>{console.error(e.message);process.exit(1)});
