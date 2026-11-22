import React, { useEffect, useState } from 'react';
import { defineDC } from './dc/runtime.jsx';
import { onRoute, currentPage, navigate } from './router.js';
import { currentLang, RTL, LANGS, withLang } from './i18n.js';
import { meta } from './seo.js';
import Legal from './Legal.jsx';
import NotFound from './NotFound.jsx';
import { applyPatches } from './patches.js';
import LOCALES from './locales.js';
import { withIntlFonts as X } from './fontStacks.js';
import cardSrc from './dc/Card.dc.html?raw';
import pillSrc from './dc/MusicPill.dc.html?raw';
import shipSrc from './dc/WhiteShip.dc.html?raw';
import langSrc from './dc/LangSwitch.dc.html?raw';
import mainSrc from './dc/Main.dc.html?raw';
import editorSrc from './dc/EditorSimple.dc.html?raw';
import shabbatSrc from './dc/ShabbatMode.dc.html?raw';

defineDC('Card', X(applyPatches('Card', cardSrc)), { translate: false, dir: 'ltr' });
defineDC('MusicPill', X(pillSrc));
defineDC('WhiteShip', X(shipSrc));
// The canvas file carries its own copy of the strings; here they come from locales.js
const KEYS = Object.keys(LOCALES.he);
const DICT = JSON.stringify({ keys: KEYS, L: Object.fromEntries(Object.keys(LOCALES).map((l) => [l, KEYS.map((k) => LOCALES[l][k])])) });
defineDC('LangSwitch', X(applyPatches('LangSwitch', langSrc.replace('__DICT__', DICT))), { translate: false });
const Main = defineDC('Main', X(applyPatches('Main', mainSrc)));
const Editor = defineDC('EditorSimple', X(applyPatches('EditorSimple', editorSrc)));
const ShabbatMode = defineDC('ShabbatMode', X(applyPatches('ShabbatMode', shabbatSrc)));

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
  // Shabbat times need @hebcal/core (~60 KB), so it loads after the first paint; ?shabbat=1 still forces Shabbat mode
  const [shabbat, setShabbat] = useState({ on: false }); // same as the prerendered HTML, so hydration matches
  useEffect(() => onRoute(() => tick((n) => n + 1)), []);
  useEffect(() => {
    let id = 0, live = true;
    if (new URLSearchParams(location.search).get('shabbat') === '1') setShabbat({ on: true });
    import('./shabbat.js').then(({ shabbatNow }) => {
      if (!live) return;
      setShabbat(shabbatNow());
      id = setInterval(() => setShabbat(shabbatNow()), 60000);
    });
    return () => { live = false; clearInterval(id); };
  }, []);
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
