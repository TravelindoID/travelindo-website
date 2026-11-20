/* Travelindo: Meta Pixel with a cookie bar.
   EU/EEA, UK, Switzerland and Indonesia: the pixel loads only after the visitor clicks Accept.
   Everywhere else: the pixel is on by default and the bar lets the visitor Decline (which switches it off).
   If the country can't be found, the stricter Accept-first rule is used.
   window.tlTrack(event, params, eventId) sends an event when tracking is allowed; otherwise it does nothing.
   window.tlCookieSettings() shows the choice again (used by the Privacy Policy). */
(function(){
  var PIXEL_ID = '1846052306396019';
  var KEY = 'tl_ad_consent', GEO = 'tl_geo';
  var STRICT = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH ID'.split(' ');
  // [ask text, Accept, Decline, Privacy, notice text, OK]
  var T = {
    en: ['We use an advertising cookie (Meta Pixel) to measure our Facebook and Instagram ads. Is that OK?', 'Accept', 'Decline', 'Privacy Policy', 'We use an advertising cookie (Meta Pixel) to measure our Facebook and Instagram ads. You can decline it.', 'OK'],
    id: ['Kami memakai cookie iklan (Meta Pixel) untuk mengukur iklan Facebook dan Instagram kami. Boleh?', 'Terima', 'Tolak', 'Kebijakan Privasi', 'Kami memakai cookie iklan (Meta Pixel) untuk mengukur iklan Facebook dan Instagram kami. Kamu bisa menolaknya.', 'Oke'],
    de: ['Wir verwenden ein Werbe-Cookie (Meta Pixel), um unsere Facebook- und Instagram-Werbung zu messen. Einverstanden?', 'Akzeptieren', 'Ablehnen', 'Datenschutz', 'Wir verwenden ein Werbe-Cookie (Meta Pixel), um unsere Facebook- und Instagram-Werbung zu messen. Sie können es ablehnen.', 'OK'],
    es: ['Usamos una cookie publicitaria (Meta Pixel) para medir nuestros anuncios de Facebook e Instagram. ¿De acuerdo?', 'Aceptar', 'Rechazar', 'Privacidad', 'Usamos una cookie publicitaria (Meta Pixel) para medir nuestros anuncios de Facebook e Instagram. Puedes rechazarla.', 'Vale'],
    fr: ['Nous utilisons un cookie publicitaire (Meta Pixel) pour mesurer nos publicités Facebook et Instagram. D\'accord ?', 'Accepter', 'Refuser', 'Confidentialité', 'Nous utilisons un cookie publicitaire (Meta Pixel) pour mesurer nos publicités Facebook et Instagram. Vous pouvez le refuser.', 'OK'],
    it: ['Usiamo un cookie pubblicitario (Meta Pixel) per misurare i nostri annunci su Facebook e Instagram. Va bene?', 'Accetta', 'Rifiuta', 'Privacy', 'Usiamo un cookie pubblicitario (Meta Pixel) per misurare i nostri annunci su Facebook e Instagram. Puoi rifiutarlo.', 'OK'],
    ja: ['Facebook・Instagram広告の効果測定のため、広告Cookie（Meta Pixel）を使用します。よろしいですか？', '同意する', '拒否する', 'プライバシーポリシー', 'Facebook・Instagram広告の効果測定のため、広告Cookie（Meta Pixel）を使用しています。拒否することもできます。', 'OK'],
    ko: ['Facebook·Instagram 광고 성과 측정을 위해 광고 쿠키(Meta Pixel)를 사용합니다. 동의하시나요?', '동의', '거부', '개인정보처리방침', 'Facebook·Instagram 광고 성과 측정을 위해 광고 쿠키(Meta Pixel)를 사용합니다. 거부할 수 있습니다.', '확인'],
    zh: ['我们使用广告 Cookie（Meta Pixel）来衡量 Facebook 和 Instagram 广告效果。可以吗？', '接受', '拒绝', '隐私政策', '我们使用广告 Cookie（Meta Pixel）来衡量 Facebook 和 Instagram 广告效果。您可以拒绝。', '好的']
  };
  function get(){ try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v){ try { localStorage.setItem(KEY, v); } catch (e) {} }

  // ---- country: strict (Accept first) or not; cached for the session ----
  var strict = null, waiting = [];
  function withGeo(cb){
    if (strict !== null) return cb(strict);
    waiting.push(cb);
    if (waiting.length > 1) return;
    var done = function(c){
      strict = !c || STRICT.indexOf(c) !== -1;
      try { sessionStorage.setItem(GEO, c || '?'); } catch (e) {}
      var w = waiting; waiting = []; w.forEach(function(f){ f(strict); });
    };
    var cached = null; try { cached = sessionStorage.getItem(GEO); } catch (e) {}
    if (cached) return done(cached === '?' ? '' : cached);
    var ok = false, timer = setTimeout(function(){ if (!ok) { ok = true; done(''); } }, 4000);
    try {
      fetch('/api/geo', { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : {}; })
        .then(function(j){ if (ok) return; ok = true; clearTimeout(timer); done(String(j && j.c || '').toUpperCase()); })
        .catch(function(){ if (ok) return; ok = true; clearTimeout(timer); done(''); });
    } catch (e) { ok = true; clearTimeout(timer); done(''); }
  }
  function allowed(cb){
    var c = get();
    if (c === 'yes') return cb(true);
    if (c === 'no') return cb(false);
    withGeo(function(s){ cb(!s); });
  }

  var loaded = false;
  function load(){
    if (loaded) { try { window.fbq('consent', 'grant'); } catch (e) {} return; }
    loaded = true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
    var m = location.pathname.match(/\/esim\/([a-z-]+)\/?$/);
    if (m) window.fbq('track', 'ViewContent', { content_name: m[1], content_type: 'product_group' });
  }
  function stop(){ if (loaded) { try { window.fbq('consent', 'revoke'); } catch (e) {} } }

  window.tlTrack = function(ev, params, eventId){
    allowed(function(ok){
      if (!ok) return;
      load();
      try { window.fbq('track', ev, params || {}, eventId ? { eventID: String(eventId) } : undefined); } catch (e) {}
    });
  };

  // mode 'ask' = Accept / Decline (pixel off until Accept); mode 'notice' = OK / Decline (pixel already on)
  function bar(mode){
    if (document.getElementById('tlCookieBar')) return;
    var lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    var t = T[lang] || T.en;
    var d = document.createElement('div');
    d.id = 'tlCookieBar'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-live', 'polite');
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:640px;margin:0 auto;' +
      'background:var(--surface,#fff);color:var(--ink,#15172B);border:1px solid var(--border,#E4E3EF);border-radius:14px;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.18);padding:14px 16px;font:14px/1.45 inherit;display:flex;flex-wrap:wrap;gap:10px;align-items:center';
    var p = document.createElement('p'); p.style.cssText = 'margin:0;flex:1 1 260px';
    p.appendChild(document.createTextNode((mode === 'notice' ? t[4] : t[0]) + ' '));
    var a = document.createElement('a'); a.href = '/privacy.html#cookies'; a.textContent = t[3]; a.style.color = 'var(--link,#5B3FD9)';
    p.appendChild(a);
    function btn(label, primary, v){
      var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.style.cssText = 'font:inherit;font-weight:700;border-radius:10px;padding:9px 16px;cursor:pointer;' +
        (primary ? 'border:0;background:var(--btn-a,#6D3BEF);color:#fff' : 'border:1px solid var(--border,#C9C7D9);background:transparent;color:inherit');
      b.addEventListener('click', function(){ set(v); d.remove(); if (v === 'yes') load(); else stop(); });
      return b;
    }
    d.appendChild(p); d.appendChild(btn(t[2], false, 'no')); d.appendChild(btn(mode === 'notice' ? t[5] : t[1], true, 'yes'));
    document.body.appendChild(d);
  }
  function showBar(mode){ if (document.body) bar(mode); else document.addEventListener('DOMContentLoaded', function(){ bar(mode); }); }

  window.tlCookieSettings = function(){
    try { localStorage.removeItem(KEY); } catch (e) {}
    withGeo(function(s){ showBar(s ? 'ask' : 'notice'); });
  };

  var c = get();
  if (c === 'yes') load();
  else if (c !== 'no') {
    withGeo(function(s){
      if (s) showBar('ask');
      else { load(); showBar('notice'); }
    });
  }
})();
