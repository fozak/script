# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`cworker` is the **CW ("Coworker") framework hub**: a Cloudflare Worker (`hub-cf`) that serves the framework's static files *and* executes DB operations against Cloudflare D1. It is a flat folder (no `src/`, no `package.json`) inside the larger git repo rooted at `C:/python/script`. Many files are backups/variants (`*.bak`, `*.v1.js`, `* - Copy.js`, `sync-*.log`); the live ones are listed in `remote-boot.js` `FILES`.

## Commands

No package.json; tools are run directly.

- Dev / deploy: `npx wrangler dev`, `npx wrangler deploy` (config: `wrangler.toml`; D1 binding `DB` = `nesen-d1`; `JWT_SECRET` comes from Worker secrets, not the repo). `.wrangler/` holds local D1 state.
- Node tests (Node 22+, uses `node:test` + `node:sqlite`): `node --test node-tests.js`
  - Single test: `node --test --test-name-pattern="framework loaded" node-tests.js`
  - Load framework from local files instead of the hub: `CW_HUB=./ node --test node-tests.js` (path must end with `/` or `\`)
- Worker tests (Miniflare/workerd): `node worker-tests.js`. It expects `harness-worker.js` and `../ddl.sql`, which are **not in this folder** — they must be supplied first.
- Browser tests: open `browser-test.html` (logs a `TEST-RESULT` line, sets `window.__TEST_RESULTS__`). `44.8-tests.js` is the older in-browser suite.
- Rebuild bundled React widgets: `node editor-build.mjs` (BlockNote → `editor.js`/`editor.css`) and `node filepicker-build.mjs` (→ `filepicker.js`). Source is `editor.jsx` / `filepicker.jsx`; outputs are committed (`editor.js` is ~2 MB — do not hand-edit or read it whole).

## Code rules

**Read [CODERULES.md](CODERULES.md) before changing any framework file** (`CW-state.js`, `CW-config.js`, `CW-utils.js`, `CW-run.js`, `CW-adapter-d1.js`, `worker.js`). It holds the 10 core patterns, signatures, and a list of known code-vs-rule drift. Where it says the code wins over `CW-CODING-RULES-v4.md`, follow the code. Short version: every pipeline function takes `(run_doc)` and mutates it, no new `run_doc` properties, components use `run_doc.child()` not `CW.run()`, make only the requested change.

## Architecture

**One framework, three runtimes (browser / Node / Worker), one file list.** `remote-boot.js` holds `FILES`, the single source of truth for load order: `CW-state → CW-slugify → CW-config → CW-utils → CW-run → CW-adapter-d1 → boot`.
- Browser: `<script>` tags from the hub.
- Node: `CW_loadFramework(hub)` fetches/reads files and evals with `vm` (see `node-setup.js`, which swaps D1 for in-memory SQLite built from the real `item` DDL).
- Worker: no runtime code loading, so `worker.js` statically `import`s the same files in the same order. **If you add/reorder a framework file, update both `remote-boot.js` `FILES` and the imports in `worker.js`.**

**Pipeline and `run_doc`.** Everything goes through `CW.run(run_doc)` (`CW-run.js`). The browser runs the full controller pipeline (resolve → fetch → log → merge → clear input → handler) and the adapter writes to `target.data[0]`. Phases and `run_doc` shape are specified in `CW-CLAUDE-RULES - instead of coding rules PREAMBLE-v2.md` — read it before touching `CW-run.js`/`CW-utils.js`; do not add ad-hoc `run_doc` fields.

**Worker is an adapter executor, not a controller.** On POST, `worker.js` only verifies the JWT, stamps `user.domain` from the `Origin` header, then calls `Adapters[adapter][operation](run_doc)` and returns the mutated `run_doc`. Never call `CW.controller`/`CW.run` there — it re-runs the pipeline and wipes the already-merged input (rationale in `doc.44.6.md`). GET routes come from `CW._config.routes` (OAuth login/callback, `shell`); anything else falls through to static `ASSETS`.

**Isomorphic adapters.** `CW-adapter-d1.js` checks `globalThis.env?.DB`: present → run SQL on D1 (Worker/Node test); absent (browser) → `_post` the `run_doc` to the hub. Same function, two paths. Other adapters: `-fs`, `-pdf`, `-xlsx`, `pb-adapter-pocketbase.js` (legacy; `index.js` is the older PocketBase bootstrap, `boot.js` the current one).

**Data model.** One D1 table `item` (see `CREATE TABLE item (.txt`): fixed columns plus a JSON `data` column, with `_allowed`/`_allowed_read` JSON arrays for ACL and `domain` for multi-tenancy (`domain-field-ACL-multitenancy.txt`). Doctype schemas, roles and routes live in `CW-config.js` (`CW._config`, `CW.Schema`); `config.json` is an older copy.

**Slugify** (`CW-slugify.js`, ~290 KB, generated bundle) is an optional addon; `generateSlug` in `CW-utils.js` falls back to a regex slug without it.

## Working conventions

`CLAUDE-PROTOCOL-use with preambule.txt` defines the intended session loop: state Task/Files/Verify → Claude replies with WILL CHANGE / WILL NOT TOUCH / ASSUMPTIONS / VERIFY and writes **no code until the user says `proceed`** → minimal, style-matching changes, every changed line traceable to WILL CHANGE → user runs the verify IIFE. Follow it when the user invokes the protocol; `CODERULES.md` is the current rule set; `CW-CODING-RULES-v4.md` and `CODING-rules unresolved.js` are its older sources (v4's `_state` rule 9 is outdated).
