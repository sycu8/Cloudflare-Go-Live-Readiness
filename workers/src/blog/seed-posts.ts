import {
  countWordsFromDraft,
  draftToHtml,
  draftToMarkdown,
  slugify,
  type GeneratedBlogDraft,
} from "./prompts.js";

/**
 * Editorial posts for the first four backlog topics.
 * Runtime Workers AI still rotates the full topic list; migration 0003
 * publishes these so the blog is not empty until the first cron run.
 */
export type SeedBlogPost = {
  id: string;
  topicId: string;
  publishedAt: string;
  draft: GeneratedBlogDraft;
};

export const SEED_MODEL_TEXT = "editorial-seed";

/** Cursor timestamp written when this seed advances generation state. */
export const SEED_CURSOR_UPDATED_AT = "2026-10-18T04:00:00.000Z";

export const SEED_BLOG_POSTS: SeedBlogPost[] = [
  {
    id: "seed-what-is-cloudflare",
    topicId: "what-is-cloudflare",
    publishedAt: "2026-10-14T10:00:00.000Z",
    draft: {
      title: "What the Cloudflare Developer Platform Includes",
      excerpt:
        "Cloudflare is more than a CDN. This guide maps Workers, Pages, D1, R2, KV, Queues, and Workers AI for teams deciding where an app should run.",
      metaDescription:
        "A practical map of Cloudflare Workers, Pages, D1, R2, KV, and Workers AI for teams evaluating the Developer Platform.",
      keywords: [
        "Cloudflare",
        "Cloudflare Workers",
        "Cloudflare Developer Platform",
        "edge computing",
        "serverless",
      ],
      imagePrompt:
        "Abstract edge computing network of soft navy nodes and warm orange paths over a dark globe, clean technical illustration, no text, no logos",
      imageAlt: "Abstract illustration of an edge network connecting application services",
      sections: [
        {
          heading: "A network, and a place to build",
          paragraphs: [
            "Cloudflare is widely known as the network in front of a website: DNS, TLS, caching, and a global anycast edge that absorbs traffic before it reaches an origin. The Cloudflare Developer Platform is the set of products teams use when they want to build on that network. It covers compute, data, object storage, background work, and AI services that run close to users.",
            "That scope is what people mean by edge computing in a Cloudflare architecture. A CDN configuration speeds up an origin you already operate. Workers and Pages are a serverless place to run the application itself. CF Ready is a community open-source checklist for that second decision. It is not affiliated with Cloudflare, Inc.",
          ],
        },
        {
          heading: "Compute with Workers and Pages",
          paragraphs: [
            "Cloudflare Workers is a serverless runtime for JavaScript, TypeScript, and WebAssembly. Handlers run on the edge network, so you deploy code rather than patching a virtual machine. Request routing, small APIs, scheduled tasks, and middleware-style logic fit the model well. There is no long-lived server to SSH into, which is why code that assumes a local disk, a background daemon, or a Node.js-only API needs a review before launch.",
            "Cloudflare Pages hosts static sites and full-stack projects. Pages Functions run on the Workers runtime, so the programming model stays familiar when a site needs server-side behavior. Teams often start on Pages for a front end and add a Worker when they need a dedicated API, a cron trigger, or a route that should live outside the site project. Both are serverless: you ship a build, and the platform runs it.",
          ],
        },
        {
          heading: "Data services teams actually wire up",
          paragraphs: [
            "D1 is Cloudflare's serverless SQL database, built on SQLite. It fits relational rows with modest operational overhead: accounts, sessions, and content records. This blog stores its articles in D1. If your current system depends on a large Postgres or MySQL deployment, extensions, or long multi-statement transactions, design for D1 explicitly. Treat it as a product choice, and budget a migration plan for queries that will not move unchanged.",
            "R2 is S3-compatible object storage for uploads, exports, and public assets. KV is a low-latency key-value store for configuration, feature flags, and other small values read at the edge. Durable Objects give you strongly consistent coordination for one entity at a time, such as a chat room, a rate limiter, or a collaborative document. Queues let a Worker hand slower work to a consumer so the user-facing request can finish without doing every step inline.",
          ],
        },
        {
          heading: "Where AI fits on the same platform",
          paragraphs: [
            "Workers AI runs model inference on Cloudflare's network, which helps when a feature should stay next to the rest of the app. AI Gateway is a control point for calls to Workers AI or to third-party models, including logging and caching. Vectorize stores embeddings when you need retrieval. These services are optional. Plenty of production sites never call a model, and hosting a site is a separate question from whether your public pages explain themselves to AI crawlers.",
            "Keep the two ideas apart during planning. Platform AI is how your product calls models. AI readiness, in the CF Ready sense, is whether robots.txt, a sitemap, llms.txt, and API descriptions give assistants an accurate map of the site. You can need one, the other, or both.",
          ],
        },
        {
          heading: "Judge readiness before the first production deploy",
          paragraphs: [
            "Before a cutover, list the runtime assumptions in the repository. Filesystem writes, child processes, native addons, and in-process background jobs are common blockers on Workers. Committed secrets, a missing sitemap, and thin metadata are quieter problems that still surface on launch day. Edge computing removes a class of server maintenance, and it makes those code-level assumptions your responsibility to find early.",
            "A practical next step is to scan the project with CF Ready. Use the Web Agent at https://ready.orangecloud.vn/app/ or run npx @orangecloud/cf-ready scan from the project root. The scan does not deploy anything. It writes a readiness report so blockers are tickets, not an outage.",
          ],
        },
      ],
    },
  },
  {
    id: "seed-cf-ready-overview",
    topicId: "cf-ready-overview",
    publishedAt: "2026-10-15T10:00:00.000Z",
    draft: {
      title: "What CF Ready Checks Before You Go Live",
      excerpt:
        "CF Ready scores migration, security, AI readiness, SEO, and deployment in one local report so a Cloudflare launch has a written checklist.",
      metaDescription:
        "See what CF Ready checks before a Cloudflare launch: migration, security, AI readiness, SEO, deployment, and smoke tests.",
      keywords: [
        "CF Ready",
        "Cloudflare Go-Live Readiness",
        "cf-ready",
        "Cloudflare readiness",
        "deployment checklist",
      ],
      imagePrompt:
        "Abstract checklist and shield shapes layered over a navy and orange grid, clean editorial illustration, no text, no logos",
      imageAlt: "Abstract illustration of a readiness checklist and a protective shield",
      sections: [
        {
          heading: "The questions that delay a launch",
          paragraphs: [
            "Shipping is rarely blocked by the build command alone. The questions that delay a Cloudflare launch are scattered across the repo. Can this framework run on Workers or Pages? Are secrets committed? Will an AI crawler find a usable description of the product? Is the metadata complete? Does the person on call have a rollback note? Teams usually answer those one by one, in different tools, close to the deadline.",
            "CF Ready, short for Cloudflare Go-Live Readiness, collects them into one local workflow. The npm package is @orangecloud/cf-ready. It is a community open-source project maintained by OrangeCloud, and it is not affiliated with Cloudflare, Inc. The output is a Cloudflare readiness report your team can file with the release.",
          ],
        },
        {
          heading: "Six areas, one score",
          paragraphs: [
            "A default scan covers migration readiness, security readiness, AI readiness, SEO readiness, and deployment readiness. Migration includes framework detection, a likely Cloudflare target, and runtime blockers such as filesystem access or child processes. Security looks for exposed env files, hardcoded tokens, risky public artifacts, and whether a dependency audit can run. AI readiness looks for robots.txt, sitemap.xml, llms.txt, OpenAPI drafts, and MCP discovery files where they help agents understand the API.",
            "SEO readiness reviews titles, descriptions, canonical URLs, Open Graph, structured data, headings, and image alt text. Deployment readiness checks build scripts, Wrangler configuration, environment documentation, and whether a rollback plan exists. Post-deployment smoke testing is a separate command against the live URL: homepage status, robots.txt, sitemap.xml, and the routes you marked as critical. It is part of the go-live picture, and it does not run inside the local scan.",
            "The default weights are migration 35 percent, security 30 percent, AI readiness 20 percent, SEO 10 percent, and deployment 5 percent. A blocker, including a critical security finding, means the project is not production-ready. AI and SEO gaps do not block by default unless you configure that policy. A missing meta tag should not look like a broken runtime, and a hardcoded token should not hide inside an average.",
          ],
        },
        {
          heading: "Who the report is for",
          paragraphs: [
            "CF Ready is built for individual developers, agencies, freelancers, Cloudflare partners, and internal engineering teams. It is especially useful when a project is moving from another host, such as Vercel, Netlify, a VPS, or a container platform, and you want a written gap list. Other platforms remain a sound choice for many applications. The checklist assumes you have already chosen Cloudflare and need to know what must change.",
            "Agencies can attach the same report to a handoff. The scores give a client a shared language for launch risk, and the finding list is specific enough to become tickets. A deployment checklist written after the fact is much harder to defend than one generated from the repository you are about to ship.",
          ],
        },
        {
          heading: "Safe by default",
          paragraphs: [
            "The CLI does not deploy your application, does not rewrite source as part of a scan, and does not change secrets. File writes happen only when you run an explicit fix, such as cf-ready fix --seo or cf-ready fix --ai-readiness. Those commands generate safe assets: robots.txt, sitemap.xml, llms.txt, an OpenAPI draft, an MCP server card draft, and similar files.",
            "Review every generated diff before it merges. The drafts are useful defaults, and they are still your repository. The MVP has no silent production change and no required Cloudflare API token for the local scan.",
          ],
        },
        {
          heading: "Where to start",
          paragraphs: [
            "Run the CLI from a project root, open the Web Agent at https://ready.orangecloud.vn/app/ and import a repository, or add the CF Ready GitHub Action so pull requests upload SARIF and can fail when blockers are present. The action is a composite workflow in the project repository. Marketplace listing is a separate publishing step.",
            "Start with the product overview at https://ready.orangecloud.vn, run one scan, and keep the generated go-live checklist with the release notes. That single Cloudflare readiness pass is the deployment checklist most teams meant to write by hand.",
          ],
        },
      ],
    },
  },
  {
    id: "seed-cf-ready-howto",
    topicId: "cf-ready-howto",
    publishedAt: "2026-10-16T10:00:00.000Z",
    draft: {
      title: "How to Run Your First CF Ready Scan",
      excerpt:
        "Run npx @orangecloud/cf-ready scan or use the Web Agent, then read blockers, apply only the safe fixes, and optionally repeat the scan in CI.",
      metaDescription:
        "Run your first cf-ready scan with npx or the Web Agent, read the readiness report, and apply safe SEO and AI fixes.",
      keywords: [
        "cf-ready scan",
        "npx @orangecloud/cf-ready",
        "Web Agent",
        "readiness report",
        "GitHub Action",
      ],
      imagePrompt:
        "Abstract terminal window and document stack in navy and orange, soft light, clean technical illustration, no text, no logos",
      imageAlt: "Abstract illustration of a terminal beside a readiness report",
      sections: [
        {
          heading: "Run a scan without a long setup",
          paragraphs: [
            "From the project you want to launch, run npx @orangecloud/cf-ready scan. The cf-ready scan command inspects the repository on your machine. It detects the framework, package manager, routes, config files, and likely deployment target, then scores migration, security, AI readiness, SEO, and deployment. It writes a readiness report, including cf-ready-report.md, cf-ready-report.json, migration-plan.md, and go-live-checklist.md. Nothing is deployed.",
            "If you would rather not install the CLI, use the Web Agent at https://ready.orangecloud.vn/app/. Upload a ZIP of the source, or import a public GitHub repository, then run scan in the browser terminal. Private repositories need GitHub sign-in on the agent. You get the same kind of readiness report either way, which is useful when a reviewer does not have the repo cloned locally.",
          ],
        },
        {
          heading: "Read the scores before the prose",
          paragraphs: [
            "Start with the overall number and the category breakdown, then read the blocker list. A filesystem write in a route handler, a committed .env file, or a missing build script will matter more on launch day than a missing Open Graph image. Severity runs from blocker and high down through medium, low, info, and passed. Any blocker means the project should not be treated as production-ready yet.",
            "The narrative files explain the same findings in sentences you can paste into a ticket. migration-plan.md is where a recommended Cloudflare path shows up, including notes for Next.js projects that may belong on Workers through a supported adapter. The plan is advice. The tool does not run the migration, does not call vinext init, and does not change routing or auth code on your behalf.",
          ],
        },
        {
          heading: "Fix only the safe gaps",
          paragraphs: [
            "When the report offers an automatic fix, run the narrow command you actually want. cf-ready fix --seo can draft a sitemap and metadata suggestions. cf-ready fix --ai-readiness can draft robots.txt, llms.txt, llms-full.txt, an OpenAPI file, and an MCP server card. Open the diff and read it. The files are starting points for a readiness report you stand behind, not a claim that the site is finished.",
            "Skip the fix commands if you only wanted the assessment. A scan is complete without them. Adding files you have not reviewed is how a helpful draft becomes a wrong canonical URL or a robots rule that blocks the wrong path.",
          ],
        },
        {
          heading: "Repeat the scan on pull requests",
          paragraphs: [
            "The CF Ready GitHub Action runs cf-ready scan in CI, uploads SARIF, and can fail the job when blockers exist. Pin the action to a released tag from the sycu8/Cloudflare-Go-Live-Readiness repository, and point it at the directory that contains the app. A companion action can open a pull request that contains only the safe AI and SEO assets. It does not merge that pull request. Branch protection stays in charge of what lands.",
            "CI is also where the readiness report stays honest. Local scans drift when someone forgets to re-run them after a dependency bump. A pull request check makes the score part of review, next to tests.",
          ],
        },
        {
          heading: "After the first green report",
          paragraphs: [
            "Re-run npx @orangecloud/cf-ready scan when the dependency tree or the framework config changes. Before you announce the launch, run cf-ready deploy-check for scripts and Wrangler config, then cf-ready smoke-test with your production URL. The smoke test confirms the homepage, robots.txt, and sitemap.xml respond, along with redirect behavior and basic security headers.",
            "Command docs live at https://ready.orangecloud.vn/docs/commands.html and the Web Agent is at https://ready.orangecloud.vn/app/. The first scan is the baseline. The smoke test is the proof that the deployed site matches the readiness report you signed off.",
          ],
        },
      ],
    },
  },
  {
    id: "seed-seo-cloudflare",
    topicId: "seo-cloudflare",
    publishedAt: "2026-10-17T10:00:00.000Z",
    draft: {
      title: "SEO Tips for Sites Hosted on Cloudflare",
      excerpt:
        "Use Cloudflare to make a sound page faster, then fix titles, canonicals, sitemaps, and structured data. CF Ready can list the gaps.",
      metaDescription:
        "Cloudflare SEO tips for metadata, sitemaps, structured data, and Core Web Vitals, plus how CF Ready checks them.",
      keywords: [
        "SEO",
        "Cloudflare SEO",
        "sitemap",
        "Core Web Vitals",
        "structured data",
        "meta tags",
      ],
      imagePrompt:
        "Abstract search document and rising performance bars in navy and orange, clean editorial illustration, no text, no logos",
      imageAlt: "Abstract illustration of a page document beside performance bars",
      sections: [
        {
          heading: "A fast network helps a finished page",
          paragraphs: [
            "Cloudflare SEO starts with an honest split. The network can improve what users and crawlers feel: cached assets, modern TLS, and a nearby edge location reduce time to first byte. That supports Largest Contentful Paint, one of the Core Web Vitals. It does not rewrite thin content, repair a layout that shifts, or remove a script that blocks the next interaction.",
            "Treat Interaction to Next Paint and Cumulative Layout Shift as product work in the page itself. Use the edge to make a fast page faster. Caching HTML aggressively is powerful, and it is also how a stale title or a stale canonical can linger, so pair cache rules with a purge path you trust during launches.",
          ],
        },
        {
          heading: "Meta tags that match the page",
          paragraphs: [
            "Each important URL needs a unique title, a meta description that says what the page is for, and a canonical URL so duplicates do not compete. Open Graph and Twitter card tags control the preview people see when the link is shared. Use one clear H1, a sensible heading order, and alt text on images that carry information. These meta tags are ordinary, and they are the ones that go missing when a template only sets them on the homepage.",
            "Write the description for a human who has not visited yet. Keyword phrases help when they belong in that sentence. Repeating the same phrase across every route reads as stuffing and usually describes the site less clearly. Cloudflare SEO work is mostly this kind of template discipline, applied to every route the sitemap will list.",
          ],
        },
        {
          heading: "Sitemaps, robots, and structured data",
          paragraphs: [
            "Publish a sitemap of the URLs you want discovered, and reference it from robots.txt. Robots rules should match real intent. Public marketing pages are usually open. Admin, draft, and account routes are usually closed. A sitemap that lists URLs the site no longer serves wastes crawl attention, so generate it from the route list you actually ship.",
            "JSON-LD structured data, such as an Organization, WebSite, or Article record, gives crawlers an explicit reading of the page. Keep it consistent with the visible text. If you also care about AI crawlers, llms.txt can sit beside robots.txt as a short map of the site. That file is an AI-readiness aid more than a classic ranking factor, and it is convenient to add while discovery files are already open.",
          ],
        },
        {
          heading: "Let a checklist name the gaps",
          paragraphs: [
            "Run cf-ready seo-ready for a focused pass, or cf-ready scan when you want SEO inside the full score. SEO is 10 percent of the default CF Ready score and does not block launch unless you change that policy. The findings still name missing titles, descriptions, canonicals, Open Graph, Twitter cards, a sitemap, robots rules, structured data, heading issues, and images without alt text.",
            "cf-ready fix --seo drafts assets and suggestions, including a sitemap draft and JSON-LD starter. Apply them in a pull request and read the diff. The command cannot invent a content strategy, and a generated canonical is only correct if the production URL in your config is correct. Confirm live behavior with cf-ready smoke-test and your production URL. The smoke test checks status codes and whether robots.txt and sitemap.xml are actually reachable, which is the Cloudflare SEO failure mode a local file alone cannot show.",
          ],
        },
        {
          heading: "A practical sequence",
          paragraphs: [
            "Pick one layout, set title, description, and canonical there, and make every route that uses the layout pass those fields in. Generate the sitemap from real routes. Re-run the SEO check and clear the high-severity findings before spending time on synonym lists. Then look at cache and redirect rules in Cloudflare, because a redirect loop or an uncached document shows up as both a performance issue and an indexing issue.",
            "When you want the rest of the launch picture, open https://ready.orangecloud.vn and run a full scan from the Web Agent or the CLI. The edge can deliver the page quickly. The page still has to be the one you meant to publish, with meta tags, a sitemap, and structured data that describe it accurately.",
          ],
        },
      ],
    },
  },
];

function sqlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function seedSlug(post: SeedBlogPost): string {
  return slugify(post.draft.title, post.topicId, post.publishedAt);
}

export function renderBlogSeedMigration(): string {
  const posts = [...SEED_BLOG_POSTS].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const latest = posts[posts.length - 1];
  if (!latest) throw new Error("No seed posts configured");

  const header = `-- Editorial seed for the first four blog backlog topics.
-- Topics: what-is-cloudflare, cf-ready-overview, cf-ready-howto, seo-cloudflare.
-- Hero images are omitted (image_r2_key NULL); the blog UI renders a placeholder.
-- Safe to re-apply: INSERT OR IGNORE, and the generation cursor only moves forward.
-- Daily Workers AI rotation continues at AI readiness when next_topic_index was still below 4.

`;

  const inserts = posts.map((post) => {
    const words = countWordsFromDraft(post.draft);
    return `INSERT OR IGNORE INTO blog_posts (
  id, slug, topic_id, title, excerpt, body_markdown, body_html, meta_description,
  keywords, image_r2_key, image_alt, word_count, status, model_text, model_image,
  published_at, created_at, updated_at
) VALUES (
  ${sqlQuote(post.id)},
  ${sqlQuote(seedSlug(post))},
  ${sqlQuote(post.topicId)},
  ${sqlQuote(post.draft.title)},
  ${sqlQuote(post.draft.excerpt)},
  ${sqlQuote(draftToMarkdown(post.draft))},
  ${sqlQuote(draftToHtml(post.draft))},
  ${sqlQuote(post.draft.metaDescription)},
  ${sqlQuote(JSON.stringify(post.draft.keywords))},
  NULL,
  ${sqlQuote(post.draft.imageAlt)},
  ${words},
  'published',
  ${sqlQuote(SEED_MODEL_TEXT)},
  NULL,
  ${sqlQuote(post.publishedAt)},
  ${sqlQuote(post.publishedAt)},
  ${sqlQuote(post.publishedAt)}
);`;
  });

  // Avoid CASE/BEGIN. Wrangler's D1 splitter treats those as compound statements
  // and can merge the following migration-bookkeeping INSERT into this statement.
  const cursor = `UPDATE blog_generation_state
SET
  next_topic_index = max(next_topic_index, ${posts.length}),
  last_generated_at = max(
    coalesce(last_generated_at, '1970-01-01T00:00:00.000Z'),
    ${sqlQuote(latest.publishedAt)}
  ),
  last_post_id = coalesce(last_post_id, ${sqlQuote(latest.id)}),
  updated_at = ${sqlQuote(SEED_CURSOR_UPDATED_AT)}
WHERE id = 1
  AND (
    next_topic_index < ${posts.length}
    OR last_generated_at IS NULL
    OR last_post_id IS NULL
    OR last_generated_at < ${sqlQuote(latest.publishedAt)}
  );
`;

  return `${header}${inserts.join("\n\n")}\n\n${cursor}`;
}
