// Vercel function: saves a "Draft with AI" sign-up to the Google Sheet (via its Apps Script web app).
// Env: SHEETS_WEBHOOK_URL (the Apps Script /exec URL), SHEETS_SECRET (same value as in the script).
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const email = String((body && body.email) || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return res.status(400).json({ ok: false, error: 'email' });
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) return res.status(503).json({ ok: false, error: 'not_configured' });
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.SHEETS_SECRET || '', email, lang: String(body.lang || 'en').slice(0, 5), source: String(body.source || '').slice(0, 40) }),
      redirect: 'follow'
    });
    const text = r.ok ? (await r.text()).trim() : '';
    const ok = text === 'ok'; // the script answers 'forbidden' (still HTTP 200) when the secret is wrong
    return res.status(ok ? 200 : 502).json({ ok });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
}
