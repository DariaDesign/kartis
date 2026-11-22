// Kartis checks: npm test
import fs from 'fs';
import jsQR from 'jsqr';
let fail = 0, pass = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('FAIL', msg); } };
globalThis.location = { pathname: '/', search: '' };

// 1. Every production patch still matches the canvas files
const { PATCHES } = await import('../src/patches.js');
for (const [name, list] of Object.entries(PATCHES)) {
  const src = fs.readFileSync(`src/dc/${name}.dc.html`, 'utf8');
  list.forEach((p) => ok(src.includes(p.from), `patch for ${name} no longer matches: ${p.from.slice(0, 50)}`));
}

// 2. QR codes from the Card component decode back to the same link
const card = fs.readFileSync('src/dc/Card.dc.html', 'utf8');
const js = card.match(/data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
const KT_QR = new Function(js.split('const CARD_DEFAULT_TPL')[0].split('// ---- Kartis print engine')[0] + ';return KT_QR;')();
const links = ['your-link.com', 'https://instagram.com/yourhandle', 't.me/yourhandle', 'https://wa.me/972501234567', 'שבת שלום https://kartis.app', 'https://example.com/' + 'x'.repeat(150)];
for (let L = 1; L <= 200; L += 13) links.push('https://k.co/' + 'abcdefghij'.repeat(20).slice(0, L));
for (const t of links) {
  const q = KT_QR.encode(t), s = 6, qz = 4, n = q.n + qz * 2, W = n * s;
  const grid = Array.from({ length: q.n }, () => new Array(q.n).fill(false));
  q.d.replace(/M(\d+) (\d+)h1v1h-1z/g, (m, x, y) => { grid[+y][+x] = true; return ''; });
  const px = new Uint8ClampedArray(W * W * 4).fill(255);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const mx = Math.floor(x / s) - qz, my = Math.floor(y / s) - qz;
    if (mx >= 0 && my >= 0 && mx < q.n && my < q.n && grid[my][mx]) { const i = (y * W + x) * 4; px[i] = px[i + 1] = px[i + 2] = 0; }
  }
  const r = jsQR(px, W, W);
  ok(r && r.data === t, `QR does not decode: ${t.slice(0, 40)}`);
}
let threw = false; try { KT_QR.encode('x'.repeat(300)); } catch (e) { threw = e.message === 'QR_TOO_LONG'; }
ok(threw, 'very long link should be refused');

// 3. Every UI string on the canvas has a translation in every language
const LOCALES = (await import('../src/locales.js')).default;
const files = ['Main', 'EditorSimple', 'ShabbatMode'];
for (const lang of Object.keys(LOCALES)) {
  const missing = [];
  for (const f of files) {
    const s = fs.readFileSync(`src/dc/${f}.dc.html`, 'utf8');
    const body = s.split('<x-dc>')[1].split('</x-dc>')[0].replace(/<helmet>[\s\S]*?<\/helmet>/, '').replace(/<svg[\s\S]*?<\/svg>/g, '');
    for (const m of body.matchAll(/>([^<>]+)</g)) {
      const t = m[1].replace(/\s+/g, ' ').trim();
      if (!/[A-Za-z]{3}/.test(t) || t.includes('{{') || /^(Kartis|Instagram|Telegram|yourhandle|@yourhandle|your-link\.com|you@\S+|\+972.*|\[HAVDALAH TIME\] · \[CITY\])$/.test(t)) continue;
      if (LOCALES[lang][t] == null) missing.push(f + ': ' + t);
    }
  }
  ok(missing.length === 0, lang + ' missing for:\n  ' + missing.join('\n  '));
}

// 3b. Language URLs and page metadata
const { withLang, langFromPath, stripLang } = await import('../src/i18n.js');
ok(withLang('ru', '/editor') === '/ru/editor' && withLang('en', '/he/editor') === '/editor' && withLang('ar', '/') === '/ar', 'language URLs');
ok(langFromPath('/ar/terms') === 'ar' && langFromPath('/editor') === 'en' && langFromPath('/hello') === 'en' && stripLang('/fr') === '/', 'language from URL');
const { meta } = await import('../src/seo.js');
for (const l of ['en', 'he', 'ru', 'fr', 'es', 'ar']) {
  const m = meta(l, '/');
  ok(m.index && m.alternates.length === 6 && m.xDefault === 'https://www.mykartis.com/', 'home hreflang ' + l);
  ok(m.title.startsWith('Kartis — ') && m.title.length > 15, 'home title ' + l);
}
ok(meta('ru', '/privacy').index === false && meta('he', '/privacy').index === true, 'legal pages indexed only where translated');


// 3c. Font stacks get the companion family for Hebrew, Cyrillic and Arabic letters
const { withIntlFonts } = await import('../src/fontStacks.js');
ok(withIntlFonts("font-family: 'Gloock', serif") === "font-family: 'Gloock', 'KT Gloock', serif", 'font stack gets KT family');
ok(withIntlFonts("['Gloock', 'normal', '400', 'x']") === "['Gloock', 'normal', '400', 'x']", 'print font list untouched');
ok(withIntlFonts('font-family: Gloock, serif') === "font-family: Gloock, 'KT Gloock', serif", 'bare family name');
const intlCss = fs.readFileSync('public/assets/fonts-intl.css', 'utf8');
for (const f of (intlCss.match(/url\(\/assets\/[^)]+\)/g) || [])) ok(fs.existsSync('public' + f.slice(4, -1)), 'font file exists: ' + f);

// 4. Shabbat times (Tel Aviv): Friday night is Shabbat, Wednesday is not
globalThis.Intl = Intl;
const { shabbatNow } = await import('../src/shabbat.js');
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
if (tz === 'Asia/Jerusalem') {
  ok(shabbatNow(new Date('2026-11-20T20:00:00+02:00')).on === true, 'Friday 20:00 should be Shabbat');
  ok(shabbatNow(new Date('2026-11-21T12:00:00+02:00')).on === true, 'Saturday noon should be Shabbat');
  ok(shabbatNow(new Date('2026-11-21T19:00:00+02:00')).on === false, 'Saturday 19:00 is after Havdalah');
  ok(shabbatNow(new Date('2026-11-18T12:00:00+02:00')).on === false, 'Wednesday is not Shabbat');
} else console.log('skip Shabbat time checks (run with TZ=Asia/Jerusalem)');

// 5. Legal pages exist in both languages
const { LEGAL } = await import('../src/legal-content.js');
for (const pg of ['privacy', 'terms', 'accessibility']) ok(LEGAL.en[pg] && LEGAL.he[pg] && LEGAL.he[pg].sections.length === LEGAL.en[pg].sections.length, 'legal page ' + pg);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
