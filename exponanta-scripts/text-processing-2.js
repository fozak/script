// ============================================================================
// DOMAIN EXTRACTION - Simple & Working
// ============================================================================

const DomainExtraction = {
  
  // Amazon Orders Configuration
  amazon_orders: {
    name: "amazon-orders-v1",
    domain: "amazon.com",
    
    config: {
      MAX: 2000,
      MIN: 100,
      EXCLUDE: ["script", "noscript", "style", "nav", "header", "footer"]
    },
    
    filters: {
      includePatterns: [/^ORDER PLACED/],
      excludePatterns: [/^Get to Know Us/, /^Amazon Music/, /^Conditions of Use/, /^Recommended/],
      excludeSelectors: ["#rhf", "#a-popover"]
    },
    
    getContainer() {
      return document.querySelector('main') || document.body;
    }
  },
  
  // LinkedIn Messages Configuration
  linkedin_messages: {
    name: "linkedin-messages-v1",
    domain: "linkedin.com",
    
    config: {
      MAX: 2000,
      MIN: 100,
      EXCLUDE: ["script", "noscript", "style", "nav", "header", "footer"]
    },
    
    filters: {
      includePatterns: [/^Status is (online|reachable)/],
      excludePatterns: [/^Jump to/, /^Conversation L/],
      excludeSelectors: []
    },
    
    getContainer() {
      return document.querySelector('main') || document.body;
    }
  },
  
  // ============================================================================
  // SHARED FUNCTIONS (used by all domains)
  // ============================================================================
  
  cleanFingerprint(text) {
    return text.slice(0, 70).replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
  },
  
  getSelector(el, container) {
    if (el.id) return '#' + el.id;
    let path = [];
    while (el && el !== container) {
      const tag = el.tagName.toLowerCase();
      const siblings = Array.from(el.parentElement?.children || []).filter(s => s.tagName === el.tagName);
      const idx = siblings.length > 1 ? ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')' : '';
      path.unshift(tag + idx);
      el = el.parentElement;
    }
    return path.join(' > ');
  },
  
  shouldTrack(text, selector, filters) {
    // Check include patterns first (if defined)
    if (filters.includePatterns.length > 0) {
      if (!filters.includePatterns.some(p => p.test(text))) return false;
    }
    
    // Check exclude selectors
    if (filters.excludeSelectors.some(s => selector.includes(s))) return false;
    
    // Check exclude patterns
    if (filters.excludePatterns.some(p => p.test(text))) return false;
    
    return true;
  },
  
  split(el, depth, config, container) {
    if (config.EXCLUDE.includes(el.tagName.toLowerCase())) return [];
    
    const text = el.innerText?.trim() || '';
    if (text.length < config.MIN) return [];
    
    if (text.length <= config.MAX) {
      const selector = this.getSelector(el, container);
      return [{ el, text, len: text.length, depth, sel: selector }];
    }
    
    return Array.from(el.children).flatMap(c => this.split(c, depth + 1, config, container));
  },
  
  async hash(txt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  },
  
  // ============================================================================
  // MAIN EXECUTION
  // ============================================================================
  
  async run(domainConfig) {
    console.log(`🚀 Running: ${domainConfig.name}`);
    console.log(`📍 Domain: ${domainConfig.domain}\n`);
    
    // Step 1: Get container
    const container = domainConfig.getContainer();
    console.log(`📦 Container: <${container.tagName}>, ${container.innerText.length} chars\n`);
    
    // Step 2: Split into chunks
    const chunks = this.split(container, 0, domainConfig.config, container);
    console.log(`✂️  Found ${chunks.length} raw chunks\n`);
    
    // Step 3: Filter chunks
    const filtered = chunks.filter(c => 
      this.shouldTrack(c.text, c.sel, domainConfig.filters)
    );
    console.log(`🎯 Filtered to ${filtered.length} chunks\n`);
    
    // Step 4: Process chunks
    const processed = await Promise.all(filtered.map(async (c, i) => ({
      id: `chunk-${i}`,
      selector: c.sel,
      fingerprint: this.cleanFingerprint(c.text),
      hash: await this.hash(c.text),
      text: c.text,
      length: c.len,
      depth: c.depth
    })));
    
    // Step 5: Display
    console.table(processed.map((c, i) => ({
      num: i + 1,
      chars: c.length,
      fingerprint: c.fingerprint,
      selector: c.selector.slice(0, 35),
      preview: c.text.slice(0, 70)
    })));
    
    // Step 6: Save
    const storageKey = 'pageChunks_' + btoa(location.href).slice(0, 50);
    const data = {
      url: location.href,
      timestamp: Date.now(),
      extraction_name: domainConfig.name,
      domain: domainConfig.domain,
      filters: domainConfig.filters,
      chunks: processed.map(c => ({
        selector: c.selector,
        fingerprint: c.fingerprint,
        hash: c.hash,
        length: c.length
      }))
    };
    
    localStorage.setItem(storageKey, JSON.stringify(data));
    
    console.log('\n💾 Saved to localStorage');
    console.log(`   Key: ${storageKey}`);
    console.log(`✅ Complete - ${processed.length} chunks tracked\n`);
    
    return { processed, data };
  }
};

// ============================================================================
// AUTO-DETECT & RUN
// ============================================================================

(async function() {
  const domain = location.hostname;
  
  let config;
  if (domain.includes('amazon')) {
    config = DomainExtraction.amazon_orders;
  } else if (domain.includes('linkedin')) {
    config = DomainExtraction.linkedin_messages;
  } else {
    console.log('⚠️  No configuration for this domain. Available:');
    console.log('   - amazon.com');
    console.log('   - linkedin.com');
    return;
  }
  
  const result = await DomainExtraction.run(config);
  
  window.domainExtraction = {
    config,
    result,
    rerun: () => DomainExtraction.run(config)
  };
  
  console.log('💡 Access via: window.domainExtraction');
  console.log('💡 Re-run: window.domainExtraction.rerun()');
})();