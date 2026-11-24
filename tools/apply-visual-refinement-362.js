'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const indexPath = path.join(root, 'web', 'index.html');
const serverPath = path.join(root, 'server.js');
const MARK = 'EXE PRO 3.6.2 VISUAL REFINEMENT';

if (!fs.existsSync(indexPath)) throw new Error('web/index.html nao encontrado');
let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes(MARK)) {
  console.log('EXE PRO Cloud 3.6.2: refinamento visual ja aplicado.');
  process.exit(0);
}

if (fs.existsSync(serverPath)) {
  let server = fs.readFileSync(serverPath, 'utf8');
  server = server.replace("const VERSION = '3.6.1';", "const VERSION = '3.6.2';");
  server = server.replaceAll('EXE PRO 3.6.1', 'EXE PRO 3.6.2');
  fs.writeFileSync(serverPath, server);
}

const css = [
'/* ' + MARK + ' - acabamento visual, sem alterar banco/API/sincronizacao */',
':root{--refine-surface:#141414;--refine-border:#303030;--refine-shadow:0 14px 42px rgba(0,0,0,.22)}',
'*{scrollbar-width:thin;scrollbar-color:#3a3a3a #111}',
'*::-webkit-scrollbar{width:10px;height:10px}*::-webkit-scrollbar-track{background:#101010}*::-webkit-scrollbar-thumb{background:#343434;border:2px solid #101010;border-radius:999px}*::-webkit-scrollbar-thumb:hover{background:#454545}',
'button,.btn,.nav button,.tab,.result-card,.lead-card,.kpi,.card{transition:border-color .16s ease,background .16s ease,box-shadow .16s ease,transform .16s ease,color .16s ease}',
'button:focus-visible,.btn:focus-visible,.nav button:focus-visible,.tab:focus-visible,a:focus-visible,.input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid color-mix(in srgb,var(--accent) 75%,#fff);outline-offset:2px}',
'.topbar{border-bottom-color:#2a2a2a;box-shadow:0 10px 30px rgba(0,0,0,.16)}',
'.desktop-brand{gap:11px}.desktop-brand-logo{width:42px;height:42px}.desktop-brand-title{font-size:17px;letter-spacing:.015em}.desktop-tagline{color:#919191}',
'.top-actions{gap:8px}.top-actions>.btn{min-height:38px;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}.who{min-height:40px;padding:5px 9px;background:#121212}',
'.sidebar{padding:20px 14px 24px;background:linear-gradient(180deg,#0b0b0b 0%,#101010 52%,#0c0c0c 100%)}',
'.cloud-side-intro{padding-left:9px;padding-right:9px}.cloud-side-user{margin-bottom:16px;border-color:#292929;box-shadow:0 8px 22px rgba(0,0,0,.14)}',
'.nav{gap:6px}.nav button{min-height:45px;padding:9px 10px;border-radius:11px}.nav button .ico{width:29px;height:29px}.nav button:hover{transform:translateX(2px);background:#181818}.nav button.active{transform:none;box-shadow:inset 3px 0 0 var(--accent),inset 0 0 0 1px color-mix(in srgb,var(--accent) 16%,transparent),0 8px 22px rgba(0,0,0,.12)}',
'.cloud-side-status{margin-top:22px}.cloud-status-box{border-color:#292929}',
'.content{max-width:1580px;padding:28px 30px 64px}',
'.section-head{min-height:112px;padding:21px;margin-bottom:20px;border-radius:17px;border-color:#2d2d2d;background:linear-gradient(135deg,#161616,#111 70%,color-mix(in srgb,var(--accent) 3.5%,#111));box-shadow:0 14px 38px rgba(0,0,0,.18)}',
'.section-head .actions{justify-content:flex-end}.title{font-size:28px}.subtitle{font-size:11.5px;line-height:1.55;color:#929292}',
'.btn{min-height:38px;padding:9px 13px;border-radius:10px;border-color:#323232;background:#171717}.btn:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--accent) 36%,#3b3b3b);background:#1b1b1b}.btn.primary{font-weight:900;box-shadow:0 9px 24px color-mix(in srgb,var(--accent) 10%,transparent)}.btn.sm{min-height:31px;padding:6px 9px}',
'.kpis{gap:12px;margin-bottom:18px}.kpi,.card{border-color:#2e2e2e;background:linear-gradient(145deg,#161616,#111);box-shadow:var(--refine-shadow)}',
'.kpi{min-height:112px;padding:18px}.kpi:hover{border-color:#3a3a3a;background:linear-gradient(145deg,#181818,#111)}.kpi label{font-size:9.5px;color:#929292}.kpi strong{font-size:27px;line-height:1.08}.kpi small{font-size:10px;line-height:1.4}',
'.card{padding:19px;border-radius:17px}.card h3{font-size:14.5px}.card p.help{line-height:1.55;margin-bottom:15px}',
'.form-grid{gap:14px 13px}.field label{margin-bottom:7px;color:#a2a2a2}.input,select,textarea{min-height:42px;padding:10px 12px;border-radius:10px;border-color:#353535;background:#0e0e0e}.input:hover,select:hover,textarea:hover{border-color:#424242}.input::placeholder,textarea::placeholder{color:#626262}',
'input[type="checkbox"]{width:16px;height:16px;accent-color:var(--accent);cursor:pointer}',
'.card:has(#ps_segment){padding:20px 20px 18px;background:linear-gradient(145deg,#151515,#101010);border-color:#313131}',
'.card:has(#ps_segment) .form-grid{grid-template-columns:minmax(220px,1.35fr) minmax(180px,1fr) minmax(220px,1.15fr) minmax(84px,.4fr);align-items:end}',
'.card:has(#ps_segment) .field:has(#ps_maps){grid-column:span 3}.card:has(#ps_segment) .field:has(#ps_maps)>div{gap:7px!important;padding-top:2px!important}',
'.card:has(#ps_segment) .field:has(#ps_maps)>div>label{display:inline-flex;align-items:center;gap:7px;margin:0;padding:9px 11px;border:1px solid #303030;border-radius:10px;background:#101010;color:#cfcfcf;font-size:10px;font-weight:800;letter-spacing:0;text-transform:none;cursor:pointer}',
'.card:has(#ps_segment) .field:has(#ps_maps)>div>label:hover{border-color:color-mix(in srgb,var(--accent) 36%,#353535);background:#151515;color:#fff}',
'.card:has(#ps_segment)>.btn.primary{min-width:190px;min-height:42px;margin-top:16px!important}.card:has(#ps_segment)>.tiny.muted{margin-top:10px!important;line-height:1.5;color:#737373}',
'#prospectResults{margin-top:16px!important}.notice{padding:11px 13px;border-radius:11px;font-size:10.5px;line-height:1.45;color:#d5dfcf;border-color:color-mix(in srgb,var(--accent) 28%,#2d2d2d);background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 6%,#101010),#101010)}',
'.prospect-grid{gap:12px!important;grid-template-columns:repeat(3,minmax(0,1fr))}.result-card{min-height:168px;padding:15px;border-radius:14px;background:linear-gradient(145deg,#151515,#101010);display:flex;flex-direction:column;overflow:hidden}.result-card:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--accent) 30%,#343434);box-shadow:0 12px 30px rgba(0,0,0,.22)}.result-card h3{font-size:13px;line-height:1.35;margin:5px 0 7px}.result-card p{font-size:9.5px;line-height:1.5;color:#9c9c9c;margin:3px 0}.result-card .actions{margin-top:auto;padding-top:12px}',
'.table-wrap{border-radius:15px;border-color:#2e2e2e;box-shadow:0 12px 32px rgba(0,0,0,.13)}.table th{position:sticky;top:0;z-index:2;background:#171717;color:#a2a2a2}.table td{padding-top:11px;padding-bottom:11px}.table tr:last-child td{border-bottom:0}.table tr:hover td{background:#161616}',
'.alert{border-radius:11px;background:#121212}.alert.critical{border-left:3px solid #d6535e}.alert.warning{border-left:3px solid #d6a447}',
'.pipeline{gap:12px}.pipe-col{border-color:#2c2c2c;background:#101010}.lead-card{border-color:#2d2d2d;background:#161616}.lead-card:hover{border-color:#3b3b3b;transform:translateY(-1px)}',
'.modal-back{backdrop-filter:blur(5px)}.modal{box-shadow:0 28px 90px rgba(0,0,0,.55)}.toast{border-color:#3b3b3b;background:#181818}',
'@media(max-width:1320px){.card:has(#ps_segment) .form-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.card:has(#ps_segment) .field:has(#ps_maps){grid-column:span 2}.prospect-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
'@media(max-width:980px){.content{padding-left:20px;padding-right:20px}.card:has(#ps_segment) .form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.card:has(#ps_segment) .field:has(#ps_maps){grid-column:1/-1}.section-head{min-height:auto}}',
'@media(max-width:800px){.content{padding:15px 12px 56px}.section-head{padding:17px 15px;margin-bottom:14px}.section-head .actions{justify-content:flex-start}.desktop-brand-logo{width:38px;height:38px}.btn{min-height:36px}.nav button:hover{transform:none}.card:has(#ps_segment){padding:16px}.card:has(#ps_segment) .form-grid{grid-template-columns:1fr}.card:has(#ps_segment) .field:has(#ps_maps){grid-column:auto}.prospect-grid{grid-template-columns:1fr}.result-card{min-height:auto}}',
'@media(max-width:480px){.top-actions{gap:5px}.top-actions>.btn{padding-left:8px;padding-right:8px}.desktop-version{padding:2px 6px}.kpi{min-height:98px;padding:14px}.kpi strong{font-size:22px}.card{padding:15px}}',
'@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}'
].join('\n');

html = html.replace('</head>', '<style id="visualRefinement362">' + css + '</style></head>');
html = html.replace('class="desktop-version">3.6.1</span>', 'class="desktop-version">3.6.2</span>');
html = html.replaceAll('Cloud Full 3.6.1', 'Cloud Full 3.6.2').replaceAll('v3.6.1', 'v3.6.2');
fs.writeFileSync(indexPath, html);
console.log('EXE PRO Cloud 3.6.2: refinamento visual aplicado.');
