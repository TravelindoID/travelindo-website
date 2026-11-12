// GET /admin/  Travelindo orders admin page (admin password)
import { isAdmin, askForLogin } from '../api/_common.js';

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Travelindo orders</title>
<style>
:root{--bg:#F7F6FF;--surface:#fff;--ink:#15172B;--muted:#4A4E68;--border:#E4E3EF;--deep:#183C9C;--good:#067647;--good-bg:#E7F6EE;--warn:#B54708;--warn-bg:#FEF0C7;--err:#D92D20;--err-bg:#FEE4E2}
@media (prefers-color-scheme:dark){:root{--bg:#0E1020;--surface:#171A36;--ink:#F1F2FA;--muted:#B7BBD8;--border:#2A2E55;--deep:#A9B8FF;--good:#6CE9A6;--good-bg:#0F2E22;--warn:#FEC84B;--warn-bg:#3A2A05;--err:#FF8A80;--err-bg:#3A1212}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border);background:var(--surface)}
header h1{font-size:18px;margin:0}header span{color:var(--muted);font-size:13px}
main{padding:16px 20px;max-width:1400px;margin:0 auto}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px}.card b{display:block;font-size:22px;font-variant-numeric:tabular-nums}.card small{color:var(--muted)}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}.bar input,.bar select,.bar button{font:inherit;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink)}
.bar input{flex:1;min-width:220px}.bar button{cursor:pointer;font-weight:600}
.wrap{overflow:auto;background:var(--surface);border:1px solid var(--border);border-radius:12px}
table{border-collapse:collapse;width:100%;min-width:1100px}th,td{padding:9px 10px;border-bottom:1px solid var(--border);text-align:left;white-space:nowrap;font-size:14px}
th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);position:sticky;top:0;background:var(--surface)}
tbody tr{cursor:pointer}tbody tr:hover{background:var(--bg)}td.num{text-align:right;font-variant-numeric:tabular-nums}
.tag{display:inline-block;padding:2px 8px;border-radius:99px;font-size:12px;font-weight:600}
.ok{background:var(--good-bg);color:var(--good)}.warn{background:var(--warn-bg);color:var(--warn)}.bad{background:var(--err-bg);color:var(--err)}.dim{color:var(--muted)}
dialog{border:1px solid var(--border);border-radius:14px;background:var(--surface);color:var(--ink);max-width:640px;width:calc(100% - 32px);padding:0}
dialog .hd{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border)}
dialog dl{display:grid;grid-template-columns:180px 1fr;gap:6px 12px;padding:14px 16px;margin:0}dialog dt{color:var(--muted)}dialog dd{margin:0;word-break:break-all}
dialog button{font:inherit;border:1px solid var(--border);background:var(--bg);color:var(--ink);border-radius:8px;padding:6px 12px;cursor:pointer}
.empty{padding:30px;text-align:center;color:var(--muted)}
</style></head><body>
<header><h1>Travelindo orders</h1><span id="sub">Loading…</span></header>
<main>
<div class="cards">
 <div class="card"><small>Orders</small><b id="cN">–</b></div>
 <div class="card"><small>Revenue (paid)</small><b id="cRev">–</b></div>
 <div class="card"><small>eSIM created at Airalo</small><b id="cOk">–</b></div>
 <div class="card"><small>Airalo failed</small><b id="cFail">–</b></div>
 <div class="card"><small>QR shown on screen</small><b id="cQr">–</b></div>
 <div class="card"><small>eSIM active now</small><b id="cAct">–</b></div>
</div>
<div class="bar">
 <input id="q" type="search" placeholder="Search email, payment ID, ICCID, Airalo order, plan…">
 <select id="f"><option value="">All orders</option><option value="failed">Airalo failed</option><option value="no_iccid">No ICCID yet</option><option value="qr_not_shown">QR not shown (since tracking began)</option><option value="not_active">Not installed yet</option><option value="active">Active</option></select>
 <button id="go">Search</button><button id="csv">Download CSV</button>
</div>
<div class="wrap"><table><thead><tr>
 <th>Date (WIB)</th><th>Customer email</th><th>Plan</th><th class="num">Paid</th><th>eSIM at Airalo</th><th>Airalo order</th><th>ICCID</th><th>Email sent to</th><th>QR shown</th><th>eSIM status</th><th class="num">Data left</th><th>Expires</th>
</tr></thead><tbody id="rows"></tbody></table><div id="empty" class="empty" hidden>No orders found.</div></div>
</main>
<dialog id="dlg"><div class="hd"><b id="dTitle">Order</b><button id="dClose">Close</button></div><dl id="dBody"></dl></dialog>
<script>
var items=[];var QR_SINCE='2026-11-12T09:30:00Z';
function $(i){return document.getElementById(i)}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function dt(s){if(!s)return '';var d=new Date(s);if(isNaN(d))return esc(s);return d.toLocaleString('en-GB',{timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function money(v,c){if(v==null)return '';return (c&&c!=='USD'?c+' ':'$')+Number(v).toFixed(2)}
function mb(v){if(v==null)return '';return v>=1024?(v/1024).toFixed(2)+' GB':Math.round(v)+' MB'}
function tagAiralo(r){if(r.airalo_result==='pending')return '<span class="tag warn">Not confirmed</span>';if(r.airalo_result==='ok')return '<span class="tag ok">Created</span>';if(r.airalo_result==='failed')return '<span class="tag bad">Failed</span>';return '<span class="tag warn">Unknown</span>'}
function tagStatus(s){if(!s)return '<span class="dim">Not checked</span>';var m={ACTIVE:'ok',NOT_ACTIVE:'warn',FINISHED:'dim',EXPIRED:'dim'};var t={ACTIVE:'Active',NOT_ACTIVE:'Not installed',FINISHED:'Used up',EXPIRED:'Expired'};return '<span class="tag '+(m[s]||'warn')+'">'+esc(t[s]||s)+'</span>'}
function load(){
  var u='/api/admin-orders?q='+encodeURIComponent($('q').value)+'&filter='+encodeURIComponent($('f').value);
  fetch(u,{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(d){
    items=d.items||[];var t=d.totals||{};
    $('cN').textContent=t.n||0;$('cRev').textContent=t.revenue!=null?'$'+Number(t.revenue).toFixed(2):'–';$('cOk').textContent=t.ok||0;$('cFail').textContent=t.failed||0;$('cQr').textContent=t.qr_shown||0;$('cAct').textContent=t.active||0;
    $('sub').textContent='Updated '+new Date().toLocaleTimeString('en-GB')+' · showing '+items.length;
    $('rows').innerHTML=items.map(function(r,i){return '<tr data-i="'+i+'"><td>'+dt(r.created_at)+'</td><td>'+esc(r.email)+'</td><td>'+esc(r.plan_name||r.package_id)+'</td><td class="num">'+money(r.price_paid,r.currency)+'</td><td>'+tagAiralo(r)+'</td><td>'+esc(r.airalo_order_code||r.airalo_order_id)+'</td><td>'+esc(r.iccid)+'</td><td>'+esc(r.email_requested_to)+(r.email_cc?' <span class="dim">+cc</span>':'')+'</td><td>'+(r.qr_shown_at?'<span class="tag ok">Yes</span> <span class="dim">'+dt(r.qr_shown_at)+'</span>':(String(r.created_at||'')<QR_SINCE?'<span class="dim">Not tracked</span>':'<span class="tag warn">Not shown</span>'))+'</td><td>'+tagStatus(r.esim_status)+'</td><td class="num">'+(r.unlimited?'Unlimited':mb(r.data_remaining_mb))+'</td><td>'+dt(r.expires_at)+'</td></tr>'}).join('');
    $('empty').hidden=items.length>0;
  }).catch(function(){$('sub').textContent='Could not load orders.'});
}
var LABELS={payment_id:'Whop payment ID',created_at:'Purchased',email:'Customer email',destination:'Destination',plan_name:'Plan',package_id:'Airalo package',data:'Data',days:'Days',price_paid:'Paid',currency:'Currency',airalo_result:'eSIM at Airalo',airalo_http_status:'Airalo HTTP status',airalo_error:'Airalo error',airalo_order_id:'Airalo order ID',airalo_order_code:'Airalo order code',iccid:'ICCID',email_requested_to:'eSIM email sent to',email_cc:'Email copy (CC)',qr_shown_at:'QR first shown',qr_shown_count:'QR shown (times)',esim_status:'eSIM status',data_total_mb:'Data total (MB)',data_remaining_mb:'Data left (MB)',unlimited:'Unlimited',expires_at:'Expires',status_checked_at:'Status checked',updated_at:'Record updated',notes:'Notes'};
$('rows').addEventListener('click',function(e){var tr=e.target.closest('tr');if(!tr)return;var r=items[+tr.dataset.i];$('dTitle').textContent=r.payment_id;
 $('dBody').innerHTML=Object.keys(LABELS).map(function(k){var v=r[k];if(v==null||v==='')return '';if(/_at$/.test(k))v=dt(v);else v=esc(v);return '<dt>'+LABELS[k]+'</dt><dd>'+v+'</dd>'}).join('');$('dlg').showModal()});
$('dClose').onclick=function(){$('dlg').close()};
$('go').onclick=load;$('q').addEventListener('keydown',function(e){if(e.key==='Enter')load()});$('f').onchange=load;
$('csv').onclick=function(){var k=Object.keys(LABELS);var lines=[k.map(function(x){return LABELS[x]}).join(',')].concat(items.map(function(r){return k.map(function(x){var v=r[x]==null?'':String(r[x]);return /[",\\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',')}));
 var b=new Blob([lines.join('\\n')],{type:'text/csv'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='travelindo-orders.csv';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)};
load();
</script></body></html>`;

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return askForLogin();
  return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'x-robots-tag': 'noindex' } });
}
