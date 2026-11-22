import React, { useEffect, useState } from 'react';
import { defineDC } from './dc/runtime.jsx';
import { onRoute, currentPage, navigate } from './router.js';
import { currentLang, RTL, LANGS, withLang } from './i18n.js';
import { shabbatNow } from './shabbat.js';
import { meta } from './seo.js';
import Legal from './Legal.jsx';
import NotFound from './NotFound.jsx';
import { applyPatches } from './patches.js';
import LOCALES from './locales.js';
import cardSrc from './dc/Card.dc.html?raw';
import pillSrc from './dc/MusicPill.dc.html?raw';
import shipSrc from './dc/WhiteShip.dc.html?raw';
import langSrc from './dc/LangSwitch.dc.html?raw';
import mainSrc from './dc/Main.dc.html?raw';
import editorSrc from './dc/EditorSimple.dc.html?raw';
import shabbatSrc from './dc/ShabbatMode.dc.html?raw';

defineDC('Card', cardSrc, { translate: false, dir: 'ltr' });
defineDC('MusicPill', pillSrc);
defineDC('WhiteShip', shipSrc);
// The canvas file carries its own copy of the strings; here they come from locales.js
const KEYS = Object.keys(LOCALES.he);
const DICT = JSON.stringify({ keys: KEYS, L: Object.fromEntries(Object.keys(LOCALES).map((l) => [l, KEYS.map((k) => LOCALES[l][k])])) });
defineDC('LangSwitch', applyPatches('LangSwitch', langSrc.replace('__DICT__', DICT)), { translate: false });
const Main = defineDC('Main', applyPatches('Main', mainSrc));
const Editor = defineDC('EditorSimple', applyPatches('EditorSimple', editorSrc));
const ShabbatMode = defineDC('ShabbatMode', applyPatches('ShabbatMode', shabbatSrc));

// Shared with the canvas components (they run as plain scripts): language, link prefix, language switch
function shareLang() {
  const lang = currentLang();
  window.__kt = {
    lang,
    lp: lang === 'en' ? '' : '/' + lang,
    go: (code) => {
      if (!LANGS.includes(code) || code === currentLang()) return;
      try { localStorage.setItem('kartis-lang', code); } catch (e) {}
      navigate(withLang(code, location.pathname) + location.search);
    }
  };
  return lang;
}

export default function App() {
  const [, tick] = useState(0);
  const [shabbat, setShabbat] = useState(() => shabbatNow());
  useEffect(() => onRoute(() => tick((n) => n + 1)), []);
  useEffect(() => { const id = setInterval(() => setShabbat(shabbatNow()), 60000); return () => clearInterval(id); }, []);
  const lang = shareLang();
  const page = currentPage();
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr';
    try { document.title = meta(lang, page === 'notfound' ? '404' : page === 'home' ? '/' : '/' + page).title; } catch (e) {}
  }, [lang, page]);
  if (page === 'notfound') return <NotFound />;
  if (page === 'privacy' || page === 'terms' || page === 'accessibility') return <Legal page={page} />;
  if (shabbat.on || page === 'shabbat') return <ShabbatMode shabbat={shabbat} />;
  if (page === 'editor') return <Editor />;
  return <Main />;
}
