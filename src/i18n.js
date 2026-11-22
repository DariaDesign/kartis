// English is the source language of the canvas. Other languages live in locales.js.
import LOCALES from './locales.js';

export const LANGS = ['en', 'he', 'ru', 'fr', 'es', 'ar'];
export const RTL = new Set(['he', 'ar']);
export const LANG_NAMES = { en: 'English', he: 'עברית', ru: 'Русский', fr: 'Français', es: 'Español', ar: 'العربية' };
const PREFIX = /^\/(he|ru|fr|es|ar)(?=\/|$)/;
export const langFromPath = (p) => { const m = PREFIX.exec(p || ''); return m ? m[1] : 'en'; };
export const stripLang = (p) => (p || '/').replace(PREFIX, '') || '/';
export const withLang = (lang, p) => { const rest = stripLang(p); return lang === 'en' ? rest : '/' + lang + (rest === '/' ? '' : rest); };
export const currentLang = () => (typeof location !== 'undefined' ? langFromPath(location.pathname) : 'en');

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERNS = {};
for (const l of Object.keys(LOCALES)) {
  PATTERNS[l] = Object.keys(LOCALES[l]).filter((k) => /\{\d\}/.test(k))
    .map((k) => [new RegExp('^' + esc(k).replace(/\\\{\d\\\}/g, '(.+?)') + '$'), LOCALES[l][k]]);
}
const norm = (s) => s.replace(/\s+/g, ' ').trim();

export function translateTo(lang, s) {
  const D = LOCALES[lang];
  if (!D || !s || !/[A-Za-z]/.test(s)) return s;
  const k = norm(s);
  let v = D[k];
  if (v == null) {
    for (const [re, to] of PATTERNS[lang]) {
      const m = re.exec(k);
      if (m) { v = to.replace(/\{(\d)\}/g, (x, i) => translateTo(lang, m[+i + 1]).trim()); break; }
    }
  }
  if (v == null) return s;
  return s.match(/^\s*/)[0] + v + s.match(/\s*$/)[0];
}
export const translate = (s) => translateTo(currentLang(), s);
