import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// The build writes real HTML for every page (scripts/prerender.mjs); the app then takes over in the browser.
const root = document.getElementById('root');
root.removeAttribute('data-prerendered');
createRoot(root).render(<App />);
