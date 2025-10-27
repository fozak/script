
// https://claude.ai/chat/efacbb23-6baf-4a02-b1f1-de13be90046b
//first time visit

(async function() {
  const CONFIG = { MAX: 2000, MIN: 100, EXCLUDE: ['script', 'style', 'nav', 'header', 'footer'] };
  
  const container = document.querySelector('main') || document.body;
  console.log(`📦 First Visit - Container: <${container.tagName}>, ${container.innerText.length} chars\n`);
  
  function cleanFingerprint(text) {
    return text.slice(0, 40).replace(/\d+[\.,]?\d*/g, '').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
  }
  
  function getSelector(el) {
    if (el.id) return `#${el.id}`;
    let path = [];
    while (el && el !== container) {
      const tag = el.tagName.toLowerCase();
      const siblings = Array.from(el.parentElement?.children || []).filter(s => s.tagName === el.tagName);
      const idx = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(el) + 1})` : '';
      path.unshift(tag + idx);
      el = el.parentElement;
    }
    return path.join(' > ');
  }
  
  function split(el, depth = 0) {
    if (CONFIG.EXCLUDE.includes(el.tagName.toLowerCase())) return [];
    const text = el.innerText?.trim() || '';
    if (text.length < CONFIG.MIN) return [];
    if (text.length <= CONFIG.MAX) return [{ el, text, len: text.length, depth, sel: getSelector(el) }];
    return Array.from(el.children).flatMap(c => split(c, depth + 1));
  }
  
  async function hash(txt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }
  
  const chunks = split(container);
  console.log(`✂️  Found ${chunks.length} chunks\n`);
  
  const processed = await Promise.all(chunks.map(async (c, i) => ({
    id: `chunk-${i}`,
    selector: c.sel,
    fingerprint: cleanFingerprint(c.text),
    hash: await hash(c.text),
    text: c.text,
    length: c.len,
    depth: c.depth
  })));
  
  console.table(processed.map((c, i) => ({
    num: i + 1,
    chars: c.length,
    fingerprint: c.fingerprint,
    selector: c.selector.slice(0, 35),
    preview: c.text.slice(0, 40)
  })));
  
  const avg = processed.reduce((s, c) => s + c.length, 0) / processed.length;
  console.log(`\n📊 Stats: ${processed.length} chunks, avg ${avg.toFixed(0)} chars\n`);
  
  // Save to localStorage
  const storageKey = 'pageChunks_' + btoa(location.href).slice(0, 50);
  const data = {
    url: location.href,
    timestamp: Date.now(),
    chunks: processed.map(c => ({
      selector: c.selector,
      fingerprint: c.fingerprint,
      hash: c.hash,
      length: c.length
    }))
  };
  
  localStorage.setItem(storageKey, JSON.stringify(data));
  
  console.log('💾 Saved to localStorage');
  console.log(`   Key: ${storageKey}`);
  console.log(`   Data: ${JSON.stringify(data).length} bytes\n`);
  console.log('✅ First visit complete - refresh page to test comparison');
})();


// Repeatable visit
(async function() {
  const CONFIG = { MAX: 2000, MIN: 100, EXCLUDE: ['script', 'style', 'nav', 'header', 'footer'] };
  
  const container = document.querySelector('main') || document.body;
  const storageKey = 'pageChunks_' + btoa(location.href).slice(0, 50);
  
  console.log('🔄 COMPARISON MODE\n' + '═'.repeat(80));
  
  function cleanFingerprint(text) {
    return text.slice(0, 40).replace(/\d+[\.,]?\d*/g, '').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
  }
  
  function getSelector(el) {
    if (el.id) return `#${el.id}`;
    let path = [];
    while (el && el !== container) {
      const tag = el.tagName.toLowerCase();
      const siblings = Array.from(el.parentElement?.children || []).filter(s => s.tagName === el.tagName);
      const idx = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(el) + 1})` : '';
      path.unshift(tag + idx);
      el = el.parentElement;
    }
    return path.join(' > ');
  }
  
  function split(el, depth = 0) {
    if (CONFIG.EXCLUDE.includes(el.tagName.toLowerCase())) return [];
    const text = el.innerText?.trim() || '';
    if (text.length < CONFIG.MIN) return [];
    if (text.length <= CONFIG.MAX) return [{ el, text, len: text.length, depth, sel: getSelector(el) }];
    return Array.from(el.children).flatMap(c => split(c, depth + 1));
  }
  
  async function hash(txt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }
  
  // Load previous data
  const stored = localStorage.getItem(storageKey);
  if (!stored) {
    console.log('❌ No previous visit found. Run first-visit code first.\n');
    return;
  }
  
  const oldData = JSON.parse(stored);
  console.log(`📅 Previous visit: ${new Date(oldData.timestamp).toLocaleString()}`);
  console.log(`📦 Previous chunks: ${oldData.chunks.length}\n`);
  
  // Extract current chunks
  const chunks = split(container);
  const current = await Promise.all(chunks.map(async (c, i) => ({
    selector: c.sel,
    fingerprint: cleanFingerprint(c.text),
    hash: await hash(c.text),
    text: c.text,
    length: c.len
  })));
  
  console.log(`📦 Current chunks: ${current.length}\n`);
  
  // Match chunks
  const matched = [], added = [], removed = [], modified = [];
  const oldUsed = new Set();
  
  for (let curr of current) {
    // Try selector match first
    let old = oldData.chunks.find(o => o.selector === curr.selector && !oldUsed.has(o));
    
    // Fallback: fingerprint match
    if (!old) {
      old = oldData.chunks.find(o => o.fingerprint === curr.fingerprint && !oldUsed.has(o));
    }
    
    if (old) {
      oldUsed.add(old);
      if (old.hash === curr.hash) {
        matched.push({ selector: curr.selector, fingerprint: curr.fingerprint });
      } else {
        modified.push({ 
          selector: curr.selector, 
          fingerprint: curr.fingerprint,
          oldHash: old.hash,
          newHash: curr.hash,
          oldLen: old.length,
          newLen: curr.length,
          text: curr.text
        });
      }
    } else {
      added.push({ selector: curr.selector, fingerprint: curr.fingerprint, text: curr.text, length: curr.length });
    }
  }
  
  // Find removed
  oldData.chunks.forEach(old => {
    if (!oldUsed.has(old)) {
      removed.push({ selector: old.selector, fingerprint: old.fingerprint, length: old.length });
    }
  });
  
  // Display results
  console.log('📊 COMPARISON RESULTS\n' + '─'.repeat(80));
  console.log(`✅ Unchanged: ${matched.length}`);
  console.log(`✏️  Modified: ${modified.length}`);
  console.log(`➕ Added: ${added.length}`);
  console.log(`➖ Removed: ${removed.length}\n`);
  
  if (modified.length > 0) {
    console.log('✏️  MODIFIED CHUNKS:\n');
    console.table(modified.map((m, i) => ({
      num: i + 1,
      fingerprint: m.fingerprint,
      selector: m.selector.slice(0, 35),
      change: `${m.oldLen}→${m.newLen} chars`,
      preview: m.text.slice(0, 50)
    })));
  }
  
  if (added.length > 0) {
    console.log('➕ ADDED CHUNKS:\n');
    console.table(added.map((a, i) => ({
      num: i + 1,
      fingerprint: a.fingerprint,
      chars: a.length,
      preview: a.text.slice(0, 50)
    })));
  }
  
  if (removed.length > 0) {
    console.log('➖ REMOVED CHUNKS:\n');
    console.table(removed.map((r, i) => ({
      num: i + 1,
      fingerprint: r.fingerprint,
      selector: r.selector.slice(0, 35),
      chars: r.length
    })));
  }
  
  // Save current state
  localStorage.setItem(storageKey, JSON.stringify({
    url: location.href,
    timestamp: Date.now(),
    chunks: current.map(c => ({ selector: c.selector, fingerprint: c.fingerprint, hash: c.hash, length: c.length }))
  }));
  
  console.log('\n💾 Current state saved to localStorage');
  console.log('═'.repeat(80));
  
  // Store for AI processing
  window.pageChanges = { matched, modified, added, removed };
  console.log('\n💡 Access results: window.pageChanges');
  console.log('   Modified chunks ready for AI: pageChanges.modified');
})();

