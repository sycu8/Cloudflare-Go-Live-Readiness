import { getSandbox } from "@cloudflare/sandbox";
import type { Env, ExecRequest, SessionState } from "./types.js";
import {
  fetchGitHubCommitSha,
  githubTarballUrl,
  parseGitHubRepoUrl,
  resolveGitHubRef,
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
import { stageGithubTarballToR2, stageUploadZipToR2 } from "./sources-cache.js";
import { PROJECT_DIR } from "./import-extract.js";
import { materializeProject } from "./project-materialize.js";
import { formatSandboxError, isRetryableSandboxError, withSandboxRetry, SANDBOX_COLD_START_RETRY, SANDBOX_SCAN_RETRY } from "./sandbox-retry.js";

import { mergePartialScanResults } from "../../src/service/merge-scan.js";
import { SCAN_MODULE_NAMES, type ScanModuleName } from "../../src/service/scan-modules.js";
import { buildModuleSandboxId } from "./module-sandbox-id.js";
import { mapWithConcurrency } from "./concurrency.js";
import { resolveSessionId } from "./session-id.js";

/** Max simultaneous module sandboxes during scan (lower = fewer cold-start bursts). */
const SANDBOX_MODULE_CONCURRENCY = 2;

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
/** Server-side poll while exec/chat runs in waitUntil (must exceed sandbox exec + cold start). */
const EXEC_POLL_TIMEOUT_MS = 900_000;
const SANDBOX_EXEC_TIMEOUT_MS: Record<string, number> = {
  scan: 600_000,
  report: 600_000,
  "ai-optimize": 600_000,
  "security-scan": 480_000,
  "migration-plan": 480_000,
  "deploy-check": 480_000,
  "ai-ready": 360_000,
  "seo-ready": 360_000,
};
const DEFAULT_SANDBOX_EXEC_TIMEOUT_MS = 300_000;

function sandboxExecTimeoutMs(command: string): number {
  return SANDBOX_EXEC_TIMEOUT_MS[command] ?? DEFAULT_SANDBOX_EXEC_TIMEOUT_MS;
}

type SandboxHandle = ReturnType<typeof getSandbox>;

export class SessionDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private session: SessionState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.session = {
      id: resolveSessionId(state),
      status: "idle",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async load(): Promise<void> {
    const stored = await this.state.storage.get<SessionState>("session");
    if (stored) this.session = stored;
    this.session.id = resolveSessionId(this.state, this.session.id);
  }

  private async save(): Promise<void> {
    this.session.updatedAt = new Date().toISOString();
    await this.state.storage.put("session", this.session);
  }

  /** Merge into persisted session (avoids waitUntil races with concurrent /status loads). */
  private async patchSession(patch: Partial<SessionState>): Promise<void> {
    await this.load();
    Object.assign(this.session, patch);
    await this.save();
  }

  private sandboxForId(sandboxId: string): SandboxHandle {
    return getSandbox(
      this.env.Sandbox as unknown as Parameters<typeof getSandbox>[0],
      sandboxId,
    );
  }

  private sandbox(): SandboxHandle {
    const sandboxId = resolveSessionId(this.state, this.session.id);
    return this.sandboxForId(sandboxId);
  }

  private sandboxForModule(module: ScanModuleName): SandboxHandle {
    return this.sandboxForId(buildModuleSandboxId(this.session.id, module));
  }

  private async ensureProjectReady(sandbox: SandboxHandle): Promise<void> {
    if (!this.session.sourceR2Key || !this.session.sourceFormat) {
      throw new Error("No project imported. Upload a ZIP or import from GitHub first.");
    }

    const result = await materializeProject({
      env: this.env,
      sandbox,
      sourceR2Key: this.session.sourceR2Key,
      sourceFormat: this.session.sourceFormat,
      materializedSourceKey: this.session.materializedSourceKey,
      onExtracting: async () => {
        await this.patchSession({ status: "extracting", lastError: undefined });
      },
    });

    if (this.session.materializedSourceKey !== result.materializedSourceKey) {
      await this.patchSession({ materializedSourceKey: result.materializedSourceKey });
    }
  }

  private async materializeSourceFromR2(sandbox: SandboxHandle): Promise<void> {
    if (!this.session.sourceR2Key || !this.session.sourceFormat) {
      throw new Error("Source archive not staged in R2");
    }
    const result = await materializeProject({
      env: this.env,
      sandbox,
      sourceR2Key: this.session.sourceR2Key,
      sourceFormat: this.session.sourceFormat,
      materializedSourceKey: this.session.materializedSourceKey,
    });
    await this.patchSession({ materializedSourceKey: result.materializedSourceKey });
  }

  private async withSandbox<T>(
    fn: (sandbox: SandboxHandle) => Promise<T>,
    retryOpts = SANDBOX_COLD_START_RETRY,
  ): Promise<T> {
    return withSandboxRetry(async () => fn(this.sandbox()), retryOpts);
  }

  private async pingSandbox(sandbox: SandboxHandle): Promise<void> {
    const ping = await sandbox.exec("echo ready", { timeout: 60_000 });
    if (!ping.success) {
      throw new Error(ping.stderr || "Sandbox ping failed");
    }
  }

  /** Wake primary + module sandboxes before parallel scan to reduce cold-start errors. */
  private async prewarmScanSandboxes(): Promise<void> {
    await withSandboxRetry(
      async () => {
        await this.pingSandbox(this.sandbox());
      },
      SANDBOX_COLD_START_RETRY,
    );
    await mapWithConcurrency([...SCAN_MODULE_NAMES], 2, async (module) => {
      await withSandboxRetry(
        async () => {
          const sandbox = this.sandboxForModule(module);
          await this.pingSandbox(sandbox);
        },
        SANDBOX_COLD_START_RETRY,
      );
    });
  }

  private async runSingleSandboxFullScan(): Promise<unknown> {
    const result = await withSandboxRetry(
      async () => {
        const sandbox = this.sandbox();
        await materializeProject({
          env: this.env,
          sandbox,
          sourceR2Key: this.session.sourceR2Key!,
          sourceFormat: this.session.sourceFormat!,
          materializedSourceKey: this.session.materializedSourceKey,
        });
        await this.pingSandbox(sandbox);
        const cliArgs = this.buildCfReadyArgs({ command: "scan" });
        const cmd = `cf-ready ${cliArgs.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`;
        const workerUrl = this.env.WORKER_PUBLIC_URL ?? "";
        const envPrefix = workerUrl ? `CF_READY_AI_WORKER_URL="${workerUrl}" ` : "";
        return sandbox.exec(`${envPrefix}${cmd}`, {
          timeout: sandboxExecTimeoutMs("scan"),
        });
      },
      SANDBOX_SCAN_RETRY,
    );

    if (!result.success && !result.stdout) {
      throw new Error(result.stderr || `Scan failed with exit ${result.exitCode}`);
    }
    return JSON.parse(result.stdout.trim());
  }

  /** Pre-extract staged source on primary sandbox after import (module sandboxes warm on scan). */
  private async warmSandbox(): Promise<void> {
    if (!this.session.sourceR2Key || !this.session.sourceFormat) return;
    const primaryId = resolveSessionId(this.state, this.session.id);
    try {
      await withSandboxRetry(
        async () => {
          const result = await materializeProject({
            env: this.env,
            sandbox: this.sandboxForId(primaryId),
            sourceR2Key: this.session.sourceR2Key!,
            sourceFormat: this.session.sourceFormat!,
            materializedSourceKey: this.session.materializedSourceKey,
          });
          if (this.session.materializedSourceKey !== result.materializedSourceKey) {
            await this.patchSession({ materializedSourceKey: result.materializedSourceKey });
          }
        },
        { maxAttempts: 10, baseDelayMs: 1500 },
      );
    } catch {
      /* first exec/files will retry extract */
    }
  }

  private formatStagingError(error: unknown): string {
    if (isRetryableSandboxError(error)) return formatSandboxError(error);
    return error instanceof Error ? error.message : String(error);
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
        if (!this.session.sourceR2Key) {
          return Response.json({ files: [], staged: false });
        }
        try {
          const list = await this.withSandbox(async (sandbox) => {
            await this.ensureProjectReady(sandbox);
            return sandbox.exec(`find ${PROJECT_DIR} -type f | head -200`, {
              timeout: 60_000,
            });
          });
          const files = list.stdout
            .split("\n")
            .map((l) => l.trim().replace(`${PROJECT_DIR}/`, ""))
            .filter((l) => l && !l.includes("node_modules"));
          return Response.json({ files, staged: true });
        } catch (error) {
          if (isRetryableSandboxError(error)) {
            return Response.json({
              files: [],
              staged: true,
              warning: formatSandboxError(error),
            });
          }
          throw error;
        }
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
      const message = this.formatStagingError(error);
      this.session.status = "error";
      this.session.lastError = message;
      await this.save();
      const status = this.httpStatusForError(message);
      return Response.json({ error: message }, { status });
    }
  }

  private httpStatusForError(message: string): number {
    if (/required|Invalid|exceeds|Missing|not configured|Expected multipart/i.test(message)) {
      return 400;
    }
    if (/GitHub|rate limit|download failed|access denied/i.test(message)) {
      return 502;
    }
    if (isRetryableSandboxError(new Error(message))) {
      return 503;
    }
    return 500;
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
    this.session.lastError = undefined;
    await this.save();

    const buffer = await file.arrayBuffer();
    const staged = await stageUploadZipToR2(this.env, this.session.id, buffer);

    await this.patchSession({
      sourceR2Key: staged.r2Key,
      sourceFormat: staged.format,
      projectName: this.session.projectName,
      status: "idle",
      lastError: undefined,
      materializedSourceKey: undefined,
    });

    this.state.waitUntil(this.warmSandbox());

    return Response.json({
      ok: true,
      projectName: this.session.projectName,
      sourceR2Key: staged.r2Key,
      cached: false,
      staging: "r2",
    });
  }

  private async handleGitHubImport(request: Request): Promise<Response> {
    const body = (await request.json()) as { repoUrl?: string; ref?: string; token?: string };
    if (!body.repoUrl) {
      return Response.json({ error: "repoUrl is required" }, { status: 400 });
    }

    const parsed = parseGitHubRepoUrl(body.repoUrl);
    if (!parsed) {
      return Response.json(
        { error: "Invalid GitHub URL. Use https://github.com/owner/repo or owner/repo" },
        { status: 400 },
      );
    }

    const ref = body.ref ?? parsed.ref;
    const token = body.token;

    let resolvedRef = ref;
    try {
      resolvedRef = await resolveGitHubRef(parsed.owner, parsed.repo, ref, token);
    } catch {
      resolvedRef = ref === "HEAD" ? "main" : ref;
    }

    let commitSha: string | undefined;
    try {
      commitSha = await fetchGitHubCommitSha(parsed.owner, parsed.repo, resolvedRef, token);
    } catch {
      commitSha = undefined;
    }

    const tarballRef = commitSha ?? resolvedRef;
    const tarballUrl = githubTarballUrl(parsed.owner, parsed.repo, tarballRef);
    const cacheKey = commitSha ?? resolvedRef;
    const previousSha = this.session.sourceCommitSha;

    this.session.status = "importing";
    this.session.source = "github";
    this.session.projectName = `${parsed.owner}/${parsed.repo}`;
    this.session.githubRepo = { owner: parsed.owner, repo: parsed.repo, ref: resolvedRef };
    this.session.lastError = undefined;
    if (commitSha) this.session.sourceCommitSha = commitSha;
    await this.save();

    this.state.waitUntil(
      this.finishGitHubImport({
        owner: parsed.owner,
        repo: parsed.repo,
        cacheKey,
        tarballUrl,
        token: body.token,
        previousSha,
        commitSha,
      }),
    );

    return Response.json({
      ok: true,
      status: "importing",
      projectName: this.session.projectName,
      commitSha: commitSha ?? null,
      staging: "r2",
    });
  }

  private async finishGitHubImport(args: {
    owner: string;
    repo: string;
    cacheKey: string;
    tarballUrl: string;
    token?: string;
    previousSha?: string;
    commitSha?: string;
  }): Promise<void> {
    const { owner, repo, cacheKey, tarballUrl, token } = args;
    const parsed = this.session.githubRepo;
    if (!parsed) return;

    try {
      const staged = await stageGithubTarballToR2(this.env, {
        owner,
        repo,
        refOrSha: cacheKey,
        tarballUrl,
        token,
      });

      await registerGitHubRepoSession(this.env, owner, repo, this.session.id);

      await this.patchSession({
        sourceR2Key: staged.r2Key,
        sourceFormat: staged.format,
        status: "idle",
        lastError: undefined,
        materializedSourceKey: undefined,
      });

      this.state.waitUntil(this.warmSandbox());
    } catch (error) {
      await this.patchSession({
        status: "error",
        lastError: this.formatStagingError(error),
      });
    }
  }

  private async handleRefreshGitHub(request: Request): Promise<Response> {
    const body = (await request.json()) as { commitSha?: string; ref?: string };
    const repo = this.session.githubRepo;
    if (!repo) {
      return Response.json({ error: "Session has no linked GitHub repository" }, { status: 400 });
    }

    const ref = body.ref ?? repo.ref;
    const token = await getGitHubToken(this.env, this.session.id);
    let commitSha = body.commitSha;
    if (!commitSha) {
      try {
        commitSha = await fetchGitHubCommitSha(repo.owner, repo.repo, ref, token ?? undefined);
      } catch {
        commitSha = undefined;
      }
    }
    const cacheKey = commitSha ?? ref;
    const tarballUrl = githubTarballUrl(repo.owner, repo.repo, cacheKey);

    this.session.status = "importing";
    if (commitSha) this.session.sourceCommitSha = commitSha;
    await this.save();

    const staged = await stageGithubTarballToR2(this.env, {
      owner: repo.owner,
      repo: repo.repo,
      refOrSha: cacheKey,
      tarballUrl,
      token: token ?? undefined,
    });
    this.session.sourceR2Key = staged.r2Key;
    this.session.sourceFormat = staged.format;
    await this.save();

    await this.withSandbox((sandbox) => this.materializeSourceFromR2(sandbox));
    this.session.status = "idle";
    await this.save();

    await this.runScanAndCacheReport(commitSha);
    return Response.json({
      ok: true,
      commitSha: this.session.sourceCommitSha ?? null,
      sourceR2Key: this.session.sourceR2Key ?? null,
      report: this.session.reportCache ?? null,
    });
  }

  private scanDataFromResult(result: unknown) {
    if (!result || typeof result !== "object") return null;
    return pdfReportInputFromScanData(result as Parameters<typeof pdfReportInputFromScanData>[0]);
  }

  private async runScanAndCacheReport(commitSha?: string): Promise<void> {
    await this.handleExec(
      new Request("http://do/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "scan" }),
      }),
    );

    const start = Date.now();
    while (Date.now() - start < EXEC_POLL_TIMEOUT_MS) {
      await this.load();
      if (this.session.status === "done") {
        await this.cachePdfFromScanData(this.session.lastResult, commitSha);
        return;
      }
      if (this.session.status === "error") {
        await this.patchSession({ status: "idle" });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
    if (req.command !== "report") {
      args.push("--skip-reports");
    }
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
      "fix",
    ]);
    if (!allowed.has(req.command)) {
      return Response.json({ error: `Command not allowed: ${req.command}` }, { status: 400 });
    }

    await this.patchSession({
      status: "running",
      lastCommand: req.command,
      lastError: undefined,
    });

    this.state.waitUntil(this.runExec(req));

    return Response.json({
      ok: true,
      status: "running",
      command: req.command,
    });
  }

  /** Parallel scan needs several warm containers; first scan uses one sandbox to avoid cold-start bursts. */
  private shouldRunParallelScan(req: ExecRequest): boolean {
    return req.command === "scan" && !req.flags?.modules && Boolean(this.session.lastResult);
  }

  private buildModuleScanCommand(module: ScanModuleName): string {
    const args = [
      "scan",
      "--modules",
      module,
      "--json",
      "--cwd",
      PROJECT_DIR,
      "--no-color",
      "--skip-reports",
    ];
    const workerUrl = this.env.WORKER_PUBLIC_URL ?? "";
    const envPrefix = workerUrl ? `CF_READY_AI_WORKER_URL="${workerUrl}" ` : "";
    const cmd = `cf-ready ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`;
    return `${envPrefix}${cmd}`;
  }

  private async runModuleScan(module: ScanModuleName): Promise<unknown> {
    return withSandboxRetry(
      async () => {
        const sandbox = this.sandboxForModule(module);
        await materializeProject({
          env: this.env,
          sandbox,
          sourceR2Key: this.session.sourceR2Key!,
          sourceFormat: this.session.sourceFormat!,
        });
        await this.pingSandbox(sandbox);
        const result = await sandbox.exec(this.buildModuleScanCommand(module), {
          timeout: sandboxExecTimeoutMs("scan"),
        });
        if (!result.success && !result.stdout) {
          throw new Error(result.stderr || `Module ${module} failed with exit ${result.exitCode}`);
        }
        return JSON.parse(result.stdout.trim());
      },
      SANDBOX_SCAN_RETRY,
    );
  }

  private async runParallelScan(): Promise<unknown> {
    if (!this.session.sourceR2Key || !this.session.sourceFormat) {
      throw new Error("No project imported. Upload a ZIP or import from GitHub first.");
    }
    await this.patchSession({ status: "running", lastError: undefined });
    try {
      await this.prewarmScanSandboxes();
      const partials = await mapWithConcurrency(
        [...SCAN_MODULE_NAMES],
        SANDBOX_MODULE_CONCURRENCY,
        (module) => this.runModuleScan(module),
      );
      return mergePartialScanResults(partials);
    } catch (error) {
      if (!isRetryableSandboxError(error)) throw error;
      return this.runSingleSandboxFullScan();
    }
  }

  private async runExecOnce(req: ExecRequest): Promise<void> {
    let parsed: unknown;
    if (this.shouldRunParallelScan(req)) {
      parsed = await this.runParallelScan();
    } else if (req.command === "scan" && !req.flags?.modules) {
      parsed = await this.runSingleSandboxFullScan();
    } else {
      const result = await this.withSandbox(async (sandbox) => {
        await this.ensureProjectReady(sandbox);
        await this.patchSession({ status: "running", lastError: undefined });
        await this.pingSandbox(sandbox);
        const cliArgs = this.buildCfReadyArgs(req);
        const cmd = `cf-ready ${cliArgs.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`;

        const workerUrl = this.env.WORKER_PUBLIC_URL ?? "";
        const envPrefix = workerUrl ? `CF_READY_AI_WORKER_URL="${workerUrl}" ` : "";

        return sandbox.exec(`${envPrefix}${cmd}`, {
          timeout: sandboxExecTimeoutMs(req.command),
        });
      }, SANDBOX_SCAN_RETRY);

      if (!result.success && !result.stdout) {
        const message = result.stderr || `Command failed with exit ${result.exitCode}`;
        if (isRetryableSandboxError(new Error(message))) {
          throw new Error(message);
        }
        await this.patchSession({ status: "error", lastError: message });
        return;
      }

      try {
        parsed = JSON.parse(result.stdout.trim());
      } catch {
        parsed = { stdout: result.stdout, stderr: result.stderr };
      }
    }

    const patch: Partial<SessionState> = {
      status: "done",
      lastResult: parsed,
      lastError: undefined,
    };
    if (typeof parsed === "object" && parsed && "markdown" in parsed) {
      patch.lastMarkdown = String((parsed as { markdown: string }).markdown);
    }
    await this.patchSession(patch);

    if (req.command === "scan" || req.command === "report") {
      const commitSha = this.session.sourceCommitSha;
      this.state.waitUntil(
        (async () => {
          await this.load();
          await this.cachePdfFromScanData(parsed, commitSha);
        })(),
      );
    }
  }

  private async runExec(req: ExecRequest): Promise<void> {
    const isScan = req.command === "scan";
    try {
      if (isScan) {
        await withSandboxRetry(
          async () => {
            await this.patchSession({ status: "running", lastError: undefined });
            await this.runExecOnce(req);
          },
          { maxAttempts: 3, baseDelayMs: 5000 },
        );
      } else {
        await this.runExecOnce(req);
      }
    } catch (error) {
      await this.patchSession({
        status: "error",
        lastError: formatSandboxError(error),
      });
    }
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
      await this.handleExec(execReq);

      const start = Date.now();
      while (Date.now() - start < EXEC_POLL_TIMEOUT_MS) {
        await this.load();
        if (this.session.status === "done") {
          execResult = {
            data: this.session.lastResult,
            stdout: this.session.lastResult ? JSON.stringify(this.session.lastResult) : "",
          };
          break;
        }
        if (this.session.status === "error") {
          execResult = { error: this.session.lastError ?? "Command failed" };
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return Response.json({
      reply: parsed.reply ?? text,
      command: parsed.command,
      executed: Boolean(parsed.run),
      result: execResult,
    });
  }
}
