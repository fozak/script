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
      .filter(s => s.words > 0 && s.words < 2000);
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