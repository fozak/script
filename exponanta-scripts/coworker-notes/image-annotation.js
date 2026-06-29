(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  const KEY     = 'cw_annotations:' + location.hostname + location.pathname;
  const TOGGLE  = e => e.altKey && e.key === 'a';
  const PIN_CSS = `position:fixed;z-index:2147483647;pointer-events:auto;user-select:none;`;

  // ── State ────────────────────────────────────────────────────────────────────
  let data = JSON.parse(localStorage.getItem(KEY) || '[]');
  let mode = false;
  const cleanups = new Map(); // id → [removeListener fns]

  // ── Persist ──────────────────────────────────────────────────────────────────
  const save = () => localStorage.setItem(KEY, JSON.stringify(data));

  const remove = (id) => {
    data = data.filter(a => a.id !== id);
    save();
    (cleanups.get(id) || []).forEach(fn => fn());
    cleanups.delete(id);
    document.querySelectorAll(`[data-ann="${id}"]`).forEach(el => el.remove());
  };

  // ── Selector waterfall ───────────────────────────────────────────────────────
  function bestSelector(el) {
    if (el.id)                    return '#' + CSS.escape(el.id);
    if (el.dataset.cwPath)        return `[data-cw-path="${el.dataset.cwPath}"]`;
    const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
    const base = src.split('/').pop().split('?')[0];
    if (base && document.querySelectorAll(`[src*="${base}"]`).length === 1)
                                  return `[src*="${CSS.escape(base)}"]`;
    if (el.getAttribute('alt'))   return `img[alt="${CSS.escape(el.getAttribute('alt'))}"]`;
    // semantic + stable classes (skip utility/state classes)
    const cls = [...el.classList].filter(c => !/active|open|hover|visible|show|hide|selected/.test(c));
    if (cls.length) {
      const sel = el.tagName.toLowerCase() + '.' + cls.join('.');
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    // nth-child path (up to 4 levels)
    const parts = [];
    let node = el;
    for (let i = 0; i < 4 && node && node !== document.body; i++) {
      const tag = node.tagName.toLowerCase();
      const idx = [...(node.parentNode?.children || [])].indexOf(node) + 1;
      parts.unshift(`${tag}:nth-child(${idx})`);
      node = node.parentNode;
    }
    return parts.join(' > ');
  }

  function resolveEl(ann) {
    try { const el = document.querySelector(ann.selector); if (el) return el; } catch(_) {}
    // fallback: src fragment
    if (ann.fallback) {
      const found = [...document.querySelectorAll('img,video,canvas')]
        .find(el => (el.src || '').includes(ann.fallback));
      if (found) return found;
    }
    return null;
  }

  // ── Note bubble ──────────────────────────────────────────────────────────────
  function makeBubble(id, note, getPos) {
    const bubble = document.createElement('div');
    bubble.dataset.ann = id;
    bubble.style.cssText = PIN_CSS + `
      background:#1a1a1a;color:#fff;font:12px/1.4 system-ui,sans-serif;
      padding:6px 10px;border-radius:6px;max-width:220px;word-wrap:break-word;
      box-shadow:0 3px 10px rgba(0,0,0,.45);cursor:pointer;
    `;
    bubble.textContent = note;
    document.body.appendChild(bubble);

    const pos = () => {
      const [x, y] = getPos();
      bubble.style.left = Math.min(x, window.innerWidth  - bubble.offsetWidth  - 8) + 'px';
      bubble.style.top  = Math.min(y, window.innerHeight - bubble.offsetHeight - 8) + 'px';
    };

    pos();
    const onScroll = () => pos();
    const onResize = () => pos();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onResize, {passive: true});

    bubble.onclick = e => {
      e.stopPropagation();
      const n = prompt('Edit note (blank = delete):', note);
      if (n === null) return;
      if (n.trim() === '') { remove(id); return; }
      const ann = data.find(a => a.id === id);
      if (ann) { ann.note = n.trim(); save(); }
      bubble.textContent = n.trim();
      note = n.trim();
    };

    return { bubble, cleanup: () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      bubble.remove();
    }};
  }

  // ── TEXT annotation ──────────────────────────────────────────────────────────
  function highlightRange(range, id, note) {
    const mark = document.createElement('mark');
    mark.dataset.ann = id;
    mark.style.cssText = 'background:rgba(255,220,0,0.45);border-radius:2px;';
    try { range.surroundContents(mark); } catch(_) { return false; }

    // bubble positioned just below the mark
    const { bubble, cleanup } = makeBubble(id, note, () => {
      const r = mark.getBoundingClientRect();
      return [r.left, r.bottom + 6];
    });

    cleanups.set(id, [cleanup, () => mark.replaceWith(...mark.childNodes)]);
    return true;
  }

  function findByQuote(quote) {
    const body = document.body.innerText;
    const pi   = body.indexOf(quote.prefix);
    const start = pi !== -1 ? pi + quote.prefix.length : body.indexOf(quote.exact);
    if (start === -1) return null;
    const end = start + quote.exact.length;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let chars = 0, sn, en, so, eo, node;
    while (node = walker.nextNode()) {
      const len = node.length;
      if (!sn && chars + len > start)  { sn = node; so = start - chars; }
      if (sn  && chars + len >= end)   { en = node; eo = end   - chars; break; }
      chars += len;
    }
    if (!sn || !en) return null;
    const r = document.createRange();
    r.setStart(sn, so); r.setEnd(en, eo);
    return r;
  }

  // ── IMAGE / AREA annotation ──────────────────────────────────────────────────
  function placePin(el, ann) {
    const pin = document.createElement('div');
    pin.dataset.ann = ann.id;
    pin.style.cssText = PIN_CSS + `
      width:20px;height:20px;border-radius:50%;
      background:#e53935;color:#fff;font:bold 12px system-ui;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,.5);
    `;
    pin.textContent = '●';
    document.body.appendChild(pin);

    const getPos = () => {
      const r = el.getBoundingClientRect();
      return [r.left + r.width * ann.offset.x, r.top + r.height * ann.offset.y];
    };

    const posPin = () => {
      const [x, y] = getPos();
      pin.style.left = (x - 10) + 'px';
      pin.style.top  = (y - 10) + 'px';
    };

    posPin();
    const ro = new ResizeObserver(posPin);
    ro.observe(el);
    window.addEventListener('scroll', posPin, {passive: true});
    window.addEventListener('resize', posPin, {passive: true});

    const { bubble, cleanup: bubbleCleanup } = makeBubble(ann.id, ann.note, () => {
      const [x, y] = getPos();
      return [x + 14, y + 14];
    });
    bubble.style.display = 'none';

pin.onclick = e => {
      e.stopPropagation();
      const n = prompt('Edit note (blank = delete):', ann.note);
      if (n === null) return;
      if (n.trim() === '') { remove(ann.id); return; }
      ann.note = n.trim();
      save();
      bubble.textContent = n.trim();
      bubble.style.display = bubble.style.display === 'none' ? '' : 'none';
    };

    const pinCleanup = () => {
      ro.disconnect();
      window.removeEventListener('scroll', posPin);
      window.removeEventListener('resize', posPin);
      pin.remove();
    };

    cleanups.set(ann.id, [pinCleanup, bubbleCleanup]);
  }

  // ── Restore ──────────────────────────────────────────────────────────────────
  function restore() {
    data.forEach(ann => {
      if (ann.type === 'text') {
        const r = findByQuote(ann.quote);
        if (r) highlightRange(r, ann.id, ann.note);
        else   console.warn('[annotator] orphan text:', ann.quote.exact.slice(0, 40));
      } else {
        const el = resolveEl(ann);
        if (el) placePin(el, ann);
        else    console.warn('[annotator] orphan element:', ann.selector);
      }
    });
  }

  // ── Create ───────────────────────────────────────────────────────────────────
  document.addEventListener('mouseup', e => {
    if (!mode) return;

    // TEXT
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) {
      const note = prompt('Annotate selection:');
      if (!note) return;
      const range = sel.getRangeAt(0);
      const exact = sel.toString();
      const body  = document.body.innerText;
      const pos   = body.indexOf(exact);
      const prefix = body.substring(Math.max(0, pos - 32), pos);
      const suffix = body.substring(pos + exact.length, pos + exact.length + 32);
      const id = crypto.randomUUID();
      const ann = { id, type: 'text', note, quote: { exact, prefix, suffix },
                    selector: bestSelector(range.commonAncestorContainer.nodeType === 3
                      ? range.commonAncestorContainer.parentElement
                      : range.commonAncestorContainer) };
      data.push(ann); save();
      highlightRange(range.cloneRange(), id, note);
      sel.removeAllRanges();
      return;
    }

    // IMAGE / AREA
    const el = e.target.closest('[id],[data-cw-path],img,canvas,video,svg,section,article,main,header,footer,div,span') || e.target;
    const note = prompt('Annotate this element:');
    if (!note) return;
    const r = el.getBoundingClientRect();
    const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
    const base = src.split('/').pop().split('?')[0];
    const ann = {
      id: crypto.randomUUID(),
      type: el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'CANVAS' ? 'image' : 'area',
      note,
      selector: bestSelector(el),
      fallback: base || null,
      offset: { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    };
    data.push(ann); save();
    placePin(el, ann);
  }, true);

  // ── Toggle ───────────────────────────────────────────────────────────────────
  window.addEventListener('keydown', e => {
    if (!TOGGLE(e)) return;
    mode = !mode;
    document.body.style.outline = mode ? '2px solid #e53935' : '';
    console.log('[annotator]', mode ? 'ON — select text or click element' : 'OFF');
  });

  // ── Public API ───────────────────────────────────────────────────────────────
  window._ann = {
    list:  () => console.table(data),
    clear: () => { data.forEach(a => remove(a.id)); console.log('[annotator] cleared'); },
    export: () => JSON.stringify(data, null, 2),
  };

  restore();
  console.log('[annotator] ready — Alt+A to toggle');
})();