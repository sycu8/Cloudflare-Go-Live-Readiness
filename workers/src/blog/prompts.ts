import type { BlogTopic } from "./topics.js";

export const BLOG_SYSTEM_PROMPT = `You are a professional technical writer for CF Ready (Cloudflare Go-Live Readiness), an open-source CLI by OrangeCloud.

Tone and style:
- Polite, professional, clear, and helpful
- Never offensive, dismissive, or insulting toward people, companies, or products
- Comparative content must be fair: acknowledge trade-offs and legitimate strengths of alternatives
- Do not claim affiliation with Cloudflare, Inc.; CF Ready is a community open-source tool
- Prefer concrete, actionable guidance over hype

Output requirements:
- Return ONLY valid JSON (no markdown fences, no commentary)
- Article body must be at least 300 words (count words in all section paragraphs combined)
- SEO-friendly: clear title, meta description under 160 characters, natural keyword use (no stuffing)
- Use short paragraphs and descriptive section headings`;

export type GeneratedBlogDraft = {
  title: string;
  excerpt: string;
  metaDescription: string;
  keywords: string[];
  imagePrompt: string;
  imageAlt: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
};

export function buildBlogUserPrompt(topic: BlogTopic, publishedDate: string): string {
  return `Write a new blog article for publication on ${publishedDate}.

Topic id: ${topic.id}
Topic focus: ${topic.focus}
SEO angle: ${topic.seoAngle}
Seed keywords to weave in naturally: ${topic.seedKeywords.join(", ")}

Return JSON with this exact shape:
{
  "title": "string (compelling, SEO-friendly, under 70 characters)",
  "excerpt": "string (1-2 sentences for listing cards)",
  "metaDescription": "string (under 160 characters)",
  "keywords": ["string"],
  "imagePrompt": "string (safe, abstract technical illustration prompt for image generation; no text overlays; no logos of other companies)",
  "imageAlt": "string (accessible alt text)",
  "sections": [
    { "heading": "string", "paragraphs": ["string", "string"] }
  ]
}

Constraints:
- At least 4 sections
- At least 300 words total across all paragraphs
- Include a short conclusion section with a clear next step (e.g. try CF Ready or read docs)
- For platform comparisons: stay polite and factual; never use pejorative language
- Mention CF Ready / https://ready.orangecloud.vn where relevant to the topic`;
}

export function buildExpandPrompt(draft: GeneratedBlogDraft, wordCount: number): string {
  return `The following article draft is only ${wordCount} words. Expand it to at least 300 words while keeping the same JSON shape, polite professional tone, and SEO quality. Do not add offensive language. Return ONLY JSON.

Current draft:
${JSON.stringify(draft)}`;
}

export function countWordsFromDraft(draft: GeneratedBlogDraft): number {
  const parts: string[] = [];
  for (const section of draft.sections ?? []) {
    for (const p of section.paragraphs ?? []) {
      parts.push(p);
    }
  }
  return parts
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function draftToMarkdown(draft: GeneratedBlogDraft): string {
  const lines: string[] = [`# ${draft.title}`, ""];
  for (const section of draft.sections) {
    lines.push(`## ${section.heading}`, "");
    for (const p of section.paragraphs) {
      lines.push(p, "");
    }
  }
  return lines.join("\n").trim() + "\n";
}

export function draftToHtml(draft: GeneratedBlogDraft): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const linkify = (text: string) => {
    const escaped = escape(text);
    return escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" rel="noopener noreferrer">$1</a>',
    );
  };

  const parts: string[] = [];
  for (const section of draft.sections) {
    parts.push(`<h2>${escape(section.heading)}</h2>`);
    for (const p of section.paragraphs) {
      parts.push(`<p>${linkify(p)}</p>`);
    }
  }
  return parts.join("\n");
}

export function parseBlogDraft(raw: string): GeneratedBlogDraft {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  const parsed = JSON.parse(text) as GeneratedBlogDraft;
  if (!parsed?.title || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    throw new Error("Invalid blog draft JSON: missing title or sections");
  }
  parsed.excerpt = parsed.excerpt || parsed.metaDescription || parsed.title;
  parsed.metaDescription = (parsed.metaDescription || parsed.excerpt).slice(0, 160);
  parsed.keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [];
  parsed.imagePrompt =
    parsed.imagePrompt ||
    "Abstract edge computing network illustration, soft navy and orange tones, clean technical style, no text";
  parsed.imageAlt = parsed.imageAlt || `Illustration for ${parsed.title}`;
  parsed.sections = parsed.sections.map((s) => ({
    heading: String(s.heading || "Section"),
    paragraphs: Array.isArray(s.paragraphs)
      ? s.paragraphs.map(String).filter((p) => p.trim().length > 0)
      : [],
  }));
  return parsed;
}

export function slugify(title: string, topicId: string, dateIso: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const day = dateIso.slice(0, 10);
  return `${base || topicId}-${day}`;
}
