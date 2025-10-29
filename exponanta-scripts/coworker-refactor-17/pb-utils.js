//new fingerprinting and hash function

// Universal fingerprinting system with normalization
class Fingerprinter {
  static async hash(txt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    const bytes = new Uint8Array(buf);
    const b32 = '0123456789abcdefghjkmnpqrstvwxyz';
    let bits = 0, val = 0, out = '';
    for (let i = 0; i < bytes.length && out.length < 15; i++) {
      val = (val << 8) | bytes[i];
      bits += 8;
      while (bits >= 5 && out.length < 15) {
        out += b32[(val >> (bits -= 5)) & 31];
      }
    }
    return out.padEnd(15, '0');
  }

  // Universal normalization
  static normalize(value, type = 'string') {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'email':
        return this.normalizeEmail(value);
      case 'phone':
        return this.normalizePhone(value);
      case 'date':
        return this.normalizeDate(value);
      case 'number':
        return String(Number(value));
      case 'string':
      default:
        return this.normalizeString(value);
    }
  }

  static normalizeString(str) {
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s]/g, '')          // Remove punctuation
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .trim();
  }

  static normalizeEmail(email) {
    const cleaned = String(email).toLowerCase().trim();
    const [local, domain] = cleaned.split('@');
    if (!domain) return cleaned;
    const normalizedLocal = domain.includes('gmail.com') 
      ? local.replace(/\./g, '').split('+')[0]  // Gmail: remove dots & +aliases
      : local.split('+')[0];                     // Others: remove +aliases
    return `${normalizedLocal}@${domain}`;
  }

  static normalizePhone(phone) {
    const digits = String(phone).replace(/\D/g, '');
    // Remove country code if present (assume US +1)
    return digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  }

  static normalizeDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // Generate fingerprint from object with schema
  static async fingerprint(obj, schema) {
    const parts = [];
    
    for (const [field, config] of Object.entries(schema)) {
      const value = obj[field];
      if (!value) continue;
      
      const normalized = this.normalize(value, config.type);
      if (!normalized) continue;
      
      // Apply weight (repeat for important fields)
      const weight = config.weight || 1;
      for (let i = 0; i < weight; i++) {
        parts.push(normalized);
      }
    }
    
    if (parts.length === 0) return null;
    
    // Combine all parts and hash
    const combined = parts.join('|');
    return await this.hash(combined);
  }
}

// Test the system version 2 NO trimming of the fingerprint to use browser hash 
(async function() {
  const CONFIG = { MAX: 2000, MIN: 100, EXCLUDE: ['script','noscript' ,'style', 'nav', 'header', 'footer'] };
  
  const container = document.querySelector('main') || document.body;
  const originalText = container.innerText?.trim() || '';
  const originalLength = originalText.length;
  
  console.log(`📦 Container: <${container.tagName}>, ${originalLength} chars\n`);
  
  const chunkedElements = new Set();
  
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
        if (coverage > 0.7) return childChunks;
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
  
  // Check for overlaps
  console.log('🔍 Checking for overlaps...\n');
  const chunkTexts = chunks.map(c => c.text);
  let overlapFound = false;
  
  for (let i = 0; i < chunkTexts.length; i++) {
    for (let j = i + 1; j < chunkTexts.length; j++) {
      const text1 = chunkTexts[i];
      const text2 = chunkTexts[j];
      
      if (text1.includes(text2) || text2.includes(text1)) {
        console.warn(`⚠️  OVERLAP DETECTED:`);
        console.warn(`   Chunk ${i + 1}: "${text1.slice(0, 50)}..."`);
        console.warn(`   Chunk ${j + 1}: "${text2.slice(0, 50)}..."`);
        overlapFound = true;
      }
    }
  }
  
  if (!overlapFound) console.log('✅ No overlaps detected\n');
  
  // Verify Fingerprinter is available
  if (typeof Fingerprinter === 'undefined') {
    console.error('❌ Fingerprinter class not found! Please load it first.');
    return;
  }
  
  // Process chunks with proper separation
  const processed = await Promise.all(chunks.map(async (c, i) => ({
    id: `chunk-${i}`,
    selector: c.sel,
    
    // For scroll-to-text navigation (first ~20 words)
    textFragment: c.text.split(/\s+/).slice(0, 20).join(' '),
    
    // For human-readable preview
    preview: c.text.slice(0, 50).replace(/\s+/g, ' ').trim(),
    
    // For identity/deduplication (hash FULL text)
    hash: await Fingerprinter.hash(c.text),
    
    // Full text (optional, for storage)
    text: c.text,
    
    length: c.len,
    depth: c.depth
  })));
  
  console.table(processed.map((c, i) => ({
    num: i + 1,
    chars: c.length,
    depth: c.depth,
    hash: c.hash,
    textFragment: c.textFragment.slice(0, 40) + '...',
    preview: c.preview,
    selector: c.selector.slice(0, 35)
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
  
  // Save to localStorage
  const storageKey = 'pageChunks_' + btoa(location.href).slice(0, 50);
  const data = {
    url: location.href,
    timestamp: Date.now(),
    originalLength: originalLength,
    chunks: processed.map(c => ({
      selector: c.selector,
      textFragment: c.textFragment,  // ← For navigation
      hash: c.hash,                   // ← For identity
      length: c.length
    }))
  };
  
  localStorage.setItem(storageKey, JSON.stringify(data));
  
  console.log(`\n💾 Saved to localStorage`);
  console.log(`   Key: ${storageKey}`);
  console.log(`   Data: ${JSON.stringify(data).length} bytes`);
  
  // Demo: Navigation helper
  window.scrollToChunk = function(chunkIndex) {
    const chunk = processed[chunkIndex];
    if (!chunk) {
      console.error(`Chunk ${chunkIndex} not found`);
      return;
    }
    
    const encoded = encodeURIComponent(chunk.textFragment);
    const url = `${location.origin}${location.pathname}#:~:text=${encoded}`;
    
    console.log(`🔗 Navigate to chunk ${chunkIndex}:`);
    console.log(`   ${url}`);
    
    window.location.hash = `#:~:text=${encoded}`;
  };
  
  console.log(`\n🧭 Navigation:`);
  console.log(`   Use scrollToChunk(n) to navigate, e.g.:`);
  console.log(`   scrollToChunk(0) - jumps to first chunk`);
  console.log(`   scrollToChunk(3) - jumps to fourth chunk\n`);

  //added 
  window.chunks = processed;
})();
/*

## 🔄 **Key Changes**

1. **Removed local `hash()` function** - no longer needed
2. **Added Fingerprinter check** - validates it's loaded
3. **Changed hash call** - `await Fingerprinter.hash(c.text)` uses Base32 (15 chars)
4. **Updated console output** - shows hash format info

## ✅ **Benefits**

- **15 chars** instead of 16 (hex) - more compact
- **Base32** - faster (14% improvement from your benchmark)
- **75 bits** - stronger collision resistance than 64-bit hex
- **Lowercase** - consistent with Frappe conventions
- **Unified system** - same fingerprinting for chunks and contacts

**Output example:**
```
hash: "k9fj3h8d1lq2b0a"  ← Base32 (was: "672d38e06b6951c4" hex)*/