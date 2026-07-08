import type { Finding, ScanScores } from "../api/client.js";

export type ScanResultData = {
  productionReady?: boolean;
  scores?: ScanScores;
  blockers?: Finding[];
  findings?: Finding[];
  inspection?: {
    projectName?: string;
    framework?: string;
    deploymentTarget?: string;
    packageManager?: string;
  };
  markdown?: string;
};

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function scoreTone(value: number): "good" | "warn" | "bad" {
  if (value >= 80) return "good";
  if (value >= 60) return "warn";
  return "bad";
}

export function scoreRing(label: string, value: number, large = false): string {
  const tone = scoreTone(value);
  const r = large ? 36 : 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const size = large ? 88 : 68;
  const center = size / 2;
  return `
    <div class="score-ring ${large ? "score-ring--hero" : ""}" data-tone="${tone}">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle class="score-ring__track" cx="${center}" cy="${center}" r="${r}" />
        <circle class="score-ring__fill" cx="${center}" cy="${center}" r="${r}"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" />
      </svg>
      <div class="score-ring__text">
        <span class="score-ring__value">${value}</span>
        <span class="score-ring__label">${escapeHtml(label)}</span>
      </div>
    </div>
  `;
}

export function severityLabel(severity: string): string {
  const map: Record<string, string> = {
    blocker: "Blocker",
    high: "High",
    medium: "Medium",
    low: "Low",
    info: "Info",
  };
  return map[severity] ?? severity;
}

export function findingCard(f: Finding): string {
  return `
    <article class="finding-card severity-${f.severity}">
      <div class="finding-card__meta">
        <span class="finding-card__severity">${severityLabel(f.severity)}</span>
        ${f.category ? `<span class="finding-card__category">${escapeHtml(f.category)}</span>` : ""}
      </div>
      <h4 class="finding-card__title">${escapeHtml(f.title)}</h4>
      ${f.description ? `<p class="finding-card__desc">${escapeHtml(f.description)}</p>` : ""}
    </article>
  `;
}

export function renderEmptyResults(): string {
  return `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">📊</div>
      <h3>Chưa có kết quả scan</h3>
      <p>Import project rồi chạy <code>scan</code> để xem điểm readiness, blockers và findings.</p>
      <ol class="steps-list">
        <li>Upload ZIP hoặc import GitHub</li>
        <li>Chạy lệnh <strong>scan</strong></li>
        <li>Xem báo cáo tại đây</li>
      </ol>
    </div>
  `;
}

export function renderResults(data: ScanResultData, filter: string, sessionId?: string): string {
  if (!data.scores) {
    return `<div class="raw-output"><pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre></div>`;
  }

  const scores = data.scores;
  const blockers = data.blockers ?? [];
  const allFindings = (data.findings ?? []).filter((f) => f.severity !== "info");
  let findings = allFindings;
  if (filter === "blockers") findings = blockers;
  else if (filter === "high") findings = allFindings.filter((f) => f.severity === "high" || f.severity === "blocker");
  findings = findings.slice(0, 30);

  const readyClass = data.productionReady ? "ready-banner--ok" : "ready-banner--bad";
  const readyText = data.productionReady ? "Production ready" : "Chưa production ready";
  const readyHint = data.productionReady
    ? "Project đạt ngưỡng go-live cơ bản."
    : `${blockers.length} blocker cần xử lý trước khi deploy.`;

  const inspection = data.inspection;
  const meta = inspection
    ? `
      <div class="project-meta">
        <span>${escapeHtml(inspection.projectName ?? "Project")}</span>
        <span class="dot">·</span>
        <span>${escapeHtml(inspection.framework ?? "unknown")}</span>
        <span class="dot">·</span>
        <span>${escapeHtml(inspection.deploymentTarget ?? "—")}</span>
      </div>`
    : "";

  const reportActions = sessionId
    ? `
      <div class="report-actions">
        <a class="ghost report-actions__btn" href="/api/sessions/${escapeHtml(sessionId)}/reports/pdf" download="cf-ready-report.pdf">
          Download PDF
        </a>
        <button type="button" class="ghost report-actions__btn" data-action="regenerate-report">
          Regenerate PDF
        </button>
      </div>`
    : "";

  return `
    <div class="results-content">
      <div class="ready-banner ${readyClass}">
        <div>
          <strong>${readyText}</strong>
          <p>${readyHint}</p>
        </div>
        ${scoreRing("Overall", scores.overall, true)}
      </div>
      ${meta}
      <div class="score-rings">
        ${scoreRing("Migration", scores.migration)}
        ${scoreRing("Security", scores.security)}
        ${scoreRing("AI", scores.aiReadiness)}
        ${scoreRing("SEO", scores.seo)}
        ${scoreRing("Deploy", scores.deployment)}
      </div>
      ${reportActions}
      <div class="findings-toolbar">
        <button type="button" class="filter-btn ${filter === "all" ? "active" : ""}" data-filter="all">Tất cả (${allFindings.length})</button>
        <button type="button" class="filter-btn ${filter === "blockers" ? "active" : ""}" data-filter="blockers">Blockers (${blockers.length})</button>
        <button type="button" class="filter-btn ${filter === "high" ? "active" : ""}" data-filter="high">High+</button>
      </div>
      <div class="findings-list">
        ${findings.length ? findings.map(findingCard).join("") : '<p class="muted-text">Không có finding trong nhóm này.</p>'}
      </div>
      ${data.markdown ? `<details class="markdown-details"><summary>AI Optimize report</summary><pre class="markdown-preview">${escapeHtml(data.markdown)}</pre></details>` : ""}
    </div>
  `;
}
