// app.js — runs inside the webview (browser context)
(function () {
  const { createElement: h } = React;
  const mount = document.getElementById('mount');
  let root = null;

  const vscode = acquireVsCodeApi();

  window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.type === 'init') console.log('[webview] init:', msg.data);
  });

  // DO NOT reset CW_Components here — Hello.js and Counter.js already ran
  // and registered themselves before app.js loaded.

  function renderComponent(name) {
    const Comp = (window.CW_Components || {})[name];
    if (!Comp) {
      mount.innerHTML = `<p style="color:salmon">Component "${name}" not found. Registered: ${Object.keys(window.CW_Components||{}).join(', ')}</p>`;
      return;
    }
    if (!root) root = ReactDOM.createRoot(mount);
    root.render(h(Comp, { vscode }));
  }

  const nav = document.getElementById('nav');
  let active = nav.querySelector('.active')?.dataset.component || null;

  nav.addEventListener('click', e => {
    const btn = e.target.closest('[data-component]');
    if (!btn) return;
    nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    active = btn.dataset.component;
    renderComponent(active);
  });

  // Scripts are already loaded synchronously before app.js runs, so render immediately
  if (active) renderComponent(active);

})();
