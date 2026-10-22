/* Travelindo currency display. Plans are priced in USD; other currencies are shown as estimates. */
window.TLC = (function(){
  var LANGCUR = { en:'USD', id:'IDR', zh:'CNY', fr:'EUR', it:'EUR', es:'EUR', de:'EUR', ja:'JPY', ko:'KRW' };
  var LOCALE = { en:'en-US', id:'id-ID', zh:'zh-CN', fr:'fr-FR', it:'it-IT', es:'es-ES', de:'de-DE', ja:'ja-JP', ko:'ko-KR' };
  var LIST = ['USD','EUR','GBP','IDR','CNY','JPY','KRW','SGD','MYR','THB','AUD'];
  var NODEC = { IDR:1, JPY:1, KRW:1 };
  var lang = window.TL_LANG || (document.documentElement.lang || 'en').slice(0, 2);
  if (!LANGCUR[lang]) lang = 'en';
  var cur = LANGCUR[lang], rates = null;
  try { var p = JSON.parse(localStorage.getItem('tl_cur') || 'null'); if (p && p.lang === lang && LIST.indexOf(p.cur) > -1) cur = p.cur; } catch (e) {}
  try { var c = JSON.parse(localStorage.getItem('tl_rates') || 'null'); if (c && c.r && Date.now() - c.t < 12 * 3600e3) rates = c.r; } catch (e) {}
  var ready = (cur === 'USD' || rates) ? Promise.resolve() : Promise.race([
    fetch('https://open.er-api.com/v6/latest/USD').then(function(r){ return r.json(); }).then(function(j){
      if (j && j.result === 'success' && j.rates) { rates = j.rates; try { localStorage.setItem('tl_rates', JSON.stringify({ t: Date.now(), r: rates })); } catch (e) {} }
    }).catch(function(){}),
    new Promise(function(res){ setTimeout(res, 2500); })
  ]);
  function active(){ return cur !== 'USD' && !!(rates && rates[cur]); }
  function fmt(usd){
    if (!active()) return '$' + Number(usd).toFixed(2);
    var d = NODEC[cur] ? 0 : 2;
    return '≈\u00a0' + new Intl.NumberFormat(LOCALE[lang] || 'en-US', { style: 'currency', currency: cur, minimumFractionDigits: d, maximumFractionDigits: d }).format(usd * rates[cur]);
  }
  function set(c){ try { localStorage.setItem('tl_cur', JSON.stringify({ lang: lang, cur: c })); } catch (e) {} location.reload(); }
  return { lang: lang, cur: function(){ return cur; }, list: LIST, ready: ready, fmt: fmt, active: active, set: set };
})();
