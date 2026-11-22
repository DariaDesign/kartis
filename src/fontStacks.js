// Adds the companion "KT <family>" (Hebrew, Cyrillic and Arabic letters, public/assets/fonts-intl.css)
// right after each Latin family in font stacks, e.g. 'Gloock', serif -> 'Gloock', 'KT Gloock', serif.
export const INTL_FAMILIES = ['Gloock', 'Mrs Saint Delafield', 'Bodoni Moda', 'Instrument Serif', 'Fraunces', 'Instrument Sans', 'Geist', 'Jost', 'Manrope'];
const names = INTL_FAMILIES.join('|');
// a quoted name followed by another family or a generic family (not labels or the print engine's font list)
const QUOTED = new RegExp("(['\"])(" + names + ")\\1(?=\\s*,\\s*(?:['\"][A-Z]|serif|sans-serif|cursive|monospace|system-ui|ui-))", 'g');
const BARE = new RegExp('(font-family:\\s*)(' + names + ')(\\s*,)', 'g');
export const withIntlFonts = (src) => src
  .replace(QUOTED, (m, q, fam) => `${q}${fam}${q}, ${q}KT ${fam}${q}`)
  .replace(BARE, (m, pre, fam, comma) => `${pre}${fam}, 'KT ${fam}'${comma}`);
export const stack = (fam, generic) => `'${fam}', 'KT ${fam}', ${generic}`;
