import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './cardFit.js';
import './previewPeek.js';
import { inject, track } from '@vercel/analytics';
import { translate } from './i18n.js';

// UI strings for components registered with translate:false (the notes board keeps visitors' text untouched)
window.__ktT = translate;

// Cookie-free visit counts + a few funnel events (no card content is ever sent)
inject();
window.__ktTrack = (name, props) => { try { track(name, props); } catch (e) {} };
// The build writes real HTML for every page (scripts/prerender.mjs). Hydrating keeps that HTML on screen
// (no repaint, so the first text the visitor sees is also the largest paint); pages without it render fresh.
const root = document.getElementById('root');
if (root.hasAttribute('data-prerendered') && root.firstElementChild) hydrateRoot(root, <App />);
else createRoot(root).render(<App />);
