import { getSandbox } from "@cloudflare/sandbox";
import type { Env, ExecRequest, SessionState } from "./types.js";
import { validateGitHubUrl } from "./github.js";

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
        });
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

    const tarballUrl = validateGitHubUrl(body.repoUrl);
    this.session.status = "importing";
    this.session.source = "github";
    this.session.projectName = body.repoUrl;
    await this.save();

    const sandbox = this.sandbox();
    let fetchUrl = tarballUrl;
    if (body.token) {
      fetchUrl = tarballUrl.replace("https://", `https://${body.token}@`);
    }

    await this.importTarball(sandbox, fetchUrl);

    this.session.status = "idle";
    await this.save();
    return Response.json({ ok: true, projectName: this.session.projectName });
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
