// English is the source language of the canvas. Hebrew strings live in he.js.
import HE from './he.js';
export const currentLang = () => (typeof location !== 'undefined' && location.pathname.startsWith('/he') ? 'he' : 'en');
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERNS = Object.keys(HE).filter((k) => /\{\d\}/.test(k)).map((k) => [new RegExp('^' + esc(k).replace(/\\\{\d\\\}/g, '(.+?)') + '$'), HE[k]]);
const norm = (s) => s.replace(/\s+/g, ' ').trim();
export function translate(s) {
  if (currentLang() !== 'he' || !s) return s;
  const k = norm(s);
  let v = HE[k];
  if (v == null) {
    for (const [re, to] of PATTERNS) { const m = re.exec(k); if (m) { v = to.replace(/\{(\d)\}/g, (x, i) => translate(m[+i + 1])); break; } }
  }
  if (v == null) return s;
  const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
  return lead + v + trail;
}
