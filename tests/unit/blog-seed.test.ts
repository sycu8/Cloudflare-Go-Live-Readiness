import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  countWordsFromDraft,
  draftToHtml,
  slugify,
} from "../../workers/src/blog/prompts.js";
import {
  SEED_BLOG_POSTS,
  SEED_CURSOR_UPDATED_AT,
  renderBlogSeedMigration,
  seedSlug,
} from "../../workers/src/blog/seed-posts.js";
import { BLOG_TOPICS } from "../../workers/src/blog/topics.js";

const MIGRATION = resolve("migrations/d1/0003_blog_seed.sql");
const SCHEMA = resolve("migrations/d1/0002_blog.sql");

/** Git for Windows checks text files out with CRLF. Compare logical SQL, not bytes. */
function normalizeNewlines(sql: string): string {
  return sql.replace(/\r\n/g, "\n");
}

function readSql(path: string): string {
  return normalizeNewlines(readFileSync(path, "utf8"));
}

type SqliteStatement = {
  all(): unknown[];
  get(): unknown;
  run(): unknown;
};

type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
};

async function openMemoryDatabase(): Promise<SqliteDatabase | null> {
  try {
    // node:sqlite exists only on Node 22+. Ignore so Vite does not bundle it.
    const { DatabaseSync } = (await import(/* @vite-ignore */ "node:sqlite")) as {
      DatabaseSync: new (path: string) => SqliteDatabase;
    };
    return new DatabaseSync(":memory:");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/node:sqlite|builtin|Cannot find module|ERR_UNKNOWN_BUILTIN_MODULE|unknown builtin/i.test(message)) {
      throw error;
    }
    return null;
  }
}

describe("editorial blog seed", () => {
  it("covers the first four backlog topics without duplicating slugs", () => {
    expect(SEED_BLOG_POSTS).toHaveLength(4);
    expect(SEED_BLOG_POSTS.map((post) => post.topicId)).toEqual(
      BLOG_TOPICS.slice(0, 4).map((topic) => topic.id),
    );

    const slugs = SEED_BLOG_POSTS.map((post) => seedSlug(post));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(SEED_BLOG_POSTS.map((post) => post.id)).size).toBe(4);
  });

  it("matches the blog field limits and tone", () => {
    for (const post of SEED_BLOG_POSTS) {
      const { draft } = post;
      expect(draft.title.length).toBeLessThanOrEqual(70);
      expect(draft.metaDescription.length).toBeGreaterThan(40);
      expect(draft.metaDescription.length).toBeLessThanOrEqual(160);
      expect(draft.excerpt.length).toBeGreaterThan(40);
      expect(draft.sections.length).toBeGreaterThanOrEqual(4);
      expect(countWordsFromDraft(draft)).toBeGreaterThanOrEqual(300);
      expect(seedSlug(post)).toBe(slugify(draft.title, post.topicId, post.publishedAt));
      expect(draft.keywords.length).toBeGreaterThanOrEqual(3);

      const prose = draft.sections
        .flatMap((section) => section.paragraphs)
        .join(" ");
      expect(prose).toContain("https://ready.orangecloud.vn");
      expect(prose.toLowerCase()).not.toMatch(/\b(sucks|stupid|terrible|garbage)\b/);

      const html = draftToHtml(draft);
      expect(html).toContain("<h2>");
      expect(html).toContain('href="https://ready.orangecloud.vn');
      expect(html).not.toContain("<script>");
    }
  });

  it("keeps the checked-in migration in sync with the seed module", () => {
    const rendered = renderBlogSeedMigration();
    expect(readSql(MIGRATION)).toBe(rendered);
    expect(normalizeNewlines(rendered.replace(/\n/g, "\r\n"))).toBe(rendered);

    // Wrangler 4 requires Node 22 and splits migration files on semicolons.
    // CASE/BEGIN open a compound statement, so the cursor update must not use them
    // or the following d1_migrations insert gets glued on. CI also runs Node 18/20.
    const nodeMajor = Number(process.versions.node.split(".")[0]);
    if (nodeMajor < 22) return;

    const require = createRequire(import.meta.url);
    const { unstable_splitSqlQuery } = require("wrangler") as {
      unstable_splitSqlQuery: (sql: string) => string[];
    };
    const parts = unstable_splitSqlQuery(rendered);
    expect(parts).toHaveLength(5);
    expect(parts.filter((part) => part.startsWith("INSERT OR IGNORE INTO blog_posts"))).toHaveLength(4);
    expect(parts.filter((part) => part.startsWith("UPDATE blog_generation_state"))).toHaveLength(1);
    expect(parts.every((part) => Buffer.byteLength(part) < 100_000)).toBe(true);
    const wrapped = unstable_splitSqlQuery(
      `${rendered}\nINSERT INTO d1_migrations (name) values ('0003_blog_seed.sql');`,
    );
    expect(wrapped).toHaveLength(6);
  });

  it("applies on top of the blog schema and advances the topic cursor", async (ctx) => {
    const db = await openMemoryDatabase();
    if (!db) {
      ctx.skip();
      return;
    }
    const schema = readSql(SCHEMA);
    const seed = readSql(MIGRATION);
    db.exec(schema);
    db.exec(seed);
    db.exec(seed);

    const rows = db
      .prepare(
        `SELECT slug, topic_id, title, word_count, status, model_text, image_r2_key
         FROM blog_posts ORDER BY published_at ASC`,
      )
      .all() as Array<{
      slug: string;
      topic_id: string;
      title: string;
      word_count: number;
      status: string;
      model_text: string;
      image_r2_key: string | null;
    }>;

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.slug)).toEqual(SEED_BLOG_POSTS.map((post) => seedSlug(post)));
    expect(rows.every((row) => row.status === "published")).toBe(true);
    expect(rows.every((row) => row.model_text === "editorial-seed")).toBe(true);
    expect(rows.every((row) => row.image_r2_key === null)).toBe(true);
    expect(rows.every((row) => row.word_count >= 300)).toBe(true);

    const state = db
      .prepare(
        `SELECT next_topic_index, last_generated_at, last_post_id, updated_at
         FROM blog_generation_state WHERE id = 1`,
      )
      .get() as {
      next_topic_index: number;
      last_generated_at: string;
      last_post_id: string;
      updated_at: string;
    };

    expect(state.next_topic_index).toBe(4);
    expect(state.last_generated_at).toBe("2026-10-17T10:00:00.000Z");
    expect(state.last_post_id).toBe("seed-seo-cloudflare");
    expect(state.updated_at).toBe(SEED_CURSOR_UPDATED_AT);

    const preserved = await openMemoryDatabase();
    if (!preserved) {
      ctx.skip();
      return;
    }
    preserved.exec(schema);
    preserved
      .prepare(
        `UPDATE blog_generation_state
         SET next_topic_index = 6,
             last_generated_at = '2026-10-18T10:00:00.000Z',
             last_post_id = 'existing-post',
             updated_at = '2026-10-18T10:00:00.000Z'
         WHERE id = 1`,
      )
      .run();
    preserved.exec(seed);
    const later = preserved
      .prepare(
        `SELECT next_topic_index, last_generated_at, last_post_id, updated_at
         FROM blog_generation_state WHERE id = 1`,
      )
      .get() as {
      next_topic_index: number;
      last_generated_at: string;
      last_post_id: string;
      updated_at: string;
    };
    expect(later).toEqual({
      next_topic_index: 6,
      last_generated_at: "2026-10-18T10:00:00.000Z",
      last_post_id: "existing-post",
      updated_at: "2026-10-18T10:00:00.000Z",
    });
    expect(
      (preserved.prepare("SELECT COUNT(*) AS n FROM blog_posts").get() as { n: number }).n,
    ).toBe(4);
  });
});
