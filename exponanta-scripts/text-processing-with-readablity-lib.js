(async function() {
  'use strict';
  
  // ============ LOAD READABILITY ============
  async function loadReadability() {
    if (window.Readability) return window.Readability;
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/Readability.js';
    
    return new Promise((resolve, reject) => {
      script.onload = () => resolve(window.Readability);
      script.onerror = () => reject(new Error('Failed to load Readability'));
      document.head.appendChild(script);
    });
  }
  
  const Readability = await loadReadability();
  console.log('✅ Readability loaded\n');
  
  // ============ CONFIG ============
  const CONFIG = { 
    MAX: 2000, 
    MIN: 100, 
    EXCLUDE: ['script','noscript','style','nav','header','footer'],
    USE_READABILITY: true  // Toggle comparison
  };
  
  // ============ YOUR ORIGINAL APPROACH ============
  function yourApproach() {
    console.log('🔵 YOUR APPROACH (document.body)\n');
    
    const container = document.body;
    const originalText = container.innerText?.trim() || '';
    
    function split(el, depth = 0) {
      if (CONFIG.EXCLUDE.includes(el.tagName.toLowerCase())) return [];
      const text = el.innerText?.trim() || '';
      if (text.length < CONFIG.MIN) return [];
      if (text.length <= CONFIG.MAX) return [{ el, text, len: text.length, depth }];
      
      if (text.length > CONFIG.MAX && el.children.length > 0) {
        const childChunks = Array.from(el.children).flatMap(c => split(c, depth + 1));
        if (childChunks.length > 0) return childChunks;
      }
      
      return [{ el, text, len: text.length, depth }];
    }
    
    const chunks = split(container);
    const totalChars = chunks.reduce((s, c) => s + c.len, 0);
    
    console.log(`   Container: <${container.tagName}>`);
    console.log(`   Original: ${originalText.length.toLocaleString()} chars`);
    console.log(`   Chunks: ${chunks.length}`);
    console.log(`   Sum: ${totalChars.toLocaleString()} chars`);
    console.log(`   Coverage: ${((totalChars / originalText.length) * 100).toFixed(2)}%`);
    
    // Show first 3 chunks
    console.log('\n   First 3 chunks:');
    chunks.slice(0, 3).forEach((c, i) => {
      console.log(`   ${i + 1}. [${c.len} chars] ${c.text.slice(0, 60)}...`);
    });
    
    return { chunks, totalChars, originalLength: originalText.length };
  }
  
  // ============ READABILITY APPROACH ============
  function readabilityApproach() {
    console.log('\n🟢 READABILITY APPROACH\n');
    
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();
    
    if (!article) {
      console.log('   ❌ Readability failed to extract article');
      return null;
    }
    
    console.log(`   Title: "${article.title}"`);
    console.log(`   Byline: ${article.byline || 'N/A'}`);
    console.log(`   Extracted: ${article.textContent.length.toLocaleString()} chars`);
    console.log(`   Excerpt: ${article.excerpt.slice(0, 100)}...`);
    
    // Now chunk the cleaned content
    function splitText(text) {
      const chunks = [];
      const paragraphs = text.split(/\n\n+/);
      let buffer = '';
      
      for (const para of paragraphs) {
        if ((buffer + para).length > CONFIG.MAX && buffer.length >= CONFIG.MIN) {
          chunks.push({ text: buffer.trim(), len: buffer.trim().length });
          buffer = para;
        } else {
          buffer += (buffer ? '\n\n' : '') + para;
        }
      }
      
      if (buffer.trim().length >= CONFIG.MIN) {
        chunks.push({ text: buffer.trim(), len: buffer.trim().length });
      }
      
      return chunks;
    }
    
    const chunks = splitText(article.textContent);
    const totalChars = chunks.reduce((s, c) => s + c.len, 0);
    
    console.log(`   Chunks: ${chunks.length}`);
    console.log(`   Sum: ${totalChars.toLocaleString()} chars`);
    
    // Show first 3 chunks
    console.log('\n   First 3 chunks:');
    chunks.slice(0, 3).forEach((c, i) => {
      console.log(`   ${i + 1}. [${c.len} chars] ${c.text.slice(0, 60)}...`);
    });
    
    return { 
      chunks, 
      totalChars, 
      originalLength: article.textContent.length,
      article 
    };
  }
  
  // ============ RUN COMPARISON ============
  console.log('═══════════════════════════════════════════════\n');
  
  const yourResult = yourApproach();
  const readabilityResult = readabilityApproach();
  
  // ============ SIDE-BY-SIDE COMPARISON ============
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 COMPARISON\n');
  
  if (readabilityResult) {
    console.table({
      'Your Approach': {
        'Content Source': 'document.body (everything)',
        'Total Chars': yourResult.originalLength.toLocaleString(),
        'Chunked Chars': yourResult.totalChars.toLocaleString(),
        'Chunks': yourResult.chunks.length,
        'Avg Chunk Size': Math.round(yourResult.totalChars / yourResult.chunks.length),
        'Coverage': ((yourResult.totalChars / yourResult.originalLength) * 100).toFixed(1) + '%'
      },
      'Readability': {
        'Content Source': 'Extracted article only',
        'Total Chars': readabilityResult.originalLength.toLocaleString(),
        'Chunked Chars': readabilityResult.totalChars.toLocaleString(),
        'Chunks': readabilityResult.chunks.length,
        'Avg Chunk Size': Math.round(readabilityResult.totalChars / readabilityResult.chunks.length),
        'Coverage': ((readabilityResult.totalChars / readabilityResult.originalLength) * 100).toFixed(1) + '%'
      }
    });
    
    const reduction = ((1 - (readabilityResult.originalLength / yourResult.originalLength)) * 100).toFixed(1);
    console.log(`\n💡 Readability removed ${reduction}% of noise from the page\n`);
    
    // Show what was filtered out
    const filtered = yourResult.originalLength - readabilityResult.originalLength;
    console.log(`📉 Filtered out: ${filtered.toLocaleString()} chars`);
    console.log(`   (ads, comments, sidebars, navigation, etc.)\n`);
  }
  
  console.log('═══════════════════════════════════════════════\n');
  
})();