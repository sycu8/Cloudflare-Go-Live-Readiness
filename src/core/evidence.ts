export type EvidenceItem = {
  file: string;
  line?: number;
  column?: number;
  snippet?: string;
  ruleId?: string;
};

export function summarizeEvidence(items: EvidenceItem[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) {
    const item = items[0]!;
    const loc = item.line ? `${item.file}:${item.line}` : item.file;
    return item.snippet ? `${loc} — ${item.snippet.slice(0, 100)}` : loc;
  }
  const preview = items
    .slice(0, 3)
    .map((item) => (item.line ? `${item.file}:${item.line}` : item.file))
    .join(", ");
  return `${items.length} location(s): ${preview}${items.length > 3 ? "…" : ""}`;
}

export function findLineMatch(
  content: string,
  pattern: RegExp,
): { line: number; snippet: string; column?: number } | null {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const match = pattern.exec(line);
    if (match) {
      return {
        line: i + 1,
        column: match.index !== undefined ? match.index + 1 : undefined,
        snippet: line.trim().slice(0, 120),
      };
    }
  }
  return null;
}

export function isCommentOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  );
}

export function redactSecretSnippet(snippet: string): string {
  return snippet
    .replace(/(['"])[^'"]{8,}(['"])/g, "$1***REDACTED***$2")
    .slice(0, 120);
}
