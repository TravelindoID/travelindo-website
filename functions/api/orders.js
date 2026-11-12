// POST /api/orders  (Make.com only, X-TL-Key)
// Creates or updates one purchase. Only fields that are sent are changed.
import { ensureSchema, json, isMake, readBody, clean, num, now } from './_common.js';

const TEXT = ['email', 'destination', 'package_id', 'plan_name', 'data', 'currency', 'airalo_result', 'airalo_error',
  'airalo_order_id', 'airalo_order_code', 'iccid', 'email_requested_to', 'email_cc', 'created_at', 'notes'];
const NUMS = ['days', 'price_paid', 'airalo_http_status'];

export async function onRequestPost({ request, env }) {
  if (!isMake(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  let b;
  try { b = await readBody(request); } catch (e) { return json({ ok: false, error: 'bad body' }, 400); }
  const pid = clean(b.payment_id, 80);
  if (!pid) return json({ ok: false, error: 'payment_id required' }, 400);
  await ensureSchema(env.DB);

  const cols = ['payment_id', 'updated_at'], vals = [pid, now()];
  for (const k of TEXT) if (b[k] !== undefined) { cols.push(k); vals.push(clean(b[k], k === 'airalo_error' || k === 'notes' ? 1000 : 300)); }
  for (const k of NUMS) if (b[k] !== undefined) { cols.push(k); vals.push(num(b[k])); }
  if (!cols.includes('created_at')) { cols.push('created_at'); vals.push(now()); }
  // airalo_result defaults from the HTTP status when not given
  if (!cols.includes('airalo_result') && b.airalo_http_status !== undefined) {
    const s = num(b.airalo_http_status);
    cols.push('airalo_result'); vals.push(s && s >= 200 && s < 300 ? 'ok' : 'failed');
  }
  // On update keep the first created_at.
  const upd = cols.filter(c => c !== 'payment_id' && c !== 'created_at').map(c => `${c}=excluded.${c}`).join(', ');
  const sql = `INSERT INTO orders (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})
    ON CONFLICT(payment_id) DO UPDATE SET ${upd}, created_at=COALESCE(orders.created_at, excluded.created_at)`;
  await env.DB.prepare(sql).bind(...vals).run();
  return json({ ok: true, payment_id: pid });
}
