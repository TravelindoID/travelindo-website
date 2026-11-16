/* Travelindo: Meta Pixel, loaded only after the visitor accepts advertising cookies.
   window.tlTrack(event, params, eventId) sends an event when consent was given; otherwise it does nothing.
   window.tlCookieSettings() shows the choice again (used by the Privacy Policy). */
(function(){
  var PIXEL_ID = '1846052306396019';
  var KEY = 'tl_ad_consent';
  var T = {
    en: ['We use an advertising cookie (Meta Pixel) to measure our Facebook and Instagram ads. Is that OK?', 'Accept', 'Decline', 'Privacy Policy'],
    id: ['Kami memakai cookie iklan (Meta Pixel) untuk mengukur iklan Facebook dan Instagram kami. Boleh?', 'Terima', 'Tolak', 'Kebijakan Privasi'],
    de: ['Wir verwenden ein Werbe-Cookie (Meta Pixel), um unsere Facebook- und Instagram-Werbung zu messen. Einverstanden?', 'Akzeptieren', 'Ablehnen', 'Datenschutz'],
    es: ['Usamos una cookie publicitaria (Meta Pixel) para medir nuestros anuncios de Facebook e Instagram. ¿De acuerdo?', 'Aceptar', 'Rechazar', 'Privacidad'],
    fr: ['Nous utilisons un cookie publicitaire (Meta Pixel) pour mesurer nos publicités Facebook et Instagram. D\'accord ?', 'Accepter', 'Refuser', 'Confidentialité'],
    it: ['Usiamo un cookie pubblicitario (Meta Pixel) per misurare i nostri annunci su Facebook e Instagram. Va bene?', 'Accetta', 'Rifiuta', 'Privacy'],
    ja: ['Facebook・Instagram広告の効果測定のため、広告Cookie（Meta Pixel）を使用します。よろしいですか？', '同意する', '拒否する', 'プライバシーポリシー'],
    ko: ['Facebook·Instagram 광고 성과 측정을 위해 광고 쿠키(Meta Pixel)를 사용합니다. 동의하시나요?', '동의', '거부', '개인정보처리방침'],
    zh: ['我们使用广告 Cookie（Meta Pixel）来衡量 Facebook 和 Instagram 广告效果。可以吗？', '接受', '拒绝', '隐私政策']
  };
  function get(){ try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v){ try { localStorage.setItem(KEY, v); } catch (e) {} }

  var loaded = false;
  function load(){
    if (loaded) return; loaded = true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
    var m = location.pathname.match(/\/esim\/([a-z-]+)\/?$/);
    if (m) window.fbq('track', 'ViewContent', { content_name: m[1], content_type: 'product_group' });
  }

  window.tlTrack = function(ev, params, eventId){
    if (get() !== 'yes') return;
    load();
    try { window.fbq('track', ev, params || {}, eventId ? { eventID: String(eventId) } : undefined); } catch (e) {}
  };

  function bar(){
    if (document.getElementById('tlCookieBar')) return;
    var lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    var t = T[lang] || T.en;
    var d = document.createElement('div');
    d.id = 'tlCookieBar'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-live', 'polite');
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:640px;margin:0 auto;' +
      'background:var(--surface,#fff);color:var(--ink,#15172B);border:1px solid var(--border,#E4E3EF);border-radius:14px;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.18);padding:14px 16px;font:14px/1.45 inherit;display:flex;flex-wrap:wrap;gap:10px;align-items:center';
    var p = document.createElement('p'); p.style.cssText = 'margin:0;flex:1 1 260px';
    p.appendChild(document.createTextNode(t[0] + ' '));
    var a = document.createElement('a'); a.href = '/privacy.html#cookies'; a.textContent = t[3]; a.style.color = 'var(--link,#5B3FD9)';
    p.appendChild(a);
    function btn(label, primary, v){
      var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.style.cssText = 'font:inherit;font-weight:700;border-radius:10px;padding:9px 16px;cursor:pointer;' +
        (primary ? 'border:0;background:var(--btn-a,#6D3BEF);color:#fff' : 'border:1px solid var(--border,#C9C7D9);background:transparent;color:inherit');
      b.addEventListener('click', function(){ set(v); d.remove(); if (v === 'yes') load(); });
      return b;
    }
    d.appendChild(p); d.appendChild(btn(t[2], false, 'no')); d.appendChild(btn(t[1], true, 'yes'));
    document.body.appendChild(d);
  }

  window.tlCookieSettings = function(){ try { localStorage.removeItem(KEY); } catch (e) {} bar(); };

  var c = get();
  if (c === 'yes') load();
  else if (c !== 'no') {
    if (document.body) bar(); else document.addEventListener('DOMContentLoaded', bar);
  }
})();
