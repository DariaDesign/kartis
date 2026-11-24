// A small runtime that renders the canvas's .dc.html artboards with React,
// so the live site uses the exact files designed on the Kartis canvas.
import React from 'react';
import { navigate, routeFor } from '../router.js';
import { translate, currentLang } from '../i18n.js';

// /_blob/<id> uploads on the canvas -> files shipped with the site
export const BLOBS = {
  f7704579ab4aaf9c1946b8a6d22b25d6: '/assets/gymnopedie-1.mp4',
  cfe5b25633c958c1ee331ab8fd728cdc: '/assets/mist.svg',
  '6992beac7ab56f30cc65e48b199ccef6': '/assets/qr-sample.svg',
  '801340ae3f3dac1ec6614fc2f706ebc7': '/assets/Gloock-Regular.woff2',
  '057964666946031b4bde62cd34cdbfd4': '/assets/MrsSaintDelafield-Regular.woff2',
  '4517282e3c951dffb2254da909abf3fc': '/assets/InstrumentSerif-Regular.woff2',
  '4303ac869783c2c93c1f89e93ec191b5': '/assets/InstrumentSerif-Italic.woff2',
  '76568820281ed1438891850a28250c40': '/assets/InstrumentSans-VF.woff2',
  '4950f4b1a4af5aa7ff7373d68e174c91': '/assets/BodoniModa-VF.woff2',
  '7c5b7080ed89cff1ab5dbe01a6287a1c': '/assets/BodoniModa-Italic-VF.woff2',
  e2554336e7db464da4ea630b7a44d051: '/assets/Geist-VF.woff2',
  '9ec12f4da7491986ba3e511904e926c1': '/assets/Fraunces-VF.woff2',
  '29825b105c28e84a18bca5f538317fb4': '/assets/Fraunces-Italic-VF.woff2',
  fbfd3cf4f9bdc3bfaa6bd57e34d75d13: '/assets/Jost-VF.woff2'
};
export const blobUrl = (id) => BLOBS[id] || '/_blob/' + id;
const fixBlobs = (s) => s.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => BLOBS[id] || m);

const registry = {};
let tr = translate; // switched off while a card renders: card text is the user's own
const helmetDone = new Set();

const EVENTS = {};
['click', 'change', 'input', 'submit', 'keydown', 'keyup', 'focus', 'blur', 'mouseenter', 'mouseleave', 'pointerdown', 'pointerup', 'scroll', 'load', 'error', 'ended']
  .forEach((e) => { EVENTS['on' + e] = 'on' + e.charAt(0).toUpperCase() + e.slice(1).replace('down', 'Down').replace('up', 'Up').replace('enter', 'Enter').replace('leave', 'Leave'); });
EVENTS.onkeydown = 'onKeyDown'; EVENTS.onkeyup = 'onKeyUp'; EVENTS.onmouseenter = 'onMouseEnter'; EVENTS.onmouseleave = 'onMouseLeave';
EVENTS.onpointerdown = 'onPointerDown'; EVENTS.onpointerup = 'onPointerUp';

const ATTR = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', autocomplete: 'autoComplete', novalidate: 'noValidate', 'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace', crossorigin: 'crossOrigin', srcset: 'srcSet', colspan: 'colSpan', rowspan: 'rowSpan', 'accept-charset': 'acceptCharset', autoplay: 'autoPlay', playsinline: 'playsInline' };
const camel = (s) => s.replace(/-([a-z])/g, (m, c) => c.toUpperCase());

function parseStyle(str) {
  const out = {};
  let depth = 0, quote = null, cur = '';
  const parts = [];
  for (const ch of str) {
    if (quote) { if (ch === quote) quote = null; cur += ch; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  parts.forEach((p) => {
    const i = p.indexOf(':');
    if (i < 0) return;
    const k = p.slice(0, i).trim(), v = p.slice(i + 1).trim();
    if (!k || v === '') return;
    out[k.startsWith('--') ? k : camel(k.replace(/^-webkit-/, 'webkit-').replace(/^-ms-/, 'ms-'))] = v;
  });
  return out;
}

function lookup(ctx, path) {
  path = path.trim();
  if (path === 'true') return true;
  if (path === 'false') return false;
  if (path === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
  if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}
const WHOLE = /^\s*\{\{([^}]*)\}\}\s*$/;
const interp = (s, ctx) => s.replace(/\{\{([^}]*)\}\}/g, (m, p) => { const v = lookup(ctx, p); return v == null || typeof v === 'function' ? '' : String(v); });
const attrVal = (s, ctx) => { const m = WHOLE.exec(s); return m ? lookup(ctx, m[1]) : interp(s, ctx); };

function toTree(node) {
  if (node.nodeType === 3) return { t: 'x', v: node.nodeValue };
  if (node.nodeType !== 1) return null;
  const svg = node.namespaceURI === 'http://www.w3.org/2000/svg';
  // SVG tags are case-sensitive (linearGradient, clipPath, feGaussianBlur...)
  const tag = svg ? node.localName : node.tagName.toLowerCase();
  const kids = node.tagName === 'TEMPLATE' ? node.content.childNodes : node.childNodes;
  return { t: 'e', tag, svg, a: Array.from(node.attributes).map((x) => [x.name, x.value]), c: Array.from(kids).map(toTree).filter(Boolean) };
}

function renderNodes(nodes, ctx, keyBase) {
  const out = [];
  nodes.forEach((n, i) => {
    const r = renderNode(n, ctx, keyBase + '.' + i);
    if (Array.isArray(r)) out.push(...r); else if (r != null && r !== '') out.push(r);
  });
  return out;
}

function renderNode(n, ctx, key) {
  if (n.t === 'x') {
    if (!/\S/.test(n.v)) return n.v.includes('\n') ? null : n.v;
    return tr(interp(n.v, ctx));
  }
  const get = (name) => { const a = n.a.find((x) => x[0] === name); return a ? a[1] : undefined; };
  if (n.tag === 'sc-if') {
    return attrVal(get('value') || '', ctx) ? renderNodes(n.c, ctx, key) : null;
  }
  if (n.tag === 'sc-for') {
    const list = attrVal(get('list') || '', ctx) || [];
    const as = get('as') || 'item';
    return list.map((item, idx) => {
      const c = Object.create(ctx); c[as] = item; c.$index = idx;
      return <React.Fragment key={key + ':' + idx}>{renderNodes(n.c, c, key + ':' + idx)}</React.Fragment>;
    });
  }
  if (n.tag === 'dc-import') {
    const Comp = registry[get('name')];
    if (!Comp) return null;
    const props = {};
    n.a.forEach(([k, v]) => { if (k === 'name' || k.startsWith('hint-')) return; props[camel(k)] = attrVal(v, ctx); });
    return <Comp key={key} {...props} />;
  }
  if (n.tag === 'helmet') return null;
  const props = { key };
  n.a.forEach(([k, v]) => {
    if (EVENTS[k] || /^on[a-z]+$/.test(k)) { const f = attrVal(v, ctx); if (typeof f === 'function') props[EVENTS[k] || ('on' + k.charAt(2).toUpperCase() + k.slice(3))] = f; return; }
    let val = attrVal(v, ctx);
    if (k === 'style') { props.style = parseStyle(String(val)); return; }
    if (k === 'href' && typeof val === 'string' && /\.dc\.html(#.*)?$/.test(val)) {
      const to = routeFor(val);
      const prev = props.onClick;
      props.href = to;
      props.onClick = (e) => { if (prev) prev(e); if (e.defaultPrevented || e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate(to); };
      return;
    }
    if (k === 'placeholder' || k === 'aria-label' || k === 'title' || k === 'alt') val = tr(String(val));
    if (k === 'value' && (n.tag === 'input' || n.tag === 'textarea')) { props.value = val == null ? '' : val; if (!n.a.some((x) => x[0] === 'onchange')) props.readOnly = true; return; }
    const name = ATTR[k] || (k.startsWith('aria-') || k.startsWith('data-') ? k : (n.svg || k.includes('-') ? camel(k) : k));
    if (typeof val === 'boolean' && (k.startsWith('aria-') || k.startsWith('data-'))) val = String(val);
    props[name] = val;
  });
  if (props.onClick && props.href === undefined && n.tag === 'a') props.href = '#';
  const kids = renderNodes(n.c, ctx, key);
  if (n.tag === 'input' || n.tag === 'img' || n.tag === 'br' || n.tag === 'hr' || n.tag === 'meta' || n.tag === 'link') return React.createElement(n.tag, props);
  return React.createElement(n.tag, props, ...kids);
}

function injectHelmet(name, html) {
  if (helmetDone.has(name)) return;
  helmetDone.add(name);
  // Already in the page when it was written at build time
  if (document.head.querySelector('[data-dc="' + name + '"]')) return;
  const box = document.createElement('div');
  box.innerHTML = fixBlobs(html);
  Array.from(box.children).forEach((el) => {
    if (el.tagName === 'LINK' && document.querySelector('link[href="' + el.getAttribute('href') + '"]')) return;
    const n = document.createElement(el.tagName);
    Array.from(el.attributes).forEach((a) => n.setAttribute(a.name, a.value));
    n.textContent = el.textContent;
    n.setAttribute('data-dc', name);
    document.head.appendChild(n);
  });
}

// Register one .dc.html file as a React component
export function defineDC(name, source, opts = {}) {
  source = fixBlobs(source);
  const body = source.split('<x-dc>')[1].split('</x-dc>')[0];
  const helmet = (body.match(/<helmet>([\s\S]*?)<\/helmet>/) || [])[1] || '';
  // Fonts come from /assets/fonts-intl.css (self-hosted), so the canvas's Google Fonts links are dropped
  const helmetLocal = helmet.replace(/<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g, '');
  const markup = body.replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  const scriptMatch = source.match(/<script type="text\/x-dc"[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/);
  const code = scriptMatch ? scriptMatch[1] : 'class Component extends DCLogic { renderVals() { return {}; } }';
  let tree = null;
  const getTree = () => {
    if (!tree) {
      const tpl = document.createElement('template');
      tpl.innerHTML = markup.trim();
      tree = Array.from(tpl.content.childNodes).map(toTree).filter(Boolean);
    }
    return tree;
  };
  class DCLogic extends React.Component {
    constructor(p) { super(p); this.state = {}; }
    render() {
      injectHelmet(name, helmetLocal);
      const vals = this.renderVals ? this.renderVals() : {};
      const prev = tr; tr = opts.translate === false ? (x) => x : translate;
      try {
        const kids = renderNodes(getTree(), vals || {}, name);
        return opts.dir ? <div dir={opts.dir} style={{ display: 'contents' }}>{kids}</div> : <>{kids}</>;
      } finally { tr = prev; }
    }
  }
  const Component = new Function('DCLogic', code + '\n;return Component;')(DCLogic);
  Component.displayName = name;
  registry[name] = Component;
  return Component;
}

export { currentLang };
