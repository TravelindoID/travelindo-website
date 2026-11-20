// GET /api/geo  (public) -> { c: "AU" }
// Tells the cookie bar which country the visitor is in (from Cloudflare), so it knows
// whether the Meta Pixel needs "Accept" first (EU/EEA/UK/CH/ID) or is on by default with a Decline option.
export function onRequestGet({ request }) {
  const c = (request.cf && request.cf.country) || '';
  return new Response(JSON.stringify({ c }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
