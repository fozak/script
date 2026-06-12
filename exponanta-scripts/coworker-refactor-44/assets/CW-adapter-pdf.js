// ============================================================
// CW-adapter-pdf.js
// Transform adapter — parses PDF files
// Reads: _fsIndex via target.data[0].name
// Writes: run_doc.input — flat fields, no namespace
// All functions: function(run_doc) — mutate only, no return.
// ============================================================

const PDF_SCRIPTS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
];

const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function init(run_doc) {
  if (globalThis.pdfjsLib) { run_doc.success = true; return; }
  try {
    for (const src of PDF_SCRIPTS) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(s);
      });
    }
    globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    run_doc.success = true;
  } catch (err) {
    run_doc.error = err.message;
  }
}

// ============================================================
// INIT
// ============================================================

async function _pdfEnsureInit(run_doc) {
  if (globalThis.pdfjsLib) return true;
  await init(run_doc);
  return !run_doc.error;
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

async function _loadPdf(buf) {
  const loadingTask = globalThis.pdfjsLib.getDocument({ data: buf });
  return loadingTask.promise;
}

async function _extractPageText(page) {
  const content = await page.getTextContent();
  const lines = {};
  for (const item of content.items) {
    if (!item.str?.trim()) continue;
    const y = Math.round(item.transform[5]);
    if (!lines[y]) lines[y] = [];
    lines[y].push(item.str);
  }
  return Object.keys(lines)
    .sort((a, b) => b - a)
    .map(y => lines[y].join(' '))
    .filter(Boolean)
    .join('\n');
}

async function _extractFormFields(page) {
  const annotations = await page.getAnnotations();
  return annotations
    .filter(a => a.subtype === 'Widget')
    .map(a => ({
      field:    a.fieldName || a.alternativeText || '',
      value:    Array.isArray(a.fieldValue) ? a.fieldValue.join(', ') : (a.fieldValue || ''),
      type:     a.fieldType || 'text',
      required: !!a.required,
    }))
    .filter(f => f.field);
}

// ============================================================
// FIELD FUNCTIONS
// ============================================================

async function ai_content(run_doc, pdf) {
  const parts = ['<!-- unpacked pdf file - resolved -->'];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page   = await pdf.getPage(i);
    const text   = await _extractPageText(page);
    const fields = await _extractFormFields(page);

    if (fields.length) {
      parts.push(`\n<!-- page ${i} | form fields -->`);
      for (const f of fields) {
        parts.push(`field: ${f.field} | value: ${f.value} | type: ${f.type}${f.required ? ' | required' : ''}`);
      }
      if (text) {
        parts.push(`\n<!-- page ${i} | text -->`);
        parts.push(text);
      }
    } else if (text) {
      parts.push(`\n<!-- page ${i} -->`);
      parts.push(text);
    } else {
      parts.push(`\n<!-- page ${i} -->\n(empty)`);
    }
  }

  run_doc.input.ai_content = parts.join('\n');
}

async function page_count(run_doc, pdf) {
  run_doc.input.page_count = pdf.numPages;
}

async function form_fields(run_doc, pdf) {
  const fields = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page       = await pdf.getPage(i);
    const pageFields = await _extractFormFields(page);
    fields.push(...pageFields.map(f => ({ ...f, page: i })));
  }

  run_doc.input.form_fields = fields;
}

// ============================================================
// UPDATE — orchestrator
// Only runs if target.data[0] is a pdf file
// ============================================================

async function update(run_doc) {
  if (!await _pdfEnsureInit(run_doc)) return;

  const doc = run_doc.target?.data?.[0];
  if (!doc?.name) return;

  if (doc.extension !== 'pdf') return;

  const rec = globalThis._fsIndex?.get(doc.name);
  if (!rec) return;

  try {
    const file = await rec._handle.getFile();
    const buf  = await file.arrayBuffer();
    const pdf  = await _loadPdf(buf);

    await ai_content(run_doc, pdf);
    await page_count(run_doc, pdf);
    await form_fields(run_doc, pdf);

  } catch (err) {
    run_doc.error = err.message;
  }
}

// ============================================================
// SELF-REGISTER
// ============================================================

globalThis.Adapters     = globalThis.Adapters || {};
globalThis.Adapters.pdf = { init, update, ai_content, page_count, form_fields };

console.log('✅ CW-adapter-pdf.js loaded');