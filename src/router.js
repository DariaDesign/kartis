// Tiny client-side router: /, /editor, plus /he/... for Hebrew.
const subs = new Set();
const MAP = { 'Main.dc.html': '/', 'EditorSimple.dc.html': '/editor', 'ShabbatMode.dc.html': '/shabbat' };
export const langPrefix = () => (location.pathname.startsWith('/he') ? '/he' : '');
export function routeFor(file) {
  const [f, hash] = file.split('#');
  const base = MAP[f] || '/';
  const p = langPrefix() + (base === '/' && langPrefix() ? '' : base);
  return (p || '/') + (hash ? '#' + hash : '');
}
export function navigate(to) {
  if (to.includes('#') && to.split('#')[0] === location.pathname) { location.hash = to.split('#')[1]; return; }
  history.pushState({}, '', to);
  window.scrollTo(0, 0);
  subs.forEach((f) => f());
}
export function onRoute(f) { subs.add(f); window.addEventListener('popstate', f); return () => { subs.delete(f); window.removeEventListener('popstate', f); }; }
export function currentPage() {
  const p = location.pathname.replace(/^\/he/, '') || '/';
  if (p.startsWith('/editor')) return 'editor';
  if (p.startsWith('/shabbat')) return 'shabbat';
  if (p.startsWith('/privacy')) return 'privacy';
  if (p.startsWith('/terms')) return 'terms';
  if (p.startsWith('/accessibility')) return 'accessibility';
  return 'home';
}
