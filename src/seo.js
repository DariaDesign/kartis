// Titles, descriptions and link tags for every page and language. Used by the build (scripts/prerender.mjs)
// to write real HTML per URL, and by the app to keep document.title right after client-side navigation.
import { LANGS, RTL, translateTo, withLang } from './i18n.js';
import { LEGAL } from './legal-content.js';

export const SITE = 'https://www.mykartis.com';
export const OG_LOCALE = { en: 'en_US', he: 'he_IL', ru: 'ru_RU', fr: 'fr_FR', es: 'es_ES', ar: 'ar_AR' };
const LEGAL_LANGS = ['en', 'he']; // legal texts exist in these languages; others show English and stay out of the index

const EDITOR = {
  title: { en: 'Design your Shabbat card', he: 'עיצוב כרטיס לשבת', ru: 'Создайте карточку для Шаббата', fr: 'Créez votre carte de Chabbat', es: 'Diseña tu tarjeta de Shabat', ar: 'صمّم بطاقتك للسبت' },
  desc: {
    en: 'Pick one of 16 templates, add your name and a QR code, and download a print-ready PDF for the print shop.',
    he: 'בוחרים אחת מ־16 תבניות, מוסיפים שם וקוד QR ומורידים PDF מוכן לדפוס.',
    ru: 'Выберите один из 16 шаблонов, добавьте имя и QR-код и скачайте PDF, готовый для типографии.',
    fr: 'Choisissez l’un des 16 modèles, ajoutez votre nom et un QR code, puis téléchargez un PDF prêt pour l’imprimeur.',
    es: 'Elige una de 16 plantillas, añade tu nombre y un código QR y descarga un PDF listo para la imprenta.',
    ar: 'اختر أحد 16 قالبًا، وأضف اسمك ورمز QR، ونزّل ملف PDF جاهزًا للمطبعة.'
  }
};
export const NOT_FOUND = {
  title: { en: 'Page not found', he: 'הדף לא נמצא', ru: 'Страница не найдена', fr: 'Page introuvable', es: 'Página no encontrada', ar: 'الصفحة غير موجودة' },
  text: {
    en: 'This page does not exist. It may have moved, or the link has a typo.',
    he: 'הדף הזה לא קיים. ייתכן שהוא עבר מקום, או שיש טעות בקישור.',
    ru: 'Такой страницы нет. Возможно, она переехала или в ссылке опечатка.',
    fr: 'Cette page n’existe pas. Elle a peut-être été déplacée, ou le lien contient une faute.',
    es: 'Esta página no existe. Puede que se haya movido o que el enlace tenga un error.',
    ar: 'هذه الصفحة غير موجودة. ربما نُقلت أو أن في الرابط خطأ.'
  },
  home: { en: 'Go to the home page', he: 'לדף הבית', ru: 'На главную', fr: 'Aller à l’accueil', es: 'Ir al inicio', ar: 'الذهاب إلى الصفحة الرئيسية' }
};

// Pages that go to search engines, and the languages each one exists in
export const INDEXED = { '/': LANGS, '/editor': LANGS, '/privacy': LEGAL_LANGS, '/terms': LEGAL_LANGS, '/accessibility': LEGAL_LANGS };
export const ALL_PAGES = ['/', '/editor', '/shabbat', '/privacy', '/terms', '/accessibility'];

export function meta(lang, page) {
  const t = (s) => translateTo(lang, s);
  let title, desc, index = true, alts = null;
  if (page === '/') {
    title = 'Kartis — ' + t('Exchange cards for Shabbat');
    desc = t('Design a printed card with your QR code before candle lighting. Hand it across the table. They scan it after Havdalah.');
    alts = INDEXED['/'];
  } else if (page === '/editor') {
    title = EDITOR.title[lang] + ' — Kartis'; desc = EDITOR.desc[lang]; alts = INDEXED['/editor'];
  } else if (page === '/shabbat') {
    title = t('Shabbat Shalom') + ' — Kartis'; desc = t('Printed cards for a phone-free Shabbat.'); index = false;
  } else if (page === '404') {
    title = NOT_FOUND.title[lang] + ' — Kartis'; desc = NOT_FOUND.text[lang]; index = false;
  } else {
    const key = page.slice(1);
    const doc = (LEGAL[lang] || LEGAL.en)[key];
    title = doc.title + ' — Kartis'; desc = doc.sections[0].p[0];
    if (LEGAL_LANGS.includes(lang)) alts = LEGAL_LANGS; else index = false;
  }
  const url = SITE + (page === '404' ? '/404' : withLang(lang, page));
  const canonical = index ? url : SITE + withLang(LEGAL_LANGS.includes(lang) ? lang : 'en', page === '404' ? '/' : page);
  return { lang, dir: RTL.has(lang) ? 'rtl' : 'ltr', title, desc, index, url, canonical, alternates: (alts || []).map((l) => ({ lang: l, href: SITE + withLang(l, page) })), xDefault: alts ? SITE + withLang('en', page) : null };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function headTags(m, page) {
  const out = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.desc)}">`,
    m.index ? '' : '<meta name="robots" content="noindex, follow">',
    page === '404' ? '' : `<link rel="canonical" href="${m.canonical}">`,
    ...m.alternates.map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${a.href}">`),
    m.xDefault ? `<link rel="alternate" hreflang="x-default" href="${m.xDefault}">` : '',
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Kartis">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.desc)}">`,
    `<meta property="og:url" content="${m.index ? m.url : m.canonical}">`,
    `<meta property="og:image" content="${SITE}/og.jpg">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="Kartis — printed contact cards with a QR code for Shabbat">`,
    `<meta property="og:locale" content="${OG_LOCALE[m.lang]}">`,
    ...m.alternates.filter((a) => a.lang !== m.lang).map((a) => `<meta property="og:locale:alternate" content="${OG_LOCALE[a.lang]}">`),
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.desc)}">`,
    `<meta name="twitter:image" content="${SITE}/og.jpg">`
  ];
  if (page === '/') {
    const ld = [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Kartis', alternateName: ['mykartis', 'Kartis cards'], url: SITE + '/', inLanguage: LANGS },
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'Kartis', url: SITE + '/', logo: SITE + '/icon-512.png', email: 'daria.dxns@gmail.com', founder: { '@type': 'Person', name: 'Daria Nik' } }
    ];
    out.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  }
  return out.filter(Boolean).join('\n');
}
