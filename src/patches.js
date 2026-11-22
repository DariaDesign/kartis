// Changes the live site needs on top of the canvas files (the canvas stays the design source).
// Each `from` must exist in the canvas file; tests/patches.test.mjs checks that after every sync.
export const PATCHES = {
  Main: [
    { from: '<div class="k-card" style=', to: '<div class="k-card" dir="ltr" style=' },
    // Save "Draft with AI" sign-ups to the Google Sheet through /api/subscribe
    {
      from: "if (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v)) this.setState({ aiDone: true, emailError: false });",
      to: "if (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v)) { this.setState({ aiDone: true, emailError: false }); try { fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v, lang: document.documentElement.lang || 'en', source: 'draft-with-ai' }) }).catch(() => {}); } catch (err) {} }"
    },
    // Footer: legal pages in the visitor's language (the language switch sits in the header)
    {
      from: 'Created by <a href="mailto:daria.dxns@gmail.com" style="color: {{t.ink}}; text-underline-offset: 3px">Daria</a></span>',
      to: 'Created by <a href="mailto:daria.dxns@gmail.com" style="color: {{t.ink}}; text-underline-offset: 3px">Daria</a></span>\n<nav aria-label="Site" style="display: flex; flex-wrap: wrap; gap: 6px 18px; width: 100%; font-size: 13px; color: {{t.muted}}"><a href="{{lp}}/privacy" style="color: inherit">Privacy</a><a href="{{lp}}/terms" style="color: inherit">Terms</a><a href="{{lp}}/accessibility" style="color: inherit">Accessibility</a></nav>'
    },
    {
      from: '    return {\n      t,\n      themes,',
      to: "    const lp = (typeof window !== 'undefined' && window.__kt && window.__kt.lp) || '';\n    return {\n      lp,\n      t,\n      themes,"
    }
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
    }
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
