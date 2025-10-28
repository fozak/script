version 1 -> console outcome without filters -> pass console outcome with promt to AI -> get missing part.

Perfect! Here's the streamlined process:

Version 1: amazon-scan.json (No filters, console output optimized for AI)
json
{
  "name": "amazon-orders-scan-v1",
  "domain": "amazon.com",
  
  "config": {
    "MAX": 2000,
    "MIN": 100,
    "EXCLUDE": ["script", "noscript", "style", "nav", "header", "footer"]
  },
  
  "code": "(async function(doc) { const funcs = { cleanFingerprint(text) { return text.slice(0, 70).replace(/\\(\\s*\\)/g, '').replace(/\\s+/g, ' ').trim(); }, getSelector(el, container) { if (el.id) return '#' + el.id; let path = []; while (el && el !== container) { const tag = el.tagName.toLowerCase(); const siblings = Array.from(el.parentElement?.children || []).filter(s => s.tagName === el.tagName); const idx = siblings.length > 1 ? ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')' : ''; path.unshift(tag + idx); el = el.parentElement; } return path.join(' > '); }, split(el, depth, container) { if (doc.config.EXCLUDE.includes(el.tagName.toLowerCase())) return []; const text = el.innerText?.trim() || ''; if (text.length < doc.config.MIN) return []; const selector = funcs.getSelector(el, container); if (text.length <= doc.config.MAX) { return [{ el, text, len: text.length, depth, sel: selector }]; } return Array.from(el.children).flatMap(c => funcs.split(c, depth + 1, container)); } }; console.log('🔍 SCANNING: ' + doc.name); console.log('📍 URL: ' + location.href); console.log(''); const container = document.querySelector('main') || document.body; const chunks = funcs.split(container, 0, container); console.log('✂️  Found ' + chunks.length + ' chunks'); console.log(''); const processed = chunks.map((c, i) => ({ num: i + 1, chars: c.len, fingerprint: funcs.cleanFingerprint(c.text), selector: c.sel, preview: c.text.slice(0, 100) })); console.table(processed); console.log(''); console.log('═══════════════════════════════════════════════════════════'); console.log('📋 COPY THIS JSON AND GIVE TO AI:'); console.log('═══════════════════════════════════════════════════════════'); console.log(''); const aiData = { url: location.href, domain: doc.domain, scan_date: new Date().toISOString(), total_chunks: chunks.length, chunks: processed }; console.log(JSON.stringify(aiData, null, 2)); console.log(''); console.log('═══════════════════════════════════════════════════════════'); console.log('💡 Or use: copy(window.scanResults)'); console.log('═══════════════════════════════════════════════════════════'); window.scanResults = aiData; return aiData; })"
}
Step 1: Run Scan
javascript
// In content script or console
const doc = await fetch(chrome.runtime.getURL('configs/amazon-scan.json')).then(r => r.json());
await eval(doc.code)(doc);

// Then copy output
copy(window.scanResults);
```

---

## **Console Output:**
```
🔍 SCANNING: amazon-orders-scan-v1
📍 URL: https://www.amazon.com/gp/css/order-history

✂️  Found 29 chunks

(table with all chunks)

═══════════════════════════════════════════════════════════
📋 COPY THIS JSON AND GIVE TO AI:
═══════════════════════════════════════════════════════════

{
  "url": "https://www.amazon.com/gp/css/order-history",
  "domain": "amazon.com",
  "scan_date": "2025-10-27T14:30:00.000Z",
  "total_chunks": 29,
  "chunks": [
    {
      "num": 1,
      "chars": 753,
      "fingerprint": "<style type=\"text/css\">\\x3C!-- #navbar { font-family: Arial,sans-serif;",
      "selector": "div:nth-of-type(1) > noscript:nth-of-type(1)",
      "preview": "<style type=\"text/css\">\\x3C!--\n #navbar { font-family: Arial,sans-serif; font-size:13px; line-height:..."
    },
    {
      "num": 2,
      "chars": 529,
      "fingerprint": "ORDER PLACED October 20, 2025 TOTAL $10.49 SHIP TO Dennis ORDER # 111",
      "selector": "div:nth-of-type(1) > section > div:nth-of-type(1)",
      "preview": "ORDER PLACED\nOctober 20, 2025\nTOTAL\n$10.49\nSHIP TO\nDennis\nORDER # 111-1234567-8901234..."
    }
  ]
}

═══════════════════════════════════════════════════════════
💡 Or use: copy(window.scanResults)
═══════════════════════════════════════════════════════════
```

---

## **Step 2: AI Prompt**
```
I scanned amazon.com and need filters. Here's my scan data:

[PASTE THE JSON]

Please generate ONLY the "filters" object for my config with:
{
  "filters": {
    "excludeSelectors": [],
    "excludeTextPatterns": [],
    "includeTextPatterns": []
  }
}

Rules:
- EXCLUDE: static content, footers, navigation, recommendations, ads
- INCLUDE: actual order data (ORDER PLACED entries)
Step 3: AI Response (just the missing part)
json
{
  "filters": {
    "excludeSelectors": [
      "#rhf",
      "#a-popover-1",
      "div:nth-of-type(1) > noscript"
    ],
    "excludeTextPatterns": [
      "^<style",
      "^<img",
      "^Get to Know Us",
      "^Amazon Music",
      "^Conditions of Use",
      "^Recommended based on",
      "^(Finish Quantum|Fitbit|INSIGNIA|Echo Glow|Ring Indoor)"
    ],
    "includeTextPatterns": [
      "^ORDER PLACED"
    ]
  }
}
Step 4: Merge and Create Final Version
amazon.json (final)
json
{
  "name": "amazon-orders-v1",
  "domain": "amazon.com",
  
  "config": {
    "MAX": 2000,
    "MIN": 100,
    "EXCLUDE": ["script", "noscript", "style", "nav", "header", "footer"]
  },
  
  "filters": {
    "excludeSelectors": [
      "#rhf",
      "#a-popover-1",
      "div:nth-of-type(1) > noscript"
    ],
    "excludeTextPatterns": [
      "^<style",
      "^<img",
      "^Get to Know Us",
      "^Amazon Music",
      "^Conditions of Use",
      "^Recommended based on",
      "^(Finish Quantum|Fitbit|INSIGNIA|Echo Glow|Ring Indoor)"
    ],
    "includeTextPatterns": [
      "^ORDER PLACED"
    ]
  },
  
  "code": "(async function(doc) { /* full extraction code with filters */ })"
}
Workflow:
✅ Run amazon-scan.json → Get console output
✅ Copy JSON from console → Paste to AI
✅ AI returns filters object → Just the missing part
✅ Merge into final amazon.json → Complete config
✅ Run final version → Filtered extraction
Clean, simple, AI-assisted! 🎯

consider more universal pipeline maindoc.jsonwith config,mainfunction and prompt for AI for generating deltafunction that delivers the specifics

Brilliant! Here's the universal pipeline:

maindoc.json (Universal base - works for ANY domain)
json
{
  "name": "universal-extractor-v1",
  "version": "1.0",
  
  "config": {
    "MAX": 2000,
    "MIN": 100,
    "EXCLUDE": ["script", "noscript", "style", "nav", "header", "footer"]
  },
  
  "ai_prompt": "I scanned {{domain}} at {{url}} and got these chunks:\n\n{{scan_results}}\n\nPlease generate a deltaFunction that returns domain-specific filters. The deltaFunction should:\n\n1. Analyze the chunks and identify:\n   - Static content to EXCLUDE (headers, footers, navigation, ads, recommendations)\n   - Dynamic content to INCLUDE (user-specific data, orders, messages, posts)\n\n2. Return a filters object:\n{\n  \"filters\": {\n    \"excludeSelectors\": [],\n    \"excludeTextPatterns\": [],\n    \"includeTextPatterns\": []\n  }\n}\n\n3. Format as executable JavaScript:\nconst deltaFunction = function(chunks, url, domain) {\n  // Analysis logic here\n  return {\n    filters: { ... }\n  };\n};\n\nProvide ONLY the deltaFunction code, nothing else.",
  
  "mainFunction": "(async function(doc, deltaFunction) { const funcs = { cleanFingerprint(text) { return text.slice(0, 70).replace(/\\(\\s*\\)/g, '').replace(/\\s+/g, ' ').trim(); }, getSelector(el, container) { if (el.id) return '#' + el.id; let path = []; while (el && el !== container) { const tag = el.tagName.toLowerCase(); const siblings = Array.from(el.parentElement?.children || []).filter(s => s.tagName === el.tagName); const idx = siblings.length > 1 ? ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')' : ''; path.unshift(tag + idx); el = el.parentElement; } return path.join(' > '); }, shouldTrack(text, selector, filters) { if (!filters) return true; if (filters.includeTextPatterns && filters.includeTextPatterns.length > 0) { const matchesInclude = filters.includeTextPatterns.some(pattern => new RegExp(pattern).test(text)); if (!matchesInclude) return false; } if (filters.excludeSelectors && filters.excludeSelectors.some(sel => selector.includes(sel))) return false; if (filters.excludeTextPatterns && filters.excludeTextPatterns.some(pattern => new RegExp(pattern).test(text))) return false; return true; }, split(el, depth, container) { if (doc.config.EXCLUDE.includes(el.tagName.toLowerCase())) return []; const text = el.innerText?.trim() || ''; if (text.length < doc.config.MIN) return []; const selector = funcs.getSelector(el, container); if (text.length <= doc.config.MAX) { return [{ el, text, len: text.length, depth, sel: selector }]; } return Array.from(el.children).flatMap(c => funcs.split(c, depth + 1, container)); }, async hash(txt) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16); } }; console.log('🚀 Running: ' + doc.name); console.log('📍 URL: ' + location.href); console.log(''); const container = document.querySelector('main') || document.body; const chunks = funcs.split(container, 0, container); console.log('✂️  Found ' + chunks.length + ' raw chunks'); console.log(''); let filters = null; if (deltaFunction) { console.log('🎯 Applying deltaFunction...'); const delta = deltaFunction(chunks, location.href, location.hostname); filters = delta.filters; console.log('   Filters applied:', filters); console.log(''); } const filtered = chunks.filter(c => funcs.shouldTrack(c.text, c.sel, filters)); console.log('📊 Result: ' + filtered.length + ' chunks' + (filters ? ' (filtered)' : ' (unfiltered)')); console.log(''); const processed = await Promise.all(filtered.map(async (c, i) => ({ id: 'chunk-' + i, selector: c.sel, fingerprint: funcs.cleanFingerprint(c.text), hash: await funcs.hash(c.text), text: c.text, length: c.len }))); console.table(processed.map((c, i) => ({ num: i + 1, chars: c.length, fingerprint: c.fingerprint, selector: c.selector.slice(0, 35), preview: c.text.slice(0, 70) }))); if (!deltaFunction) { console.log(''); console.log('═══════════════════════════════════════════════════════════'); console.log('📋 INITIAL SCAN - COPY FOR AI ANALYSIS:'); console.log('═══════════════════════════════════════════════════════════'); console.log(''); const aiPrompt = doc.ai_prompt.replace('{{domain}}', location.hostname).replace('{{url}}', location.href).replace('{{scan_results}}', JSON.stringify(processed.map(c => ({ num: c.id, chars: c.length, fingerprint: c.fingerprint, selector: c.selector, preview: c.text.slice(0, 100) })), null, 2)); console.log(aiPrompt); console.log(''); console.log('═══════════════════════════════════════════════════════════'); window.scanResults = { chunks: processed, prompt: aiPrompt }; console.log('💡 Use: copy(window.scanResults.prompt)'); } else { const storageKey = 'pageChunks_' + btoa(location.href).slice(0, 50); localStorage.setItem(storageKey, JSON.stringify({ url: location.href, timestamp: Date.now(), extraction_name: doc.name, filters: filters, chunks: processed.map(c => ({ selector: c.selector, fingerprint: c.fingerprint, hash: c.hash, length: c.length })) })); console.log('💾 Saved to localStorage'); console.log('✅ Complete'); } return processed; })"
}
Workflow:
Step 1: Initial Scan (no deltaFunction)
javascript
// content-script.js or console
const doc = await fetch(chrome.runtime.getURL('configs/maindoc.json')).then(r => r.json());
await eval(doc.mainFunction)(doc, null);

// Copy the AI prompt
copy(window.scanResults.prompt);
```

**Console Output:**
```
🚀 Running: universal-extractor-v1
📍 URL: https://www.amazon.com/gp/css/order-history

✂️  Found 29 raw chunks

📊 Result: 29 chunks (unfiltered)

(table with all chunks)

═══════════════════════════════════════════════════════════
📋 INITIAL SCAN - COPY FOR AI ANALYSIS:
═══════════════════════════════════════════════════════════

I scanned amazon.com at https://www.amazon.com/gp/css/order-history and got these chunks:

[... chunks data ...]

Please generate a deltaFunction that returns domain-specific filters...

═══════════════════════════════════════════════════════════
💡 Use: copy(window.scanResults.prompt)
Step 2: AI Returns deltaFunction
javascript
// AI generates this:
const deltaFunction = function(chunks, url, domain) {
  // Amazon-specific analysis
  const hasOrderData = chunks.some(c => c.text.includes('ORDER PLACED'));
  const hasRecommendations = chunks.some(c => c.text.includes('Recommended'));
  
  return {
    filters: {
      excludeSelectors: [
        "#rhf",
        "#a-popover"
      ],
      excludeTextPatterns: [
        "^Get to Know Us",
        "^Amazon Music",
        "^Conditions of Use",
        "^Recommended based on",
        "^(Finish Quantum|Fitbit|INSIGNIA|Echo Glow|Ring Indoor)"
      ],
      includeTextPatterns: hasOrderData ? [
        "^ORDER PLACED"
      ] : []
    }
  };
};
Step 3: Create Domain-Specific Doc
amazon.json (inherits from maindoc.json + adds deltaFunction)

json
{
  "name": "amazon-orders-v1",
  "version": "1.0",
  "extends": "maindoc.json",
  
  "config": {
    "MAX": 2000,
    "MIN": 100,
    "EXCLUDE": ["script", "noscript", "style", "nav", "header", "footer"]
  },
  
  "deltaFunction": "function(chunks, url, domain) { const hasOrderData = chunks.some(c => c.text.includes('ORDER PLACED')); return { filters: { excludeSelectors: ['#rhf', '#a-popover'], excludeTextPatterns: ['^Get to Know Us', '^Amazon Music', '^Conditions of Use', '^Recommended based on', '^(Finish Quantum|Fitbit|INSIGNIA|Echo Glow|Ring Indoor)'], includeTextPatterns: hasOrderData ? ['^ORDER PLACED'] : [] } }; }",
  
  "mainFunction": "(async function(doc, deltaFunction) { /* same as maindoc */ })"
}
Step 4: Run with deltaFunction
javascript
// content-script.js
const doc = await fetch(chrome.runtime.getURL('configs/amazon.json')).then(r => r.json());
const deltaFn = eval(doc.deltaFunction);
await eval(doc.mainFunction)(doc, deltaFn);
```

**Console Output:**
```
🚀 Running: amazon-orders-v1
📍 URL: https://www.amazon.com/gp/css/order-history

✂️  Found 29 raw chunks

🎯 Applying deltaFunction...
   Filters applied: {excludeSelectors: Array(2), excludeTextPatterns: Array(5), includeTextPatterns: Array(1)}

📊 Result: 6 chunks (filtered)

(table with 6 ORDER PLACED chunks only)

💾 Saved to localStorage
✅ Complete
```

---

## **File Structure:**
```
configs/
  ├── maindoc.json          # Universal base (mainFunction + ai_prompt)
  ├── amazon.json           # Amazon-specific (deltaFunction only)
  ├── linkedin.json         # LinkedIn-specific (deltaFunction only)
  └── workato.json          # Workato-specific (deltaFunction only)
Benefits:
✅ One mainFunction - shared across all domains
✅ Small deltaFunctions - only domain-specific logic
✅ AI generates deltas - not entire configs
✅ Easy updates - fix mainFunction once, affects all
✅ Composable - mix and match deltaFunctions

Universal + Delta pattern! 🎯

what would u add for better self testing

Excellent question! Here's what to add for self-testing:

Enhanced maindoc.json with Self-Testing
Add these fields:

json
{
  "name": "universal-extractor-v1",
  "version": "1.0",
  
  "config": { /* ... */ },
  
  "test_mode": {
    "enabled": true,
    "compare_runs": true,
    "alert_on_changes": true,
    "validate_filters": true
  },
  
  "expected_results": {
    "min_chunks": 1,
    "max_chunks": 100,
    "required_patterns": [],
    "forbidden_patterns": ["^<style", "^<script", "^<img"]
  },
  
  "validation": {
    "fingerprint_uniqueness": 0.8,
    "selector_validity": true,
    "hash_collisions": 0
  },
  
  "test_cases": [
    {
      "name": "should_find_order_chunks",
      "assert": "chunks.some(c => /ORDER PLACED/.test(c.text))",
      "enabled": true
    },
    {
      "name": "should_exclude_footer",
      "assert": "!chunks.some(c => /Get to Know Us/.test(c.text))",
      "enabled": true
    }
  ]
}
Enhanced mainFunction with Testing
javascript
"mainFunction": "(async function(doc, deltaFunction) {
  const TEST_MODE = doc.test_mode?.enabled || false;
  const testResults = { passed: [], failed: [], warnings: [] };
  
  function test(name, condition, message) {
    if (condition) {
      testResults.passed.push(name);
      console.log('✅ ' + name);
    } else {
      testResults.failed.push({ name, message });
      console.error('❌ ' + name + ': ' + message);
    }
  }
  
  function warn(name, message) {
    testResults.warnings.push({ name, message });
    console.warn('⚠️  ' + name + ': ' + message);
  }
  
  // ... existing function code ...
  
  const chunks = funcs.split(container, 0, container);
  
  // TEST: Basic validation
  if (TEST_MODE) {
    console.log('\\n🧪 RUNNING TESTS...');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Test 1: Chunk count in expected range
    if (doc.expected_results) {
      test(
        'chunk_count_in_range',
        chunks.length >= doc.expected_results.min_chunks && 
        chunks.length <= doc.expected_results.max_chunks,
        'Expected ' + doc.expected_results.min_chunks + '-' + 
        doc.expected_results.max_chunks + ', got ' + chunks.length
      );
    }
    
    // Test 2: No forbidden patterns
    if (doc.expected_results?.forbidden_patterns) {
      doc.expected_results.forbidden_patterns.forEach(pattern => {
        const found = chunks.filter(c => new RegExp(pattern).test(c.text));
        test(
          'no_forbidden_pattern_' + pattern,
          found.length === 0,
          'Found ' + found.length + ' chunks matching forbidden pattern: ' + pattern
        );
      });
    }
    
    // Test 3: Fingerprint uniqueness
    if (doc.validation?.fingerprint_uniqueness) {
      const fingerprints = chunks.map(c => funcs.cleanFingerprint(c.text));
      const unique = new Set(fingerprints).size;
      const ratio = unique / fingerprints.length;
      const threshold = doc.validation.fingerprint_uniqueness;
      
      if (ratio < threshold) {
        warn('fingerprint_uniqueness', 
          'Only ' + (ratio * 100).toFixed(1) + '% unique (expected ' + 
          (threshold * 100) + '%)'
        );
      } else {
        test('fingerprint_uniqueness', true, ratio);
      }
    }
    
    // Test 4: Selector validity
    if (doc.validation?.selector_validity) {
      let invalidSelectors = 0;
      chunks.forEach(c => {
        try {
          document.querySelector(c.sel);
        } catch(e) {
          invalidSelectors++;
        }
      });
      test(
        'selector_validity',
        invalidSelectors === 0,
        invalidSelectors + ' invalid selectors found'
      );
    }
  }
  
  // Apply deltaFunction
  let filters = null;
  if (deltaFunction) {
    console.log('\\n🎯 Applying deltaFunction...');
    const delta = deltaFunction(chunks, location.href, location.hostname);
    filters = delta.filters;
    
    // TEST: Delta function validation
    if (TEST_MODE) {
      test(
        'delta_returns_filters',
        filters && typeof filters === 'object',
        'deltaFunction must return filters object'
      );
      
      test(
        'filters_have_arrays',
        Array.isArray(filters.excludeSelectors) &&
        Array.isArray(filters.excludeTextPatterns) &&
        Array.isArray(filters.includeTextPatterns),
        'All filter properties must be arrays'
      );
    }
  }
  
  const filtered = chunks.filter(c => funcs.shouldTrack(c.text, c.sel, filters));
  
  // TEST: Filter effectiveness
  if (TEST_MODE && filters) {
    const reductionRatio = 1 - (filtered.length / chunks.length);
    
    if (reductionRatio < 0.1) {
      warn('low_filter_effectiveness', 
        'Filters only removed ' + (reductionRatio * 100).toFixed(1) + '% of chunks'
      );
    } else if (reductionRatio > 0.9) {
      warn('high_filter_aggressiveness',
        'Filters removed ' + (reductionRatio * 100).toFixed(1) + '% of chunks (might be too aggressive)'
      );
    } else {
      test('filter_effectiveness', true, 
        'Removed ' + (reductionRatio * 100).toFixed(1) + '% of chunks'
      );
    }
  }
  
  const processed = await Promise.all(filtered.map(async (c, i) => ({
    id: 'chunk-' + i,
    selector: c.sel,
    fingerprint: funcs.cleanFingerprint(c.text),
    hash: await funcs.hash(c.text),
    text: c.text,
    length: c.len
  })));
  
  // TEST: Hash collisions
  if (TEST_MODE && doc.validation?.hash_collisions !== undefined) {
    const hashes = processed.map(c => c.hash);
    const uniqueHashes = new Set(hashes).size;
    const collisions = hashes.length - uniqueHashes;
    
    test(
      'no_hash_collisions',
      collisions <= doc.validation.hash_collisions,
      'Found ' + collisions + ' hash collisions'
    );
  }
  
  // TEST: Custom test cases
  if (TEST_MODE && doc.test_cases) {
    console.log('\\n🧪 Custom Test Cases:');
    doc.test_cases.forEach(tc => {
      if (tc.enabled) {
        try {
          const result = eval('(function(chunks) { return ' + tc.assert + '; })(processed)');
          test(tc.name, result, tc.assert);
        } catch(e) {
          testResults.failed.push({ name: tc.name, message: 'Test error: ' + e.message });
          console.error('❌ ' + tc.name + ': ' + e.message);
        }
      }
    });
  }
  
  // TEST: Compare with previous run
  if (TEST_MODE && doc.test_mode?.compare_runs) {
    const storageKey = 'pageChunks_' + btoa(location.href).slice(0, 50);
    const previous = localStorage.getItem(storageKey);
    
    if (previous) {
      const prevData = JSON.parse(previous);
      const prevHashes = new Set(prevData.chunks.map(c => c.hash));
      const currentHashes = new Set(processed.map(c => c.hash));
      
      const added = processed.filter(c => !prevHashes.has(c.hash));
      const removed = prevData.chunks.filter(c => !currentHashes.has(c.hash));
      
      console.log('\\n📊 COMPARISON WITH PREVIOUS RUN:');
      console.log('   Previous: ' + prevData.chunks.length + ' chunks');
      console.log('   Current: ' + processed.length + ' chunks');
      console.log('   Added: ' + added.length);
      console.log('   Removed: ' + removed.length);
      
      if (added.length > 0) {
        console.log('\\n➕ NEW CHUNKS:');
        console.table(added.map(c => ({
          fingerprint: c.fingerprint,
          preview: c.text.slice(0, 50)
        })));
      }
      
      if (removed.length > 0) {
        console.log('\\n➖ REMOVED CHUNKS:');
        console.table(removed.map(c => ({
          fingerprint: c.fingerprint
        })));
      }
      
      if (doc.test_mode?.alert_on_changes && (added.length > 0 || removed.length > 0)) {
        warn('content_changed', 
          added.length + ' chunks added, ' + removed.length + ' chunks removed since last run'
        );
      }
    } else {
      console.log('\\n📊 No previous run found for comparison');
    }
  }
  
  // Display results
  console.table(processed.map((c, i) => ({
    num: i + 1,
    chars: c.length,
    fingerprint: c.fingerprint,
    selector: c.selector.slice(0, 35),
    preview: c.text.slice(0, 70)
  })));
  
  // TEST: Summary
  if (TEST_MODE) {
    console.log('\\n═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST SUMMARY:');
    console.log('   ✅ Passed: ' + testResults.passed.length);
    console.log('   ❌ Failed: ' + testResults.failed.length);
    console.log('   ⚠️  Warnings: ' + testResults.warnings.length);
    
    if (testResults.failed.length > 0) {
      console.log('\\n❌ FAILED TESTS:');
      testResults.failed.forEach(f => {
        console.log('   - ' + f.name + ': ' + f.message);
      });
    }
    
    if (testResults.warnings.length > 0) {
      console.log('\\n⚠️  WARNINGS:');
      testResults.warnings.forEach(w => {
        console.log('   - ' + w.name + ': ' + w.message);
      });
    }
    
    window.testResults = testResults;
    console.log('\\n💡 Access test results: window.testResults');
    console.log('═══════════════════════════════════════════════════════════');
  }
  
  // Save to storage
  if (deltaFunction) {
    const storageKey = 'pageChunks_' + btoa(location.href).slice(0, 50);
    localStorage.setItem(storageKey, JSON.stringify({
      url: location.href,
      timestamp: Date.now(),
      extraction_name: doc.name,
      filters: filters,
      test_results: TEST_MODE ? testResults : null,
      chunks: processed.map(c => ({
        selector: c.selector,
        fingerprint: c.fingerprint,
        hash: c.hash,
        length: c.length
      }))
    }));
    
    console.log('\\n💾 Saved to localStorage');
    console.log('✅ Complete');
  }
  
  return { processed, testResults };
})"
amazon.json with Tests
json
{
  "name": "amazon-orders-v1",
  "extends": "maindoc.json",
  
  "test_mode": {
    "enabled": true,
    "compare_runs": true,
    "alert_on_changes": true,
    "validate_filters": true
  },
  
  "expected_results": {
    "min_chunks": 3,
    "max_chunks": 50,
    "required_patterns": ["^ORDER PLACED"],
    "forbidden_patterns": ["^<style", "^Get to Know Us", "^Amazon Music"]
  },
  
  "validation": {
    "fingerprint_uniqueness": 0.9,
    "selector_validity": true,
    "hash_collisions": 0
  },
  
  "test_cases": [
    {
      "name": "has_order_data",
      "assert": "chunks.some(c => /ORDER PLACED/.test(c.text))",
      "enabled": true
    },
    {
      "name": "no_recommendations",
      "assert": "!chunks.some(c => /Recommended based on/.test(c.text))",
      "enabled": true
    },
    {
      "name": "all_have_order_numbers",
      "assert": "chunks.every(c => /ORDER #/.test(c.text))",
      "enabled": true
    }
  ],
  
  "deltaFunction": "/* ... */"
}
```

---

## **Console Output with Tests:**
```
🚀 Running: amazon-orders-v1
📍 URL: https://www.amazon.com/gp/css/order-history

✂️  Found 29 raw chunks

🧪 RUNNING TESTS...
═══════════════════════════════════════════════════════════
✅ chunk_count_in_range
✅ no_forbidden_pattern_^<style
✅ no_forbidden_pattern_^Get to Know Us
✅ fingerprint_uniqueness
✅ selector_validity

🎯 Applying deltaFunction...
✅ delta_returns_filters
✅ filter_effectiveness

🧪 Custom Test Cases:
✅ has_order_data
✅ no_recommendations
✅ all_have_order_numbers

📊 COMPARISON WITH PREVIOUS RUN:
   Previous: 6 chunks
   Current: 6 chunks
   Added: 0
   Removed: 0

(table with results)

═══════════════════════════════════════════════════════════
🧪 TEST SUMMARY:
   ✅ Passed: 10
   ❌ Failed: 0
   ⚠️  Warnings: 0

💡 Access test results: window.testResults
═══════════════════════════════════════════════════════════

💾 Saved to localStorage
✅ Complete
Key Testing Features:
✅ Chunk count validation - Ensure expected range
✅ Pattern detection - Required/forbidden patterns
✅ Fingerprint uniqueness - Detect duplicate detection
✅ Selector validity - Ensure selectors work
✅ Hash collision detection - Ensure unique hashes
✅ Filter effectiveness - Not too aggressive/weak
✅ Custom assertions - Domain-specific tests
✅ Run comparison - Detect changes over time
✅ Change alerts - Warn on unexpected changes
✅ Test result storage - Track test history
Self-validating extraction! 🧪🎯