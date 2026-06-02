(()=>{
  const cssClasses = new Set();

  async function run() {
    for (const ss of [...document.styleSheets]) {
      if (!ss.href) {
        // inline — cssRules works
        try { [...ss.cssRules].forEach(r => r.selectorText?.match(/\.([\w-]+)/g)?.forEach(c => cssClasses.add(c.slice(1)))); }
        catch {}
        continue;
      }
      try {
        const text = await fetch(ss.href).then(r => r.text());
        [...text.matchAll(/\.([\w-]+)\s*[{,:\[]/g)].forEach(m => cssClasses.add(m[1]));
      } catch {}
    }

    const issues = {};
    document.querySelectorAll('*').forEach(el => {
      [...el.classList].forEach(cls => {
        if (!cssClasses.has(cls)) {
          if (!issues[cls]) issues[cls] = { count: 0, example: el.outerHTML.slice(0, 120) };
          issues[cls].count++;
        }
      });
    });

    console.log('=== UNKNOWN CLASSES ===');
    Object.entries(issues)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([cls, { count, example }]) => console.log(`\n.${cls} (x${count})\n  ${example}`));
  }

  run();
})();

/*
undefined
VM51:13 Fetch finished loading: GET "https://rsms.me/inter/inter.css".
run @ VM51:13
(anonymous) @ VM51:34
(anonymous) @ VM51:35
VM51:13 Fetch finished loading: GET "https://cdn.jsdelivr.net/npm/@tabler/core@1.4.0/dist/css/tabler.min.css".
run @ VM51:13
await in run
(anonymous) @ VM51:34
(anonymous) @ VM51:35
VM51:28 === UNKNOWN CLASSES ===
VM51:31 
.footer-link (x34)
  <a href="/our-approach.html" class="text-white-50 text-decoration-none footer-link">Our
                  Approach</a>
VM51:31 
.navbar-light (x1)
  <header class="navbar navbar-expand-lg navbar-light sticky-top" style="background: #fff; border-bottom: 1px solid #e6e7e
VM51:13 Fetch finished loading: GET "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css".
run @ VM51:13
await in run
(anonymous) @ VM51:34
(anonymous) @ VM51:35
VM51:13 Fetch finished loading: GET "https://cdn.jsdelivr.net/npm/@tabler/core@1.4.0/dist/css/tabler-marketing.min.css".
run @ VM51:13
await in run
(anonymous) @ VM51:34
(anonymous) @ VM51:35
VM51:13 Fetch finished loading: GET "https://exponanta.com/assets/added.css".
run @ VM51:13
await in run
(anonymous) @ VM51:34
(anonymous) @ VM51:35*/