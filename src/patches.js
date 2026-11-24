// Changes the live site needs on top of the canvas files (the canvas stays the design source).
// Each `from` must exist in the canvas file; tests/patches.test.mjs checks that after every sync.
export const PATCHES = {
  Main: [
    { from: '<div class="k-card" style=', to: '<div class="k-card" dir="ltr" style=' },
    // Save "Draft with AI" sign-ups to the Google Sheet through /api/subscribe
    {
      from: "if (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v)) this.setState({ aiDone: true, emailError: false });",
      to: "if (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v)) { if (this._sending) return; this._sending = true; this.setState({ emailError: false }); const done = (ok) => { this._sending = false; this.setState(ok ? { aiDone: true, emailError: false } : { emailError: 'net' }); if (ok && window.__ktTrack) window.__ktTrack('Joined AI waitlist', { lang: document.documentElement.lang || 'en' }); }; try { fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v, lang: document.documentElement.lang || 'en', source: 'draft-with-ai' }), signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(12000) : undefined }).then((r) => done(r.ok), () => done(false)); } catch (err) { done(false); } }"
    },
    // Footer: legal pages in the visitor's language (the language switch sits in the header)
    {
      from: 'Created by <a href="mailto:daria.dxns@gmail.com" style="color: {{t.ink}}; text-underline-offset: 3px">Daria</a></span>',
      to: 'Created by <a href="mailto:daria.dxns@gmail.com" style="color: {{t.ink}}; text-underline-offset: 3px">Daria</a></span>\n<nav aria-label="Site" style="display: flex; flex-wrap: wrap; gap: 6px 18px; width: 100%; font-size: 13px; color: {{t.muted}}"><a href="{{lp}}/privacy" style="color: inherit">Privacy</a><a href="{{lp}}/terms" style="color: inherit">Terms</a><a href="{{lp}}/accessibility" style="color: inherit">Accessibility</a></nav>'
    },
    {
      from: '    return {\n      t,\n      themes,',
      to: "    const lp = (typeof window !== 'undefined' && window.__kt && window.__kt.lp) || '';\n    return {\n      lp,\n      t,\n      themes,"
    },
    // Waitlist: a failed save says so instead of showing "You're on the list"
    { from: "      emailInvalid: s.emailError ? 'true' : 'false',\n      emailBorder: s.emailError ? '#B4232C' : t.lineStrong,\n      emailMsg: s.emailError ? 'That email looks off. Check it and try again.' : '',", to: "      emailInvalid: s.emailError === true ? 'true' : 'false',\n      emailBorder: s.emailError === true ? '#B4232C' : t.lineStrong,\n      emailMsg: s.emailError === 'net' ? \"We couldn't save your email just now. Check your connection and try again.\" : s.emailError ? 'That email looks off. Check it and try again.' : ''," },
    // The floating "Take a journey" pill mirrors to the right on Hebrew and Arabic pages
    { from: "@media (max-width:720px){.k-journey-float{left:16px !important;bottom:16px !important}}", to: "@media (max-width:720px){.k-journey-float{left:16px !important;bottom:16px !important}}\n[dir=rtl] .k-journey-float{left:auto !important;right:24px !important}\n@media (max-width:720px){[dir=rtl] .k-journey-float{right:16px !important}}" }
  ],
  EditorSimple: [
    // Cards are laid out left to right, also on Hebrew pages
    { from: '<span style="position: relative; display: block; width: {{thumbW}};', to: '<span dir="ltr" style="position: relative; display: block; width: {{thumbW}};' },
    { from: '<div class="k-prevwrap">', to: '<div class="k-prevwrap" dir="ltr">' },
    // Print shops: open Google Maps instead of the demo map
    {
      from: '<a href="PrintMap.dc.html" style=',
      to: '<a href="https://www.google.com/maps/search/print+shop+near+me" target="_blank" rel="noopener" style='
    },
    // Keep the draft in this browser, so "Draft saved" is true
    {
      from: '  componentDidMount() {\n    try { this.applyPick(',
      to: "  componentDidUpdate() {\n    try {\n      const s = Object.assign({}, this.state || {});\n      ['pdf', 'pdfErr', 'copied', 'tried'].forEach((k) => delete s[k]);\n      localStorage.setItem('kartis-draft', JSON.stringify(s));\n    } catch (e) {}\n  }\n  componentDidMount() {\n    try { const d = JSON.parse(localStorage.getItem('kartis-draft') || 'null'); if (d && typeof d === 'object') this.setState(Object.assign(d, { step: d.step === 3 ? 2 : (d.step || 1) })); } catch (e) {}\n    try { this.applyPick("
    },
    // Copy request: say "Copied" only when the text really is on the clipboard
    { from: "        try { navigator.clipboard.writeText(slipText); } catch (e) {}\n        this.setState({ copied: true });\n        clearTimeout(this._ct); this._ct = setTimeout(() => this.setState({ copied: false }), 1600);", to: "        const mark = (ok) => { this.setState({ copied: ok ? true : 'fail' }); clearTimeout(this._ct); this._ct = setTimeout(() => this.setState({ copied: false }), ok ? 1600 : 3200); };\n        const legacy = () => { try { const ta = document.createElement('textarea'); ta.value = slipText; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; } };\n        try { navigator.clipboard.writeText(slipText).then(() => mark(true), () => mark(legacy())); } catch (e) { mark(legacy()); }" },
    { from: "      copyLabel: s.copied ? 'Copied' : 'Copy request',", to: "      copyLabel: s.copied === 'fail' ? \"Couldn't copy\" : s.copied ? 'Copied' : 'Copy request'," },
    // Analytics: funnel steps (Vercel Web Analytics custom events; nothing typed on the card is sent)
    { from: "      this.setState(blocked ? { step: 2, tried: true } : { step: 3 });", to: "      this.setState(blocked ? { step: 2, tried: true } : { step: 3 }); if (!blocked && typeof window !== 'undefined' && window.__ktTrack) window.__ktTrack('Reached print', { lang: document.documentElement.lang || 'en' });" },
    { from: "      goStep2: () => this.setState({ step: 2 }),", to: "      goStep2: () => { this.setState({ step: 2 }); if (window.__ktTrack) window.__ktTrack('Reached words', { lang: document.documentElement.lang || 'en' }); }," },
    { from: "          this.setState({ pdf: 'done' });", to: "          this.setState({ pdf: 'done' }); if (window.__ktTrack) window.__ktTrack('PDF downloaded', { lang: document.documentElement.lang || 'en', tpl: String((typeof baseTpl !== 'undefined' && baseTpl && (baseTpl.name || baseTpl.id)) || '') });" }
  ],
  // Card: Hebrew, Cyrillic and Arabic letters in the downloaded PDF use the same fonts as the screen (public/assets/fonts-intl.css)
  Card: [
    {
      from: "  ['Jost', 'normal', '100 900', 'fbfd3cf4f9bdc3bfaa6bd57e34d75d13']\n];",
      to: "  ['Jost', 'normal', '100 900', 'fbfd3cf4f9bdc3bfaa6bd57e34d75d13'],\n  [\'KT Gloock\', \'normal\', \'100 900\', \'../assets/he-frl-800.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Gloock\', \'italic\', \'100 900\', \'../assets/he-frl-800.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Gloock\', \'normal\', \'100 900\', \'../assets/ru-playfair-700.woff2\', \'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116\'],\n  [\'KT Gloock\', \'italic\', \'100 900\', \'../assets/ru-playfair-700.woff2\', \'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116\'],\n  [\'KT Gloock\', \'normal\', \'100 900\', \'../assets/ar-amiri-700.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Gloock\', \'italic\', \'100 900\', \'../assets/ar-amiri-700.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Mrs Saint Delafield\', \'normal\', \'100 900\', \'../assets/he-frl.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Mrs Saint Delafield\', \'normal\', \'100 900\', \'../assets/ru-greatvibes.woff2\', \'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116\'],\n  [\'KT Mrs Saint Delafield\', \'normal\', \'100 900\', \'../assets/ar-arefruqaa.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Bodoni Moda\', \'normal\', \'100 900\', \'../assets/he-frl.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Bodoni Moda\', \'italic\', \'100 900\', \'../assets/he-frl.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Bodoni Moda\', \'normal\', \'100 900\', \'../assets/ru-prata.woff2\', \'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116\'],\n  [\'KT Bodoni Moda\', \'italic\', \'100 900\', \'../assets/ru-prata.woff2\', \'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116\'],\n  [\'KT Bodoni Moda\', \'normal\', \'100 900\', \'../assets/ar-amiri.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Bodoni Moda\', \'italic\', \'100 900\', \'../assets/ar-amiri.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Instrument Serif\', \'normal\', \'100 900\', \'../assets/he-david.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Instrument Serif\', \'italic\', \'100 900\', \'../assets/he-david.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Instrument Serif\', \'normal\', \'100 900\', \'../assets/ru-spectral-300.woff2\', \'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116\'],\n  [\'KT Instrument Serif\', \'italic\', \'100 900\', \'../assets/ru-spectral-300.woff2\', \'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116\'],\n  [\'KT Instrument Serif\', \'normal\', \'100 900\', \'../assets/ar-notonaskh.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Instrument Serif\', \'italic\', \'100 900\', \'../assets/ar-notonaskh.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Fraunces\', \'normal\', \'100 900\', \'../assets/he-notoserif.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Fraunces\', \'italic\', \'100 900\', \'../assets/he-notoserif.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Fraunces\', \'normal\', \'100 900\', \'../assets/ru-literata.woff2\', \'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116\'],\n  [\'KT Fraunces\', \'italic\', \'100 900\', \'../assets/ru-literata.woff2\', \'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116\'],\n  [\'KT Fraunces\', \'normal\', \'100 900\', \'../assets/ar-markazi.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Fraunces\', \'italic\', \'100 900\', \'../assets/ar-markazi.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Instrument Sans\', \'normal\', \'100 900\', \'../assets/he-heebo.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Instrument Sans\', \'normal\', \'100 900\', \'../assets/ru-onest.woff2\', \'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116\'],\n  [\'KT Instrument Sans\', \'normal\', \'100 900\', \'../assets/ar-plex.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Geist\', \'normal\', \'100 900\', \'../assets/he-plex.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Geist\', \'normal\', \'100 900\', \'../assets/ar-plex.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Jost\', \'normal\', \'100 900\', \'../assets/he-rubik.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Jost\', \'normal\', \'100 900\', \'../assets/ar-tajawal.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\'],\n  [\'KT Manrope\', \'normal\', \'100 900\', \'../assets/he-heebo.woff2\', \'U+0590-05FF,U+FB1D-FB4F,U+20AA\'],\n  [\'KT Manrope\', \'normal\', \'100 900\', \'../assets/ar-plex.woff2\', \'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF\']\n];"
    },
    { from: 'KT_FONT_FILES.map(async ([fam, style, weight, id]) => {', to: 'KT_FONT_FILES.map(async ([fam, style, weight, id, range]) => {' },
    { from: "';font-weight:' + weight + ';src:url(data:font/woff2;base64,'", to: "';font-weight:' + weight + (range ? ';unicode-range:' + range : '') + ';src:url(data:font/woff2;base64,'" },
    { from: "  ktFontCss = rules.join('\\n');\n  return ktFontCss;", to: "  const css = rules.join('\\n');\n  if (rules.every(Boolean)) ktFontCss = css; // retry next time if a font failed to load\n  return css;" },
    // PDF: wait for the card's fonts before measuring; tag the image with the sRGB colour profile
    { from: "  const svg = ktCardToSvg(root, { bleedPx, printBg: o.printBg });", to: "  // Measure the card only once its fonts are really loaded (else words collapse or spread in the PDF)\n  try {\n    const jobs = [];\n    root.querySelectorAll('*').forEach((el) => {\n      const t = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();\n      if (!t) return;\n      const cs = getComputedStyle(el);\n      jobs.push(document.fonts.load(cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, t).catch(() => []));\n    });\n    await Promise.race([Promise.all(jobs).then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 8000))]);\n    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));\n  } catch (e) {}\n  const svg = ktCardToSvg(root, { bleedPx, printBg: o.printBg });" },
    { from: "  page.title = o.title;", to: "  page.title = o.title;\n  try { const r = await fetch('/assets/srgb.icc'); if (r.ok) page.icc = new Uint8Array(await r.arrayBuffer()); } catch (e) {}" },
    { from: "' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /'", to: "' /ColorSpace ' + (page.icc ? '[/ICCBased 8 0 R]' : '/DeviceRGB') + ' /BitsPerComponent 8 /Filter /'" },
    { from: "  obj(7, '<< /Title (' + page.title.replace(/[()\\\\]/g, '') + ') /Producer (Kartis) /Creator (Kartis card editor) >>');\n  const xref = len;\n  let x = 'xref\\n0 8\\n0000000000 65535 f \\n';\n  for (let i = 1; i <= 7; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \\n';\n  add(x + 'trailer\\n<< /Size 8 /Root 1 0 R /Info 7 0 R >>\\nstartxref\\n' + xref + '\\n%%EOF\\n');", to: "  obj(7, '<< /Title (' + page.title.replace(/[()\\\\]/g, '') + ') /Producer (Kartis) /Creator (Kartis card editor) >>');\n  const nObj = page.icc ? 8 : 7;\n  if (page.icc) obj(8, '<< /N 3 /Alternate /DeviceRGB /Length ' + page.icc.length + ' >>', page.icc); // sRGB IEC61966-2.1\n  const xref = len;\n  let x = 'xref\\n0 ' + (nObj + 1) + '\\n0000000000 65535 f \\n';\n  for (let i = 1; i <= nObj; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \\n';\n  add(x + 'trailer\\n<< /Size ' + (nObj + 1) + ' /Root 1 0 R /Info 7 0 R >>\\nstartxref\\n' + xref + '\\n%%EOF\\n');" }
  ],
  // Language switch: on the live site every language has its own URL, so a pick changes the address
  // (the canvas translates the page in place instead)
  LangSwitch: [
    { from: 'this.setState({ lang: ktDetectLang() });', to: "this.setState({ lang: (window.__kt && window.__kt.lang) || 'en' });" },
    { from: '    this._attachTry = 0;\n    this.attach();', to: '    this._attachTry = 0;' },
    { from: "if (d.lang && ktKnown(d.lang)) this.setState({ lang: d.lang });", to: '' },
    { from: "    try { if (this._bc) this._bc.postMessage({ lang: code }); } catch (e) {}\n    this.setState({ lang: code, open: false });", to: "    this.setState({ open: false });\n    try { if (window.__kt && window.__kt.go) window.__kt.go(code); } catch (e) {}" },
    { from: "const lang = s.lang || 'en';", to: "const lang = (typeof window !== 'undefined' && window.__kt && window.__kt.lang) || s.lang || 'en';" }
  ],
  ShabbatMode: [
    { from: '[HAVDALAH TIME] · [CITY]', to: '{{whenText}}' },
    {
      from: '      isGolden: true',
      to: "      isGolden: true,\n      whenText: ((this.props.shabbat || {}).havdalah || '') + (((this.props.shabbat || {}).city) ? ' · ' + this.props.shabbat.city : '')"
    }
  ]
};

export function applyPatches(name, src) {
  (PATCHES[name] || []).forEach((p) => {
    if (!src.includes(p.from)) { console.warn('[kartis] patch not applied in ' + name + ': ' + p.from.slice(0, 60)); return; }
    src = src.split(p.from).join(p.to);
  });
  return src;
}
