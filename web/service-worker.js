const CACHE='exe-pro-cloud-web-v4.4.0';
const SHELL=['/','/manifest.webmanifest','/app-icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('exe-pro-cloud-web-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/portal'))return;if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(CACHE).then(k=>k.put('/',c));return x}).catch(()=>caches.match('/')));return}e.respondWith(caches.match(r).then(x=>x||fetch(r)))});
