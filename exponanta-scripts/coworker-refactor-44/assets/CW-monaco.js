// ============================================================
// CW-monaco.js — Monaco console for CW framework
// Add after CW-ui.js in app.html
// Activate: CW.monaco() or ?console=1 in URL
// ============================================================

//(function() {

const MONACO_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs";

const STYLES = `
    #cw-monaco-wrap {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 9999; display: flex; flex-direction: column;
      background: #0f0f13;
    }
    #cw-monaco-toolbar {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 12px; background: #16161e;
      border-bottom: 1px solid #2a2a3a; flex-shrink: 0;
    }
    #cw-monaco-toolbar button {
      font-size: 12px; padding: 3px 10px;
      border: 1px solid #2a2a3a; background: #1e1e2e;
      color: #a0a0c0; cursor: pointer; border-radius: 3px;
      font-family: monospace;
    }
    #cw-monaco-toolbar button:hover { background: #2a2a3a; color: #e0e0e0; }
    #cw-monaco-toolbar button.primary { background: #3b5bdb; border-color: #3b5bdb; color: #fff; }
    #cw-monaco-toolbar .sep { width: 1px; height: 20px; background: #2a2a3a; }
    #cw-monaco-toolbar .label { font-size: 11px; color: #555; font-family: monospace; }
    #cw-monaco-main { display: flex; flex: 1; overflow: hidden; }
    #cw-monaco-editor { flex: 1; }
    #cw-monaco-output {
      width: 380px; overflow-y: auto; padding: 8px;
      border-left: 1px solid #2a2a3a;
      font-size: 11px; font-family: monospace;
      display: flex; flex-direction: column; gap: 3px;
    }
    #cw-monaco-status {
      font-size: 11px; color: #555; padding: 3px 12px;
      background: #16161e; border-top: 1px solid #2a2a3a;
      font-family: monospace; flex-shrink: 0;
    }
    .cw-out-log    { color: #aaa; white-space: pre-wrap; word-break: break-all; padding: 2px 4px; }
    .cw-out-error  { color: #ef5350; background: #1a0a0a; padding: 2px 4px; border-radius: 2px; white-space: pre-wrap; }
    .cw-out-result { color: #7b9fff; background: #0a0a1a; padding: 2px 4px; border-radius: 2px; white-space: pre-wrap; word-break: break-all; }
    .cw-out-sep    { border: none; border-top: 1px solid #2a2a3a; margin: 4px 0; }
  `;

const DEFAULT_CODE = `// CW Console — Ctrl+Enter to run
// Globals: CW, pb, run, authLogin

const r = await CW.run({
  operation:      'select',
  target_doctype: 'Run',
  query:          { where: {} },
  options:        { render: false },
});
console.log('runs:', r.target.data.length);
r.target.data;
`;

let _editor = null;
let _mounted = false;
const _origLog = console.log.bind(console);
const _origErr = console.error.bind(console);

function _injectStyles() {
  if (document.getElementById("cw-monaco-styles")) return;
  const s = document.createElement("style");
  s.id = "cw-monaco-styles";
  s.textContent = STYLES;
  document.head.appendChild(s);
}

function _appendOut(text, cls) {
  const out = document.getElementById("cw-monaco-output");
  if (!out) return;
  const el = document.createElement("div");
  el.className = cls;
  el.textContent = text;
  out.appendChild(el);
  out.scrollTop = out.scrollHeight;
}

function _setStatus(msg) {
  const s = document.getElementById("cw-monaco-status");
  if (s) s.textContent = msg;
}

function _serialize(val) {
  if (val === undefined) return "undefined";
  if (val === null) return "null";
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

function _hookConsole() {
  console.log = (...args) => {
    _origLog(...args); // still goes to browser too
    _appendOut(
      args
        .map((a) => (typeof a === "object" ? _serialize(a) : String(a)))
        .join(" "),
      "cw-out-log",
    );
  };
  console.error = (...args) => {
    _origErr(...args);
    _appendOut(args.map(String).join(" "), "cw-out-error");
  };
}

function _restoreConsole() {
  console.log = _origLog;
  console.error = _origErr;
}
/* new 
async function _runCode() {
  CW._run = CW._run || {};
  const lineNum = _editor._glyphLine || 1;
  _editor._glyphLine = null;
  const lines = _editor.getValue().split("\n");
  const src = ["const run = CW._run;", ...lines.slice(lineNum - 1)].join("\n");
  const out = document.getElementById("cw-monaco-output");
  if (out) {
    const sep = document.createElement("hr");
    sep.className = "cw-out-sep";
    out.appendChild(sep);
  }
  _setStatus("running…");
  try {
    const result = await new Function(`return (async () => { ${src} })()`)();
    if (result !== undefined) _appendOut(_serialize(result), "cw-out-result");
    _setStatus("done — " + new Date().toLocaleTimeString());
  } catch (e) {
    _appendOut(e.stack || e.message, "cw-out-error");
    _setStatus("error: " + e.message);
  }
}*/

async function _runCode() {
  CW._run = CW._run || {};
  const run = CW._run;
  const lineNum = _editor._glyphLine || 1;
  _editor._glyphLine = null;
  const lines = _editor.getValue().split("\n");
  const src = lines.slice(lineNum - 1).join("\n");
  const out = document.getElementById("cw-monaco-output");
  if (out) {
    const sep = document.createElement("hr");
    sep.className = "cw-out-sep";
    out.appendChild(sep);
  }
  _setStatus("running…");
  try {
    const result = await eval(`(async () => { ${src} })()`);
    if (result !== undefined) _appendOut(_serialize(result), "cw-out-result");
    _setStatus("done — " + new Date().toLocaleTimeString());
  } catch (e) {
    _appendOut(e.stack || e.message, "cw-out-error");
    _setStatus("error: " + e.message);
  }
}

function _buildUI() {
  _injectStyles();

  const wrap = document.createElement("div");
  wrap.id = "cw-monaco-wrap";
  wrap.innerHTML = `
      <div id="cw-monaco-toolbar">
        <span class="label" style="color:#7b9fff; font-weight:bold;">CW Console</span>
        <div class="sep"></div>
        <button class="primary" id="cw-btn-run">▶ Run <span style="opacity:.5">Ctrl+Enter</span></button>
        <button id="cw-btn-clear-out">Clear output</button>
        <button id="cw-btn-clear-editor">Clear editor</button>
        <div class="sep"></div>
        <button id="cw-btn-close">✕ Close</button>
      </div>
      <div id="cw-monaco-main">
        <div id="cw-monaco-editor"></div>
        <div id="cw-monaco-output"></div>
      </div>
      <div id="cw-monaco-status">ready</div>
    `;
  document.body.appendChild(wrap);

  document.getElementById("cw-btn-run").onclick = _runCode;
  document.getElementById("cw-btn-clear-out").onclick = () => {
    document.getElementById("cw-monaco-output").innerHTML = "";
  };
  document.getElementById("cw-btn-clear-editor").onclick = () =>
    _editor?.setValue("");
  document.getElementById("cw-btn-close").onclick = CW.monaco.close;
}

function _initMonaco() {
  if (_editor) return;

  if (!window.require) {
    const loader = document.createElement("script");
    loader.src = MONACO_CDN + "/loader.js";
    loader.onload = _initMonaco;
    document.head.appendChild(loader);
    return;
  }

  require.config({ paths: { vs: MONACO_CDN } });
  require(["vs/editor/editor.main"], () => {
    monaco.editor.defineTheme("cw-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [{ token: "comment", foreground: "555566" }],
      colors: {
        "editor.background": "#0f0f13",
        "editor.foreground": "#e0e0e0",
        "editor.lineHighlightBackground": "#16161e",
        "editorLineNumber.foreground": "#333344",
        "editorCursor.foreground": "#7b9fff",
        "editor.selectionBackground": "#2a2a5a",
      },
    });

    _editor = monaco.editor.create(
      document.getElementById("cw-monaco-editor"),
      {
        value: DEFAULT_CODE,
        language: "javascript",
        theme: "cw-dark",
        fontSize: 14,
        fontFamily: "monospace",
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: 2,
        wordWrap: "on",
      },
    );

    // autocomplete — CW globals
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `
        declare const CW:        any;
        declare const pb:        any;
        declare const run:       Record<string, any>;
        declare const authLogin: (email: string, password: string) => Promise<any>;
        declare const authLogout: () => void;
        declare const generateId: (doctype: string, title?: string) => string;
      `,
      "cw-globals.d.ts",
    );

    _editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, _runCode);

    // expose last
    CW._editor = _editor;
    CW._editor.runCode = _runCode;

// ── setup ──────────────────────────────────────────────────
_editor.updateOptions({ glyphMargin: true });

if (!document.getElementById('cw-glyph-style')) {
  const s = document.createElement('style');
  s.id = 'cw-glyph-style';
  s.textContent = `.cw-step-glyph::before { content: '▶'; color: #3b5bdb; cursor: pointer; font-size: 11px; }`;
  document.head.appendChild(s);
}

_editor.onMouseMove(e => {
  if (!e.target.position) return;
  const line = e.target.position.lineNumber;
  _editor._decorations = _editor.deltaDecorations(_editor._decorations || [], [{
    range: new monaco.Range(line, 1, line, 1),
    options: { glyphMarginClassName: 'cw-step-glyph' }
  }]);
});

_editor.onMouseDown(e => {
  if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return;
  _editor._glyphLine = e.target.position.lineNumber;
  _runCode();
});

  });
}

// ── public API ────────────────────────────────────────────
CW.monaco = function () {
  if (_mounted) {
    document.getElementById("cw-monaco-wrap").style.display = "flex";
    return;
  }
  _buildUI();
  _hookConsole(); // ← once, permanent
  _initMonaco();
  _mounted = true;
};

CW.monaco.close = function () {
  const wrap = document.getElementById("cw-monaco-wrap");
  if (wrap) wrap.style.display = "none";
};

// auto-open if ?console=1
window.addEventListener("CW:booted", () => {
  if (new URLSearchParams(location.search).get("console") === "1") {
    CW.monaco();
  }
});

// keyboard shortcut: Ctrl+` to toggle
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "`") {
    const wrap = document.getElementById("cw-monaco-wrap");
    if (!wrap || wrap.style.display === "none") CW.monaco();
    else CW.monaco.close();
  }
});


