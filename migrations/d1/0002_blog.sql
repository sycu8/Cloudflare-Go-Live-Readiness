CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  topic_id TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  body_html TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  keywords TEXT,
  image_r2_key TEXT,
  image_alt TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  model_text TEXT,
  model_image TEXT,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published
  ON blog_posts (status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_topic
  ON blog_posts (topic_id, published_at DESC);

CREATE TABLE IF NOT EXISTS blog_generation_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_topic_index INTEGER NOT NULL DEFAULT 0,
  last_generated_at TEXT,
  last_post_id TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO blog_generation_state (id, next_topic_index, updated_at)
VALUES (1, 0, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
