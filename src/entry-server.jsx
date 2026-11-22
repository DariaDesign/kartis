// Build-time rendering: scripts/prerender.mjs loads this with a fake browser (jsdom) for each URL.
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';
export { meta, headTags, INDEXED, ALL_PAGES, SITE } from './seo.js';
export { LANGS, withLang } from './i18n.js';
export const render = () => renderToString(<App />);
