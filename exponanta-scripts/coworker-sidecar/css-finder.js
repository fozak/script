// https://claude.ai/chat/4b258ca5-d972-4c17-a949-935f86ffd5dc


(()=>{
  const term = 'avatar'; // change per component
  const PRE = 20;
  function extractBlocks(text) {
    const re = new RegExp(term, 'gi');
    const blocks = [];
    let match, lastEnd = -1;
    while ((match = re.exec(text)) !== null) {
      const start = Math.max(0, match.index - PRE);
      const end = text.indexOf('}', match.index) + 1 || text.length;
      if (blocks.length && start <= lastEnd) blocks[blocks.length-1].end = Math.max(lastEnd, end);
      else blocks.push({ start, end });
      lastEnd = blocks[blocks.length-1].end;
    }
    return blocks.map(b => text.slice(b.start, b.end));
  }
  [...document.styleSheets].filter(ss => ss.href).forEach(async ss => {
    const text = await fetch(ss.href).then(r => r.text());
    const blocks = extractBlocks(text);
    if (!blocks.length) return;
    const header = text.match(/\/\*![\s\S]*?\*\//)?.[0] || '';
    console.log(`\nURL: ${ss.href}`);
    if (header) console.log(`HEADER:\n${header}`);
    blocks.forEach((b, i) => console.log(`\n--- block ${i+1} ---\n${b}`));
  });
})();


/*Decision tree for custom CSS:

Does Tabler have this component?
├── NO → custom justified, keep it
└── YES → can you match visually with classes only?
    ├── YES → use Tabler, drop custom
    └── NO → can you match with CSS var overrides?
        ├── 1-2 vars → use Tabler + inline vars
        ├── 3+ vars → keep named custom class, cleaner
        └── border/color quirks → keep custom
Findings for your page:

Custom class	Decision
kicker-pill + kicker-dot	→ badge badge-pill bg-primary-lt + badge-dot
feature-list	→ border-start border-3 border-primary ps-3
collage-main, collage-small	→ keep, no equivalent
stats-card, stat-val, stat-label	→ keep, no equivalent
step-number	→ keep, no equivalent
avatar-stack, avatar-more	→ avatar-list avatar-list-stacked + plain avatar
Key insight: compiled CSS is the only ground truth. SCSS source, docs, and template HTML can all diverge from what the browser actually uses.