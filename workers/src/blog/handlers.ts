import type { Env } from "../types.js";
import { generateBlogPost } from "./generate.js";
import { htmlResponse, renderBlogIndex, renderBlogNotFound, renderBlogPost } from "./html.js";
import {
  getBlogImage,
  getPostBySlug,
  listPublishedPosts,
  toPublicPost,
} from "./store.js";
import { BLOG_TOPICS } from "./topics.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function checkGenerateAuth(request: Request, env: Env): boolean {
  if (!env.AI_API_KEY) return true;
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${env.AI_API_KEY}`;
}

function originFrom(request: Request, env: Env): string {
  return env.WORKER_PUBLIC_URL || new URL(request.url).origin;
}

/** Handle /blog and /blog/* page + image routes. Returns null if not a blog path. */
export async function handleBlogPageRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const imageMatch = pathname.match(/^\/blog\/images\/([^/]+)\/?$/);
  if (imageMatch) {
    const slug = decodeURIComponent(imageMatch[1]!);
    const object = await getBlogImage(env, slug);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "image/png");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
    if (object.etag) headers.set("ETag", object.etag);
    if (request.method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(object.body, { status: 200, headers });
  }

  if (pathname === "/blog" || pathname === "/blog/") {
    const origin = originFrom(request, env);
    const rows = await listPublishedPosts(env);
    const posts = rows.map((r) => toPublicPost(r, origin));
    return htmlResponse(renderBlogIndex(posts));
  }

  const postMatch = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (postMatch) {
    const slug = decodeURIComponent(postMatch[1]!);
    if (slug === "images" || slug === "index.html") return null;
    const row = await getPostBySlug(env, slug);
    if (!row) {
      return htmlResponse(renderBlogNotFound(slug), 404);
    }
    const origin = originFrom(request, env);
    return htmlResponse(renderBlogPost(toPublicPost(row, origin)));
  }

  return null;
}

/** Handle /api/blog* JSON endpoints. Returns null if not matched. */
export async function handleBlogApiRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (!pathname.startsWith("/api/blog")) return null;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  if (pathname === "/api/blog" && request.method === "GET") {
    const origin = originFrom(request, env);
    const rows = await listPublishedPosts(env);
    return json({
      posts: rows.map((r) => toPublicPost(r, origin)),
      topics: BLOG_TOPICS.map((t) => ({ id: t.id, label: t.label })),
    });
  }

  if (pathname === "/api/blog/topics" && request.method === "GET") {
    return json({ topics: BLOG_TOPICS });
  }

  if (pathname === "/api/blog/generate" && request.method === "POST") {
    if (!checkGenerateAuth(request, env)) {
      return json({ error: "Unauthorized" }, 401);
    }
    let force = true;
    let topicIndex: number | undefined;
    let seedAll = false;
    try {
      const body = (await request.json()) as {
        force?: boolean;
        topicIndex?: number;
        seedAll?: boolean;
      };
      if (typeof body.force === "boolean") force = body.force;
      if (typeof body.topicIndex === "number") topicIndex = body.topicIndex;
      if (body.seedAll === true) seedAll = true;
    } catch {
      /* empty body is fine */
    }

    if (seedAll) {
      const results = [];
      for (let i = 0; i < BLOG_TOPICS.length; i++) {
        const result = await generateBlogPost(env, { force: true, topicIndex: i });
        results.push(result);
        if (!result.ok) {
          return json({ ok: false, seeded: results.length - 1, results }, 502);
        }
      }
      return json({ ok: true, seeded: results.length, results }, 201);
    }

    const result = await generateBlogPost(env, { force, topicIndex });
    if (!result.ok) return json(result, 502);
    return json(result, result.skipped ? 200 : 201);
  }

  const slugMatch = pathname.match(/^\/api\/blog\/([^/]+)\/?$/);
  if (slugMatch && request.method === "GET") {
    const slug = decodeURIComponent(slugMatch[1]!);
    if (slug === "generate" || slug === "topics") return null;
    const row = await getPostBySlug(env, slug);
    if (!row) return json({ error: "Not found" }, 404);
    return json({ post: toPublicPost(row, originFrom(request, env)) });
  }

  return json({ error: "Not found" }, 404);
}

/** Cron: generate a post when at least 3 days have passed since the last one. */
export async function handleBlogScheduled(env: Env): Promise<void> {
  const result = await generateBlogPost(env, { force: false });
  if (!result.ok) {
    console.error("Scheduled blog generation failed:", result.error);
    return;
  }
  if (result.skipped) {
    console.log("Scheduled blog generation skipped:", result.reason);
    return;
  }
  console.log("Scheduled blog post published:", result.post.slug, result.topic.id);
}
