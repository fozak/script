# CW Media Architecture — Summary

## The Core Problem

PocketBase stores files flat per record with opaque suffixes:
```
task2neryapdg9t/hero_image_nprqlzsq66.jpg
```
The suffix is uncontrollable. The file is trapped inside one record. No reuse, no deduplication, no semantic addressing beyond the field name prefix PB adds automatically.

---

## What PB Already Gives You

The field name prefix **is** the semantic slot — for free:
```
hero_image_nprqlzsq66.jpg   → slot: hero_image
og_image_abcd1234.jpg       → slot: og_image
gallery_aa11.jpg            → slot: gallery (bag)
```
For single-file fields, slot is fully recoverable by stripping the suffix. This is the **slot-based naming** pattern used by Directus, Strapi, and PocketBase natively.

---

## Content Tree

All non-file content lives in a `content` JSON field as a flat array of semantic nodes:
```json
[
  { "t": "heading",  "text": "Kitchen Renovation Boston" },
  { "t": "lead",     "text": "Complete gut renovation..." },
  { "t": "img",      "slot": "hero" },
  { "t": "gallery",  "slot": "gallery" },
  { "t": "body",     "text": "..." },
  { "t": "cta",      "label": "Get a Quote", "href": "/contact" }
]
```

Node types are **semantic, not presentational** — `heading` not `h1`, `lead` not `p.lead`. Template decides HTML output. Content tree is target-agnostic.

### Universal node vocabulary
`heading`, `lead`, `body`, `h2`, `img`, `gallery`, `compare`, `cards`, `barlist`, `badgelist`, `timeline`, `callout`, `cta`, `divider`

---

## Asset-to-DOM Mapping

Three layers, each with a clear responsibility:

| Layer | Pattern | Covers |
|---|---|---|
| `<img src>` | resolved at build time | ~60% of cases |
| CSS `background-image` | CSS custom properties from manifest | ~25% |
| `<video>`, `<audio>`, `<a download>` | same manifest, mime-driven | ~15% |

### Renderer
```js
function renderNode(node, resolvedMap) {
  switch (node.t) {
    case 'img':     return renderSlot(node.slot, resolvedMap)
    case 'gallery': return `<div class="gallery">${renderSlot(node.slot, resolvedMap)}</div>`
    // ... other node types
  }
}
```

### CSS custom properties (build-generated)
```css
:root {
  --asset-hero:  url('/media/hero_nprqlzsq66.jpg');
  --asset-thumb: url('/media/thumb_abcd1234.jpg');
}
```

---

## Doctype Schema

File fields carry semantic metadata — not PB columns, just doctype definition:
```json
{
  "doctype": "BlogPost",
  "fields": [
    { "name": "hero_image",  "type": "file", "role": "hero",  "required": true  },
    { "name": "og_image",    "type": "file", "role": "og"                        },
    { "name": "gallery",     "type": "files","role": "gallery"                   }
  ]
}
```

`_compileDocument` auto-populates `run_doc._assets` from field definitions — no manual maintenance.

---

## Reuse — The Real Problem

Files on a record cannot be reused across documents. Three patterns evaluated:

### Pattern 1 — Parent record as project media library
```
content2342r43fcwds/          ← parent owns all files
  content2342r43fcwds_hero_nprqlzsq66.jpg
  content2342r43fcwds_gallery_aa11.jpg
```
Child docs reference parent ID + slot. Works for small projects (<20 pages, isolated scope). Breaks at scale — parent becomes a dump, slot collision across children, deletion risk, cross-project reuse still impossible.

### Pattern 2 — Dedicated Media subdoctype
```json
{
  "doctype":    "Content",
  "docsubtype": "Media",
  "file":       "hero_nprqlzsq66.jpg",
  "alt":        "Boston kitchen renovation",
  "tags":       ["kitchen", "hero"]
}
```
Any doc references media by ID in `content_map`. Full reuse across projects, deletion-safe, single source of truth. Build step resolves all refs to a manifest.

**Verdict: not deserved yet.** This is a standard CMS relation field — no unique value until files genuinely need to exist independently of any owning document (brand assets, stock photos, shared logos).

### Pattern 3 — Current recommendation
Files stay on the owning document. Other docs reference that document directly. No intermediate Media layer needed until cross-document reuse becomes a real business problem.

---

## In CW Terms

Everything fits inside the existing architecture:

| Concept | CW implementation |
|---|---|
| Media library | `Content/Media` subdoctype when needed |
| Slot names | Field names on doctype |
| Content tree | `content` JSON field on item record |
| Asset resolution | `_compileDocument` pass at build/render time |
| Reuse | Relation field pointing to another item ID |
| RBAC | Standard `_allowed` / `_allowed_read` |
| Lifecycle | FSM `_state`: draft → approved → archived |
| Static pages | Build-time manifest, zero runtime queries |

---

## Build Flow

```
PB item records
      ↓
Build script queries all items + resolves file URLs
      ↓
media-manifest.json  { "mediaherob0st0n": { url, alt, width, height, mime } }
      ↓
Renderer walks content[] → node.slot → manifest → URL → HTML element
      ↓
CSS vars generated from manifest → background images
      ↓
Static HTML output — zero runtime PB dependency
```

---

## Closest Industry Analogy

**Sanity** — schema in code, Portable Text content tree, asset references within tree, `urlFor()` helper mirrors `resolveSlot()`. Key difference: Sanity asset refs are decoupled from documents by default; CW defers that separation until reuse is a proven business need.

---

## Decision Rule

> Add a `Media` subdoctype when a file needs to exist **independently of any single document**. Until then, files live on the document that owns them, and other documents reference that document.
