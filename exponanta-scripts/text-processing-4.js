(async function() {
  const CONFIG = { MAX: 2000, MIN: 100, EXCLUDE: ['script','noscript' ,'style', 'nav', 'header', 'footer'] };
  
  const container = document.querySelector('main') || document.body;
  const originalText = container.innerText?.trim() || '';
  const originalLength = originalText.length;
  
  console.log(`📦 Container: <${container.tagName}>, ${originalLength} chars\n`);
  
  const chunkedElements = new Set();
  
  function cleanFingerprint(text) {
    return text
      .slice(0, 50)
      .replace(/\s+/g, ' ')
      .trim();
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
  
  function splitLargeText(el, text) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let buffer = '';
    
    for (const sentence of sentences) {
      if ((buffer + sentence).length > CONFIG.MAX && buffer.length >= CONFIG.MIN) {
        chunks.push({
          el,
          text: buffer.trim(),
          len: buffer.trim().length,
          depth: -1,
          sel: getSelector(el) + ' [artificial]'
        });
        buffer = sentence;
      } else {
        buffer += sentence;
      }
    }
    
    if (buffer.trim().length >= CONFIG.MIN) {
      chunks.push({ 
        el, 
        text: buffer.trim(), 
        len: buffer.trim().length, 
        depth: -1, 
        sel: getSelector(el) + ' [artificial]' 
      });
    } else if (chunks.length === 0 && text.length >= CONFIG.MIN) {
      chunks.push({ el, text, len: text.length, depth: -1, sel: getSelector(el) + ' [fallback]' });
    }
    
    return chunks;
  }
  
  function split(el, depth = 0) {
    if (chunkedElements.has(el)) return [];
    
    if (CONFIG.EXCLUDE.includes(el.tagName.toLowerCase())) return [];
    
    const text = el.innerText?.trim() || '';
    if (text.length < CONFIG.MIN) return [];
    
    if (text.length >= CONFIG.MIN && text.length <= CONFIG.MAX) {
      chunkedElements.add(el);
      return [{ el, text, len: text.length, depth, sel: getSelector(el) }];
    }
    
    if (text.length > CONFIG.MAX && el.children.length > 0) {
      const childChunks = Array.from(el.children).flatMap(c => split(c, depth + 1));
      
      if (childChunks.length > 0) {
        const coveredLength = childChunks.reduce((sum, c) => sum + c.len, 0);
        const coverage = coveredLength / text.length;
        
        if (coverage > 0.7) {
          return childChunks;
        }
      }
      
      const artificialChunks = splitLargeText(el, text);
      artificialChunks.forEach(c => chunkedElements.add(c.el));
      return artificialChunks;
    }
    
    const artificialChunks = splitLargeText(el, text);
    artificialChunks.forEach(c => chunkedElements.add(c.el));
    return artificialChunks;
  }
  
  const chunks = split(container);
  console.log(`✂️  Found ${chunks.length} chunks\n`);
  
  // ============ DEBUGGING: Check for overlaps ============
  console.log('🔍 Checking for overlaps...\n');
  
  const chunkTexts = chunks.map(c => c.text);
  let overlapFound = false;
  
  for (let i = 0; i < chunkTexts.length; i++) {
    for (let j = i + 1; j < chunkTexts.length; j++) {
      const text1 = chunkTexts[i];
      const text2 = chunkTexts[j];
      
      if (text1.includes(text2) || text2.includes(text1)) {
        console.warn(`⚠️  OVERLAP DETECTED:`);
        console.warn(`   Chunk ${i + 1} (${text1.length} chars): "${text1.slice(0, 50)}..."`);
        console.warn(`   Chunk ${j + 1} (${text2.length} chars): "${text2.slice(0, 50)}..."`);
        console.warn('');
        overlapFound = true;
      }
    }
  }
  
  if (!overlapFound) {
    console.log('✅ No overlaps detected\n');
  }
  
  // ============ Use Fingerprinter.hash instead of local hash ============
  
  // Verify Fingerprinter is available
  if (typeof Fingerprinter === 'undefined') {
    console.error('❌ Fingerprinter class not found! Please load it first.');
    return;
  }
  
  const processed = await Promise.all(chunks.map(async (c, i) => ({
    id: `chunk-${i}`,
    selector: c.sel,
    fingerprint: cleanFingerprint(c.text),
    hash: await Fingerprinter.hash(c.text),  // ← Using Base32 fingerprint (15 chars)
    text: c.text,
    length: c.len,
    depth: c.depth
  })));
  
  console.table(processed.map((c, i) => ({
    num: i + 1,
    chars: c.length,
    depth: c.depth,
    hash: c.hash,  // ← Show hash in table
    fingerprint: c.fingerprint,
    selector: c.selector.slice(0, 40),
    preview: c.text.slice(0, 40)
  })));
  
  const totalChunkChars = processed.reduce((s, c) => s + c.length, 0);
  const avg = totalChunkChars / processed.length;
  
  console.log(`\n📊 Stats:`);
  console.log(`   Chunks: ${processed.length}`);
  console.log(`   Avg size: ${avg.toFixed(0)} chars`);
  console.log(`\n🧮 Validation:`);
  console.log(`   Original container: ${originalLength.toLocaleString()} chars`);
  console.log(`   Sum of chunks:      ${totalChunkChars.toLocaleString()} chars`);
  console.log(`   Difference:         ${(totalChunkChars - originalLength).toLocaleString()} chars`);
  console.log(`   Coverage:           ${((totalChunkChars / originalLength) * 100).toFixed(2)}%`);
  
  if (totalChunkChars > originalLength) {
    console.warn(`⚠️  Coverage > 100% - duplicate content detected!`);
  } else if (Math.abs(originalLength - totalChunkChars) / originalLength > 0.1) {
    console.warn(`⚠️  Coverage < 90% - some text may be lost!`);
  } else {
    console.log(`✅ Good coverage!`);
  }
  
  const storageKey = 'pageChunks_' + btoa(location.href).slice(0, 50);
  const data = {
    url: location.href,
    timestamp: Date.now(),
    originalLength: originalLength,
    chunks: processed.map(c => ({
      selector: c.selector,
      fingerprint: c.fingerprint,
      hash: c.hash,  // ← Now 15-char Base32
      length: c.length
    }))
  };
  
  localStorage.setItem(storageKey, JSON.stringify(data));
  
  console.log(`\n💾 Saved to localStorage`);
  console.log(`   Key: ${storageKey}`);
  console.log(`   Data: ${JSON.stringify(data).length} bytes`);
  console.log(`   Hash format: Base32 lowercase (15 chars, 75 bits)\n`);
})();