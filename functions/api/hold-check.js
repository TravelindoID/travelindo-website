// POST /api/hold-check  (public, called by the shop right after checkout)
// Asks Whop whether this payment is held for review. If it is, records it and emails the owner
// an approval link (once). Returns only a simple state to the browser.
import { ensureSchema, json, readBody, now, whop, sign, sendEmail, OWNER_EMAIL, PAY_RE, paymentRows, rowsHtml, esc } from './_common.js';

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await readBody(request); } catch (e) { return json({ state: 'unknown' }, 400); }
  const pid = String(b.payment_id || '');
  if (!PAY_RE.test(pid)) return json({ state: 'unknown' }, 400);
  if (!env.WHOP_API_KEY) return json({ state: 'unknown' });
  const r = await whop(env, '/payments/' + encodeURIComponent(pid));
  if (!r.ok || !r.body) return json({ state: 'unknown' });
  const p = r.body;
  const held = p.status === 'authorized' || p.substatus === 'requires_capture';
  if (!held) return json({ state: p.status === 'paid' ? 'paid' : 'other' });

  await ensureSchema(env.DB);
  const a = p.billing_address || {};
  const t = now();
  await env.DB.prepare(
    `INSERT INTO orders (payment_id, created_at, updated_at, email, plan_name, price_paid, currency, airalo_result, approval_state, customer_name, card, billing_country, risk_score)
     VALUES (?, ?, ?, ?, ?, ?, 'USD', 'awaiting_approval', 'awaiting', ?, ?, ?, ?)
     ON CONFLICT(payment_id) DO UPDATE SET updated_at=excluded.updated_at, email=COALESCE(orders.email, excluded.email),
       plan_name=COALESCE(orders.plan_name, excluded.plan_name), price_paid=COALESCE(orders.price_paid, excluded.price_paid),
       approval_state=COALESCE(orders.approval_state, excluded.approval_state), customer_name=excluded.customer_name,
       card=excluded.card, billing_country=excluded.billing_country, risk_score=excluded.risk_score,
       airalo_result=CASE WHEN orders.airalo_result IS NULL OR orders.airalo_result='pending' THEN 'awaiting_approval' ELSE orders.airalo_result END`
  ).bind(pid, t, t, p.user && p.user.email || null, p.product && p.product.title || null, p.usd_total ?? null,
    p.user && p.user.name || a.name || null, [p.card_brand, p.card_last4].filter(Boolean).join(' ') || null, a.country || null, p.risk_score ?? null).run();

  // Email the owner once per payment.
  const row = await env.DB.prepare('SELECT notified_at FROM orders WHERE payment_id=?').bind(pid).first();
  if (!row || !row.notified_at) {
    const tok = await sign(env, pid);
    const link = 'https://travelindoesim.com/approve?p=' + encodeURIComponent(pid) + '&t=' + tok;
    const title = (p.product && p.product.title) || 'eSIM';
    const html = '<div style="font:15px Arial,sans-serif;color:#15172B">' +
      '<h2 style="margin:0 0 6px">Order needs your approval</h2>' +
      '<p style="margin:0 0 14px">A purchase over $20 is on hold. The card is only reserved, not charged. ' +
      'If you do nothing, Whop charges it automatically after 48 hours and the eSIM is sent.</p>' +
      '<p><a href="' + link + '&d=approve" style="display:inline-block;background:#067647;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Approve &amp; send eSIM</a> ' +
      '&nbsp; <a href="' + link + '&d=reject" style="display:inline-block;background:#D92D20;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Reject &amp; release money</a></p>' +
      rowsHtml(paymentRows(p)) +
      '<p style="color:#666;font-size:12px;margin-top:16px">Each button opens a page where you confirm with one more click. This stops email link scanners from approving by accident.</p></div>';
    const sent = await sendEmail(env, OWNER_EMAIL, 'Approve order: ' + title + ' $' + (p.usd_total != null ? Number(p.usd_total).toFixed(2) : '') + ' - ' + ((p.user && p.user.email) || pid), html);
    if (sent) await env.DB.prepare('UPDATE orders SET notified_at=? WHERE payment_id=?').bind(now(), pid).run();
  }
  return json({ state: 'awaiting_approval' });
}
