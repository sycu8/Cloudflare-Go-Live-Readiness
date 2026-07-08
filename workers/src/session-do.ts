import { getSandbox } from "@cloudflare/sandbox";
import type { Env, ExecRequest, SessionState } from "./types.js";
import {
  fetchGitHubCommitSha,
  githubTarballUrl,
  parseGitHubRepoUrl,
} from "./github.js";
import { getGitHubToken } from "./auth-github.js";
import {
  generatePdfReport,
  pdfReportInputFromScanData,
} from "../../src/generators/pdf-report.js";
import {
  getCachedPdf,
  hashScanPayload,
  putCachedPdf,
  registerGitHubRepoSession,
} from "./reports-cache.js";

const PROJECT_DIR = "/workspace/project";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type SandboxHandle = ReturnType<typeof getSandbox>;

export class SessionDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private session: SessionState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.session = {
      id: state.id.toString(),
      status: "idle",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async load(): Promise<void> {
    const stored = await this.state.storage.get<SessionState>("session");
    if (stored) this.session = stored;
  }

  private async save(): Promise<void> {
    this.session.updatedAt = new Date().toISOString();
    await this.state.storage.put("session", this.session);
  }

  private sandbox(): SandboxHandle {
    // Sandbox binding class is provided by @cloudflare/sandbox at deploy time
    return getSandbox(
      this.env.Sandbox as unknown as Parameters<typeof getSandbox>[0],
      this.session.id,
    );
  }

  private async ensureProjectDir(sandbox: SandboxHandle): Promise<void> {
    await sandbox.exec(`rm -rf ${PROJECT_DIR} && mkdir -p ${PROJECT_DIR}`);
  }

  private async importTarball(sandbox: SandboxHandle, tarballUrl: string): Promise<void> {
    await this.ensureProjectDir(sandbox);
    const result = await sandbox.exec(
      `curl -fsSL "${tarballUrl}" | tar -xz -C ${PROJECT_DIR} --strip-components=1`,
      { timeout: 120000 },
    );
    if (!result.success) {
      throw new Error(result.stderr || "Failed to extract archive");
    }
  }

  async fetch(request: Request): Promise<Response> {
    await this.load();
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === "GET" && path.endsWith("/status")) {
        return Response.json(this.session);
      }

      if (request.method === "GET" && path.endsWith("/results")) {
        return Response.json({
          status: this.session.status,
          result: this.session.lastResult ?? null,
          markdown: this.session.lastMarkdown ?? null,
          error: this.session.lastError ?? null,
          report: this.session.reportCache ?? null,
          sourceCommitSha: this.session.sourceCommitSha ?? null,
        });
      }

      if (request.method === "GET" && path.endsWith("/reports")) {
        return Response.json({
          report: this.session.reportCache ?? null,
          hasResult: Boolean(this.session.lastResult),
          sourceCommitSha: this.session.sourceCommitSha ?? null,
          githubRepo: this.session.githubRepo ?? null,
        });
      }

      if (request.method === "GET" && path.endsWith("/reports/pdf")) {
        return this.handleReportPdf(false);
      }

      if (request.method === "POST" && path.endsWith("/reports/generate")) {
        return this.handleReportPdf(true);
      }

      if (request.method === "POST" && path.endsWith("/refresh/github")) {
        return this.handleRefreshGitHub(request);
      }

      if (request.method === "GET" && path.endsWith("/files")) {
        const sandbox = this.sandbox();
        const list = await sandbox.exec(`find ${PROJECT_DIR} -type f | head -200`, {
          timeout: 30000,
        });
        const files = list.stdout
          .split("\n")
          .map((l) => l.trim().replace(`${PROJECT_DIR}/`, ""))
          .filter((l) => l && !l.includes("node_modules"));
        return Response.json({ files });
      }

      if (request.method === "POST" && path.endsWith("/upload")) {
        return this.handleUpload(request);
      }

      if (request.method === "POST" && path.endsWith("/import/github")) {
        return this.handleGitHubImport(request);
      }

      if (request.method === "POST" && path.endsWith("/exec")) {
        return this.handleExec(request);
      }

      if (request.method === "POST" && path.endsWith("/chat")) {
        return this.handleChat(request);
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      this.session.status = "error";
      this.session.lastError = error instanceof Error ? error.message : String(error);
      await this.save();
      return Response.json({ error: this.session.lastError }, { status: 500 });
    }
  }

  private async handleUpload(request: Request): Promise<Response> {
    const contentType = request.headers.get("Content-Type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Missing file field" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json({ error: "File exceeds 50MB limit" }, { status: 413 });
    }

    this.session.status = "importing";
    this.session.source = "upload";
    this.session.projectName = file.name.replace(/\.zip$/i, "");
    await this.save();

    const sandbox = this.sandbox();
    await this.ensureProjectDir(sandbox);

    const buffer = await file.arrayBuffer();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      },
    });
    await sandbox.writeFile("/tmp/upload.zip", stream);

    const unzip = await sandbox.exec(
      `unzip -q -o /tmp/upload.zip -d ${PROJECT_DIR} && rm /tmp/upload.zip`,
      { timeout: 120000 },
    );
    if (!unzip.success) {
      throw new Error(unzip.stderr || "Failed to unzip upload");
    }

    this.session.status = "idle";
    await this.save();
    return Response.json({ ok: true, projectName: this.session.projectName });
  }

  private async handleGitHubImport(request: Request): Promise<Response> {
    const body = (await request.json()) as { repoUrl?: string; ref?: string; token?: string };
    if (!body.repoUrl) {
      return Response.json({ error: "repoUrl is required" }, { status: 400 });
    }

    const parsed = parseGitHubRepoUrl(body.repoUrl);
    if (!parsed) {
      return Response.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    const ref = body.ref ?? parsed.ref;
    const tarballUrl = githubTarballUrl(parsed.owner, parsed.repo, ref);
    const previousSha = this.session.sourceCommitSha;

    let commitSha: string | undefined;
    try {
      commitSha = await fetchGitHubCommitSha(parsed.owner, parsed.repo, ref, body.token);
    } catch {
      commitSha = undefined;
    }

    this.session.status = "importing";
    this.session.source = "github";
    this.session.projectName = `${parsed.owner}/${parsed.repo}`;
    this.session.githubRepo = { owner: parsed.owner, repo: parsed.repo, ref };
    if (commitSha) this.session.sourceCommitSha = commitSha;
    await this.save();

    const sandbox = this.sandbox();
    let fetchUrl = tarballUrl;
    if (body.token) {
      fetchUrl = tarballUrl.replace("https://", `https://${body.token}@`);
    }

    await this.importTarball(sandbox, fetchUrl);
    await registerGitHubRepoSession(this.env, parsed.owner, parsed.repo, this.session.id);

    this.session.status = "idle";
    await this.save();

    const commitChanged = Boolean(commitSha && commitSha !== previousSha);
    if (commitChanged || !previousSha) {
      this.state.waitUntil(this.runScanAndCacheReport(commitSha));
    }

    return Response.json({
      ok: true,
      projectName: this.session.projectName,
      commitSha: commitSha ?? null,
      reportQueued: commitChanged || !previousSha,
    });
  }

  private async handleRefreshGitHub(request: Request): Promise<Response> {
    const body = (await request.json()) as { commitSha?: string; ref?: string };
    const repo = this.session.githubRepo;
    if (!repo) {
      return Response.json({ error: "Session has no linked GitHub repository" }, { status: 400 });
    }

    const ref = body.ref ?? repo.ref;
    const token = await getGitHubToken(this.env, this.session.id);
    const tarballUrl = githubTarballUrl(repo.owner, repo.repo, ref);
    let fetchUrl = tarballUrl;
    if (token) fetchUrl = tarballUrl.replace("https://", `https://${token}@`);

    this.session.status = "importing";
    if (body.commitSha) this.session.sourceCommitSha = body.commitSha;
    await this.save();

    const sandbox = this.sandbox();
    await this.importTarball(sandbox, fetchUrl);
    this.session.status = "idle";
    await this.save();

    await this.runScanAndCacheReport(body.commitSha);
    return Response.json({
      ok: true,
      commitSha: this.session.sourceCommitSha ?? null,
      report: this.session.reportCache ?? null,
    });
  }

  private scanDataFromResult(result: unknown) {
    if (!result || typeof result !== "object") return null;
    return pdfReportInputFromScanData(result as Parameters<typeof pdfReportInputFromScanData>[0]);
  }

  private async runScanAndCacheReport(commitSha?: string): Promise<void> {
    const execResponse = await this.handleExec(
      new Request("http://do/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "scan" }),
      }),
    );
    if (!execResponse.ok) return;

    try {
      const payload = await execResponse.json();
      const data = (payload as { data?: unknown }).data ?? this.session.lastResult;
      await this.cachePdfFromScanData(data, commitSha);
    } catch {
      /* ignore cache failures */
    }
  }

  private async cachePdfFromScanData(scanData: unknown, commitSha?: string): Promise<void> {
    const input = this.scanDataFromResult(scanData);
    if (!input) return;

    const hashPayload = {
      ...(scanData as Record<string, unknown>),
      sourceCommitSha: commitSha ?? this.session.sourceCommitSha ?? null,
    };
    const contentHash = await hashScanPayload(hashPayload);
    const cached = await getCachedPdf(this.env, this.session.id, contentHash);
    if (cached) {
      this.session.reportCache = {
        contentHash,
        r2Key: `reports/${this.session.id}/${contentHash}/cf-ready-report.pdf`,
        generatedAt: new Date().toISOString(),
        commitSha: commitSha ?? this.session.sourceCommitSha,
        format: "pdf",
      };
      await this.save();
      return;
    }

    const pdfBytes = await generatePdfReport(input);
    const meta = await putCachedPdf(this.env, this.session.id, contentHash, pdfBytes, {
      sessionId: this.session.id,
      projectName: input.projectName,
      scannedAt: input.scannedAt,
      commitSha: commitSha ?? this.session.sourceCommitSha ?? "",
    });
    this.session.reportCache = meta;
    await this.save();
  }

  private async handleReportPdf(force: boolean): Promise<Response> {
    if (!this.session.lastResult) {
      return Response.json({ error: "No scan results yet. Run scan first." }, { status: 404 });
    }

    const scanData = this.session.lastResult;
    const hashPayload = {
      ...(scanData as Record<string, unknown>),
      sourceCommitSha: this.session.sourceCommitSha ?? null,
    };
    const contentHash = await hashScanPayload(hashPayload);

    if (!force && this.session.reportCache?.contentHash === contentHash) {
      const cached = await getCachedPdf(this.env, this.session.id, contentHash);
      if (cached) {
        return new Response(cached, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="cf-ready-report.pdf"',
            "Cache-Control": "private, max-age=3600",
            "X-Report-Hash": contentHash,
          },
        });
      }
    }

    const input = this.scanDataFromResult(scanData);
    if (!input) {
      return Response.json({ error: "Scan result is missing required fields for PDF export" }, { status: 422 });
    }

    const pdfBytes = await generatePdfReport(input);
    try {
      this.session.reportCache = await putCachedPdf(
        this.env,
        this.session.id,
        contentHash,
        pdfBytes,
        {
          sessionId: this.session.id,
          projectName: input.projectName,
          scannedAt: input.scannedAt,
          commitSha: this.session.sourceCommitSha ?? "",
        },
      );
      await this.save();
    } catch {
      /* return generated PDF even if R2 is unavailable */
    }

    return new Response(pdfBytes.slice(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="cf-ready-report.pdf"',
        "Cache-Control": "private, max-age=3600",
        "X-Report-Hash": contentHash,
      },
    });
  }

  private buildCfReadyArgs(req: ExecRequest): string[] {
    const args = [req.command];
    if (req.flags) {
      for (const [key, value] of Object.entries(req.flags)) {
        if (value === true) args.push(`--${key}`);
        else if (value !== false) args.push(`--${key}`, String(value));
      }
    }
    if (req.args) args.push(...req.args);
    args.push("--json", "--cwd", PROJECT_DIR, "--no-color");
    return args;
  }

  private parseCommandLine(input: string): ExecRequest {
    const trimmed = input.trim().replace(/^cf-ready\s+/, "");
    const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
    const command = parts[0] ?? "scan";
    const args: string[] = [];
    const flags: Record<string, string | boolean> = {};

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].replace(/^["']|["']$/g, "");
      if (part.startsWith("--")) {
        const eq = part.indexOf("=");
        if (eq > 0) {
          flags[part.slice(2, eq)] = part.slice(eq + 1);
        } else {
          const next = parts[i + 1];
          if (next && !next.startsWith("--")) {
            flags[part.slice(2)] = next.replace(/^["']|["']$/g, "");
            i++;
          } else {
            flags[part.slice(2)] = true;
          }
        }
      } else {
        args.push(part);
      }
    }

    return { command, args, flags };
  }

  private async handleExec(request: Request): Promise<Response> {
    const body = (await request.json()) as ExecRequest & { line?: string };
    const req = body.line ? this.parseCommandLine(body.line) : body;

    if (!req.command) {
      return Response.json({ error: "command is required" }, { status: 400 });
    }

    const allowed = new Set([
      "scan",
      "inspect",
      "migration-plan",
      "security-scan",
      "ai-ready",
      "seo-ready",
      "deploy-check",
      "report",
      "ai-optimize",
      "smoke-test",
    ]);
    if (!allowed.has(req.command)) {
      return Response.json({ error: `Command not allowed: ${req.command}` }, { status: 400 });
    }

    this.session.status = "running";
    this.session.lastCommand = req.command;
    this.session.lastError = undefined;
    await this.save();

    const sandbox = this.sandbox();
    const cliArgs = this.buildCfReadyArgs(req);
    const cmd = `cf-ready ${cliArgs.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`;

    const workerUrl = this.env.WORKER_PUBLIC_URL ?? "";
    const envPrefix = workerUrl
      ? `CF_READY_AI_WORKER_URL="${workerUrl}" `
      : "";

    const result = await sandbox.exec(`${envPrefix}${cmd}`, { timeout: 180000 });

    if (!result.success && !result.stdout) {
      this.session.status = "error";
      this.session.lastError = result.stderr || `Command failed with exit ${result.exitCode}`;
      await this.save();
      return Response.json({
        exitCode: result.exitCode,
        stderr: result.stderr,
        stdout: result.stdout,
      });
    }

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(result.stdout.trim());
    } catch {
      parsed = { stdout: result.stdout, stderr: result.stderr };
    }

    this.session.status = "done";
    this.session.lastResult = parsed;
    if (typeof parsed === "object" && parsed && "markdown" in parsed) {
      this.session.lastMarkdown = String((parsed as { markdown: string }).markdown);
    }
    await this.save();

    if (req.command === "scan" || req.command === "report") {
      this.state.waitUntil(this.cachePdfFromScanData(parsed, this.session.sourceCommitSha));
    }

    return Response.json({
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      data: parsed,
    });
  }

  private async handleChat(request: Request): Promise<Response> {
    const body = (await request.json()) as { message?: string };
    if (!body.message?.trim()) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    const model = this.env.DEFAULT_AI_MODEL ?? "openai/gpt-4o-mini";
    const systemPrompt = `You are cf-ready assistant. Map user requests to cf-ready CLI commands.
Available commands: scan, inspect, security-scan, ai-ready, seo-ready, deploy-check, migration-plan, ai-optimize, smoke-test --url <url>.
Respond with JSON only: {"reply":"short explanation","command":"cf-ready scan","run":true}`;

    const response = await this.env.AI.run(
      model,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.message },
        ],
      },
      { gateway: { id: this.env.AI_GATEWAY_ID || "default" } },
    );

    let text = "";
    if (typeof response === "string") text = response;
    else if (response && typeof response === "object") {
      const r = response as Record<string, unknown>;
      if (typeof r.response === "string") text = r.response;
      else if (Array.isArray(r.choices)) {
        const choice = r.choices[0] as { message?: { content?: string } };
        text = choice?.message?.content ?? "";
      }
    }

    let parsed: { reply?: string; command?: string; run?: boolean } = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: text, run: false };
    } catch {
      parsed = { reply: text, run: false };
    }

    let execResult: unknown = null;
    if (parsed.run && parsed.command) {
      const execReq = new Request("http://do/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: parsed.command }),
      });
      const execResponse = await this.handleExec(execReq);
      execResult = await execResponse.json();
    }

    return Response.json({
      reply: parsed.reply ?? text,
      command: parsed.command,
      executed: Boolean(parsed.run),
      result: execResult,
    });
  }
}
