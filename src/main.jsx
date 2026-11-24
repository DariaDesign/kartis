import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import { inject, track } from '@vercel/analytics';

// Cookie-free visit counts + a few funnel events (no card content is ever sent)
inject();
window.__ktTrack = (name, props) => { try { track(name, props); } catch (e) {} };
// The build writes real HTML for every page (scripts/prerender.mjs). Hydrating keeps that HTML on screen
// (no repaint, so the first text the visitor sees is also the largest paint); pages without it render fresh.
const root = document.getElementById('root');
if (root.hasAttribute('data-prerendered') && root.firstElementChild) hydrateRoot(root, <App />);
else createRoot(root).render(<App />);
