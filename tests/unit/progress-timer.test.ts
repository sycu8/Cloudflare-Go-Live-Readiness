import { describe, it, expect } from "vitest";
import {
  formatElapsed,
  formatStatusPillLabel,
  isBusyProcessStatus,
  processStatusLabel,
} from "../../web/src/ui/progress-timer.js";

describe("progress timer helpers", () => {
  it("formatElapsed renders mm:ss", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(65000)).toBe("01:05");
    expect(formatElapsed(125000)).toBe("02:05");
  });

  it("processStatusLabel maps known statuses", () => {
    expect(processStatusLabel("importing")).toContain("import");
    expect(processStatusLabel("extracting")).toContain("giải nén");
    expect(processStatusLabel("running")).toContain("lệnh");
  });

  it("isBusyProcessStatus detects active work", () => {
    expect(isBusyProcessStatus("running")).toBe(true);
    expect(isBusyProcessStatus("extracting")).toBe(true);
    expect(isBusyProcessStatus("idle")).toBe(false);
    expect(isBusyProcessStatus("done")).toBe(false);
  });

  it("formatStatusPillLabel shows Vietnamese completed state", () => {
    expect(formatStatusPillLabel("done")).toBe("Hoàn tất");
    expect(formatStatusPillLabel("idle")).toBe("Sẵn sàng");
    expect(formatStatusPillLabel("error")).toBe("Lỗi");
  });
});
