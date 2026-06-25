const vscode = require('vscode');

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('myExtension.openPanel', () => {
      const panel = vscode.window.createWebviewPanel(
        'myPanel', 'Component Panel', vscode.ViewColumn.One,
        { enableScripts: true }
      );

      const csp = panel.webview.cspSource;

      panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${csp} https://unpkg.com; style-src 'unsafe-inline';">
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script>
    const { createElement: h, useState } = React;

    function Counter() {
      const [n, setN] = useState(0);
      return h('div', null,
        h('h2', null, 'Counter'),
        h('button', { onClick: () => setN(n - 1) }, '-'),
        h('span', { style: { margin: '0 12px' } }, n),
        h('button', { onClick: () => setN(n + 1) }, '+')
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(h(Counter));
  </script>
</body>
</html>`;
    })
  );
}

function deactivate() {}
module.exports = { activate, deactivate };
