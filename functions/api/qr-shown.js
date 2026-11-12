// POST /api/qr-shown  (public, called by the shop after it displays the QR code)
// Only records a timestamp against a Whop payment ID; returns nothing sensitive.
import { ensureSchema, json, readBody, now } from './_common.js';

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await readBody(request); } catch (e) { return json({ ok: false }, 400); }
  const pid = String(b.payment_id || '');
  if (!/^pay_[A-Za-z0-9]{6,40}$/.test(pid)) return json({ ok: false }, 400);
  await ensureSchema(env.DB);
  const t = now();
  await env.DB.prepare(
    `INSERT INTO orders (payment_id, created_at, updated_at, qr_shown_at, qr_shown_count) VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(payment_id) DO UPDATE SET qr_shown_at=COALESCE(orders.qr_shown_at, excluded.qr_shown_at),
       qr_shown_count=COALESCE(orders.qr_shown_count,0)+1, updated_at=excluded.updated_at`
  ).bind(pid, t, t, t).run();
  return json({ ok: true });
}
