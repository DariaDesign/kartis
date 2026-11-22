import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
// The build writes real HTML for every page (scripts/prerender.mjs). Hydrating keeps that HTML on screen
// (no repaint, so the first text the visitor sees is also the largest paint); pages without it render fresh.
const root = document.getElementById('root');
if (root.hasAttribute('data-prerendered') && root.firstElementChild) hydrateRoot(root, <App />);
else createRoot(root).render(<App />);
