// components/Hello.js
(function () {

  console.log('Hello.js loaded');
  const { createElement: h, useState } = React;

  function Hello({ vscode }) {
    const [name, setName] = useState('');

    function sendAlert() {
      vscode.postMessage({ type: 'alert', text: `Hello, ${name || 'world'}!` });
    }

    return h('div', null,
      h('h2', { style: { marginBottom: 12 } }, 'Hello Component'),
      h('input', {
        placeholder: 'Your name',
        value: name,
        onInput: e => setName(e.target.value),
        style: {
          background: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: 3, padding: '4px 8px', marginRight: 8
        }
      }),
      h('button', {
        onClick: sendAlert,
        style: {
          background: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: 'none', borderRadius: 3, padding: '4px 12px', cursor: 'pointer'
        }
      }, 'Greet')
    );
  }

  window.CW_Components.Hello = Hello;
})();
