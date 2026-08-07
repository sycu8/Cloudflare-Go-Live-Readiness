import type { Env } from "../types.js";

export type BlogPostRow = {
  id: string;
  slug: string;
  topic_id: string;
  title: string;
  excerpt: string;
  body_markdown: string;
  body_html: string;
  meta_description: string;
  keywords: string | null;
  image_r2_key: string | null;
  image_alt: string | null;
  word_count: number;
  status: string;
  model_text: string | null;
  model_image: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export type BlogGenerationState = {
  id: number;
  next_topic_index: number;
  last_generated_at: string | null;
  last_post_id: string | null;
  last_error: string | null;
  updated_at: string;
};

export type BlogPostPublic = {
  id: string;
  slug: string;
  topicId: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  bodyHtml: string;
  metaDescription: string;
  keywords: string[];
  imageUrl: string | null;
  imageAlt: string | null;
  wordCount: number;
  publishedAt: string;
};

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function toPublicPost(row: BlogPostRow, origin: string): BlogPostPublic {
  let keywords: string[] = [];
  if (row.keywords) {
    try {
      keywords = JSON.parse(row.keywords) as string[];
    } catch {
      keywords = [];
    }
  }
  return {
    id: row.id,
    slug: row.slug,
    topicId: row.topic_id,
    title: row.title,
    excerpt: row.excerpt,
    bodyMarkdown: row.body_markdown,
    bodyHtml: row.body_html,
    metaDescription: row.meta_description,
    keywords,
    imageUrl: row.image_r2_key ? `${origin}/blog/images/${row.slug}` : null,
    imageAlt: row.image_alt,
    wordCount: row.word_count,
    publishedAt: row.published_at,
  };
}

export async function ensureBlogTables(env: Env): Promise<void> {
  if (!env.DB) return;
  // Idempotent bootstrap for environments that have not run migrations yet.
  await env.DB.batch([
    env.DB.prepare(`
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
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS blog_generation_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        next_topic_index INTEGER NOT NULL DEFAULT 0,
        last_generated_at TEXT,
        last_post_id TEXT,
        last_error TEXT,
        updated_at TEXT NOT NULL
      )
    `),
    env.DB.prepare(`
      INSERT OR IGNORE INTO blog_generation_state (id, next_topic_index, updated_at)
      VALUES (1, 0, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    `),
  ]);
}

export async function getGenerationState(env: Env): Promise<BlogGenerationState | null> {
  if (!env.DB) return null;
  await ensureBlogTables(env);
  return (
    (await env.DB.prepare("SELECT * FROM blog_generation_state WHERE id = 1").first<BlogGenerationState>()) ??
    null
  );
}

export function shouldGenerate(state: BlogGenerationState | null, now = Date.now()): boolean {
  if (!state?.last_generated_at) return true;
  const last = Date.parse(state.last_generated_at);
  if (Number.isNaN(last)) return true;
  return now - last >= THREE_DAYS_MS;
}

export async function listPublishedPosts(env: Env, limit = 50): Promise<BlogPostRow[]> {
  if (!env.DB) return [];
  await ensureBlogTables(env);
  const result = await env.DB.prepare(
    `SELECT * FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT ?`,
  )
    .bind(limit)
    .all<BlogPostRow>();
  return result.results ?? [];
}

export async function getPostBySlug(env: Env, slug: string): Promise<BlogPostRow | null> {
  if (!env.DB) return null;
  await ensureBlogTables(env);
  return (
    (await env.DB.prepare(
      `SELECT * FROM blog_posts WHERE slug = ? AND status = 'published' LIMIT 1`,
    )
      .bind(slug)
      .first<BlogPostRow>()) ?? null
  );
}

export async function insertBlogPost(
  env: Env,
  post: Omit<BlogPostRow, "keywords"> & { keywords: string[] },
): Promise<void> {
  if (!env.DB) throw new Error("D1 database DB is not configured");
  await ensureBlogTables(env);
  await env.DB.prepare(
    `INSERT INTO blog_posts (
      id, slug, topic_id, title, excerpt, body_markdown, body_html, meta_description,
      keywords, image_r2_key, image_alt, word_count, status, model_text, model_image,
      published_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      post.id,
      post.slug,
      post.topic_id,
      post.title,
      post.excerpt,
      post.body_markdown,
      post.body_html,
      post.meta_description,
      JSON.stringify(post.keywords),
      post.image_r2_key,
      post.image_alt,
      post.word_count,
      post.status,
      post.model_text,
      post.model_image,
      post.published_at,
      post.created_at,
      post.updated_at,
    )
    .run();
}

export async function updateGenerationState(
  env: Env,
  patch: {
    next_topic_index: number;
    last_generated_at?: string | null;
    last_post_id?: string | null;
    last_error?: string | null;
  },
): Promise<void> {
  if (!env.DB) throw new Error("D1 database DB is not configured");
  await ensureBlogTables(env);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE blog_generation_state
     SET next_topic_index = ?,
         last_generated_at = COALESCE(?, last_generated_at),
         last_post_id = COALESCE(?, last_post_id),
         last_error = ?,
         updated_at = ?
     WHERE id = 1`,
  )
    .bind(
      patch.next_topic_index,
      patch.last_generated_at ?? null,
      patch.last_post_id ?? null,
      patch.last_error ?? null,
      now,
    )
    .run();
}

export function blogImageR2Key(slug: string): string {
  return `blog/images/${slug}.png`;
}

export async function putBlogImage(env: Env, slug: string, bytes: ArrayBuffer): Promise<string> {
  if (!env.UPLOADS) throw new Error("R2 bucket UPLOADS is not configured");
  const key = blogImageR2Key(slug);
  await env.UPLOADS.put(key, bytes, {
    httpMetadata: { contentType: "image/png" },
  });
  return key;
}

export async function getBlogImage(env: Env, slug: string): Promise<R2ObjectBody | null> {
  if (!env.UPLOADS) return null;
  return env.UPLOADS.get(blogImageR2Key(slug));
}
