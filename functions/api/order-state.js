// GET /api/order-state?payment_id=pay_...  (public) -> { state } only
import { ensureSchema, json, PAY_RE } from './_common.js';
export async function onRequestGet({ request, env }) {
  const pid = new URL(request.url).searchParams.get('payment_id') || '';
  if (!PAY_RE.test(pid)) return json({ state: 'unknown' }, 400);
  await ensureSchema(env.DB);
  const r = await env.DB.prepare('SELECT approval_state, airalo_result FROM orders WHERE payment_id=?').bind(pid).first();
  if (!r) return json({ state: 'unknown' });
  const s = r.approval_state === 'awaiting' ? 'awaiting_approval' : r.approval_state === 'rejected' ? 'rejected' : (r.airalo_result || 'unknown');
  return json({ state: s });
}
