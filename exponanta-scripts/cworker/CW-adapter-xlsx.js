// ============================================================
// CW-adapter-xlsx.js
// Transform adapter — parses xlsx files
// Reads: _fsIndex via target.data[0].name
// Writes: run_doc.input — flat fields, no namespace
// All functions: function(run_doc) — mutate only, no return.
// ============================================================

(() => {   //isolate scope


const XLSX_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
];

// ============================================================
// INIT
// ============================================================

async function _xlsxEnsureInit(run_doc) {
  if (typeof JSZip !== 'undefined') return true;
  await init(run_doc);
  return !run_doc.error;
}

async function init(run_doc) {
  if (typeof JSZip !== 'undefined') { run_doc.success = true; return; }
  try {
    for (const src of XLSX_SCRIPTS) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(s);
      });
    }
    run_doc.success = true;
  } catch (err) { run_doc.error = err.message; }
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

function _parseXml(str) {
  return new DOMParser().parseFromString(str, 'application/xml');
}

async function _getSharedStrings(zip) {
  const f = zip.file('xl/sharedStrings.xml');
  if (!f) return [];
  const xml = _parseXml(await f.async('string'));
  return [...xml.querySelectorAll('si')].map(si =>
    [...si.querySelectorAll('t')].map(t => t.textContent).join('')
  );
}

function _resolveCell(c, strings) {
  const v = c.querySelector('v')?.textContent ?? '';
  const f = c.querySelector('f')?.textContent;
  const t = c.getAttribute('t');
  if (f) return `=${f}`;
  if (t === 's') return strings[parseInt(v)] ?? '';
  if (t === 'b') return v === '1' ? 'TRUE' : 'FALSE';
  return v;
}

function _colIndex(ref) {
  const col = ref.replace(/[0-9]/g, '');
  return [...col].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
}

// ============================================================
// FIELD FUNCTIONS
// ============================================================

async function ai_content(run_doc, zip, strings) {
  const wbXml    = _parseXml(await zip.file('xl/workbook.xml').async('string'));
  const sheetEls = [...wbXml.querySelectorAll('sheet')];
  const parts    = ['<!-- unpacked excel file - resolved -->'];

  for (let si = 0; si < sheetEls.length; si++) {
    const sheetName = sheetEls[si].getAttribute('name');
    const sheetFile = zip.file(`xl/worksheets/sheet${si + 1}.xml`);
    if (!sheetFile) continue;

    const rows = [..._parseXml(await sheetFile.async('string')).querySelectorAll('row')];
    if (!rows.length) { parts.push(`\n<!-- sheet${si+1}: ${sheetName} -->\n(empty)`); continue; }

    const grid = []; let maxCol = 0;
    for (const row of rows) {
      const r = parseInt(row.getAttribute('r')) - 1;
      const rowData = {};
      for (const c of row.querySelectorAll('c')) {
        const ci = _colIndex(c.getAttribute('r'));
        rowData[ci] = _resolveCell(c, strings);
        if (ci > maxCol) maxCol = ci;
      }
      grid[r] = rowData;
    }

    const headers  = Array.from({ length: maxCol + 1 }, (_, c) => grid[0]?.[c] ?? String.fromCharCode(65 + c));
    const colTypes = new Array(maxCol + 1).fill(null);
    for (let r = 1; r < grid.length; r++) {
      if (!grid[r]) continue;
      for (let c = 0; c <= maxCol; c++) {
        const v = grid[r][c];
        if (v === undefined || v === '') continue;
        const t = /^\d{4}-\d{2}-\d{2}$/.test(v) ? 'date' : /^=/.test(v) ? 'formula' : isNaN(v) ? 'text' : 'number';
        colTypes[c] = colTypes[c] === null ? t : colTypes[c] !== t ? 'mixed' : t;
      }
    }

    parts.push(`\n<!-- sheet${si+1}: ${sheetName} | columns: ${headers.map((h,i) => `${h}:${colTypes[i]??'empty'}`).join(', ')} -->`);
    const lines = [];
    for (let r = 1; r < grid.length; r++) {
      if (!grid[r]) continue;
      lines.push(`${r+1}: ${Array.from({length: maxCol+1}, (_,c) => grid[r][c]??'').join(' | ')}`);
    }
    parts.push(lines.join('\n'));
  }

  run_doc.input.ai_content = parts.join('\n');  // ← was doc.input.xlsx.ai_content
}

async function sheet_names(run_doc, zip) {
  const wbXml = _parseXml(await zip.file('xl/workbook.xml').async('string'));
  run_doc.input.sheet_names = [...wbXml.querySelectorAll('sheet')].map(s => s.getAttribute('name'));  // ← was doc.input.xlsx.sheet_names
}

// ============================================================
// UPDATE — orchestrator
// Only runs if target.data[0] is an xlsx file
// ============================================================

async function update(run_doc) {
  if (!await _xlsxEnsureInit(run_doc)) return;

  const doc = run_doc.target?.data?.[0];
  if (!doc?.name) return;

  if (doc.extension !== 'xlsx') return;

  const rec = globalThis._fsIndex?.get(doc.name);
  if (!rec) return;

  try {
    const file    = await rec._handle.getFile();
    const buf     = await file.arrayBuffer();
    const zip     = await JSZip.loadAsync(buf);
    const strings = await _getSharedStrings(zip);

    await ai_content(run_doc, zip, strings);
    await sheet_names(run_doc, zip);

  } catch (err) {
    run_doc.error = err.message;
  }
}

// ============================================================
// SELF-REGISTER
// ============================================================

globalThis.Adapters      = globalThis.Adapters || {};
globalThis.Adapters.xlsx = { init, update, ai_content, sheet_names };

console.log('✅ CW-adapter-xlsx.js loaded');
})();
