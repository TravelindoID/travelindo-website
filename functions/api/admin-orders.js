// GET /api/admin-orders?q=&status=&limit=  (admin password)
import { ensureSchema, json, isAdmin, askForLogin } from './_common.js';

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return askForLogin();
  await ensureSchema(env.DB);
  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').trim();
  const f = u.searchParams.get('filter') || '';
  const limit = Math.min(Math.max(parseInt(u.searchParams.get('limit') || '200', 10) || 200, 1), 1000);
  const where = [], args = [];
  if (q) {
    where.push(`(payment_id LIKE ? OR email LIKE ? OR iccid LIKE ? OR airalo_order_code LIKE ? OR airalo_order_id LIKE ? OR plan_name LIKE ? OR package_id LIKE ? OR destination LIKE ?)`);
    for (let i = 0; i < 8; i++) args.push('%' + q + '%');
  }
  if (f === 'failed') where.push(`airalo_result = 'failed'`);
  if (f === 'no_iccid') where.push(`(iccid IS NULL OR iccid = '')`);
  if (f === 'not_active') where.push(`esim_status = 'NOT_ACTIVE'`);
  if (f === 'active') where.push(`esim_status = 'ACTIVE'`);
  if (f === 'qr_not_shown') where.push(`qr_shown_at IS NULL AND created_at >= '2026-11-12T09:30:00Z'`);
  const sql = `SELECT * FROM orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ?`;
  const { results } = await env.DB.prepare(sql).bind(...args, limit).all();
  const tot = await env.DB.prepare(`SELECT COUNT(*) n, SUM(price_paid) revenue,
      SUM(CASE WHEN airalo_result='ok' THEN 1 ELSE 0 END) ok,
      SUM(CASE WHEN airalo_result='failed' THEN 1 ELSE 0 END) failed,
      SUM(CASE WHEN esim_status='ACTIVE' THEN 1 ELSE 0 END) active,
      SUM(CASE WHEN qr_shown_at IS NOT NULL THEN 1 ELSE 0 END) qr_shown FROM orders`).first();
  return json({ ok: true, totals: tot, items: results });
}
