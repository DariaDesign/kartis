import React from 'react';
import { currentLang, withLang } from './i18n.js';
import { navigate } from './router.js';
import { NOT_FOUND } from './seo.js';
export default function NotFound() {
  const lang = currentLang();
  const home = withLang(lang, '/');
  const go = (to) => (e) => { e.preventDefault(); navigate(to); };
  return (
    <div style={{ minHeight: '100vh', background: '#EFE9DF', color: '#23211C', fontFamily: "'Instrument Sans', sans-serif" }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 20px 96px' }}>
        <a href={home} onClick={go(home)} style={{ fontFamily: "'Gloock', serif", fontSize: 26, color: 'inherit', textDecoration: 'none' }}>Kartis</a>
        <p style={{ margin: '72px 0 0', fontSize: 13, letterSpacing: '.14em', color: '#665F52' }}>404</p>
        <h1 style={{ fontFamily: "'Gloock', serif", fontWeight: 400, fontSize: 48, lineHeight: 1.05, margin: '8px 0 16px' }}>{NOT_FOUND.title[lang]}</h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, margin: '0 0 32px', color: '#3D382F' }}>{NOT_FOUND.text[lang]}</p>
        <a href={home} onClick={go(home)} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 48, padding: '0 24px', borderRadius: 999, background: '#2F3C7E', color: '#F7F2E9', textDecoration: 'none', fontWeight: 600 }}>{NOT_FOUND.home[lang]}</a>
      </main>
    </div>
  );
}
