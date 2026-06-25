// components/Counter.js
(function () {
  const { createElement: h, useState } = React;

  function Counter({ vscode }) {
    const [count, setCount] = useState(0);

    const btn = (label, onClick) => h('button', {
      onClick,
      style: {
        background: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        border: 'none', borderRadius: 3,
        padding: '4px 14px', margin: '0 4px', cursor: 'pointer', fontSize: 16
      }
    }, label);

    return h('div', null,
      h('h2', { style: { marginBottom: 16 } }, 'Counter Component'),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
        btn('−', () => setCount(c => c - 1)),
        h('span', { style: { fontSize: 28, minWidth: 40, textAlign: 'center' } }, count),
        btn('+', () => setCount(c => c + 1)),
        btn('Reset', () => {
          setCount(0);
          vscode.postMessage({ type: 'alert', text: 'Counter reset!' });
        })
      )
    );
  }

  window.CW_Components.Counter = Counter;
})();
