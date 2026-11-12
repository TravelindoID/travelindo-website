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

let ready = false;
export async function ensureSchema(db) {
  if (ready) return;
  await db.batch(SCHEMA.map(s => db.prepare(s)));
  ready = true;
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
