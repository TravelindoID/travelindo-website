/* Travelindo translation engine. Translates visible text using window.TL_DICT for window.TL_LANG. */
(function(){
  var L = window.TL_LANG, D = window.TL_DICT;
  if (!L || L === 'en' || !D) return;
  var S = D.strings || {}, T = D.templates || {}, P = D.pages || {};
  var DEST = { Asia: P.name_asia, Europe: P.name_europe, Global: P.name_global };
  var FIX = { 'Turkey':'TR','United States':'US','United Kingdom':'GB','South Korea':'KR','Vietnam':'VN','Czechia':'CZ','Czech Republic':'CZ','Macau':'MO','Hong Kong':'HK','Taiwan':'TW','Russia':'RU','Laos':'LA','Ivory Coast':'CI',"Côte d'Ivoire":'CI','North Macedonia':'MK','Myanmar':'MM','Burma Myanmar (Burma)':'MM','Palestine':'PS','Bosnia and Herzegovina':'BA','Cape Verde':'CV','Cabo Verde':'CV','Eswatini':'SZ','Swaziland':'SZ','Kosovo':'XK','Curaçao':'CW','Réunion':'RE','Sint Maarten (Dutch part)':'SX','Timor-Leste':'TL','The Netherlands':'NL','Netherlands':'NL','Antigua and Barbuda':'AG','Democratic Republic of the Congo':'CD','Republic of the Congo':'CG','Saint Kitts and Nevis':'KN','Saint Lucia':'LC','Saint Vincent and the Grenadines':'VC','Trinidad and Tobago':'TT','Turks and Caicos Islands':'TC','Bonaire':'BQ','Saint Barthélemy':'BL','Saint Martin':'MF','Bosnia & Herzegovina':'BA','United States Virgin Islands':'VI','US Virgin Islands':'VI','British Virgin Islands':'VG','Saint Pierre and Miquelon':'PM','Sao Tome and Principe':'ST','Heard Island and McDonald Islands':'HM' };
  var regionNames = null, enToCode = null;
  try {
    regionNames = new Intl.DisplayNames([L], { type: 'region' });
    var en = new Intl.DisplayNames(['en'], { type: 'region' }); enToCode = {};
    var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i = 0; i < 26; i++) for (var j = 0; j < 26; j++) { var c = A[i] + A[j]; try { var n = en.of(c); if (n && n !== c) enToCode[n] = c; } catch (e) {} }
  } catch (e) {}
  function country(s){
    if (DEST[s]) return DEST[s];
    if (!regionNames) return null;
    var c = FIX[s] || (enToCode && enToCode[s]);
    if (!c) return null;
    try { var n = regionNames.of(c); return n && n !== c ? n : null; } catch (e) { return null; }
  }
  var tpls = Object.keys(T).sort(function(a, b){ return b.replace(/\{\d\}/g, '').length - a.replace(/\{\d\}/g, '').length; }).map(function(k){
    var re = '^' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{(\d)\\\}/g, '(.+?)') + '$';
    return { re: new RegExp(re), to: T[k], keys: (k.match(/\{\d\}/g) || []).map(function(x){ return +x[1]; }) };
  });
  function core(s, depth){
    if (S.hasOwnProperty(s)) return S[s];
    var cn = country(s); if (cn) return cn;
    if (depth > 2) return null;
    for (var i = 0; i < tpls.length; i++) {
      var m = tpls[i].re.exec(s); if (!m) continue;
      var out = tpls[i].to, t = tpls[i];
      for (var k = 0; k < t.keys.length; k++) { var arg = m[k + 1]; var tr = core(arg, depth + 1); out = out.replace('{' + t.keys[k] + '}', tr == null ? arg : tr); }
      return out;
    }
    return null;
  }
  function tr(s){
    if (!s) return s;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s); var r = core(m[2], 0);
    return r == null ? s : m[1] + r + m[3];
  }
  window.TL = { lang: L, tr: function(s){ var r = core(s, 0); return r == null ? s : r; } };
  var done = new WeakMap(), ATTR = ['placeholder', 'aria-label', 'title', 'alt'];
  function skip(el){ return !el || /^(SCRIPT|STYLE|TEXTAREA|CODE)$/.test(el.tagName) || (el.closest && el.closest('[data-notr]')); }
  function doText(n){
    var v = n.nodeValue; if (!v || !v.trim()) return;
    if (done.get(n) === v) return;
    if (skip(n.parentElement)) return;
    var t = tr(v); if (t !== v) n.nodeValue = t; done.set(n, n.nodeValue);
  }
  function doEl(el){
    if (skip(el)) return;
    for (var i = 0; i < ATTR.length; i++) { var a = ATTR[i], v = el.getAttribute && el.getAttribute(a); if (v && el.getAttribute('data-tl-' + a) !== v) { var t = tr(v); if (t !== v) el.setAttribute(a, t); el.setAttribute('data-tl-' + a, t); } }
  }
  function walk(root){
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doEl(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  function start(){
    walk(document.body);
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doEl(m.target);
        else m.addedNodes.forEach(walk);
      });
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR });
    document.documentElement.removeAttribute('data-tl-pending');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  setTimeout(function(){ document.documentElement.removeAttribute('data-tl-pending'); }, 1500);
})();
