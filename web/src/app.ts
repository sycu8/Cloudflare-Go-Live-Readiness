import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  chat,
  ensureWorkspaceSession,
  execCommand,
  getResults,
  getStatus,
  githubAuthUrl,
  importGitHub,
  listFiles,
  listGitHubRepos,
  uploadZip,
  regenerateReport,
} from "./api/client.js";
import { getAuthState, getAuthConfig, logout, type AuthState, type AuthProviderConfig } from "./api/auth.js";
import {
  renderEmptyResults,
  renderResults,
  type ScanResultData,
} from "./ui/render.js";
import {
  mountUserMenu,
  renderLoginLoading,
  renderLoginScreen,
  renderOpenModeBanner,
  renderUserMenu,
} from "./ui/auth.js";

const COMMANDS: Array<{ name: string; desc: string }> = [
  { name: "scan", desc: "Full readiness scan" },
  { name: "inspect", desc: "Detect framework" },
  { name: "security-scan", desc: "Security + SARIF" },
  { name: "ai-ready", desc: "AI readiness" },
  { name: "seo-ready", desc: "SEO checks" },
  { name: "deploy-check", desc: "Deploy readiness" },
  { name: "migration-plan", desc: "Migration plan" },
  { name: "ai-optimize", desc: "AI suggestions" },
];

type MobileTab = "project" | "workspace" | "results";
type WorkspaceView = "chat" | "cli";

const TERMINAL_THEMES = {
  light: {
    background: "#f8fafc",
    foreground: "#0f172a",
    cursor: "#f97316",
    selectionBackground: "rgba(249, 115, 22, 0.25)",
  },
  dark: {
    background: "#000000",
    foreground: "#e4e4e7",
    cursor: "#f38020",
    selectionBackground: "rgba(243, 128, 32, 0.3)",
  },
} as const;

const ANONYMOUS_AUTH: AuthState = {
  authenticated: false,
  user: null,
  providers: [],
  githubConnected: false,
};

export async function mountApp(root: HTMLElement): Promise<void> {
  root.innerHTML = renderLoginLoading();
  const config = await getAuthConfig();
  const params = new URLSearchParams(window.location.search);
  const authError = params.get("auth_error");

  if (config.openMode) {
    await mountAgentApp(root, ANONYMOUS_AUTH, { openMode: true, config });
    return;
  }

  const auth = await getAuthState();
  if (!auth.authenticated || !auth.user) {
    root.innerHTML = renderLoginScreen(config, authError);
    if (authError) {
      window.history.replaceState({}, "", "/app/");
    }
    return;
  }
  await mountAgentApp(root, auth, { openMode: false, config });
}

type AgentMountOptions = {
  openMode: boolean;
  config: AuthProviderConfig;
};

async function mountAgentApp(
  root: HTMLElement,
  auth: AuthState,
  options: AgentMountOptions,
): Promise<void> {
  const sessionId = await ensureWorkspaceSession();

  let lastResultData: ScanResultData | null = null;
  let findingsFilter = "all";
  let projectName = "";
  let fileCount = 0;

  root.innerHTML = `
    ${options.openMode ? renderOpenModeBanner(options.config) : ""}
    <header class="app-header">
      <div class="brand">
        <img class="brand__logo" src="/assets/logo-icon.svg" alt="" width="36" height="36" decoding="async" />
        <div class="brand__text">
          <h1>CF Ready Agent</h1>
          <p>Cloudflare Go-Live Readiness</p>
        </div>
      </div>
      <div class="header-actions">
        ${auth.user ? renderUserMenu(auth.user.name ?? "", auth.user.email, auth.user.avatarUrl) : ""}
        <span class="status-pill idle" id="status-pill" title="Session status">idle</span>
        <a class="link-btn" href="/">Docs</a>
      </div>
    </header>

    <div class="app-shell">
      <div class="layout">
        <aside class="panel panel--project is-active" id="panel-project" aria-label="Project">
          <div class="panel-header">
            <h2>Project</h2>
            <span id="file-count-label">Chưa có source</span>
          </div>
          <div class="panel-body">
            <div class="project-card" id="project-card">
              <p class="project-card__name" id="project-name">Chưa import project</p>
              <p class="project-card__hint">Upload ZIP hoặc import GitHub để bắt đầu scan.</p>
            </div>

            <p class="section-label">Upload source</p>
            <div class="dropzone" id="dropzone" role="button" tabindex="0" aria-label="Upload ZIP file">
              <div class="dropzone__icon" aria-hidden="true">📦</div>
              <p class="dropzone__title">Kéo thả hoặc chọn file ZIP</p>
              <p class="dropzone__sub">Tối đa 50MB · không cần node_modules</p>
              <input type="file" id="file-input" accept=".zip" hidden />
            </div>

            <p class="section-label">GitHub</p>
            <div class="field">
              <label for="github-url">Repo URL</label>
              <input type="text" id="github-url" placeholder="https://github.com/owner/repo" autocomplete="off" />
            </div>
            <div class="btn-row">
              <button type="button" class="primary" id="import-btn">Import URL</button>
              ${options.openMode ? "" : auth.githubConnected ? "" : '<button type="button" class="ghost" id="github-connect">Connect GitHub</button>'}
              <button type="button" class="ghost" id="github-repos" ${auth.githubConnected ? "" : "disabled"}>My repos</button>
            </div>
            <div class="repo-list" id="repo-list" hidden>
              <div class="repo-list__head">
                <span>Your repositories</span>
                <button type="button" class="ghost repo-list__refresh" id="github-repos-refresh">Refresh</button>
              </div>
              <ul class="repo-list__items" id="repo-list-items"></ul>
            </div>

            <div class="file-tree" id="file-tree" hidden>
              <div class="file-tree__head">Files (<span id="file-count">0</span>)</div>
              <ul id="file-list"></ul>
            </div>
          </div>
        </aside>

        <main class="panel workspace-panel is-active" id="panel-workspace" aria-label="Workspace">
          <div class="panel-header">
            <h2>Workspace</h2>
            <span>Chat + CLI</span>
          </div>
          <div class="workspace-layout">
            <div class="workspace-tabs" role="tablist" aria-label="Workspace mode">
              <button type="button" class="active" data-workspace="chat" role="tab" aria-selected="true">💬 Chat</button>
              <button type="button" data-workspace="cli" role="tab" aria-selected="false">⌨️ CLI</button>
            </div>

            <div class="workspace-view active" data-view="chat" id="view-chat">
              <div class="chat-section">
                <div class="chat-messages" id="chat-messages" aria-live="polite">
                  <div class="chat-welcome">
                    <strong>Xin chào!</strong> Tôi có thể giúp bạn chạy cf-ready.
                    <ul>
                      <li>Hỏi: <em>"kiểm tra bảo mật"</em> → security-scan</li>
                      <li>Hỏi: <em>"scan project"</em> → full scan</li>
                      <li>Hoặc dùng CLI tab để gõ lệnh trực tiếp</li>
                    </ul>
                  </div>
                </div>
                <div class="chat-input-row">
                  <input type="text" id="chat-input" placeholder="Hỏi bằng tiếng Việt hoặc English…" aria-label="Chat message" />
                  <button type="button" class="primary" id="chat-send">Gửi</button>
                </div>
              </div>
            </div>

            <div class="workspace-view" data-view="cli" id="view-cli">
              <div class="cli-section">
                <div class="commands-section">
                  <h3>Quick commands</h3>
                  <div class="chips" id="chips"></div>
                </div>
                <div class="terminal-wrap" id="terminal" aria-label="cf-ready terminal"></div>
              </div>
            </div>
          </div>
        </main>

        <aside class="panel panel--results" id="panel-results" aria-label="Results">
          <div class="panel-header">
            <h2>Results</h2>
            <span id="results-summary">—</span>
          </div>
          <div class="panel-body" id="results-panel">
            ${renderEmptyResults()}
          </div>
        </aside>
      </div>
    </div>

    <nav class="mobile-tabs" aria-label="Mobile navigation">
      <button type="button" class="active" data-tab="project" aria-current="page">
        <span class="tab-icon" aria-hidden="true">📁</span>
        Project
      </button>
      <button type="button" data-tab="workspace">
        <span class="tab-icon" aria-hidden="true">⚡</span>
        Workspace
      </button>
      <button type="button" data-tab="results">
        <span class="tab-icon" aria-hidden="true">📊</span>
        Results
      </button>
    </nav>
  `;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;

  if (auth.user) {
    mountUserMenu(root, async () => {
      await logout();
      sessionStorage.removeItem("cf-ready-session");
      window.location.reload();
    });
  }

  const statusPill = $("#status-pill");
  const dropzone = $("#dropzone");
  const fileInput = $("#file-input") as HTMLInputElement;
  const githubUrl = $("#github-url") as HTMLInputElement;
  const importBtn = $("#import-btn");
  const githubConnect = $("#github-connect");
  const githubReposBtn = $("#github-repos");
  const githubReposRefresh = $("#github-repos-refresh");
  const repoList = $("#repo-list");
  const repoListItems = $("#repo-list-items");
  const fileList = $("#file-list");
  const fileTree = $("#file-tree");
  const fileCountEl = $("#file-count");
  const fileCountLabel = $("#file-count-label");
  const projectNameEl = $("#project-name");
  const projectCard = $("#project-card");
  const chips = $("#chips");
  const terminalEl = $("#terminal");
  const resultsPanel = $("#results-panel");
  const resultsSummary = $("#results-summary");
  const chatMessages = $("#chat-messages");
  const chatInput = $("#chat-input") as HTMLInputElement;
  const chatSend = $("#chat-send");

  window.cfReadyTheme?.remount();

  const term = new Terminal({
    theme: { ...TERMINAL_THEMES.dark },
    fontFamily: "JetBrains Mono, ui-monospace, monospace",
    fontSize: 13,
    lineHeight: 1.35,
    cursorBlink: true,
    scrollback: 2000,
  });
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(terminalEl);

  function syncTerminalTheme() {
    const theme = window.cfReadyTheme?.get() ?? "dark";
    term.options.theme = { ...TERMINAL_THEMES[theme === "light" ? "light" : "dark"] };
  }

  syncTerminalTheme();
  window.addEventListener("cf-ready-theme-change", (event) => {
    const theme = (event as CustomEvent<{ theme: string }>).detail.theme;
    term.options.theme = { ...TERMINAL_THEMES[theme === "light" ? "light" : "dark"] };
  });

  const prompt = "cf-ready> ";
  let inputBuffer = "";

  function fitTerminal() {
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {
        /* container may be hidden on mobile */
      }
    });
  }

  window.addEventListener("resize", fitTerminal);

  function writeln(text: string) {
    term.writeln(text);
  }

  function writePrompt() {
    term.write(`\r\n${prompt}`);
  }

  function setStatus(status: string) {
    statusPill.textContent = status;
    statusPill.className = `status-pill ${status}`;
  }

  function setProjectInfo(name: string, hint: string) {
    projectName = name;
    projectNameEl.textContent = name;
    projectCard.querySelector(".project-card__hint")!.textContent = hint;
    fileCountLabel.textContent = fileCount > 0 ? `${fileCount} files` : "Đã import";
  }

  function addChatBubble(role: "user" | "agent", text: string) {
    const welcome = chatMessages.querySelector(".chat-welcome");
    if (welcome) welcome.remove();
    const div = document.createElement("div");
    div.className = `chat-bubble ${role}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function updateResultsPanel() {
    if (!lastResultData) {
      resultsPanel.innerHTML = renderEmptyResults();
      resultsSummary.textContent = "—";
      return;
    }
    resultsPanel.innerHTML = renderResults(lastResultData, findingsFilter, sessionId);
    resultsPanel.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        findingsFilter = (btn as HTMLElement).dataset.filter ?? "all";
        updateResultsPanel();
      });
    });
    const regenerateBtn = resultsPanel.querySelector('[data-action="regenerate-report"]');
    regenerateBtn?.addEventListener("click", () => {
      void (async () => {
        regenerateBtn.setAttribute("disabled", "true");
        try {
          const blob = await regenerateReport(sessionId);
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "cf-ready-report.pdf";
          link.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          addChatBubble(
            "agent",
            `PDF error: ${err instanceof Error ? err.message : String(err)}`,
          );
        } finally {
          regenerateBtn.removeAttribute("disabled");
        }
      })();
    });
    const scores = lastResultData.scores;
    if (scores) {
      resultsSummary.textContent = `${scores.overall}/100`;
    }
  }

  function showResults(data: ScanResultData) {
    lastResultData = { ...lastResultData, ...data };
    if (data.inspection?.projectName) {
      setProjectInfo(data.inspection.projectName, "Scan completed — xem kết quả bên phải.");
    }
    updateResultsPanel();
    if (window.innerWidth <= 1024) {
      setMobileTab("results");
    }
  }

  async function refreshFiles() {
    try {
      const { files } = await listFiles(sessionId);
      fileCount = files.length;
      fileCountEl.textContent = String(fileCount);
      fileCountLabel.textContent = `${fileCount} files`;
      fileList.innerHTML = files
        .slice(0, 80)
        .map((f) => `<li title="${f}">${f}</li>`)
        .join("");
      fileTree.hidden = files.length === 0;
    } catch {
      fileTree.hidden = true;
    }
  }

  function setMobileTab(tab: MobileTab) {
    root.querySelectorAll(".mobile-tabs button").forEach((btn) => {
      const active = (btn as HTMLElement).dataset.tab === tab;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-current", active ? "page" : "false");
    });
    root.querySelectorAll(".panel").forEach((panel) => {
      panel.classList.remove("is-active");
    });
    $(`#panel-${tab}`).classList.add("is-active");
    if (tab === "workspace") fitTerminal();
  }

  function setWorkspaceView(view: WorkspaceView) {
    root.querySelectorAll(".workspace-tabs button").forEach((btn) => {
      const active = (btn as HTMLElement).dataset.workspace === view;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    root.querySelectorAll(".workspace-view").forEach((el) => {
      el.classList.toggle("active", (el as HTMLElement).dataset.view === view);
    });
    if (view === "cli") fitTerminal();
  }

  async function pollStatus() {
    try {
      const status = await getStatus(sessionId);
      setStatus(status.status ?? "idle");
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Session expired") || message.includes("Authentication required")) {
        sessionStorage.removeItem("cf-ready-session");
        window.location.reload();
      }
      throw err;
    }
  }

  async function runLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;

    setStatus("running");
    setWorkspaceView("cli");
    writeln(`$ cf-ready ${trimmed}`);

    try {
      const result = await execCommand(sessionId, trimmed);
      if (result.stderr) writeln(result.stderr);
      if (result.stdout) {
        try {
          const parsed = JSON.parse(result.stdout) as ScanResultData;
          writeln(`✓ Done — Overall: ${parsed.scores?.overall ?? "—"}/100`);
          showResults(parsed);
        } catch {
          writeln(result.stdout.slice(0, 3000));
        }
      }
      if (result.data) showResults(result.data as ScanResultData);
      if ("markdown" in result && result.markdown) {
        showResults({ ...(result.data as ScanResultData), markdown: String(result.markdown) });
      }
      if (result.error) writeln(`Error: ${result.error}`);
    } catch (err) {
      writeln(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
      return;
    }

    await pollStatus();
    const results = await getResults(sessionId);
    if (results.result) showResults(results.result as ScanResultData);
    if (results.markdown) {
      showResults({ ...(results.result as ScanResultData), markdown: results.markdown });
    }
  }

  async function handleUpload(file: File) {
    setStatus("importing");
    writeln(`Uploading ${file.name}…`);
    try {
      await uploadZip(sessionId, file);
      const name = file.name.replace(/\.zip$/i, "");
      setProjectInfo(name, "Upload thành công — chạy scan để kiểm tra.");
      writeln("✓ Upload complete.");
      setStatus("idle");
      await refreshFiles();
      addChatBubble("agent", `Đã import ${file.name}. Gõ "scan" hoặc hỏi tôi để bắt đầu.`);
      setMobileTab("workspace");
    } catch (err) {
      writeln(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
    }
  }

  writeln("cf-ready Web Agent");
  writeln("Import project → run scan → xem Results tab.");
  writePrompt();
  fitTerminal();

  term.onData((data) => {
    if (data === "\r") {
      const line = inputBuffer;
      inputBuffer = "";
      runLine(line).finally(writePrompt);
      return;
    }
    if (data === "\u007f") {
      if (inputBuffer.length > 0) {
        inputBuffer = inputBuffer.slice(0, -1);
        term.write("\b \b");
      }
      return;
    }
    if (data >= " " || data === "\t") {
      inputBuffer += data;
      term.write(data);
    }
  });

  for (const cmd of COMMANDS) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.innerHTML = `<span class="chip__name">${cmd.name}</span><span class="chip__desc">${cmd.desc}</span>`;
    chip.onclick = () => runLine(cmd.name);
    chips.appendChild(chip);
  }

  dropzone.onclick = () => fileInput.click();
  dropzone.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  };
  dropzone.ondragover = (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  };
  dropzone.ondragleave = () => dropzone.classList.remove("dragover");
  dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const file = e.dataTransfer?.files[0];
    if (file) void handleUpload(file);
  };
  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    if (file) void handleUpload(file);
  };

  importBtn.onclick = async () => {
    const url = githubUrl.value.trim();
    if (!url) {
      githubUrl.focus();
      return;
    }
    setStatus("importing");
    writeln(`Importing ${url}…`);
    try {
      await importGitHub(sessionId, url);
      const short = url.replace(/^https?:\/\/github\.com\//, "").replace(/^\/+/, "");
      setProjectInfo(short, "GitHub import thành công — chạy scan để kiểm tra.");
      writeln("✓ GitHub import complete.");
      setStatus("idle");
      await refreshFiles();
      addChatBubble("agent", `Đã import ${short}. Thử lệnh scan.`);
      setMobileTab("workspace");
    } catch (err) {
      writeln(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
    }
  };

  githubConnect?.addEventListener("click", () => {
    window.location.href = githubAuthUrl(sessionId);
  });

  async function importRepoByName(fullName: string): Promise<void> {
    const url = `https://github.com/${fullName}`;
    setStatus("importing");
    writeln(`Importing ${fullName}…`);
    try {
      await importGitHub(sessionId, url);
      setProjectInfo(fullName, "GitHub import thành công — chạy scan để kiểm tra.");
      writeln("✓ GitHub import complete.");
      setStatus("idle");
      await refreshFiles();
      addChatBubble("agent", `Đã import ${fullName}. Thử lệnh scan.`);
      setMobileTab("workspace");
    } catch (err) {
      writeln(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
    }
  }

  async function loadGitHubRepos(): Promise<void> {
    try {
      const { repos } = await listGitHubRepos(sessionId);
      repoListItems.innerHTML = "";
      if (repos.length === 0) {
        repoListItems.innerHTML = '<li class="repo-list__empty">No repositories found.</li>';
      } else {
        for (const repo of repos.slice(0, 30)) {
          const li = document.createElement("li");
          li.className = "repo-list__item";
          const label = document.createElement("span");
          label.className = "repo-list__name";
          label.textContent = repo.full_name;
          if (repo.private) {
            const badge = document.createElement("span");
            badge.className = "repo-list__badge";
            badge.textContent = "private";
            label.appendChild(badge);
          }
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "ghost repo-list__import";
          btn.textContent = "Import";
          btn.onclick = () => void importRepoByName(repo.full_name);
          li.append(label, btn);
          repoListItems.appendChild(li);
        }
      }
      repoList.hidden = false;
      setMobileTab("project");
    } catch {
      addChatBubble("agent", "Hãy Connect GitHub trước.");
    }
  }

  githubReposBtn.onclick = () => void loadGitHubRepos();
  githubReposRefresh.onclick = () => void loadGitHubRepos();

  async function sendChat() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    chatInput.value = "";
    addChatBubble("user", msg);
    chatSend.setAttribute("disabled", "true");
    try {
      const result = await chat(sessionId, msg);
      addChatBubble("agent", result.reply ?? "Đã xử lý.");
      if (result.command) writeln(`$ ${result.command}`);
      if (result.result?.data) showResults(result.result.data as ScanResultData);
      else if (result.result) {
        const r = result.result as { stdout?: string };
        if (r.stdout) {
          try {
            showResults(JSON.parse(r.stdout) as ScanResultData);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      addChatBubble("agent", `Lỗi: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      chatSend.removeAttribute("disabled");
    }
  }

  chatSend.onclick = () => void sendChat();
  chatInput.onkeydown = (e) => {
    if (e.key === "Enter") void sendChat();
  };

  root.querySelectorAll(".mobile-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      setMobileTab((btn as HTMLElement).dataset.tab as MobileTab);
    });
  });

  root.querySelectorAll(".workspace-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      setWorkspaceView((btn as HTMLElement).dataset.workspace as WorkspaceView);
    });
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get("github") === "connected" || auth.githubConnected) {
    if (params.get("github") === "connected") {
      addChatBubble("agent", "GitHub đã kết nối. Bấm My repos để import private repo.");
    }
    githubReposBtn.removeAttribute("disabled");
    if (auth.githubConnected || params.get("github") === "connected") {
      void loadGitHubRepos();
    }
  }

  await pollStatus();
}
