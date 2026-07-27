Yes — currently the notebook code lives only in Monaco's editor model (memory). On page reload it's gone.
You need to persist the notebook code to a Run record in PocketBase on every change, and load it back on open.
Two hooks:

onDidChangeModelContent — save debounced to PocketBase
CW.monaco() open — fetch latest saved code and _editor.setValue()

The Run record is the notebook's persistent home. name field identifies it, steps or a custom code field stores the JS source.


with empty lines TODO:
jsconst src = [
  ...Array(lineNum - 1).fill(''),
  ...lines.slice(lineNum - 1)
].join('\n');
Line numbers in eval() match original notebook lines exactly. So parseInt(m[1]) + lineNum - 1 simplifies to just parseInt(m[1]) — no offset needed.
And lines[errLine - 1] already points to the correct line. No recalculation.const src = [ ...Array(lineNum - 1).fill(''), ...lines.slice(lineNum - 1) ].join('\n'); we need it as we run from glyph position, correct?Yes — glyph click sets lineNum to e.g. 5, so we slice from line 5. Without padding, line 5 becomes line 1 inside eval() — all line numbers shift.
Padding with lineNum - 1 empty lines restores original positions — line 5 stays line 5 inside eval().
For full run (lineNum = 1) — Array(0).fill('') = no padding, no change. ✅i holding that for now as TODOGood. Current state is working. TODOs:

Pad src with empty lines to preserve line numbers for glyph clicks
Simplify error line offset calculation after padding
console.log line tracking via new Error().stack or CW._currentLine instrumentation
Widget container for inline output positioning