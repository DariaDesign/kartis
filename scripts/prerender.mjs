// After `vite build`: write real HTML for every page and language, plus robots.txt, sitemap.xml,
// 404.html and the share image and icons. Search engines and link previews then see the page text
// without running JavaScript; the app takes over in the browser as before.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { JSDOM } from 'jsdom';

const DIST = 'dist';
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const server = pathToFileURL(path.resolve('dist-ssr/entry-server.js')).href;

// Binary files kept as base64 text in the repo (share image, PNG icons)
for (const f of fs.readdirSync('assets-src')) {
  if (!f.endsWith('.b64')) continue;
  fs.writeFileSync(path.join(DIST, f.replace(/\.b64$/, '')), Buffer.from(fs.readFileSync(path.join('assets-src', f), 'utf8'), 'base64'));
}

const GLOBALS = ['window', 'document', 'location', 'navigator', 'localStorage', 'sessionStorage', 'history', 'HTMLElement', 'Node', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'matchMedia', 'Image'];

async function renderUrl(urlPath, n) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://www.mykartis.com' + urlPath + (urlPath.includes('?') ? '&' : '?') + 'shabbat=0', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  for (const g of GLOBALS) { try { Object.defineProperty(globalThis, g, { value: w[g], configurable: true, writable: true }); } catch (e) {} }
  const mod = await import(server + '?r=' + n); // fresh module state per page
  const html = mod.render();
  const head = Array.from(w.document.head.querySelectorAll('[data-dc]')).map((el) => el.outerHTML).join('\n');
  return { html, head, mod };
}

function page(m, page, body, dcHead, extraHead = '') {
  let out = template
    .replace(/<html lang="[^"]*"( dir="[^"]*")?>/, `<html lang="${m.lang}" dir="${m.dir}">`)
    .replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, '<!--seo-->\n' + extraHead + m.headHtml + '\n<!--/seo-->')
    .replace('</head>', dcHead + '\n</head>')
    .replace('<div id="root"></div>', `<div id="root" data-prerendered>${body}</div>`);
  return out;
}

const first = await renderUrl('/', 0);
const { meta, headTags, INDEXED, ALL_PAGES, SITE, LANGS, withLang } = first.mod;
let n = 1, count = 0;
// Home page in the default (English) URL also sends visitors with another browser language to their version,
// before anything is drawn, unless they picked a language themselves.
const REDIRECT = `<script>(function(){try{if(location.pathname!=='/')return;var s=localStorage.getItem('kartis-lang');var L=['he','ru','fr','es','ar'];var p=s;if(!p){var ls=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en'];for(var i=0;i<ls.length;i++){var c=String(ls[i]||'').toLowerCase().split('-')[0];if(c==='iw')c='he';if(c==='en'||L.indexOf(c)>=0){p=c;break;}}}if(p&&L.indexOf(p)>=0)location.replace('/'+p+location.search+location.hash);}catch(e){}})();</script>\n`;

for (const lang of LANGS) {
  for (const p of ALL_PAGES) {
    const url = withLang(lang, p);
    const r = url === '/' ? first : await renderUrl(url, n++);
    const m = meta(lang, p); m.headHtml = headTags(m, p);
    const out = page(m, p, r.html, r.head, url === '/' ? REDIRECT : '');
    const file = url === '/' ? path.join(DIST, 'index.html') : path.join(DIST, url.slice(1), 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, out); count++;
  }
}
{ // 404
  const r = await renderUrl('/404-page-not-found', n++);
  const m = meta('en', '404'); m.headHtml = headTags(m, '404');
  fs.writeFileSync(path.join(DIST, '404.html'), page(m, '404', r.html, r.head)); count++;
}

// sitemap.xml with every language version of each page
const today = new Date().toISOString().slice(0, 10);
const urls = [];
for (const [p, langs] of Object.entries(INDEXED)) {
  for (const l of langs) {
    const alts = langs.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${SITE}${withLang(a, p)}"/>`).join('\n');
    urls.push(`  <url>\n    <loc>${SITE}${withLang(l, p)}</loc>\n    <lastmod>${today}</lastmod>\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${withLang('en', p)}"/>\n  </url>`);
  }
}
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);

// robots.txt: search engines and AI search welcome; model training (GPTBot, Google-Extended, CCBot) is a separate choice
fs.writeFileSync(path.join(DIST, 'robots.txt'), [
  'User-agent: *', 'Allow: /', 'Disallow: /api/', '',
  'User-agent: OAI-SearchBot', 'Allow: /', '',
  `Sitemap: ${SITE}/sitemap.xml`, ''
].join('\n'));

console.log(`prerendered ${count} pages, sitemap with ${urls.length} URLs`);
process.exit(0);
