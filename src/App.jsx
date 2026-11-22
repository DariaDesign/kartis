import React, { useEffect, useState } from 'react';
import { defineDC } from './dc/runtime.jsx';
import { onRoute, currentPage } from './router.js';
import { currentLang } from './i18n.js';
import { shabbatNow } from './shabbat.js';
import Legal from './Legal.jsx';
import { applyPatches } from './patches.js';
import cardSrc from './dc/Card.dc.html?raw';
import pillSrc from './dc/MusicPill.dc.html?raw';
import shipSrc from './dc/WhiteShip.dc.html?raw';
import mainSrc from './dc/Main.dc.html?raw';
import editorSrc from './dc/EditorSimple.dc.html?raw';
import shabbatSrc from './dc/ShabbatMode.dc.html?raw';

defineDC('Card', cardSrc, { translate: false, dir: 'ltr' });
defineDC('MusicPill', pillSrc);
defineDC('WhiteShip', shipSrc);
const Main = defineDC('Main', applyPatches('Main', mainSrc));
const Editor = defineDC('EditorSimple', applyPatches('EditorSimple', editorSrc));
const ShabbatMode = defineDC('ShabbatMode', applyPatches('ShabbatMode', shabbatSrc));

export default function App() {
  const [, tick] = useState(0);
  const [shabbat, setShabbat] = useState(() => shabbatNow());
  useEffect(() => onRoute(() => tick((n) => n + 1)), []);
  useEffect(() => { const id = setInterval(() => setShabbat(shabbatNow()), 60000); return () => clearInterval(id); }, []);
  const lang = currentLang();
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'; }, [lang]);
  const page = currentPage();
  if (page === 'privacy' || page === 'terms' || page === 'accessibility') return <Legal page={page} />;
  if (shabbat.on || page === 'shabbat') return <ShabbatMode shabbat={shabbat} />;
  if (page === 'editor') return <Editor />;
  return <Main />;
}
