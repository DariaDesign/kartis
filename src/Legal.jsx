import React from 'react';
import { LEGAL } from './legal-content.js';
import { currentLang } from './i18n.js';
import { navigate } from './router.js';
export default function Legal({ page }) {
  const lang = currentLang();
  const doc = (LEGAL[lang] || LEGAL.en)[page];
  const home = lang === 'he' ? '/he' : '/';
  return (
    <div style={{ minHeight: '100vh', background: '#EFE9DF', color: '#23211C', fontFamily: "'Instrument Sans', sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gloock&family=Instrument+Sans:wght@400;500;600&display=swap" />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '56px 20px 96px' }}>
        <a href={home} onClick={(e) => { e.preventDefault(); navigate(home); }} style={{ fontFamily: "'Gloock', serif", fontSize: 26, color: 'inherit', textDecoration: 'none' }}>Kartis</a>
        <h1 style={{ fontFamily: "'Gloock', serif", fontWeight: 400, fontSize: 44, lineHeight: 1.05, margin: '40px 0 8px' }}>{doc.title}</h1>
        <p style={{ color: '#665F52', fontSize: 14, margin: '0 0 32px' }}>{doc.updated}</p>
        {doc.sections.map((s, i) => (
          <section key={i} style={{ marginTop: 28 }}>
            {s.h ? <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>{s.h}</h2> : null}
            {s.p.map((t, j) => <p key={j} style={{ fontSize: 16, lineHeight: 1.6, margin: '0 0 12px' }}>{t}</p>)}
          </section>
        ))}
      </main>
    </div>
  );
}
