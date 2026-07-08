import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  chat,
  createSession,
  execCommand,
  getResults,
  getStatus,
  githubAuthUrl,
  importGitHub,
  listFiles,
  listGitHubRepos,
  uploadZip,
  type Finding,
  type ScanScores,
} from "./api/client.js";

const COMMANDS = [
  "scan",
  "inspect",
  "security-scan",
  "ai-ready",
  "seo-ready",
  "deploy-check",
  "migration-plan",
  "ai-optimize",
];

export async function mountApp(root: HTMLElement): Promise<void> {
  let sessionId = sessionStorage.getItem("cf-ready-session") ?? "";
  if (!sessionId) {
    sessionId = await createSession();
    sessionStorage.setItem("cf-ready-session", sessionId);
  }

  root.innerHTML = `
    <header class="app-header">
      <h1>cf-ready Agent</h1>
      <div>
        <span class="status-pill" id="status-pill">idle</span>
        <a href="/" style="margin-left:1rem">Docs</a>
      </div>
    </header>
    <div class="layout">
      <aside class="panel" id="project-panel">
        <div class="panel-header">Project</div>
        <div class="panel-body">
          <div class="dropzone" id="dropzone">
            Drop ZIP here or click to upload
            <input type="file" id="file-input" accept=".zip" hidden />
          </div>
          <div class="input-row">
            <input type="text" id="github-url" placeholder="https://github.com/owner/repo" />
            <button id="import-btn">Import</button>
          </div>
          <div class="input-row">
            <button class="secondary" id="github-connect">Connect GitHub</button>
            <button class="secondary" id="github-repos" disabled>Repos</button>
          </div>
          <ul class="file-list" id="file-list"></ul>
        </div>
      </aside>
      <main class="center-panel">
        <div class="panel-header">Agent</div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input-row">
          <input type="text" id="chat-input" placeholder="Ask in Vietnamese or English… e.g. kiểm tra bảo mật" />
          <button id="chat-send">Send</button>
        </div>
        <div class="chips" id="chips"></div>
        <div class="terminal-wrap" id="terminal"></div>
      </main>
      <aside class="panel">
        <div class="panel-header">Results</div>
        <div class="panel-body" id="results-panel">
          <p style="color:var(--muted)">Run <code>scan</code> to see readiness scores.</p>
        </div>
      </aside>
    </div>
  `;

  const statusPill = root.querySelector("#status-pill") as HTMLElement;
  const dropzone = root.querySelector("#dropzone") as HTMLElement;
  const fileInput = root.querySelector("#file-input") as HTMLInputElement;
  const githubUrl = root.querySelector("#github-url") as HTMLInputElement;
  const importBtn = root.querySelector("#import-btn") as HTMLButtonElement;
  const githubConnect = root.querySelector("#github-connect") as HTMLButtonElement;
  const githubReposBtn = root.querySelector("#github-repos") as HTMLButtonElement;
  const fileList = root.querySelector("#file-list") as HTMLUListElement;
  const chips = root.querySelector("#chips") as HTMLElement;
  const terminalEl = root.querySelector("#terminal") as HTMLElement;
  const resultsPanel = root.querySelector("#results-panel") as HTMLElement;
  const chatMessages = root.querySelector("#chat-messages") as HTMLElement;
  const chatInput = root.querySelector("#chat-input") as HTMLInputElement;
  const chatSend = root.querySelector("#chat-send") as HTMLButtonElement;

  const term = new Terminal({
    theme: {
      background: "#000000",
      foreground: "#f5f5f5",
      cursor: "#f38020",
    },
    fontFamily: "ui-monospace, monospace",
    fontSize: 13,
    cursorBlink: true,
  });
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(terminalEl);
  fitAddon.fit();

  window.addEventListener("resize", () => fitAddon.fit());

  let prompt = "cf-ready> ";
  let inputBuffer = "";

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

  function addChatBubble(role: "user" | "agent", text: string) {
    const div = document.createElement("div");
    div.className = `chat-bubble ${role}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function refreshFiles() {
    try {
      const { files } = await listFiles(sessionId);
      fileList.innerHTML = files.slice(0, 50).map((f) => `<li>${f}</li>`).join("");
    } catch {
      fileList.innerHTML = "";
    }
  }

  function renderResults(data: {
    productionReady?: boolean;
    scores?: ScanScores;
    blockers?: Finding[];
    findings?: Finding[];
    markdown?: string;
  }) {
    if (!data.scores) {
      resultsPanel.innerHTML = `<pre style="font-size:0.8rem;white-space:pre-wrap">${JSON.stringify(data, null, 2)}</pre>`;
      return;
    }

    const scores = data.scores;
    const blockers = data.blockers ?? [];
    const findings = (data.findings ?? []).filter((f) => f.severity !== "info").slice(0, 20);

    resultsPanel.innerHTML = `
      <p>${data.productionReady ? '<span style="color:var(--success)">Production ready</span>' : '<span style="color:var(--danger)">Not production ready</span>'}</p>
      <div class="score-grid">
        ${scoreCard("Overall", scores.overall)}
        ${scoreCard("Migration", scores.migration)}
        ${scoreCard("Security", scores.security)}
        ${scoreCard("AI", scores.aiReadiness)}
        ${scoreCard("SEO", scores.seo)}
        ${scoreCard("Deployment", scores.deployment)}
      </div>
      ${blockers.length ? `<h4 style="color:var(--danger)">Blockers (${blockers.length})</h4><ul class="findings">${blockers.map(findingItem).join("")}</ul>` : ""}
      <h4>Findings</h4>
      <ul class="findings">${findings.map(findingItem).join("") || "<li>No issues</li>"}</ul>
      ${data.markdown ? `<div class="markdown-preview">${escapeHtml(data.markdown)}</div>` : ""}
    `;
  }

  function scoreCard(label: string, value: number) {
    return `<div class="score-card"><div class="label">${label}</div><div class="value">${value}</div></div>`;
  }

  function findingItem(f: Finding) {
    return `<li><span class="severity-${f.severity}">[${f.severity}]</span> ${escapeHtml(f.title)}</li>`;
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function pollStatus() {
    const status = await getStatus(sessionId);
    setStatus(status.status ?? "idle");
    return status;
  }

  async function runLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;

    setStatus("running");
    writeln(`$ cf-ready ${trimmed}`);

    try {
      const result = await execCommand(sessionId, trimmed);
      if (result.stderr) writeln(result.stderr);
      if (result.stdout) {
        try {
          const parsed = JSON.parse(result.stdout);
          writeln(JSON.stringify(parsed, null, 2).slice(0, 4000));
          renderResults(parsed);
        } catch {
          writeln(result.stdout.slice(0, 4000));
        }
      }
      if (result.data) renderResults(result.data as Parameters<typeof renderResults>[0]);
      if (result.error) writeln(`Error: ${result.error}`);
    } catch (err) {
      writeln(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
      return;
    }

    await pollStatus();
    const results = await getResults(sessionId);
    if (results.result) renderResults(results.result as Parameters<typeof renderResults>[0]);
    if (results.markdown) renderResults({ ...(results.result as object), markdown: results.markdown });
  }

  async function handleUpload(file: File) {
    setStatus("importing");
    writeln(`Uploading ${file.name}…`);
    try {
      await uploadZip(sessionId, file);
      writeln("Upload complete. Project ready.");
      setStatus("idle");
      await refreshFiles();
      addChatBubble("agent", `Imported ${file.name}. Try: scan`);
    } catch (err) {
      writeln(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
    }
  }

  writeln("cf-ready Web Agent — upload source or import GitHub, then run commands.");
  writeln("Type a command (e.g. scan) or use quick chips below.");
  writePrompt();

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
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = cmd;
    chip.onclick = () => runLine(cmd);
    chips.appendChild(chip);
  }

  dropzone.onclick = () => fileInput.click();
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
    if (!url) return;
    setStatus("importing");
    writeln(`Importing ${url}…`);
    try {
      await importGitHub(sessionId, url);
      writeln("GitHub import complete.");
      setStatus("idle");
      await refreshFiles();
      addChatBubble("agent", `Imported ${url}. Try: scan`);
    } catch (err) {
      writeln(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
    }
  };

  githubConnect.onclick = () => {
    window.location.href = githubAuthUrl(sessionId);
  };

  githubReposBtn.onclick = async () => {
    try {
      const { repos } = await listGitHubRepos(sessionId);
      const pick = repos.slice(0, 20).map((r) => r.full_name).join("\n");
      addChatBubble("agent", `Your repos:\n${pick}`);
      githubReposBtn.disabled = false;
    } catch {
      addChatBubble("agent", "Connect GitHub first.");
    }
  };

  async function sendChat() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    chatInput.value = "";
    addChatBubble("user", msg);
    chatSend.disabled = true;
    try {
      const result = await chat(sessionId, msg);
      addChatBubble("agent", result.reply ?? "Done.");
      if (result.command) writeln(`$ ${result.command}`);
      if (result.result?.data) renderResults(result.result.data);
      else if (result.result) {
        const r = result.result as { stdout?: string };
        if (r.stdout) {
          try {
            renderResults(JSON.parse(r.stdout));
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      addChatBubble("agent", `Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      chatSend.disabled = false;
    }
  }

  chatSend.onclick = () => void sendChat();
  chatInput.onkeydown = (e) => {
    if (e.key === "Enter") void sendChat();
  };

  const params = new URLSearchParams(window.location.search);
  if (params.get("github") === "connected") {
    addChatBubble("agent", "GitHub connected. Use Repos or paste a repo URL.");
    githubReposBtn.disabled = false;
  }

  await pollStatus();
}
