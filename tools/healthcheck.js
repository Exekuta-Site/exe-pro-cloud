'use strict';
const port=Number(process.env.PORT||process.env.EXE_CLOUD_PORT||8080);
const host=process.env.EXE_HEALTH_HOST||'127.0.0.1';
fetch(`http://${host}:${port}/ready`).then(async r=>{const t=await r.text();if(!r.ok)throw new Error(t);console.log(t)}).catch(e=>{console.error(e.message);process.exit(1)});
