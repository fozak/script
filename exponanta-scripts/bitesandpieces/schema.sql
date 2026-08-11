CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('index', 'html', 'note')),
  content TEXT NOT NULL,
  position REAL NOT NULL DEFAULT 0,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
