// Build-time rendering: scripts/prerender.mjs loads this with a fake browser (jsdom) for each URL.
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';
import { translate } from './i18n.js';
export { meta, headTags, INDEXED, ALL_PAGES, SITE } from './seo.js';
export { LANGS, withLang } from './i18n.js';
export const render = () => {
  // same text as the browser will show, so hydration matches (see src/main.jsx)
  if (typeof window !== 'undefined') window.__ktT = translate;
  return renderToString(<App />);
};
