// Print PDF, fully vector.
//
// The card preview is walked once and redrawn as PDF vector objects:
//   - every word is drawn as glyph outlines (text converted to curves), from the same font files the preview uses
//   - the QR code is one vector path, with its white plate as a separate object
//   - illustrations (inline SVG) become vector paths, gradients become PDF shadings
//   - the card background (the paper colour) is not put in the file: the shop's card stock gives the colour
// Objects sit on PDF layers (Optional Content): Illustration, QR code, Text (outlined), Crop marks.
// No raster images and no fonts end up in the file.
//
// window.KT_VECTOR.make(root, { mode: 'shop' | 'home', orient: 'tall' | 'wide', label, title }) -> { bytes }

const MM = 72 / 25.4;
const BLEED = 3;
const SIZES = { tall: { w: 101.6, h: 132.08 }, wide: { w: 88.9, h: 50.8 } };
const SKEW = 0.25;            // synthetic italic, as Chrome/Skia draws it
const f = (n) => { const v = Math.round(n * 1000) / 1000; return Object.is(v, -0) ? '0' : String(v); };

// ---------- fonts ----------
let fkP = null;
const fontkit = () => (fkP = fkP || import('fontkit').then((m) => (m.create ? m : m.default)));
const fontFiles = new Map();
const ttfUrl = (url) => url.replace(/\/assets\/([\w.-]+)\.woff2$/, '/assets/pdf-fonts/$1.ttf');
function loadFont(url) {
  if (!fontFiles.has(url)) {
    fontFiles.set(url, (async () => {
      const fk = await fontkit();
      const r = await fetch(ttfUrl(url));
      if (!r.ok) throw new Error('FONT ' + url);
      return fk.create(new Uint8Array(await r.arrayBuffer()));
    })().catch((e) => { fontFiles.delete(url); throw e; }));
  }
  return fontFiles.get(url);
}

let faceList = null;
function faces() {
  if (faceList) return faceList;
  faceList = [];
  const unq = (s) => s.trim().replace(/^["']|["']$/g, '').toLowerCase();
  const ranges = (s) => !s ? null : s.split(',').map((p) => {
    const m = p.trim().replace(/^U\+/i, '').split('-');
    const a = parseInt(m[0].replace(/\?/g, '0'), 16), b = m[1] ? parseInt(m[1], 16) : parseInt(m[0].replace(/\?/g, 'F'), 16);
    return [a, b];
  });
  const scan = (rules, base) => {
    for (const r of rules) {
      if (r.type === 3 && r.styleSheet) { try { scan(r.styleSheet.cssRules, r.styleSheet.href || base); } catch (e) {} continue; }
      if (r.type !== 5) continue;
      const st = r.style;
      const src = st.getPropertyValue('src');
      const m = src.match(/url\(["']?([^"')]+\.woff2)["']?\)/);
      if (!m) continue;
      const w = (st.getPropertyValue('font-weight') || '400').trim().split(/\s+/).map((x) => (x === 'normal' ? 400 : x === 'bold' ? 700 : parseFloat(x)));
      faceList.push({
        family: unq(st.getPropertyValue('font-family')),
        style: (st.getPropertyValue('font-style') || 'normal').trim(),
        wmin: w[0], wmax: w[1] || w[0],
        ranges: ranges(st.getPropertyValue('unicode-range')),
        url: new URL(m[1], base || location.href).pathname,
      });
    }
  };
  for (const ss of document.styleSheets) { try { scan(ss.cssRules, ss.href); } catch (e) {} }
  return faceList;
}

// Pick the face the browser would use for one character (family list, style, weight, unicode-range, glyph present)
const pickCache = new Map();
async function pickFace(families, style, weight, cp) {
  const key = families.join(',') + '|' + style + '|' + weight + '|' + cp;
  if (pickCache.has(key)) return pickCache.get(key);
  const all = faces();
  let found = null;
  for (const fam of families) {
    let c = all.filter((x) => x.family === fam && (!x.ranges || x.ranges.some(([a, b]) => cp >= a && cp <= b)));
    if (!c.length) continue;
    const want = style === 'normal' ? 'normal' : 'italic';
    const same = c.filter((x) => x.style === want);
    if (same.length) c = same;
    c.sort((a, b) => dist(a, weight) - dist(b, weight));
    for (const face of c) {
      try {
        const font = await loadFont(face.url);
        if (font.hasGlyphForCodePoint(cp)) { found = { face, font }; break; }
      } catch (e) {}
    }
    if (found) break;
  }
  if (!found) {
    // the browser fell back to some other font: use the closest face of ours that has the character
    const generic = families.includes('serif') ? 'kt instrument serif' : families.includes('cursive') ? 'kt mrs saint delafield' : 'kt instrument sans';
    const pool = all.filter((x) => x.family === generic).concat(all.filter((x) => x.family !== generic));
    for (const face of pool) {
      if (face.ranges && !face.ranges.some(([a, b]) => cp >= a && cp <= b)) continue;
      try { const font = await loadFont(face.url); if (font.hasGlyphForCodePoint(cp)) { found = { face, font }; break; } } catch (e) {}
    }
  }
  pickCache.set(key, found);
  return found;
}
const dist = (face, w) => (w < face.wmin ? face.wmin - w : w > face.wmax ? w - face.wmax : 0);

const varCache = new Map();
function instance(font, face, weight, sizePx, cs) {
  const axes = font.variationAxes || {};
  if (!Object.keys(axes).length) return font;
  const set = {};
  if (axes.wght) set.wght = Math.max(axes.wght.min, Math.min(axes.wght.max, Math.max(face.wmin, Math.min(face.wmax, weight))));
  if (axes.opsz && cs.fontOpticalSizing !== 'none') set.opsz = Math.max(axes.opsz.min, Math.min(axes.opsz.max, sizePx));
  const fvs = cs.fontVariationSettings;
  if (fvs && fvs !== 'normal') fvs.replace(/["'](\w{4})["']\s+(-?[\d.]+)/g, (_, t, v) => { if (axes[t]) set[t] = parseFloat(v); });
  const key = face.url + JSON.stringify(set);
  if (!varCache.has(key)) { try { varCache.set(key, font.getVariation(set)); } catch (e) { varCache.set(key, font); } }
  return varCache.get(key);
}

const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

// ---------- colour ----------
function rgba(c) {
  if (!c || c === 'none' || c === 'transparent') return null;
  let m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1];
  }
  m = c.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = h.split('').map((x) => x + x).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    return [n(0), n(2), n(4), h.length === 8 ? n(6) : 1];
  }
  if (c === 'white') return [1, 1, 1, 1];
  if (c === 'black') return [0, 0, 0, 1];
  return null;
}

// ---------- PDF document model ----------
class Doc {
  constructor() { this.objs = []; this.gs = new Map(); this.sh = []; this.xo = []; }
  add(body, stream) { this.objs.push({ body, stream }); return this.objs.length; } // object number
  set(n, body, stream) { this.objs[n - 1] = { body, stream }; }
  reserve() { this.objs.push(null); return this.objs.length; }
  alpha(a, A) { // ExtGState for fill / stroke opacity
    const k = 'a' + f(a) + '_' + f(A);
    if (!this.gs.has(k)) this.gs.set(k, { name: 'G' + this.gs.size, body: '<< /Type /ExtGState /ca ' + f(a) + ' /CA ' + f(A) + ' >>' });
    return this.gs.get(k).name;
  }
  gsRaw(body) { const name = 'G' + this.gs.size; this.gs.set(name + '_raw', { name, body }); return name; }
}

// ---------- geometry helpers ----------
const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const cm = (m) => m.map(f).join(' ') + ' cm';
function roundRect(x, y, w, h, r) {
  if (!r) return f(x) + ' ' + f(y) + ' ' + f(w) + ' ' + f(h) + ' re';
  r = Math.min(r, w / 2, h / 2);
  const k = 0.5523 * r;
  return [
    f(x + r) + ' ' + f(y) + ' m', f(x + w - r) + ' ' + f(y) + ' l',
    f(x + w - r + k) + ' ' + f(y) + ' ' + f(x + w) + ' ' + f(y + r - k) + ' ' + f(x + w) + ' ' + f(y + r) + ' c',
    f(x + w) + ' ' + f(y + h - r) + ' l',
    f(x + w) + ' ' + f(y + h - r + k) + ' ' + f(x + w - r + k) + ' ' + f(y + h) + ' ' + f(x + w - r) + ' ' + f(y + h) + ' c',
    f(x + r) + ' ' + f(y + h) + ' l',
    f(x + r - k) + ' ' + f(y + h) + ' ' + f(x) + ' ' + f(y + h - r + k) + ' ' + f(x) + ' ' + f(y + h - r) + ' c',
    f(x) + ' ' + f(y + r) + ' l',
    f(x) + ' ' + f(y + r - k) + ' ' + f(x + r - k) + ' ' + f(y) + ' ' + f(x + r) + ' ' + f(y) + ' c', 'h',
  ].join(' ');
}
function ellipse(cx, cy, rx, ry) {
  const kx = 0.5523 * rx, ky = 0.5523 * ry;
  return [
    f(cx + rx) + ' ' + f(cy) + ' m',
    f(cx + rx) + ' ' + f(cy + ky) + ' ' + f(cx + kx) + ' ' + f(cy + ry) + ' ' + f(cx) + ' ' + f(cy + ry) + ' c',
    f(cx - kx) + ' ' + f(cy + ry) + ' ' + f(cx - rx) + ' ' + f(cy + ky) + ' ' + f(cx - rx) + ' ' + f(cy) + ' c',
    f(cx - rx) + ' ' + f(cy - ky) + ' ' + f(cx - kx) + ' ' + f(cy - ry) + ' ' + f(cx) + ' ' + f(cy - ry) + ' c',
    f(cx + kx) + ' ' + f(cy - ry) + ' ' + f(cx + rx) + ' ' + f(cy - ky) + ' ' + f(cx + rx) + ' ' + f(cy) + ' c', 'h',
  ].join(' ');
}

// SVG path data -> PDF path operators (absolute, arcs as cubics)
function svgPath(d) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) || [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, qx = 0, qy = 0, prev = '';
  const out = [];
  const num = () => parseFloat(toks[i++]);
  const isNum = () => i < toks.length && !/^[a-zA-Z]$/.test(toks[i]);
  const C = (x1, y1, x2, y2, x3, y3) => out.push(f(x1) + ' ' + f(y1) + ' ' + f(x2) + ' ' + f(y2) + ' ' + f(x3) + ' ' + f(y3) + ' c');
  while (i < toks.length) {
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), U = cmd.toUpperCase();
    if (U === 'Z') { out.push('h'); x = sx; y = sy; prev = 'Z'; continue; }
    if (!isNum()) { i++; continue; }
    if (U === 'M') {
      x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); sx = x; sy = y; out.push(f(x) + ' ' + f(y) + ' m');
      cmd = rel ? 'l' : 'L'; prev = 'M'; continue;
    }
    if (U === 'L') { x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); out.push(f(x) + ' ' + f(y) + ' l'); }
    else if (U === 'H') { x = (rel ? x : 0) + num(); out.push(f(x) + ' ' + f(y) + ' l'); }
    else if (U === 'V') { y = (rel ? y : 0) + num(); out.push(f(x) + ' ' + f(y) + ' l'); }
    else if (U === 'C') {
      const ox = rel ? x : 0, oy = rel ? y : 0;
      const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(); x = ox + num(); y = oy + num();
      C(x1, y1, x2, y2, x, y); cx = x2; cy = y2;
    } else if (U === 'S') {
      const ox = rel ? x : 0, oy = rel ? y : 0;
      const x1 = /[CS]/.test(prev) ? 2 * x - cx : x, y1 = /[CS]/.test(prev) ? 2 * y - cy : y;
      const x2 = ox + num(), y2 = oy + num(); x = ox + num(); y = oy + num();
      C(x1, y1, x2, y2, x, y); cx = x2; cy = y2;
    } else if (U === 'Q' || U === 'T') {
      const ox = rel ? x : 0, oy = rel ? y : 0;
      let x1, y1;
      if (U === 'Q') { x1 = ox + num(); y1 = oy + num(); } else { x1 = /[QT]/.test(prev) ? 2 * x - qx : x; y1 = /[QT]/.test(prev) ? 2 * y - qy : y; }
      const nx = ox + num(), ny = oy + num();
      C(x + 2 / 3 * (x1 - x), y + 2 / 3 * (y1 - y), nx + 2 / 3 * (x1 - nx), ny + 2 / 3 * (y1 - ny), nx, ny);
      qx = x1; qy = y1; x = nx; y = ny;
    } else if (U === 'A') {
      const rx0 = num(), ry0 = num(), rot = num(), large = num(), sweep = num();
      const nx = (rel ? x : 0) + num(), ny = (rel ? y : 0) + num();
      arc(x, y, rx0, ry0, rot, large, sweep, nx, ny).forEach((c) => C(...c));
      x = nx; y = ny;
    }
    prev = U;
  }
  return out.join(' ');
}
function arc(x1, y1, rx, ry, phi, fa, fs, x2, y2) {
  if (!rx || !ry) return [[x1, y1, x2, y2, x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const p = phi * Math.PI / 180, cp = Math.cos(p), sp = Math.sin(p);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  let lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const sgn = fa === fs ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const co = sgn * Math.sqrt(Math.max(0, num / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
  const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  let t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const segs = Math.ceil(Math.abs(dt) / (Math.PI / 2)), out = [];
  const d = dt / segs, k = 4 / 3 * Math.tan(d / 4);
  const pt = (t) => [cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp];
  const dv = (t) => [-rx * Math.sin(t) * cp - ry * Math.cos(t) * sp, -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp];
  for (let s = 0; s < segs; s++) {
    const a = t1 + s * d, b = a + d;
    const [ax, ay] = pt(a), [bx, by] = pt(b), [dax, day] = dv(a), [dbx, dby] = dv(b);
    out.push([ax + k * dax, ay + k * day, bx - k * dbx, by - k * dby, bx, by]);
  }
  return out;
}

function shapePath(el) {
  const tag = el.tagName.toLowerCase();
  const n = (a) => (el[a] && el[a].baseVal ? el[a].baseVal.value : parseFloat(el.getAttribute(a)) || 0);
  if (tag === 'path') return svgPath(el.getAttribute('d') || '');
  if (tag === 'rect') {
    const w = n('width'), h = n('height');
    if (!w || !h) return '';
    let rx = n('rx'), ry = n('ry'); if (!rx) rx = ry; if (!ry) ry = rx;
    if (!rx) { const x = n('x'), y = n('y'); return f(x) + ' ' + f(y) + ' m ' + f(x + w) + ' ' + f(y) + ' l ' + f(x + w) + ' ' + f(y + h) + ' l ' + f(x) + ' ' + f(y + h) + ' l h'; }
    rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
    const x = n('x'), y = n('y'), kx = 0.5523 * rx, ky = 0.5523 * ry;
    return [f(x + rx) + ' ' + f(y) + ' m', f(x + w - rx) + ' ' + f(y) + ' l', f(x + w - rx + kx) + ' ' + f(y) + ' ' + f(x + w) + ' ' + f(y + ry - ky) + ' ' + f(x + w) + ' ' + f(y + ry) + ' c',
      f(x + w) + ' ' + f(y + h - ry) + ' l', f(x + w) + ' ' + f(y + h - ry + ky) + ' ' + f(x + w - rx + kx) + ' ' + f(y + h) + ' ' + f(x + w - rx) + ' ' + f(y + h) + ' c',
      f(x + rx) + ' ' + f(y + h) + ' l', f(x + rx - kx) + ' ' + f(y + h) + ' ' + f(x) + ' ' + f(y + h - ry + ky) + ' ' + f(x) + ' ' + f(y + h - ry) + ' c',
      f(x) + ' ' + f(y + ry) + ' l', f(x) + ' ' + f(y + ry - ky) + ' ' + f(x + rx - kx) + ' ' + f(y) + ' ' + f(x + rx) + ' ' + f(y) + ' c', 'h'].join(' ');
  }
  if (tag === 'circle') { const r = n('r'); return r ? ellipse(n('cx'), n('cy'), r, r) : ''; }
  if (tag === 'ellipse') { const rx = n('rx'), ry = n('ry'); return rx && ry ? ellipse(n('cx'), n('cy'), rx, ry) : ''; }
  if (tag === 'line') return f(n('x1')) + ' ' + f(n('y1')) + ' m ' + f(n('x2')) + ' ' + f(n('y2')) + ' l';
  if (tag === 'polygon' || tag === 'polyline') {
    const p = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(parseFloat);
    if (p.length < 4) return '';
    let s = f(p[0]) + ' ' + f(p[1]) + ' m';
    for (let i = 2; i + 1 < p.length; i += 2) s += ' ' + f(p[i]) + ' ' + f(p[i + 1]) + ' l';
    return tag === 'polygon' ? s + ' h' : s;
  }
  return '';
}
const elMatrix = (el) => { try { const t = el.transform && el.transform.baseVal.consolidate(); if (t) { const m = t.matrix; return [m.a, m.b, m.c, m.d, m.e, m.f]; } } catch (e) {} return [1, 0, 0, 1, 0, 0]; };

// gradient (linear / radial, objectBoundingBox or userSpaceOnUse) -> PDF shading, with a soft mask when stops fade
function gradient(doc, res, grad, shape) {
  const stops = Array.from(grad.querySelectorAll('stop')).map((s) => {
    const cs = getComputedStyle(s);
    const c = rgba(cs.stopColor) || [0, 0, 0, 1];
    const off = parseFloat(s.getAttribute('offset') || '0') * (/%/.test(s.getAttribute('offset') || '') ? 0.01 : 1);
    return { t: Math.max(0, Math.min(1, off)), c: c.slice(0, 3), a: c[3] * parseFloat(cs.stopOpacity || '1') };
  });
  if (!stops.length) return null;
  if (stops.length === 1) stops.push(Object.assign({}, stops[0], { t: 1 }));
  if (stops[0].t > 0) stops.unshift(Object.assign({}, stops[0], { t: 0 }));
  if (stops[stops.length - 1].t < 1) stops.push(Object.assign({}, stops[stops.length - 1], { t: 1 }));
  const func = (vals) => {
    const fns = [], bounds = [], enc = [];
    for (let i = 0; i < stops.length - 1; i++) {
      fns.push('<< /FunctionType 2 /Domain [0 1] /C0 [' + vals(stops[i]).map(f).join(' ') + '] /C1 [' + vals(stops[i + 1]).map(f).join(' ') + '] /N 1 >>');
      if (i) bounds.push(f(Math.max(stops[i].t, 1e-4)));
      enc.push('0 1');
    }
    return fns.length === 1 ? fns[0] : '<< /FunctionType 3 /Domain [0 1] /Functions [' + fns.join(' ') + '] /Bounds [' + bounds.join(' ') + '] /Encode [' + enc.join(' ') + '] >>';
  };
  const radial = grad.tagName.toLowerCase() === 'radialgradient';
  const g = (a, d) => { const v = grad.getAttribute(a); if (v == null) return d; return parseFloat(v) * (/%/.test(v) ? 0.01 : 1); };
  const coords = radial
    ? (() => { const cx = g('cx', 0.5), cy = g('cy', 0.5), r = g('r', 0.5); return [g('fx', cx), g('fy', cy), 0, cx, cy, r]; })()
    : [g('x1', 0), g('y1', 0), g('x2', 1), g('y2', 0)];
  const shading = (cs, vals) => '<< /ShadingType ' + (radial ? 3 : 2) + ' /ColorSpace ' + cs + ' /Coords [' + coords.map(f).join(' ') + '] /Function ' + func(vals) + ' /Extend [true true] >>';
  const name = 'Sh' + doc.sh.length;
  doc.sh.push({ name, body: shading('/DeviceRGB', (s) => s.c) });
  let mask = '';
  if (stops.some((s) => s.a < 0.999)) {
    const sn = 'Sh' + doc.sh.length;
    doc.sh.push({ name: sn, body: shading('/DeviceGray', (s) => [s.a]) });
    const form = doc.add('<< /Type /XObject /Subtype /Form /BBox [-10000 -10000 10000 10000] /Group << /S /Transparency /CS /DeviceGray >> /Resources << /Shading << /' + sn + ' @SH:' + sn + ' >> >> /Length @LEN >>', '/' + sn + ' sh');
    mask = doc.gsRaw('<< /Type /ExtGState /SMask << /Type /Mask /S /Luminosity /G ' + form + ' 0 R >> >>');
  }
  let unit = [1, 0, 0, 1, 0, 0];
  if ((grad.getAttribute('gradientUnits') || 'objectBoundingBox') === 'objectBoundingBox') {
    const bb = shape.getBBox(); unit = [bb.width, 0, 0, bb.height, bb.x, bb.y];
  }
  const gt = elMatrix(grad);
  return { name, mask, m: mul(unit, gt) };
}

// ---------- walk the card ----------
async function collect(root, doc, B, printColour) {
  const rr = root.getBoundingClientRect();
  const W = root.offsetWidth, H = root.offsetHeight;
  const k = rr.width / W || 1;
  const box = (r) => ({ x: (r.left - rr.left) / k, y: (r.top - rr.top) / k, w: r.width / k, h: r.height / k });
  const L = { bg: [], art: [], qr: [], text: [] };
  const qrSvg = root.querySelector('svg[aria-label^="QR"]');
  const opacityOf = (el) => { let o = 1; for (let e = el; e && e !== root.parentNode; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity || '1'); return o; };
  const fill = (c, a) => { const g = a < 0.999 ? '/' + doc.alpha(a, a) + ' gs ' : ''; return g + f(c[0]) + ' ' + f(c[1]) + ' ' + f(c[2]) + ' rg'; };
  const stroke = (c, a, fa) => { const g = a < 0.999 || fa < 0.999 ? '/' + doc.alpha(fa, a) + ' gs ' : ''; return g + f(c[0]) + ' ' + f(c[1]) + ' ' + f(c[2]) + ' RG'; };
  const radius = (cs, b) => { const r = cs.borderTopLeftRadius; if (!r || r === '0px') return 0; if (r.endsWith('%')) return Math.min(b.w, b.h) * parseFloat(r) / 100; return Math.min(parseFloat(r), b.w / 2, b.h / 2); };
  const extend = (b) => {
    const e = 0.75, x0 = b.x <= e ? -B : b.x, y0 = b.y <= e ? -B : b.y;
    const x1 = b.x + b.w >= W - e ? W + B : b.x + b.w, y1 = b.y + b.h >= H - e ? H + B : b.y + b.h;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  const meas = document.createElement('canvas').getContext('2d');
  const jobs = [];

  const svgOut = (svg, b, layer, outerOp) => {
    const out = [];
    const base = [1, 0, 0, 1, b.x, b.y];
    out.push('q ' + f(b.x) + ' ' + f(b.y) + ' ' + f(b.w) + ' ' + f(b.h) + ' re W n');
    const shapes = svg.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line');
    shapes.forEach((el) => {
      if (el.closest('defs,clipPath,mask,pattern,symbol')) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      let op = 1;
      for (let e = el; e && e !== svg.parentNode; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity || '1');
      op *= outerOp;
      if (op <= 0.001) return;
      const d = shapePath(el);
      if (!d) return;
      let ctm; try { const m = el.getCTM(); ctm = [m.a, m.b, m.c, m.d, m.e, m.f]; } catch (e) { return; }
      const M = mul(base, ctm);
      const parts = ['q ' + cm(M)];
      // clip-path on the element or a parent group (clip shapes live in that group's user space)
      for (let e = el; e && e !== svg; e = e.parentElement) {
        const cp = getComputedStyle(e).clipPath;
        const id = cp && (cp.match(/url\(["']?#([^"')]+)/) || [])[1];
        const cpEl = id && svg.querySelector('#' + CSS.escape(id));
        if (!cpEl) continue;
        let toE; try { const a = e.getCTM(); toE = [a.a, a.b, a.c, a.d, a.e, a.f]; } catch (x) { continue; }
        const rel = mul(invert(ctm), toE);
        const ds = Array.from(cpEl.querySelectorAll('path,rect,circle,ellipse,polygon,polyline'))
          .map((c) => { const cd = shapePath(c); return cd ? transformPath(cd, mul(rel, elMatrix(c))) : ''; }).filter(Boolean);
        if (ds.length) parts.push(ds.join(' ') + ' W n');
      }
      const fillV = cs.fill, fo = parseFloat(cs.fillOpacity || '1') * op;
      const gm = fillV && fillV.match(/url\(["']?#([^"')]+)/);
      const evenodd = cs.fillRule === 'evenodd' ? '*' : '';
      if (gm) {
        const gel = svg.querySelector('#' + CSS.escape(gm[1])) || document.getElementById(gm[1]);
        const g = gel && gradient(doc, null, gel, el);
        if (g) parts.push('q ' + d + ' W' + evenodd + ' n ' + (fo < 0.999 ? '/' + doc.alpha(fo, fo) + ' gs ' : '') + cm(g.m) + (g.mask ? ' /' + g.mask + ' gs' : '') + ' /' + g.name + ' sh Q');
      } else {
        const c = rgba(fillV);
        if (c && c[3] * fo > 0.001) parts.push('q ' + fill(c, c[3] * fo) + ' ' + d + ' f' + evenodd + ' Q');
      }
      const sc = rgba(cs.stroke), sw = parseFloat(cs.strokeWidth || '1');
      if (sc && sw > 0 && cs.stroke !== 'none') {
        const so = parseFloat(cs.strokeOpacity || '1') * op * sc[3];
        const cap = { butt: 0, round: 1, square: 2 }[cs.strokeLinecap] || 0, join = { miter: 0, round: 1, bevel: 2 }[cs.strokeLinejoin] || 0;
        const dash = cs.strokeDasharray && cs.strokeDasharray !== 'none' ? '[' + cs.strokeDasharray.split(/[\s,]+/).map(parseFloat).map(f).join(' ') + '] 0 d ' : '';
        parts.push('q ' + stroke(sc, so, 1) + ' ' + f(sw) + ' w ' + cap + ' J ' + join + ' j ' + dash + d + ' S Q');
      }
      parts.push('Q');
      out.push(parts.join('\n'));
    });
    out.push('Q');
    L[layer].push(out.join('\n'));
  };

  const walk = (el) => {
    if (el.nodeType !== 1) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (el.classList && el.classList.contains('k-tex')) return;
    const tag = el.tagName.toLowerCase();
    const b = box(el.getBoundingClientRect());
    if (b.w <= 0 || b.h <= 0) return;
    const op = opacityOf(el);
    const isQr = !!qrSvg && (el === qrSvg || (el.contains(qrSvg) && b.w * b.h < W * H * 0.25));
    const layer = isQr ? 'qr' : 'art';
    if (tag === 'svg') { svgOut(el, b, layer, el.parentElement ? opacityOf(el.parentElement) : 1); return; }
    if (tag === 'img') return; // no raster images on cards
    if (el === root && printColour) {
      // "Printed colour on white" paper: the design colour is ink, so it goes in, out to the bleed
      const bg = rgba(cs.backgroundColor);
      if (bg && bg[3] > 0.001) L.bg.push('q ' + fill(bg, bg[3] * op) + ' ' + roundRect(-B, -B, W + 2 * B, H + 2 * B, 0) + ' f Q');
    }
    if (el !== root) {
      const sh = cs.boxShadow;
      if (sh && sh !== 'none') {
        sh.split(/,(?![^(]*\))/).forEach((part) => {
          const col = (part.match(/rgba?\([^)]*\)|#[0-9a-f]+/i) || [])[0];
          const nums = part.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).map(parseFloat);
          // solid rings (spread, no blur) are drawn; soft blurred shadows are screen-only
          if (col && nums.length >= 4 && nums[0] === 0 && nums[1] === 0 && nums[2] === 0 && nums[3] > 0 && !/inset/.test(part)) {
            const c = rgba(col); if (!c) return;
            const s = nums[3], r = radius(cs, b) + s;
            L[layer].push('q ' + fill(c, c[3] * op) + ' ' + roundRect(b.x - s, b.y - s, b.w + 2 * s, b.h + 2 * s, r) + ' f Q');
          }
        });
      }
      const bg = rgba(cs.backgroundColor);
      if (bg && bg[3] > 0.001) {
        const eb = extend(b), r = (eb.w === b.w && eb.h === b.h) ? radius(cs, b) : 0;
        L[layer].push('q ' + fill(bg, bg[3] * op) + ' ' + roundRect(eb.x, eb.y, eb.w, eb.h, r) + ' f Q');
      }
      const bw = parseFloat(cs.borderTopWidth);
      const bc = rgba(cs.borderTopColor);
      if (bw > 0 && cs.borderTopStyle !== 'none' && bc && bc[3] > 0.001) {
        const r = radius(cs, b);
        L[layer].push('q ' + stroke(bc, bc[3] * op, 1) + ' ' + f(bw) + ' w ' + roundRect(b.x + bw / 2, b.y + bw / 2, b.w - bw, b.h - bw, Math.max(0, r - bw / 2)) + ' S Q');
      }
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { const slot = L.text.length; L.text.push(''); jobs.push(text(n, cs, op, box, meas).then((s) => { L.text[slot] = s; })); }
      else walk(n);
    }
  };
  walk(root);
  await Promise.all(jobs);
  return { W, H, L };
}

function invert(m) {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-12;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
}
function transformPath(d, m) {
  const t = d.split(' '); const out = []; let buf = [];
  for (const tok of t) {
    if (/^[a-zA-Z*]+$/.test(tok)) {
      for (let i = 0; i + 1 < buf.length; i += 2) { const x = buf[i], y = buf[i + 1]; out.push(f(m[0] * x + m[2] * y + m[4]), f(m[1] * x + m[3] * y + m[5])); }
      out.push(tok); buf = [];
    } else buf.push(parseFloat(tok));
  }
  return out.join(' ');
}

// one text node -> outlined words, placed where the preview draws them
async function text(node, cs, op, box, meas) {
  const txt = node.nodeValue;
  if (!txt || !txt.trim()) return '';
  const color = rgba(cs.color) || [0, 0, 0, 1];
  const alpha = color[3] * op;
  if (alpha <= 0.001) return '';
  const size = parseFloat(cs.fontSize);
  const families = cs.fontFamily.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const style = cs.fontStyle === 'normal' ? 'normal' : 'italic';
  const weight = parseFloat(cs.fontWeight) || 400;
  const upper = cs.textTransform === 'uppercase', lower = cs.textTransform === 'lowercase';
  const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0;
  meas.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  const mt = meas.measureText('Hg');
  const asc = mt.fontBoundingBoxAscent != null ? mt.fontBoundingBoxAscent : size * 0.8;
  const desc = mt.fontBoundingBoxDescent != null ? mt.fontBoundingBoxDescent : size * 0.2;
  const range = document.createRange();
  const out = ['q ' + (alpha < 0.999 ? '/' + this_alpha(alpha) + ' gs ' : '') + f(color[0]) + ' ' + f(color[1]) + ' ' + f(color[2]) + ' rg ' + f(color[0]) + ' ' + f(color[1]) + ' ' + f(color[2]) + ' RG'];
  const re = /\S+/g; let mm;
  while ((mm = re.exec(txt))) {
    range.setStart(node, mm.index); range.setEnd(node, mm.index + mm[0].length);
    const rects = range.getClientRects();
    if (!rects.length) continue;
    // a word that wraps (long email) is drawn line by line
    const parts = [];
    if (rects.length > 1) {
      let st = mm.index, top = null;
      for (let i = mm.index; i < mm.index + mm[0].length; i++) {
        range.setStart(node, i); range.setEnd(node, i + 1);
        const cr = range.getClientRects()[0];
        if (!cr) continue;
        if (top !== null && Math.abs(cr.top - top) > 1) { parts.push([st, i]); st = i; }
        if (top === null || Math.abs(cr.top - top) > 1) top = cr.top;
      }
      parts.push([st, mm.index + mm[0].length]);
    } else parts.push([mm.index, mm.index + mm[0].length]);
    for (const [s0, s1] of parts) {
      range.setStart(node, s0); range.setEnd(node, s1);
      const r = range.getBoundingClientRect();
      const b = box(r);
      let word = txt.slice(s0, s1);
      if (upper) word = word.toUpperCase(); else if (lower) word = word.toLowerCase();
      const base = b.y + (b.h - (asc + desc)) / 2 + asc;
      out.push(await outlineWord(word, families, style, weight, size, ls, cs, b, base));
    }
  }
  out.push('Q');
  return out.join('\n');
}
let this_alpha = () => 'G0';

const missing = [];
async function outlineWord(word, families, style, weight, size, ls, cs, b, base) {
  // split into runs that share a face
  const chars = Array.from(word);
  const runs = [];
  for (const ch of chars) {
    const cp = ch.codePointAt(0);
    const pick = await pickFace(families, style, weight, cp);
    if (!pick) { missing.push(ch); continue; }
    const last = runs[runs.length - 1];
    if (last && last.pick.face === pick.face) last.s += ch; else runs.push({ pick, s: ch });
  }
  const rtl = RTL.test(word);
  const shaped = runs.map((run) => {
    const { face, font } = run.pick;
    const inst = instance(font, face, weight, size, cs);
    const feats = ls ? { liga: false, clig: false, dlig: false, hlig: false, calt: false } : undefined;
    let gr;
    try { gr = font.layout(run.s, feats); } catch (e) { gr = font.layout(run.s); }
    const sc = size / font.unitsPerEm;
    const glyphs = gr.glyphs.map((g, i) => {
      let vg = g;
      if (inst !== font) { try { vg = inst.getGlyph(g.id) || g; } catch (e) { vg = g; } }
      const pos = gr.positions[i];
      const adv = (inst !== font && vg.advanceWidth ? vg.advanceWidth - g.advanceWidth : 0) + pos.xAdvance;
      return { path: vg.path, dx: pos.xOffset, dy: pos.yOffset, adv };
    });
    const width = glyphs.reduce((a, g) => a + g.adv * sc + ls, 0);
    const synthItalic = style === 'italic' && face.style === 'normal';
    const synthBold = weight >= 600 && face.wmax < 600 && !(font.variationAxes && font.variationAxes.wght);
    return { glyphs, sc, width, synthItalic, synthBold };
  });
  if (rtl) shaped.reverse();
  const total = shaped.reduce((a, s) => a + s.width, 0);
  if (!total) return '';
  // keep the preview's exact word width (small differences in kerning between engines)
  const fx = Math.abs(b.w / total - 1) < 0.2 ? b.w / total : 1;
  if (Math.abs(fx - 1) > 0.04 && window.__ktPdfDebug) window.__ktPdfDebug.push({ word, ratio: b.w / total });
  let pen = b.x;
  const ops = [];
  for (const s of shaped) {
    const k = s.sc;
    for (const g of s.glyphs) {
      const ox = pen + g.dx * k * fx, oy = base;
      const sk = s.synthItalic ? SKEW : 0;
      const P = (x, y) => f(ox + (x + y * sk) * k * fx) + ' ' + f(oy - (y + g.dy) * k);
      let cx = 0, cy = 0;
      const d = [];
      for (const c of g.path.commands) {
        const a = c.args;
        if (c.command === 'moveTo') { d.push(P(a[0], a[1]) + ' m'); cx = a[0]; cy = a[1]; }
        else if (c.command === 'lineTo') { d.push(P(a[0], a[1]) + ' l'); cx = a[0]; cy = a[1]; }
        else if (c.command === 'quadraticCurveTo') {
          const x1 = cx + 2 / 3 * (a[0] - cx), y1 = cy + 2 / 3 * (a[1] - cy), x2 = a[2] + 2 / 3 * (a[0] - a[2]), y2 = a[3] + 2 / 3 * (a[1] - a[3]);
          d.push(P(x1, y1) + ' ' + P(x2, y2) + ' ' + P(a[2], a[3]) + ' c'); cx = a[2]; cy = a[3];
        } else if (c.command === 'bezierCurveTo') { d.push(P(a[0], a[1]) + ' ' + P(a[2], a[3]) + ' ' + P(a[4], a[5]) + ' c'); cx = a[4]; cy = a[5]; }
        else if (c.command === 'closePath') d.push('h');
      }
      if (d.length) ops.push(d.join(' ') + (s.synthBold ? ' ' + f(size / 24) + ' w 1 j B' : ' f'));
      pen += (g.adv * k + ls) * fx;
    }
  }
  return ops.join('\n');
}

// ---------- page ----------
async function labelPaths(str, x, y, size) {
  try {
    const font = await loadFont('/assets/InstrumentSans-VF.woff2');
    const run = font.layout(str);
    const k = size / font.unitsPerEm;
    let pen = x; const ops = [];
    run.glyphs.forEach((g, i) => {
      const d = []; let cx = 0, cy = 0;
      const P = (a, b2) => f(pen + a * k) + ' ' + f(y + b2 * k);
      for (const c of g.path.commands) {
        const a = c.args;
        if (c.command === 'moveTo') { d.push(P(a[0], a[1]) + ' m'); cx = a[0]; cy = a[1]; }
        else if (c.command === 'lineTo') { d.push(P(a[0], a[1]) + ' l'); cx = a[0]; cy = a[1]; }
        else if (c.command === 'quadraticCurveTo') {
          d.push(P(cx + 2 / 3 * (a[0] - cx), cy + 2 / 3 * (a[1] - cy)) + ' ' + P(a[2] + 2 / 3 * (a[0] - a[2]), a[3] + 2 / 3 * (a[1] - a[3])) + ' ' + P(a[2], a[3]) + ' c'); cx = a[2]; cy = a[3];
        } else if (c.command === 'bezierCurveTo') { d.push(P(a[0], a[1]) + ' ' + P(a[2], a[3]) + ' ' + P(a[4], a[5]) + ' c'); cx = a[4]; cy = a[5]; }
        else if (c.command === 'closePath') d.push('h');
      }
      if (d.length) ops.push(d.join(' ') + ' f');
      pen += run.positions[i].xAdvance * k;
    });
    return ops.join('\n');
  } catch (e) { return ''; }
}

async function deflate(u8) {
  if (typeof CompressionStream === 'undefined') return null;
  const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

async function make(root, o) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  if (window.KT_FIT) window.KT_FIT();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const S = SIZES[o.orient];
  const W = root.offsetWidth, H = root.offsetHeight;
  const pxPerMm = W / S.w;
  const B = BLEED * pxPerMm;
  const doc = new Doc();
  this_alpha = (a) => doc.alpha(a, a);
  missing.length = 0;
  const card = await collect(root, doc, B, !!o.printColour);

  // layers
  const layerNames = [['bg', 'Background colour (printed)'], ['art', 'Illustration'], ['qr', 'QR code (vector)'], ['text', 'Text (outlined)'], ['marks', 'Crop marks']].filter(([k2]) => k2 !== 'bg' || card.L.bg.length);
  const catalog = doc.reserve(), pages = doc.reserve(), page = doc.reserve();
  const ocg = {};
  layerNames.forEach(([k2, name]) => { ocg[k2] = doc.add('<< /Type /OCG /Name (' + name + ') >>'); });
  const props = '<< ' + layerNames.map(([k2]) => '/L_' + k2 + ' ' + ocg[k2] + ' 0 R').join(' ') + ' >>';
  const inLayer = (k2, s) => (s && s.trim() ? '/OC /L_' + k2 + ' BDC\n' + s + '\nEMC\n' : '');

  // the card: one form in card px (y down), clipped to the bleed
  const cardStream = inLayer('bg', card.L.bg.join('\n')) + inLayer('art', card.L.art.join('\n')) + inLayer('qr', card.L.qr.join('\n')) + inLayer('text', card.L.text.join('\n'));
  const cardForm = doc.reserve();

  const tw = S.w * MM, th = S.h * MM, bl = BLEED * MM, s = tw / W;
  const lines = []; const mark = (x1, y1, x2, y2) => lines.push(f(x1) + ' ' + f(y1) + ' m ' + f(x2) + ' ' + f(y2) + ' l S');
  const place = (x, y) => 'q ' + f(s) + ' 0 0 ' + f(-s) + ' ' + f(x) + ' ' + f(y + th) + ' cm /Card Do Q'; // x, y = trim bottom-left
  let pw, ph, content, boxes = '';
  if (o.mode === 'home') {
    pw = 210 * MM; ph = 297 * MM;
    const cols = o.orient === 'tall' ? 1 : 2, rows = o.orient === 'tall' ? 2 : 4;
    const cw = tw + 2 * bl, ch = th + 2 * bl;
    const gw = cols * cw, gh = rows * ch, ox = (pw - gw) / 2, oy = (ph - gh) / 2 + 2 * MM;
    const cells = [], xs = [], ys = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(place(ox + c * cw + bl, oy + r * ch + bl));
    for (let c = 0; c < cols; c++) xs.push(ox + c * cw + bl, ox + c * cw + bl + tw);
    for (let r = 0; r < rows; r++) ys.push(oy + r * ch + bl, oy + r * ch + bl + th);
    const gap = 1 * MM;
    const mlX = Math.min(5 * MM, ox - gap - 4 * MM), mlY = Math.min(5 * MM, oy - gap - 4 * MM);
    xs.forEach((x) => { mark(x, oy - gap, x, oy - gap - mlY); mark(x, oy + gh + gap, x, oy + gh + gap + mlY); });
    ys.forEach((y) => { mark(ox - gap, y, ox - gap - mlX, y); mark(ox + gw + gap, y, ox + gw + gap + mlX, y); });
    const lab = await labelPaths(o.label || '', ox, oy - gap - mlY - 3.5 * MM, 7);
    content = cells.join('\n') + '\n' + inLayer('marks', 'q 0 0 0 RG 0.3 w\n' + lines.join('\n') + '\nQ\nq 0 0 0 rg\n' + lab + '\nQ');
  } else {
    const m = 12 * MM;
    pw = tw + 2 * m; ph = th + 2 * m + 6 * MM;
    const ox = m, oy = m + 6 * MM;
    const off = bl + 1 * MM, ml = 5 * MM;
    [[ox, oy], [ox + tw, oy], [ox, oy + th], [ox + tw, oy + th]].forEach(([x, y]) => {
      const sx = x === ox ? -1 : 1, sy = y === oy ? -1 : 1;
      mark(x + sx * off, y, x + sx * (off + ml), y);
      mark(x, y + sy * off, x, y + sy * (off + ml));
    });
    const lab = await labelPaths(o.label || '', ox - bl, 6 * MM, 6.5);
    content = place(ox, oy) + '\n' + inLayer('marks', 'q 0 0 0 RG 0.25 w\n' + lines.join('\n') + '\nQ\nq 0 0 0 rg\n' + lab + '\nQ');
    const bx = (a) => '[' + a.map(f).join(' ') + ']';
    boxes = ' /TrimBox ' + bx([ox, oy, ox + tw, oy + th]) + ' /BleedBox ' + bx([ox - bl, oy - bl, ox + tw + bl, oy + th + bl]);
  }

  // resources shared by the page and the card form
  const shRefs = {};
  doc.sh.forEach((x) => { shRefs[x.name] = doc.add(x.body); });
  const gsRefs = {};
  for (const v of doc.gs.values()) gsRefs[v.name] = doc.add(v.body);
  const res = '<< /ExtGState << ' + Object.keys(gsRefs).map((n) => '/' + n + ' ' + gsRefs[n] + ' 0 R').join(' ') + ' >> /Shading << ' +
    Object.keys(shRefs).map((n) => '/' + n + ' ' + shRefs[n] + ' 0 R').join(' ') + ' >> /Properties ' + props + ' /XObject << /Card ' + cardForm + ' 0 R >> >>';
  // soft-mask forms reference their gray shading by name
  doc.objs.forEach((ob, i) => { if (ob && /@SH:/.test(ob.body)) ob.body = ob.body.replace(/@SH:(\w+)/g, (_, n) => shRefs[n] + ' 0 R'); });

  doc.set(cardForm, '<< /Type /XObject /Subtype /Form /BBox [' + [-B, -B, W + B, H + B].map(f).join(' ') + '] /Resources ' + res.replace(/ \/XObject << \/Card \d+ 0 R >>/, '') + ' /Length @LEN >>', cardStream);
  const contents = doc.add('<< /Length @LEN >>', content);
  doc.set(page, '<< /Type /Page /Parent ' + pages + ' 0 R /MediaBox [0 0 ' + f(pw) + ' ' + f(ph) + ']' + boxes + ' /Resources ' + res + ' /Contents ' + contents + ' 0 R >>');
  doc.set(pages, '<< /Type /Pages /Kids [' + page + ' 0 R] /Count 1 >>');
  const ocgList = layerNames.map(([k2]) => ocg[k2] + ' 0 R').join(' ');
  doc.set(catalog, '<< /Type /Catalog /Pages ' + pages + ' 0 R /OCProperties << /OCGs [' + ocgList + '] /D << /Order [' + ocgList + '] /ON [' + ocgList + '] >> >> >>');
  const info = doc.add('<< /Title (' + String(o.title || 'Kartis card').replace(/[()\\]/g, '').replace(/[^\x20-\x7E]/g, '') + ') /Producer (Kartis) /Creator (Kartis card editor) >>');

  // serialise (streams deflated)
  const enc = new TextEncoder();
  const chunks = []; let len = 0; const offs = [];
  const push = (x) => { const u = typeof x === 'string' ? enc.encode(x) : x; chunks.push(u); len += u.length; };
  push('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n');
  for (let i = 0; i < doc.objs.length; i++) {
    const ob = doc.objs[i];
    offs[i + 1] = len;
    if (!ob) { push((i + 1) + ' 0 obj\nnull\nendobj\n'); continue; }
    if (ob.stream != null) {
      let data = enc.encode(ob.stream), filt = '';
      const z = await deflate(data);
      if (z) { data = z; filt = ' /Filter /FlateDecode'; }
      const body = ob.body.includes('@LEN') ? ob.body.replace('/Length @LEN', '/Length ' + data.length + filt) : ob.body.replace(/>>\s*$/, ' /Length ' + data.length + filt + ' >>');
      push((i + 1) + ' 0 obj\n' + body + '\nstream\n'); push(data); push('\nendstream\nendobj\n');
    } else push((i + 1) + ' 0 obj\n' + ob.body + '\nendobj\n');
  }
  const xref = len;
  let x = 'xref\n0 ' + (doc.objs.length + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i <= doc.objs.length; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  push(x + 'trailer\n<< /Size ' + (doc.objs.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  const bytes = new Uint8Array(len); let p = 0; chunks.forEach((u) => { bytes.set(u, p); p += u.length; });
  return { bytes, missing: missing.slice() };
}

if (typeof window !== 'undefined') window.KT_VECTOR = { make, sizes: SIZES, bleed: BLEED };
