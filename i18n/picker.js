/* Travelindo language + currency picker (one button, one panel). */
(function(){
  var LANGS = [['en','English','EN'],['id','Bahasa Indonesia','ID'],['zh','简体中文','中文'],['fr','Français','FR'],['it','Italiano','IT'],['ja','日本語','日本語'],['ko','한국어','한국어'],['es','Español','ES'],['de','Deutsch','DE']];
  var CURNAME = { USD:'US dollar', EUR:'Euro', GBP:'British pound', IDR:'Indonesian rupiah', CNY:'Chinese yuan', JPY:'Japanese yen', KRW:'South Korean won', SGD:'Singapore dollar', MYR:'Malaysian ringgit', THB:'Thai baht', AUD:'Australian dollar' };
  var SYM = { USD:'$', EUR:'€', GBP:'£', IDR:'Rp', CNY:'¥', JPY:'¥', KRW:'₩', SGD:'S$', MYR:'RM', THB:'฿', AUD:'A$' };
  var HEAD = { en:['Language','Currency'], id:['Bahasa','Mata uang'], zh:['语言','货币'], fr:['Langue','Devise'], it:['Lingua','Valuta'], ja:['言語','通貨'], ko:['언어','통화'], es:['Idioma','Moneda'], de:['Sprache','Währung'] };
  var LCODES = LANGS.map(function(l){ return l[0]; });
  var cur = window.TL_LANG || 'en';
  function urlFor(code){
    var path = location.pathname.replace(/^\/(id|zh|fr|it|ja|ko|es|de)(\/|$)/, '/');
    return (code === 'en' ? '' : '/' + code) + path + location.hash;
  }
  var css = '.tlp{position:relative;display:inline-block;font-family:inherit}'
  + '.tlp-btn{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--ink);font:inherit;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap}'
  + '.tlp-btn:hover,.tlp-btn[aria-expanded="true"]{border-color:#4F56FF}'
  + '.tlp-btn .sep{opacity:.35}.tlp-btn .chev{transition:transform .15s}.tlp-btn[aria-expanded="true"] .chev{transform:rotate(180deg)}'
  + '.tlp-pop{position:absolute;right:0;top:calc(100% + 8px);z-index:1000;width:min(440px,calc(100vw - 32px));background:var(--surface);color:var(--ink);border:1px solid var(--border);border-radius:16px;box-shadow:0 18px 50px rgba(24,60,156,.18);padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:6px 14px}'
  + '.tlp-pop[hidden]{display:none}'
  + '.tlp-h{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:2px 10px 6px}'
  + '.tlp-list{display:flex;flex-direction:column;gap:2px;max-height:320px;overflow:auto}'
  + '.tlp-it{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:10px;border:0;background:none;color:inherit;font:inherit;font-size:14px;text-align:left;text-decoration:none!important;cursor:pointer}'
  + '.tlp-it:hover,.tlp-it:focus-visible{background:var(--tint)}'
  + '.tlp-it[aria-current="true"]{background:var(--tint);color:var(--link);font-weight:700}'
  + '.tlp-it small{color:var(--muted);font-weight:400;font-size:12px}'
  + '.tlp-it .ck{width:16px;height:16px;flex:none;opacity:0}.tlp-it[aria-current="true"] .ck{opacity:1}'
  + '@media (max-width:560px){.tlp-btn .full{display:none}.tlp-btn{padding:0 10px;gap:6px}.tlp-pop{position:fixed;left:16px;right:16px;top:70px;width:auto}}'
  + '@media (min-width:561px){.tlp-btn .short{display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function svg(p, w){ return '<svg width="' + (w || 16) + '" height="' + (w || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var GLOBE = svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>', 18);
  var CHEV = svg('<path d="m6 9 6 6 6-6"/>', 14).replace('<svg', '<svg class="chev"');
  var CHECK = svg('<path d="M20 6 9 17l-5-5"/>').replace('<svg', '<svg class="ck"');
  function build(host){
    var T = window.TLC, c = T ? T.cur() : 'USD', L = LANGS.filter(function(l){ return l[0] === cur; })[0] || LANGS[0], H = HEAD[cur] || HEAD.en;
    host.className = 'tlp'; host.setAttribute('data-notr', '');
    host.innerHTML = '<button type="button" class="tlp-btn" aria-haspopup="true" aria-expanded="false" aria-label="' + H[0] + ' / ' + H[1] + '">' + GLOBE
      + '<span class="full">' + L[1] + '</span><span class="short">' + L[2] + '</span><span class="sep">·</span><span>' + c + '</span>' + CHEV + '</button>'
      + '<div class="tlp-pop" hidden><div><div class="tlp-h">' + H[0] + '</div><div class="tlp-list" role="list">'
      + LANGS.map(function(l){ return '<a class="tlp-it" role="listitem" lang="' + l[0] + '" href="' + urlFor(l[0]) + '"' + (l[0] === cur ? ' aria-current="true"' : '') + '><span>' + l[1] + '</span>' + CHECK + '</a>'; }).join('')
      + '</div></div><div><div class="tlp-h">' + H[1] + '</div><div class="tlp-list" role="list">'
      + (T ? T.list : ['USD']).map(function(k){ return '<button type="button" class="tlp-it" role="listitem" data-cur="' + k + '"' + (k === c ? ' aria-current="true"' : '') + '><span>' + k + ' <small>' + SYM[k] + ' · ' + CURNAME[k] + '</small></span>' + CHECK + '</button>'; }).join('')
      + '</div></div></div>';
    var btn = host.querySelector('.tlp-btn'), pop = host.querySelector('.tlp-pop');
    function open(o){ pop.hidden = !o; btn.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) { var f = pop.querySelector('[aria-current="true"]'); if (f) f.focus(); } }
    btn.addEventListener('click', function(e){ e.stopPropagation(); open(pop.hidden); });
    document.addEventListener('click', function(e){ if (!host.contains(e.target)) open(false); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !pop.hidden) { open(false); btn.focus(); } });
    pop.addEventListener('click', function(e){ var b = e.target.closest('[data-cur]'); if (b && T) T.set(b.getAttribute('data-cur')); });
    window.addEventListener('hashchange', function(){ pop.querySelectorAll('a.tlp-it').forEach(function(a){ a.href = urlFor(a.getAttribute('lang')); }); });
  }
  function init(){ document.querySelectorAll('[data-tl-picker]').forEach(build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
