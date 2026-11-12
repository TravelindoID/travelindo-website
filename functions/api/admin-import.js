// POST /api/admin-import  (admin password) body: {"orders":[{payment_id, ...same fields as /api/orders}]}
// For adding orders that were made before the back end existed. Existing values are kept unless sent.
import { ensureSchema, json, isAdmin, askForLogin, clean, num, now } from './_common.js';

const TEXT = ['email', 'destination', 'package_id', 'plan_name', 'data', 'currency', 'airalo_result', 'airalo_error',
  'airalo_order_id', 'airalo_order_code', 'iccid', 'email_requested_to', 'email_cc', 'created_at', 'notes'];
const NUMS = ['days', 'price_paid', 'airalo_http_status'];

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return askForLogin();
  let b;
  try { b = await request.json(); } catch (e) { return json({ ok: false, error: 'bad body' }, 400); }
  const list = Array.isArray(b.orders) ? b.orders.slice(0, 500) : [];
  await ensureSchema(env.DB);
  const stmts = [];
  for (const o of list) {
    const pid = clean(o.payment_id, 80);
    if (!pid) continue;
    const cols = ['payment_id', 'updated_at'], vals = [pid, now()];
    for (const k of TEXT) if (o[k] !== undefined) { cols.push(k); vals.push(clean(o[k], 1000)); }
    for (const k of NUMS) if (o[k] !== undefined) { cols.push(k); vals.push(num(o[k])); }
    if (!cols.includes('created_at')) { cols.push('created_at'); vals.push(now()); }
    const upd = cols.filter(c => c !== 'payment_id' && c !== 'created_at').map(c => `${c}=COALESCE(excluded.${c}, orders.${c})`).join(', ');
    stmts.push(env.DB.prepare(`INSERT INTO orders (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})
      ON CONFLICT(payment_id) DO UPDATE SET ${upd}, created_at=COALESCE(orders.created_at, excluded.created_at)`).bind(...vals));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, imported: stmts.length });
}
