// Vercel function: the "Notes from around the world" board.
// GET  → the shown notes (newest first), cached at the edge for 30 s.
// POST → adds one note. The city comes from Vercel's IP geolocation headers; the IP itself is never stored.
// Storage: the "Notes" sheet of the waitlist Google Sheet, through its Apps Script (SHEETS_WEBHOOK_URL, SHEETS_SECRET).
import crypto from 'node:crypto';

const PAPERS = ['sticker', 'letter'];
const COLORS = ['#F6E3A1', '#F3D2C1', '#D9E4CF', '#D8E1EE', '#EADCF0', ''];

function countryName(code) {
  try { return code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(code) : ''; } catch (e) { return code || ''; }
}

export default async function handler(req, res) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  const secret = process.env.SHEETS_SECRET || '';
  if (!url) return res.status(503).json({ ok: false, error: 'not_configured' });

  if (req.method === 'GET' && String(req.url || '').includes('me=1')) {
    // The visitor's own city, for the note preview (never cached: it is per visitor)
    const h = req.headers || {};
    let city = ''; try { city = decodeURIComponent(String(h['x-vercel-ip-city'] || '')); } catch (e) {}
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ city: city.slice(0, 60), country: countryName(String(h['x-vercel-ip-country'] || '').slice(0, 2)) });
  }
  if (req.method === 'GET') {
    try {
      const r = await fetch(url + '?secret=' + encodeURIComponent(secret), { redirect: 'follow' });
      const text = await r.text();
      const list = JSON.parse(text);
      if (!Array.isArray(list)) throw new Error('bad list');
      // The browser always asks again; Vercel's edge keeps the list for 30 s so the sheet is not hit on every visit
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.setHeader('Vercel-CDN-Cache-Control', 'max-age=30, stale-while-revalidate=30');
      return res.status(200).json({ ok: true, notes: list });
    } catch (e) {
      return res.status(502).json({ ok: false, notes: [] });
    }
  }

  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ ok: false }); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  if (body.website) return res.status(200).json({ ok: true }); // honeypot: bots fill every field
  const text = String(body.text || '').replace(/\s+/g, ' ').trim();
  const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!text) return res.status(400).json({ ok: false, error: 'empty' });
  if (text.length > 140) return res.status(400).json({ ok: false, error: 'long' });
  if (/https?:\/\/|www\.|\.(com|net|ru|io)\b/i.test(text + ' ' + name)) return res.status(400).json({ ok: false, error: 'links' });
  const paper = PAPERS.includes(body.paper) ? body.paper : 'sticker';
  const color = COLORS.includes(body.color) ? body.color : '';
  const font = Math.max(0, Math.min(20, parseInt(body.font, 10) || 0));

  const h = req.headers || {};
  const decode = (v) => { try { return decodeURIComponent(String(v || '')); } catch (e) { return String(v || ''); } };
  let city = decode(h['x-vercel-ip-city']).slice(0, 60);
  let country = countryName(String(h['x-vercel-ip-country'] || '').slice(0, 2)).slice(0, 60);
  // The visitor may correct the place by hand ("City, Country"); no links or digits, so it stays a place name
  const place = String(body.place || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (place) {
    if (/https?:|www\.|[<>@\d]/i.test(place)) return res.status(400).json({ ok: false, error: 'place' });
    const i = place.lastIndexOf(',');
    city = (i > 0 ? place.slice(0, i) : place).trim().slice(0, 60);
    country = i > 0 ? place.slice(i + 1).trim().slice(0, 60) : '';
  }
  const ip = String(h['x-forwarded-for'] || '').split(',')[0].trim();
  const client = ip ? crypto.createHash('sha256').update(ip + secret).digest('hex').slice(0, 16) : '';

  try {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'follow',
      body: JSON.stringify({ secret, type: 'note', text, name, city, country, paper, color, font, client })
    });
    const out = (await r.text()).trim();
    if (out === 'slow down') return res.status(429).json({ ok: false, error: 'slow' });
    let data = {};
    try { data = JSON.parse(out); } catch (e) {}
    if (!data.ok) return res.status(502).json({ ok: false });
    return res.status(200).json({ ok: true, id: data.id, shown: !!data.shown, city, country });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
}
