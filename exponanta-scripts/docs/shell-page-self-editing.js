page.html
├── <head>
│   ├── <title>                        from £data slug title
│   ├── <meta name="description">      from £data.description
│   └── <script type="application/ld+json">   JSON-LD, from £data
│
└── <body>
    │
    ├── <nav id="page-nav" aria-label="In this page" hidden>
    │   └── <ol>
    │       ├── <li><a href="#slug-1">Section one</a>
    │       ├── <li><a href="#slug-2">Section two</a>
    │       └── <li><a href="#slug-3">Section three</a>
    │
    ├── <article id="content">
    │   ├── <h1>                        from £data.title, read_only
    │   │
    │   ├── <h2 id="slug-1">            from _index[0].slug + title
    │   ├── <p>...</p>                  AI-generated content
    │   ├── <h3>...</h3>                AI-generated, not in _index
    │   ├── <p>...</p>
    │   │
    │   ├── <h2 id="slug-2">            from _index[1].slug + title
    │   ├── <p>...</p>
    │   │
    │   └── <h2 id="slug-3">            from _index[2].slug + title
    │       └── <p>...</p>
    │
    ├── <script type="application/json" id="page-data">
    │   {
    │     "title":       "...",          read_only
    │     "slug":        "...",          read_only
    │     "description": "...",          ai-editable
    │     "keywords":   [...],           read_only
    │     "audience":   "...",           read_only
    │     "_index": [
    │       {
    │         "key":     "abc1",         opaque, permanent
    │         "slug":    "slug-1",       derived from title
    │         "title":   "Section one",  ai-editable
    │         "order":   0,              reorderable
    │         "words":   300,            tracked
    │         "summary": "...",          ai-generated, sibling context
    │         "hash":    "a3f9",         stale detection
    │         "locked":  false           maps to read_only
    │       }
    │     ]
    │   }
    │
    └── <script id="page-behavior">
        const PAGE = JSON.parse(
          document.getElementById('page-data').textContent
        );

        // show page-nav if enough sections
        if (PAGE._index.length >= 4)
          document.getElementById('page-nav')
            .removeAttribute('hidden');

        // build page-nav from _index
        document.querySelector('#page-nav ol').innerHTML =
          PAGE._index
            .map(s => `<li><a href="#${s.slug}">${s.title}</a></li>`)
            .join('');

Rules that fall out of this tree
read_only: 1    →  never in AI payload, never in page-nav, never editable
_index          →  source of truth for page-nav, editor sidebar, AI context
page-nav        →  derived from _index, never hand-written
h2 id           →  always = _index[n].slug, generated not hand-written
h3 and below    →  inside article content, invisible to _index
key             →  permanent, opaque, internal only
slug            →  derived from title, used in HTML only
page-behavior   →  never sent to AI, frozen