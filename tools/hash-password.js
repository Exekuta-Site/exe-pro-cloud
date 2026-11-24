'use strict';
const crypto=require('node:crypto');
const password=process.argv.slice(2).join(' ');
if(!password||password.length<8){console.error('Uso: npm run hash-password -- "senha com pelo menos 8 caracteres"');process.exit(2)}
const salt=crypto.randomBytes(24),N=16384,r=8,p=1,hash=crypto.scryptSync(password,salt,32,{N,r,p,maxmem:64*1024*1024});
console.log(`scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`);
