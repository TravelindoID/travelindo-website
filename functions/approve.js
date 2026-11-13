// /approve?p=pay_...&t=<signature>&d=approve|reject
// GET shows the order and a confirm button; POST captures (approve) or voids (reject) the payment in Whop.
import { ensureSchema, now, whop, sign, sendEmail, PAY_RE, paymentRows, rowsHtml, esc, safeEqual } from './api/_common.js';

function page(title, body) {
  return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' + esc(title) + '</title>' +
    '<style>body{margin:0;background:#F7F6FF;color:#15172B;font:15px/1.5 Arial,sans-serif}main{max-width:640px;margin:0 auto;padding:24px 16px}' +
    '.card{background:#fff;border:1px solid #E4E3EF;border-radius:14px;padding:18px;margin:14px 0}h1{font-size:22px;margin:0 0 8px}' +
    'button{font:inherit;font-weight:bold;border:0;border-radius:10px;padding:14px 22px;color:#fff;cursor:pointer;margin:6px 8px 6px 0}.ok{background:#067647}.no{background:#D92D20}.muted{color:#4A4E68}</style></head><body><main>' +
    body + '</main></body></html>', { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY' } });
}

async function check(env, p, t) {
  return PAY_RE.test(p) && t && env.INGEST_KEY && safeEqual(t, await sign(env, p));
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const p = u.searchParams.get('p') || '', t = u.searchParams.get('t') || '', d = u.searchParams.get('d') || 'approve';
  if (!(await check(env, p, t))) return page('Link not valid', '<h1>This link is not valid</h1><p class="muted">Open the newest approval email and try again.</p>');
  const r = await whop(env, '/payments/' + encodeURIComponent(p));
  if (!r.ok || !r.body) return page('Not found', '<h1>Could not load this payment from Whop</h1><p class="muted">Status ' + r.status + '. Check Whop → Payments.</p>');
  const pay = r.body;
  const held = pay.status === 'authorized' || pay.substatus === 'requires_capture';
  const head = held
    ? '<h1>' + (d === 'reject' ? 'Reject this order?' : 'Approve this order?') + '</h1><p class="muted">' +
      (d === 'reject' ? 'The reserved money is released back to the customer\'s card. No eSIM is sent.' : 'The card is charged now and the eSIM is created and emailed to the customer automatically.') + '</p>' +
      '<form method="post"><input type="hidden" name="p" value="' + esc(p) + '"><input type="hidden" name="t" value="' + esc(t) + '">' +
      (d === 'reject'
        ? '<button class="no" name="d" value="reject">Yes, reject &amp; release money</button><button class="ok" name="d" value="approve">Approve instead</button>'
        : '<button class="ok" name="d" value="approve">Yes, approve &amp; send eSIM</button><button class="no" name="d" value="reject">Reject instead</button>') + '</form>'
    : '<h1>This order is no longer waiting</h1><p class="muted">Current status: ' + esc([pay.status, pay.substatus].filter(Boolean).join(' / ')) + '. Nothing to do.</p>';
  return page('Order approval', head + '<div class="card">' + rowsHtml(paymentRows(pay)) + '</div>');
}

export async function onRequestPost({ request, env }) {
  const f = await request.formData();
  const p = String(f.get('p') || ''), t = String(f.get('t') || ''), d = String(f.get('d') || '');
  if (!(await check(env, p, t)) || (d !== 'approve' && d !== 'reject')) return page('Link not valid', '<h1>This link is not valid</h1>');
  const r = await whop(env, '/payments/' + encodeURIComponent(p) + (d === 'approve' ? '/capture' : '/void'), 'POST');
  await ensureSchema(env.DB);
  if (!r.ok) {
    return page('Not done', '<h1>Whop did not accept this</h1><p class="muted">Whop answered with status ' + r.status +
      '. The order may already be approved, rejected or expired. Check Whop → Payments.</p>');
  }
  const pay = r.body || {};
  await env.DB.prepare(`UPDATE orders SET approval_state=?, approval_at=?, updated_at=?,
      airalo_result=CASE WHEN ?='rejected' THEN 'rejected' WHEN airalo_result='awaiting_approval' THEN 'pending' ELSE airalo_result END WHERE payment_id=?`)
    .bind(d === 'approve' ? 'approved' : 'rejected', now(), now(), d === 'approve' ? 'approved' : 'rejected', p).run();
  if (d === 'reject') {
    const to = pay.user && pay.user.email;
    if (to) {
      await sendEmail(env, to, 'Your Travelindo eSIM order was not completed',
        '<div style="font:15px Arial,sans-serif;color:#15172B"><p>Hello,</p><p>We could not confirm your recent eSIM order, so it was cancelled. ' +
        'Your card has not been charged: the reserved amount has been released. Depending on your bank, it can take a few days to disappear from your statement.</p>' +
        '<p>If you think this is a mistake, reply to cs@hotelmurah.com and we will help.</p><p>Travelindo</p></div>');
    }
    return page('Rejected', '<h1>Order rejected</h1><p class="muted">The reserved money is released and the customer has been emailed. No eSIM was sent.</p>');
  }
  return page('Approved', '<h1>Order approved</h1><p class="muted">The card is charged. The eSIM is being created and emailed to the customer automatically (usually within a minute). You can see it in your admin page.</p>');
}
