// Shared helpers for the Travelindo order back end (Cloudflare Pages Functions + D1).
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS orders (
    payment_id TEXT PRIMARY KEY,
    created_at TEXT,
    updated_at TEXT,
    email TEXT,
    destination TEXT,
    package_id TEXT,
    plan_name TEXT,
    data TEXT,
    days INTEGER,
    price_paid REAL,
    currency TEXT,
    airalo_result TEXT,
    airalo_http_status INTEGER,
    airalo_error TEXT,
    airalo_order_id TEXT,
    airalo_order_code TEXT,
    iccid TEXT,
    email_requested_to TEXT,
    email_cc TEXT,
    qr_shown_at TEXT,
    qr_shown_count INTEGER DEFAULT 0,
    esim_status TEXT,
    data_total_mb REAL,
    data_remaining_mb REAL,
    unlimited INTEGER,
    expires_at TEXT,
    status_checked_at TEXT,
    notes TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_iccid ON orders(iccid)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email)`
];

const EXTRA_COLS = ['approval_state TEXT', 'approval_at TEXT', 'notified_at TEXT', 'customer_name TEXT', 'card TEXT', 'billing_country TEXT', 'risk_score REAL'];
let ready = false;
export async function ensureSchema(db) {
  if (ready) return;
  await db.batch(SCHEMA.map(s => db.prepare(s)));
  for (const c of EXTRA_COLS) { try { await db.prepare('ALTER TABLE orders ADD COLUMN ' + c).run(); } catch (e) { /* already there */ } }
  ready = true;
}

// ---- Whop API (key lives only in the Cloudflare secret WHOP_API_KEY) ----
export async function whop(env, path, method = 'GET') {
  const r = await fetch('https://api.whop.com/api/v1' + path, { method, headers: { Authorization: 'Bearer ' + env.WHOP_API_KEY, Accept: 'application/json' } });
  let body = null; try { body = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, body };
}

// ---- One-click approval links: HMAC of the payment ID, signed with INGEST_KEY ----
export async function sign(env, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.INGEST_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('approve:' + text));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

// ---- Email via Make (Scenario B "send_email" route, sends from cs@hotelmurah.com) ----
export const MAKE_HOOK = 'https://hook.eu1.make.com/42yp8vs8n35uxn8d80k1vexam1hnxgaj';
// Who receives the approve/reject emails (one email to each address).
export const OWNER_EMAIL = ['cs@hotelmurah.com', 'ayya.yurizal2006@gmail.com'];
export async function sendEmail(env, to, subject, html) {
  const list = Array.isArray(to) ? to : [to];
  let ok = true;
  for (const addr of list) {
    const r = await fetch(MAKE_HOOK, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'send_email', key: env.INGEST_KEY, to: addr, subject, html }) });
    ok = ok && r.ok;
  }
  return ok;
}

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const PAY_RE = /^pay_[A-Za-z0-9]{6,40}$/;

// Readable summary rows of a Whop payment object.
export function paymentRows(p) {
  const a = p.billing_address || {};
  const money = (v, c) => v == null ? '' : Number(v).toFixed(2) + ' ' + String(c || '').toUpperCase();
  return [
    ['Payment ID', p.id],
    ['Status', [p.status, p.substatus].filter(Boolean).join(' / ')],
    ['Product', p.product && p.product.title],
    ['Plan ID', p.plan && p.plan.id],
    ['Amount (USD)', p.usd_total != null ? '$' + Number(p.usd_total).toFixed(2) : ''],
    ['Amount charged in', money(p.total, p.currency)],
    ['Customer name', p.user && p.user.name],
    ['Customer email', p.user && p.user.email],
    ['Whop username', p.user && p.user.username],
    ['Phone', p.customer_phone || (p.member && p.member.phone) || ''],
    ['Card', [p.card_brand, p.card_last4 ? '\u2022\u2022' + p.card_last4 : '', p.card_exp_month ? 'exp ' + p.card_exp_month + '/' + p.card_exp_year : ''].filter(Boolean).join(' ')],
    ['Payment method', p.payment_method_type],
    ['Name on billing address', a.name],
    ['Billing address', [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(', ')],
    ['Billing country', a.country],
    ['3-D Secure verified', p.three_ds_verified === true ? 'Yes' : p.three_ds_verified === false ? 'No' : ''],
    ['Whop risk score', p.risk_score],
    ['Risk signals', p.risk_signals ? JSON.stringify(p.risk_signals) : ''],
    ['Card checks', p.verification_checks ? Object.entries(p.verification_checks).map(([k, v]) => k + ': ' + v).join(', ') : ''],
    ['Created', p.created_at],
    ['Auto-capture at', p.auto_capture_at || '']
  ].filter(r => r[1] !== undefined && r[1] !== null && r[1] !== '');
}
export function rowsHtml(rows) {
  return '<table cellpadding="6" style="border-collapse:collapse;font:14px Arial,sans-serif">' +
    rows.map(r => '<tr><td style="color:#555;border-bottom:1px solid #eee;white-space:nowrap">' + esc(r[0]) + '</td><td style="border-bottom:1px solid #eee"><b>' + esc(r[1]) + '</b></td></tr>').join('') + '</table>';
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
  });
}

// Constant-time string compare.
export function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Make.com calls carry the shared key in the X-TL-Key header.
export function isMake(request, env) {
  return !!env.INGEST_KEY && safeEqual(request.headers.get('x-tl-key'), env.INGEST_KEY);
}

// Admin uses HTTP Basic auth; any user name, password = ADMIN_PASSWORD.
export function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const h = request.headers.get('authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  let decoded = '';
  try { decoded = atob(h.slice(6)); } catch (e) { return false; }
  const pass = decoded.slice(decoded.indexOf(':') + 1);
  return safeEqual(pass, env.ADMIN_PASSWORD);
}

export function askForLogin() {
  return new Response('Login required', {
    status: 401,
    headers: { 'www-authenticate': 'Basic realm="Travelindo admin", charset="UTF-8"', 'cache-control': 'no-store' }
  });
}

export const now = () => new Date().toISOString();

export async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return await request.json();
  const form = await request.formData();
  const o = {};
  for (const [k, v] of form.entries()) o[k] = v;
  return o;
}

export const clean = (v, max = 300) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s.slice(0, max);
};
export const num = v => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
