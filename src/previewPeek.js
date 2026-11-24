// Phones: the card preview sits below the form, so while filling in the words the card is out of sight.
// A small "See your card" pill floats at the bottom when the preview is off screen and scrolls to it.
// Hidden while a field has focus (the keyboard is up) and on wider screens, where the preview is beside the form.
const T = (s) => (typeof window !== 'undefined' && window.__ktT ? window.__ktT(s) : s);

function start() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'kt-peek';
  btn.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:40;display:none;align-items:center;gap:8px;min-height:44px;padding:0 20px;border:0;border-radius:999px;background:#2F3C7E;color:#F7F2E9;font:500 15px/1 "Instrument Sans","KT Instrument Sans",sans-serif;box-shadow:0 10px 24px -10px rgba(20,20,40,.55);cursor:pointer';
  document.body.appendChild(btn);
  let seen = true;
  let io = null;
  let watched = null;
  const card = () => document.querySelector('[data-kt-print]');
  const field = () => { const a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };
  const update = () => {
    const el = card();
    const show = !!el && window.innerWidth < 900 && !seen && !field() && !document.querySelector('[role=dialog]');
    btn.textContent = T('See your card') + ' ↓';
    btn.style.display = show ? 'inline-flex' : 'none';
  };
  const watch = () => {
    const el = card();
    if (el === watched) return;
    if (io) io.disconnect();
    watched = el;
    seen = true;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => { seen = es.some((e) => e.isIntersecting); update(); }, { threshold: 0.25 });
      io.observe(el);
    }
    update();
  };
  btn.addEventListener('click', () => { const el = card(); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  new MutationObserver(watch).observe(document.body, { childList: true, subtree: true });
  ['focusin', 'focusout', 'resize'].forEach((ev) => window.addEventListener(ev, () => setTimeout(update, 0)));
  watch();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}
