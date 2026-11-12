// GET  /api/status   (Make only) -> eSIMs whose status should be checked today
// POST /api/status   (Make only) -> save Airalo usage/status for one eSIM
import { ensureSchema, json, isMake, readBody, clean, num, now } from './_common.js';

export async function onRequestGet({ request, env }) {
  if (!isMake(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  await ensureSchema(env.DB);
  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '40', 10) || 40, 1), 100);
  // Not finished/expired, has an ICCID, bought in the last 400 days, not already checked in the last 20 hours.
  const { results } = await env.DB.prepare(
    `SELECT payment_id, iccid FROM orders
     WHERE iccid IS NOT NULL AND iccid != ''
       AND (esim_status IS NULL OR esim_status NOT IN ('FINISHED','EXPIRED'))
       AND (expires_at IS NULL OR expires_at > ?)
       AND created_at > ?
       AND (status_checked_at IS NULL OR status_checked_at < ?)
     ORDER BY COALESCE(status_checked_at, '') ASC LIMIT ?`
  ).bind(now(), new Date(Date.now() - 400 * 864e5).toISOString(), new Date(Date.now() - 20 * 36e5).toISOString(), limit).all();
  return json({ ok: true, count: results.length, items: results });
}

export async function onRequestPost({ request, env }) {
  if (!isMake(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
  let b;
  try { b = await readBody(request); } catch (e) { return json({ ok: false, error: 'bad body' }, 400); }
  const iccid = clean(b.iccid, 40);
  if (!iccid) return json({ ok: false, error: 'iccid required' }, 400);
  await ensureSchema(env.DB);
  const unl = b.unlimited === undefined ? null : (b.unlimited === true || b.unlimited === 'true' || b.unlimited === 1 || b.unlimited === '1' ? 1 : 0);
  const r = await env.DB.prepare(
    `UPDATE orders SET esim_status=COALESCE(?, esim_status), data_total_mb=COALESCE(?, data_total_mb),
       data_remaining_mb=COALESCE(?, data_remaining_mb), unlimited=COALESCE(?, unlimited),
       expires_at=COALESCE(?, expires_at), status_checked_at=?, updated_at=? WHERE iccid=?`
  ).bind(clean(b.status, 30), num(b.total), num(b.remaining), unl, clean(b.expired_at, 40), now(), now(), iccid).run();
  return json({ ok: true, updated: r.meta.changes });
}
