(function registerCfReadyWebMcp() {
  var controller = new AbortController();
  var registered = false;

  var DOC_PAGES = [
    {
      title: "Getting started",
      url: "/docs/getting-started.html",
      summary: "Install the CLI and run the first Cloudflare go-live scan.",
    },
    {
      title: "Commands",
      url: "/docs/commands.html",
      summary: "scan, security-scan, ai-ready, seo-ready, deploy-check, and fix.",
    },
    {
      title: "AI readiness",
      url: "/docs/ai-readiness.html",
      summary: "robots.txt, llms.txt, OpenAPI, MCP server cards, and auth.md.",
    },
    {
      title: "Security readiness",
      url: "/docs/security-readiness.html",
      summary: "Headers, secrets, dependencies, and CORS checks.",
    },
    {
      title: "SEO readiness",
      url: "/docs/seo-readiness.html",
      summary: "Metadata, canonical URLs, sitemap, and crawlability.",
    },
    {
      title: "Web Agent",
      url: "/docs/web-agent.html",
      summary: "Run scans in the browser by uploading a ZIP or importing GitHub.",
    },
  ];

  function modelContext() {
    if (typeof document !== "undefined" && document.modelContext && typeof document.modelContext.registerTool === "function") {
      return document.modelContext;
    }
    if (typeof navigator !== "undefined" && navigator.modelContext && typeof navigator.modelContext.registerTool === "function") {
      return navigator.modelContext;
    }
    return null;
  }

  function pageScore(page, needle) {
    if (!needle) return 1;
    var title = page.title.toLowerCase();
    var summary = page.summary.toLowerCase();
    if (title.indexOf(needle) !== -1) return 3;
    if (summary.indexOf(needle) !== -1) return 1;
    return 0;
  }

  function rankedPages(query) {
    var needle = String(query || "").trim().toLowerCase();
    var ranked = DOC_PAGES.map(function (page) {
      return { page: page, score: pageScore(page, needle) };
    }).filter(function (entry) {
      return entry.score > 0;
    }).sort(function (a, b) {
      return b.score - a.score;
    });
    return (ranked.length ? ranked : DOC_PAGES.map(function (page) {
      return { page: page, score: 0 };
    })).map(function (entry) {
      return entry.page;
    });
  }

  function searchDocs(query) {
    return {
      results: rankedPages(query).map(function (page) {
        return page.title + ": " + new URL(page.url, window.location.origin).href + " — " + page.summary;
      }),
    };
  }

  function register() {
    if (registered) return;
    var mc = modelContext();
    if (!mc) return;
    registered = true;
    var options = { signal: controller.signal };
    var tools = [
      {
        name: "search_cf_ready_docs",
        description: "Search CF Ready documentation for CLI commands, readiness checks, and Cloudflare migration guidance.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search keywords, such as a command name or readiness category.",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
        execute: function (input) {
          return Promise.resolve(searchDocs(input && input.query));
        },
      },
      {
        name: "get_cf_ready_install_command",
        description: "Return the command that runs a local Cloudflare go-live readiness scan.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: function () {
          return Promise.resolve({ command: "npx @orangecloud/cf-ready scan" });
        },
      },
      {
        name: "open_cf_ready_web_agent",
        description: "Open the CF Ready Web Agent, where a project ZIP or GitHub repository can be scanned in the browser.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: function () {
          var href = new URL("/app/", window.location.origin).href;
          if (typeof window.location.assign === "function") window.location.assign(href);
          return Promise.resolve({ url: href });
        },
      },
    ];

    tools.forEach(function (tool) {
      Promise.resolve(document.modelContext && document.modelContext.registerTool
        ? document.modelContext.registerTool(tool, options)
        : navigator.modelContext.registerTool(tool, options)).catch(function () {});
    });
  }

  function bindDocsSearch() {
    var form = document.querySelector("form.docs-search");
    if (!form || form.dataset.bound === "1") return;
    form.dataset.bound = "1";
    form.addEventListener("submit", function (event) {
      var input = form.querySelector("input[name=q]");
      var query = input && input.value ? input.value.trim().toLowerCase() : "";
      if (!query) return;
      var match = rankedPages(query)[0];
      if (!match || pageScore(match, query) === 0) return;
      event.preventDefault();
      window.location.href = match.url;
    });
  }

  register();
  bindDocsSearch();
  window.addEventListener("DOMContentLoaded", function () {
    register();
    bindDocsSearch();
  });
  window.addEventListener("load", register);
  window.addEventListener("pagehide", function () {
    controller.abort();
  });
})();
