What Was Built

Stack: Cloudflare Worker + D1 (bitesandpieces) + static index.html served via [assets] binding. Three files: worker.js, index.html, wrangler.toml.

Data model:

items table: id, type (index|html|note), content, position (float bisect), author, created_at

Features shipped:

Shell page, anon contributors, no auth
index block pinned at top — line-by-line editor, +link dropdown per line links to HTML blocks by auto-extracted title
html blocks — anchored by #block-{id}, copy link button
note blocks — positional in timeline, Discourse-style avatar (Tabler avatar avatar-xs rounded-circle) with initials, author name, timestamp
Identity via localStorage.currentUser — prompted on first visit, name + initials shown in header
Edit pen + trash on every block and note (PATCH endpoint)
Ctrl+Enter to submit dialog
Drop handler on textarea — grabs text/html first, falls back text/plain
Clean block title extraction in +link dropdown (first heading or stripped text)
run_worker_first = ["/api/*"] in wrangler to prevent asset router eating API routes
TODOs
Auto-link on + new HTML block from index line — after creating a new block from the +link dropdown, auto-assign the anchor back to that index line without requiring manual relink
Drop handler refinement — currently appends, could be smarter about cursor position
robots.txt + X-Robots-Tag: noindex — prevent Google indexing of *.workers.dev
Onebox on URL drop — skipped for now, Worker fetches OG tags / YouTube oEmbed, renders as card
Conceptual Approaches

URL as access token
Random ID in /:id/slug — same model as Notion share links, Google Docs. Not guessable (36^8 combinations), not secret. Next step after this: passphrase on board creation, then Cloudflare Access for team/org use.

Position as float bisect
Items ordered by REAL position in D1. New items get prev + 1000. Inserting between two items bisects: (a + b) / 2. No reordering needed, infinite precision.

Index → block linking
Index stores lines as JSON array [{text, anchor}]. Each HTML block gets id as its natural anchor (#block-{id}). +link dropdown on each line shows existing blocks by title. Avoids markdown syntax for non-technical users.

Identity without auth
localStorage.currentUser = { full_name } — prompted once, trust-based. Discourse-style avatar initials on notes. No sessions, no tokens. Next step: passphrase per board.

Multi-board / workspace
Not built yet. Natural next step: boards table, board_id FK on items, /:boardId/slug routing. Each pair session gets its own URL.

Positioning in the AI landscape
Not a wiki — a structured session surface. Wikis as storage are dying; what survives is clean structured input for AI to reason over. Your tool is that input layer for pair discussions. Target user: consultant/freelancer class who already use Notion share links but need raw HTML drops and no-account collaboration.