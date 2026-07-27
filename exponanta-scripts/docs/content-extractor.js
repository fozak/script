//prototype v3 simple search

(async () => {
  const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers');

  const urls = [...document.querySelectorAll('.line span:not(.html-tag):not(.folder-button)')]
    .map(el => el.textContent.trim())
    .filter(t => t.startsWith('https://exponanta.com'))
    .slice(0, 200);

  console.log(`Found ${urls.length} URLs`);

  const query = "economic analysis";

  const slugToText = url => url.replace('https://exponanta.com/', '').replace(/-/g, ' ').replace(/\//g, ' ');
  const queryWords = query.toLowerCase().split(' ');

  const exactScore = url => {
    const slug = slugToText(url).toLowerCase();
    const hits = queryWords.filter(w => slug.includes(w)).length;
    return hits / queryWords.length;
  };

  const exact = urls
    .map(url => ({ url, score: exactScore(url) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (exact.length >= 5) {
    console.log('--- EXACT MATCH ---');
    exact.slice(0, 5).forEach(r => console.log(r.score.toFixed(2), r.url));
  } else {
    console.log(`Only ${exact.length} exact hits, falling back to semantic...`);

    const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const cosine = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

    const qVec = Array.from((await embed(query, { pooling: 'mean', normalize: true })).data);

    const scored = await Promise.all(urls.map(async url => {
      const vec = Array.from((await embed(slugToText(url), { pooling: 'mean', normalize: true })).data);
      return { url, score: cosine(qVec, vec) };
    }));

    console.log('--- SEMANTIC MATCH ---');
    scored.sort((a, b) => b.score - a.score)
      .filter(r => r.score > 0.35)
      .slice(0, 5)
      .forEach(r => console.log(r.score.toFixed(3), r.url));
  }
})();



// prototype v2 

(async () => {
  const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers');
  const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  const urls = [...document.querySelectorAll('.line span:not(.html-tag):not(.folder-button)')]
    .map(el => el.textContent.trim())
    .filter(t => t.startsWith('https://exponanta.com'))
    .slice(0, 200);

  console.log(`Found ${urls.length} URLs`);

  const slugToText = url => url.replace('https://exponanta.com/', '').replace(/-/g, ' ').replace(/\//g, ' ') || 'home';
  const cosine = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

  const query = "economic analysis for business decisions";
  const qVec = Array.from((await embed(query, { pooling: 'mean', normalize: true })).data);

  const scored = await Promise.all(urls.map(async url => {
    const vec = Array.from((await embed(slugToText(url), { pooling: 'mean', normalize: true })).data);
    return { url, score: cosine(qVec, vec) };
  }));

  scored.sort((a, b) => b.score - a.score).slice(0, 5).forEach(r =>
    console.log(r.score.toFixed(3), r.url)
  );
})();








// prototype NOTES app

(() => {

  // ── INDEX EXTRACTOR ───────────────────────────────────────
  const MIN_WORDS_THRESHOLD = 20;
  const MIN_SECTIONS        = 3;
  const PREVIEW_WORDS       = 100;
  const TITLE_WORDS         = 20;
  const CHUNK_WORDS         = 200;

  function toWords(text, n) {
    const words = text.split(/\s+/).filter(Boolean);
    return words.slice(0, n).join(' ') + (words.length > n ? '…' : '');
  }

  function strategyHeadings() {
    const candidates = [...document.querySelectorAll('main, article, [role="main"], #content, .content, .post, .entry')]
      .map(el => ({ el, count: el.querySelectorAll('h1,h2,h3,h4,h5,h6').length }))
      .sort((a, b) => b.count - a.count);
    const root     = candidates[0]?.el || document.body;
    const headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')];

    function sectionData(el, nextEl) {
      let node = el.nextElementSibling, text = '';
      while (node && node !== nextEl) {
        text += node.textContent + ' ';
        node  = node.nextElementSibling;
        if (text.split(/\s+/).length > PREVIEW_WORDS * 6) break;
      }
      text = text.trim();
      return { words: text.split(/\s+/).filter(Boolean).length, preview: toWords(text, PREVIEW_WORDS) };
    }

    return headings
      .map((el, i) => {
        const { words, preview } = sectionData(el, headings[i + 1] || null);
        return { slug: el.id || null, title: toWords(el.textContent.trim(), TITLE_WORDS), level: parseInt(el.tagName[1]), words, preview, strategy: 1 };
      })
      .filter(s => s.words >= MIN_WORDS_THRESHOLD && s.words < 2000);
  }

  function strategyParagraphs() {
    const pageTitle = document.title.split('|')[0].split('·')[0].split(' - ')[0].split('.')[0].trim();
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
      .filter(Boolean)
      .find(d => ['Article','NewsArticle','BlogPosting'].includes(d['@type']));
    if (ld) {
      const text = ld.articleBody || ld.description || '';
      return [{ slug: null, title: toWords(ld.headline || pageTitle, TITLE_WORDS), level: 1, words: text.split(/\s+/).filter(Boolean).length, preview: toWords(text, PREVIEW_WORDS), strategy: 2, source: 'json-ld' }];
    }
    const paras = [...document.querySelectorAll('p')].map(p => p.textContent.trim()).filter(p => p.split(/\s+/).length > 8);
    if (!paras.length) return [];
    const sections = []; let chunk = [], chunkWords = 0;
    function flushChunk() {
      if (!chunk.length) return;
      const text = chunk.join(' ').trim();
      sections.push({ slug: null, title: toWords(chunk[0].split(/[.!?]/)[0].trim(), TITLE_WORDS), level: 2, words: text.split(/\s+/).filter(Boolean).length, preview: toWords(text, PREVIEW_WORDS), strategy: 2, source: 'paragraphs' });
      chunk = []; chunkWords = 0;
    }
    paras.forEach(p => { chunk.push(p); chunkWords += p.split(/\s+/).length; if (chunkWords >= CHUNK_WORDS) flushChunk(); });
    flushChunk();
    return sections;
  }

  function isWeak(index) {
    if (index.length < MIN_SECTIONS) return true;
    return index.reduce((s, i) => s + i.words, 0) / index.length < MIN_WORDS_THRESHOLD;
  }

  let pageIndex = strategyHeadings();
  if (isWeak(pageIndex)) pageIndex = strategyParagraphs();

  const pageMeta = {
    url:        window.location.href,
    title:      toWords(document.title.split('|')[0].split('·')[0].trim(), TITLE_WORDS),
    sections:   pageIndex.length,
    totalWords: pageIndex.reduce((s, i) => s + i.words, 0),
  };

  globalThis._pageIndex = pageIndex;
  globalThis._pageMeta  = pageMeta;
  console.log('📄 Index built:', pageMeta);

  // ── SECTION HELPERS ───────────────────────────────────────
  function findPrecedingHeading(el) {
    let node = el;
    while (node && node !== document.body) {
      let sib = node.previousElementSibling;
      while (sib) { if (/^H[1-6]$/.test(sib.tagName)) return sib; sib = sib.previousElementSibling; }
      node = node.parentElement;
    }
    return null;
  }

  function findNextHeading(h) {
    const level = parseInt(h.tagName[1]);
    let node = h.nextElementSibling;
    while (node) {
      if (/^H[1-6]$/.test(node.tagName) && parseInt(node.tagName[1]) <= level) return node;
      node = node.nextElementSibling;
    }
    return null;
  }

  function getSectionHTML(start, end) {
    let html = '', node = start;
    while (node && node !== end) { html += node.outerHTML + '\n'; node = node.nextElementSibling; }
    return html;
  }

  function anchorKey(h) {
    if (!h) return null;
    return h.id ? { method: 'id', value: h.id } : { method: 'text', value: h.innerText.trim() };
  }

  // ── POPUP ─────────────────────────────────────────────────
  const popup = document.createElement('div');
  popup.innerHTML = `
    <div class="card shadow-sm" style="margin:0;width:320px;">
      <div class="card-body p-2">
        <div class="mb-2 text-muted" style="font-size:12px;">
          <i class="ti ti-section me-1"></i><span id="cw-label">—</span>
        </div>
        <textarea id="cw-prompt" class="form-control form-control-sm mb-2" rows="2" placeholder="What should AI do with this section?"></textarea>
        <div class="d-flex gap-1">
          <button id="cw-rewrite" class="btn btn-sm btn-primary flex-fill">
            <i class="ti ti-sparkles me-1"></i>Rewrite
          </button>
          <button id="cw-dismiss" class="btn btn-sm btn-ghost-secondary">
            <i class="ti ti-x"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  Object.assign(popup.style, { position: 'absolute', zIndex: 9999, display: 'none' });
  document.body.appendChild(popup);

  let current = null;

  function showPopup(x, y, section) {
    current = section;
    popup.querySelector('#cw-label').textContent = section.sectionTitle;
    popup.querySelector('#cw-prompt').value = '';
    popup.style.display = 'block';
    popup.style.left = (x + window.scrollX) + 'px';
    popup.style.top  = (y + window.scrollY + 12) + 'px';
    popup.querySelector('#cw-prompt').focus();
  }

  function hidePopup() { popup.style.display = 'none'; current = null; }

  // ── MOUSEUP ───────────────────────────────────────────────
  document.addEventListener('mouseup', (e) => {
    if (popup.contains(e.target)) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { hidePopup(); return; }

    const anchor = sel.anchorNode instanceof Text ? sel.anchorNode.parentElement : sel.anchorNode;
    const h = findPrecedingHeading(anchor);
    if (!h) { hidePopup(); return; }

    const nextH      = findNextHeading(h);
    const html       = getSectionHTML(h, nextH);
    const sectionTitle = h.innerText.trim();
    const idxFrom    = pageIndex.findIndex(s => s.title === toWords(sectionTitle, TITLE_WORDS));

    showPopup(e.clientX, e.clientY, {
      sectionTitle,
      startAnchor:  anchorKey(h),
      endAnchor:    anchorKey(nextH),
      sectionHTML:  html,
      indexFrom:    idxFrom,
    });
  });

  popup.querySelector('#cw-dismiss').addEventListener('click', hidePopup);

  // ── SAVE TODO ─────────────────────────────────────────────
  popup.querySelector('#cw-rewrite').addEventListener('click', () => {
    if (!current) return;

    const todo = {
      id:           Date.now(),
      action:       'rewrite',
      userPrompt:   popup.querySelector('#cw-prompt').value.trim() || 'Rewrite this section.',
      sectionTitle: current.sectionTitle,
      indexFrom:    current.indexFrom,
      startAnchor:  current.startAnchor,
      endAnchor:    current.endAnchor,
      sectionHTML:  current.sectionHTML,
      pageIndex,          // ← full index for AI context
      pageMeta,           // ← page meta for AI context
      url:          window.location.href,
      savedAt:      new Date().toISOString(),
    };

    const stored = JSON.parse(localStorage.getItem('cw_todos') || '[]');
    stored.push(todo);
    localStorage.setItem('cw_todos', JSON.stringify(stored));

    console.log('✅ TODO saved:', todo);
    hidePopup();
  });

})();










// separate funcitons


// identifiing section

(() => {
  document.addEventListener('mouseup', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const anchor = sel.anchorNode instanceof Text
      ? sel.anchorNode.parentElement
      : sel.anchorNode;

    function findPrecedingHeading(el) {
      let node = el;
      while (node && node !== document.body) {
        let sib = node.previousElementSibling;
        while (sib) {
          if (/^H[1-6]$/.test(sib.tagName)) return sib;
          sib = sib.previousElementSibling;
        }
        node = node.parentElement;
      }
      return null;
    }

    function findNextHeading(h) {
      const level = parseInt(h.tagName[1]);
      let node = h.nextElementSibling;
      while (node) {
        if (/^H[1-6]$/.test(node.tagName) && parseInt(node.tagName[1]) <= level) return node;
        node = node.nextElementSibling;
      }
      return null;
    }

    function getSectionHTML(start, end) {
      let html = '';
      let node = start;
      while (node && node !== end) {
        html += node.outerHTML + '\n';
        node = node.nextElementSibling;
      }
      return html;
    }

    const h = findPrecedingHeading(anchor);
    if (!h) { console.warn('No heading found for selection'); return; }

    const nextH   = findNextHeading(h);
    const html    = getSectionHTML(h, nextH);

    console.log(`📌 Section: "${h.textContent.trim()}" → next: "${nextH?.textContent.trim() ?? 'END'}"`);
    console.log(html);
  });
})();



//extracts index


(() => {
  const MIN_WORDS_THRESHOLD = 20;
  const MIN_SECTIONS        = 3;
  const PREVIEW_WORDS       = 100;
  const TITLE_WORDS         = 20;
  const CHUNK_WORDS         = 200;

  // ── shared helper ─────────────────────────────────────────
  function toWords(text, n) {
    const words = text.split(/\s+/).filter(Boolean);
    return words.slice(0, n).join(' ') + (words.length > n ? '…' : '');
  }

  // ── STRATEGY 1: heading-based traversal ──────────────────
  function strategyHeadings() {
    const candidates = [...document.querySelectorAll('main, article, [role="main"], #content, .content, .post, .entry')]
      .map(el => ({ el, count: el.querySelectorAll('h1,h2,h3,h4,h5,h6').length }))
      .sort((a, b) => b.count - a.count);
    const root     = candidates[0]?.el || document.body;
    const headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')];

    function sectionData(el, nextEl) {
      let node = el.nextElementSibling;
      let text = '';
      while (node && node !== nextEl) {
        text += node.textContent + ' ';
        node  = node.nextElementSibling;
        if (text.split(/\s+/).length > PREVIEW_WORDS * 6) break;
      }
      text = text.trim();
      const words   = text.split(/\s+/).filter(Boolean).length;
      const preview = toWords(text, PREVIEW_WORDS);
      return { words, preview };
    }

    return headings
      .map((el, i) => {
        const { words, preview } = sectionData(el, headings[i + 1] || null);
        return {
          slug:     el.id || null,
          title:    toWords(el.textContent.trim(), TITLE_WORDS),
          level:    parseInt(el.tagName[1]),
          words,
          preview,
          strategy: 1,
        };
      })
      .filter(s => s.words >= MIN_WORDS_THRESHOLD && s.words < 2000);
  }

  // ── STRATEGY 2: paragraph-block extraction (SPA fallback) ─
  function strategyParagraphs() {
    const pageTitle = document.title
      .split('|')[0].split('·')[0].split(' - ')[0].split('.')[0].trim();

    // try json-ld first
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
      .filter(Boolean)
      .find(d => ['Article', 'NewsArticle', 'BlogPosting'].includes(d['@type']));

    if (ld) {
      const text    = ld.articleBody || ld.description || '';
      const words   = text.split(/\s+/).filter(Boolean).length;
      const preview = toWords(text, PREVIEW_WORDS);
      return [{
        slug:     null,
        title:    toWords(ld.headline || pageTitle, TITLE_WORDS),
        level:    1,
        words,
        preview,
        strategy: 2,
        source:   'json-ld',
      }];
    }

    // fallback — paragraph chunking
    const paras = [...document.querySelectorAll('p')]
      .map(p => p.textContent.trim())
      .filter(p => p.split(/\s+/).length > 8);

    if (!paras.length) return [];

    const sections = [];
    let chunk      = [];
    let chunkWords = 0;
    let sectionNum = 1;

    function flushChunk() {
      if (!chunk.length) return;
      const text          = chunk.join(' ').trim();
      const words         = text.split(/\s+/).filter(Boolean).length;
      const firstSentence = chunk[0].split(/[.!?]/)[0].trim();
      sections.push({
        slug:     null,
        title:    toWords(firstSentence, TITLE_WORDS),
        level:    2,
        words,
        preview:  toWords(text, PREVIEW_WORDS),
        strategy: 2,
        source:   'paragraphs',
      });
      sectionNum++;
      chunk      = [];
      chunkWords = 0;
    }

    paras.forEach(p => {
      const w = p.split(/\s+/).length;
      chunk.push(p);
      chunkWords += w;
      if (chunkWords >= CHUNK_WORDS) flushChunk();
    });
    flushChunk();

    return sections;
  }

  // ── MEASURE strategy 1 quality ────────────────────────────
  function isWeak(index) {
    if (index.length < MIN_SECTIONS) return true;
    const avg = index.reduce((sum, s) => sum + s.words, 0) / index.length;
    return avg < MIN_WORDS_THRESHOLD;
  }

  // ── MAIN ─────────────────────────────────────────────────
  let index        = strategyHeadings();
  let usedStrategy = 1;

  if (isWeak(index)) {
    const avg = index.length
      ? Math.round(index.reduce((s, i) => s + i.words, 0) / index.length)
      : 0;
    console.log(`Strategy 1 weak (${index.length} sections, avg ${avg} words) → falling back to Strategy 2`);
    index        = strategyParagraphs();
    usedStrategy = 2;
  }

  // ── OUTPUT ───────────────────────────────────────────────
  const meta = {
    url:        window.location.href,
    title:      toWords(document.title.split('|')[0].split('·')[0].trim(), TITLE_WORDS),
    strategy:   usedStrategy,
    sections:   index.length,
    totalWords: index.reduce((s, i) => s + i.words, 0),
  };

  console.log('📄 Page meta:', meta);
  console.table(index.map(({ slug, title, level, words, strategy, source }) =>
    ({ slug, title, level, words, strategy, source })));
  console.log('Full index with previews:', index);

  globalThis._pageIndex = index;
  globalThis._pageMeta  = meta;
  return { meta, index };
})();