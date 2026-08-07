import { describe, expect, it } from "vitest";
import {
  buildBlogUserPrompt,
  countWordsFromDraft,
  draftToHtml,
  draftToMarkdown,
  parseBlogDraft,
  slugify,
  type GeneratedBlogDraft,
} from "../../workers/src/blog/prompts.js";
import { shouldGenerate } from "../../workers/src/blog/store.js";
import { BLOG_TOPICS, topicAtIndex } from "../../workers/src/blog/topics.js";

const longPara =
  "Cloudflare provides a global developer platform that helps teams run applications closer to users with lower latency and clearer operational boundaries. ";

const sampleDraft: GeneratedBlogDraft = {
  title: "Getting started with Cloudflare Workers",
  excerpt: "A polite overview of edge computing on Cloudflare.",
  metaDescription: "Learn what Cloudflare Workers are and how CF Ready helps you ship.",
  keywords: ["Cloudflare", "Workers", "CF Ready"],
  imagePrompt: "Abstract navy and orange network mesh, no text",
  imageAlt: "Abstract network illustration",
  sections: [
    {
      heading: "Why the edge matters",
      paragraphs: [longPara.repeat(5)],
    },
    {
      heading: "Developer platform building blocks",
      paragraphs: [longPara.repeat(5)],
    },
    {
      heading: "How CF Ready helps",
      paragraphs: [longPara.repeat(5)],
    },
    {
      heading: "Next steps",
      paragraphs: [
        "Try the Web Agent at https://ready.orangecloud.vn/app/ or run npx @orangecloud/cf-ready scan to measure readiness today.",
      ],
    },
  ],
};

describe("blog topics", () => {
  it("rotates through six planned topics", () => {
    expect(BLOG_TOPICS).toHaveLength(6);
    expect(topicAtIndex(0).id).toBe("what-is-cloudflare");
    expect(topicAtIndex(6).id).toBe("what-is-cloudflare");
    expect(topicAtIndex(5).id).toBe("platform-comparison");
  });

  it("keeps platform comparison guidance polite", () => {
    const topic = BLOG_TOPICS.find((t) => t.id === "platform-comparison");
    expect(topic?.focus.toLowerCase()).toContain("polite");
    expect(topic?.focus.toLowerCase()).toContain("never insult");
  });
});

describe("blog prompts", () => {
  it("builds a prompt that enforces length and tone", () => {
    const prompt = buildBlogUserPrompt(BLOG_TOPICS[0]!, "2026-08-07");
    expect(prompt).toContain("300 words");
    expect(prompt).toContain("polite");
    expect(prompt).toContain(BLOG_TOPICS[0]!.focus);
  });

  it("parses fenced JSON drafts", () => {
    const raw = "```json\n" + JSON.stringify(sampleDraft) + "\n```";
    const parsed = parseBlogDraft(raw);
    expect(parsed.title).toBe(sampleDraft.title);
    expect(parsed.sections).toHaveLength(4);
  });

  it("counts words and rejects short drafts via count", () => {
    const words = countWordsFromDraft(sampleDraft);
    expect(words).toBeGreaterThanOrEqual(300);
    expect(countWordsFromDraft({ ...sampleDraft, sections: [{ heading: "A", paragraphs: ["hi"] }] })).toBe(1);
  });

  it("renders markdown and escaped HTML with linkify", () => {
    const md = draftToMarkdown(sampleDraft);
    expect(md).toContain("# Getting started");
    expect(md).toContain("## Why the edge matters");

    const html = draftToHtml(sampleDraft);
    expect(html).toContain("<h2>Why the edge matters</h2>");
    expect(html).toContain('href="https://ready.orangecloud.vn/app/"');
    expect(html).not.toContain("<script>");
  });

  it("slugifies titles with date suffix", () => {
    expect(slugify("Hello, Cloudflare!", "what-is-cloudflare", "2026-08-07T10:00:00.000Z")).toBe(
      "hello-cloudflare-2026-08-07",
    );
  });
});

describe("blog generation cadence", () => {
  it("generates when never published", () => {
    expect(shouldGenerate(null)).toBe(true);
    expect(
      shouldGenerate({
        id: 1,
        next_topic_index: 0,
        last_generated_at: null,
        last_post_id: null,
        last_error: null,
        updated_at: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("waits three days between posts", () => {
    const now = Date.parse("2026-08-07T10:00:00.000Z");
    expect(
      shouldGenerate(
        {
          id: 1,
          next_topic_index: 1,
          last_generated_at: "2026-08-06T10:00:00.000Z",
          last_post_id: "x",
          last_error: null,
          updated_at: "2026-08-06T10:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);

    expect(
      shouldGenerate(
        {
          id: 1,
          next_topic_index: 1,
          last_generated_at: "2026-08-04T09:00:00.000Z",
          last_post_id: "x",
          last_error: null,
          updated_at: "2026-08-04T09:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });
});
