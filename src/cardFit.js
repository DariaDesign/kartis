// Fits every card on the page to its print rules, after React has drawn it:
//  - no text closer than 3 mm to the trim edge, nothing cut off;
//  - a word too long for its line (a long name) gets smaller instead of running off the card;
//  - when everything does not fit, all text shrinks together, never below 8 pt on paper;
//  - if it still does not fit, the card is marked (data-kt-overflow) and the editor warns;
//  - a card written in Hebrew or Arabic is mirrored (dir=rtl) so it reads from the right.
// The PDF export measures the same DOM, so the printed card matches what the screen shows.

const TRIM_MM = { tall: 101.6, wide: 88.9 };
const SAFE_MM = 3;
const MIN_PT = 8;
const RTL = /[֐-׿؀-ۿݐ-ݿיִ-﷿ﹰ-﻿]/g;
const LATIN = /[A-Za-zÀ-ɏЀ-ӿ]/g;

function leaves(card) {
  return Array.from(card.querySelectorAll('*')).filter((el) =>
    Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim()));
}

function textRect(el) {
  const r = document.createRange();
  r.selectNodeContents(el);
  return r.getBoundingClientRect();
}

function fitCard(card) {
  const box = card.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const k = box.width / card.offsetWidth || 1;                 // preview may be scaled
  const tall = card.offsetHeight > card.offsetWidth;
  const pxPerMm = card.offsetWidth / TRIM_MM[tall ? 'tall' : 'wide'];
  const pxPerPt = pxPerMm * 25.4 / 72;
  const safe = SAFE_MM * pxPerMm * k;
  const minPx = MIN_PT * pxPerPt;
  const els = leaves(card);

  // Undo the previous pass, so the fit follows the current text
  els.forEach((el) => {
    if (el.dataset.ktFs !== undefined) { el.style.fontSize = el.dataset.ktFs; delete el.dataset.ktFs; }
    if (el.dataset.ktWrap !== undefined) { el.style.overflowWrap = ''; delete el.dataset.ktWrap; }
  });
  card.removeAttribute('data-kt-overflow');

  // Direction from the words people typed (the name, greeting, line), not from handles or numbers
  const words = els.filter((el) => !el.closest('[data-kt-detail]')).map((el) => el.textContent)
    .filter((t) => !/@|^[\d\s+()\-.]+$/.test(t.trim())).join(' ');
  const rtl = (words.match(RTL) || []).length > (words.match(LATIN) || []).length;
  const dir = rtl ? 'rtl' : 'ltr';
  if (card.getAttribute('dir') !== dir) card.setAttribute('dir', dir);

  const size = (el) => parseFloat(getComputedStyle(el).fontSize);
  const setSize = (el, px) => {
    if (!el.dataset.ktFs) el.dataset.ktFs = el.style.fontSize || '';
    el.style.fontSize = Math.max(px, minPx).toFixed(2) + 'px';
  };

  const shrinkLines = () => els.forEach((el) => {
    for (let i = 0; i < 12; i++) {
      const r = textRect(el);
      const over = el.scrollWidth > el.clientWidth + 1 || r.left < box.left + safe - 0.5 || r.right > box.right - safe + 0.5;
      if (!over || size(el) <= minPx + 0.01) break;
      setSize(el, size(el) * 0.93);
    }
  });
  const restore = () => els.forEach((el) => { if (el.dataset.ktFs !== undefined) { el.style.fontSize = el.dataset.ktFs; delete el.dataset.ktFs; } });

  // The QR code is a block that must stay whole, inside the safe area and clear of text
  const qrs = Array.from(card.querySelectorAll('svg[aria-label^="QR"]')).map((svg) => svg.parentElement || svg);
  // Decorative frames (a thin line inset from the edge): text must stay inside the line, never cross it
  const frames = Array.from(card.querySelectorAll('div')).filter((el) => {
    const st = getComputedStyle(el);
    if (!(parseFloat(st.borderTopWidth) > 0 && parseFloat(st.borderLeftWidth) > 0 && st.borderTopStyle !== 'none')) return false;
    const r = el.getBoundingClientRect();
    return r.width > box.width * 0.6 && r.height > box.height * 0.6;
  });
  const outside = () => {
    const rs = els.map(textRect).filter((r) => r.width > 0);
    const blocks = rs.concat(qrs.map((q) => q.getBoundingClientRect()).filter((r) => r.width > 0));
    if (blocks.some((r) => r.top < box.top + safe - 0.5 || r.bottom > box.bottom - safe + 0.5 ||
      r.left < box.left + safe - 0.5 || r.right > box.right - safe + 0.5)) return true;
    for (const f of frames) {
      const fr = f.getBoundingClientRect(), b = parseFloat(getComputedStyle(f).borderTopWidth) * k + 1;
      if (rs.some((r) => r.left < fr.left + b || r.right > fr.right - b || r.top < fr.top + b || r.bottom > fr.bottom - b)) return true;
    }
    for (const q of qrs) {
      const a = q.getBoundingClientRect();
      if (rs.some((b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)) return true;
    }
    // two blocks of text running into each other (e.g. a long line pushed onto the name)
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 3) return true;
    }
    return false;
  };
  // 1. A line that is too wide for its box (one long word cannot wrap): shrink just that line
  // 2. Anything outside the safe area: shrink all text together, step by step
  const fit = () => {
    shrinkLines();
    for (let i = 0; i < 10 && outside(); i++) {
      if (els.every((el) => size(el) <= minPx + 0.01)) break;
      els.forEach((el) => setSize(el, size(el) * 0.94));
    }
    return !outside();
  };
  if (fit()) return;
  // 3. A long email or handle that cannot get small enough on one line may break onto a second line
  restore();
  const wide = els.filter((el) => el.closest('[data-kt-detail]') && /\S{18,}/.test(el.textContent));
  if (wide.length) {
    wide.forEach((el) => { el.dataset.ktWrap = ''; el.style.overflowWrap = 'anywhere'; });
    if (fit()) return;
    restore();
    wide.forEach((el) => { el.style.overflowWrap = ''; delete el.dataset.ktWrap; });
  }
  // Nothing saves it: keep the design at its normal size and let the editor ask for less text
  card.setAttribute('data-kt-overflow', '1');
}

let busy = false;
let queued = false;
function fitAll() {
  queued = false;
  busy = true;
  try { document.querySelectorAll('[data-kt-card]').forEach(fitCard); } catch (e) {}
  busy = false;
  const print = document.querySelector('[data-kt-print] [data-kt-card]');
  window.dispatchEvent(new CustomEvent('kt-card-fit', { detail: { overflow: !!(print && print.hasAttribute('data-kt-overflow')) } }));
}
function schedule() {
  if (busy || queued) return;
  queued = true;
  requestAnimationFrame(() => requestAnimationFrame(fitAll));
}

if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  const start = () => {
    new MutationObserver((list) => {
      if (busy) return;
      if (list.some((m) => m.type !== 'attributes' || (m.target.hasAttribute && m.target.hasAttribute('data-kt-card')))) schedule();
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style'] });
    schedule();
    if (document.fonts) { document.fonts.ready.then(schedule); document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', schedule); }
    window.addEventListener('resize', schedule);
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.KT_FIT = fitAll;
}
