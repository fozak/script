// ============================================================
// CW-adapter-xlsx.js
// XLSX transform adapter — extracts computed fields from xlsx files
// Reads file content from _fsIndex via run_doc.target.data[0].name
// Writes results to run_doc.target.data[0]._computed.xlsx
// All functions: function(run_doc) — mutate only, no return.
// ============================================================

const XLSX_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
];

// ============================================================
// INIT — load CDN dependencies if not already present
// ============================================================

async function _xlsxEnsureInit(run_doc) {
  if (typeof JSZip !== 'undefined') return true;
  await init(run_doc);
  return !run_doc.error;
}

async function init(run_doc) {
  if (typeof JSZip !== 'undefined') {
    run_doc.success = true;
    return;
  }
  try {
    for (const src of XLSX_SCRIPTS) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(s);
      });
    }
    run_doc.success = true;
  } catch (err) {
    run_doc.error = err.message;
  }
}

// ============================================================
// INTERNAL — get ArrayBuffer from _fsIndex
// ============================================================

async function _getBuffer(name) {
  const rec = globalThis._fsIndex?.get(name);
  if (!rec) throw new Error(`File not in _fsIndex: ${name}`);
  const file = await rec._handle.getFile();
  return file.arrayBuffer();
}

// ============================================================
// INTERNAL — parse helpers
// ============================================================

function _parseXml(str) {
  return new DOMParser().parseFromString(str, 'application/xml');
}

async function _loadZip(buf) {
  return JSZip.loadAsync(buf);
}

async function _getSharedStrings(zip) {
  const f = zip.file('xl/sharedStrings.xml');
  if (!f) return [];
  const xml = _parseXml(await f.async('string'));
  return [...xml.querySelectorAll('si')].map(si =>
    [...si.querySelectorAll('t')].map(t => t.textContent).join('')
  );
}

async function _getSheetNames(zip) {
  const wbXml = _parseXml(await zip.file('xl/workbook.xml').async('string'));
  return [...wbXml.querySelectorAll('sheet')].map(s => s.getAttribute('name'));
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
// FIELD FUNCTIONS — one per _computed.xlsx field
// Each receives (run_doc, zip, strings) — already parsed
// Writes to run_doc.target.data[0]._computed.xlsx[fieldname]
// ============================================================

async function ai_content(run_doc, zip, strings) {
  const sheetEls = [..._parseXml(await zip.file('xl/workbook.xml').async('string')).querySelectorAll('sheet')];
  const parts = ['<!-- unpacked excel file - resolved -->'];

  for (let si = 0; si < sheetEls.length; si++) {
    const sheetName = sheetEls[si].getAttribute('name');
    const sheetFile = zip.file(`xl/worksheets/sheet${si + 1}.xml`);
    if (!sheetFile) continue;

    const wsXml = _parseXml(await sheetFile.async('string'));
    const rows  = [...wsXml.querySelectorAll('row')];

    if (!rows.length) {
      parts.push(`\n<!-- sheet${si + 1}: ${sheetName} -->\n(empty)`);
      continue;
    }

    const grid = [];
    let maxCol = 0;
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

    const headers = [];
    for (let c = 0; c <= maxCol; c++) {
      headers[c] = grid[0]?.[c] ?? String.fromCharCode(65 + c);
    }

    const colTypes = new Array(maxCol + 1).fill(null);
    for (let r = 1; r < grid.length; r++) {
      if (!grid[r]) continue;
      for (let c = 0; c <= maxCol; c++) {
        const v = grid[r][c];
        if (v === undefined || v === '') continue;
        const t = /^\d{4}-\d{2}-\d{2}$/.test(v) ? 'date'
                : /^=/.test(v)                   ? 'formula'
                : isNaN(v)                        ? 'text'
                : 'number';
        if (colTypes[c] === null) colTypes[c] = t;
        else if (colTypes[c] !== t) colTypes[c] = 'mixed';
      }
    }

    const colTypeSummary = headers.map((h, i) => `${h}:${colTypes[i] ?? 'empty'}`).join(', ');
    parts.push(`\n<!-- sheet${si + 1}: ${sheetName} | columns: ${colTypeSummary} -->`);

    const lines = [];
    for (let r = 1; r < grid.length; r++) {
      if (!grid[r]) continue;
      const vals = [];
      for (let c = 0; c <= maxCol; c++) vals.push(grid[r][c] ?? '');
      lines.push(`${r + 1}: ${vals.join(' | ')}`);
    }
    parts.push(lines.join('\n'));
  }

  const doc = run_doc.target.data[0];
  if (!doc._computed) doc._computed = {};
  if (!doc._computed.xlsx) doc._computed.xlsx = {};
  doc._computed.xlsx.ai_content = parts.join('\n');
}

async function sheet_names(run_doc, zip) {
  const names = await _getSheetNames(zip);
  const doc = run_doc.target.data[0];
  if (!doc._computed) doc._computed = {};
  if (!doc._computed.xlsx) doc._computed.xlsx = {};
  doc._computed.xlsx.sheet_names = names;
}

// ============================================================
// UPDATE — orchestrator, calls all field functions
// ============================================================

async function update(run_doc) {
  if (!await _xlsxEnsureInit(run_doc)) return;

  const doc = run_doc.target?.data?.[0];
  if (!doc?.name) {
    run_doc.error = '400 xlsx.update: no file record in target';
    return;
  }

  try {
    const buf     = await _getBuffer(doc.name);
    const zip     = await _loadZip(buf);
    const strings = await _getSharedStrings(zip);

    // call all registered field functions
    const ops = { ai_content, sheet_names };
    for (const [, fn] of Object.entries(ops)) {
      await fn(run_doc, zip, strings);
    }

    run_doc.success = true;
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