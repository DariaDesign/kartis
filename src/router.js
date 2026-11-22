// Tiny client-side router: /, /editor, /shabbat and the legal pages, with /he /ru /fr /es /ar prefixes.
import { currentLang, stripLang, withLang } from './i18n.js';
const subs = new Set();
const MAP = { 'Main.dc.html': '/', 'EditorSimple.dc.html': '/editor', 'ShabbatMode.dc.html': '/shabbat' };
export const PAGES = { '/': 'home', '/editor': 'editor', '/shabbat': 'shabbat', '/privacy': 'privacy', '/terms': 'terms', '/accessibility': 'accessibility' };
export const langPrefix = () => (currentLang() === 'en' ? '' : '/' + currentLang());
export function routeFor(file) {
  const [f, hash] = file.split('#');
  const base = MAP[f] || '/';
  return withLang(currentLang(), base) + (hash ? '#' + hash : '');
}
export function navigate(to) {
  if (to.includes('#') && to.split('#')[0] === location.pathname) { location.hash = to.split('#')[1]; return; }
  history.pushState({}, '', to);
  window.scrollTo(0, 0);
  subs.forEach((f) => f());
}
export function onRoute(f) { subs.add(f); window.addEventListener('popstate', f); return () => { subs.delete(f); window.removeEventListener('popstate', f); }; }
export function currentPage() {
  const p = stripLang(location.pathname).replace(/\/+$/, '') || '/';
  return PAGES[p] || 'notfound';
}
