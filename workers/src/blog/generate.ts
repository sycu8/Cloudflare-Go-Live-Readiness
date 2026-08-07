import type { Env } from "../types.js";
import {
  BLOG_SYSTEM_PROMPT,
  buildBlogUserPrompt,
  buildExpandPrompt,
  countWordsFromDraft,
  draftToHtml,
  draftToMarkdown,
  parseBlogDraft,
  slugify,
  type GeneratedBlogDraft,
} from "./prompts.js";
import {
  getGenerationState,
  insertBlogPost,
  putBlogImage,
  shouldGenerate,
  updateGenerationState,
  type BlogPostRow,
} from "./store.js";
import { topicAtIndex, type BlogTopic } from "./topics.js";

const TEXT_MODELS = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-fast",
] as const;

const IMAGE_MODELS = [
  "@cf/black-forest-labs/flux-1-schnell",
  "@cf/stabilityai/stable-diffusion-xl-base-1.0",
] as const;

const MIN_WORDS = 300;

export type GenerateBlogResult =
  | { ok: true; skipped?: false; post: BlogPostPublicLite; topic: BlogTopic }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

export type BlogPostPublicLite = {
  id: string;
  slug: string;
  title: string;
  topicId: string;
  wordCount: number;
  publishedAt: string;
  imageR2Key: string | null;
};

async function extractText(response: unknown): Promise<string> {
  if (typeof response === "string") return response;
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    if (typeof r.response === "string") return r.response;
    if (Array.isArray(r.choices)) {
      const choice = r.choices[0] as { message?: { content?: string } };
      if (choice?.message?.content) return choice.message.content;
    }
    if (typeof r.result === "string") return r.result;
  }
  return JSON.stringify(response);
}

async function runTextModel(env: Env, messages: Array<{ role: string; content: string }>): Promise<{
  text: string;
  model: string;
}> {
  const preferred = env.FALLBACK_AI_MODEL?.startsWith("@cf/")
    ? env.FALLBACK_AI_MODEL
    : TEXT_MODELS[0];
  const models = [preferred, ...TEXT_MODELS.filter((m) => m !== preferred)];
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await env.AI.run(
        model,
        { messages, max_tokens: 2048, temperature: 0.65 },
        { gateway: { id: env.AI_GATEWAY_ID || "default", skipCache: true } },
      );
      return { text: await extractText(response), model };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function toArrayBuffer(response: unknown): Promise<ArrayBuffer> {
  if (response instanceof ArrayBuffer) return response;
  if (ArrayBuffer.isView(response)) {
    const view = response as ArrayBufferView;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  }
  if (response instanceof ReadableStream) {
    return new Response(response).arrayBuffer();
  }
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    if (r.image instanceof ArrayBuffer) return r.image;
    if (typeof r.image === "string") {
      const bin = atob(r.image);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.buffer;
    }
  }
  throw new Error("Unexpected image generation response type");
}

async function runImageModel(env: Env, prompt: string): Promise<{ bytes: ArrayBuffer; model: string }> {
  let lastError: unknown;
  for (const model of IMAGE_MODELS) {
    try {
      const input =
        model.includes("flux")
          ? { prompt }
          : { prompt, num_steps: 20, guidance: 7.5 };
      const response = await env.AI.run(model, input, {
        gateway: { id: env.AI_GATEWAY_ID || "default", skipCache: true },
      });
      return { bytes: await toArrayBuffer(response), model };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function generateDraft(env: Env, topic: BlogTopic, nowIso: string): Promise<{
  draft: GeneratedBlogDraft;
  model: string;
  wordCount: number;
}> {
  const { text, model } = await runTextModel(env, [
    { role: "system", content: BLOG_SYSTEM_PROMPT },
    { role: "user", content: buildBlogUserPrompt(topic, nowIso.slice(0, 10)) },
  ]);

  let draft = parseBlogDraft(text);
  let wordCount = countWordsFromDraft(draft);

  if (wordCount < MIN_WORDS) {
    const expanded = await runTextModel(env, [
      { role: "system", content: BLOG_SYSTEM_PROMPT },
      { role: "user", content: buildExpandPrompt(draft, wordCount) },
    ]);
    draft = parseBlogDraft(expanded.text);
    wordCount = countWordsFromDraft(draft);
  }

  if (wordCount < MIN_WORDS) {
    throw new Error(`Generated article too short (${wordCount} words; need ${MIN_WORDS})`);
  }

  return { draft, model, wordCount };
}

export async function generateBlogPost(
  env: Env,
  options: { force?: boolean; topicIndex?: number } = {},
): Promise<GenerateBlogResult> {
  if (!env.DB) {
    return { ok: false, error: "D1 database DB is not configured" };
  }
  if (!env.UPLOADS) {
    return { ok: false, error: "R2 bucket UPLOADS is not configured" };
  }

  const state = await getGenerationState(env);
  if (!options.force && !shouldGenerate(state)) {
    return {
      ok: true,
      skipped: true,
      reason: `Last post generated at ${state?.last_generated_at}; waiting 3 days between posts`,
    };
  }

  const topicIndex = options.topicIndex ?? state?.next_topic_index ?? 0;
  const topic = topicAtIndex(topicIndex);
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    const { draft, model: modelText, wordCount } = await generateDraft(env, topic, nowIso);
    const slug = slugify(draft.title, topic.id, nowIso);
    const id = crypto.randomUUID();

    let imageR2Key: string | null = null;
    let modelImage: string | null = null;
    try {
      const image = await runImageModel(env, draft.imagePrompt);
      imageR2Key = await putBlogImage(env, slug, image.bytes);
      modelImage = image.model;
    } catch (imageError) {
      // Articles can publish without an image if image models are unavailable.
      console.warn("Blog image generation failed:", imageError);
    }

    const row: Omit<BlogPostRow, "keywords"> & { keywords: string[] } = {
      id,
      slug,
      topic_id: topic.id,
      title: draft.title,
      excerpt: draft.excerpt,
      body_markdown: draftToMarkdown(draft),
      body_html: draftToHtml(draft),
      meta_description: draft.metaDescription,
      keywords: draft.keywords,
      image_r2_key: imageR2Key,
      image_alt: draft.imageAlt,
      word_count: wordCount,
      status: "published",
      model_text: modelText,
      model_image: modelImage,
      published_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await insertBlogPost(env, row);
    await updateGenerationState(env, {
      next_topic_index: topicIndex + 1,
      last_generated_at: nowIso,
      last_post_id: id,
      last_error: null,
    });

    return {
      ok: true,
      post: {
        id,
        slug,
        title: draft.title,
        topicId: topic.id,
        wordCount,
        publishedAt: nowIso,
        imageR2Key,
      },
      topic,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await updateGenerationState(env, {
        next_topic_index: topicIndex,
        last_error: message,
      });
    } catch {
      /* ignore secondary failure */
    }
    return { ok: false, error: message };
  }
}
